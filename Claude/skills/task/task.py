#!/usr/bin/env python3
"""
Task Management Skill for Cognova

Usage:
    python task.py create <title> [options]
    python task.py list [filters]
    python task.py update <id> [options]
    python task.py done <id_or_search>
    python task.py delete <id>
"""

import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / '_lib'))

from api import get, post, put, delete
from output import success, error, info, format_task


def parse_date(date_str: str) -> str | None:
    """Parse natural language date to ISO format."""
    if not date_str:
        return None

    lower = date_str.lower().strip()
    today = datetime.now()

    if lower == 'today':
        return today.strftime('%Y-%m-%d')
    elif lower == 'tomorrow':
        return (today + timedelta(days=1)).strftime('%Y-%m-%d')
    elif lower == 'next week':
        return (today + timedelta(weeks=1)).strftime('%Y-%m-%d')
    elif lower in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        target = days.index(lower)
        current = today.weekday()
        delta = (target - current) % 7
        if delta == 0:
            delta = 7
        return (today + timedelta(days=delta)).strftime('%Y-%m-%d')

    try:
        parsed = datetime.strptime(date_str, '%Y-%m-%d')
        return parsed.strftime('%Y-%m-%d')
    except ValueError:
        pass

    return date_str


def find_project(name: str) -> dict | None:
    """Search for a project by name."""
    ok, projects = get('/projects')
    if not ok:
        return None

    for p in projects:
        if p['name'].lower() == name.lower():
            return p

    matches = [p for p in projects if name.lower() in p['name'].lower()]

    if len(matches) == 1:
        return matches[0]
    elif len(matches) > 1:
        print("Multiple projects match:", file=sys.stderr)
        for p in matches:
            print(f"  - {p['name']} (ID: {p['id'][:8]})", file=sys.stderr)
        print("\nPlease be more specific.", file=sys.stderr)
        return None

    return None


def find_task_by_id(id_prefix: str) -> str | None:
    """Find a task by ID prefix."""
    ok, tasks = get('/tasks', {'includeDeleted': 'false'})
    if not ok:
        return None

    for task in tasks:
        if task['id'].startswith(id_prefix):
            return task['id']

    return None


def cmd_create(args):
    """Create a new task."""
    data = {
        'title': args.title,
        'priority': args.priority or 2,
    }

    if args.description:
        data['description'] = args.description

    if args.due:
        data['dueDate'] = parse_date(args.due)

    if args.tags:
        data['tags'] = [t.strip() for t in args.tags.split(',')]

    if args.project:
        project = find_project(args.project)
        if project:
            data['projectId'] = project['id']
            info(f"Associated with project: {project['name']}")
        else:
            info(f"No project found matching '{args.project}'. Task created without project.")

    ok, result = post('/tasks', data)
    if ok:
        success(f"Created task: {result['title']}", result)
    else:
        error(f"Failed to create task: {result}")
        sys.exit(1)


def cmd_list(args):
    """List tasks with filters."""
    params = {}

    if args.status:
        params['status'] = args.status
    if args.project:
        project = find_project(args.project)
        if project:
            params['projectId'] = project['id']
    if args.search:
        params['search'] = args.search

    ok, tasks = get('/tasks', params)
    if not ok:
        error(f"Failed to fetch tasks: {tasks}")
        sys.exit(1)

    if args.due:
        today = datetime.now().date()
        filtered = []
        for t in tasks:
            if not t.get('dueDate'):
                continue
            try:
                due = datetime.fromisoformat(t['dueDate'].replace('Z', '+00:00')).date()
            except (ValueError, AttributeError):
                continue

            if args.due == 'today' and due <= today:
                filtered.append(t)
            elif args.due == 'week' and due <= today + timedelta(days=7):
                filtered.append(t)
            elif args.due == 'overdue' and due < today:
                filtered.append(t)
        tasks = filtered

    if not tasks:
        print("No tasks found matching criteria.")
        return

    print(f"Found {len(tasks)} task(s):\n")
    for task in tasks:
        print(format_task(task))
        print()


def cmd_update(args):
    """Update an existing task."""
    data = {}

    if args.title:
        data['title'] = args.title
    if args.description:
        data['description'] = args.description
    if args.status:
        data['status'] = args.status
    if args.priority:
        data['priority'] = args.priority
    if args.due:
        data['dueDate'] = parse_date(args.due)
    if args.tags:
        data['tags'] = [t.strip() for t in args.tags.split(',')]
    if args.project:
        project = find_project(args.project)
        if project:
            data['projectId'] = project['id']

    if not data:
        error("No updates specified")
        sys.exit(1)

    task_id = find_task_by_id(args.id)
    if not task_id:
        error(f"Task not found: {args.id}")
        sys.exit(1)

    ok, result = put(f'/tasks/{task_id}', data)
    if ok:
        success(f"Updated task: {result['title']}", result)
    else:
        error(f"Failed to update task: {result}")
        sys.exit(1)


def cmd_done(args):
    """Mark a task as done."""
    task_id = find_task_by_id(args.id_or_search)

    if not task_id:
        ok, tasks = get('/tasks', {'search': args.id_or_search})
        if ok and tasks:
            incomplete = [t for t in tasks if t.get('status') != 'done']
            if len(incomplete) == 1:
                task_id = incomplete[0]['id']
            elif len(incomplete) > 1:
                print(f"Multiple tasks match '{args.id_or_search}':", file=sys.stderr)
                for t in incomplete[:5]:
                    print(f"  - {t['title']} (ID: {t['id'][:8]})", file=sys.stderr)
                error("Please be more specific or use task ID")
                sys.exit(1)

    if not task_id:
        error(f"Task not found: {args.id_or_search}")
        sys.exit(1)

    ok, result = put(f'/tasks/{task_id}', {'status': 'done'})
    if ok:
        success(f"Completed: {result['title']}")
    else:
        error(f"Failed to complete task: {result}")
        sys.exit(1)


def cmd_delete(args):
    """Delete a task (soft delete)."""
    task_id = find_task_by_id(args.id)
    if not task_id:
        error(f"Task not found: {args.id}")
        sys.exit(1)

    ok, result = delete(f'/tasks/{task_id}')
    if ok:
        success(f"Deleted task: {args.id}")
    else:
        error(f"Failed to delete task: {result}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Task Management Skill')
    subparsers = parser.add_subparsers(dest='command', required=True)

    # Create
    create_p = subparsers.add_parser('create', help='Create a new task')
    create_p.add_argument('title', help='Task title')
    create_p.add_argument('--project', '-p', help='Project name')
    create_p.add_argument('--priority', '-P', type=int, choices=[1, 2, 3],
                          help='Priority (1=Low, 2=Medium, 3=High)')
    create_p.add_argument('--due', '-d', help='Due date')
    create_p.add_argument('--tags', '-t', help='Comma-separated tags')
    create_p.add_argument('--description', help='Task description')

    # List
    list_p = subparsers.add_parser('list', help='List tasks')
    list_p.add_argument('--status', '-s',
                        choices=['todo', 'in_progress', 'done', 'blocked'])
    list_p.add_argument('--project', '-p', help='Filter by project')
    list_p.add_argument('--search', '-q', help='Search title/description')
    list_p.add_argument('--due', choices=['today', 'week', 'overdue'])

    # Update
    update_p = subparsers.add_parser('update', help='Update a task')
    update_p.add_argument('id', help='Task ID (prefix)')
    update_p.add_argument('--title', help='New title')
    update_p.add_argument('--description', help='New description')
    update_p.add_argument('--status',
                          choices=['todo', 'in_progress', 'done', 'blocked'])
    update_p.add_argument('--priority', type=int, choices=[1, 2, 3])
    update_p.add_argument('--due', help='New due date')
    update_p.add_argument('--tags', help='New tags')
    update_p.add_argument('--project', help='New project')

    # Done
    done_p = subparsers.add_parser('done', help='Mark task as done')
    done_p.add_argument('id_or_search', help='Task ID or title search')

    # Delete
    delete_p = subparsers.add_parser('delete', help='Delete a task')
    delete_p.add_argument('id', help='Task ID (prefix)')

    args = parser.parse_args()

    commands = {
        'create': cmd_create,
        'list': cmd_list,
        'update': cmd_update,
        'done': cmd_done,
        'delete': cmd_delete,
    }

    commands[args.command](args)


if __name__ == '__main__':
    main()
