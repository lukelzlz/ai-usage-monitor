/**
 * OpenAI Platform Adapter
 */
import { BaseAdapter } from './base';
import { ConfigSchema, FetchResult, PlatformUsage, UsageInfo, PlatformConsole } from '../core/types';
import { fetchJson } from '../utils/http';
import { logger } from '../utils/logger';
import { platformTypeRegistry } from './platformTypes';

/**
 * OpenAI API response structures
 */
interface OpenAIUsageResponse {
  total_usage?: number;
  data?: Array<{
    snapshot_id?: string;
    period?: {
      start?: string;
      end?: string;
    };
    results?: Array<{
      usage?: number;
    }>;
  }>;
}

interface OpenAIUsage {
  total_usage: number;
}

export class OpenAIAdapter extends BaseAdapter {
  private readonly usageEndpoint = 'https://api.openai.com/v1/usage';
  private readonly subscriptionEndpoint = 'https://api.openai.com/v1/dashboard/billing/subscription';

  constructor(instanceId: string, instanceName: string, config: Record<string, any>) {
    super(instanceId, instanceName, config);
  }

  protected getPlatformType(): string {
    return 'openai';
  }

  protected getIcon(): string {
    return '$(cloud)';
  }

  protected getConsoleUrl(): PlatformConsole {
    return {
      url: 'https://platform.openai.com/usage',
      label: 'Open OpenAI Usage',
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
   * Fetch usage data from OpenAI API
   */
  async fetchUsage(): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        error: 'OpenAI API key not configured',
      };
    }

    try {
      const apiKey = this.getConfigValue<string>('apiKey', '');

      logger.debug(`Fetching OpenAI usage from ${this.usageEndpoint}`);

      // Fetch usage data for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];

      const usageUrl = `${this.usageEndpoint}?start_date=${startDate}&end_date=${endDate}`;

      const response = await fetchJson<OpenAIUsageResponse>(usageUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const usage = this.transformResponse(response);

      logger.info(`Successfully fetched OpenAI usage: $${usage.usages[0]?.currentUsage?.toFixed(2)}`);

      return {
        configured: true,
        usage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to fetch OpenAI usage: ${errorMessage}`);
      return {
        configured: true,
        error: errorMessage,
      };
    }
  }

  /**
   * Transform OpenAI API response to PlatformUsage
   */
  private transformResponse(data: OpenAIUsageResponse): PlatformUsage {
    const totalUsage = data.total_usage ?? 0;
    const totalUsageUSD = totalUsage / 100; // Convert cents to dollars

    // OpenAI doesn't provide total limit, so we use a configured default
    const defaultLimit = this.getConfigValue<number>('monthlyLimit', 20);
    const percentage = Math.min((totalUsageUSD / defaultLimit) * 100, 100);

    const usages: UsageInfo[] = [
      {
        type: 'usage',
        label: '本月使用',
        percentage,
        currentUsage: totalUsageUSD,
        total: defaultLimit,
        unit: 'USD',
        details: { totalUsageCents: totalUsage },
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
   * Get configuration schema for OpenAI
   */
  getConfigurationSchema(): ConfigSchema[] {
    return [
      {
        key: 'apiKey',
        type: 'string',
        label: 'API Key',
        default: '',
        secret: true,
        description: 'Your OpenAI API key',
      },
      {
        key: 'monthlyLimit',
        type: 'number',
        label: 'Monthly Limit (USD)',
        default: 20,
        description: 'Expected monthly spending limit for percentage calculation',
      },
    ];
  }
}

// Register platform type
platformTypeRegistry.register({
  id: 'openai',
  displayName: 'OpenAI',
  icon: '$(cloud)',
  configSchema: new OpenAIAdapter('temp', 'temp', {}).getConfigurationSchema(),
  consoleUrl: 'https://platform.openai.com/usage',
  AdapterClass: OpenAIAdapter,
});
