/**
 * Tree Item definitions for the usage view
 */
import * as vscode from 'vscode';
import { PlatformUsage, UsageInfo, PredictionResult } from '../core/types';

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

/**
 * Prediction tree item - shows usage prediction
 */
export class PredictionTreeItem extends vscode.TreeItem {
  readonly instanceId: string;
  readonly prediction: PredictionResult;

  constructor(instanceId: string, prediction: PredictionResult) {
    const label = '额度预测';
    let description = '';

    if (!prediction.available) {
      description = '数据不足';
    } else {
      const { daysUntilDepletion, estimatedDepletionDate } = prediction;

      if (daysUntilDepletion < 0) {
        description = '已用完';
      } else if (daysUntilDepletion < 1) {
        const hours = Math.floor(daysUntilDepletion * 24);
        description = `约 ${hours} 小时后用完`;
      } else if (daysUntilDepletion < 30) {
        const days = Math.floor(daysUntilDepletion);
        description = `约 ${days} 天后用完`;
      } else {
        const months = Math.floor(daysUntilDepletion / 30);
        description = `约 ${months} 个月后用完`;
      }

      description += ` (${estimatedDepletionDate.toLocaleDateString()})`;
    }

    super(label, vscode.TreeItemCollapsibleState.None);

    this.instanceId = instanceId;
    this.prediction = prediction;
    this.description = description;

    // Set icon based on urgency
    if (!prediction.available) {
      this.iconPath = new vscode.ThemeIcon('history', new vscode.ThemeColor('descriptionForeground'));
    } else if (prediction.daysUntilDepletion < 1) {
      this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('errorForeground'));
    } else if (prediction.daysUntilDepletion < 7) {
      this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'));
    } else {
      this.iconPath = new vscode.ThemeIcon('calendar', new vscode.ThemeColor('descriptionForeground'));
    }

    // Tooltip with more details
    if (prediction.available) {
      this.tooltip = `基于使用速度预测\n`
        + `预计用完时间: ${prediction.estimatedDepletionDate.toLocaleString()}\n`
        + `每日使用: ${prediction.dailyUsageRate.toFixed(2)}`;
    } else {
      this.tooltip = '需要更多使用数据才能进行预测';
    }
  }
}
