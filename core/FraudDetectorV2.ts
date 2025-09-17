import { Transaction, FraudResult, FraudDetectorConfig, DetectionRule } from './models/Transaction';
import { IFraudAlgorithm } from './interfaces/IFraudAlgorithm';
import { ServiceContainer, container } from './container/ServiceContainer';
import { FraudEventBus } from './events/FraudEventBus';
import { CacheManager } from './cache/CacheManager';
import { MetricsCollector } from './metrics/MetricsCollector';

export interface FraudDetectorV2Config extends FraudDetectorConfig {
  enableCaching?: boolean;
  enableMetrics?: boolean;
  enableEvents?: boolean;
  cacheConfig?: {
    defaultTTL: number;
    maxSize: number;
    cleanupInterval: number;
  };
  parallelProcessing?: boolean;
  maxConcurrency?: number;
}

export class FraudDetectorV2 {
  private config: FraudDetectorV2Config;
  private container: ServiceContainer;
  private eventBus: FraudEventBus;
  private cacheManager?: CacheManager;
  private metricsCollector?: MetricsCollector;
  private algorithms: Map<string, IFraudAlgorithm> = new Map();
  private rules: Map<string, DetectionRule> = new Map();

  constructor(config: FraudDetectorV2Config) {
    this.config = config;
    this.container = container;
    this.eventBus = this.container.get<FraudEventBus>('eventBus');
    
    this.initializeServices();
    this.initializeAlgorithms();
    this.initializeRules();
  }

  private initializeServices(): void {
    // Initialize caching if enabled
    if (this.config.enableCaching) {
      this.cacheManager = new CacheManager(
        this.config.cacheConfig || {
          defaultTTL: 300000, // 5 minutes
          maxSize: 10000,
          cleanupInterval: 60000 // 1 minute
        }
      );
    }

    // Initialize metrics if enabled
    if (this.config.enableMetrics) {
      this.metricsCollector = new MetricsCollector();
    }
  }

  private initializeAlgorithms(): void {
    // Load algorithms from plugins
    const availableAlgorithms = this.container.getAvailableAlgorithms();
    
    for (const algorithmName of availableAlgorithms) {
      try {
        const algorithm = this.container.getAlgorithm(algorithmName);
        this.algorithms.set(algorithmName, algorithm);
      } catch (error) {
        console.warn(`Failed to load algorithm ${algorithmName}:`, error);
      }
    }
  }

  private initializeRules(): void {
    // Initialize rules from config
    if (this.config.rules) {
      for (const ruleName of this.config.rules) {
        const rule: DetectionRule = {
          name: ruleName,
          weight: this.config.thresholds?.[ruleName] || 0.5,
          threshold: this.config.thresholds?.[ruleName] || 0.5,
          enabled: true
        };
        this.rules.set(ruleName, rule);
      }
    }

    // Add custom rules
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        this.rules.set(rule.name, rule);
      }
    }
  }

  async analyzeTransaction(transaction: Transaction): Promise<FraudResult> {
    const startTime = Date.now();
    
    try {
      // Validate transaction
      if (!this.validateTransaction(transaction)) {
        throw new Error('Invalid transaction data');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(transaction);
      if (this.cacheManager?.has(cacheKey)) {
        const cachedResult = this.cacheManager.get<FraudResult>(cacheKey);
        if (cachedResult) {
          this.recordMetrics('cache_hit', 1);
          return cachedResult;
        }
      }

      // Process algorithms
      const algorithmResults = await this.processAlgorithms(transaction);
      
      // Calculate final score
      const finalScore = this.calculateFinalScore(algorithmResults);
      
      // Generate result
      const result: FraudResult = {
        isFraud: finalScore >= (this.config.globalThreshold || 0.7),
        riskScore: finalScore,
        confidence: this.calculateConfidence(algorithmResults),
        triggeredRules: this.getTriggeredRules(algorithmResults),
        recommendations: this.generateRecommendations(algorithmResults),
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };

      // Cache result
      if (this.cacheManager) {
        this.cacheManager.set(cacheKey, result);
      }

      // Emit events
      if (this.config.enableEvents) {
        this.eventBus.emitTransactionAnalyzed({
          type: 'transaction.analyzed',
          timestamp: new Date(),
          data: {
            transaction,
            result,
            processingTime: result.processingTime
          }
        });
      }

      // Record metrics
      this.recordMetrics('transaction_processed', 1);
      this.recordMetrics('processing_time', result.processingTime);
      this.recordMetrics('risk_score', finalScore);

      return result;

    } catch (error) {
      this.recordMetrics('error', 1);
      throw error;
    }
  }

  private async processAlgorithms(transaction: Transaction): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    if (this.config.parallelProcessing) {
      // Process algorithms in parallel
      const promises = Array.from(this.rules.entries())
        .filter(([_, rule]) => rule.enabled)
        .map(async ([ruleName, rule]) => {
          const algorithm = this.algorithms.get(ruleName);
          if (!algorithm) {
            console.warn(`Algorithm ${ruleName} not found`);
            return [ruleName, 0];
          }

          const startTime = Date.now();
          try {
            const score = await algorithm.analyze(transaction, rule);
            const processingTime = Date.now() - startTime;
            
            // Emit algorithm executed event
            if (this.config.enableEvents) {
              this.eventBus.emitAlgorithmExecuted({
                type: 'algorithm.executed',
                timestamp: new Date(),
                data: {
                  algorithmName: ruleName,
                  transaction,
                  score,
                  processingTime
                }
              });
            }

            // Record metrics
            this.recordMetrics('algorithm_executed', 1, { algorithm: ruleName });
            this.recordMetrics('algorithm_processing_time', processingTime, { algorithm: ruleName });

            return [ruleName, score];
          } catch (error) {
            console.error(`Error in algorithm ${ruleName}:`, error);
            this.recordMetrics('algorithm_error', 1, { algorithm: ruleName });
            return [ruleName, 0];
          }
        });

      const algorithmResults = await Promise.all(promises);
      for (const [ruleName, score] of algorithmResults) {
        results.set(ruleName, score as number);
      }
    } else {
      // Process algorithms sequentially
      for (const [ruleName, rule] of this.rules.entries()) {
        if (!rule.enabled) continue;

        const algorithm = this.algorithms.get(ruleName);
        if (!algorithm) {
          console.warn(`Algorithm ${ruleName} not found`);
          continue;
        }

        const startTime = Date.now();
        try {
          const score = await algorithm.analyze(transaction, rule);
          const processingTime = Date.now() - startTime;
          
          results.set(ruleName, score);

          // Emit events and record metrics (same as parallel processing)
          if (this.config.enableEvents) {
            this.eventBus.emitAlgorithmExecuted({
              type: 'algorithm.executed',
              timestamp: new Date(),
              data: {
                algorithmName: ruleName,
                transaction,
                score,
                processingTime
              }
            });
          }

          this.recordMetrics('algorithm_executed', 1, { algorithm: ruleName });
          this.recordMetrics('algorithm_processing_time', processingTime, { algorithm: ruleName });

        } catch (error) {
          console.error(`Error in algorithm ${ruleName}:`, error);
          this.recordMetrics('algorithm_error', 1, { algorithm: ruleName });
          results.set(ruleName, 0);
        }
      }
    }

    return results;
  }

  private calculateFinalScore(algorithmResults: Map<string, number>): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const [ruleName, score] of algorithmResults.entries()) {
      const rule = this.rules.get(ruleName);
      if (!rule) continue;

      const weight = rule.weight;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateConfidence(algorithmResults: Map<string, number>): number {
    const scores = Array.from(algorithmResults.values());
    if (scores.length === 0) return 0;

    // Calculate confidence based on score consistency
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher confidence
    return Math.max(0, 1 - (standardDeviation / 0.5));
  }

  private getTriggeredRules(algorithmResults: Map<string, number>): string[] {
    const triggered: string[] = [];
    
    for (const [ruleName, score] of algorithmResults.entries()) {
      const rule = this.rules.get(ruleName);
      if (rule && score >= rule.threshold) {
        triggered.push(ruleName);
        
        // Emit rule triggered event
        if (this.config.enableEvents) {
          this.eventBus.emitRuleTriggered({
            type: 'rule.triggered',
            timestamp: new Date(),
            data: {
              ruleName,
              transaction: {} as Transaction, // Would need actual transaction
              score,
              threshold: rule.threshold
            }
          });
        }
      }
    }
    
    return triggered;
  }

  private generateRecommendations(algorithmResults: Map<string, number>): string[] {
    const recommendations: string[] = [];
    
    for (const [ruleName, score] of algorithmResults.entries()) {
      const rule = this.rules.get(ruleName);
      if (rule && score >= rule.threshold) {
        recommendations.push(`High risk detected by ${ruleName} algorithm`);
      }
    }
    
    return recommendations;
  }

  private validateTransaction(transaction: Transaction): boolean {
    return !!(transaction.userId && transaction.amount && transaction.timestamp);
  }

  private generateCacheKey(transaction: Transaction): string {
    // Simple cache key generation - could be improved
    return `fraud_${transaction.userId}_${transaction.amount}_${transaction.timestamp.getTime()}`;
  }

  private recordMetrics(metricName: string, value: number, labels?: Record<string, string>): void {
    if (this.metricsCollector) {
      this.metricsCollector.incrementCounter(metricName, value, labels);
    }
  }

  // Public methods for configuration updates
  updateRule(ruleName: string, updates: Partial<DetectionRule>): void {
    const existingRule = this.rules.get(ruleName);
    if (existingRule) {
      this.rules.set(ruleName, { ...existingRule, ...updates });
    }
  }

  addCustomRule(rule: DetectionRule): void {
    this.rules.set(rule.name, rule);
  }

  getMetrics(): any {
    return this.metricsCollector?.getAllMetrics();
  }

  clearCache(): void {
    this.cacheManager?.clear();
  }

  destroy(): void {
    // Cleanup algorithms
    for (const algorithm of this.algorithms.values()) {
      if (algorithm.cleanup) {
        algorithm.cleanup();
      }
    }
    
    // Cleanup cache
    this.cacheManager?.destroy();
    
    // Clear collections
    this.algorithms.clear();
    this.rules.clear();
  }
}
