/**
 * Historical usage data storage
 * Stores usage data in VSCode's globalState for persistence
 */
import * as vscode from 'vscode';
import { UsageDataPoint } from './types';
import { logger } from '../utils/logger';

export class HistoryStorage {
  private storageKey = 'ai-usage-monitor.history';
  private data: Map<string, UsageDataPoint[]> = new Map();
  private maxHistoryDays: number;

  constructor() {
    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    this.maxHistoryDays = config.get<number>('prediction.maxHistoryDays', 7);
    this.loadFromStorage();
  }

  /**
   * Add a new data point for an account
   */
  addDataPoint(instanceId: string, remaining: number, total: number): void {
    const dataPoint: UsageDataPoint = {
      timestamp: Date.now(),
      remaining,
      total,
    };

    let history = this.data.get(instanceId) || [];

    // Add new data point
    history.push(dataPoint);

    // Remove old data points
    const cutoffTime = Date.now() - (this.maxHistoryDays * 24 * 60 * 60 * 1000);
    history = history.filter(point => point.timestamp > cutoffTime);

    // Limit to 1000 data points per account to prevent storage bloat
    if (history.length > 1000) {
      history = history.slice(-1000);
    }

    this.data.set(instanceId, history);
    this.saveToStorage();

    logger.debug(`Added data point for ${instanceId}, total points: ${history.length}`);
  }

  /**
   * Get history for an account
   */
  getHistory(instanceId: string): UsageDataPoint[] {
    return this.data.get(instanceId) || [];
  }

  /**
   * Clear history for an account
   */
  clearHistory(instanceId: string): void {
    this.data.delete(instanceId);
    this.saveToStorage();
  }

  /**
   * Clear all history
   */
  clearAll(): void {
    this.data.clear();
    this.saveToStorage();
  }

  /**
   * Load data from VSCode globalState
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const context = (global as any).extensionContext;
      if (!context) {
        logger.warn('Extension context not available for history storage');
        return;
      }

      const stored: Record<string, UsageDataPoint[]> = context.globalState.get(this.storageKey) || {};
      this.data = new Map(Object.entries(stored));
      logger.debug(`Loaded history for ${this.data.size} accounts`);
    } catch (error) {
      logger.error(`Failed to load history: ${error}`);
    }
  }

  /**
   * Save data to VSCode globalState
   */
  private saveToStorage(): void {
    try {
      const context = (global as any).extensionContext;
      if (!context) {
        logger.warn('Extension context not available for history storage');
        return;
      }

      const obj = Object.fromEntries(this.data);
      context.globalState.update(this.storageKey, obj);
    } catch (error) {
      logger.error(`Failed to save history: ${error}`);
    }
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clearAll();
  }
}

// Singleton instance
let historyStorageInstance: HistoryStorage | null = null;

export function getHistoryStorage(): HistoryStorage {
  if (!historyStorageInstance) {
    historyStorageInstance = new HistoryStorage();
  }
  return historyStorageInstance;
}
