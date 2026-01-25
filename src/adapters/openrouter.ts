/**
 * OpenRouter Platform Adapter
 */
import { BaseAdapter } from './base';
import { ConfigSchema, FetchResult, PlatformUsage, UsageInfo, PlatformConsole } from '../core/types';
import { fetchJson } from '../utils/http';
import { logger } from '../utils/logger';
import { platformTypeRegistry } from './platformTypes';

/**
 * OpenRouter API response structures
 */
interface OpenRouterCreditsResponse {
  data: {
    total_credits: number;
    total_usage: number;
  };
}

export class OpenRouterAdapter extends BaseAdapter {
  private readonly creditsEndpoint = 'https://openrouter.ai/api/v1/credits';

  constructor(instanceId: string, instanceName: string, config: Record<string, any>) {
    super(instanceId, instanceName, config);
  }

  protected getPlatformType(): string {
    return 'openrouter';
  }

  protected getIcon(): string {
    return '$(server)';
  }

  protected getConsoleUrl(): PlatformConsole {
    return {
      url: 'https://openrouter.ai/credits',
      label: 'Open OpenRouter Credits',
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
   * Fetch usage data from OpenRouter API
   */
  async fetchUsage(): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        error: 'OpenRouter API key not configured',
      };
    }

    try {
      const apiKey = this.getConfigValue<string>('apiKey', '');

      logger.debug(`Fetching OpenRouter credits from ${this.creditsEndpoint}`);

      const response = await fetchJson<OpenRouterCreditsResponse>(this.creditsEndpoint, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const usage = this.transformResponse(response);

      logger.info(`Successfully fetched OpenRouter credits: $${usage.usages[0]?.currentUsage?.toFixed(2)} / $${usage.usages[0]?.total?.toFixed(2)}`);

      return {
        configured: true,
        usage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to fetch OpenRouter credits: ${errorMessage}`);
      return {
        configured: true,
        error: errorMessage,
      };
    }
  }

  /**
   * Transform OpenRouter API response to PlatformUsage
   */
  private transformResponse(data: OpenRouterCreditsResponse): PlatformUsage {
    const totalCredits = data.data.total_credits;
    const totalUsage = data.data.total_usage;
    const remainingCredits = totalCredits - totalUsage;

    const percentage = totalCredits > 0 ? Math.min((remainingCredits / totalCredits) * 100, 100) : 0;

    const usages: UsageInfo[] = [
      {
        type: 'usage',
        label: '剩余积分',
        percentage,
        currentUsage: remainingCredits,
        total: totalCredits,
        unit: 'USD',
        details: {
          totalCredits,
          totalUsage,
          remainingCredits,
        },
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
   * Get configuration schema for OpenRouter
   */
  getConfigurationSchema(): ConfigSchema[] {
    return [
      {
        key: 'apiKey',
        type: 'string',
        label: 'API Key',
        default: '',
        secret: true,
        description: 'Your OpenRouter API key',
      },
    ];
  }
}

// Register platform type
platformTypeRegistry.register({
  id: 'openrouter',
  displayName: 'OpenRouter',
  icon: '$(server)',
  configSchema: new OpenRouterAdapter('temp', 'temp', {}).getConfigurationSchema(),
  consoleUrl: 'https://openrouter.ai/credits',
  AdapterClass: OpenRouterAdapter,
});
