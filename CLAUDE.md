# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Usage Monitor is a VS Code extension that monitors AI platform usage and balances across multiple providers and accounts. It uses an adapter-based architecture to support different AI platforms through a unified interface.

## Development Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run ESLint
npm run lint

# Run tests (currently minimal)
npm test

# Load extension in VS Code for development
# Press F5 in VS Code
```

## Architecture

### Core Components

- **`src/extension.ts`**: Entry point. Creates `UsageManager` on activation and handles lifecycle.
- **`src/core/usageManager.ts`**: Central coordinator. Manages adapters, registers commands, handles configuration changes, and coordinates UI updates.
- **`src/core/scheduler.ts`**: Auto-refresh scheduler based on `ai-usage-monitor.refreshInterval` setting.
- **`src/core/types.ts`**: Core type definitions (`UsageInfo`, `PlatformUsage`, `AccountConfig`, `IUsageAdapter`).

### Adapter Pattern (`src/adapters/`)

Each AI platform implements `IUsageAdapter` by extending `BaseAdapter`:

```typescript
abstract class BaseAdapter implements IUsageAdapter {
  // Required to implement:
  abstract isConfigured(): boolean;
  abstract fetchUsage(): Promise<FetchResult>;
  abstract getConfigurationSchema(): ConfigSchema[];
  protected abstract getPlatformType(): string;
  protected abstract getIcon(): string;
  protected abstract getConsoleUrl(): PlatformConsole | undefined;
}
```

**Key files:**
- **`base.ts`**: Abstract base class with common functionality (config access, enable/disable)
- **`factory.ts`**: Creates adapter instances from `ai-usage-monitor.accounts` configuration
- **`registry.ts`**: Singleton registry for managing all active adapter instances
- **`platformTypes.ts`**: Platform type definitions and default configuration schemas
- **`zhipu.ts`, `deepseek.ts`, `openai.ts`, `claude.ts`, `custom.ts`, `openrouter.ts`**: Platform-specific implementations

### Multi-Account Support

Each adapter instance has a unique `instanceId` (format: `{platformType}-{timestamp}`), allowing multiple accounts of the same platform type. Configuration is stored in VS Code settings as:

```json
"ai-usage-monitor.accounts": [
  {
    "id": "openai-1234567890",
    "type": "openai",
    "name": "My OpenAI Account",
    "enabled": true,
    "config": { "apiKey": "...", "monthlyLimit": 20 }
  }
]
```

### UI Components (`src/ui/`)

- **`treeView.ts`**: TreeDataProvider for the activity bar sidebar. Displays accounts with context menus.
- **`treeItems.ts`**: TreeItem implementations for platform nodes.
- **`statusBar.ts`**: Status bar integration showing usage summary.

### Utilities (`src/utils/`)

- **`http.ts`**: HTTP client wrapper (handles headers, response parsing)
- **`logger.ts`**: Output channel logger for debug/info/error messages

## Adding a New Platform

1. Create a new adapter in `src/adapters/{platform}.ts` extending `BaseAdapter`
2. Add platform type definition to `src/adapters/platformTypes.ts`
3. Import the adapter in `usageManager.ts` → `importAdapters()` method
4. Update `package.json` → `configuration.properties.ai-usage-monitor.accounts.items.properties.type.enum` if needed

## Key Design Patterns

1. **Dynamic Registration**: Adapters register themselves via side effects on import (see platform adapters' top-level registration calls)
2. **Configuration Watch**: `onDidChangeConfiguration` triggers adapter re-initialization when accounts change
3. **Factory Pattern**: `AdapterFactory` creates adapters from config using registry of platform types
4. **Separation of Concerns**: Adapters don't touch UI; they return `FetchResult` which `UsageManager` passes to UI components

## VS Code Integration

- **Commands**: All commands prefixed with `ai-usage-monitor.*`
- **Activity Bar**: Container `ai-usage-monitor` with view `ai-usage-monitor.usageView`
- **Settings**: Scoped under `ai-usage-monitor.*`
- **Output Channel**: "AI Usage Monitor" for logging (use `logger` from `src/utils/logger.ts`)
