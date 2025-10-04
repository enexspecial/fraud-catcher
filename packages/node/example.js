const { FraudDetector, CountryService } = require('./dist/index');

// Create fraud detector
const detector = new FraudDetector({
  rules: ['amount', 'location', 'velocity', 'time', 'device'],
  thresholds: {
    amount: 0.8,
    location: 0.7,
    velocity: 0.6,
    time: 0.5,
    device: 0.4
  },
  globalThreshold: 0.6
});

// Test transactions
const transactions = [
  {
    id: 'tx_001',
    userId: 'user_001',
    amount: 1000,
    currency: 'USD',
    timestamp: new Date(),
    location: { lat: 40.7128, lng: -74.0060, country: 'US' },
    deviceId: 'device_123',
    ipAddress: '192.168.1.1'
  },
  {
    id: 'tx_002',
    userId: 'user_002',
    amount: 50000,
    currency: 'NGN',
    timestamp: new Date(),
    location: { lat: 6.5244, lng: 3.3792, country: 'NG' },
    deviceId: 'device_456',
    ipAddress: '192.168.1.2'
  },
  {
    id: 'tx_003',
    userId: 'user_003',
    amount: 100,
    currency: 'USD',
    timestamp: new Date(),
    location: { lat: 0, lng: 0, country: 'XX' },
    ipAddress: '192.168.1.3'
  }
];

// Test country service
const countryService = new CountryService();
console.log('🌍 Country Service Test:');
console.log('US Risk Score:', countryService.getCountryRiskScore('US'));
console.log('Nigeria Risk Score:', countryService.getCountryRiskScore('NG'));
console.log('Is Nigeria High Risk?', countryService.isHighRiskCountry('NG'));
console.log('Is XX Suspicious?', countryService.isSuspiciousCountry('XX'));
console.log('1000 JPY in USD:', countryService.normalizeAmountToUSD(1000, 'JPY'));
console.log();

// Test fraud detection
console.log('🔍 Fraud Detection Test:');
(async () => {
  for (const transaction of transactions) {
    const result = await detector.analyze(transaction);
    const country = transaction.location?.country || 'Unknown';
    
    console.log(`Transaction ${transaction.id}:`);
    console.log(`  Country: ${country}`);
    console.log(`  Amount: ${transaction.amount} ${transaction.currency}`);
    console.log(`  Risk Score: ${result.riskScore.toFixed(3)}`);
    console.log(`  Is Fraudulent: ${result.isFraudulent}`);
    console.log(`  Triggered Rules: ${result.triggeredRules.join(', ')}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);
    console.log();
  }
  
  console.log('✅ All tests completed successfully!');
})();
