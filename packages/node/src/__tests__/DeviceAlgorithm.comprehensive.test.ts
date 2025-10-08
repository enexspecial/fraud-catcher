import { DeviceAlgorithm, DeviceConfig, DeviceFingerprint } from '../core/algorithms/DeviceAlgorithm';
import { Transaction, DetectionRule } from '../core/models/Transaction';

describe('DeviceAlgorithm - Comprehensive Tests', () => {
  let algorithm: DeviceAlgorithm;
  let config: DeviceConfig;
  let rule: DetectionRule;

  beforeEach(() => {
    config = {
      enableFingerprinting: true,
      suspiciousDeviceThreshold: 5,
      newDeviceRiskMultiplier: 1.5,
      deviceVelocityWindow: 60,
      maxDevicesPerUser: 5
    };
    algorithm = new DeviceAlgorithm(config);
    rule = {
      name: 'device',
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

    it('should handle different configuration values', () => {
      const customConfig: DeviceConfig = {
        enableFingerprinting: false,
        suspiciousDeviceThreshold: 10,
        newDeviceRiskMultiplier: 2.0,
        deviceVelocityWindow: 120,
        maxDevicesPerUser: 3
      };
      
      const customAlgorithm = new DeviceAlgorithm(customConfig);
      expect(customAlgorithm).toBeDefined();
    });
  });

  describe('Transaction Analysis', () => {
    it('should analyze transaction without device data', async () => {
      const transaction: Transaction = {
        id: 'tx_no_device',
        userId: 'user_no_device',
        amount: 100,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBe(0.0); // Should return 0 for no device data
    });

    it('should analyze transaction with device ID', async () => {
      const transaction: Transaction = {
        id: 'tx_with_device',
        userId: 'user_with_device',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: 'device_123'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should analyze transaction with user agent', async () => {
      const transaction: Transaction = {
        id: 'tx_with_user_agent',
        userId: 'user_with_user_agent',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should analyze transaction with IP address', async () => {
      const transaction: Transaction = {
        id: 'tx_with_ip',
        userId: 'user_with_ip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should detect new device risk', async () => {
      const transaction: Transaction = {
        id: 'tx_new_device',
        userId: 'user_new_device',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: 'new_device_123'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.2); // Should have risk for new device
    });

    it('should detect too many devices per user', async () => {
      const userId = 'user_many_devices';
      
      // Add transactions with different devices to exceed maxDevicesPerUser
      for (let i = 0; i < config.maxDevicesPerUser + 1; i++) {
        const transaction: Transaction = {
          id: `tx_device_${i}`,
          userId,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(),
          deviceId: `device_${i}`
        };
        
        await algorithm.analyze(transaction, rule);
      }

      // The last transaction should have high risk
      const lastTransaction: Transaction = {
        id: 'tx_last_device',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: 'device_excess'
      };

      const score = await algorithm.analyze(lastTransaction, rule);
      expect(score).toBeGreaterThan(0.5); // Should be high risk
    });

    it('should detect device fingerprint changes', async () => {
      const deviceId = 'device_changing';
      const userId = 'user_changing';
      
      // First transaction with initial fingerprint
      const firstTransaction: Transaction = {
        id: 'tx_first',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.1'
      };
      
      await algorithm.analyze(firstTransaction, rule);

      // Second transaction with changed user agent
      const secondTransaction: Transaction = {
        id: 'tx_second',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ipAddress: '192.168.1.1'
      };

      const score = await algorithm.analyze(secondTransaction, rule);
      expect(score).toBeGreaterThan(0.2); // Should have risk for fingerprint change
    });

    it('should detect device sharing', async () => {
      const deviceId = 'shared_device';
      
      // First user uses the device
      const firstTransaction: Transaction = {
        id: 'tx_first_user',
        userId: 'user_1',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId
      };
      
      await algorithm.analyze(firstTransaction, rule);

      // Second user uses the same device
      const secondTransaction: Transaction = {
        id: 'tx_second_user',
        userId: 'user_2',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId
      };

      const score = await algorithm.analyze(secondTransaction, rule);
      expect(score).toBeGreaterThan(0.4); // Should have high risk for device sharing
    });

    it('should detect high device velocity', async () => {
      const deviceId = 'high_velocity_device';
      const userId = 'user_velocity';
      
      // Add many transactions quickly
      for (let i = 0; i < 10; i++) {
        const transaction: Transaction = {
          id: `tx_velocity_${i}`,
          userId,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 1000), // 1 second apart
          deviceId
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const finalTransaction: Transaction = {
        id: 'tx_final_velocity',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId
      };

      const score = await algorithm.analyze(finalTransaction, rule);
      expect(score).toBeGreaterThan(0.3); // Should have risk for high velocity
    });
  });

  describe('Device Fingerprinting', () => {
    it('should create device fingerprint from transaction data', async () => {
      const transaction: Transaction = {
        id: 'tx_fingerprint',
        userId: 'user_fingerprint',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: 'device_fingerprint',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.1',
        metadata: {
          screenResolution: '1920x1080',
          timezone: 'America/New_York',
          language: 'en-US',
          platform: 'Windows'
        }
      };

      await algorithm.analyze(transaction, rule);
      
      const fingerprint = algorithm.getDeviceFingerprint('device_fingerprint');
      expect(fingerprint).toBeDefined();
      expect(fingerprint?.deviceId).toBe('device_fingerprint');
      expect(fingerprint?.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(fingerprint?.ipAddress).toBe('192.168.1.1');
      expect(fingerprint?.screenResolution).toBe('1920x1080');
      expect(fingerprint?.timezone).toBe('America/New_York');
      expect(fingerprint?.language).toBe('en-US');
      expect(fingerprint?.platform).toBe('Windows');
    });

    it('should generate device ID when not provided', async () => {
      const transaction: Transaction = {
        id: 'tx_generated_id',
        userId: 'user_generated_id',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.1',
        metadata: {
          screenResolution: '1920x1080'
        }
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should update device fingerprint over time', async () => {
      const deviceId = 'device_updating';
      const userId = 'user_updating';
      
      // First transaction
      const firstTransaction: Transaction = {
        id: 'tx_first_update',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
        deviceId
      };
      
      await algorithm.analyze(firstTransaction, rule);

      // Second transaction
      const secondTransaction: Transaction = {
        id: 'tx_second_update',
        userId,
        amount: 200,
        currency: 'USD',
        timestamp: new Date(),
        deviceId
      };

      await algorithm.analyze(secondTransaction, rule);

      const fingerprint = algorithm.getDeviceFingerprint(deviceId);
      expect(fingerprint).toBeDefined();
      expect(fingerprint?.transactionCount).toBe(2);
      expect(fingerprint?.totalAmount).toBe(300);
    });
  });

  describe('Utility Methods', () => {
    it('should get device fingerprint', () => {
      const fingerprint = algorithm.getDeviceFingerprint('nonexistent_device');
      expect(fingerprint).toBeUndefined();
    });

    it('should get user devices', () => {
      const devices = algorithm.getUserDevices('user_no_devices');
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBe(0);
    });

    it('should track user devices', async () => {
      const userId = 'user_tracking';
      const deviceId = 'device_tracking';
      
      const transaction: Transaction = {
        id: 'tx_tracking',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId
      };

      await algorithm.analyze(transaction, rule);
      
      const devices = algorithm.getUserDevices(userId);
      expect(devices).toContain(deviceId);
    });

    it('should mark device as trusted', async () => {
      const deviceId = 'device_trusted';
      const userId = 'user_trusted';
      
      const transaction: Transaction = {
        id: 'tx_trusted',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId
      };

      await algorithm.analyze(transaction, rule);
      algorithm.markDeviceAsTrusted(deviceId);
      
      const fingerprint = algorithm.getDeviceFingerprint(deviceId);
      expect(fingerprint?.isTrusted).toBe(true);
    });

    it('should get device stats', async () => {
      const deviceId = 'device_stats';
      const userId = 'user_stats';
      
      const transaction: Transaction = {
        id: 'tx_stats',
        userId,
        amount: 150,
        currency: 'USD',
        timestamp: new Date(),
        deviceId
      };

      await algorithm.analyze(transaction, rule);
      
      const stats = algorithm.getDeviceStats(deviceId);
      expect(stats.transactionCount).toBe(1);
      expect(stats.totalAmount).toBe(150);
      expect(stats.isTrusted).toBe(false);
    });

    it('should return default stats for unknown device', () => {
      const stats = algorithm.getDeviceStats('unknown_device');
      expect(stats.transactionCount).toBe(0);
      expect(stats.totalAmount).toBe(0);
      expect(stats.isTrusted).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle transactions with minimal device data', async () => {
      const transaction: Transaction = {
        id: 'tx_minimal',
        userId: 'user_minimal',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: 'minimal_device'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle rapid device switching', async () => {
      const userId = 'user_rapid_switch';
      
      // Add transactions with different devices very quickly
      for (let i = 0; i < 3; i++) {
        const transaction: Transaction = {
          id: `tx_rapid_${i}`,
          userId,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(Date.now() - (2 - i) * 1000), // 1 second apart
          deviceId: `device_rapid_${i}`
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const finalTransaction: Transaction = {
        id: 'tx_final_rapid',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: 'device_rapid_final'
      };

      const score = await algorithm.analyze(finalTransaction, rule);
      expect(score).toBeGreaterThan(0.2); // Should have risk for rapid switching
    });

    it('should handle very long device IDs', async () => {
      const longDeviceId = 'device_' + 'x'.repeat(1000);
      const transaction: Transaction = {
        id: 'tx_long_device',
        userId: 'user_long_device',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: longDeviceId
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle special characters in device data', async () => {
      const transaction: Transaction = {
        id: 'tx_special_chars',
        userId: 'user_special_chars',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: 'device@#$%^&*()',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) [Special:Chars]',
        ipAddress: '192.168.1.1',
        metadata: {
          screenResolution: '1920x1080@60Hz',
          timezone: 'America/New_York (EST)',
          language: 'en-US,en;q=0.9',
          platform: 'Windows NT 10.0; Win64; x64'
        }
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance', () => {
    it('should analyze transactions quickly', async () => {
      const transaction: Transaction = {
        id: 'tx_perf',
        userId: 'user_perf',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: 'device_perf'
      };

      const startTime = Date.now();
      const score = await algorithm.analyze(transaction, rule);
      const endTime = Date.now();

      expect(score).toBeGreaterThanOrEqual(0);
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple concurrent analyses', async () => {
      const transactions: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
        id: `tx_concurrent_${i}`,
        userId: `user_${i}`,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: `device_${i}`
      }));

      const startTime = Date.now();
      const promises = transactions.map(tx => algorithm.analyze(tx, rule));
      const scores = await Promise.all(promises);
      const endTime = Date.now();

      expect(scores).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Memory Management', () => {
    it('should handle many devices efficiently', async () => {
      const userId = 'user_many_devices';
      
      // Add many devices for one user
      for (let i = 0; i < 100; i++) {
        const transaction: Transaction = {
          id: `tx_many_${i}`,
          userId,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(),
          deviceId: `device_many_${i}`
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const devices = algorithm.getUserDevices(userId);
      expect(devices.length).toBe(100);
    });

    it('should handle many users efficiently', async () => {
      // Add devices for many users
      for (let i = 0; i < 100; i++) {
        const transaction: Transaction = {
          id: `tx_many_users_${i}`,
          userId: `user_many_${i}`,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(),
          deviceId: `device_many_users_${i}`
        };
        
        await algorithm.analyze(transaction, rule);
      }

      // Should not throw or cause memory issues
      expect(algorithm).toBeDefined();
    });
  });
});
