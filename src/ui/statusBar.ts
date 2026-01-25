/**
 * Status Bar component for displaying usage summary
 * Supports multiple providers with progress bars
 */
import * as vscode from 'vscode';
import { PlatformUsage } from '../core/types';
import { registry } from '../adapters/registry';

export class UsageStatusBar {
  private statusBarItems: Map<string, vscode.StatusBarItem> = new Map();
  private usageData: Map<string, PlatformUsage> = new Map();

  constructor() {}

  updateUsage(platformId: string, usage: PlatformUsage): void {
    this.usageData.set(platformId, usage);
    this.updateStatusBarItem(platformId, usage);
  }

  clearUsage(): void {
    this.usageData.clear();
    this.statusBarItems.forEach(item => item.dispose());
    this.statusBarItems.clear();
  }

  private updateStatusBarItem(platformId: string, usage: PlatformUsage): void {
    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    const enabled = config.get<boolean>('statusBar.enabled', true);

    if (!enabled) {
      const existingItem = this.statusBarItems.get(platformId);
      if (existingItem) {
        existingItem.hide();
      }
      return;
    }

    // Get or create status bar item for this platform
    let statusBarItem = this.statusBarItems.get(platformId);
    if (!statusBarItem) {
      // Create new status bar item with priority based on platform order
      const priority = 100 - this.statusBarItems.size;
      statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        priority
      );
      statusBarItem.name = `AI Usage: ${usage.displayName}`;
      this.statusBarItems.set(platformId, statusBarItem);
    }

    if (usage.usages.length > 0) {
      const firstUsage = usage.usages[0];
      
      // Check if this is a balance display or percentage display
      if (firstUsage.percentage < 0) {
        // Balance display - show remaining amount
        const unit = firstUsage.unit || '';
        statusBarItem.text = `$(server) ${firstUsage.currentUsage}${unit}`;
        statusBarItem.color = undefined;
      } else {
        // Percentage display with progress bar
        const percentage = firstUsage.percentage;
        const progressBar = this.createProgressBar(percentage);
        
        // Set color based on percentage
        let color: vscode.ThemeColor | undefined;
        if (percentage >= 80) {
          color = new vscode.ThemeColor('charts.red');
        } else if (percentage >= 60) {
          color = new vscode.ThemeColor('charts.yellow');
        }

        statusBarItem.text = `$(pulse) ${percentage.toFixed(0)}% ${progressBar}`;
        statusBarItem.color = color;
      }

      statusBarItem.tooltip = this.createTooltip(usage);
      statusBarItem.command = 'ai-usage-monitor.show';
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }

  private createProgressBar(percentage: number): string {
    // Create a compact progress bar using Unicode characters
    const totalBlocks = 10;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '▓'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  }

  private createTooltip(usage: PlatformUsage): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${usage.displayName}**\n\n`);

    for (const u of usage.usages) {
      if (u.percentage < 0) {
        // Balance display
        const unit = u.unit || '';
        tooltip.appendMarkdown(`**${u.label}**: ${u.currentUsage}${unit}\n`);
        if (u.total !== undefined) {
          tooltip.appendMarkdown(`  总量: ${u.total}${unit}\n`);
        }
      } else {
        // Percentage display
        tooltip.appendMarkdown(`**${u.label}**: ${u.percentage.toFixed(1)}%\n`);
        if (u.currentUsage !== undefined && u.total !== undefined) {
          const unit = u.unit || '';
          tooltip.appendMarkdown(`  ${u.currentUsage}${unit} / ${u.total}${unit}\n`);
        }
      }
    }

    tooltip.appendMarkdown(`\n📅 更新于: ${usage.lastUpdated.toLocaleString()}`);
    tooltip.appendMarkdown(`\n\n点击打开详情面板`);

    return tooltip;
  }

  dispose(): void {
    this.statusBarItems.forEach(item => item.dispose());
    this.statusBarItems.clear();
  }
}
