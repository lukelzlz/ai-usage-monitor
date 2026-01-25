/**
 * Adapter Registry - Manages all platform adapters
 */
import { IUsageAdapter } from './base';

export class AdapterRegistry {
  private adapters: Map<string, IUsageAdapter> = new Map();

  /**
   * Register a new adapter
   */
  register(adapter: IUsageAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Unregister an adapter
   */
  unregister(id: string): void {
    this.adapters.delete(id);
  }

  /**
   * Get an adapter by ID
   */
  get(id: string): IUsageAdapter | undefined {
    return this.adapters.get(id);
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
  has(id: string): boolean {
    return this.adapters.has(id);
  }

  /**
   * Get adapter count
   */
  count(): number {
    return this.adapters.size;
  }

  /**
   * Clear all adapters (mainly for testing)
   */
  clear(): void {
    this.adapters.clear();
  }
}

// Global registry instance
export const registry = new AdapterRegistry();
