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
  private refreshInterval: number = 300;

  constructor() {
    this.watchConfiguration();
  }

  start(callback: RefreshCallback): void {
    this.stop();
    this.callback = callback;
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.callback = null;
  }

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

  async trigger(): Promise<void> {
    if (this.callback) {
      try {
        await this.callback();
      } catch (error) {
        logger.error(`Error in manual refresh: ${error}`);
      }
    }
  }

  private getRefreshInterval(): number {
    const config = vscode.workspace.getConfiguration('ai-usage-monitor');
    return config.get<number>('refreshInterval', 300);
  }

  private watchConfiguration(): void {
    this.configListener = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('ai-usage-monitor.refreshInterval')) {
        const newInterval = this.getRefreshInterval();
        logger.info(`Refresh interval changed to ${newInterval} seconds`);

        if (this.callback) {
          this.start(this.callback);
        }
      }
    });
  }

  dispose(): void {
    this.stop();
    if (this.configListener) {
      this.configListener.dispose();
      this.configListener = null;
    }
  }
}
