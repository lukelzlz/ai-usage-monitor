/**
 * Adapter Registry - Manages all platform adapter instances
 */
import { IUsageAdapter } from '../core/types';
import { logger } from '../utils/logger';

export class AdapterRegistry {
  private adapters: Map<string, IUsageAdapter> = new Map();

  /**
   * Register a new adapter instance
   */
  register(adapter: IUsageAdapter): void {
    this.adapters.set(adapter.instanceId, adapter);
    logger.debug(`Registered adapter: ${adapter.instanceId} (${adapter.instanceName})`);
  }

  /**
   * Unregister an adapter instance
   */
  unregister(instanceId: string): void {
    this.adapters.delete(instanceId);
    logger.debug(`Unregistered adapter: ${instanceId}`);
  }

  /**
   * Get an adapter by instance ID
   */
  get(instanceId: string): IUsageAdapter | undefined {
    return this.adapters.get(instanceId);
  }

  /**
   * Get all registered adapters
   */
  getAll(): IUsageAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get only configured adapters (have API keys/tokens)
   */
  getConfigured(): IUsageAdapter[] {
    return this.getAll().filter(adapter => adapter.isConfigured());
  }

  /**
   * Get only enabled adapters (enabled in settings)
   */
  getEnabled(): IUsageAdapter[] {
    return this.getAll().filter(adapter => adapter.isEnabled());
  }

  /**
   * Get adapters that are both configured and enabled
   */
  getActive(): IUsageAdapter[] {
    return this.getAll().filter(adapter => adapter.isConfigured() && adapter.isEnabled());
  }

  /**
   * Check if an adapter exists
   */
  has(instanceId: string): boolean {
    return this.adapters.has(instanceId);
  }

  /**
   * Get adapter count
   */
  count(): number {
    return this.adapters.size;
  }

  /**
   * Clear all adapters (mainly for reinitialization)
   */
  clear(): void {
    this.adapters.clear();
    logger.debug('Cleared all adapters');
  }
}

// Global registry instance
export const registry = new AdapterRegistry();
