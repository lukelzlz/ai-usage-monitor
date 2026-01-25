/**
 * New API Standard Adapter - Supports New API standard interface used by many mirror sites
 */
import { BaseAdapter } from './base';
import { ConfigSchema, FetchResult, PlatformUsage, UsageInfo, PlatformConsole } from '../core/types';
import { fetchJson } from '../utils/http';
import { logger } from '../utils/logger';
import { platformTypeRegistry } from './platformTypes';

/**
 * New API standard response structure
 * This is the standard interface used by many New API mirror sites
 */
interface NewApiResponse {
  data?: {
    id?: number;
    username?: string;
    quota?: number;
    used_quota?: number;
    request_count?: number;
    [key: string]: any;
  };
  success?: boolean;
  message?: string;
}

export class CustomAdapter extends BaseAdapter {
  constructor(instanceId: string, instanceName: string, config: Record<string, any>) {
    super(instanceId, instanceName, config);
  }

  protected getPlatformType(): string {
    return 'custom';
  }

  protected getIcon(): string {
    return '$(server)';
  }

  protected getConsoleUrl(): PlatformConsole | undefined {
    return undefined;
  }

  /**
   * Check if the adapter is configured
   */
  isConfigured(): boolean {
    const apiUrl = this.getConfigValue<string>('apiUrl', '');
    const apiKey = this.getConfigValue<string>('apiKey', '');
    const userId = this.getConfigValue<string>('userId', '');
    return apiUrl.length > 0 && apiKey.length > 0 && userId.length > 0;
  }

  /**
   * Fetch usage data from custom API
   */
  async fetchUsage(): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        error: 'Custom API not configured',
      };
    }

    try {
      const apiUrl = this.getConfigValue<string>('apiUrl', '');
      const apiKey = this.getConfigValue<string>('apiKey', '');
      const userId = this.getConfigValue<string>('userId', '');

      // Ensure URL ends with /api/user/self
      let endpoint = apiUrl;
      if (!endpoint.endsWith('/api/user/self')) {
        endpoint = endpoint.replace(/\/$/, '') + '/api/user/self';
      }

      logger.debug(`Fetching custom API usage from ${endpoint}`);

      const response = await fetchJson<NewApiResponse>(endpoint, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'New-Api-User': userId,
          'Content-Type': 'application/json',
        },
      });

      // Check for API-level errors
      if (!response.success) {
        throw new Error(response.message || 'API request failed');
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      const usage = this.transformResponse(response);

      logger.info(`Successfully fetched New API usage: ${usage.usages[0]?.percentage.toFixed(1)}%`);

      return {
        configured: true,
        usage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to fetch New API usage: ${errorMessage}`);
      return {
        configured: true,
        error: errorMessage,
      };
    }
  }

  /**
   * Transform API response to PlatformUsage
   */
  private transformResponse(data: NewApiResponse): PlatformUsage {
    const apiData = data.data || {};
    const quota = apiData.quota ?? 0;
    const usedQuota = apiData.used_quota ?? 0;
    const requestCount = apiData.request_count ?? 0;
    const username = apiData.username || 'Unknown';

    // Calculate remaining quota
    const remainingQuota = quota - usedQuota;

    const usages: UsageInfo[] = [
      {
        type: 'balance',
        label: '剩余额度',
        percentage: -1, // -1 indicates this is a balance display, not percentage
        currentUsage: remainingQuota,
        total: quota,
        unit: '',
        details: {
          username,
          requestCount,
          usedQuota,
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
   * Get configuration schema for custom API
   */
  getConfigurationSchema(): ConfigSchema[] {
    return [
      {
        key: 'apiUrl',
        type: 'string',
        label: 'API地址',
        default: '',
        description: '自定义API实例地址（例如：http://103.236.78.40:3000）',
      },
      {
        key: 'apiKey',
        type: 'string',
        label: 'API Key',
        default: '',
        secret: true,
        description: 'API授权密钥（Bearer Token）',
      },
      {
        key: 'userId',
        type: 'string',
        label: '用户ID',
        default: '',
        description: '用户ID（用于New-Api-User请求头）',
      },
    ];
  }
}

// Register platform type
platformTypeRegistry.register({
  id: 'custom',
  displayName: 'New API',
  icon: '$(server)',
  configSchema: new CustomAdapter('temp', 'temp', {}).getConfigurationSchema(),
  AdapterClass: CustomAdapter,
});
