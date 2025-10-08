import { AmountAlgorithm, AmountConfig } from '../core/algorithms/AmountAlgorithm';
import { Transaction, DetectionRule } from '../core/models/Transaction';

describe('AmountAlgorithm - Comprehensive Tests', () => {
  let algorithm: AmountAlgorithm;
  let config: AmountConfig;
  let rule: DetectionRule;

  beforeEach(() => {
    config = {
      suspiciousThreshold: 1000,
      highRiskThreshold: 5000,
      currencyMultipliers: {
        'USD': 1,
        'EUR': 1.1,
        'GBP': 1.3,
        'JPY': 0.007
      }
    };
    algorithm = new AmountAlgorithm(config);
    rule = {
      name: 'amount',
      weight: 0.15,
      threshold: 0.8,
      enabled: true,
      config: {}
    };
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with valid configuration', () => {
      expect(algorithm).toBeDefined();
    });

    it('should handle configuration without currency multipliers', () => {
      const simpleConfig: AmountConfig = {
        suspiciousThreshold: 1000,
        highRiskThreshold: 5000
      };
      
      const simpleAlgorithm = new AmountAlgorithm(simpleConfig);
      expect(simpleAlgorithm).toBeDefined();
    });

    it('should handle different threshold values', () => {
      const customConfig: AmountConfig = {
        suspiciousThreshold: 500,
        highRiskThreshold: 2000,
        currencyMultipliers: { 'USD': 1 }
      };
      
      const customAlgorithm = new AmountAlgorithm(customConfig);
      expect(customAlgorithm).toBeDefined();
    });
  });

  describe('Transaction Analysis', () => {
    it('should analyze low amount transaction', async () => {
      const transaction: Transaction = {
        id: 'tx_low',
        userId: 'user_low',
        amount: 100,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeLessThan(0.5); // Should be low risk
    });

    it('should analyze suspicious amount transaction', async () => {
      const transaction: Transaction = {
        id: 'tx_suspicious',
        userId: 'user_suspicious',
        amount: 1500, // Between suspicious and high risk thresholds
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(1.0);
    });

    it('should analyze high risk amount transaction', async () => {
      const transaction: Transaction = {
        id: 'tx_high_risk',
        userId: 'user_high_risk',
        amount: 6000, // Above high risk threshold
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      
      expect(score).toBe(1.0); // Should be maximum risk
    });

    it('should handle different currencies with multipliers', async () => {
      const eurTransaction: Transaction = {
        id: 'tx_eur',
        userId: 'user_eur',
        amount: 1000, // 1000 EUR = 1100 USD equivalent
        currency: 'EUR',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(eurTransaction, rule);
      
      expect(score).toBeGreaterThan(0.5); // Should be suspicious due to EUR multiplier
    });

    it('should handle JPY with low multiplier', async () => {
      const jpyTransaction: Transaction = {
        id: 'tx_jpy',
        userId: 'user_jpy',
        amount: 100000, // 100,000 JPY = 700 USD equivalent
        currency: 'JPY',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(jpyTransaction, rule);
      
      expect(score).toBeLessThan(0.5); // Should be low risk due to JPY multiplier
    });

    it('should handle unknown currency', async () => {
      const unknownCurrencyTransaction: Transaction = {
        id: 'tx_unknown',
        userId: 'user_unknown',
        amount: 1000,
        currency: 'UNKNOWN',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(unknownCurrencyTransaction, rule);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle transactions without currency', async () => {
      const noCurrencyTransaction: Transaction = {
        id: 'tx_no_currency',
        userId: 'user_no_currency',
        amount: 1000,
        timestamp: new Date()
      } as any;

      const score = await algorithm.analyze(noCurrencyTransaction, rule);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Country Risk Integration', () => {
    it('should apply high risk country adjustments', async () => {
      const highRiskTransaction: Transaction = {
        id: 'tx_high_risk_country',
        userId: 'user_high_risk_country',
        amount: 800, // Below suspicious threshold
        currency: 'USD',
        timestamp: new Date(),
        location: {
          lat: 40.7128,
          lng: -74.0060,
          country: 'XX' // Suspicious country
        }
      };

      const score = await algorithm.analyze(highRiskTransaction, rule);
      
      expect(score).toBeGreaterThan(0.7); // Should be high risk due to country
    });

    it('should apply very high risk country adjustments', async () => {
      const veryHighRiskTransaction: Transaction = {
        id: 'tx_very_high_risk_country',
        userId: 'user_very_high_risk_country',
        amount: 600, // Below suspicious threshold
        currency: 'USD',
        timestamp: new Date(),
        location: {
          lat: 40.7128,
          lng: -74.0060,
          country: 'ZZ' // Very high risk country
        }
      };

      const score = await algorithm.analyze(veryHighRiskTransaction, rule);
      
      expect(score).toBeGreaterThan(0.7); // Should be high risk due to country
    });

    it('should handle transactions without location', async () => {
      const noLocationTransaction: Transaction = {
        id: 'tx_no_location',
        userId: 'user_no_location',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(noLocationTransaction, rule);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle transactions with location but no country', async () => {
      const noCountryTransaction: Transaction = {
        id: 'tx_no_country',
        userId: 'user_no_country',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date(),
        location: {
          lat: 40.7128,
          lng: -74.0060
        }
      };

      const score = await algorithm.analyze(noCountryTransaction, rule);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Utility Methods', () => {
    it('should check if amount is suspicious', () => {
      expect(algorithm.isSuspiciousAmount(1000, 'USD')).toBe(true);
      expect(algorithm.isSuspiciousAmount(999, 'USD')).toBe(false);
      expect(algorithm.isSuspiciousAmount(1500, 'USD')).toBe(true);
    });

    it('should check if amount is high risk', () => {
      expect(algorithm.isHighRiskAmount(5000, 'USD')).toBe(true);
      expect(algorithm.isHighRiskAmount(4999, 'USD')).toBe(false);
      expect(algorithm.isHighRiskAmount(6000, 'USD')).toBe(true);
    });

    it('should get risk level for amounts', () => {
      expect(algorithm.getRiskLevel(100, 'USD')).toBe('low');
      expect(algorithm.getRiskLevel(1500, 'USD')).toBe('medium');
      expect(algorithm.getRiskLevel(6000, 'USD')).toBe('high');
    });

    it('should handle different currencies in utility methods', () => {
      expect(algorithm.isSuspiciousAmount(1000, 'EUR')).toBe(true); // 1100 USD equivalent
      expect(algorithm.isSuspiciousAmount(1000, 'JPY')).toBe(false); // 7 USD equivalent
      expect(algorithm.getRiskLevel(1000, 'GBP')).toBe('medium'); // 1300 USD equivalent
    });

    it('should handle unknown currencies in utility methods', () => {
      expect(algorithm.isSuspiciousAmount(1000, 'UNKNOWN')).toBe(true); // Uses default multiplier of 1
      expect(algorithm.getRiskLevel(1000, 'UNKNOWN')).toBe('medium');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount', async () => {
      const transaction: Transaction = {
        id: 'tx_zero',
        userId: 'user_zero',
        amount: 0,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBe(0); // Should be no risk
    });

    it('should handle negative amounts', async () => {
      const transaction: Transaction = {
        id: 'tx_negative',
        userId: 'user_negative',
        amount: -100,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(-0.1); // Allow negative scores for negative amounts
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle very large amounts', async () => {
      const transaction: Transaction = {
        id: 'tx_very_large',
        userId: 'user_very_large',
        amount: 1000000,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBe(1.0); // Should be maximum risk
    });

    it('should handle decimal amounts', async () => {
      const transaction: Transaction = {
        id: 'tx_decimal',
        userId: 'user_decimal',
        amount: 1234.56,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle very small amounts', async () => {
      const transaction: Transaction = {
        id: 'tx_small',
        userId: 'user_small',
        amount: 0.01,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeLessThan(0.1); // Should be very low risk
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate linear interpolation between thresholds', async () => {
      const midAmount = (config.suspiciousThreshold + config.highRiskThreshold) / 2;
      
      const transaction: Transaction = {
        id: 'tx_mid',
        userId: 'user_mid',
        amount: midAmount,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      
      // Should be approximately 0.75 (midpoint between 0.5 and 1.0)
      expect(score).toBeGreaterThan(0.7);
      expect(score).toBeLessThan(0.8);
    });

    it('should cap risk score at 1.0', async () => {
      const veryHighAmount = config.highRiskThreshold * 2;
      
      const transaction: Transaction = {
        id: 'tx_very_high',
        userId: 'user_very_high',
        amount: veryHighAmount,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBe(1.0);
    });

    it('should handle amounts exactly at thresholds', async () => {
      // Test suspicious threshold
      const suspiciousTransaction: Transaction = {
        id: 'tx_suspicious_exact',
        userId: 'user_suspicious_exact',
        amount: config.suspiciousThreshold,
        currency: 'USD',
        timestamp: new Date()
      };

      const suspiciousScore = await algorithm.analyze(suspiciousTransaction, rule);
      expect(suspiciousScore).toBe(0.5);

      // Test high risk threshold
      const highRiskTransaction: Transaction = {
        id: 'tx_high_risk_exact',
        userId: 'user_high_risk_exact',
        amount: config.highRiskThreshold,
        currency: 'USD',
        timestamp: new Date()
      };

      const highRiskScore = await algorithm.analyze(highRiskTransaction, rule);
      expect(highRiskScore).toBe(1.0);
    });
  });

  describe('Currency Normalization', () => {
    it('should normalize amounts correctly with different currencies', async () => {
      const usdTransaction: Transaction = {
        id: 'tx_usd',
        userId: 'user_usd',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date()
      };

      const eurTransaction: Transaction = {
        id: 'tx_eur',
        userId: 'user_eur',
        amount: 909.09, // Approximately 1000 USD equivalent
        currency: 'EUR',
        timestamp: new Date()
      };

      const usdScore = await algorithm.analyze(usdTransaction, rule);
      const eurScore = await algorithm.analyze(eurTransaction, rule);

      // Scores should be similar due to normalization
      expect(Math.abs(usdScore - eurScore)).toBeLessThan(0.1);
    });

    it('should handle currency multipliers correctly', () => {
      // Test direct currency multiplier usage
      const usdAmount = 1000;
      const eurAmount = 1000;
      
      const usdSuspicious = algorithm.isSuspiciousAmount(usdAmount, 'USD');
      const eurSuspicious = algorithm.isSuspiciousAmount(eurAmount, 'EUR');
      
      expect(usdSuspicious).toBe(true); // 1000 USD is suspicious
      expect(eurSuspicious).toBe(true); // 1000 EUR (1100 USD equivalent) is suspicious
    });
  });

  describe('Performance', () => {
    it('should analyze transactions quickly', async () => {
      const transaction: Transaction = {
        id: 'tx_perf',
        userId: 'user_perf',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date()
      };

      const startTime = Date.now();
      const score = await algorithm.analyze(transaction, rule);
      const endTime = Date.now();

      expect(score).toBeGreaterThanOrEqual(0);
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });

    it('should handle multiple concurrent analyses', async () => {
      const transactions: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
        id: `tx_concurrent_${i}`,
        userId: `user_${i}`,
        amount: 1000 + i * 100,
        currency: 'USD',
        timestamp: new Date()
      }));

      const startTime = Date.now();
      const promises = transactions.map(tx => algorithm.analyze(tx, rule));
      const scores = await Promise.all(promises);
      const endTime = Date.now();

      expect(scores).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100); // Should handle 10 concurrent analyses quickly
    });
  });
});
