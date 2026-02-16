export interface PersonalityConfig {
  agentName: string
  userName: string
  tone: 'concise' | 'casual' | 'formal' | 'custom'
  customTone?: string
  traits: string[]
  communicationStyle: 'bullets' | 'narrative' | 'mixed'
  proactivity: 'reactive' | 'balanced' | 'proactive'
}

export interface VaultConfig {
  path: string
}

export interface DatabaseConfig {
  type: 'local' | 'remote'
  connectionString: string
}

export interface AuthConfig {
  adminEmail: string
  adminPassword: string
  adminName: string
  authSecret: string
}

export interface IntegrationsConfig {
  gotifyUrl?: string
  gotifyToken?: string
}

export interface InitConfig {
  personality: PersonalityConfig
  vault: VaultConfig
  database: DatabaseConfig
  auth: AuthConfig
  integrations: IntegrationsConfig
  appUrl: string
  installDir: string
}

export interface SecondBrainMetadata {
  version: string
  installedAt: string
  updatedAt: string
  installDir: string
  vaultPath: string
}
