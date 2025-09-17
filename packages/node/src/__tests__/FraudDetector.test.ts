import { FraudDetector, Transaction } from '../index';

describe('FraudDetector', () => {
  let detector: FraudDetector;

  beforeEach(() => {
    detector = new FraudDetector({
      rules: ['velocity', 'amount', 'location'],
      thresholds: {
        velocity: 0.8,
        amount: 0.9,
        location: 0.7
      },
      globalThreshold: 0.7,
      enableLogging: false
    });
  });

  describe('analyze', () => {
    it('should analyze a normal transaction', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        location: {
          lat: 40.7128,
          lng: -74.0060
        }
      };

      const result = await detector.analyze(transaction);

      expect(result).toBeDefined();
      expect(result.transactionId).toBe('tx_001');
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      expect(typeof result.isFraudulent).toBe('boolean');
      expect(Array.isArray(result.triggeredRules)).toBe(true);
    });

    it('should detect high-risk amount', async () => {
      const transaction: Transaction = {
        id: 'tx_002',
        userId: 'user_002',
        amount: 10000, // High amount
        currency: 'USD',
        timestamp: new Date()
      };

      const result = await detector.analyze(transaction);

      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.triggeredRules).toContain('amount');
    });

    it('should detect velocity fraud', async () => {
      const userId = 'user_003';
      
      // Create multiple transactions in quick succession
      for (let i = 0; i < 15; i++) {
        const transaction: Transaction = {
          id: `tx_${i}`,
          userId,
          amount: 100,
          currency: 'USD',
          timestamp: new Date()
        };
        
        await detector.analyze(transaction);
      }

      // The last transaction should trigger velocity rule
      const lastTransaction: Transaction = {
        id: 'tx_final',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date()
      };

      const result = await detector.analyze(lastTransaction);
      expect(result.triggeredRules).toContain('velocity');
    });
  });

  describe('utility methods', () => {
    it('should check suspicious amounts', () => {
      expect(detector.isSuspiciousAmount(2000, 'USD')).toBe(true);
      expect(detector.isSuspiciousAmount(500, 'USD')).toBe(false);
    });

    it('should get velocity stats', () => {
      const stats = detector.getVelocityStats('user_001', 60);
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('totalAmount');
      expect(typeof stats.count).toBe('number');
      expect(typeof stats.totalAmount).toBe('number');
    });
  });
});
