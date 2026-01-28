#!/usr/bin/env python3
"""
Output formatting for Claude Code skills.

Provides consistent, Claude-friendly output formatting.
"""

import sys
from typing import Any


def success(message: str, data: Any = None) -> None:
    """Print success message with optional data."""
    print(f"SUCCESS: {message}")
    if data:
        print(f"\n{format_data(data)}")


def error(message: str) -> None:
    """Print error message to stderr."""
    print(f"ERROR: {message}", file=sys.stderr)


def info(message: str) -> None:
    """Print info message to stderr (not captured in output)."""
    print(f"INFO: {message}", file=sys.stderr)


def warn(message: str) -> None:
    """Print warning message to stderr."""
    print(f"WARNING: {message}", file=sys.stderr)


def format_task(task: dict) -> str:
    """Format a task for display."""
    status_icons = {
        'todo': '[ ]',
        'in_progress': '[~]',
        'done': '[x]',
        'blocked': '[!]'
    }
    priority_markers = {1: '', 2: '!', 3: '!!'}

    status = status_icons.get(task.get('status', 'todo'), '[ ]')
    priority = priority_markers.get(task.get('priority', 2), '!')

    parts = [status]
    if priority:
        parts.append(priority)
    parts.append(task['title'])

    if task.get('project'):
        parts.append(f"[{task['project']['name']}]")

    if task.get('dueDate'):
        due_str = task['dueDate']
        if isinstance(due_str, str):
            due_str = due_str[:10]
        parts.append(f"(due: {due_str})")

    line1 = ' '.join(parts)
    line2 = f"    ID: {task['id'][:8]}"

    if task.get('tags'):
        line2 += f" | Tags: {', '.join(task['tags'])}"

    return f"{line1}\n{line2}"


def format_project(project: dict) -> str:
    """Format a project for display."""
    desc = ""
    if project.get('description'):
        desc = f"\n  {project['description'][:60]}..."

    return f"- {project['name']} ({project['color']})\n  ID: {project['id'][:8]}{desc}"


def format_data(data: Any) -> str:
    """Format arbitrary data for display."""
    if isinstance(data, list):
        if not data:
            return "(empty)"
        if 'title' in data[0]:
            return "\n\n".join(format_task(t) for t in data)
        elif 'name' in data[0]:
            return "\n\n".join(format_project(p) for p in data)
        return str(data)
    elif isinstance(data, dict):
        if 'title' in data:
            return format_task(data)
        elif 'name' in data:
            return format_project(data)
        return str(data)
    return str(data)
