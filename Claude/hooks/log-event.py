#!/usr/bin/env python3
"""
Generic hook event logger.

This script wraps other hooks, logging their execution while passing through
to the original hook behavior. It can also be used standalone to log events.

Usage:
  As wrapper: python3 log-event.py <event_type> <original_hook_command>
  Standalone: python3 log-event.py <event_type>

The hook input JSON is passed via stdin (as per Claude Code hooks spec).
"""

import json
import subprocess
import sys
import time
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from hook_client import log_event


def main():
    if len(sys.argv) < 2:
        print("Usage: log-event.py <event_type> [original_hook_command...]", file=sys.stderr)
        sys.exit(1)

    event_type = sys.argv[1]
    wrapped_command = sys.argv[2:] if len(sys.argv) > 2 else None

    # Read hook input from stdin
    stdin_data = sys.stdin.read()
    try:
        hook_input = json.loads(stdin_data) if stdin_data else {}
    except json.JSONDecodeError:
        hook_input = {}

    # Extract tool info if present
    tool_name = hook_input.get('tool_name')
    tool_input = hook_input.get('tool_input', {})

    start_time = time.time()
    exit_code = 0
    blocked = False
    block_reason = None

    if wrapped_command:
        # Run the wrapped command, passing hook input via stdin
        try:
            result = subprocess.run(
                wrapped_command,
                input=stdin_data,
                capture_output=True,
                text=True
            )
            exit_code = result.returncode

            # Check if the wrapped hook blocked the action
            if exit_code == 2:
                blocked = True
                # Try to parse block reason from stdout
                try:
                    output = json.loads(result.stdout)
                    block_reason = output.get('reason', result.stdout.strip())
                except json.JSONDecodeError:
                    block_reason = result.stdout.strip() or result.stderr.strip()
        except Exception as e:
            exit_code = 1
            block_reason = str(e)

    duration_ms = int((time.time() - start_time) * 1000)

    # Log the event
    log_event(
        event_type=event_type,
        tool_name=tool_name,
        event_data={
            'tool_input': tool_input,
            'wrapped_command': wrapped_command
        } if tool_input or wrapped_command else None,
        exit_code=exit_code,
        blocked=blocked,
        block_reason=block_reason,
        duration_ms=duration_ms,
        hook_script='log-event.py'
    )

    # Exit with the wrapped command's exit code to preserve behavior
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
