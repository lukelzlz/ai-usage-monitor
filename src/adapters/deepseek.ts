/**
 * DeepSeek Platform Adapter
 */
import { BaseAdapter } from './base';
import { ConfigSchema, FetchResult, PlatformUsage, UsageInfo, PlatformConsole } from '../core/types';
import { fetchJson } from '../utils/http';
import { logger } from '../utils/logger';
import { platformTypeRegistry } from './platformTypes';

/**
 * DeepSeek API response structure
 */
interface DeepSeekBalanceResponse {
  balance?: number;
  currency?: string;
  error?: string;
}

export class DeepSeekAdapter extends BaseAdapter {
  private readonly endpoint = 'https://api.deepseek.com/user/balance';

  constructor(instanceId: string, instanceName: string, config: Record<string, any>) {
    super(instanceId, instanceName, config);
  }

  protected getPlatformType(): string {
    return 'deepseek';
  }

  protected getIcon(): string {
    return '$(hubot)';
  }

  protected getConsoleUrl(): PlatformConsole {
    return {
      url: 'https://platform.deepseek.com/user_center',
      label: 'Open DeepSeek Console',
    };
  }

  /**
   * Check if adapter is configured (has API key)
   */
  isConfigured(): boolean {
    const apiKey = this.getConfigValue<string>('apiKey', '');
    return apiKey.length > 0;
  }

  /**
   * Fetch usage data from DeepSeek API
   */
  async fetchUsage(): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        error: 'DeepSeek API key not configured',
      };
    }

    try {
      const apiKey = this.getConfigValue<string>('apiKey', '');

      logger.debug(`Fetching DeepSeek balance from ${this.endpoint}`);

      const response = await fetchJson<DeepSeekBalanceResponse>(this.endpoint, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Check for API-level errors
      if (response.error) {
        throw new Error(`DeepSeek API error: ${response.error}`);
      }

      const usage = this.transformResponse(response);

      logger.info(`Successfully fetched DeepSeek balance: ${usage.usages[0]?.percentage.toFixed(1)}%`);

      return {
        configured: true,
        usage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to fetch DeepSeek balance: ${errorMessage}`);
      return {
        configured: true,
        error: errorMessage,
      };
    }
  }

  /**
   * Transform DeepSeek API response to PlatformUsage
   */
  private transformResponse(data: DeepSeekBalanceResponse): PlatformUsage {
    const balance = data.balance ?? 0;
    const currency = data.currency || 'CNY';

    // DeepSeek doesn't provide total balance limit, so we use a default
    // This is a placeholder - users can configure their expected limit
    const defaultLimit = this.getConfigValue<number>('balanceLimit', 100);
    const percentage = Math.min((balance / defaultLimit) * 100, 100);

    const usages: UsageInfo[] = [
      {
        type: 'balance',
        label: '余额',
        percentage,
        currentUsage: balance,
        total: defaultLimit,
        unit: currency,
        details: { currency },
      },
    ];

    return {
      platform: this.platformType,
      displayName: this.instanceName,
      icon: this.icon,
      usages,
      lastUpdated: new Date(),
      enabled: this.isEnabled(),
      instanceId: this.instanceId,
      platformType: this.platformType,
    };
  }

  /**
   * Get configuration schema for DeepSeek
   */
  getConfigurationSchema(): ConfigSchema[] {
    return [
      {
        key: 'apiKey',
        type: 'string',
        label: 'API Key',
        default: '',
        secret: true,
        description: 'Your DeepSeek API key',
      },
      {
        key: 'balanceLimit',
        type: 'number',
        label: 'Balance Limit',
        default: 100,
        description: 'Expected balance limit for percentage calculation',
      },
    ];
  }
}

// Register platform type
platformTypeRegistry.register({
  id: 'deepseek',
  displayName: 'DeepSeek',
  icon: '$(hubot)',
  configSchema: new DeepSeekAdapter('temp', 'temp', {}).getConfigurationSchema(),
  consoleUrl: 'https://platform.deepseek.com/user_center',
  AdapterClass: DeepSeekAdapter,
});
