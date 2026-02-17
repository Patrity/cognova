#!/usr/bin/env python3
"""
Environment Skill for Cognova

Provides system information, service status, and troubleshooting utilities.

Usage:
    python environment.py info
    python environment.py status
    python environment.py logs [--lines N]
    python environment.py health
"""

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / '_lib'))

from api import api_request, API_BASE

INSTALL_DIR = os.environ.get('COGNOVA_PROJECT_DIR', '')
VAULT_PATH = os.environ.get('VAULT_PATH', '')


def cmd_info(args):
    """Show system and installation information."""
    print("=== Cognova Environment ===\n")

    # System
    print(f"OS:           {platform.system()} {platform.release()}")
    print(f"Architecture: {platform.machine()}")
    print(f"Python:       {platform.python_version()}")

    try:
        node_v = subprocess.run(['node', '--version'], capture_output=True, text=True, timeout=5)
        print(f"Node.js:      {node_v.stdout.strip()}")
    except Exception:
        print("Node.js:      not found")

    print()

    # Paths
    print(f"Install Dir:  {INSTALL_DIR or '(not set)'}")
    print(f"Vault Path:   {VAULT_PATH or '(not set)'}")
    print(f"API URL:      {API_BASE}")
    print(f"Home Claude:  {Path.home() / '.claude'}")

    # Metadata
    meta_path = Path.home() / '.cognova'
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text())
            print(f"Version:      {meta.get('version', 'unknown')}")
            print(f"Installed:    {meta.get('installedAt', 'unknown')[:10]}")
            if meta.get('updatedAt'):
                print(f"Updated:      {meta['updatedAt'][:10]}")
        except Exception:
            pass

    print()

    # Disk
    check_dir = INSTALL_DIR or str(Path.home())
    if Path(check_dir).exists():
        usage = shutil.disk_usage(check_dir)
        total_gb = usage.total / (1024**3)
        used_gb = usage.used / (1024**3)
        free_gb = usage.free / (1024**3)
        pct = (usage.used / usage.total) * 100
        print(f"Disk Total:   {total_gb:.1f} GB")
        print(f"Disk Used:    {used_gb:.1f} GB ({pct:.0f}%)")
        print(f"Disk Free:    {free_gb:.1f} GB")

    # Memory
    try:
        if platform.system() == 'Linux':
            with open('/proc/meminfo') as f:
                meminfo = f.read()
            for line in meminfo.split('\n'):
                if line.startswith('MemTotal:'):
                    total_kb = int(line.split()[1])
                    print(f"\nRAM Total:    {total_kb / (1024**2):.1f} GB")
                elif line.startswith('MemAvailable:'):
                    avail_kb = int(line.split()[1])
                    print(f"RAM Available:{avail_kb / (1024**2):.1f} GB")
    except Exception:
        pass

    # Vault stats
    if VAULT_PATH and Path(VAULT_PATH).exists():
        vault = Path(VAULT_PATH)
        md_files = list(vault.rglob('*.md'))
        print(f"\nVault Files:  {len(md_files)} markdown documents")

        folders = ['inbox', 'projects', 'areas', 'resources', 'archive']
        for folder in folders:
            folder_path = vault / folder
            if folder_path.exists():
                count = len(list(folder_path.rglob('*.md')))
                print(f"  {folder}/: {count} files")


def cmd_status(args):
    """Check service status."""
    print("=== Service Status ===\n")

    # PM2
    try:
        result = subprocess.run(
            ['pm2', 'jlist'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            processes = json.loads(result.stdout)
            sb = [p for p in processes if p.get('name') == 'cognova']
            if sb:
                proc = sb[0]
                env = proc.get('pm2_env', {})
                monit = proc.get('monit', {})
                status = env.get('status', 'unknown')
                restarts = env.get('restart_time', 0)
                memory = monit.get('memory', 0)
                cpu = monit.get('cpu', 0)
                mem_mb = memory / (1024 * 1024)

                print(f"PM2 Status:   {status}")
                print(f"Memory:       {mem_mb:.0f} MB")
                print(f"CPU:          {cpu}%")
                print(f"Restarts:     {restarts}")
            else:
                print("PM2 Status:   not found (process 'cognova' not registered)")
        else:
            print("PM2 Status:   error running pm2")
    except FileNotFoundError:
        print("PM2 Status:   pm2 not installed")
    except Exception as e:
        print(f"PM2 Status:   error ({e})")

    print()

    # API health
    try:
        start = time.time()
        ok, data = api_request('GET', '/health')
        elapsed = (time.time() - start) * 1000
        if ok:
            print(f"API:          healthy ({elapsed:.0f}ms)")
            if isinstance(data, dict):
                for k, v in data.items():
                    print(f"  {k}: {v}")
        else:
            print(f"API:          unhealthy — {data}")
    except Exception as e:
        print(f"API:          unreachable ({e})")


def cmd_logs(args):
    """Show recent PM2 logs."""
    lines = args.lines or 30
    try:
        result = subprocess.run(
            ['pm2', 'logs', 'cognova', '--lines', str(lines), '--nostream'],
            capture_output=True, text=True, timeout=15
        )
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr)
    except FileNotFoundError:
        print("ERROR: pm2 not installed")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


def cmd_health(args):
    """Detailed API health check."""
    endpoints = [
        ('GET', '/health', 'Health'),
        ('GET', '/tasks', 'Tasks'),
        ('GET', '/projects', 'Projects'),
        ('GET', '/documents', 'Documents'),
        ('GET', '/memory/search', 'Memory'),
    ]

    print("=== API Health Check ===\n")
    print(f"Base URL: {API_BASE}\n")

    all_ok = True
    for method, endpoint, label in endpoints:
        start = time.time()
        try:
            ok, data = api_request(method, endpoint)
            elapsed = (time.time() - start) * 1000
            status = "OK" if ok else "FAIL"
            if not ok:
                all_ok = False
            print(f"  {status:4s}  {label:15s}  {elapsed:6.0f}ms")
        except Exception as e:
            all_ok = False
            print(f"  FAIL  {label:15s}  error: {e}")

    print(f"\nOverall: {'All healthy' if all_ok else 'Some endpoints failing'}")


def main():
    parser = argparse.ArgumentParser(description='Environment Skill')
    subparsers = parser.add_subparsers(dest='command', required=True)

    subparsers.add_parser('info', help='Show system information')
    subparsers.add_parser('status', help='Check service status')

    logs_p = subparsers.add_parser('logs', help='Show recent logs')
    logs_p.add_argument('--lines', '-n', type=int, default=30, help='Number of lines')

    subparsers.add_parser('health', help='API health check')

    args = parser.parse_args()

    commands = {
        'info': cmd_info,
        'status': cmd_status,
        'logs': cmd_logs,
        'health': cmd_health,
    }

    commands[args.command](args)


if __name__ == '__main__':
    main()
