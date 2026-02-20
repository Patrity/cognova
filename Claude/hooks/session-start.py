#!/usr/bin/env python3
"""
Hook: SessionStart
Logs when a Claude session begins and injects memory context.

Memory context from previous conversations is printed to stdout,
which Claude receives as additional context.
"""

import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from hook_client import log_event, read_stdin_json, get_memory_context, get_bridge_context


def main():
    hook_input = read_stdin_json()

    log_event(
        event_type='SessionStart',
        event_data=hook_input,
        hook_script='session-start.py'
    )

    # Inject bridge/integration context (printed to stdout goes to Claude)
    bridge_context = get_bridge_context()
    if bridge_context:
        print("")
        print(bridge_context)
        print("")

    # Inject memory context (printed to stdout goes to Claude)
    context = get_memory_context()
    if context:
        print("## Session Memory")
        print("")
        print("The following memories were loaded from previous sessions.")
        print("Review them before starting work.")
        print("As you work, store new insights with `/memory store`.")
        print("If the user tells you something about themselves, store it IMMEDIATELY.")
        print("")
        print(context)
    else:
        print("## Session Memory — ONBOARDING REQUIRED")
        print("")
        print("No memories loaded. This is likely a first session.")
        print("")
        print("IMPORTANT: Before doing anything else, introduce yourself briefly and then")
        print("ask the user the following questions in a single message:")
        print("")
        print("1. What do you do? (role, profession, background)")
        print("2. What kind of projects do you work on? (tech stack, domains, languages)")
        print("3. What are you hoping to use Cognova for? (goals, workflows)")
        print("4. Any tools, conventions, or preferences you're particular about?")
        print("")
        print("After they respond, store EACH distinct fact as a separate memory using")
        print("`/memory store --type preference \"...\"`.")
        print("")
        print("Then append a `## User Profile` section to your CLAUDE.md with a brief")
        print("summary (3-5 bullet points) so this context is always available.")
        print("")
        print("Only after onboarding is complete should you proceed with whatever the user needs.")


if __name__ == '__main__':
    main()
