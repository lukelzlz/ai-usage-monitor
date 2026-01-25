/**
 * VSCode Extension Entry Point
 * AI Usage Monitor - Monitor AI platform usage across multiple providers
 */
import * as vscode from 'vscode';
import { UsageManager } from './core/usageManager';
import { logger } from './utils/logger';

let manager: UsageManager | undefined;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.info('AI Usage Monitor extension is activating...');

  try {
    manager = new UsageManager();
    await manager.initialize();

    logger.info('AI Usage Monitor extension activated successfully');

    // Show welcome message on first activation
    const isFirstRun = context.globalState.get<boolean>('firstRun', true);
    if (isFirstRun) {
      await context.globalState.update('firstRun', false);
      showWelcomeMessage();
    }
  } catch (error) {
    logger.error(`Failed to activate extension: ${error}`);
    vscode.window.showErrorMessage(
      'AI Usage Monitor failed to activate. Check output for details.'
    );
  }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  logger.info('AI Usage Monitor extension is deactivating...');

  if (manager) {
    manager.dispose();
    manager = undefined;
  }

  logger.dispose();
  logger.info('AI Usage Monitor extension deactivated');
}

/**
 * Show welcome message
 */
function showWelcomeMessage(): void {
  const message = '欢迎使用 AI Usage Monitor！请先配置 AI 平台的 API Key。';
  const configure = '配置平台';
  const dismiss = '稍后';

  vscode.window
    .showInformationMessage(message, configure, dismiss)
    .then(selection => {
      if (selection === configure) {
        vscode.commands.executeCommand('ai-usage-monitor.openSettings');
      }
    });
}
