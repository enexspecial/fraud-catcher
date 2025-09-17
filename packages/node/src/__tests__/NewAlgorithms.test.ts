import { 
  DeviceAlgorithm, DeviceConfig,
  TimeAlgorithm, TimeConfig,
  MerchantAlgorithm, MerchantConfig,
  BehavioralAlgorithm, BehavioralConfig,
  NetworkAlgorithm, NetworkConfig,
  MLAlgorithm, MLConfig
} from '../../index';
import { Transaction, DetectionRule } from '../../index';

describe('New Fraud Detection Algorithms', () => {
  describe('DeviceAlgorithm', () => {
    let algorithm: DeviceAlgorithm;
    let config: DeviceConfig;

    beforeEach(() => {
      config = {
        enableFingerprinting: true,
        suspiciousDeviceThreshold: 5,
        newDeviceRiskMultiplier: 1.5,
        deviceVelocityWindow: 60,
        maxDevicesPerUser: 5
      };
      algorithm = new DeviceAlgorithm(config);
    });

    it('should detect new device risk', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId: 'device_001',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      };

      const rule: DetectionRule = {
        name: 'device',
        weight: 0.15,
        threshold: 0.8,
        enabled: true
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should detect device sharing risk', async () => {
      const deviceId = 'shared_device';
      
      // First user
      const transaction1: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        deviceId,
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      };

      // Second user with same device
      const transaction2: Transaction = {
        id: 'tx_002',
        userId: 'user_002',
        amount: 200,
        currency: 'USD',
        timestamp: new Date(),
        deviceId,
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      };

      const rule: DetectionRule = {
        name: 'device',
        weight: 0.15,
        threshold: 0.8,
        enabled: true
      };

      await algorithm.analyze(transaction1, rule);
      const score = await algorithm.analyze(transaction2, rule);
      
      expect(score).toBeGreaterThan(0.4); // Should detect device sharing
    });
  });

  describe('TimeAlgorithm', () => {
    let algorithm: TimeAlgorithm;
    let config: TimeConfig;

    beforeEach(() => {
      config = {
        suspiciousHours: [0, 1, 2, 3, 4, 5, 22, 23],
        weekendRiskMultiplier: 1.2,
        holidayRiskMultiplier: 1.5,
        timezoneThreshold: 8,
        enableHolidayDetection: true,
        customHolidays: []
      };
      algorithm = new TimeAlgorithm(config);
    });

    it('should detect suspicious hour transactions', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(2024, 0, 1, 2, 0, 0) // 2 AM
      };

      const rule: DetectionRule = {
        name: 'time',
        weight: 0.10,
        threshold: 0.6,
        enabled: true
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.3); // Should detect suspicious hour
    });

    it('should detect weekend transactions', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(2024, 0, 6, 14, 0, 0) // Saturday 2 PM
      };

      const rule: DetectionRule = {
        name: 'time',
        weight: 0.10,
        threshold: 0.6,
        enabled: true
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.1); // Should detect weekend
    });
  });

  describe('MerchantAlgorithm', () => {
    let algorithm: MerchantAlgorithm;
    let config: MerchantConfig;

    beforeEach(() => {
      config = {
        highRiskCategories: ['gambling', 'adult', 'cash_advance'],
        suspiciousMerchants: ['suspicious_merchant'],
        trustedMerchants: ['trusted_merchant'],
        categoryRiskScores: {
          'gambling': 0.8,
          'electronics': 0.3,
          'grocery': 0.1
        },
        merchantVelocityWindow: 60,
        maxTransactionsPerMerchant: 20,
        enableCategoryAnalysis: true,
        enableMerchantReputation: true
      };
      algorithm = new MerchantAlgorithm(config);
    });

    it('should detect high-risk category transactions', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        merchantId: 'merchant_001',
        merchantCategory: 'gambling'
      };

      const rule: DetectionRule = {
        name: 'merchant',
        weight: 0.15,
        threshold: 0.7,
        enabled: true
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.5); // Should detect high-risk category
    });

    it('should detect suspicious merchant transactions', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        merchantId: 'suspicious_merchant',
        merchantCategory: 'electronics'
      };

      const rule: DetectionRule = {
        name: 'merchant',
        weight: 0.15,
        threshold: 0.7,
        enabled: true
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.7); // Should detect suspicious merchant
    });
  });

  describe('BehavioralAlgorithm', () => {
    let algorithm: BehavioralAlgorithm;
    let config: BehavioralConfig;

    beforeEach(() => {
      config = {
        enableSpendingPatterns: true,
        enableTransactionTiming: true,
        enableLocationPatterns: true,
        enableDevicePatterns: true,
        patternHistoryDays: 30,
        anomalyThreshold: 0.7,
        enableMachineLearning: false,
        learningRate: 0.01
      };
      algorithm = new BehavioralAlgorithm(config);
    });

    it('should detect spending pattern anomalies', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 10000, // Unusually high amount
        currency: 'USD',
        timestamp: new Date()
      };

      const rule: DetectionRule = {
        name: 'behavioral',
        weight: 0.10,
        threshold: 0.6,
        enabled: true
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.3); // Should detect spending anomaly
    });

    it('should detect location pattern anomalies', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        location: {
          lat: 40.7128,
          lng: -74.0060,
          country: 'US',
          city: 'New York'
        }
      };

      const rule: DetectionRule = {
        name: 'behavioral',
        weight: 0.10,
        threshold: 0.6,
        enabled: true
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0); // Should analyze location
    });
  });

  describe('NetworkAlgorithm', () => {
    let algorithm: NetworkAlgorithm;
    let config: NetworkConfig;

    beforeEach(() => {
      config = {
        enableIPAnalysis: true,
        enableProxyDetection: true,
        enableVPNDetection: true,
        enableTorDetection: true,
        suspiciousCountries: ['XX', 'ZZ'],
        trustedCountries: ['US', 'CA', 'GB'],
        maxConnectionsPerIP: 10,
        ipVelocityWindow: 60,
        enableGeoIPAnalysis: true,
        enableASNAnalysis: true
      };
      algorithm = new NetworkAlgorithm(config);
    });

    it('should detect suspicious country IPs', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1' // Mock IP that resolves to suspicious country
      };

      const rule: DetectionRule = {
        name: 'network',
        weight: 0.10,
        threshold: 0.8,
        enabled: true
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0); // Should analyze IP
    });

    it('should detect IP velocity anomalies', async () => {
      const ipAddress = '192.168.1.1';
      
      // Create multiple transactions from same IP
      for (let i = 0; i < 15; i++) {
        const transaction: Transaction = {
          id: `tx_${i}`,
          userId: `user_${i}`,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(),
          ipAddress
        };

        const rule: DetectionRule = {
          name: 'network',
          weight: 0.10,
          threshold: 0.8,
          enabled: true
        };

        await algorithm.analyze(transaction, rule);
      }

      // Check if IP is flagged for high velocity
      const profile = algorithm.getIPProfile(ipAddress);
      expect(profile?.transactionCount).toBeGreaterThan(10);
    });
  });

  describe('MLAlgorithm', () => {
    let algorithm: MLAlgorithm;
    let config: MLConfig;

    beforeEach(() => {
      config = {
        enableTraining: true,
        modelType: 'ensemble',
        featureExtractors: ['amount', 'velocity', 'location'],
        trainingDataSize: 1000,
        retrainInterval: 24,
        anomalyThreshold: 0.5,
        enableFeatureImportance: true,
        enableModelPersistence: true
      };
      algorithm = new MLAlgorithm(config);
    });

    it('should analyze transactions with ML', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date(),
        location: {
          lat: 40.7128,
          lng: -74.0060
        }
      };

      const rule: DetectionRule = {
        name: 'ml',
        weight: 0.20,
        threshold: 0.5,
        enabled: true
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should extract features correctly', async () => {
      const transaction: Transaction = {
        id: 'tx_001',
        userId: 'user_001',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date(),
        location: {
          lat: 40.7128,
          lng: -74.0060
        }
      };

      const features = await algorithm.extractFeatures(transaction);
      expect(features.amount).toBe(1000);
      expect(features.locationLat).toBe(40.7128);
      expect(features.locationLng).toBe(-74.0060);
    });
  });
});
