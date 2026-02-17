import type { NotificationPreferences } from '~~/shared/types'

export const defaultNotificationPreferences: NotificationPreferences = {
  task: { enabled: true },
  reminder: { enabled: true },
  agent: { enabled: true },
  memory: { enabled: true },
  project: { enabled: true },
  secret: { enabled: true },
  document: { enabled: false },
  hook: { enabled: false },
  conversation: { enabled: false }
}
