/**
 * Adapter Factory - Creates adapter instances from account configurations
 */
import * as vscode from 'vscode';
import { IUsageAdapter, AccountConfig } from '../core/types';
import { platformTypeRegistry } from './platformTypes';
import { logger } from '../utils/logger';

/**
 * Adapter Factory
 */
export class AdapterFactory {
  /**
   * Create an adapter instance from account configuration
   */
  createAdapter(account: AccountConfig): IUsageAdapter | null {
    const platformType = platformTypeRegistry.get(account.type);
    if (!platformType) {
      logger.error(`Unknown platform type: ${account.type}`);
      return null;
    }

    try {
      const adapter = new platformType.AdapterClass(
        account.id,
        account.name,
        account.config
      );
      return adapter;
    } catch (error) {
      logger.error(`Failed to create adapter for ${account.id}: ${error}`);
      return null;
    }
  }

  /**
   * Create all adapters from configuration
   */
  createAdaptersFromConfig(): IUsageAdapter[] {
    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    const accounts = config.get<AccountConfig[]>('accounts', []);

    const adapters: IUsageAdapter[] = [];

    for (const account of accounts) {
      const adapter = this.createAdapter(account);
      if (adapter) {
        adapters.push(adapter);
      }
    }

    logger.info(`Created ${adapters.length} adapters from configuration`);
    return adapters;
  }

  /**
   * Get available platform types for QuickPick
   */
  getAvailablePlatformTypes(): vscode.QuickPickItem[] {
    const types = platformTypeRegistry.getAll();
    return types.map(type => ({
      label: type.displayName,
      description: type.id,
      iconPath: new vscode.ThemeIcon(type.icon),
    }));
  }
}

// Global adapter factory instance
export const adapterFactory = new AdapterFactory();
