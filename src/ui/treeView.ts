/**
 * TreeView component for displaying usage data
 */
import * as vscode from 'vscode';
import { PlatformUsage, PredictionResult } from '../core/types';
import {
  PlatformTreeItem,
  UsageTreeItem,
  EmptyTreeItem,
  NotConfiguredTreeItem,
  ErrorTreeItem,
  AddAccountTreeItem,
  PredictionTreeItem,
} from './treeItems';
import { registry } from '../adapters/registry';
import { logger } from '../utils/logger';

export class UsageTreeView implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private usageData: Map<string, PlatformUsage> = new Map();
  private predictionData: Map<string, PredictionResult> = new Map();

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  updateUsage(instanceId: string, usage: PlatformUsage): void {
    this.usageData.set(instanceId, usage);
    this._onDidChangeTreeData.fire();
  }

  updatePrediction(instanceId: string, prediction: PredictionResult): void {
    this.predictionData.set(instanceId, prediction);
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
    if (!element) {
      return this.getAccountItems();
    }

    if (element instanceof PlatformTreeItem) {
      return this.getUsageItems(element.usage);
    }

    return [];
  }

  private async getAccountItems(): Promise<vscode.TreeItem[]> {
    const adapters = registry.getAll();
    const items: vscode.TreeItem[] = [];

    for (const adapter of adapters) {
      const usage = this.usageData.get(adapter.instanceId);

      if (usage) {
        items.push(new PlatformTreeItem(usage));
      } else if (adapter.isEnabled()) {
        if (adapter.isConfigured()) {
          items.push(new PlatformTreeItem({
            platform: adapter.platformType,
            displayName: adapter.instanceName,
            icon: adapter.icon,
            usages: [],
            lastUpdated: new Date(),
            enabled: true,
            instanceId: adapter.instanceId,
            platformType: adapter.platformType,
          }));
        } else {
          items.push(new NotConfiguredTreeItem(adapter.instanceId, adapter.instanceName));
        }
      }
    }

    // Add "Add Account" button at the bottom
    items.push(new AddAccountTreeItem());

    return items;
  }

  getInstanceId(element: vscode.TreeItem): string | undefined {
    if (element instanceof PlatformTreeItem) {
      return element.usage.instanceId;
    }
    if (element instanceof UsageTreeItem) {
      return element.instanceId;
    }
    if (element instanceof ErrorTreeItem) {
      return element['instanceId'];
    }
    if (element instanceof NotConfiguredTreeItem) {
      return element['instanceId'];
    }
    return undefined;
  }

  private async getUsageItems(usage: PlatformUsage): Promise<vscode.TreeItem[]> {
    const items: vscode.TreeItem[] = [];

    if (usage.error) {
      items.push(new ErrorTreeItem(usage.instanceId || usage.platform, usage.error));
      return items;
    }

    if (!usage.usages || usage.usages.length === 0) {
      items.push(new EmptyTreeItem(usage.instanceId || usage.platform));
      return items;
    }

    for (const usageInfo of usage.usages) {
      items.push(new UsageTreeItem(usage.instanceId || usage.platform, usageInfo));
    }

    // Add prediction if available
    const instanceId = usage.instanceId || usage.platform;
    const prediction = this.predictionData.get(instanceId);
    if (prediction) {
      items.push(new PredictionTreeItem(instanceId, prediction));
    }

    return items;
  }
}
