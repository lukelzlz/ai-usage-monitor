/**
 * Base adapter class for platform adapters
 * Each AI platform implements this interface to provide usage data
 */
import * as vscode from 'vscode';
import { ConfigSchema, FetchResult, PlatformConsole, IUsageAdapter } from '../core/types';

/**
 * Abstract base class providing common adapter functionality
 * Supports multi-account instances
 */
export abstract class BaseAdapter implements IUsageAdapter {
  readonly instanceId: string;
  readonly instanceName: string;
  readonly platformType: string;
  readonly displayName: string;
  readonly icon: string;
  readonly consoleUrl?: PlatformConsole;

  protected config: Record<string, any>;

  constructor(instanceId: string, instanceName: string, config: Record<string, any>) {
    this.instanceId = instanceId;
    this.instanceName = instanceName;
    this.config = config;
    this.platformType = this.getPlatformType();
    this.displayName = instanceName;
    this.icon = this.getIcon();
    this.consoleUrl = this.getConsoleUrl();
  }

  /**
   * Get the platform type ID
   */
  protected abstract getPlatformType(): string;

  /**
   * Get the icon for this platform
   */
  protected abstract getIcon(): string;

  /**
   * Get the console URL for this platform
   */
  protected abstract getConsoleUrl(): PlatformConsole | undefined;

  /**
   * Check if this adapter is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled !== false;
  }

  /**
   * Enable/disable this adapter
   */
  async setEnabled(enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    const accounts = config.get<any[]>('accounts', []);

    // Find and update the account
    const accountIndex = accounts.findIndex((a: any) => a.id === this.instanceId);
    if (accountIndex >= 0) {
      accounts[accountIndex].enabled = enabled;
      await config.update('accounts', accounts, vscode.ConfigurationTarget.Global);
      this.config.enabled = enabled;
    }
  }

  /**
   * Get current configuration values
   */
  getConfig(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   */
  protected getConfigValue<T>(key: string, defaultValue?: T): T {
    return this.config[key] ?? defaultValue;
  }

  /**
   * Set a specific configuration value
   */
  protected async setConfigValue(key: string, value: any): Promise<void> {
    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    const accounts = config.get<any[]>('accounts', []);

    // Find and update the account
    const accountIndex = accounts.findIndex((a: any) => a.id === this.instanceId);
    if (accountIndex >= 0) {
      accounts[accountIndex].config[key] = value;
      await config.update('accounts', accounts, vscode.ConfigurationTarget.Global);
      this.config[key] = value;
    }
  }

  /**
   * Get configuration schema for this platform
   */
  abstract getConfigurationSchema(): ConfigSchema[];

  /**
   * Must be implemented by each adapter
   */
  abstract isConfigured(): boolean;
  abstract fetchUsage(): Promise<FetchResult>;
}
