#!/usr/bin/env python3
"""
Hook: Stop (async)
Extracts memories from Claude's final response when it finishes.

Runs asynchronously so it doesn't block Claude.
"""

import os
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from hook_client import extract_memories, read_stdin_json


def main():
    hook_input = read_stdin_json() or {}

    transcript_path = hook_input.get('transcript_path')
    stop_hook_active = hook_input.get('stop_hook_active', False)

    # Skip if we're already continuing from a stop hook
    # to avoid infinite loops
    if stop_hook_active:
        sys.exit(0)

    # Extract memories from the transcript
    if transcript_path and os.path.exists(transcript_path):
        success = extract_memories(transcript_path=transcript_path)
        if success and os.environ.get('DEBUG'):
            print(f"[stop-extract] Async memory extraction completed", file=sys.stderr)

    sys.exit(0)


if __name__ == '__main__':
    main()
