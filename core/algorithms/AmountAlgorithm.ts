import { Transaction, DetectionRule } from '../models/Transaction';

export interface AmountConfig {
  suspiciousThreshold: number;
  highRiskThreshold: number;
  currencyMultipliers?: Record<string, number>;
}

export class AmountAlgorithm {
  private config: AmountConfig;

  constructor(config: AmountConfig) {
    this.config = config;
  }

  async analyze(transaction: Transaction, _rule: DetectionRule): Promise<number> {
    const amount = transaction.amount;
    const currency = transaction.currency || 'USD';
    
    // Apply currency multiplier if configured
    const multiplier = this.config.currencyMultipliers?.[currency] || 1;
    const normalizedAmount = amount * multiplier;

    // Calculate risk based on amount thresholds
    let riskScore = 0;

    if (normalizedAmount >= this.config.highRiskThreshold) {
      riskScore = 1.0; // Maximum risk for very high amounts
    } else if (normalizedAmount >= this.config.suspiciousThreshold) {
      // Linear interpolation between suspicious and high risk thresholds
      const range = this.config.highRiskThreshold - this.config.suspiciousThreshold;
      const position = normalizedAmount - this.config.suspiciousThreshold;
      riskScore = 0.5 + (position / range) * 0.5; // 0.5 to 1.0
    } else {
      // Low risk for amounts below suspicious threshold
      riskScore = normalizedAmount / this.config.suspiciousThreshold * 0.5; // 0.0 to 0.5
    }

    return Math.min(riskScore, 1.0);
  }

  isSuspiciousAmount(amount: number, currency: string = 'USD'): boolean {
    const multiplier = this.config.currencyMultipliers?.[currency] || 1;
    const normalizedAmount = amount * multiplier;
    return normalizedAmount >= this.config.suspiciousThreshold;
  }

  isHighRiskAmount(amount: number, currency: string = 'USD'): boolean {
    const multiplier = this.config.currencyMultipliers?.[currency] || 1;
    const normalizedAmount = amount * multiplier;
    return normalizedAmount >= this.config.highRiskThreshold;
  }

  getRiskLevel(amount: number, currency: string = 'USD'): 'low' | 'medium' | 'high' {
    const multiplier = this.config.currencyMultipliers?.[currency] || 1;
    const normalizedAmount = amount * multiplier;

    if (normalizedAmount >= this.config.highRiskThreshold) {
      return 'high';
    } else if (normalizedAmount >= this.config.suspiciousThreshold) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}
