/**
 * Core Usage Manager - Coordinates data fetching and UI updates
 */
import * as vscode from 'vscode';
import { registry } from '../adapters/registry';
import { UsageStatusBar } from '../ui/statusBar';
import { UsageTreeView } from '../ui/treeView';
import { RefreshScheduler } from './scheduler';
import { logger } from '../utils/logger';
import { adapterFactory } from '../adapters/factory';
import { AccountConfig } from './types';

export class UsageManager {
  private statusBar: UsageStatusBar;
  private treeView: UsageTreeView;
  private scheduler: RefreshScheduler;
  private disposables: vscode.Disposable[] = [];
  private configChangeDisposable?: vscode.Disposable;

  constructor() {
    this.statusBar = new UsageStatusBar();
    this.treeView = new UsageTreeView();
    this.scheduler = new RefreshScheduler();

    this.registerCommands();
    this.registerTreeView();
    this.watchConfigurationChanges();
  }

  /**
   * Initialize manager
   */
  async initialize(): Promise<void> {
    logger.info('Initializing AI Usage Monitor');

    // Import adapters to register platform types
    await this.importAdapters();

    // Register adapter instances from configuration
    this.registerAdaptersFromConfig();

    // Start auto-refresh
    this.scheduler.start(() => this.refreshAll());

    // Initial refresh
    await this.refreshAll();

    logger.info('AI Usage Monitor initialized');
  }

  /**
   * Import all adapter modules to register platform types
   */
  private async importAdapters(): Promise<void> {
    // Import adapters to trigger platform type registration
    await import('../adapters/zhipu');
    await import('../adapters/deepseek');
    await import('../adapters/openai');
    await import('../adapters/custom');
    await import('../adapters/claude');
    logger.info('Platform types registered');
  }

  /**
   * Register adapter instances from configuration
   */
  private registerAdaptersFromConfig(): void {
    // Clear existing adapters
    registry.clear();

    // Create new adapters from configuration
    const adapters = adapterFactory.createAdaptersFromConfig();

    for (const adapter of adapters) {
      registry.register(adapter);
    }

    logger.info(`Registered ${registry.count()} account instances`);
  }

  /**
   * Watch for configuration changes
   */
  private watchConfigurationChanges(): void {
    this.configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('ai-usage-monitor.accounts')) {
        logger.info('Accounts configuration changed, reinitializing adapters');
        this.registerAdaptersFromConfig();
        this.treeView.refresh();
      }
    });
  }

  /**
   * Register VSCode commands
   */
  private registerCommands(): void {
    this.disposables.push(
      vscode.commands.registerCommand('ai-usage-monitor.refresh', () => this.refreshAll()),
      vscode.commands.registerCommand('ai-usage-monitor.show', () => this.showPanel()),
      vscode.commands.registerCommand('ai-usage-monitor.openSettings', () => this.openSettings()),
      vscode.commands.registerCommand('ai-usage-monitor.addAccount', () => this.addAccount()),
      vscode.commands.registerCommand('ai-usage-monitor.editAccount', (item: vscode.TreeItem) => this.editAccount(item)),
      vscode.commands.registerCommand('ai-usage-monitor.deleteAccount', (item: vscode.TreeItem) => this.deleteAccount(item)),
      vscode.commands.registerCommand('ai-usage-monitor.duplicateAccount', (item: vscode.TreeItem) => this.duplicateAccount(item)),
      vscode.commands.registerCommand('ai-usage-monitor.toggleAccount', (item: vscode.TreeItem) => this.toggleAccount(item)),
      vscode.commands.registerCommand('ai-usage-monitor.openAccountConsole', (item: vscode.TreeItem) => this.openAccountConsole(item))
    );
  }

  /**
   * Register TreeView
   */
  private registerTreeView(): void {
    this.disposables.push(
      vscode.window.registerTreeDataProvider('ai-usage-monitor.usageView', this.treeView)
    );
  }

  /**
   * Refresh all platforms
   */
  async refreshAll(): Promise<void> {
    logger.info('Refreshing all platforms');

    const activeAdapters = registry.getActive();

    if (activeAdapters.length === 0) {
      logger.info('No active platforms configured');
      return;
    }

    for (const adapter of activeAdapters) {
      await this.refreshPlatform(adapter.instanceId);
    }

    this.treeView.refresh();
  }

  /**
   * Refresh a specific platform
   */
  async refreshPlatform(instanceId: string): Promise<void> {
    const adapter = registry.get(instanceId);
    if (!adapter) {
      logger.warn(`Adapter not found: ${instanceId}`);
      return;
    }

    logger.debug(`Refreshing platform: ${adapter.instanceName}`);

    const result = await adapter.fetchUsage();

    if (result.usage) {
      this.statusBar.updateUsage(instanceId, result.usage);
      this.treeView.updateUsage(instanceId, result.usage);
    } else if (result.error) {
      logger.error(`Failed to fetch ${adapter.instanceName}: ${result.error}`);
      vscode.window.showErrorMessage(`Failed to fetch ${adapter.instanceName}: ${result.error}`);
    }
  }

  /**
   * Show usage panel
   */
  private showPanel(): void {
    vscode.commands.executeCommand('workbench.view.extension.ai-usage-monitor');
  }

  /**
   * Open settings
   */
  private openSettings(): void {
    vscode.commands.executeCommand('workbench.action.openSettings', 'ai-usage-monitor');
  }

  /**
   * Add a new account
   */
  private async addAccount(): Promise<void> {
    const platformType = await this.selectPlatformType();
    if (!platformType) {
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: '请输入账号名称',
      placeHolder: getDefaultName(platformType),
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return '账号名称不能为空';
        }
        return null;
      },
    });

    if (!name) {
      return;
    }

    const config = await this.collectPlatformConfig(platformType);
    if (!config) {
      return;
    }

    const account: AccountConfig = {
      id: `${platformType}-${Date.now()}`,
      type: platformType,
      name: name.trim(),
      enabled: true,
      config,
    };

    await this.saveAccount(account);
    this.registerAdaptersFromConfig();
    this.treeView.refresh();

    vscode.window.showInformationMessage(`已添加账号: ${name}`);
  }

  /**
   * Edit an existing account
   */
  private async editAccount(item: vscode.TreeItem): Promise<void> {
    const instanceId = this.treeView.getInstanceId(item);
    if (!instanceId) {
      return;
    }

    const adapter = registry.get(instanceId);
    if (!adapter) {
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: '请输入账号名称',
      value: adapter.instanceName,
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return '账号名称不能为空';
        }
        return null;
      },
    });

    if (name === undefined || name.trim() === adapter.instanceName) {
      return;
    }

    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    const accounts = config.get<AccountConfig[]>('accounts', []);
    const accountIndex = accounts.findIndex(a => a.id === instanceId);

    if (accountIndex >= 0) {
      accounts[accountIndex].name = name.trim();
      await config.update('accounts', accounts, vscode.ConfigurationTarget.Global);
      this.registerAdaptersFromConfig();
      this.treeView.refresh();
      vscode.window.showInformationMessage(`已更新账号: ${name}`);
    }
  }

  /**
   * Delete an account
   */
  private async deleteAccount(item: vscode.TreeItem): Promise<void> {
    const instanceId = this.treeView.getInstanceId(item);
    if (!instanceId) {
      return;
    }

    const adapter = registry.get(instanceId);
    if (!adapter) {
      return;
    }

    const confirmed = await vscode.window.showWarningMessage(
      `确定要删除账号 "${adapter.instanceName}" 吗？`,
      { modal: true },
      '删除',
      '取消'
    );

    if (confirmed !== '删除') {
      return;
    }

    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    const accounts = config.get<AccountConfig[]>('accounts', []);
    const newAccounts = accounts.filter(a => a.id !== instanceId);

    await config.update('accounts', newAccounts, vscode.ConfigurationTarget.Global);
    this.registerAdaptersFromConfig();
    this.treeView.refresh();
    this.statusBar.removeItem(instanceId);

    vscode.window.showInformationMessage(`已删除账号: ${adapter.instanceName}`);
  }

  /**
   * Duplicate an account
   */
  private async duplicateAccount(item: vscode.TreeItem): Promise<void> {
    const instanceId = this.treeView.getInstanceId(item);
    if (!instanceId) {
      return;
    }

    const adapter = registry.get(instanceId);
    if (!adapter) {
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: '请输入新账号名称',
      value: `${adapter.instanceName} (副本)`,
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return '账号名称不能为空';
        }
        return null;
      },
    });

    if (!name) {
      return;
    }

    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    const accounts = config.get<AccountConfig[]>('accounts', []);
    const originalAccount = accounts.find(a => a.id === instanceId);

    if (originalAccount) {
      const newAccount: AccountConfig = {
        ...originalAccount,
        id: `${originalAccount.type}-${Date.now()}`,
        name: name.trim(),
      };
      accounts.push(newAccount);
      await config.update('accounts', accounts, vscode.ConfigurationTarget.Global);
      this.registerAdaptersFromConfig();
      this.treeView.refresh();
      vscode.window.showInformationMessage(`已复制账号: ${name}`);
    }
  }

  /**
   * Toggle account enabled/disabled
   */
  private async toggleAccount(item: vscode.TreeItem): Promise<void> {
    const instanceId = this.treeView.getInstanceId(item);
    if (!instanceId) {
      return;
    }

    const adapter = registry.get(instanceId);
    if (!adapter) {
      return;
    }

    const currentState = adapter.isEnabled();
    await adapter.setEnabled(!currentState);

    const newState = adapter.isEnabled();
    vscode.window.showInformationMessage(
      `${adapter.instanceName} ${newState ? '已启用' : '已禁用'}`
    );

    this.treeView.refresh();
  }

  /**
   * Open account console in browser
   */
  private openAccountConsole(item: vscode.TreeItem): void {
    const instanceId = this.treeView.getInstanceId(item);
    if (!instanceId) {
      return;
    }

    const adapter = registry.get(instanceId);
    if (!adapter || !adapter.consoleUrl) {
      return;
    }

    vscode.env.openExternal(vscode.Uri.parse(adapter.consoleUrl.url));
  }

  /**
   * Select platform type
   */
  private async selectPlatformType(): Promise<string | undefined> {
    const platformTypes = adapterFactory.getAvailablePlatformTypes();
    const selected = await vscode.window.showQuickPick(platformTypes, {
      placeHolder: '选择平台类型',
    });
    return selected?.description;
  }

  /**
   * Collect platform configuration
   */
  private async collectPlatformConfig(platformType: string): Promise<Record<string, any> | null> {
    const config: Record<string, any> = {};

    // Get platform type info
    const { getDefaultConfigSchema, getDefaultDisplayName } = await import('../adapters/platformTypes');
    const schema = getDefaultConfigSchema(platformType);

    for (const field of schema) {
      let value: string | undefined;

      if (field.type === 'enum') {
        const selected = await vscode.window.showQuickPick(
          (field.enum || []).map(e => ({ label: e, value: e })),
          {
            placeHolder: field.label,
            prompt: field.description,
          }
        );
        value = selected?.value;
      } else if (field.secret) {
        value = await vscode.window.showInputBox({
          prompt: field.label,
          password: true,
          placeHolder: field.description,
        });
      } else if (field.type === 'boolean') {
        const selected = await vscode.window.showQuickPick(
          [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
          {
            placeHolder: field.label,
            prompt: field.description,
          }
        );
        value = selected?.value ? 'true' : 'false';
      } else if (field.type === 'number') {
        const input = await vscode.window.showInputBox({
          prompt: field.label,
          placeHolder: field.default?.toString() || '',
          validateInput: (val: string) => {
            if (val && isNaN(Number(val))) {
              return '请输入有效的数字';
            }
            return null;
          },
        });
        value = input;
      } else {
        value = await vscode.window.showInputBox({
          prompt: field.label,
          placeHolder: field.default?.toString() || '',
        });
      }

      if (value === undefined) {
        // User cancelled
        return null;
      }

      if (field.type === 'boolean') {
        config[field.key] = value === 'true';
      } else if (field.type === 'number') {
        config[field.key] = value ? Number(value) : field.default;
      } else {
        config[field.key] = value;
      }
    }

    return config;
  }

  /**
   * Save account to configuration
   */
  private async saveAccount(account: AccountConfig): Promise<void> {
    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    const accounts = config.get<AccountConfig[]>('accounts', []);
    accounts.push(account);
    await config.update('accounts', accounts, vscode.ConfigurationTarget.Global);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.configChangeDisposable?.dispose();
    this.scheduler.dispose();
    this.statusBar.dispose();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

/**
 * Get default account name for a platform type
 */
function getDefaultName(platformType: string): string {
  const names: Record<string, string> = {
    zhipu: '智谱AI',
    deepseek: 'DeepSeek',
    openai: 'OpenAI',
    custom: 'New API',
    claude: 'Claude',
  };
  return names[platformType] || platformType;
}
