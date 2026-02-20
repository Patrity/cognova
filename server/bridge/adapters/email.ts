import type { BridgeAdapter, OutboundMessage, DeliveryResult } from '../types'
import type { EmailBridgeConfig } from '~~/shared/types'

/**
 * Generic Email adapter using IMAP IDLE + SMTP.
 * For non-Gmail email providers (Outlook, ProtonMail, self-hosted, etc.).
 *
 * This is a stub — gogcli covers Gmail users.
 * Full implementation will use `imapflow` for receiving and `nodemailer` for sending.
 */
export class EmailAdapter implements BridgeAdapter {
  readonly platform = 'email' as const

  private bridgeId: string
  private config: EmailBridgeConfig
  private healthy = false

  constructor(bridgeId: string, config: EmailBridgeConfig) {
    this.bridgeId = bridgeId
    this.config = config
  }

  async start(): Promise<void> {
    if (!this.config.imapHost || !this.config.smtpHost) {
      throw new Error(
        'Email bridge requires IMAP and SMTP host configuration. '
        + 'For Gmail, use the Google Suite integration instead.'
      )
    }

    // TODO: Implement IMAP IDLE connection via imapflow
    // TODO: Validate SMTP credentials via nodemailer
    throw new Error(
      'Generic email adapter is not yet implemented. '
      + 'For Gmail, use the Google Suite integration.'
    )
  }

  async stop(): Promise<void> {
    this.healthy = false
  }

  async send(_msg: OutboundMessage): Promise<DeliveryResult> {
    return { success: false, error: 'Email adapter not yet implemented' }
  }

  isHealthy(): boolean {
    return this.healthy
  }
}
