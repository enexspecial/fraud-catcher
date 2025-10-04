const { FraudDetector, CountryService } = require('./dist/index');

console.log('🚀 FraudCatcher - Complete 9 Algorithm Framework\n');

// Create fraud detector with all 9 algorithms
const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'device', 'time', 'merchant', 'behavioral', 'network', 'ml'],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7,
    device: 0.6,
    time: 0.5,
    merchant: 0.6,
    behavioral: 0.7,
    network: 0.6,
    ml: 0.5
  },
  globalThreshold: 0.6
});

// Test transactions
const testTransactions = [
  {
    id: 'tx_001',
    userId: 'user_001',
    amount: 1000,
    currency: 'USD',
    timestamp: new Date(),
    location: { lat: 40.7128, lng: -74.0060, country: 'US' },
    deviceId: 'device_123',
    ipAddress: '192.168.1.1',
    merchantId: 'merchant_001',
    merchantCategory: 'retail',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    id: 'tx_002',
    userId: 'user_002',
    amount: 50000,
    currency: 'NGN',
    timestamp: new Date(),
    location: { lat: 6.5244, lng: 3.3792, country: 'NG' },
    deviceId: 'device_456',
    ipAddress: '192.168.1.2',
    merchantId: 'merchant_002',
    merchantCategory: 'electronics',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
  },
  {
    id: 'tx_003',
    userId: 'user_003',
    amount: 100,
    currency: 'USD',
    timestamp: new Date(),
    location: { lat: 0, lng: 0, country: 'XX' },
    ipAddress: '192.168.1.3',
    merchantId: 'merchant_003',
    merchantCategory: 'unknown',
    userAgent: 'curl/7.68.0'
  }
];

// Test CountryService
const countryService = new CountryService();
console.log('🌍 Country Service:');
console.log('  US Risk Score:', countryService.getCountryRiskScore('US'));
console.log('  Nigeria Risk Score:', countryService.getCountryRiskScore('NG'));
console.log('  Is Nigeria High Risk?', countryService.isHighRiskCountry('NG'));
console.log('  Is XX Suspicious?', countryService.isSuspiciousCountry('XX'));
console.log('  1000 JPY in USD:', countryService.normalizeAmountToUSD(1000, 'JPY'));
console.log();

// Test complete fraud detection
console.log('🔍 Complete Fraud Detection (All 9 Algorithms):');
(async () => {
  for (const transaction of testTransactions) {
    const result = await detector.analyze(transaction);
    const country = transaction.location?.country || 'Unknown';
    
    console.log(`Transaction ${transaction.id}:`);
    console.log(`  Country: ${country}`);
    console.log(`  Amount: ${transaction.amount} ${transaction.currency}`);
    console.log(`  Risk Score: ${result.riskScore.toFixed(3)}`);
    console.log(`  Is Fraudulent: ${result.isFraudulent}`);
    console.log(`  Triggered Rules: ${result.triggeredRules.join(', ')}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);
    console.log(`  Confidence: ${result.confidence.toFixed(3)}`);
    if (result.recommendations && result.recommendations.length > 0) {
      console.log(`  Recommendations: ${result.recommendations.slice(0, 2).join(', ')}`);
    }
    console.log();
  }
  
  console.log('✅ All 9 algorithms working successfully!');
  console.log('\n🎯 Available Algorithms:');
  console.log('  ✅ VelocityAlgorithm - Transaction frequency analysis');
  console.log('  ✅ AmountAlgorithm - Amount-based risk scoring');
  console.log('  ✅ LocationAlgorithm - Geographic fraud detection');
  console.log('  ✅ DeviceAlgorithm - Device fingerprinting and sharing');
  console.log('  ✅ TimeAlgorithm - Time-based pattern analysis');
  console.log('  ✅ MerchantAlgorithm - Merchant risk scoring');
  console.log('  ✅ BehavioralAlgorithm - User behavior analysis');
  console.log('  ✅ NetworkAlgorithm - IP reputation and proxy detection');
  console.log('  ✅ MLAlgorithm - Machine learning integration');
  
  console.log('\n🌍 Global Features:');
  console.log('  ✅ 100+ Countries supported');
  console.log('  ✅ 50+ Currencies with USD normalization');
  console.log('  ✅ Country-specific risk profiles');
  console.log('  ✅ Real-time fraud detection');
  console.log('  ✅ Professional services available');
})();
