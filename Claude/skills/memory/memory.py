#!/usr/bin/env python3
"""
Memory Management Skill for Cognova

Provides access to persistent memory across Claude sessions.

Usage:
    python memory.py search <query>
    python memory.py recent [limit]
    python memory.py store <content> [options]
    python memory.py decisions
    python memory.py about <topic>
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / '_lib'))

from api import get, post
from output import success, error, info


def format_memory(memory: dict) -> str:
    """Format a memory chunk for display."""
    type_icons = {
        'decision': '[D]',
        'fact': '[F]',
        'solution': '[S]',
        'pattern': '[P]',
        'preference': '[*]',
        'summary': '[~]'
    }

    chunk_type = memory.get('chunkType', 'fact')
    icon = type_icons.get(chunk_type, '[?]')
    content = memory.get('content', '')

    # First line: icon and content
    line1 = f"{icon} {content}"

    # Second line: metadata
    parts = [f"ID: {memory['id'][:8]}"]

    if memory.get('projectPath'):
        parts.append(f"Project: {memory['projectPath']}")

    if memory.get('accessCount'):
        parts.append(f"Accessed: {memory['accessCount']}x")

    created = memory.get('createdAt', '')
    if created:
        parts.append(f"Created: {created[:10]}")

    line2 = "    " + " | ".join(parts)

    return f"{line1}\n{line2}"


def cmd_search(args):
    """Search memories by query."""
    params = {
        'query': args.query,
        'limit': args.limit or 10
    }

    if args.type:
        params['chunkType'] = args.type

    if args.project:
        params['projectPath'] = args.project

    ok, memories = get('/memory/search', params)
    if not ok:
        error(f"Failed to search memories: {memories}")
        sys.exit(1)

    if not memories:
        print(f"No memories found matching '{args.query}'")
        return

    print(f"Found {len(memories)} memory/memories:\n")
    for memory in memories:
        print(format_memory(memory))
        print()


def cmd_recent(args):
    """Get recent memories."""
    params = {
        'limit': args.limit or 10
    }

    if args.type:
        params['chunkType'] = args.type

    ok, memories = get('/memory/search', params)
    if not ok:
        error(f"Failed to fetch recent memories: {memories}")
        sys.exit(1)

    if not memories:
        print("No memories stored yet.")
        return

    print(f"Recent {len(memories)} memory/memories:\n")
    for memory in memories:
        print(format_memory(memory))
        print()


def cmd_store(args):
    """Store a new memory explicitly."""
    data = {
        'content': args.content,
        'chunkType': args.type or 'fact'
    }

    if args.project:
        data['projectPath'] = args.project

    ok, result = post('/memory/store', data)
    if ok:
        success(f"Stored memory: {args.content[:50]}...")
        print(f"\nID: {result['id'][:8]}")
        print(f"Type: {result['chunkType']}")
    else:
        error(f"Failed to store memory: {result}")
        sys.exit(1)


def cmd_decisions(args):
    """List all decision memories."""
    params = {
        'chunkType': 'decision',
        'limit': args.limit or 20
    }

    if args.project:
        params['projectPath'] = args.project

    ok, memories = get('/memory/search', params)
    if not ok:
        error(f"Failed to fetch decisions: {memories}")
        sys.exit(1)

    if not memories:
        print("No decisions recorded yet.")
        return

    print(f"Found {len(memories)} decision(s):\n")
    for memory in memories:
        print(format_memory(memory))
        print()


def cmd_about(args):
    """Find memories about a specific topic."""
    params = {
        'query': args.topic,
        'limit': args.limit or 15
    }

    ok, memories = get('/memory/search', params)
    if not ok:
        error(f"Failed to search memories: {memories}")
        sys.exit(1)

    if not memories:
        print(f"No memories found about '{args.topic}'")
        return

    print(f"Memories about '{args.topic}':\n")
    for memory in memories:
        print(format_memory(memory))
        print()


def cmd_context(args):
    """Get context that would be injected into a session."""
    params = {
        'limit': args.limit or 5
    }

    if args.project:
        params['projectPath'] = args.project

    ok, response = get('/memory/context', params)
    if not ok:
        error(f"Failed to fetch context: {response}")
        sys.exit(1)

    if not response.get('memories'):
        print("No relevant context available.")
        return

    print("Context that would be injected:\n")
    print("-" * 50)
    print(response.get('formattedContext', ''))
    print("-" * 50)
    print(f"\n({len(response['memories'])} memories included)")


def main():
    parser = argparse.ArgumentParser(description='Memory Management Skill')
    subparsers = parser.add_subparsers(dest='command', required=True)

    # Search
    search_p = subparsers.add_parser('search', help='Search memories')
    search_p.add_argument('query', help='Search query')
    search_p.add_argument('--type', '-t',
                          choices=['decision', 'fact', 'solution', 'pattern', 'preference', 'summary'],
                          help='Filter by memory type')
    search_p.add_argument('--project', '-p', help='Filter by project path')
    search_p.add_argument('--limit', '-l', type=int, default=10, help='Max results')

    # Recent
    recent_p = subparsers.add_parser('recent', help='Get recent memories')
    recent_p.add_argument('limit', nargs='?', type=int, default=10, help='Number of memories')
    recent_p.add_argument('--type', '-t',
                          choices=['decision', 'fact', 'solution', 'pattern', 'preference', 'summary'],
                          help='Filter by memory type')

    # Store
    store_p = subparsers.add_parser('store', help='Store a memory')
    store_p.add_argument('content', help='Memory content')
    store_p.add_argument('--type', '-t',
                         choices=['decision', 'fact', 'solution', 'pattern', 'preference', 'summary'],
                         default='fact',
                         help='Memory type (default: fact)')
    store_p.add_argument('--project', '-p', help='Associated project path')

    # Decisions
    decisions_p = subparsers.add_parser('decisions', help='List decision memories')
    decisions_p.add_argument('--project', '-p', help='Filter by project')
    decisions_p.add_argument('--limit', '-l', type=int, default=20, help='Max results')

    # About
    about_p = subparsers.add_parser('about', help='Find memories about a topic')
    about_p.add_argument('topic', help='Topic to search for')
    about_p.add_argument('--limit', '-l', type=int, default=15, help='Max results')

    # Context
    context_p = subparsers.add_parser('context', help='Preview session context')
    context_p.add_argument('--project', '-p', help='Project path')
    context_p.add_argument('--limit', '-l', type=int, default=5, help='Max memories')

    args = parser.parse_args()

    commands = {
        'search': cmd_search,
        'recent': cmd_recent,
        'store': cmd_store,
        'decisions': cmd_decisions,
        'about': cmd_about,
        'context': cmd_context,
    }

    commands[args.command](args)


if __name__ == '__main__':
    main()
