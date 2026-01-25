/**
 * Tree Item definitions for the usage view
 */
import * as vscode from 'vscode';
import { PlatformUsage, UsageInfo } from '../core/types';

/**
 * Platform tree item - represents a platform/account
 */
export class PlatformTreeItem extends vscode.TreeItem {
  readonly usage: PlatformUsage;

  constructor(usage: PlatformUsage) {
    const label = usage.displayName;
    super(label, vscode.TreeItemCollapsibleState.Expanded);

    this.usage = usage;
    this.contextValue = 'platform';
    this.iconPath = new vscode.ThemeIcon(usage.icon);
    this.description = usage.enabled ? '' : '已禁用';
    this.tooltip = `${usage.displayName}${usage.enabled ? '' : ' (已禁用)'}`;
  }
}

/**
 * Usage tree item - represents a usage metric
 */
export class UsageTreeItem extends vscode.TreeItem {
  readonly instanceId: string;
  readonly usage: UsageInfo;

  constructor(instanceId: string, usage: UsageInfo) {
    let label = usage.label;
    let description = '';

    if (usage.percentage >= 0) {
      // Percentage display
      description = `${usage.percentage.toFixed(0)}%`;
    } else {
      // Balance display (percentage < 0 indicates balance)
      const unit = usage.unit || '';
      description = `${usage.currentUsage}${unit}`;
    }

    super(label, vscode.TreeItemCollapsibleState.None);

    this.instanceId = instanceId;
    this.usage = usage;

    this.description = description;

    // Set icon based on percentage
    if (usage.percentage < 0) {
      // Balance display
      this.iconPath = new vscode.ThemeIcon('credit-card', new vscode.ThemeColor('charts.blue'));
    } else if (usage.percentage < 60) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('terminal.ansiGreen'));
    } else if (usage.percentage < 80) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('terminal.ansiYellow'));
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('terminal.ansiRed'));
    }

    // Tooltip with progress bar
    if (usage.percentage >= 0) {
      const filled = Math.floor(usage.percentage / 10);
      const empty = 10 - filled;
      const progressBar = '▓'.repeat(filled) + '░'.repeat(empty);
      this.tooltip = `${usage.label}: ${usage.percentage.toFixed(1)}% [${progressBar}]`;
    } else {
      this.tooltip = `${usage.label}: ${usage.currentUsage}${usage.unit || ''}`;
    }
  }
}

/**
 * Empty tree item - shown when no usage data
 */
export class EmptyTreeItem extends vscode.TreeItem {
  constructor(instanceId: string) {
    super('暂无数据', vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'empty';
    this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('descriptionForeground'));
    this.tooltip = '等待刷新数据...';
  }
}

/**
 * Not configured tree item - shown when platform is not configured
 */
export class NotConfiguredTreeItem extends vscode.TreeItem {
  readonly instanceId: string;

  constructor(instanceId: string, name: string) {
    super(`${name} (未配置)`, vscode.TreeItemCollapsibleState.None);
    this.instanceId = instanceId;
    this.contextValue = 'notConfigured';
    this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
    this.tooltip = '点击配置此账号';
  }
}

/**
 * Error tree item - shown when fetch failed
 */
export class ErrorTreeItem extends vscode.TreeItem {
  readonly instanceId: string;

  constructor(instanceId: string, error: string) {
    super(`错误: ${error}`, vscode.TreeItemCollapsibleState.None);
    this.instanceId = instanceId;
    this.contextValue = 'error';
    this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
    this.tooltip = error;
  }
}

/**
 * Add account tree item - shown as a button to add new accounts
 */
export class AddAccountTreeItem extends vscode.TreeItem {
  constructor() {
    super('+ 添加账号', vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'addAccount';
    this.iconPath = new vscode.ThemeIcon('add');
    this.command = {
      command: 'ai-usage-monitor.addAccount',
      title: '添加账号',
    };
  }
}
