/**
 * Claude (Anthropic) Platform Adapter
 */
import { BaseAdapter } from './base';
import { ConfigSchema, FetchResult, PlatformUsage, UsageInfo, PlatformConsole } from '../core/types';
import { fetchJson } from '../utils/http';
import { logger } from '../utils/logger';
import { platformTypeRegistry } from './platformTypes';

/**
 * Claude Messages Usage Report API response structure
 */
interface ClaudeMessagesUsageResponse {
  data: Array<{
    ending_at: string;
    results: Array<{
      api_key_id?: string;
      cache_creation?: {
        ephemeral_1h_input_tokens?: number;
        ephemeral_5m_input_tokens?: number;
      };
      cache_read_input_tokens?: number;
      context_window?: '0-200k' | '200k-1M';
      model?: string;
      output_tokens?: number;
      server_tool_use?: {
        web_search_requests?: number;
      };
      service_tier?: 'standard' | 'batch' | 'priority' | 'priority_on_demand' | 'flex' | 'flex_discount';
      uncached_input_tokens?: number;
      workspace_id?: string;
    }>;
    starting_at: string;
  }>;
  has_more?: boolean;
  next_page?: string;
}

/**
 * Claude Code Usage Report API response structure
 */
interface ClaudeCodeUsageResponse {
  data: Array<{
    actor: {
      email_address?: string;
      api_key_name?: string;
      type: 'user_actor' | 'api_actor';
    };
    core_metrics: {
      commits_by_claude_code: number;
      lines_of_code: {
        added: number;
        removed: number;
      };
      num_sessions: number;
      pull_requests_by_claude_code: number;
    };
    customer_type: 'api' | 'subscription';
    date: string;
    model_breakdown: Array<{
      estimated_cost: {
        amount: number;
        currency: string;
      };
      model: string;
      tokens: {
        cache_creation: number;
        cache_read: number;
        input: number;
        output: number;
      };
    }>;
    organization_id: string;
    terminal_type: string;
    tool_actions: Record<string, {
      accepted: number;
      rejected: number;
    }>;
    subscription_type?: 'enterprise' | 'team';
  }>;
  has_more?: boolean;
  next_page?: string;
}

export class ClaudeAdapter extends BaseAdapter {
  private readonly messagesEndpoint = 'https://api.anthropic.com/v1/organizations/usage_report/messages';
  private readonly claudeCodeEndpoint = 'https://api.anthropic.com/v1/organizations/usage_report/claude_code';

  constructor(instanceId: string, instanceName: string, config: Record<string, any>) {
    super(instanceId, instanceName, config);
  }

  protected getPlatformType(): string {
    return 'claude';
  }

  protected getIcon(): string {
    return '$(robot)';
  }

  protected getConsoleUrl(): PlatformConsole {
    return {
      url: 'https://console.anthropic.com/settings/usage',
      label: 'Open Claude Console',
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
   * Fetch usage data from Claude API
   */
  async fetchUsage(): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        error: 'Claude API key not configured',
      };
    }

    try {
      const apiKey = this.getConfigValue<string>('apiKey', '');
      const reportType = this.getConfigValue<string>('reportType', 'messages');

      logger.debug(`Fetching Claude ${reportType} usage`);

      let usage: PlatformUsage;

      if (reportType === 'claude_code') {
        usage = await this.fetchClaudeCodeUsage(apiKey);
      } else {
        usage = await this.fetchMessagesUsage(apiKey);
      }

      logger.info(`Successfully fetched Claude usage: ${usage.usages.length} metrics`);

      return {
        configured: true,
        usage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to fetch Claude usage: ${errorMessage}`);
      return {
        configured: true,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch Messages Usage Report
   */
  private async fetchMessagesUsage(apiKey: string): Promise<PlatformUsage> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDate = startOfMonth.toISOString();
    const endDate = endOfMonth.toISOString();

    const url = `${this.messagesEndpoint}?starting_at=${startDate}&ending_at=${endDate}&bucket_width=1d`;

    const response = await fetchJson<ClaudeMessagesUsageResponse>(url, {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    return this.transformMessagesResponse(response);
  }

  /**
   * Fetch Claude Code Usage Report
   */
  private async fetchClaudeCodeUsage(apiKey: string): Promise<PlatformUsage> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const url = `${this.claudeCodeEndpoint}?starting_at=${dateStr}&limit=100`;

    const response = await fetchJson<ClaudeCodeUsageResponse>(url, {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    return this.transformClaudeCodeResponse(response);
  }

  /**
   * Transform Messages API response to PlatformUsage
   */
  private transformMessagesResponse(data: ClaudeMessagesUsageResponse): PlatformUsage {
    const usages: UsageInfo[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheCreationTokens = 0;
    let totalWebSearchRequests = 0;

    for (const bucket of data.data) {
      for (const result of bucket.results) {
        totalInputTokens += result.uncached_input_tokens || 0;
        totalOutputTokens += result.output_tokens || 0;
        totalCacheReadTokens += result.cache_read_input_tokens || 0;
        totalCacheCreationTokens += (result.cache_creation?.ephemeral_1h_input_tokens || 0) + (result.cache_creation?.ephemeral_5m_input_tokens || 0);
        totalWebSearchRequests += result.server_tool_use?.web_search_requests || 0;
      }
    }

    // Calculate estimated cost (simplified pricing)
    // Claude Sonnet 4 pricing (approximate): $3/M input, $15/M output
    const estimatedCostUSD = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15;
    const monthlyLimit = this.getConfigValue<number>('monthlyLimit', 20);
    const percentage = Math.min((estimatedCostUSD / monthlyLimit) * 100, 100);

    usages.push({
      type: 'cost',
      label: '本月费用',
      percentage,
      currentUsage: estimatedCostUSD,
      total: monthlyLimit,
      unit: 'USD',
    });

    usages.push({
      type: 'tokens',
      label: '输入 Token',
      percentage: 0,
      currentUsage: totalInputTokens,
      details: { uncached: totalInputTokens, cacheRead: totalCacheReadTokens, cacheCreation: totalCacheCreationTokens },
    });

    usages.push({
      type: 'tokens',
      label: '输出 Token',
      percentage: 0,
      currentUsage: totalOutputTokens,
    });

    if (totalWebSearchRequests > 0) {
      usages.push({
        type: 'requests',
        label: '网络搜索',
        percentage: 0,
        currentUsage: totalWebSearchRequests,
        unit: '次',
      });
    }

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
   * Transform Claude Code API response to PlatformUsage
   */
  private transformClaudeCodeResponse(data: ClaudeCodeUsageResponse): PlatformUsage {
    const usages: UsageInfo[] = [];

    if (data.data.length === 0) {
      return {
        platform: this.platformType,
        displayName: this.instanceName,
        icon: this.icon,
        usages: [{
          type: 'info',
          label: '无数据',
          percentage: 0,
        }],
        lastUpdated: new Date(),
        enabled: this.isEnabled(),
        instanceId: this.instanceId,
        platformType: this.platformType,
      };
    }

    // Aggregate metrics across all actors
    let totalSessions = 0;
    let totalCommits = 0;
    let totalPullRequests = 0;
    let totalLinesAdded = 0;
    let totalLinesRemoved = 0;
    let totalEstimatedCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const toolActions: Record<string, { accepted: number; rejected: number }> = {};

    for (const record of data.data) {
      totalSessions += record.core_metrics.num_sessions;
      totalCommits += record.core_metrics.commits_by_claude_code;
      totalPullRequests += record.core_metrics.pull_requests_by_claude_code;
      totalLinesAdded += record.core_metrics.lines_of_code.added;
      totalLinesRemoved += record.core_metrics.lines_of_code.removed;

      for (const modelBreakdown of record.model_breakdown) {
        totalEstimatedCost += modelBreakdown.estimated_cost.amount / 100; // Convert cents to dollars
        totalInputTokens += modelBreakdown.tokens.input;
        totalOutputTokens += modelBreakdown.tokens.output;
      }

      // Aggregate tool actions
      for (const [tool, actions] of Object.entries(record.tool_actions)) {
        if (!toolActions[tool]) {
          toolActions[tool] = { accepted: 0, rejected: 0 };
        }
        toolActions[tool].accepted += actions.accepted;
        toolActions[tool].rejected += actions.rejected;
      }
    }

    // Sessions metric
    const dailySessionLimit = this.getConfigValue<number>('dailySessionLimit', 50);
    usages.push({
      type: 'sessions',
      label: '会话数',
      percentage: Math.min((totalSessions / dailySessionLimit) * 100, 100),
      currentUsage: totalSessions,
      total: dailySessionLimit,
      unit: '次',
    });

    // Commits metric
    usages.push({
      type: 'commits',
      label: '提交数',
      percentage: 0,
      currentUsage: totalCommits,
      unit: '次',
    });

    // Pull requests metric
    usages.push({
      type: 'pull_requests',
      label: 'PR 数',
      percentage: 0,
      currentUsage: totalPullRequests,
      unit: '个',
    });

    // Lines of code metric
    usages.push({
      type: 'code',
      label: '代码行数',
      percentage: 0,
      currentUsage: totalLinesAdded,
      details: { added: totalLinesAdded, removed: totalLinesRemoved },
    });

    // Estimated cost metric
    const dailyCostLimit = this.getConfigValue<number>('dailyCostLimit', 5);
    usages.push({
      type: 'cost',
      label: '预估费用',
      percentage: Math.min((totalEstimatedCost / dailyCostLimit) * 100, 100),
      currentUsage: totalEstimatedCost,
      total: dailyCostLimit,
      unit: 'USD',
    });

    // Tokens metric
    usages.push({
      type: 'tokens',
      label: 'Token 使用',
      percentage: 0,
      currentUsage: totalInputTokens + totalOutputTokens,
      details: { input: totalInputTokens, output: totalOutputTokens },
    });

    // Tool actions metric (aggregate acceptance rate)
    let totalAccepted = 0;
    let totalRejected = 0;
    for (const actions of Object.values(toolActions)) {
      totalAccepted += actions.accepted;
      totalRejected += actions.rejected;
    }
    const totalToolActions = totalAccepted + totalRejected;
    if (totalToolActions > 0) {
      const acceptanceRate = (totalAccepted / totalToolActions) * 100;
      usages.push({
        type: 'acceptance_rate',
        label: '工具接受率',
        percentage: acceptanceRate,
        details: { accepted: totalAccepted, rejected: totalRejected },
      });
    }

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
   * Get configuration schema for Claude
   */
  getConfigurationSchema(): ConfigSchema[] {
    return [
      {
        key: 'apiKey',
        type: 'string',
        label: 'Admin API Key',
        default: '',
        secret: true,
        description: 'Your Anthropic Admin API Key (from Settings > Organization > API Keys)',
      },
      {
        key: 'reportType',
        type: 'enum',
        label: '报告类型',
        default: 'messages',
        enum: ['messages', 'claude_code'],
        description: '选择要获取的使用报告类型',
      },
      {
        key: 'monthlyLimit',
        type: 'number',
        label: '月度费用限制 (USD)',
        default: 20,
        description: '用于计算百分比的费用限制 (仅 Messages 报告)',
      },
      {
        key: 'dailySessionLimit',
        type: 'number',
        label: '每日会话限制',
        default: 50,
        description: '用于计算百分比的会话限制 (仅 Claude Code 报告)',
      },
      {
        key: 'dailyCostLimit',
        type: 'number',
        label: '每日费用限制 (USD)',
        default: 5,
        description: '用于计算百分比的每日费用限制 (仅 Claude Code 报告)',
      },
    ];
  }
}

// Register platform type
platformTypeRegistry.register({
  id: 'claude',
  displayName: 'Claude',
  icon: '$(robot)',
  configSchema: new ClaudeAdapter('temp', 'temp', {}).getConfigurationSchema(),
  consoleUrl: 'https://console.anthropic.com/settings/usage',
  AdapterClass: ClaudeAdapter,
});
