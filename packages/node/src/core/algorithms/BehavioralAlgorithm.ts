import { Transaction, DetectionRule } from '../models/Transaction';

export interface BehavioralConfig {
  enableSpendingPatterns: boolean;
  enableTransactionTiming: boolean;
  enableLocationPatterns: boolean;
  enableDevicePatterns: boolean;
  patternHistoryDays: number;
  anomalyThreshold: number;
  enableMachineLearning: boolean;
  learningRate: number;
}

export class BehavioralAlgorithm {
  private config: BehavioralConfig;
  private _userProfiles = new Map<string, any>();

  constructor(config: BehavioralConfig) {
    this.config = config;
  }

  async analyze(transaction: Transaction, _rule: DetectionRule): Promise<number> {
    // Simplified behavioral analysis
    let riskScore = 0.0;

    // Basic spending pattern analysis
    if (this.config.enableSpendingPatterns) {
      const spendingRisk = this.analyzeSpendingPatterns(transaction);
      riskScore += spendingRisk * 0.3;
    }

    // Basic timing analysis
    if (this.config.enableTransactionTiming) {
      const timingRisk = this.analyzeTimingPatterns(transaction);
      riskScore += timingRisk * 0.2;
    }

    // Basic location analysis
    if (this.config.enableLocationPatterns && transaction.location) {
      const locationRisk = this.analyzeLocationPatterns(transaction);
      riskScore += locationRisk * 0.3;
    }

    // Basic device analysis
    if (this.config.enableDevicePatterns) {
      const deviceRisk = this.analyzeDevicePatterns(transaction);
      riskScore += deviceRisk * 0.2;
    }

    return Math.min(riskScore, 1.0);
  }

  private analyzeSpendingPatterns(transaction: Transaction): number {
    // Simple amount-based analysis
    if (transaction.amount > 10000) return 0.8;
    if (transaction.amount > 5000) return 0.6;
    if (transaction.amount > 1000) return 0.3;
    return 0.1;
  }

  private analyzeTimingPatterns(transaction: Transaction): number {
    const hour = new Date(transaction.timestamp).getHours();
    // Suspicious hours (late night/early morning)
    if (hour >= 0 && hour <= 5) return 0.7;
    if (hour >= 22) return 0.5;
    return 0.1;
  }

  private analyzeLocationPatterns(transaction: Transaction): number {
    // Simple location analysis
    if (!transaction.location) return 0.0;
    
    // Check for unusual countries (simplified)
    const suspiciousCountries = ['XX', 'ZZ'];
    if (suspiciousCountries.includes(transaction.location.country || '')) {
      return 0.8;
    }
    
    return 0.1;
  }

  private analyzeDevicePatterns(transaction: Transaction): number {
    // Simple device analysis
    if (!transaction.deviceId) return 0.3; // New device risk
    return 0.1;
  }
}
