/**
 * Refresh scheduler for auto-refreshing usage data
 */
import * as vscode from 'vscode';
import { logger } from '../utils/logger';

export type RefreshCallback = () => void | Promise<void>;

export class RefreshScheduler {
  private timer: NodeJS.Timeout | null = null;
  private callback: RefreshCallback | null = null;
  private configListener: vscode.Disposable | null = null;

  constructor() {
    this.watchConfiguration();
  }

  /**
   * Start auto-refresh with a callback
   */
  start(callback: RefreshCallback): void {
    this.stop();
    this.callback = callback;
    this.scheduleNext();
  }

  /**
   * Stop auto-refresh
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.callback = null;
  }

  /**
   * Schedule the next refresh
   */
  private scheduleNext(): void {
    const interval = this.getRefreshInterval();

    if (interval <= 0) {
      logger.debug('Auto-refresh is disabled (interval = 0)');
      return;
    }

    logger.debug(`Scheduling next refresh in ${interval} seconds`);

    this.timer = setTimeout(async () => {
      if (this.callback) {
        try {
          await this.callback();
        } catch (error) {
          logger.error(`Error in refresh callback: ${error}`);
        }
      }
      this.scheduleNext();
    }, interval * 1000);
  }

  /**
   * Get refresh interval from configuration
   */
  private getRefreshInterval(): number {
    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    return config.get<number>('refreshInterval', 300);
  }

  /**
   * Watch for configuration changes
   */
  private watchConfiguration(): void {
    this.configListener = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('ai-usage-monitor.refreshInterval')) {
        logger.debug('Refresh interval configuration changed');
        if (this.callback) {
          this.start(this.callback);
        }
      }
    });
  }

  /**
   * Manually trigger a refresh
   */
  async trigger(): Promise<void> {
    if (this.callback) {
      await this.callback();
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop();
    if (this.configListener) {
      this.configListener.dispose();
      this.configListener = null;
    }
  }
}
