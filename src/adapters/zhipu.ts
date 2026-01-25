/**
 * Zhipu AI (智谱AI) Platform Adapter
 */
import * as vscode from 'vscode';
import { BaseAdapter } from './base';
import { ConfigSchema, FetchResult, PlatformUsage, UsageInfo, PlatformConsole } from '../core/types';
import { fetchJson } from '../utils/http';
import { logger } from '../utils/logger';

/**
 * Zhipu AI API response structure
 */
interface ZhipuQuotaLimitResponse {
  code?: number;
  msg?: string;
  data?: {
    limits?: Array<{
      type: string;
      percentage?: number;
      currentValue?: number;
      usage?: number;
      usageDetails?: Record<string, any>;
    }>;
  };
}

export class ZhipuAdapter extends BaseAdapter {
  readonly id = 'zhipu';
  readonly displayName = '智谱AI';
  readonly icon = '$(sparkle)';
  readonly consoleUrl: PlatformConsole = {
    url: 'https://open.bigmodel.cn/usercenter/billing',
    label: 'Open Zhipu Console',
  };

  private readonly endpoints = {
    production: 'https://open.bigmodel.cn/api/monitor/usage/quota/limit',
    development: 'https://dev.bigmodel.cn/api/monitor/usage/quota/limit',
  };

  /**
   * Check if the adapter is configured (has token)
   */
  isConfigured(): boolean {
    const token = this.getConfigValue<string>('token', '');
    return token.length > 0;
  }

  /**
   * Get the API endpoint based on environment setting
   */
  private getEndpoint(): string {
    const environment = this.getConfigValue<string>('environment', 'production');
    return this.endpoints[environment as keyof typeof this.endpoints] || this.endpoints.production;
  }

  /**
   * Fetch usage data from Zhipu AI API
   */
  async fetchUsage(): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        error: 'Zhipu AI token not configured',
      };
    }

    try {
      const token = this.getConfigValue<string>('token', '');
      const endpoint = this.getEndpoint();

      logger.debug(`Fetching Zhipu AI usage from ${endpoint}`);

      const response = await fetchJson<ZhipuQuotaLimitResponse>(endpoint, {
        headers: {
          'Authorization': token,
          'Accept-Language': 'en-US,en',
          'Content-Type': 'application/json',
        },
      });

      // Check for API-level errors
      // Success if data exists and limits array is present
      if (!response.data || !response.data.limits) {
        throw new Error(`Zhipu AI API error: ${response.msg || 'No data returned'}`);
      }

      const usage = this.transformResponse(response);

      logger.info(`Successfully fetched Zhipu AI usage: ${usage.usages.length} metrics`);

      return {
        configured: true,
        usage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to fetch Zhipu AI usage: ${errorMessage}`);
      return {
        configured: true,
        error: errorMessage,
      };
    }
  }

  /**
   * Transform Zhipu AI API response to PlatformUsage
   */
  private transformResponse(data: ZhipuQuotaLimitResponse): PlatformUsage {
    const limits = data.data?.limits || [];
    const usages: UsageInfo[] = [];

    for (const limit of limits) {
      const usageInfo = this.transformLimit(limit);
      if (usageInfo) {
        usages.push(usageInfo);
      }
    }

    return {
      platform: this.id,
      displayName: this.displayName,
      icon: this.icon,
      usages,
      lastUpdated: new Date(),
      enabled: this.isEnabled(),
    };
  }

  /**
   * Transform a single limit item to UsageInfo
   */
  private transformLimit(limit: any): UsageInfo | null {
    const type = limit.type;
    const percentage = limit.percentage ?? 0;

    switch (type) {
      case 'TOKENS_LIMIT':
        return {
          type: 'tokens',
          label: 'Token (5h)',
          percentage,
        };
      case 'TIME_LIMIT':
        return {
          type: 'time',
          label: 'MCP (月)',
          percentage,
          currentUsage: limit.currentValue,
          total: limit.usage,
          details: limit.usageDetails,
        };
      default:
        // Return unknown types as-is
        return {
          type: type,
          label: type,
          percentage,
        };
    }
  }

  /**
   * Get configuration schema for Zhipu AI
   */
  getConfigurationSchema(): ConfigSchema[] {
    return [
      {
        key: 'enabled',
        type: 'boolean',
        label: 'Enable Zhipu AI',
        default: false,
        description: 'Enable Zhipu AI usage monitoring',
      },
      {
        key: 'token',
        type: 'string',
        label: 'Authorization Token',
        default: '',
        secret: true,
        description: 'Your Zhipu AI authorization token',
      },
      {
        key: 'environment',
        type: 'enum',
        label: 'Environment',
        default: 'production',
        enum: ['production', 'development'],
        description: 'API environment to use',
      },
    ];
  }
}

// Export singleton instance
export const zhipuAdapter = new ZhipuAdapter();
