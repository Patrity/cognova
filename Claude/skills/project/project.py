#!/usr/bin/env python3
"""
Project Management Skill for Cognova

Usage:
    python project.py search <query>
    python project.py list
    python project.py create <name> --color <hex> [--description <text>]
    python project.py update <id> [options]
    python project.py delete <id>
"""

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / '_lib'))

from api import get, post, put, delete
from output import success, error, info, warn, format_project


def validate_color(color: str) -> bool:
    """Validate hex color format."""
    return bool(re.match(r'^#[0-9A-Fa-f]{6}$', color))


def find_project_by_id(id_prefix: str) -> str | None:
    """Find a project by ID prefix."""
    ok, projects = get('/projects')
    if not ok:
        return None

    for project in projects:
        if project['id'].startswith(id_prefix):
            return project['id']

    return None


def cmd_search(args):
    """Search for projects by name."""
    ok, projects = get('/projects')
    if not ok:
        error(f"Failed to fetch projects: {projects}")
        sys.exit(1)

    query = args.query.lower()
    matches = [p for p in projects if query in p['name'].lower()]

    if not matches:
        print(f"No projects found matching '{args.query}'")
        return

    print(f"Found {len(matches)} project(s) matching '{args.query}':\n")
    for p in matches:
        print(format_project(p))
        print()


def cmd_list(args):
    """List all projects."""
    ok, projects = get('/projects')
    if not ok:
        error(f"Failed to fetch projects: {projects}")
        sys.exit(1)

    if not projects:
        print("No projects found.")
        return

    print(f"Found {len(projects)} project(s):\n")
    for p in projects:
        print(format_project(p))
        print()


def cmd_create(args):
    """Create a new project."""
    if not validate_color(args.color):
        error(f"Invalid color format: {args.color}. Use hex format like #3b82f6")
        sys.exit(1)

    # Check for existing projects with similar names
    ok, projects = get('/projects')
    if ok:
        name_lower = args.name.lower()
        similar = [p for p in projects if
                   name_lower in p['name'].lower() or
                   p['name'].lower() in name_lower]
        if similar:
            warn("Similar projects already exist:")
            for p in similar:
                print(f"  - {p['name']} ({p['color']}) ID: {p['id'][:8]}", file=sys.stderr)
            print("\nConsider using an existing project instead.", file=sys.stderr)

    data = {
        'name': args.name,
        'color': args.color,
    }

    if args.description:
        data['description'] = args.description

    ok, result = post('/projects', data)
    if ok:
        success(f"Created project: {result['name']}", result)
    else:
        error(f"Failed to create project: {result}")
        sys.exit(1)


def cmd_update(args):
    """Update a project."""
    data = {}

    if args.name:
        data['name'] = args.name
    if args.color:
        if not validate_color(args.color):
            error(f"Invalid color format: {args.color}")
            sys.exit(1)
        data['color'] = args.color
    if args.description:
        data['description'] = args.description

    if not data:
        error("No updates specified")
        sys.exit(1)

    project_id = find_project_by_id(args.id)
    if not project_id:
        error(f"Project not found: {args.id}")
        sys.exit(1)

    ok, result = put(f'/projects/{project_id}', data)
    if ok:
        success(f"Updated project: {result['name']}", result)
    else:
        error(f"Failed to update project: {result}")
        sys.exit(1)


def cmd_delete(args):
    """Delete a project (soft delete)."""
    project_id = find_project_by_id(args.id)
    if not project_id:
        error(f"Project not found: {args.id}")
        sys.exit(1)

    ok, result = delete(f'/projects/{project_id}')
    if ok:
        success(f"Deleted project: {args.id}")
    else:
        error(f"Failed to delete project: {result}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Project Management Skill')
    subparsers = parser.add_subparsers(dest='command', required=True)

    # Search
    search_p = subparsers.add_parser('search', help='Search for projects')
    search_p.add_argument('query', help='Search query')

    # List
    subparsers.add_parser('list', help='List all projects')

    # Create
    create_p = subparsers.add_parser('create', help='Create a new project')
    create_p.add_argument('name', help='Project name')
    create_p.add_argument('--color', '-c', required=True,
                          help='Hex color (e.g., #3b82f6)')
    create_p.add_argument('--description', '-d', help='Project description')

    # Update
    update_p = subparsers.add_parser('update', help='Update a project')
    update_p.add_argument('id', help='Project ID (prefix)')
    update_p.add_argument('--name', help='New name')
    update_p.add_argument('--color', help='New color')
    update_p.add_argument('--description', help='New description')

    # Delete
    delete_p = subparsers.add_parser('delete', help='Delete a project')
    delete_p.add_argument('id', help='Project ID (prefix)')

    args = parser.parse_args()

    commands = {
        'search': cmd_search,
        'list': cmd_list,
        'create': cmd_create,
        'update': cmd_update,
        'delete': cmd_delete,
    }

    commands[args.command](args)


if __name__ == '__main__':
    main()
