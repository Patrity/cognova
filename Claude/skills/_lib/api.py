#!/usr/bin/env python3
"""
Second Brain API Client

Provides consistent API access for all built-in skills.
Uses curl subprocess to avoid pip dependencies.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

API_BASE = os.environ.get('SECOND_BRAIN_API_URL', 'http://localhost:3000')


def _get_api_token() -> str:
    """Get API token from environment or .api-token file."""
    # Check environment variable first
    token = os.environ.get('SECOND_BRAIN_API_TOKEN', '')
    if token:
        return token

    # Try to read from .api-token file - check multiple locations
    # to handle bare-metal, Docker, and local dev environments
    possible_paths = [
        # Bare-metal: project dir from environment (set by PM2/settings.json)
        Path(os.environ.get('SECOND_BRAIN_PROJECT_DIR', '')) / '.api-token',
        # Docker: app is at /home/node/app, skills at /home/node/.claude/skills
        Path('/home/node/app/.api-token'),
        # Local dev: navigate from _lib -> skills -> Claude -> project root
        Path(__file__).parent.parent.parent.parent / '.api-token',
        # Current working directory
        Path.cwd() / '.api-token',
    ]

    for token_file in possible_paths:
        if token_file.exists():
            try:
                return token_file.read_text().strip()
            except Exception:
                pass

    return ''


# Get token at module load time
API_TOKEN = _get_api_token()

# Debug: warn if no token found
if not API_TOKEN and os.environ.get('DEBUG'):
    print(f"[api.py] Warning: No API token found", file=sys.stderr)
    print(f"[api.py] Env SECOND_BRAIN_API_TOKEN: {bool(os.environ.get('SECOND_BRAIN_API_TOKEN'))}", file=sys.stderr)
    print(f"[api.py] Checked paths: {[str(p) for p in [Path('/home/node/app/.api-token'), Path(__file__).parent.parent.parent.parent / '.api-token', Path.cwd() / '.api-token']]}", file=sys.stderr)


def api_request(
    method: str,
    endpoint: str,
    data: dict | None = None,
    params: dict | None = None
) -> tuple[bool, Any]:
    """
    Make an API request to Second Brain.

    Args:
        method: HTTP method (GET, POST, PUT, DELETE)
        endpoint: API endpoint (e.g., '/tasks')
        data: Request body for POST/PUT
        params: Query parameters

    Returns:
        Tuple of (success: bool, data | error_message)
    """
    url = f"{API_BASE}/api{endpoint}"

    cmd = ["curl", "-sL", "-X", method]
    cmd.extend(["-H", "Content-Type: application/json"])

    # Add API token for authentication if available
    if API_TOKEN:
        cmd.extend(["-H", f"X-API-Token: {API_TOKEN}"])

    if params:
        query_parts = []
        for k, v in params.items():
            if v is not None:
                if isinstance(v, list):
                    for item in v:
                        query_parts.append(f"{k}={item}")
                else:
                    query_parts.append(f"{k}={v}")
        if query_parts:
            url = f"{url}?{'&'.join(query_parts)}"

    if data and method in ("POST", "PUT"):
        cmd.extend(["-d", json.dumps(data)])

    cmd.append(url)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return False, f"Request failed: {result.stderr}"

        if not result.stdout.strip():
            return False, "Empty response from server"

        response = json.loads(result.stdout)
        if response.get("error"):
            # API returns {error: true, message: "..."} on error
            return False, response.get("message", response.get("statusMessage", "Unknown error"))

        return True, response.get("data", response)
    except json.JSONDecodeError:
        return False, f"Invalid JSON response: {result.stdout[:100]}"
    except subprocess.TimeoutExpired:
        return False, "Request timed out"
    except Exception as e:
        return False, str(e)


def get(endpoint: str, params: dict | None = None) -> tuple[bool, Any]:
    """GET request helper."""
    return api_request("GET", endpoint, params=params)


def post(endpoint: str, data: dict) -> tuple[bool, Any]:
    """POST request helper."""
    return api_request("POST", endpoint, data=data)


def put(endpoint: str, data: dict) -> tuple[bool, Any]:
    """PUT request helper."""
    return api_request("PUT", endpoint, data=data)


def delete(endpoint: str) -> tuple[bool, Any]:
    """DELETE request helper."""
    return api_request("DELETE", endpoint)


def get_secret(key: str) -> tuple[bool, str]:
    """
    Fetch a decrypted secret by key.

    Args:
        key: The secret key (e.g., "GOOGLE_API_KEY")

    Returns:
        Tuple of (success: bool, value | error_message)

    Example:
        success, api_key = get_secret("GOOGLE_API_KEY")
        if not success:
            print(f"Error: {api_key}")
            sys.exit(1)
    """
    success, data = get(f"/secrets/{key}")
    if success and isinstance(data, dict):
        return True, data.get("value", "")
    return False, data if isinstance(data, str) else "Secret not found"
