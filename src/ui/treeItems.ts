/**
 * Tree Item definitions for the Usage TreeView
 */
import * as vscode from 'vscode';
import { PlatformUsage, UsageInfo } from '../core/types';

/**
 * Platform node - Top level item for each platform
 */
export class PlatformTreeItem extends vscode.TreeItem {
  constructor(public readonly platform: PlatformUsage) {
    // Default to expanded state
    super(platform.displayName, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon(platform.icon);
    this.contextValue = 'platform';
    this.description = platform.error ? 'Error' : '';
    this.tooltip = this.createTooltip();
  }

  private createTooltip(): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${this.platform.displayName}**\n\n`);

    if (this.platform.error) {
      tooltip.appendMarkdown(`❌ Error: ${this.platform.error}\n\n`);
    }

    tooltip.appendMarkdown(`📅 Last updated: ${this.platform.lastUpdated.toLocaleString()}`);

    return tooltip;
  }
}

/**
 * Usage node - Second level item for each usage metric
 * Shows only values without progress bar in sidebar
 */
export class UsageTreeItem extends vscode.TreeItem {
  constructor(
    public readonly platformId: string,
    public readonly usage: UsageInfo
  ) {
    super(usage.label, vscode.TreeItemCollapsibleState.None);

    // Check if this is a balance display (percentage = -1) or percentage display
    if (usage.percentage < 0) {
      // Balance display - show remaining amount
      const unit = usage.unit || '';
      this.description = `${usage.currentUsage}${unit}`;
      this.iconPath = new vscode.ThemeIcon('credit-card', new vscode.ThemeColor('charts.blue'));
    } else {
      // Percentage display - show percentage only (no progress bar in sidebar)
      this.description = `${usage.percentage.toFixed(1)}%`;
      this.iconPath = this.getStatusIcon(usage.percentage);
    }

    // Tooltip with details
    this.tooltip = this.createTooltip();

    this.contextValue = 'usage';
  }

  private getStatusIcon(percentage: number): vscode.ThemeIcon {
    if (percentage >= 80) {
      return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
    }
    if (percentage >= 60) {
      return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.yellow'));
    }
    return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
  }

  private createTooltip(): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${this.usage.label}**\n\n`);

    if (this.usage.percentage >= 0) {
      tooltip.appendMarkdown(`使用率: ${this.usage.percentage.toFixed(1)}%\n\n`);
    }

    if (this.usage.currentUsage !== undefined && this.usage.total !== undefined) {
      const unit = this.usage.unit || '';
      if (this.usage.percentage < 0) {
        // Balance display
        tooltip.appendMarkdown(`**剩余**: ${this.usage.currentUsage}${unit}\n`);
        tooltip.appendMarkdown(`**总量**: ${this.usage.total}${unit}\n`);
      } else {
        tooltip.appendMarkdown(`**当前**: ${this.usage.currentUsage}${unit}\n`);
        tooltip.appendMarkdown(`**总量**: ${this.usage.total}${unit}\n`);
      }
    }

    if (this.usage.details && Object.keys(this.usage.details).length > 0) {
      tooltip.appendMarkdown(`\n**详情**:\n`);
      for (const [key, value] of Object.entries(this.usage.details)) {
        tooltip.appendMarkdown(`- ${key}: ${value}\n`);
      }
    }

    return tooltip;
  }
}

/**
 * Empty state item - Shown when no platforms are configured
 */
export class EmptyTreeItem extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('info');
    this.contextValue = 'empty';
  }
}

/**
 * Not configured item - Shown for a platform that is not configured
 */
export class NotConfiguredTreeItem extends vscode.TreeItem {
  constructor(platformId: string, displayName: string) {
    super(`${displayName} (未配置)`, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('circle-outline');
    this.contextValue = 'not-configured';
    this.description = 'Click to configure';
    this.tooltip = new vscode.MarkdownString(
      `**${displayName}** is not configured.\n\nClick to open settings.`
    );
  }
}

/**
 * Error item - Shown when there's an error fetching data
 */
export class ErrorTreeItem extends vscode.TreeItem {
  constructor(public readonly platformId: string, error: string) {
    super('Error', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
    this.contextValue = 'error';
    this.description = error.substring(0, 50) + (error.length > 50 ? '...' : '');
    this.tooltip = new vscode.MarkdownString(`**Error**:\n\n${error}`);
  }
}
