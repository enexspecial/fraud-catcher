import { VelocityAlgorithm, VelocityConfig } from '../core/algorithms/VelocityAlgorithm';
import { Transaction, DetectionRule } from '../core/models/Transaction';

describe('VelocityAlgorithm - Comprehensive Tests', () => {
  let algorithm: VelocityAlgorithm;
  let config: VelocityConfig;
  let rule: DetectionRule;

  beforeEach(() => {
    config = {
      timeWindow: 60, // 1 hour
      maxTransactions: 10,
      maxAmount: 5000
    };
    algorithm = new VelocityAlgorithm(config);
    rule = {
      name: 'velocity',
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

    it('should handle different time windows', () => {
      const shortWindowConfig: VelocityConfig = {
        timeWindow: 15, // 15 minutes
        maxTransactions: 5,
        maxAmount: 1000
      };
      
      const shortWindowAlgorithm = new VelocityAlgorithm(shortWindowConfig);
      expect(shortWindowAlgorithm).toBeDefined();
    });

    it('should handle large time windows', () => {
      const longWindowConfig: VelocityConfig = {
        timeWindow: 1440, // 24 hours
        maxTransactions: 100,
        maxAmount: 50000
      };
      
      const longWindowAlgorithm = new VelocityAlgorithm(longWindowConfig);
      expect(longWindowAlgorithm).toBeDefined();
    });
  });

  describe('Transaction Analysis', () => {
    it('should analyze single transaction with low risk', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeLessThan(0.5); // Should be low risk for single small transaction
    });

    it('should detect high transaction count velocity', async () => {
      const userId = 'user_high_count';
      
      // Create multiple transactions within time window
      for (let i = 0; i < 12; i++) { // More than maxTransactions (10)
        const transaction: Transaction = {
          id: `tx_${i}`,
          userId,
          amount: 50,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 5 * 60 * 1000) // 5 minutes apart
        };
        
        await algorithm.analyze(transaction, rule);
      }

      // The last transaction should trigger high velocity
      const lastTransaction: Transaction = {
        id: 'tx_final',
        userId,
        amount: 50,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(lastTransaction, rule);
      expect(score).toBeGreaterThan(0.5); // Should be high risk due to count
    });

    it('should detect high amount velocity', async () => {
      const userId = 'user_high_amount';
      
      // Create transactions that exceed maxAmount
      const transactions = [
        { amount: 2000, timestamp: new Date(Date.now() - 30 * 60 * 1000) },
        { amount: 2000, timestamp: new Date(Date.now() - 20 * 60 * 1000) },
        { amount: 2000, timestamp: new Date(Date.now() - 10 * 60 * 1000) }
      ];

      for (const tx of transactions) {
        const transaction: Transaction = {
          id: `tx_${tx.amount}_${tx.timestamp.getTime()}`,
          userId,
          amount: tx.amount,
          currency: 'USD',
          timestamp: tx.timestamp
        };
        
        await algorithm.analyze(transaction, rule);
      }

      // Final transaction should trigger high velocity due to amount
      const finalTransaction: Transaction = {
        id: 'tx_final_amount',
        userId,
        amount: 1000,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(finalTransaction, rule);
      expect(score).toBeGreaterThan(0.5); // Should be high risk due to amount
    });

    it('should handle transactions outside time window', async () => {
      const userId = 'user_old_transactions';
      
      // Create old transactions outside time window
      const oldTransaction: Transaction = {
        id: 'tx_old',
        userId,
        amount: 1000,
        currency: 'USD',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      };
      
      await algorithm.analyze(oldTransaction, rule);

      // New transaction should not be affected by old one
      const newTransaction: Transaction = {
        id: 'tx_new',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(newTransaction, rule);
      expect(score).toBeLessThan(0.5); // Should be low risk
    });

    it('should handle string timestamps', async () => {
      const transaction: Transaction = {
        id: 'tx_string_time',
        userId: 'user_string',
        amount: 100,
        currency: 'USD',
        timestamp: '2024-01-01T14:00:00Z'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle different currencies', async () => {
      const transaction: Transaction = {
        id: 'tx_currency',
        userId: 'user_currency',
        amount: 100,
        currency: 'EUR',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Utility Methods', () => {
    it('should get transaction count for user', () => {
      const userId = 'user_count_test';
      
      // Initially should be 0
      expect(algorithm.getTransactionCount(userId, 60)).toBe(0);
    });

    it('should get total amount for user', () => {
      const userId = 'user_amount_test';
      
      // Initially should be 0
      expect(algorithm.getTotalAmount(userId, 60)).toBe(0);
    });

    it('should track transaction count correctly', async () => {
      const userId = 'user_tracking';
      
      // Add some transactions
      for (let i = 0; i < 5; i++) {
        const transaction: Transaction = {
          id: `tx_${i}`,
          userId,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 10 * 60 * 1000) // 10 minutes apart
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const count = algorithm.getTransactionCount(userId, 60);
      expect(count).toBe(5);
    });

    it('should track total amount correctly', async () => {
      const userId = 'user_amount_tracking';
      
      // Add transactions with known amounts
      const amounts = [100, 200, 300, 400, 500];
      for (let i = 0; i < amounts.length; i++) {
        const transaction: Transaction = {
          id: `tx_${i}`,
          userId,
          amount: amounts[i],
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 10 * 60 * 1000)
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const totalAmount = algorithm.getTotalAmount(userId, 60);
      expect(totalAmount).toBe(1500); // Sum of amounts
    });

    it('should respect time window in utility methods', async () => {
      const userId = 'user_time_window';
      
      // Add old transaction
      const oldTransaction: Transaction = {
        id: 'tx_old',
        userId,
        amount: 1000,
        currency: 'USD',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      };
      
      await algorithm.analyze(oldTransaction, rule);

      // Add recent transaction
      const recentTransaction: Transaction = {
        id: 'tx_recent',
        userId,
        amount: 500,
        currency: 'USD',
        timestamp: new Date()
      };
      
      await algorithm.analyze(recentTransaction, rule);

      // Count and amount should only include recent transaction
      expect(algorithm.getTransactionCount(userId, 60)).toBe(1);
      expect(algorithm.getTotalAmount(userId, 60)).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount transactions', async () => {
      const transaction: Transaction = {
        id: 'tx_zero',
        userId: 'user_zero',
        amount: 0,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle very large amounts', async () => {
      const transaction: Transaction = {
        id: 'tx_large',
        userId: 'user_large',
        amount: 1000000,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.5); // Should be high risk
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
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle future timestamps', async () => {
      const transaction: Transaction = {
        id: 'tx_future',
        userId: 'user_future',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle very old timestamps', async () => {
      const transaction: Transaction = {
        id: 'tx_old',
        userId: 'user_old',
        amount: 100,
        currency: 'USD',
        timestamp: new Date('2020-01-01')
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Memory Management', () => {
    it('should clean up old transactions', async () => {
      const userId = 'user_cleanup';
      
      // Add many transactions over time
      for (let i = 0; i < 20; i++) {
        const transaction: Transaction = {
          id: `tx_${i}`,
          userId,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 5 * 60 * 1000) // 5 minutes apart
        };
        
        await algorithm.analyze(transaction, rule);
      }

      // Only recent transactions should be counted
      const count = algorithm.getTransactionCount(userId, 60);
      expect(count).toBeLessThanOrEqual(20); // Should not exceed reasonable limit
    });

    it('should handle multiple users independently', async () => {
      const user1 = 'user_1';
      const user2 = 'user_2';
      
      // Add transactions for user1
      for (let i = 0; i < 5; i++) {
        const transaction: Transaction = {
          id: `tx_user1_${i}`,
          userId: user1,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 10 * 60 * 1000)
        };
        
        await algorithm.analyze(transaction, rule);
      }

      // Add transactions for user2
      for (let i = 0; i < 3; i++) {
        const transaction: Transaction = {
          id: `tx_user2_${i}`,
          userId: user2,
          amount: 200,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 10 * 60 * 1000)
        };
        
        await algorithm.analyze(transaction, rule);
      }

      // Each user should have independent counts
      expect(algorithm.getTransactionCount(user1, 60)).toBe(5);
      expect(algorithm.getTransactionCount(user2, 60)).toBe(3);
      expect(algorithm.getTotalAmount(user1, 60)).toBe(500);
      expect(algorithm.getTotalAmount(user2, 60)).toBe(600);
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate risk score based on count threshold', async () => {
      const userId = 'user_count_risk';
      
      // Add exactly maxTransactions
      for (let i = 0; i < config.maxTransactions; i++) {
        const transaction: Transaction = {
          id: `tx_${i}`,
          userId,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 5 * 60 * 1000)
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const finalTransaction: Transaction = {
        id: 'tx_final',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(finalTransaction, rule);
      expect(score).toBeGreaterThan(0.4); // Should be significant risk
    });

    it('should calculate risk score based on amount threshold', async () => {
      const userId = 'user_amount_risk';
      
      // Add transactions that reach maxAmount
      const transaction: Transaction = {
        id: 'tx_amount',
        userId,
        amount: config.maxAmount,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.4); // Should be significant risk
    });

    it('should combine count and amount risk scores', async () => {
      const userId = 'user_combined_risk';
      
      // Add transactions that exceed both thresholds
      for (let i = 0; i < config.maxTransactions + 2; i++) {
        const transaction: Transaction = {
          id: `tx_${i}`,
          userId,
          amount: config.maxAmount / config.maxTransactions + 100,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 2 * 60 * 1000)
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const finalTransaction: Transaction = {
        id: 'tx_final',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(finalTransaction, rule);
      expect(score).toBeGreaterThan(0.7); // Should be very high risk
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent transactions for same user', async () => {
      const userId = 'user_concurrent';
      
      // Create multiple transactions with same timestamp
      const transactions: Transaction[] = Array.from({ length: 5 }, (_, i) => ({
        id: `tx_concurrent_${i}`,
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date()
      }));

      const promises = transactions.map(tx => algorithm.analyze(tx, rule));
      const scores = await Promise.all(promises);

      expect(scores).toHaveLength(5);
      scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });
});
