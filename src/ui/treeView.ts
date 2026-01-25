/**
 * TreeView component for displaying usage data
 */
import * as vscode from 'vscode';
import { PlatformUsage } from '../core/types';
import {
  PlatformTreeItem,
  UsageTreeItem,
  EmptyTreeItem,
  NotConfiguredTreeItem,
  ErrorTreeItem,
} from './treeItems';
import { registry } from '../adapters/registry';
import { logger } from '../utils/logger';

export class UsageTreeView implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private usageData: Map<string, PlatformUsage> = new Map();

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  updateUsage(platformId: string, usage: PlatformUsage): void {
    this.usageData.set(platformId, usage);
    this._onDidChangeTreeData.fire();
  }

  clearUsage(): void {
    this.usageData.clear();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    // If no element, return top-level items (platforms)
    if (!element) {
      return this.getPlatformItems();
    }

    // If element is a platform, return its usage items
    if (element instanceof PlatformTreeItem) {
      return this.getUsageItems(element.platform);
    }

    return [];
  }

  private async getPlatformItems(): Promise<vscode.TreeItem[]> {
    const adapters = registry.getAll();
    const items: vscode.TreeItem[] = [];

    for (const adapter of adapters) {
      const usage = this.usageData.get(adapter.id);

      if (usage) {
        // Platform has usage data
        items.push(new PlatformTreeItem(usage));

        if (usage.error) {
          // Add error item as child
          items.push(new ErrorTreeItem(adapter.id, usage.error));
        }
      } else if (adapter.isEnabled()) {
        // Platform is enabled but no data yet
        if (adapter.isConfigured()) {
          // Configured but not fetched yet
          items.push(new PlatformTreeItem({
            platform: adapter.id,
            displayName: adapter.displayName,
            icon: adapter.icon,
            usages: [],
            lastUpdated: new Date(),
            enabled: true,
          }));
        } else {
          // Not configured
          items.push(new NotConfiguredTreeItem(adapter.id, adapter.displayName));
        }
      }
    }

    // Show empty state if no items
    if (items.length === 0) {
      items.push(new EmptyTreeItem('尚未配置任何平台。点击下方按钮开始配置。'));
    }

    return items;
  }

  private getUsageItems(platform: PlatformUsage): vscode.TreeItem[] {
    const items: vscode.TreeItem[] = [];

    for (const usage of platform.usages) {
      items.push(new UsageTreeItem(platform.platform, usage));
    }

    return items;
  }

  /**
   * Get the platform ID from a tree item
   */
  getPlatformId(element: vscode.TreeItem): string | undefined {
    if (element instanceof PlatformTreeItem) {
      return element.platform.platform;
    }
    if (element instanceof UsageTreeItem) {
      return element.platformId;
    }
    if (element instanceof ErrorTreeItem) {
      return element['platformId'];
    }
    return undefined;
  }
}
