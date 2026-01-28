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
from typing import Any

API_BASE = os.environ.get('SECOND_BRAIN_API_URL', 'http://localhost:3000')


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
