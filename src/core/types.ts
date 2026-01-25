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
  /** Label for the menu item */
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
