import type { BridgeAdapter, AdapterEntry } from './types'

/**
 * Global registry of running bridge adapters.
 * Similar pattern to the cron scheduler's agent registry.
 */

const registry = new Map<string, AdapterEntry>()

export function registerAdapter(bridgeId: string, adapter: BridgeAdapter) {
  registry.set(bridgeId, {
    bridgeId,
    adapter,
    startedAt: new Date()
  })
  console.log(`[bridge] Registered adapter: ${adapter.platform} (${bridgeId})`)
}

export function unregisterAdapter(bridgeId: string) {
  const entry = registry.get(bridgeId)
  if (entry) {
    registry.delete(bridgeId)
    console.log(`[bridge] Unregistered adapter: ${entry.adapter.platform} (${bridgeId})`)
  }
}

export function getAdapter(bridgeId: string): BridgeAdapter | undefined {
  return registry.get(bridgeId)?.adapter
}

export function getAllAdapters(): AdapterEntry[] {
  return Array.from(registry.values())
}

export function getAdapterByPlatform(platform: string): AdapterEntry | undefined {
  return Array.from(registry.values()).find(e => e.adapter.platform === platform)
}

export async function stopAllAdapters() {
  const entries = Array.from(registry.values())
  for (const entry of entries) {
    try {
      await entry.adapter.stop()
    } catch (error) {
      console.error(`[bridge] Error stopping ${entry.adapter.platform}:`, error)
    }
    registry.delete(entry.bridgeId)
  }
  console.log(`[bridge] All adapters stopped (${entries.length} total)`)
}
