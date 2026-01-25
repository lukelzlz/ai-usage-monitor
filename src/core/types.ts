/**
 * Core type definitions for AI Usage Monitor
 */

/**
 * Usage information for a specific metric
 */
export interface UsageInfo {
  /** Usage type identifier (e.g., 'tokens', 'time', 'balance') */
  type: string;
  /** Display label for this usage */
  label: string;
  /** Usage percentage 0-100 */
  percentage: number;
  /** Current usage value */
  currentUsage?: number;
  /** Total limit */
  total?: number;
  /** Unit (tokens, requests, USD, etc.) */
  unit?: string;
  /** Additional details */
  details?: Record<string, any>;
}

/**
 * Platform usage data
 */
export interface PlatformUsage {
  /** Platform identifier */
  platform: string;
  /** Display name */
  displayName: string;
  /** Icon (VSCode codicon format, e.g., '$(sparkle)') */
  icon: string;
  /** List of usage metrics */
  usages: UsageInfo[];
  /** Last update timestamp */
  lastUpdated: Date;
  /** Error message if fetch failed */
  error?: string;
  /** Whether this platform is enabled */
  enabled: boolean;
  /** Account instance ID (for multi-account support) */
  instanceId?: string;
  /** Platform type (e.g., 'zhipu', 'deepseek', 'openai', 'custom') */
  platformType?: string;
}

/**
 * Configuration schema for platform settings
 */
export interface ConfigSchema {
  /** Configuration key */
  key: string;
  /** Input type */
  type: 'string' | 'number' | 'boolean' | 'enum';
  /** Display label */
  label: string;
  /** Default value */
  default?: any;
  /** Whether this is a secret field (password) */
  secret?: boolean;
  /** Enum options (for type 'enum') */
  enum?: string[];
  /** Description */
  description?: string;
}

/**
 * Platform console URL configuration
 */
export interface PlatformConsole {
  /** URL to open in browser */
  url: string;
  /** Label for menu item */
  label?: string;
}

/**
 * Adapter fetch result
 */
export interface FetchResult {
  /** Platform usage data */
  usage?: PlatformUsage;
  /** Error if fetch failed */
  error?: string;
  /** Whether the adapter is configured */
  configured: boolean;
}

/**
 * Account configuration for multi-account support
 */
export interface AccountConfig {
  /** Unique identifier for this account instance */
  id: string;
  /** Platform type: zhipu, deepseek, openai, custom */
  type: string;
  /** User-defined display name */
  name: string;
  /** Whether this account is enabled */
  enabled: boolean;
  /** Platform-specific configuration */
  config: Record<string, any>;
}

/**
 * Platform type definition
 */
export interface PlatformType {
  /** Platform type ID */
  id: string;
  /** Default display name */
  displayName: string;
  /** Icon (VSCode codicon format) */
  icon: string;
  /** Configuration schema for this platform */
  configSchema: ConfigSchema[];
  /** Console URL (optional) */
  consoleUrl?: string;
  /** Adapter class constructor */
  AdapterClass: new (instanceId: string, instanceName: string, config: Record<string, any>) => IUsageAdapter;
}

/**
 * Adapter interface for multi-account support
 */
export interface IUsageAdapter {
  /** Account instance ID */
  readonly instanceId: string;
  /** User-defined display name */
  readonly instanceName: string;
  /** Platform type */
  readonly platformType: string;
  /** Display name */
  readonly displayName: string;
  /** Icon */
  readonly icon: string;
  /** Console URL */
  readonly consoleUrl?: PlatformConsole;

  /**
   * Check if this adapter is configured
   */
  isConfigured(): boolean;

  /**
   * Check if this adapter is enabled
   */
  isEnabled(): boolean;

  /**
   * Fetch usage data
   */
  fetchUsage(): Promise<FetchResult>;

  /**
   * Get current configuration
   */
  getConfig(): Record<string, any>;

  /**
   * Enable/disable this adapter
   */
  setEnabled(enabled: boolean): Promise<void>;
}
