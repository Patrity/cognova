#!/usr/bin/env python3
"""
Hook: SessionStart
Logs when a Claude session begins.
"""

import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from hook_client import log_event, read_stdin_json

def main():
    hook_input = read_stdin_json()

    log_event(
        event_type='SessionStart',
        event_data=hook_input,
        hook_script='session-start.py'
    )


if __name__ == '__main__':
    main()
