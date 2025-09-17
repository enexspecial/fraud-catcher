import { Transaction, FraudResult, FraudDetectorConfig, DetectionRule } from './models/Transaction';
import { VelocityAlgorithm, VelocityConfig } from './algorithms/VelocityAlgorithm';
import { AmountAlgorithm, AmountConfig } from './algorithms/AmountAlgorithm';
import { LocationAlgorithm, LocationConfig } from './algorithms/LocationAlgorithm';
import { DeviceAlgorithm, DeviceConfig } from './algorithms/DeviceAlgorithm';
import { TimeAlgorithm, TimeConfig } from './algorithms/TimeAlgorithm';
import { MerchantAlgorithm, MerchantConfig } from './algorithms/MerchantAlgorithm';
import { BehavioralAlgorithm, BehavioralConfig } from './algorithms/BehavioralAlgorithm';
import { NetworkAlgorithm, NetworkConfig } from './algorithms/NetworkAlgorithm';
import { MLAlgorithm, MLConfig } from './algorithms/MLAlgorithm';

export class FraudDetector {
  private config: FraudDetectorConfig;
  private algorithms: Map<string, any> = new Map();
  private rules: Map<string, DetectionRule> = new Map();

  constructor(config: FraudDetectorConfig) {
    this.config = config;
    this.initializeAlgorithms();
    this.initializeRules();
  }

  private initializeAlgorithms(): void {
    // Initialize velocity algorithm
    const velocityConfig: VelocityConfig = {
      timeWindow: 60, // 1 hour
      maxTransactions: 10,
      maxAmount: 5000
    };
    this.algorithms.set('velocity', new VelocityAlgorithm(velocityConfig));

    // Initialize amount algorithm
    const amountConfig: AmountConfig = {
      suspiciousThreshold: 1000,
      highRiskThreshold: 5000,
      currencyMultipliers: {
        'USD': 1,
        'EUR': 1.1,
        'GBP': 1.3,
        'JPY': 0.007
      }
    };
    this.algorithms.set('amount', new AmountAlgorithm(amountConfig));

    // Initialize location algorithm
    const locationConfig: LocationConfig = {
      maxDistanceKm: 1000,
      suspiciousDistanceKm: 100,
      timeWindowMinutes: 60,
      enableGeoFencing: false,
      trustedLocations: []
    };
    this.algorithms.set('location', new LocationAlgorithm(locationConfig));

    // Initialize device algorithm
    const deviceConfig: DeviceConfig = {
      enableFingerprinting: true,
      suspiciousDeviceThreshold: 5,
      newDeviceRiskMultiplier: 1.5,
      deviceVelocityWindow: 60,
      maxDevicesPerUser: 5
    };
    this.algorithms.set('device', new DeviceAlgorithm(deviceConfig));

    // Initialize time algorithm
    const timeConfig: TimeConfig = {
      suspiciousHours: [0, 1, 2, 3, 4, 5, 22, 23], // Late night/early morning
      weekendRiskMultiplier: 1.2,
      holidayRiskMultiplier: 1.5,
      timezoneThreshold: 8, // 8 hours difference
      enableHolidayDetection: true,
      customHolidays: []
    };
    this.algorithms.set('time', new TimeAlgorithm(timeConfig));

    // Initialize merchant algorithm
    const merchantConfig: MerchantConfig = {
      highRiskCategories: ['gambling', 'adult', 'cash_advance', 'cryptocurrency'],
      suspiciousMerchants: [],
      trustedMerchants: [],
      categoryRiskScores: {
        'electronics': 0.3,
        'grocery': 0.1,
        'gas': 0.2,
        'restaurant': 0.2,
        'travel': 0.6,
        'gambling': 0.8,
        'adult': 0.9,
        'pharmacy': 0.4,
        'jewelry': 0.7,
        'cash_advance': 0.9
      },
      merchantVelocityWindow: 60,
      maxTransactionsPerMerchant: 20,
      enableCategoryAnalysis: true,
      enableMerchantReputation: true
    };
    this.algorithms.set('merchant', new MerchantAlgorithm(merchantConfig));

    // Initialize behavioral algorithm
    const behavioralConfig: BehavioralConfig = {
      enableSpendingPatterns: true,
      enableTransactionTiming: true,
      enableLocationPatterns: true,
      enableDevicePatterns: true,
      patternHistoryDays: 30,
      anomalyThreshold: 0.7,
      enableMachineLearning: false,
      learningRate: 0.01
    };
    this.algorithms.set('behavioral', new BehavioralAlgorithm(behavioralConfig));

    // Initialize network algorithm
    const networkConfig: NetworkConfig = {
      enableIPAnalysis: true,
      enableProxyDetection: true,
      enableVPNDetection: true,
      enableTorDetection: true,
      suspiciousCountries: ['XX', 'ZZ'], // Placeholder country codes
      trustedCountries: ['US', 'CA', 'GB', 'DE', 'FR'],
      maxConnectionsPerIP: 10,
      ipVelocityWindow: 60,
      enableGeoIPAnalysis: true,
      enableASNAnalysis: true
    };
    this.algorithms.set('network', new NetworkAlgorithm(networkConfig));

    // Initialize ML algorithm
    const mlConfig: MLConfig = {
      enableTraining: true,
      modelType: 'ensemble',
      featureExtractors: ['amount', 'velocity', 'location', 'merchant', 'device', 'time'],
      trainingDataSize: 10000,
      retrainInterval: 24, // 24 hours
      anomalyThreshold: 0.5,
      enableFeatureImportance: true,
      enableModelPersistence: true
    };
    this.algorithms.set('ml', new MLAlgorithm(mlConfig));
  }

  private initializeRules(): void {
    // Initialize default rules with updated weights for all algorithms
    this.rules.set('velocity', {
      name: 'velocity',
      weight: 0.15,
      threshold: this.config.thresholds.velocity || 0.8,
      enabled: this.config.rules.includes('velocity'),
      config: {}
    });

    this.rules.set('amount', {
      name: 'amount',
      weight: 0.15,
      threshold: this.config.thresholds.amount || 0.9,
      enabled: this.config.rules.includes('amount'),
      config: {}
    });

    this.rules.set('location', {
      name: 'location',
      weight: 0.15,
      threshold: this.config.thresholds.location || 0.7,
      enabled: this.config.rules.includes('location'),
      config: {}
    });

    this.rules.set('device', {
      name: 'device',
      weight: 0.15,
      threshold: this.config.thresholds.device || 0.8,
      enabled: this.config.rules.includes('device'),
      config: {}
    });

    this.rules.set('time', {
      name: 'time',
      weight: 0.10,
      threshold: this.config.thresholds.time || 0.6,
      enabled: this.config.rules.includes('time'),
      config: {}
    });

    this.rules.set('merchant', {
      name: 'merchant',
      weight: 0.15,
      threshold: this.config.thresholds.merchant || 0.7,
      enabled: this.config.rules.includes('merchant'),
      config: {}
    });

    this.rules.set('behavioral', {
      name: 'behavioral',
      weight: 0.10,
      threshold: this.config.thresholds.behavioral || 0.6,
      enabled: this.config.rules.includes('behavioral'),
      config: {}
    });

    this.rules.set('network', {
      name: 'network',
      weight: 0.10,
      threshold: this.config.thresholds.network || 0.8,
      enabled: this.config.rules.includes('network'),
      config: {}
    });

    this.rules.set('ml', {
      name: 'ml',
      weight: 0.20,
      threshold: this.config.thresholds.ml || 0.5,
      enabled: this.config.rules.includes('ml'),
      config: {}
    });

    // Add custom rules if provided
    if (this.config.customRules) {
      this.config.customRules.forEach(rule => {
        this.rules.set(rule.name, rule);
      });
    }
  }

  async analyze(transaction: Transaction): Promise<FraudResult> {
    const startTime = Date.now();
    const triggeredRules: string[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Process each enabled rule
    for (const [ruleName, rule] of this.rules) {
      if (!rule.enabled) continue;

      const algorithm = this.algorithms.get(ruleName);
      if (!algorithm) {
        console.warn(`Algorithm not found for rule: ${ruleName}`);
        continue;
      }

      try {
        const score = await algorithm.analyze(transaction, rule);
        
        if (score >= rule.threshold) {
          triggeredRules.push(ruleName);
        }

        totalWeightedScore += score * rule.weight;
        totalWeight += rule.weight;
      } catch (error) {
        console.error(`Error processing rule ${ruleName}:`, error);
      }
    }

    // Calculate final risk score
    const riskScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const isFraudulent = riskScore >= this.config.globalThreshold;
    
    // Calculate confidence based on number of triggered rules
    const confidence = Math.min(triggeredRules.length / this.config.rules.length, 1.0);

    const processingTime = Date.now() - startTime;

    const result: FraudResult = {
      transactionId: transaction.id,
      riskScore: Math.min(riskScore, 1.0),
      isFraudulent,
      confidence,
      triggeredRules,
      details: {
        algorithm: 'multi-algorithm',
        processingTime,
        timestamp: new Date()
      }
    };

    // Add recommendations
    result.recommendations = this.generateRecommendations(result, transaction);

    if (this.config.enableLogging) {
      console.log(`Fraud analysis completed for transaction ${transaction.id}:`, {
        riskScore: result.riskScore,
        isFraudulent: result.isFraudulent,
        triggeredRules: result.triggeredRules,
        processingTime: result.details.processingTime
      });
    }

    return result;
  }

  private generateRecommendations(result: FraudResult, transaction: Transaction): string[] {
    const recommendations: string[] = [];

    if (result.triggeredRules.includes('velocity')) {
      recommendations.push('Consider implementing velocity-based transaction limits');
    }

    if (result.triggeredRules.includes('amount')) {
      recommendations.push('Review transaction amount thresholds and user spending patterns');
    }

    if (result.triggeredRules.includes('location')) {
      recommendations.push('Verify transaction location and check for unusual travel patterns');
    }

    if (result.triggeredRules.includes('device')) {
      recommendations.push('Verify device information and check for device sharing patterns');
    }

    if (result.triggeredRules.includes('time')) {
      recommendations.push('Review transaction timing and check for unusual time patterns');
    }

    if (result.triggeredRules.includes('merchant')) {
      recommendations.push('Verify merchant information and check merchant reputation');
    }

    if (result.triggeredRules.includes('behavioral')) {
      recommendations.push('Review user behavior patterns and check for anomalies');
    }

    if (result.triggeredRules.includes('network')) {
      recommendations.push('Check IP address reputation and network security');
    }

    if (result.triggeredRules.includes('ml')) {
      recommendations.push('Machine learning model detected anomalies - consider advanced analysis');
    }

    if (result.riskScore > 0.8) {
      recommendations.push('High risk transaction - consider manual review or additional verification');
    }

    if (result.confidence < 0.5) {
      recommendations.push('Low confidence score - consider gathering additional transaction data');
    }

    // Add specific recommendations based on transaction data
    if (transaction.amount > 10000) {
      recommendations.push('Large transaction amount - consider additional verification steps');
    }

    if (transaction.location && this.isInternationalTransaction(transaction)) {
      recommendations.push('International transaction - verify user location and travel plans');
    }

    if (transaction.merchantCategory && this.isHighRiskCategory(transaction.merchantCategory)) {
      recommendations.push('High-risk merchant category - additional verification recommended');
    }

    return recommendations;
  }

  private isInternationalTransaction(transaction: Transaction): boolean {
    // Simplified international transaction detection
    // In production, you'd use proper country code validation
    return transaction.location?.country !== 'US';
  }

  private isHighRiskCategory(category: string): boolean {
    const highRiskCategories = ['gambling', 'adult', 'cash_advance', 'cryptocurrency'];
    return highRiskCategories.includes(category.toLowerCase());
  }

  // Utility methods for external access to algorithms
  getVelocityStats(userId: string, timeWindowMinutes: number = 60): { count: number; totalAmount: number } {
    const velocityAlgorithm = this.algorithms.get('velocity') as VelocityAlgorithm;
    return {
      count: velocityAlgorithm.getTransactionCount(userId, timeWindowMinutes),
      totalAmount: velocityAlgorithm.getTotalAmount(userId, timeWindowMinutes)
    };
  }

  isSuspiciousAmount(amount: number, currency: string = 'USD'): boolean {
    const amountAlgorithm = this.algorithms.get('amount') as AmountAlgorithm;
    return amountAlgorithm.isSuspiciousAmount(amount, currency);
  }

  isImpossibleTravel(from: any, to: any, timeDiffMinutes: number): boolean {
    const locationAlgorithm = this.algorithms.get('location') as LocationAlgorithm;
    return locationAlgorithm.isImpossibleTravel(from, to, timeDiffMinutes);
  }

  // Configuration update methods
  updateThreshold(ruleName: string, threshold: number): void {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.threshold = threshold;
    }
  }

  updateGlobalThreshold(threshold: number): void {
    this.config.globalThreshold = threshold;
  }

  enableRule(ruleName: string): void {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(ruleName: string): void {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.enabled = false;
    }
  }

  getConfig(): FraudDetectorConfig {
    return { ...this.config };
  }
}
