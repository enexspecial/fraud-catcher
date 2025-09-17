import { IAlgorithmPlugin, IFraudAlgorithm } from '../interfaces/IFraudAlgorithm';
import { ServiceContainer } from '../container/ServiceContainer';

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  configSchema: Record<string, any>;
  dependencies?: string[];
}

export class PluginManager {
  private container: ServiceContainer;
  private loadedPlugins = new Map<string, IAlgorithmPlugin>();
  private pluginMetadata = new Map<string, PluginMetadata>();

  constructor(container: ServiceContainer) {
    this.container = container;
  }

  registerPlugin(plugin: IAlgorithmPlugin): void {
    const metadata = plugin.getMetadata();
    
    // Validate plugin
    if (!this.validatePlugin(plugin)) {
      throw new Error(`Invalid plugin: ${metadata.name}`);
    }

    // Check dependencies
    if (metadata.dependencies) {
      for (const dep of metadata.dependencies) {
        if (!this.loadedPlugins.has(dep)) {
          throw new Error(`Plugin ${metadata.name} requires dependency ${dep} which is not loaded`);
        }
      }
    }

    // Register plugin
    this.loadedPlugins.set(metadata.name, plugin);
    this.pluginMetadata.set(metadata.name, metadata);
    this.container.registerPlugin(plugin);
  }

  unregisterPlugin(name: string): void {
    this.loadedPlugins.delete(name);
    this.pluginMetadata.delete(name);
  }

  getPlugin(name: string): IAlgorithmPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  getPluginMetadata(name: string): PluginMetadata | undefined {
    return this.pluginMetadata.get(name);
  }

  getAllPlugins(): PluginMetadata[] {
    return Array.from(this.pluginMetadata.values());
  }

  createAlgorithm(name: string, config: Record<string, any>): IFraudAlgorithm {
    const plugin = this.getPlugin(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    const algorithm = plugin.create();
    algorithm.configure(config);
    return algorithm;
  }

  private validatePlugin(plugin: IAlgorithmPlugin): boolean {
    try {
      const metadata = plugin.getMetadata();
      const algorithm = plugin.create();

      // Check metadata
      if (!metadata.name || !metadata.version || !metadata.description) {
        return false;
      }

      // Check algorithm interface
      if (!algorithm.name || !algorithm.version || !algorithm.description) {
        return false;
      }

      if (typeof algorithm.analyze !== 'function') {
        return false;
      }

      if (typeof algorithm.configure !== 'function') {
        return false;
      }

      if (typeof algorithm.validate !== 'function') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Plugin validation failed:', error);
      return false;
    }
  }
}
