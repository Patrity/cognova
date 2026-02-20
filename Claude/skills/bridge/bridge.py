#!/usr/bin/env python3
"""Manage message bridge integrations in Cognova."""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory for _lib imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from _lib.api import get, post, put, delete


PLATFORMS = ['telegram', 'discord', 'imessage', 'google', 'email']

PLATFORM_LABELS = {
    'telegram': 'Telegram',
    'discord': 'Discord',
    'imessage': 'iMessage',
    'google': 'Google Suite',
    'email': 'Email'
}

HEALTH_ICONS = {
    'connected': '+',
    'disconnected': '-',
    'error': '!',
    'unconfigured': '?'
}


def cmd_list(args):
    """List all configured bridges."""
    success, data = get("/bridges")
    if not success:
        print(f"Error: {data}")
        sys.exit(1)

    bridges = data if isinstance(data, list) else []
    if not bridges:
        print("No bridges configured.")
        print("\nAvailable platforms: " + ", ".join(PLATFORMS))
        print("Use: python3 bridge.py create --platform <platform> --name <name>")
        return

    name_width = max(len(b.get("name", "")) for b in bridges)
    name_width = max(name_width, 4)

    print(f"{'Name':<{name_width}}  {'Platform':<12}  {'Enabled':<8}  {'Health'}")
    print(f"{'-' * name_width}  {'-' * 12}  {'-' * 8}  {'-' * 15}")

    for b in bridges:
        name = b.get("name", "")
        platform = PLATFORM_LABELS.get(b.get("platform", ""), b.get("platform", ""))
        enabled = "Yes" if b.get("enabled") else "No"
        health = b.get("healthStatus", "unconfigured")
        icon = HEALTH_ICONS.get(health, "?")
        print(f"{name:<{name_width}}  {platform:<12}  {enabled:<8}  [{icon}] {health}")

    print(f"\n{len(bridges)} bridge(s) configured.")


def cmd_get(args):
    """Get bridge details."""
    success, data = get(f"/bridges/{args.id}")
    if not success:
        print(f"Error: {data}")
        sys.exit(1)

    print(f"Bridge: {data.get('name')}")
    print(f"Platform: {PLATFORM_LABELS.get(data.get('platform', ''), data.get('platform', ''))}")
    print(f"Enabled: {data.get('enabled')}")
    print(f"Health: {data.get('healthStatus')}")
    if data.get('healthMessage'):
        print(f"Health Message: {data.get('healthMessage')}")
    if data.get('config'):
        try:
            config = json.loads(data['config']) if isinstance(data['config'], str) else data['config']
            print(f"Config: {json.dumps(config, indent=2)}")
        except (json.JSONDecodeError, TypeError):
            print(f"Config: {data.get('config')}")
    if data.get('secretKeys'):
        print(f"Secret Keys: {', '.join(data['secretKeys'])}")
    print(f"Created: {data.get('createdAt', '')[:19]}")
    print(f"Updated: {data.get('updatedAt', '')[:19]}")
    print(f"ID: {data.get('id')}")


def cmd_create(args):
    """Create a new bridge."""
    if args.platform not in PLATFORMS:
        print(f"Error: Invalid platform '{args.platform}'")
        print(f"Valid platforms: {', '.join(PLATFORMS)}")
        sys.exit(1)

    body = {
        "platform": args.platform,
        "name": args.name,
        "enabled": args.enabled
    }

    success, data = post("/bridges", body)
    if not success:
        print(f"Error: {data}")
        sys.exit(1)

    print(f"Bridge created: {data.get('name')} ({PLATFORM_LABELS.get(args.platform, args.platform)})")
    print(f"ID: {data.get('id')}")
    print(f"Enabled: {data.get('enabled')}")
    if not data.get('enabled'):
        print("\nNext steps:")
        print(f"  1. Configure: python3 bridge.py configure {data.get('id')} --config '{{...}}'")
        print(f"  2. Enable: python3 bridge.py enable {data.get('id')}")


def cmd_enable(args):
    """Enable a bridge."""
    success, data = put(f"/bridges/{args.id}", {"enabled": True})
    if not success:
        print(f"Error: {data}")
        sys.exit(1)
    print(f"Bridge '{data.get('name')}' enabled.")


def cmd_disable(args):
    """Disable a bridge."""
    success, data = put(f"/bridges/{args.id}", {"enabled": False})
    if not success:
        print(f"Error: {data}")
        sys.exit(1)
    print(f"Bridge '{data.get('name')}' disabled.")


def cmd_configure(args):
    """Update bridge configuration."""
    try:
        config = json.loads(args.config)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON config: {e}")
        sys.exit(1)

    body = {"config": config}
    if args.secret_keys:
        body["secretKeys"] = args.secret_keys

    success, data = put(f"/bridges/{args.id}", body)
    if not success:
        print(f"Error: {data}")
        sys.exit(1)

    print(f"Bridge '{data.get('name')}' configuration updated.")


def cmd_delete(args):
    """Delete a bridge."""
    success, data = delete(f"/bridges/{args.id}")
    if not success:
        print(f"Error: {data}")
        sys.exit(1)
    print(f"Bridge '{data.get('name')}' deleted.")


def cmd_context(args):
    """Show current bridge context."""
    success, data = get("/bridges/context")
    if not success:
        print(f"Error: {data}")
        sys.exit(1)

    formatted = data.get("formatted", "") if isinstance(data, dict) else ""
    if formatted:
        print(formatted)
    else:
        print("No integrations configured.")
        print("\nUse: python3 bridge.py create --platform <platform> --name <name>")


def main():
    parser = argparse.ArgumentParser(description="Manage message bridge integrations")
    sub = parser.add_subparsers(dest="command", help="Command to run")

    # list
    sub.add_parser("list", help="List all bridges")

    # get
    p_get = sub.add_parser("get", help="Get bridge details")
    p_get.add_argument("id", help="Bridge ID")

    # create
    p_create = sub.add_parser("create", help="Create a new bridge")
    p_create.add_argument("--platform", required=True, choices=PLATFORMS, help="Platform type")
    p_create.add_argument("--name", required=True, help="Display name")
    p_create.add_argument("--enabled", action="store_true", help="Enable immediately")

    # enable / disable
    p_enable = sub.add_parser("enable", help="Enable a bridge")
    p_enable.add_argument("id", help="Bridge ID")
    p_disable = sub.add_parser("disable", help="Disable a bridge")
    p_disable.add_argument("id", help="Bridge ID")

    # configure
    p_config = sub.add_parser("configure", help="Update bridge config")
    p_config.add_argument("id", help="Bridge ID")
    p_config.add_argument("--config", required=True, help="JSON config string")
    p_config.add_argument("--secret-keys", nargs="*", help="Secret key references")

    # delete
    p_delete = sub.add_parser("delete", help="Delete a bridge")
    p_delete.add_argument("id", help="Bridge ID")

    # context
    sub.add_parser("context", help="Show integration context")

    args = parser.parse_args()

    commands = {
        "list": cmd_list,
        "get": cmd_get,
        "create": cmd_create,
        "enable": cmd_enable,
        "disable": cmd_disable,
        "configure": cmd_configure,
        "delete": cmd_delete,
        "context": cmd_context
    }

    if args.command in commands:
        commands[args.command](args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
