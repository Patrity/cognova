#!/usr/bin/env python3
"""
Hook: PreCompact
Extracts memories from the conversation before context compaction.

This is critical for preserving key decisions and facts before
the conversation is summarized.
"""

import os
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from hook_client import log_event, read_stdin_json, extract_memories


def main():
    hook_input = read_stdin_json() or {}

    transcript_path = hook_input.get('transcript_path')
    trigger = hook_input.get('trigger', 'unknown')  # 'manual' or 'auto'

    # Log the event
    log_event(
        event_type='PreCompact',
        event_data={'trigger': trigger},
        hook_script='pre-compact.py'
    )

    # Extract memories before compaction
    if transcript_path and os.path.exists(transcript_path):
        success = extract_memories(transcript_path=transcript_path)
        if success:
            print(f"[pre-compact] Extracted memories before {trigger} compaction", file=sys.stderr)
    else:
        print(f"[pre-compact] No transcript path available: {transcript_path}", file=sys.stderr)

    # Always exit 0 to not block compaction
    sys.exit(0)


if __name__ == '__main__':
    main()
