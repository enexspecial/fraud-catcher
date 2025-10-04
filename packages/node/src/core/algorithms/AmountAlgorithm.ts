import { Transaction, DetectionRule } from '../models/Transaction';
import { CountryService } from '../services/CountryService';

export interface AmountConfig {
  suspiciousThreshold: number;
  highRiskThreshold: number;
  currencyMultipliers?: Record<string, number>;
}

export class AmountAlgorithm {
  private config: AmountConfig;
  private countryService: CountryService;

  constructor(config: AmountConfig) {
    this.config = config;
    this.countryService = new CountryService();
  }

  async analyze(transaction: Transaction, _rule: DetectionRule): Promise<number> {
    const amount = transaction.amount;
    const currency = transaction.currency || 'USD';
    const countryCode = transaction.location?.country;
    
    // Get currency multiplier from CountryService or config
    let multiplier = 1;
    if (this.config.currencyMultipliers?.[currency]) {
      multiplier = this.config.currencyMultipliers[currency];
    } else {
      multiplier = this.countryService.getCurrencyMultiplier(currency);
    }
    
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

    // Apply country-specific risk adjustments
    if (countryCode) {
      const countryRisk = this.countryService.getCountryRiskScore(countryCode);
      
      // For high-risk countries, lower the threshold for suspicious amounts
      if (this.countryService.isHighRiskCountry(countryCode)) {
        const adjustedThreshold = this.config.suspiciousThreshold * 0.7; // 30% lower threshold
        if (normalizedAmount >= adjustedThreshold) {
          riskScore += 0.2; // Additional risk for high-risk countries
        }
      }
      
      // For very high-risk countries, even lower amounts are suspicious
      if (this.countryService.isVeryHighRiskCountry(countryCode)) {
        const adjustedThreshold = this.config.suspiciousThreshold * 0.5; // 50% lower threshold
        if (normalizedAmount >= adjustedThreshold) {
          riskScore += 0.3; // Additional risk for very high-risk countries
        }
      }
      
      // For suspicious countries (XX, ZZ), any amount is risky
      if (this.countryService.isSuspiciousCountry(countryCode)) {
        riskScore = Math.max(riskScore, 0.8); // Minimum 80% risk
      }
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
