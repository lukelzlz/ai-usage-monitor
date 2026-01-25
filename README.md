# AI Usage Monitor

A VSCode extension to monitor AI platform usage and balance across multiple providers.

## Features

- 📊 **Multi-Platform Support**: Monitor usage across multiple AI platforms
- 🎯 **Status Bar Integration**: Quick view of your current usage
- 📋 **Detailed TreeView**: See detailed usage breakdowns in the sidebar
- 🔄 **Auto-Refresh**: Configurable auto-refresh intervals
- 🔌 **Low-Coupling Design**: Easy to add new platform adapters

## Supported Platforms

| Platform | Status | API Endpoint |
|----------|--------|--------------|
| 智谱AI (Zhipu AI) | ✅ Supported | `/api/monitor/usage/quota/limit` |
| DeepSeek | ✅ Supported | `/user/balance` |
| OpenAI | ✅ Supported | `/v1/usage` |
| Claude (Anthropic) | ✅ Supported | `/v1/organizations/usage_report/messages` 或 `/v1/organizations/usage_report/claude_code` |
| New API | ✅ Supported | `/api/user/self` (标准接口，适用于各种镜像站) |

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press `F5` to open a new VSCode window with the extension loaded

## Configuration

Open VSCode Settings and search for `AI Usage Monitor`.

### General Settings

| Setting | Description | Default |
|---------|-------------|----------|
| `ai-usage-monitor.refreshInterval` | Auto-refresh interval in seconds (0 to disable) | 300 |
| `ai-usage-monitor.statusBar.enabled` | Show usage in status bar | true |
| `ai-usage-monitor.statusBar.platform` | Platform to show in status bar | (first active) |

### Platform Settings

#### 智谱AI (Zhipu AI)

| Setting | Description |
|---------|-------------|
| `ai-usage-monitor.platforms.zhipu.enabled` | Enable Zhipu AI monitoring |
| `ai-usage-monitor.platforms.zhipu.token` | Your Zhipu AI authorization token |
| `ai-usage-monitor.platforms.zhipu.environment` | API environment (production/development) |

#### DeepSeek

| Setting | Description |
|---------|-------------|
| `ai-usage-monitor.platforms.deepseek.enabled` | Enable DeepSeek monitoring |
| `ai-usage-monitor.platforms.deepseek.apiKey` | Your DeepSeek API key |
| `ai-usage-monitor.platforms.deepseek.balanceLimit` | Expected balance limit for percentage calculation |

#### OpenAI

| Setting | Description |
|---------|-------------|
| `ai-usage-monitor.platforms.openai.enabled` | Enable OpenAI monitoring |
| `ai-usage-monitor.platforms.openai.apiKey` | Your OpenAI API key |
| `ai-usage-monitor.platforms.openai.monthlyLimit` | Expected monthly spending limit (USD) |

#### Claude (Anthropic)

| Setting | Description |
|---------|-------------|
| `ai-usage-monitor.platforms.claude.enabled` | Enable Claude monitoring |
| `ai-usage-monitor.platforms.claude.apiKey` | Your Anthropic Admin API Key (from Settings > Organization > API Keys) |
| `ai-usage-monitor.platforms.claude.reportType` | Report type: `messages` (Messages Usage) or `claude_code` (Claude Code Usage) |
| `ai-usage-monitor.platforms.claude.monthlyLimit` | Monthly cost limit for percentage calculation (USD, only for messages report) |
| `ai-usage-monitor.platforms.claude.dailySessionLimit` | Daily session limit for percentage calculation (only for claude_code report) |
| `ai-usage-monitor.platforms.claude.dailyCostLimit` | Daily cost limit for percentage calculation (USD, only for claude_code report) |

#### New API (标准接口)

| Setting | Description |
|---------|-------------|
| `ai-usage-monitor.platforms.custom.enabled` | Enable New API monitoring (standard interface for many mirror sites) |
| `ai-usage-monitor.platforms.custom.apiUrl` | New API instance URL |
| `ai-usage-monitor.platforms.custom.apiKey` | New API key (Bearer token) |
| `ai-usage-monitor.platforms.custom.userId` | User ID (for New-Api-User header) |

## Usage

1. **Configure Platforms**: Open Settings and configure your API keys/tokens for each platform
2. **View Usage**: Click the AI Usage Monitor icon in the activity bar to see detailed usage
3. **Status Bar**: Check the status bar for a quick overview
4. **Refresh**: Click the refresh button in the sidebar or use the command palette

## Adding a New Platform

To add support for a new AI platform:

1. Create a new adapter file in `src/adapters/` that implements `IUsageAdapter`
2. Register the adapter in `src/core/usageManager.ts`
3. Add configuration schema in the adapter's `getConfigurationSchema()` method
4. Update `package.json` with the new platform's configuration

Example:

```typescript
import { BaseAdapter } from './base';

export class NewPlatformAdapter extends BaseAdapter {
  readonly id = 'newplatform';
  readonly displayName = 'New Platform';
  readonly icon = '$(cloud)';

  isConfigured(): boolean {
    return !!this.getConfigValue<string>('apiKey', '');
  }

  async fetchUsage(): Promise<FetchResult> {
    // Implement API call
  }

  getConfigurationSchema(): ConfigSchema[] {
    return [
      {
        key: 'apiKey',
        type: 'string',
        label: 'API Key',
        secret: true,
      },
    ];
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run tests
npm test
```

## License

MIT
