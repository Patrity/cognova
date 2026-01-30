#!/usr/bin/env python3
"""
Hook client library for logging events to Second Brain API.
Uses curl subprocess to avoid pip dependencies (same as skills/_lib/api.py).
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional, Dict, Any


def _get_api_base() -> str:
    """Get the Second Brain API URL from environment."""
    return os.environ.get('SECOND_BRAIN_API_URL', 'http://localhost:3000')


def _get_api_token() -> str:
    """Get API token from environment or .api-token file."""
    token = os.environ.get('SECOND_BRAIN_API_TOKEN', '')
    if token:
        return token

    possible_paths = [
        Path('/home/node/app/.api-token'),
        Path(__file__).parent.parent.parent.parent / '.api-token',
        Path.cwd() / '.api-token',
    ]

    for token_file in possible_paths:
        if token_file.exists():
            try:
                return token_file.read_text().strip()
            except Exception:
                pass

    return ''


def log_event(
    event_type: str,
    tool_name: Optional[str] = None,
    tool_matcher: Optional[str] = None,
    event_data: Optional[Dict[str, Any]] = None,
    exit_code: Optional[int] = None,
    blocked: bool = False,
    block_reason: Optional[str] = None,
    duration_ms: Optional[int] = None,
    hook_script: Optional[str] = None,
    session_id: Optional[str] = None
) -> bool:
    """
    Log a hook event to the Second Brain API.

    Returns True if successful, False otherwise.
    Fails silently to not block Claude operations.
    """
    api_base = _get_api_base()
    api_token = _get_api_token()

    if not api_token:
        return False

    payload = {
        'eventType': event_type,
        'projectDir': os.environ.get('CLAUDE_PROJECT_DIR'),
        'sessionId': session_id or os.environ.get('CLAUDE_SESSION_ID'),
        'toolName': tool_name,
        'toolMatcher': tool_matcher,
        'eventData': event_data,
        'exitCode': exit_code,
        'blocked': blocked,
        'blockReason': block_reason,
        'durationMs': duration_ms,
        'hookScript': hook_script
    }

    # Remove None values
    payload = {k: v for k, v in payload.items() if v is not None}

    cmd = [
        "curl", "-sL", "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", f"X-API-Token: {api_token}",
        "-d", json.dumps(payload),
        "--connect-timeout", "2",
        "--max-time", "5",
        f"{api_base}/api/hooks/events"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        return result.returncode == 0
    except Exception:
        return False


def read_stdin_json() -> Optional[Dict[str, Any]]:
    """Read and parse JSON from stdin (hook input)."""
    try:
        return json.load(sys.stdin)
    except Exception:
        return None
