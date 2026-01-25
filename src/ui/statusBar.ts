/**
 * Status Bar component for displaying usage in VSCode status bar
 */
import * as vscode from 'vscode';
import { PlatformUsage } from '../core/types';

export class UsageStatusBar {
  private statusBarItems: Map<string, vscode.StatusBarItem> = new Map();
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration('ai-usage-monitor');
  }

  /**
   * Update usage for a specific account
   */
  updateUsage(instanceId: string, usage: PlatformUsage): void {
    const statusBarItem = this.statusBarItems.get(instanceId) || this.createStatusBarItem(instanceId);
    const showAccountName = this.config.get<boolean>('statusBar.showAccountName', false);

    // For custom (New API) type, show balance only without progress bar
    if (usage.platformType === 'custom') {
      const balance = this.getBalance(usage);
      if (showAccountName) {
        statusBarItem.text = `$(credit-card) ${usage.displayName}: ${balance}`;
      } else {
        statusBarItem.text = `$(credit-card) ${balance}`;
      }
      statusBarItem.color = new vscode.ThemeColor('statusBar.foreground');
      statusBarItem.tooltip = `${usage.displayName}: 剩余额度 ${balance}`;
      statusBarItem.show();
      return;
    }

    // For other platforms, show percentage with progress bar
    const percentage = this.calculatePercentage(usage);

    // Create progress bar
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    const progressBar = '▓'.repeat(filled) + '░'.repeat(empty);

    // Set color based on percentage
    let color = 'statusBar.foreground';
    if (percentage >= 80) {
      color = 'errorForeground';
    } else if (percentage >= 60) {
      color = 'warningForeground';
    }

    if (showAccountName) {
      statusBarItem.text = `$(pulse) ${usage.displayName}: ${percentage.toFixed(0)}% ${progressBar}`;
    } else {
      statusBarItem.text = `$(pulse) ${percentage.toFixed(0)}% ${progressBar}`;
    }
    statusBarItem.color = new vscode.ThemeColor(color);
    statusBarItem.tooltip = `${usage.displayName}: ${percentage.toFixed(1)}%`;
    statusBarItem.show();
  }

  /**
   * Create a new status bar item
   */
  private createStatusBarItem(instanceId: string): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(
      `ai-usage-monitor.${instanceId}`,
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.command = 'ai-usage-monitor.show';
    this.statusBarItems.set(instanceId, statusBarItem);
    return statusBarItem;
  }

  /**
   * Remove a status bar item
   */
  removeItem(instanceId: string): void {
    const statusBarItem = this.statusBarItems.get(instanceId);
    if (statusBarItem) {
      statusBarItem.dispose();
      this.statusBarItems.delete(instanceId);
    }
  }

  /**
   * Clear all status bar items
   */
  clear(): void {
    for (const statusBarItem of this.statusBarItems.values()) {
      statusBarItem.dispose();
    }
    this.statusBarItems.clear();
  }

  /**
   * Get balance from usage data (for custom/New API type)
   */
  private getBalance(usage: PlatformUsage): string {
    if (!usage.usages || usage.usages.length === 0) {
      return '0';
    }

    // Find first usage with percentage < 0 (balance display)
    for (const u of usage.usages) {
      if (u.percentage < 0) {
        const unit = u.unit || '';
        return `${u.currentUsage}${unit}`;
      }
    }

    return '0';
  }

  /**
   * Calculate percentage from usage data
   */
  private calculatePercentage(usage: PlatformUsage): number {
    if (!usage.usages || usage.usages.length === 0) {
      return 0;
    }

    // Find first usage with percentage >= 0
    for (const u of usage.usages) {
      if (u.percentage >= 0) {
        return u.percentage;
      }
    }

    return 0;
  }

  /**
   * Dispose all status bar items
   */
  dispose(): void {
    this.clear();
  }
}
