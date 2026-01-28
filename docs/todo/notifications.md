---
tags: []
shared: false
---
# Notifications & Reminders

Push notifications via Gotify for task reminders and scheduled alerts.

## Overview

Implement a notification system that:
- Sends push notifications via Gotify
- Processes scheduled reminders from the database
- Integrates with task skill for natural language reminders
- Supports browser notifications as fallback

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Reminder Sources                      │
├─────────────────────────────────────────────────────────┤
│  Task Skill          UI Reminder Form       Cron Agent   │
│  "/remind at 5pm"    [Set Reminder]         Scheduled    │
└──────────┬───────────────┬───────────────────┬──────────┘
           │               │                   │
           ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                    Reminders Table                       │
│  id | task_id | message | remind_at | notified          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Reminder Processor (Cron)                   │
│  Every minute: check for due reminders                   │
└────────────────────┬────────────────────────────────────┘
                     │
           ┌─────────┴─────────┐
           ▼                   ▼
┌─────────────────┐   ┌─────────────────┐
│     Gotify      │   │ Browser Push    │
│  (Primary)      │   │ (Fallback)      │
└─────────────────┘   └─────────────────┘
```

## Gotify Integration

### Service

```typescript
// server/services/gotify.ts
interface GotifyMessage {
  title: string
  message: string
  priority?: number  // 0-10, higher = more urgent
  extras?: {
    'client::notification'?: {
      click?: { url: string }
    }
  }
}

export async function sendGotifyNotification(msg: GotifyMessage) {
  const url = process.env.GOTIFY_URL
  const token = process.env.GOTIFY_TOKEN

  if (!url || !token) {
    console.warn('Gotify not configured, skipping notification')
    return false
  }

  try {
    await $fetch(`${url}/message`, {
      method: 'POST',
      headers: {
        'X-Gotify-Key': token
      },
      body: {
        title: msg.title,
        message: msg.message,
        priority: msg.priority || 5,
        extras: msg.extras
      }
    })
    return true
  } catch (error) {
    console.error('Failed to send Gotify notification:', error)
    return false
  }
}
```

### Reminder Processor

```typescript
// server/tasks/process-reminders.ts
import { db, schema } from '../db'
import { lte, eq, and } from 'drizzle-orm'
import { sendGotifyNotification } from '../services/gotify'

export async function processReminders() {
  const now = new Date()

  // Find due reminders
  const dueReminders = await db.select({
    reminder: schema.reminders,
    task: schema.tasks
  })
    .from(schema.reminders)
    .leftJoin(schema.tasks, eq(schema.reminders.taskId, schema.tasks.id))
    .where(and(
      lte(schema.reminders.remindAt, now),
      eq(schema.reminders.notified, false)
    ))

  for (const { reminder, task } of dueReminders) {
    // Send notification
    await sendGotifyNotification({
      title: task ? `Task Reminder: ${task.title}` : 'Reminder',
      message: reminder.message,
      priority: task?.priority ? task.priority + 5 : 5,
      extras: {
        'client::notification': {
          click: { url: `${process.env.APP_URL}/tasks` }
        }
      }
    })

    // Mark as notified
    await db.update(schema.reminders)
      .set({ notified: true })
      .where(eq(schema.reminders.id, reminder.id))
  }

  return { processed: dueReminders.length }
}
```

### Nitro Scheduled Task

```typescript
// server/tasks/reminders.ts
import { processReminders } from './process-reminders'

export default defineTask({
  meta: {
    name: 'reminders:process',
    description: 'Process due reminders'
  },
  async run() {
    const result = await processReminders()
    return { result }
  }
})
```

### Nitro Config for Scheduled Tasks

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    scheduledTasks: {
      // Run every minute
      '* * * * *': ['reminders:process']
    }
  }
})
```

## API Endpoints

### Create Reminder

```typescript
// server/api/reminders/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const [reminder] = await db.insert(schema.reminders)
    .values({
      taskId: body.taskId || null,
      message: body.message,
      remindAt: new Date(body.remindAt)
    })
    .returning()

  return { reminder }
})
```

### List Reminders

```typescript
// server/api/reminders/index.get.ts
export default defineEventHandler(async (event) => {
  const reminders = await db.select({
    reminder: schema.reminders,
    task: schema.tasks
  })
    .from(schema.reminders)
    .leftJoin(schema.tasks, eq(schema.reminders.taskId, schema.tasks.id))
    .where(eq(schema.reminders.notified, false))
    .orderBy(schema.reminders.remindAt)

  return { reminders }
})
```

### Delete Reminder

```typescript
// server/api/reminders/[id].delete.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  await db.delete(schema.reminders)
    .where(eq(schema.reminders.id, id))

  return { success: true }
})
```

## Skill Integration

```typescript
// skills/notify/remind.ts
import { db, schema } from '../utils/db'

interface RemindArgs {
  message: string
  time: string  // Natural language: "5pm", "in 2 hours", "tomorrow at 9am"
  taskId?: string
}

export async function execute(args: RemindArgs) {
  const remindAt = parseNaturalTime(args.time)

  if (!remindAt) {
    return { error: `Could not parse time: "${args.time}"` }
  }

  const [reminder] = await db.insert(schema.reminders)
    .values({
      message: args.message,
      remindAt,
      taskId: args.taskId
    })
    .returning()

  return {
    success: true,
    reminder: {
      id: reminder.id,
      message: reminder.message,
      remindAt: reminder.remindAt
    },
    response: `I'll remind you "${args.message}" at ${formatTime(remindAt)}`
  }
}

function parseNaturalTime(input: string): Date | null {
  const now = new Date()
  const lower = input.toLowerCase()

  // "in X hours/minutes"
  const inMatch = lower.match(/in (\d+) (hour|minute|min|hr)s?/)
  if (inMatch) {
    const amount = parseInt(inMatch[1])
    const unit = inMatch[2]
    const d = new Date(now)
    if (unit.startsWith('hour') || unit === 'hr') {
      d.setHours(d.getHours() + amount)
    } else {
      d.setMinutes(d.getMinutes() + amount)
    }
    return d
  }

  // "at 5pm", "at 14:30"
  const atMatch = lower.match(/at (\d{1,2}):?(\d{2})?\s?(am|pm)?/)
  if (atMatch) {
    let hours = parseInt(atMatch[1])
    const minutes = parseInt(atMatch[2] || '0')
    const period = atMatch[3]

    if (period === 'pm' && hours < 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0

    const d = new Date(now)
    d.setHours(hours, minutes, 0, 0)

    // If time has passed, schedule for tomorrow
    if (d <= now) {
      d.setDate(d.getDate() + 1)
    }
    return d
  }

  // "tomorrow at X"
  if (lower.includes('tomorrow')) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    // Extract time if present
    const timeMatch = lower.match(/(\d{1,2}):?(\d{2})?\s?(am|pm)?/)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2] || '0')
      const period = timeMatch[3]
      if (period === 'pm' && hours < 12) hours += 12
      d.setHours(hours, minutes, 0, 0)
    } else {
      d.setHours(9, 0, 0, 0) // Default 9am
    }
    return d
  }

  return null
}
```

## Browser Push Fallback

For users without Gotify, support browser push notifications:

```typescript
// app/composables/usePushNotifications.ts
export function usePushNotifications() {
  const permission = ref(Notification.permission)

  async function requestPermission() {
    if ('Notification' in window) {
      permission.value = await Notification.requestPermission()
    }
  }

  function notify(title: string, body: string) {
    if (permission.value === 'granted') {
      new Notification(title, { body })
    }
  }

  return { permission, requestPermission, notify }
}
```

## UI: Reminder Quick Add

```vue
<!-- app/components/ReminderQuickAdd.vue -->
<script setup lang="ts">
const message = ref('')
const time = ref('')
const loading = ref(false)

async function createReminder() {
  loading.value = true
  try {
    await $fetch('/api/reminders', {
      method: 'POST',
      body: {
        message: message.value,
        remindAt: parseTime(time.value)
      }
    })
    message.value = ''
    time.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="createReminder" class="flex gap-2">
    <UInput v-model="message" placeholder="Remind me to..." class="flex-1" />
    <UInput v-model="time" placeholder="at 5pm" class="w-32" />
    <UButton type="submit" :loading="loading">
      <UIcon name="i-lucide-bell" />
    </UButton>
  </form>
</template>
```

## Environment Variables

```bash
# Gotify server
GOTIFY_URL=https://gotify.example.com
GOTIFY_TOKEN=your-app-token

# App URL for notification links
APP_URL=https://brain.example.com
```

## Implementation Steps

1. [ ] Create Gotify service
2. [ ] Add reminder processor
3. [ ] Configure Nitro scheduled task
4. [ ] Create reminder API endpoints
5. [ ] Build remind skill
6. [ ] Add time parsing utilities
7. [ ] Create ReminderQuickAdd component
8. [ ] Add browser push fallback
9. [ ] Test with Gotify
10. [ ] Update .env.example

## Dependencies

- Requires: database-init
- Blocks: None
- Related: task-skill (reminders for tasks), cron-agents
