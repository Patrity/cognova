#!/usr/bin/env python3
"""Manage encrypted secrets in Cognova."""

import argparse
import sys
from pathlib import Path

# Add parent directory for _lib imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from _lib.api import get, post, put, delete, get_secret


def cmd_list(args):
    """List all stored secrets."""
    success, data = get("/secrets")
    if not success:
        print(f"Error: {data}")
        sys.exit(1)

    secrets = data if isinstance(data, list) else []
    if not secrets:
        print("No secrets stored.")
        print("\nUse: python3 secret.py set KEY --value VALUE")
        return

    # Calculate column widths
    key_width = max(len(s.get("key", "")) for s in secrets)
    key_width = max(key_width, 3)

    print(f"{'Key':<{key_width}}  {'Description':<40}  {'Updated'}")
    print(f"{'-' * key_width}  {'-' * 40}  {'-' * 19}")

    for s in secrets:
        key = s.get("key", "")
        desc = s.get("description", "") or ""
        updated = s.get("updatedAt", s.get("createdAt", ""))[:19] if s.get("updatedAt") or s.get("createdAt") else ""
        # Truncate description if too long
        if len(desc) > 40:
            desc = desc[:37] + "..."
        print(f"{key:<{key_width}}  {desc:<40}  {updated}")

    print(f"\n{len(secrets)} secret(s) stored.")


def cmd_get(args):
    """Get a secret value."""
    success, value = get_secret(args.key)
    if not success:
        print(f"Error: {value}")
        print(f"\nSecret '{args.key}' not found. Use 'list' to see available secrets.")
        sys.exit(1)

    if args.raw:
        # Raw output for piping to other commands
        print(value, end="")
    else:
        print(f"Secret '{args.key}' retrieved successfully.")
        print(f"Value: {value}")


def cmd_set(args):
    """Create or update a secret."""
    if not args.value:
        print("Error: --value is required")
        sys.exit(1)

    data = {
        "key": args.key,
        "value": args.value,
    }
    if args.description:
        data["description"] = args.description

    # Try to check if it exists first
    check_success, _ = get_secret(args.key)

    if check_success:
        # Update existing
        success, result = put(f"/secrets/{args.key}", data)
        action = "updated"
    else:
        # Create new
        success, result = post("/secrets", data)
        action = "created"

    if not success:
        print(f"Error: {result}")
        sys.exit(1)

    print(f"Secret '{args.key}' {action} successfully.")
    if args.description:
        print(f"Description: {args.description}")


def cmd_delete(args):
    """Delete a secret."""
    success, result = delete(f"/secrets/{args.key}")
    if not success:
        print(f"Error: {result}")
        sys.exit(1)

    print(f"Secret '{args.key}' deleted successfully.")


def main():
    parser = argparse.ArgumentParser(
        description="Manage encrypted secrets in Cognova"
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # list
    subparsers.add_parser("list", help="List all secrets")

    # get
    get_parser = subparsers.add_parser("get", help="Get a secret value")
    get_parser.add_argument("key", help="Secret key name")
    get_parser.add_argument("--raw", action="store_true", help="Output raw value only")

    # set
    set_parser = subparsers.add_parser("set", help="Create or update a secret")
    set_parser.add_argument("key", help="Secret key name (SCREAMING_SNAKE_CASE)")
    set_parser.add_argument("--value", required=True, help="Secret value")
    set_parser.add_argument("--description", help="Description of what this secret is for")

    # delete
    del_parser = subparsers.add_parser("delete", help="Delete a secret")
    del_parser.add_argument("key", help="Secret key name")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    commands = {
        "list": cmd_list,
        "get": cmd_get,
        "set": cmd_set,
        "delete": cmd_delete,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
