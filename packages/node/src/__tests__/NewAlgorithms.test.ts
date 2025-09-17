import { FraudDetector, Transaction } from '../index';

describe('Fraud Detection Advanced Tests', () => {
  let detector: FraudDetector;

  beforeEach(() => {
    detector = new FraudDetector({
      rules: ['velocity', 'amount', 'location', 'device', 'time'],
      thresholds: {
        velocity: 0.8,
        amount: 0.9,
        location: 0.7,
        device: 0.6,
        time: 0.5
      },
      globalThreshold: 0.7,
      enableLogging: false
    });
  });

  describe('Advanced Transaction Analysis', () => {
    it('should detect high-risk transactions with multiple factors', async () => {
      const highRiskTransaction: Transaction = {
        id: 'tx_high_risk',
        userId: 'user_001',
        amount: 15000, // High amount
        currency: 'USD',
        timestamp: new Date(2024, 0, 1, 2, 0, 0), // 2 AM (suspicious hour)
        location: {
          lat: 40.7128,
          lng: -74.0060,
          country: 'XX' // Suspicious country
        },
        // No device ID (suspicious)
        ipAddress: '192.168.1.1'
      };

      const result = await detector.analyze(highRiskTransaction);
      
      expect(result.riskScore).toBeGreaterThan(0.7);
      expect(result.isFraudulent).toBe(true);
      expect(result.triggeredRules.length).toBeGreaterThan(2);
      expect(result.triggeredRules).toContain('amount');
      expect(result.triggeredRules).toContain('time');
      expect(result.triggeredRules).toContain('location');
      expect(result.triggeredRules).toContain('device');
    });

    it('should detect low-risk transactions', async () => {
      const lowRiskTransaction: Transaction = {
        id: 'tx_low_risk',
        userId: 'user_002',
        amount: 100, // Normal amount
        currency: 'USD',
        timestamp: new Date(2024, 0, 1, 14, 0, 0), // 2 PM (normal hour)
        location: {
          lat: 40.7128,
          lng: -74.0060,
          country: 'US' // Trusted country
        },
        deviceId: 'device_123',
        ipAddress: '192.168.1.1'
      };

      const result = await detector.analyze(lowRiskTransaction);
      
      expect(result.riskScore).toBeLessThan(0.5);
      expect(result.isFraudulent).toBe(false);
      expect(result.triggeredRules.length).toBeLessThan(2);
    });

    it('should handle transactions with missing optional fields', async () => {
      const minimalTransaction: Transaction = {
        id: 'tx_minimal',
        userId: 'user_003',
        amount: 50,
        currency: 'USD',
        timestamp: new Date()
      };

      const result = await detector.analyze(minimalTransaction);
      
      expect(result).toBeDefined();
      expect(result.transactionId).toBe('tx_minimal');
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      expect(typeof result.isFraudulent).toBe('boolean');
    });

    it('should provide recommendations for fraudulent transactions', async () => {
      const fraudulentTransaction: Transaction = {
        id: 'tx_fraud',
        userId: 'user_004',
        amount: 25000, // Very high amount
        currency: 'USD',
        timestamp: new Date(2024, 0, 1, 3, 0, 0), // 3 AM
        location: {
          lat: 40.7128,
          lng: -74.0060,
          country: 'XX' // Suspicious country
        }
      };

      const result = await detector.analyze(fraudulentTransaction);
      
      expect(result.isFraudulent).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });

    it('should handle string timestamps correctly', async () => {
      const transactionWithStringTimestamp: Transaction = {
        id: 'tx_string_time',
        userId: 'user_005',
        amount: 1000,
        currency: 'USD',
        timestamp: '2024-01-01T14:00:00Z' // String timestamp
      };

      const result = await detector.analyze(transactionWithStringTimestamp);
      
      expect(result).toBeDefined();
      expect(result.transactionId).toBe('tx_string_time');
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance and Reliability', () => {
    it('should process transactions quickly', async () => {
      const transaction: Transaction = {
        id: 'tx_perf',
        userId: 'user_006',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date()
      };

      const startTime = Date.now();
      const result = await detector.analyze(transaction);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should process in under 100ms
      expect(result.processingTime).toBeLessThan(100);
    });

    it('should handle multiple concurrent transactions', async () => {
      const transactions: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
        id: `tx_concurrent_${i}`,
        userId: `user_${i}`,
        amount: 100 + i * 10,
        currency: 'USD',
        timestamp: new Date()
      }));

      const promises = transactions.map(tx => detector.analyze(tx));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.transactionId).toBe(`tx_concurrent_${index}`);
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(1);
      });
    });
  });
});