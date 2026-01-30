#!/usr/bin/env python3
"""
Hook: SessionEnd
Logs when a Claude session ends.
"""

import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from hook_client import log_event, read_stdin_json

def main():
    hook_input = read_stdin_json()

    log_event(
        event_type='SessionEnd',
        event_data=hook_input,
        hook_script='session-end.py'
    )


if __name__ == '__main__':
    main()
