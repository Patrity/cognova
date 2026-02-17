#!/usr/bin/env python3
"""
Hook client library for logging events to Cognova API.
Uses curl subprocess to avoid pip dependencies (same as skills/_lib/api.py).
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional, Dict, Any


def _get_api_base() -> str:
    """Get the Cognova API URL from environment."""
    return os.environ.get('COGNOVA_API_URL', 'http://localhost:3000')


def _get_api_token() -> str:
    """Get API token from environment or .api-token file."""
    token = os.environ.get('COGNOVA_API_TOKEN', '')
    if token:
        return token

    possible_paths = [
        # Bare-metal: project dir from environment (set by PM2/settings.json)
        Path(os.environ.get('COGNOVA_PROJECT_DIR', '')) / '.api-token',
        # Docker: app is at /home/node/app
        Path('/home/node/app/.api-token'),
        # Local dev: navigate from lib -> hooks -> Claude -> project root
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
    Log a hook event to the Cognova API.

    Returns True if successful, False otherwise.
    Fails silently to not block Claude operations.
    """
    api_base = _get_api_base()
    api_token = _get_api_token()

    if not api_token:
        print(f"[hook_client] No API token found. Checked: {[str(p) for p in [Path('/home/node/app/.api-token'), Path(__file__).parent.parent.parent.parent / '.api-token', Path.cwd() / '.api-token']]}", file=sys.stderr)
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
        # Debug output to stderr (visible in claude --debug)
        if os.environ.get('DEBUG') or result.returncode != 0:
            print(f"[hook_client] API: {api_base}, Token: {'set' if api_token else 'NOT SET'}", file=sys.stderr)
            print(f"[hook_client] Response: {result.returncode} - {result.stdout[:200] if result.stdout else 'no output'}", file=sys.stderr)
            if result.stderr:
                print(f"[hook_client] Error: {result.stderr[:200]}", file=sys.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"[hook_client] Exception: {e}", file=sys.stderr)
        return False


def read_stdin_json() -> Optional[Dict[str, Any]]:
    """Read and parse JSON from stdin (hook input)."""
    try:
        return json.load(sys.stdin)
    except Exception:
        return None


def extract_memories(
    transcript_path: Optional[str] = None,
    transcript: Optional[str] = None,
    session_id: Optional[str] = None,
    project_path: Optional[str] = None
) -> bool:
    """
    Trigger memory extraction from a transcript.

    Returns True if successful, False otherwise.
    """
    api_base = _get_api_base()
    api_token = _get_api_token()

    if not api_token:
        print("[hook_client] No API token for memory extraction", file=sys.stderr)
        return False

    payload = {
        'sessionId': session_id or os.environ.get('CLAUDE_SESSION_ID'),
        'projectPath': project_path or os.environ.get('CLAUDE_PROJECT_DIR')
    }

    if transcript_path:
        payload['transcriptPath'] = transcript_path
    elif transcript:
        payload['transcript'] = transcript
    else:
        print("[hook_client] No transcript provided for memory extraction", file=sys.stderr)
        return False

    cmd = [
        "curl", "-sL", "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", f"X-API-Token: {api_token}",
        "-d", json.dumps(payload),
        "--connect-timeout", "5",
        "--max-time", "30",
        f"{api_base}/api/memory/extract"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if os.environ.get('DEBUG') or result.returncode != 0:
            print(f"[hook_client] Memory extraction: {result.returncode}", file=sys.stderr)
            if result.stdout:
                print(f"[hook_client] Response: {result.stdout[:200]}", file=sys.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"[hook_client] Memory extraction failed: {e}", file=sys.stderr)
        return False


def get_memory_context(project_path: Optional[str] = None, limit: int = 5) -> Optional[str]:
    """
    Get formatted memory context for session start.

    Returns formatted context string or None if failed.
    """
    api_base = _get_api_base()
    api_token = _get_api_token()

    if not api_token:
        return None

    project = project_path or os.environ.get('CLAUDE_PROJECT_DIR', '')
    url = f"{api_base}/api/memory/context?project={project}&limit={limit}"

    cmd = [
        "curl", "-sL",
        "-H", f"X-API-Token: {api_token}",
        "--connect-timeout", "2",
        "--max-time", "5",
        url
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout:
            data = json.loads(result.stdout)
            if 'data' in data and 'formatted' in data['data']:
                return data['data']['formatted']
    except Exception as e:
        if os.environ.get('DEBUG'):
            print(f"[hook_client] Memory context failed: {e}", file=sys.stderr)

    return None
