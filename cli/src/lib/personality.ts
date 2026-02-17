import * as p from '@clack/prompts'
import type { PersonalityConfig } from './types'

export async function promptPersonality(): Promise<PersonalityConfig> {
  const agentName = await p.text({
    message: 'What should your agent be called?',
    placeholder: 'Cognova',
    defaultValue: 'Cognova'
  })
  if (p.isCancel(agentName)) process.exit(0)

  const userName = await p.text({
    message: 'What should the agent call you?',
    placeholder: 'your name'
  })
  if (p.isCancel(userName)) process.exit(0)

  const tone = await p.select({
    message: 'Agent tone',
    options: [
      { value: 'concise', label: 'Concise', hint: 'Brief, to-the-point responses' },
      { value: 'casual', label: 'Casual', hint: 'Friendly and conversational' },
      { value: 'formal', label: 'Formal', hint: 'Professional and detailed' },
      { value: 'custom', label: 'Custom', hint: 'Describe your own tone' }
    ]
  }) as PersonalityConfig['tone']
  if (p.isCancel(tone)) process.exit(0)

  let customTone: string | undefined
  if (tone === 'custom') {
    const custom = await p.text({
      message: 'Describe the tone you want',
      placeholder: 'e.g., Dry humor, slightly sarcastic, but helpful'
    })
    if (p.isCancel(custom)) process.exit(0)
    customTone = custom
  }

  const traits = await p.multiselect({
    message: 'Agent traits (select all that apply)',
    options: [
      { value: 'proactive', label: 'Proactive', hint: 'Suggests actions before being asked' },
      { value: 'opinionated', label: 'Opinionated', hint: 'Has strong preferences on organization' },
      { value: 'cautious', label: 'Cautious', hint: 'Asks before making changes' },
      { value: 'curious', label: 'Curious', hint: 'Asks follow-up questions to understand context' },
      { value: 'organized', label: 'Organized', hint: 'Prioritizes structure and consistency' }
    ],
    required: true
  })
  if (p.isCancel(traits)) process.exit(0)

  const communicationStyle = await p.select({
    message: 'Communication style',
    options: [
      { value: 'bullets', label: 'Bullets first', hint: 'Lists and structured output' },
      { value: 'narrative', label: 'Narrative', hint: 'Flowing prose and explanations' },
      { value: 'mixed', label: 'Mixed', hint: 'Adapts to the situation' }
    ]
  }) as PersonalityConfig['communicationStyle']
  if (p.isCancel(communicationStyle)) process.exit(0)

  const proactivity = await p.select({
    message: 'How proactive should the agent be?',
    options: [
      { value: 'reactive', label: 'Reactive', hint: 'Only acts when explicitly asked' },
      { value: 'balanced', label: 'Balanced', hint: 'Suggests when relevant, waits otherwise' },
      { value: 'proactive', label: 'Proactive', hint: 'Actively suggests tasks, organization, reminders' }
    ]
  }) as PersonalityConfig['proactivity']
  if (p.isCancel(proactivity)) process.exit(0)

  return {
    agentName,
    userName,
    tone,
    customTone,
    traits: traits as string[],
    communicationStyle,
    proactivity
  }
}
