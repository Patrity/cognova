import { notificationBus } from '~~/server/utils/notification-bus'
import type { NotificationResource, NotificationAction, NotificationColor, NotificationPayload } from '~~/shared/types'

interface NotifyOptions {
  resource: NotificationResource
  action: NotificationAction
  resourceId?: string
  resourceName?: string
  message?: string
  meta?: Record<string, unknown>
}

const colorMap: Record<NotificationAction, NotificationColor> = {
  create: 'success',
  edit: 'info',
  delete: 'warning',
  restore: 'success',
  run: 'info',
  cancel: 'warning',
  complete: 'success',
  fail: 'error'
}

const actionLabels: Record<NotificationAction, string> = {
  create: 'created',
  edit: 'updated',
  delete: 'deleted',
  restore: 'restored',
  run: 'started',
  cancel: 'cancelled',
  complete: 'completed',
  fail: 'failed'
}

const resourceLabels: Record<NotificationResource, string> = {
  task: 'Task',
  reminder: 'Reminder',
  agent: 'Agent',
  hook: 'Hook',
  memory: 'Memory',
  document: 'Document',
  project: 'Project',
  conversation: 'Conversation',
  secret: 'Secret'
}

export function notifyResourceChange(options: NotifyOptions) {
  const { resource, action, resourceId, resourceName, message, meta } = options

  const label = resourceLabels[resource]
  const actionLabel = actionLabels[action]
  const name = resourceName ? ` "${resourceName}"` : ''

  const payload: NotificationPayload = {
    type: 'resource_change',
    resource,
    action,
    resourceId,
    resourceName,
    title: `${label} ${actionLabel}`,
    message: message || `${label}${name} was ${actionLabel}`,
    color: colorMap[action],
    meta,
    timestamp: new Date().toISOString()
  }

  notificationBus.broadcast(payload)
}
