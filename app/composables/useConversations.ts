import type { Conversation } from '~~/shared/types'

interface ConversationGroup {
  label: string
  conversations: Conversation[]
}

export function useConversations(conversations: Ref<Conversation[] | null | undefined>) {
  const groups = computed<ConversationGroup[]>(() => {
    if (!conversations.value?.length)
      return []

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart.getTime() - 86400000)
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000)

    const today: Conversation[] = []
    const yesterday: Conversation[] = []
    const lastWeek: Conversation[] = []
    const older: Conversation[] = []

    for (const conv of conversations.value) {
      const date = new Date(conv.updatedAt)
      if (date >= todayStart)
        today.push(conv)
      else if (date >= yesterdayStart)
        yesterday.push(conv)
      else if (date >= weekStart)
        lastWeek.push(conv)
      else
        older.push(conv)
    }

    const result: ConversationGroup[] = []
    if (today.length)
      result.push({ label: 'Today', conversations: today })
    if (yesterday.length)
      result.push({ label: 'Yesterday', conversations: yesterday })
    if (lastWeek.length)
      result.push({ label: 'Last 7 Days', conversations: lastWeek })
    if (older.length)
      result.push({ label: 'Older', conversations: older })

    return result
  })

  return { groups }
}
