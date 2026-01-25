/**
 * Platform Type Registry - Defines available platform types
 */
import { PlatformType, ConfigSchema } from '../core/types';

/**
 * Platform type registry
 */
class PlatformTypeRegistry {
  private types: Map<string, PlatformType> = new Map();

  /**
   * Register a platform type
   */
  register(type: PlatformType): void {
    this.types.set(type.id, type);
  }

  /**
   * Get a platform type by ID
   */
  get(typeId: string): PlatformType | undefined {
    return this.types.get(typeId);
  }

  /**
   * Get all registered platform types
   */
  getAll(): PlatformType[] {
    return Array.from(this.types.values());
  }

  /**
   * Check if a platform type exists
   */
  has(typeId: string): boolean {
    return this.types.has(typeId);
  }

  /**
   * Get platform type count
   */
  count(): number {
    return this.types.size;
  }
}

// Global platform type registry instance
export const platformTypeRegistry = new PlatformTypeRegistry();

/**
 * Register platform types
 * Note: This will be populated dynamically by importing adapter classes
 */
export function registerPlatformTypes(): void {
  // Platform types will be registered when adapters are imported
  // This is a placeholder for the actual registration
}

/**
 * Get default config schema for a platform type
 */
export function getDefaultConfigSchema(platformType: string): ConfigSchema[] {
  const type = platformTypeRegistry.get(platformType);
  return type?.configSchema || [];
}

/**
 * Get default display name for a platform type
 */
export function getDefaultDisplayName(platformType: string): string {
  const type = platformTypeRegistry.get(platformType);
  return type?.displayName || platformType;
}

/**
 * Get icon for a platform type
 */
export function getPlatformIcon(platformType: string): string {
  const type = platformTypeRegistry.get(platformType);
  return type?.icon || '$(server)';
}
