/**
 * Registry for tracking running agent executions.
 * Allows cancellation of in-progress agent runs.
 */

interface RunningAgent {
  agentId: string
  runId: string
  agentName: string
  startedAt: Date
  cancelled: boolean
}

class AgentRegistry {
  private runningAgents = new Map<string, RunningAgent>()

  /**
   * Register a new running agent
   */
  register(runId: string, agentId: string, agentName: string): void {
    this.runningAgents.set(runId, {
      agentId,
      runId,
      agentName,
      startedAt: new Date(),
      cancelled: false
    })
  }

  /**
   * Unregister a completed/cancelled agent
   */
  unregister(runId: string): void {
    this.runningAgents.delete(runId)
  }

  /**
   * Check if a specific run is cancelled
   */
  isCancelled(runId: string): boolean {
    return this.runningAgents.get(runId)?.cancelled ?? false
  }

  /**
   * Cancel a running agent by run ID
   * Returns true if the agent was found and cancelled
   */
  cancelByRunId(runId: string): boolean {
    const agent = this.runningAgents.get(runId)
    if (agent && !agent.cancelled) {
      agent.cancelled = true
      return true
    }
    return false
  }

  /**
   * Cancel all running agents for a specific agent ID
   * Returns the number of runs cancelled
   */
  cancelByAgentId(agentId: string): number {
    let cancelled = 0
    for (const agent of this.runningAgents.values()) {
      if (agent.agentId === agentId && !agent.cancelled) {
        agent.cancelled = true
        cancelled++
      }
    }
    return cancelled
  }

  /**
   * Get all running agents
   */
  getRunning(): RunningAgent[] {
    return Array.from(this.runningAgents.values()).filter(a => !a.cancelled)
  }

  /**
   * Get running agent IDs
   */
  getRunningAgentIds(): string[] {
    return [...new Set(this.getRunning().map(a => a.agentId))]
  }

  /**
   * Check if an agent has any running executions
   */
  isAgentRunning(agentId: string): boolean {
    return this.getRunning().some(a => a.agentId === agentId)
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry()
