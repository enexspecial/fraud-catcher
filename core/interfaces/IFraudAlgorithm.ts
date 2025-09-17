import { Transaction, DetectionRule } from '../models/Transaction';

export interface IFraudAlgorithm {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  
  analyze(transaction: Transaction, rule: DetectionRule): Promise<number>;
  configure(config: Record<string, any>): void;
  validate(transaction: Transaction): boolean;
  cleanup?(): void;
  getMetrics?(): Record<string, any>;
}

export interface IAlgorithmPlugin {
  create(): IFraudAlgorithm;
  getMetadata(): {
    name: string;
    version: string;
    description: string;
    author?: string;
    configSchema: Record<string, any>;
    dependencies?: string[];
  };
}
