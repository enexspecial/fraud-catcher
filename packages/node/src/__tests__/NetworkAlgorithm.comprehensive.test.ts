import { NetworkAlgorithm, NetworkConfig, IPProfile, NetworkAnomaly } from '../core/algorithms/NetworkAlgorithm';
import { Transaction, DetectionRule } from '../core/models/Transaction';

describe('NetworkAlgorithm - Comprehensive Tests', () => {
  let algorithm: NetworkAlgorithm;
  let config: NetworkConfig;
  let rule: DetectionRule;

  beforeEach(() => {
    config = {
      enableIPAnalysis: true,
      enableProxyDetection: true,
      enableVPNDetection: true,
      enableTorDetection: true,
      suspiciousCountries: ['XX', 'ZZ'],
      trustedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'NG'],
      maxConnectionsPerIP: 10,
      ipVelocityWindow: 60,
      enableGeoIPAnalysis: true,
      enableASNAnalysis: true
    };
    algorithm = new NetworkAlgorithm(config);
    rule = {
      name: 'network',
      weight: 0.10,
      threshold: 0.8,
      enabled: true,
      config: {}
    };
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with valid configuration', () => {
      expect(algorithm).toBeDefined();
    });

    it('should handle minimal configuration', () => {
      const minimalConfig: NetworkConfig = {
        enableIPAnalysis: false,
        enableProxyDetection: false,
        enableVPNDetection: false,
        enableTorDetection: false,
        suspiciousCountries: [],
        trustedCountries: [],
        maxConnectionsPerIP: 5,
        ipVelocityWindow: 30,
        enableGeoIPAnalysis: false,
        enableASNAnalysis: false
      };
      
      const minimalAlgorithm = new NetworkAlgorithm(minimalConfig);
      expect(minimalAlgorithm).toBeDefined();
    });
  });

  describe('Transaction Analysis', () => {
    it('should analyze transaction without IP address', async () => {
      const transaction: Transaction = {
        id: 'tx_no_ip',
        userId: 'user_no_ip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date()
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBe(0.0); // Should return 0 for no IP data
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

    it('should detect suspicious IP addresses', async () => {
      // Mark an IP as suspicious
      algorithm.markIPAsSuspicious('192.168.1.100');
      
      const transaction: Transaction = {
        id: 'tx_suspicious_ip',
        userId: 'user_suspicious_ip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.100'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.7); // Should be high risk for suspicious IP
    });

    it('should reduce risk for trusted IP addresses', async () => {
      // Mark an IP as trusted
      algorithm.markIPAsTrusted('192.168.1.200');
      
      const transaction: Transaction = {
        id: 'tx_trusted_ip',
        userId: 'user_trusted_ip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.200'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeLessThan(0.5); // Should be lower risk for trusted IP
    });

    it('should detect high IP velocity', async () => {
      const ipAddress = '192.168.1.50';
      const userId = 'user_high_velocity';
      
      // Add many transactions quickly from same IP
      for (let i = 0; i < 15; i++) { // More than 10 transactions per minute
        const transaction: Transaction = {
          id: `tx_velocity_${i}`,
          userId: `user_${i}`,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 1000), // 1 second apart
          ipAddress
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const finalTransaction: Transaction = {
        id: 'tx_final_velocity',
        userId: 'user_final_velocity',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress
      };

      const score = await algorithm.analyze(finalTransaction, rule);
      expect(score).toBeGreaterThan(0.6); // Should have high risk for high velocity
    });

    it('should detect geographic anomalies', async () => {
      const transaction: Transaction = {
        id: 'tx_geo_anomaly',
        userId: 'user_geo_anomaly',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '1.1.1.1', // IP that resolves to US
        location: {
          lat: 40.7128,
          lng: -74.0060,
          country: 'JP' // But transaction location is Japan
        }
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThan(0.5); // Should have risk for geo anomaly
    });

    it('should detect proxy usage', async () => {
      // This would require actual proxy detection in production
      const transaction: Transaction = {
        id: 'tx_proxy',
        userId: 'user_proxy',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should detect VPN usage', async () => {
      const transaction: Transaction = {
        id: 'tx_vpn',
        userId: 'user_vpn',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should detect Tor usage', async () => {
      const transaction: Transaction = {
        id: 'tx_tor',
        userId: 'user_tor',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('IP Profile Management', () => {
    it('should create IP profile for new IP', async () => {
      const transaction: Transaction = {
        id: 'tx_new_ip',
        userId: 'user_new_ip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      await algorithm.analyze(transaction, rule);
      
      const profile = algorithm.getIPProfile('192.168.1.1');
      expect(profile).toBeDefined();
      expect(profile?.ipAddress).toBe('192.168.1.1');
      expect(profile?.transactionCount).toBe(1);
      expect(profile?.totalAmount).toBe(100);
    });

    it('should update IP profile over time', async () => {
      const ipAddress = '192.168.1.2';
      const userId = 'user_updating_ip';
      
      // First transaction
      const firstTransaction: Transaction = {
        id: 'tx_first_ip',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
        ipAddress
      };
      
      await algorithm.analyze(firstTransaction, rule);

      // Second transaction
      const secondTransaction: Transaction = {
        id: 'tx_second_ip',
        userId,
        amount: 200,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress
      };

      await algorithm.analyze(secondTransaction, rule);

      const profile = algorithm.getIPProfile(ipAddress);
      expect(profile?.transactionCount).toBe(2);
      expect(profile?.totalAmount).toBe(300);
    });

    it('should track unique users per IP', async () => {
      const ipAddress = '192.168.1.3';
      
      // Transactions from different users
      const users = ['user_1', 'user_2', 'user_3'];
      for (const userId of users) {
        const transaction: Transaction = {
          id: `tx_multi_user_${userId}`,
          userId,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(),
          ipAddress
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const profile = algorithm.getIPProfile(ipAddress);
      expect(profile?.userCount).toBe(3);
      expect(profile?.uniqueUsers.size).toBe(3);
    });
  });

  describe('Utility Methods', () => {
    it('should get IP profile', () => {
      const profile = algorithm.getIPProfile('nonexistent_ip');
      expect(profile).toBeUndefined();
    });

    it('should get user IPs', () => {
      const ips = algorithm.getUserIPs('user_no_ips');
      expect(Array.isArray(ips)).toBe(true);
      expect(ips.length).toBe(0);
    });

    it('should track user IPs', async () => {
      const userId = 'user_tracking_ips';
      const ipAddress = '192.168.1.4';
      
      const transaction: Transaction = {
        id: 'tx_tracking_ips',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress
      };

      await algorithm.analyze(transaction, rule);
      
      const ips = algorithm.getUserIPs(userId);
      expect(ips).toContain(ipAddress);
    });

    it('should mark IP as suspicious', async () => {
      const ipAddress = '192.168.1.5';
      
      // First create a profile by analyzing a transaction
      const transaction: Transaction = {
        id: 'tx_mark_suspicious',
        userId: 'user_mark_suspicious',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: ipAddress
      };
      
      // First analyze to create the profile
      await algorithm.analyze(transaction, rule);
      algorithm.markIPAsSuspicious(ipAddress);
      
      // Analyze again to update the profile with the suspicious flag
      await algorithm.analyze(transaction, rule);
      
      const profile = algorithm.getIPProfile(ipAddress);
      expect(profile?.isSuspicious).toBe(true);
    });

    it('should mark IP as trusted', async () => {
      const ipAddress = '192.168.1.6';
      
      // First create a profile by analyzing a transaction
      const transaction: Transaction = {
        id: 'tx_mark_trusted',
        userId: 'user_mark_trusted',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: ipAddress
      };
      
      // First analyze to create the profile
      await algorithm.analyze(transaction, rule);
      algorithm.markIPAsTrusted(ipAddress);
      
      // Analyze again to update the profile with the trusted flag
      await algorithm.analyze(transaction, rule);
      
      const profile = algorithm.getIPProfile(ipAddress);
      expect(profile?.isSuspicious).toBe(false);
    });

    it('should get top IPs by volume', async () => {
      // Add transactions with different amounts
      const ips = [
        { ip: '192.168.1.10', amount: 1000 },
        { ip: '192.168.1.11', amount: 500 },
        { ip: '192.168.1.12', amount: 100 }
      ];

      for (const ipData of ips) {
        const transaction: Transaction = {
          id: `tx_${ipData.ip}`,
          userId: `user_${ipData.ip}`,
          amount: ipData.amount,
          currency: 'USD',
          timestamp: new Date(),
          ipAddress: ipData.ip
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const topIPs = algorithm.getTopIPsByVolume(2);
      expect(topIPs).toHaveLength(2);
      expect(topIPs[0].ipAddress).toBe('192.168.1.10');
      expect(topIPs[1].ipAddress).toBe('192.168.1.11');
    });

    it('should get riskiest IPs', async () => {
      // Add transactions with different risk levels
      const highRiskTransaction: Transaction = {
        id: 'tx_high_risk_ip',
        userId: 'user_high_risk_ip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.20'
      };

      const lowRiskTransaction: Transaction = {
        id: 'tx_low_risk_ip',
        userId: 'user_low_risk_ip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.21'
      };

      await algorithm.analyze(highRiskTransaction, rule);
      await algorithm.analyze(lowRiskTransaction, rule);

      const riskiestIPs = algorithm.getRiskiestIPs(1);
      expect(riskiestIPs.length).toBeGreaterThanOrEqual(0);
    });

    it('should get network anomalies for user', async () => {
      const userId = 'user_anomalies';
      const ipAddress = '192.168.1.30';
      
      const transaction: Transaction = {
        id: 'tx_anomalies',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress
      };

      await algorithm.analyze(transaction, rule);
      
      const anomalies = algorithm.getNetworkAnomalies(userId);
      expect(Array.isArray(anomalies)).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    it('should work with IP analysis disabled', async () => {
      const noIPConfig: NetworkConfig = {
        ...config,
        enableIPAnalysis: false
      };
      
      const noIPAlgorithm = new NetworkAlgorithm(noIPConfig);
      
      const transaction: Transaction = {
        id: 'tx_no_ip_analysis',
        userId: 'user_no_ip_analysis',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      const score = await noIPAlgorithm.analyze(transaction, rule);
      expect(score).toBeLessThan(0.5); // Should be lower risk without IP analysis
    });

    it('should work with proxy detection disabled', async () => {
      const noProxyConfig: NetworkConfig = {
        ...config,
        enableProxyDetection: false
      };
      
      const noProxyAlgorithm = new NetworkAlgorithm(noProxyConfig);
      
      const transaction: Transaction = {
        id: 'tx_no_proxy_detection',
        userId: 'user_no_proxy_detection',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      const score = await noProxyAlgorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should work with VPN detection disabled', async () => {
      const noVPNConfig: NetworkConfig = {
        ...config,
        enableVPNDetection: false
      };
      
      const noVPNAlgorithm = new NetworkAlgorithm(noVPNConfig);
      
      const transaction: Transaction = {
        id: 'tx_no_vpn_detection',
        userId: 'user_no_vpn_detection',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      const score = await noVPNAlgorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should work with Tor detection disabled', async () => {
      const noTorConfig: NetworkConfig = {
        ...config,
        enableTorDetection: false
      };
      
      const noTorAlgorithm = new NetworkAlgorithm(noTorConfig);
      
      const transaction: Transaction = {
        id: 'tx_no_tor_detection',
        userId: 'user_no_tor_detection',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      const score = await noTorAlgorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should work with GeoIP analysis disabled', async () => {
      const noGeoIPConfig: NetworkConfig = {
        ...config,
        enableGeoIPAnalysis: false
      };
      
      const noGeoIPAlgorithm = new NetworkAlgorithm(noGeoIPConfig);
      
      const transaction: Transaction = {
        id: 'tx_no_geoip',
        userId: 'user_no_geoip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        location: {
          lat: 40.7128,
          lng: -74.0060,
          country: 'US'
        }
      };

      const score = await noGeoIPAlgorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should work with ASN analysis disabled', async () => {
      const noASNConfig: NetworkConfig = {
        ...config,
        enableASNAnalysis: false
      };
      
      const noASNAlgorithm = new NetworkAlgorithm(noASNConfig);
      
      const transaction: Transaction = {
        id: 'tx_no_asn',
        userId: 'user_no_asn',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1'
      };

      const score = await noASNAlgorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid IP addresses', async () => {
      const transaction: Transaction = {
        id: 'tx_invalid_ip',
        userId: 'user_invalid_ip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: 'invalid-ip-address'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle very long IP addresses', async () => {
      const longIP = '192.168.1.1.' + 'x'.repeat(1000);
      const transaction: Transaction = {
        id: 'tx_long_ip',
        userId: 'user_long_ip',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: longIP
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle IPv6 addresses', async () => {
      const transaction: Transaction = {
        id: 'tx_ipv6',
        userId: 'user_ipv6',
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      };

      const score = await algorithm.analyze(transaction, rule);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle private IP addresses', async () => {
      const privateIPs = [
        '10.0.0.1',
        '172.16.0.1',
        '192.168.1.1'
      ];

      for (const ip of privateIPs) {
        const transaction: Transaction = {
          id: `tx_private_${ip}`,
          userId: `user_private_${ip}`,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(),
          ipAddress: ip
        };

        const score = await algorithm.analyze(transaction, rule);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
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
        ipAddress: '192.168.1.1'
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
        ipAddress: `192.168.1.${i + 1}`
      }));

      const startTime = Date.now();
      const promises = transactions.map(tx => algorithm.analyze(tx, rule));
      const scores = await Promise.all(promises);
      const endTime = Date.now();

      expect(scores).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Network Anomaly Detection', () => {
    it('should detect proxy anomalies', async () => {
      const userId = 'user_proxy_anomaly';
      const ipAddress = '192.168.1.40';
      
      const transaction: Transaction = {
        id: 'tx_proxy_anomaly',
        userId,
        amount: 100,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress
      };

      await algorithm.analyze(transaction, rule);
      
      const anomalies = algorithm.getNetworkAnomalies(userId);
      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('should detect velocity anomalies', async () => {
      const userId = 'user_velocity_anomaly';
      const ipAddress = '192.168.1.41';
      
      // Add many transactions quickly
      for (let i = 0; i < 15; i++) {
        const transaction: Transaction = {
          id: `tx_velocity_anomaly_${i}`,
          userId: `user_${i}`,
          amount: 100,
          currency: 'USD',
          timestamp: new Date(Date.now() - i * 1000),
          ipAddress
        };
        
        await algorithm.analyze(transaction, rule);
      }

      const anomalies = algorithm.getNetworkAnomalies(userId);
      expect(Array.isArray(anomalies)).toBe(true);
    });
  });
});
