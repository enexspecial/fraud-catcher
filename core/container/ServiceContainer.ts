import { IFraudAlgorithm, IAlgorithmPlugin } from '../interfaces/IFraudAlgorithm';
import { FraudEventBus } from '../events/FraudEventBus';

export interface ServiceDefinition<T = any> {
  factory: () => T;
  singleton?: boolean;
  dependencies?: string[];
}

export class ServiceContainer {
  private services = new Map<string, ServiceDefinition>();
  private instances = new Map<string, any>();
  private plugins = new Map<string, IAlgorithmPlugin>();

  register<T>(name: string, definition: ServiceDefinition<T>): void {
    this.services.set(name, definition);
  }

  registerPlugin(plugin: IAlgorithmPlugin): void {
    const metadata = plugin.getMetadata();
    this.plugins.set(metadata.name, plugin);
  }

  get<T>(name: string): T {
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    const definition = this.services.get(name);
    if (!definition) {
      throw new Error(`Service '${name}' not found`);
    }

    const instance = definition.factory();
    
    if (definition.singleton !== false) {
      this.instances.set(name, instance);
    }

    return instance;
  }

  getAlgorithm(name: string): IFraudAlgorithm {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Algorithm plugin '${name}' not found`);
    }
    return plugin.create();
  }

  getAvailableAlgorithms(): string[] {
    return Array.from(this.plugins.keys());
  }

  createAlgorithm(name: string, config: Record<string, any>): IFraudAlgorithm {
    const algorithm = this.getAlgorithm(name);
    algorithm.configure(config);
    return algorithm;
  }

  clear(): void {
    this.services.clear();
    this.instances.clear();
    this.plugins.clear();
  }
}

// Global container instance
export const container = new ServiceContainer();

// Register core services
container.register('eventBus', {
  factory: () => FraudEventBus.getInstance(),
  singleton: true
});
