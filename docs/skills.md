# Skills

Custom Claude Code skills for the second brain. Each skill is a Python script that Claude executes directly.

## Directory Structure

```
~/second-brain/.claude/
├── commands/
│   ├── tasks/
│   │   ├── tasks.md          # Skill instructions for Claude
│   │   └── tasks.py          # Executable script
│   ├── remind/
│   │   ├── remind.md
│   │   └── remind.py
│   └── capture/
│       └── capture.md        # Simple skill, no script needed
├── CLAUDE.md                  # Main context file
└── settings.json              # Claude Code settings
```

## Skill: /tasks

Manage tasks stored in Neon PostgreSQL.

### tasks.md

```markdown
# Tasks

Manage tasks in the second brain database.

## Commands

### /tasks
List all incomplete tasks, grouped by project.

### /tasks add <title> [--due <date>] [--project <name>] [--priority <1-3>]
Create a new task.

Examples:
- `/tasks add "Review budget report"`
- `/tasks add "Call dentist" --due tomorrow`
- `/tasks add "Deploy update" --project homelab --priority 2`

### /tasks done <id>
Mark a task as complete. Use the short ID shown in the list.

### /tasks start <id>
Mark a task as in progress.

### /tasks delete <id>
Delete a task.

## Date Parsing
The --due flag accepts natural language:
- "today", "tomorrow", "friday"
- "next week", "in 3 days"
- "2026-01-20" (ISO format)
```

### tasks.py

```python
#!/usr/bin/env python3
"""Task management skill for Claude Code second brain."""

import os
import sys
import argparse
from datetime import datetime, timedelta
from dateutil import parser as dateparser
from dateutil.relativedelta import relativedelta, FR, MO, TU, WE, TH, SA, SU
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def parse_due_date(due_str: str) -> datetime:
    """Parse natural language dates."""
    today = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
    due_lower = due_str.lower().strip()

    if due_lower == 'today':
        return today
    elif due_lower == 'tomorrow':
        return today + timedelta(days=1)
    elif due_lower in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
        weekdays = {'monday': MO, 'tuesday': TU, 'wednesday': WE, 'thursday': TH,
                    'friday': FR, 'saturday': SA, 'sunday': SU}
        return today + relativedelta(weekday=weekdays[due_lower](+1))
    elif due_lower == 'next week':
        return today + relativedelta(weeks=1, weekday=MO)
    elif due_lower.startswith('in '):
        # "in 3 days", "in 2 weeks"
        parts = due_lower[3:].split()
        num = int(parts[0])
        unit = parts[1].rstrip('s')
        if unit == 'day':
            return today + timedelta(days=num)
        elif unit == 'week':
            return today + timedelta(weeks=num)

    # Fallback to dateutil parser
    return dateparser.parse(due_str)

def list_tasks():
    """List all incomplete tasks."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, title, status, priority, project, due_date
            FROM tasks
            WHERE status != 'done'
            ORDER BY
                CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
                due_date ASC,
                priority DESC,
                created_at DESC
        """)
        tasks = cur.fetchall()

    if not tasks:
        print("No tasks found. Use `/tasks add` to create one.")
        return

    # Group by project
    projects = {}
    for t in tasks:
        proj = t['project'] or 'No Project'
        if proj not in projects:
            projects[proj] = []
        projects[proj].append(t)

    for proj, items in projects.items():
        print(f"\n## {proj}\n")
        for t in items:
            status_icon = {'todo': '○', 'in_progress': '●', 'blocked': '⊘'}[t['status']]
            short_id = str(t['id'])[:8]
            due = f" (due: {t['due_date'].strftime('%b %d')})" if t['due_date'] else ""
            priority = "!" * t['priority'] if t['priority'] > 0 else ""
            print(f"  {status_icon} [{short_id}] {priority}{t['title']}{due}")

def add_task(title: str, due: str = None, project: str = None, priority: int = 0):
    """Add a new task."""
    due_date = parse_due_date(due) if due else None

    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO tasks (title, due_date, project, priority)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (title, due_date, project, priority))
        task_id = cur.fetchone()['id']
        conn.commit()

    short_id = str(task_id)[:8]
    due_str = f" (due: {due_date.strftime('%b %d')})" if due_date else ""
    proj_str = f" [{project}]" if project else ""
    print(f"Created task [{short_id}]: {title}{due_str}{proj_str}")

def update_status(task_id: str, status: str):
    """Update task status."""
    with get_connection() as conn:
        cur = conn.cursor()
        completed_at = datetime.now() if status == 'done' else None
        cur.execute("""
            UPDATE tasks
            SET status = %s,
                updated_at = NOW(),
                completed_at = %s
            WHERE id::text LIKE %s
        """, (status, completed_at, f"{task_id}%"))

        if cur.rowcount == 0:
            print(f"Task not found: {task_id}")
            return

        conn.commit()

    action = {'done': 'Completed', 'in_progress': 'Started', 'blocked': 'Blocked'}[status]
    print(f"{action} task [{task_id}]")

def delete_task(task_id: str):
    """Delete a task."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM tasks WHERE id::text LIKE %s", (f"{task_id}%",))

        if cur.rowcount == 0:
            print(f"Task not found: {task_id}")
            return

        conn.commit()

    print(f"Deleted task [{task_id}]")

def main():
    parser = argparse.ArgumentParser(description='Task management')
    subparsers = parser.add_subparsers(dest='command')

    # List (default)
    subparsers.add_parser('list')

    # Add
    add_parser = subparsers.add_parser('add')
    add_parser.add_argument('title', nargs='+')
    add_parser.add_argument('--due', '-d')
    add_parser.add_argument('--project', '-p')
    add_parser.add_argument('--priority', '-P', type=int, default=0)

    # Status changes
    subparsers.add_parser('done').add_argument('id')
    subparsers.add_parser('start').add_argument('id')
    subparsers.add_parser('block').add_argument('id')
    subparsers.add_parser('delete').add_argument('id')

    args = parser.parse_args()

    if args.command is None or args.command == 'list':
        list_tasks()
    elif args.command == 'add':
        add_task(' '.join(args.title), args.due, args.project, args.priority)
    elif args.command == 'done':
        update_status(args.id, 'done')
    elif args.command == 'start':
        update_status(args.id, 'in_progress')
    elif args.command == 'block':
        update_status(args.id, 'blocked')
    elif args.command == 'delete':
        delete_task(args.id)

if __name__ == '__main__':
    main()
```

## Skill: /remind

Set reminders with notifications.

### remind.md

```markdown
# Remind

Set reminders that send push notifications.

## Commands

### /remind <message> --at <time>
Set a reminder.

Examples:
- `/remind "Check laundry" --at "in 30 minutes"`
- `/remind "Call mom" --at "5pm"`
- `/remind "Weekly review" --at "friday 9am"`

### /remind list
Show upcoming reminders.

### /remind check
Check for due reminders (called by hooks/cron).
```

### remind.py

```python
#!/usr/bin/env python3
"""Reminder skill with Gotify notifications."""

import os
import sys
import argparse
import requests
from datetime import datetime
from dateutil import parser as dateparser
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')
GOTIFY_URL = os.environ.get('GOTIFY_URL')
GOTIFY_TOKEN = os.environ.get('GOTIFY_TOKEN')

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def send_notification(title: str, message: str, priority: int = 5):
    """Send push notification via Gotify."""
    if not GOTIFY_URL or not GOTIFY_TOKEN:
        print(f"[Would notify] {title}: {message}")
        return

    requests.post(
        f"{GOTIFY_URL}/message",
        headers={"X-Gotify-Key": GOTIFY_TOKEN},
        json={"title": title, "message": message, "priority": priority}
    )

def add_reminder(message: str, at: str):
    """Create a reminder."""
    remind_at = dateparser.parse(at)

    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO reminders (message, remind_at)
            VALUES (%s, %s)
            RETURNING id
        """, (message, remind_at))
        reminder_id = cur.fetchone()['id']
        conn.commit()

    print(f"Reminder set for {remind_at.strftime('%b %d at %I:%M %p')}: {message}")

def list_reminders():
    """List upcoming reminders."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, message, remind_at
            FROM reminders
            WHERE NOT notified AND remind_at > NOW()
            ORDER BY remind_at ASC
            LIMIT 10
        """)
        reminders = cur.fetchall()

    if not reminders:
        print("No upcoming reminders.")
        return

    print("## Upcoming Reminders\n")
    for r in reminders:
        time_str = r['remind_at'].strftime('%b %d at %I:%M %p')
        print(f"  • {time_str}: {r['message']}")

def check_due():
    """Check and send due reminders."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, message, remind_at
            FROM reminders
            WHERE NOT notified AND remind_at <= NOW()
        """)
        due = cur.fetchall()

        for r in due:
            send_notification("Reminder", r['message'])
            cur.execute("UPDATE reminders SET notified = TRUE WHERE id = %s", (r['id'],))

        conn.commit()

    if due:
        print(f"Sent {len(due)} reminder(s).")
    else:
        print("No due reminders.")

def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest='command')

    add_parser = subparsers.add_parser('add')
    add_parser.add_argument('message', nargs='+')
    add_parser.add_argument('--at', '-a', required=True)

    subparsers.add_parser('list')
    subparsers.add_parser('check')

    args = parser.parse_args()

    if args.command == 'add':
        add_reminder(' '.join(args.message), args.at)
    elif args.command == 'list':
        list_reminders()
    elif args.command == 'check':
        check_due()
    else:
        list_reminders()

if __name__ == '__main__':
    main()
```

## Skill: /capture

Quick note capture - no script needed, just instructions.

### capture.md

```markdown
# Capture

Quickly capture a note to the inbox.

## /capture <note>

Create a new note in `inbox/` with today's date and a slug from the content.

Example:
- `/capture Interesting idea about project structure`

Creates: `inbox/2026-01-14-interesting-idea-about-project-structure.md`

## Process

1. Generate filename from date + slugified title
2. Create markdown file with frontmatter:
   ```markdown
   ---
   created: 2026-01-14T10:30:00
   status: inbox
   ---

   Interesting idea about project structure
   ```
3. Confirm creation to user
```

Claude handles this directly - reads the instructions, creates the file, no Python needed.

## CLAUDE.md

The main context file that shapes Claude's behavior:

```markdown
# Second Brain

You are my personal knowledge management assistant.

## On Session Start

1. Run `/remind check` to see if any reminders are due
2. Run `/tasks` to show current task list
3. Greet me with a brief summary

## Core Behaviors

- **Task awareness**: Reference tasks when relevant to conversation
- **Capture insights**: Offer to save important information with `/capture`
- **Check before answering**: Search existing notes before giving advice
- **Suggest connections**: Link related ideas across the vault

## Vault Structure

| Folder | Purpose |
|--------|---------|
| inbox/ | Unsorted captures |
| areas/ | Ongoing responsibilities |
| projects/ | Active projects with outcomes |
| resources/ | Reference material |
| archive/ | Completed/inactive |

## Active Projects

@projects/index.md

## Current Focus Areas

@areas/index.md
```

## Installation

1. Copy skills to vault:
   ```bash
   cp -r skills/* ~/second-brain/.claude/commands/
   ```

2. Install Python dependencies:
   ```bash
   pip install psycopg2-binary python-dateutil requests
   ```

3. Set environment variables:
   ```bash
   export DATABASE_URL="postgresql://..."
   export GOTIFY_URL="https://gotify.yourdomain.com"
   export GOTIFY_TOKEN="your-token"
   ```

4. Create database tables (see data-models.md)

5. Run Claude Code:
   ```bash
   cd ~/second-brain && claude
   ```
