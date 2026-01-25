/**
 * Base interface for platform adapters
 * Each AI platform implements this interface to provide usage data
 */
import * as vscode from 'vscode';
import { ConfigSchema, FetchResult, PlatformUsage, PlatformConsole } from '../core/types';

export interface IUsageAdapter {
  /** Unique identifier for this platform */
  readonly id: string;
  /** Display name shown in UI */
  readonly displayName: string;
  /** Icon (VSCode codicon format, e.g., '$(sparkle)') */
  readonly icon: string;
  /** Platform console URL */
  readonly consoleUrl?: PlatformConsole;

  /**
   * Check if this adapter is configured (has API key/token, etc.)
   */
  isConfigured(): boolean;

  /**
   * Check if this adapter is enabled in settings
   */
  isEnabled(): boolean;

  /**
   * Fetch usage data from the platform API
   * @returns Promise resolving to fetch result
   */
  fetchUsage(): Promise<FetchResult>;

  /**
   * Get configuration schema for this platform's settings
   * @returns Array of configuration field definitions
   */
  getConfigurationSchema(): ConfigSchema[];

  /**
   * Get the configuration section prefix for this platform
   * @returns Configuration section path (e.g., 'ai-usage-monitor.platforms.zhipu')
   */
  getConfigSection(): string;

  /**
   * Enable/disable this platform
   * @param enabled Whether to enable the platform
   */
  setEnabled(enabled: boolean): Promise<void>;

  /**
   * Get current configuration values
   * @returns Object with current configuration values
   */
  getConfig(): Record<string, any>;
}

/**
 * Abstract base class providing common adapter functionality
 */
export abstract class BaseAdapter implements IUsageAdapter {
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly icon: string;
  readonly consoleUrl?: PlatformConsole;

  constructor() {}

  /**
   * Get the configuration section for this platform
   */
  getConfigSection(): string {
    return `ai-usage-monitor.platforms.${this.id}`;
  }

  /**
   * Check if this adapter is enabled in settings
   */
  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration();
    return config.get<boolean>(`${this.getConfigSection()}.enabled`, false);
  }

  /**
   * Enable/disable this platform
   */
  async setEnabled(enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    await config.update(`${this.getConfigSection()}.enabled`, enabled, vscode.ConfigurationTarget.Global);
  }

  /**
   * Get current configuration values
   */
  getConfig(): Record<string, any> {
    const config = vscode.workspace.getConfiguration();
    const schema = this.getConfigurationSchema();
    const result: Record<string, any> = {};

    for (const field of schema) {
      result[field.key] = config.get(`${this.getConfigSection()}.${field.key}`, field.default);
    }

    return result;
  }

  /**
   * Get a specific configuration value
   */
  protected getConfigValue<T>(key: string, defaultValue?: T): T {
    const config = vscode.workspace.getConfiguration();
    return config.get<T>(`${this.getConfigSection()}.${key}`, defaultValue as T);
  }

  /**
   * Set a specific configuration value
   */
  protected async setConfigValue(key: string, value: any): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    await config.update(`${this.getConfigSection()}.${key}`, value, vscode.ConfigurationTarget.Global);
  }

  /**
   * Must be implemented by each adapter
   */
  abstract isConfigured(): boolean;
  abstract fetchUsage(): Promise<FetchResult>;
  abstract getConfigurationSchema(): ConfigSchema[];
}
