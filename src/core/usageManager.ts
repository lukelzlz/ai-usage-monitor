/**
 * Core Usage Manager - Coordinates data fetching and UI updates
 */
import * as vscode from 'vscode';
import { registry } from '../adapters/registry';
import { UsageStatusBar } from '../ui/statusBar';
import { UsageTreeView } from '../ui/treeView';
import { RefreshScheduler } from './scheduler';
import { logger } from '../utils/logger';

export class UsageManager {
  private statusBar: UsageStatusBar;
  private treeView: UsageTreeView;
  private treeDataProvider: vscode.TreeDataProvider<vscode.TreeItem>;
  private scheduler: RefreshScheduler;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.statusBar = new UsageStatusBar();
    this.treeView = new UsageTreeView();
    this.treeDataProvider = this.treeView;
    this.scheduler = new RefreshScheduler();

    this.registerCommands();
    this.registerTreeView();
  }

  /**
   * Initialize the manager
   */
  async initialize(): Promise<void> {
    logger.info('Initializing AI Usage Monitor');

    // Register adapters
    this.registerAdapters();

    // Start auto-refresh
    this.scheduler.start(() => this.refreshAll());

    // Initial refresh
    await this.refreshAll();

    logger.info('AI Usage Monitor initialized');
  }

  /**
   * Register all platform adapters
   */
  private registerAdapters(): void {
    const { zhipuAdapter } = require('../adapters/zhipu');
    const { deepseekAdapter } = require('../adapters/deepseek');
    const { openaiAdapter } = require('../adapters/openai');
    const { customAdapter } = require('../adapters/custom');

    registry.register(zhipuAdapter);
    registry.register(deepseekAdapter);
    registry.register(openaiAdapter);
    registry.register(customAdapter);

    logger.info(`Registered ${registry.count()} platform adapters`);
  }

  /**
   * Register VSCode commands
   */
  private registerCommands(): void {
    this.disposables.push(
      vscode.commands.registerCommand('ai-usage-monitor.refresh', () => this.refreshAll()),
      vscode.commands.registerCommand('ai-usage-monitor.show', () => this.showPanel()),
      vscode.commands.registerCommand('ai-usage-monitor.openSettings', () => this.openSettings()),
      vscode.commands.registerCommand('ai-usage-monitor.addPlatform', () => this.openSettings()),
      vscode.commands.registerCommand('ai-usage-monitor.configurePlatform', (item: vscode.TreeItem) => this.configurePlatform(item)),
      vscode.commands.registerCommand('ai-usage-monitor.togglePlatform', (item: vscode.TreeItem) => this.togglePlatform(item)),
      vscode.commands.registerCommand('ai-usage-monitor.openPlatformConsole', (item: vscode.TreeItem) => this.openPlatformConsole(item))
    );
  }

  /**
   * Register the TreeView
   */
  private registerTreeView(): void {
    this.disposables.push(
      vscode.window.registerTreeDataProvider('ai-usage-monitor.usageView', this.treeDataProvider)
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
      await this.refreshPlatform(adapter.id);
    }

    this.treeView.refresh();
  }

  /**
   * Refresh a specific platform
   */
  async refreshPlatform(platformId: string): Promise<void> {
    const adapter = registry.get(platformId);
    if (!adapter) {
      logger.warn(`Adapter not found: ${platformId}`);
      return;
    }

    logger.debug(`Refreshing platform: ${adapter.displayName}`);

    const result = await adapter.fetchUsage();

    if (result.usage) {
      this.statusBar.updateUsage(platformId, result.usage);
      this.treeView.updateUsage(platformId, result.usage);
    } else if (result.error) {
      logger.error(`Failed to fetch ${adapter.displayName}: ${result.error}`);
      vscode.window.showErrorMessage(`Failed to fetch ${adapter.displayName}: ${result.error}`);
    }
  }

  /**
   * Show the usage panel
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
   * Configure a platform
   */
  private async configurePlatform(item: vscode.TreeItem): Promise<void> {
    const platformId = this.treeView.getPlatformId(item);
    if (!platformId) {
      return;
    }

    const adapter = registry.get(platformId);
    if (!adapter) {
      return;
    }

    // Open settings for this platform
    vscode.commands.executeCommand('workbench.action.openSettings', `${adapter.getConfigSection()}`);
  }

  /**
   * Toggle a platform enabled/disabled
   */
  private async togglePlatform(item: vscode.TreeItem): Promise<void> {
    const platformId = this.treeView.getPlatformId(item);
    if (!platformId) {
      return;
    }

    const adapter = registry.get(platformId);
    if (!adapter) {
      return;
    }

    const currentState = adapter.isEnabled();
    await adapter.setEnabled(!currentState);

    const newState = adapter.isEnabled();
    vscode.window.showInformationMessage(
      `${adapter.displayName} ${newState ? 'enabled' : 'disabled'}`
    );

    // Refresh to update UI
    this.treeView.refresh();
  }

  /**
   * Open platform console in browser
   */
  private openPlatformConsole(item: vscode.TreeItem): void {
    const platformId = this.treeView.getPlatformId(item);
    if (!platformId) {
      return;
    }

    const adapter = registry.get(platformId);
    if (!adapter || !adapter.consoleUrl) {
      return;
    }

    vscode.env.openExternal(vscode.Uri.parse(adapter.consoleUrl.url));
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.scheduler.dispose();
    this.statusBar.dispose();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
