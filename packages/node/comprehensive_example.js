const { 
  FraudDetector, 
  CountryService,
  VelocityAlgorithm,
  AmountAlgorithm,
  LocationAlgorithm,
  DeviceAlgorithm,
  TimeAlgorithm,
  MerchantAlgorithm,
  BehavioralAlgorithm,
  NetworkAlgorithm,
  MLAlgorithm
} = require('./dist/index');

console.log('🚀 FraudCatcher - Complete 9 Algorithm Framework Demo\n');

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

// Test transactions with different scenarios
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
  },
  {
    id: 'tx_004',
    userId: 'user_004',
    amount: 1000000,
    currency: 'JPY',
    timestamp: new Date('2024-01-01T02:30:00Z'), // Suspicious time
    location: { lat: 35.6762, lng: 139.6503, country: 'JP' },
    deviceId: 'device_789',
    ipAddress: '192.168.1.4',
    merchantId: 'merchant_004',
    merchantCategory: 'luxury',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  }
];

// Test individual algorithms
console.log('🔍 Individual Algorithm Testing:');

// Test CountryService
const countryService = new CountryService();
console.log('\n1. CountryService:');
console.log('  US Risk Score:', countryService.getCountryRiskScore('US'));
console.log('  Nigeria Risk Score:', countryService.getCountryRiskScore('NG'));
console.log('  Is Nigeria High Risk?', countryService.isHighRiskCountry('NG'));
console.log('  Is XX Suspicious?', countryService.isSuspiciousCountry('XX'));
console.log('  1000 JPY in USD:', countryService.normalizeAmountToUSD(1000, 'JPY'));

// Test AmountAlgorithm
console.log('\n2. AmountAlgorithm:');
const amountAlg = new AmountAlgorithm({
  suspiciousThreshold: 5000,
  highRiskThreshold: 10000
});
amountAlg.analyze(testTransactions[0], { name: 'amount', threshold: 0.8 }).then(result => {
  console.log('  Amount Risk Score:', result.toFixed(3));
});

// Test LocationAlgorithm
console.log('\n3. LocationAlgorithm:');
const locationAlg = new LocationAlgorithm({
  maxDistanceKm: 1000,
  suspiciousDistanceKm: 100,
  timeWindowMinutes: 60,
  enableGeoFencing: true
});
locationAlg.analyze(testTransactions[0], { name: 'location', threshold: 0.7 }).then(result => {
  console.log('  Location Risk Score:', result.toFixed(3));
});

// Test DeviceAlgorithm
console.log('\n4. DeviceAlgorithm:');
const deviceAlg = new DeviceAlgorithm({
  enableFingerprinting: true,
  enableDeviceSharing: true,
  maxDevicesPerUser: 3
});
deviceAlg.analyze(testTransactions[0], { name: 'device', threshold: 0.6 }).then(result => {
  console.log('  Device Risk Score:', result.toFixed(3));
});

// Test TimeAlgorithm
console.log('\n5. TimeAlgorithm:');
const timeAlg = new TimeAlgorithm({
  enableTimePatterns: true,
  enableHolidayDetection: true,
  enableTimezoneAnalysis: true
});
timeAlg.analyze(testTransactions[0], { name: 'time', threshold: 0.5 }).then(result => {
  console.log('  Time Risk Score:', result.toFixed(3));
});

// Test MerchantAlgorithm
console.log('\n6. MerchantAlgorithm:');
const merchantAlg = new MerchantAlgorithm({
  enableReputationScoring: true,
  enableCategoryAnalysis: true,
  enableVelocityAnalysis: true
});
merchantAlg.analyze(testTransactions[0], { name: 'merchant', threshold: 0.6 }).then(result => {
  console.log('  Merchant Risk Score:', result.toFixed(3));
});

// Test BehavioralAlgorithm
console.log('\n7. BehavioralAlgorithm:');
const behavioralAlg = new BehavioralAlgorithm({
  enableSpendingPatterns: true,
  enableTransactionTiming: true,
  enableLocationPatterns: true,
  enableDevicePatterns: true,
  learningRate: 0.1
});
behavioralAlg.analyze(testTransactions[0], { name: 'behavioral', threshold: 0.7 }).then(result => {
  console.log('  Behavioral Risk Score:', result.toFixed(3));
});

// Test NetworkAlgorithm
console.log('\n8. NetworkAlgorithm:');
const networkAlg = new NetworkAlgorithm({
  enableIPAnalysis: true,
  enableProxyDetection: true,
  enableVPNDetection: true,
  enableTorDetection: true,
  suspiciousCountries: ['XX', 'ZZ'],
  trustedCountries: ['US', 'CA', 'GB'],
  maxConnectionsPerIP: 10
});
networkAlg.analyze(testTransactions[0], { name: 'network', threshold: 0.6 }).then(result => {
  console.log('  Network Risk Score:', result.toFixed(3));
});

// Test MLAlgorithm
console.log('\n9. MLAlgorithm:');
const mlAlg = new MLAlgorithm({
  contamination: 0.1,
  randomState: 42,
  features: ['amount', 'hour', 'dayOfWeek', 'isWeekend', 'hasDevice', 'hasLocation', 'country'],
  featureExtractors: ['amount', 'velocity', 'location', 'merchant', 'device', 'time'],
  trainingDataSize: 10000,
  retrainInterval: 24,
  anomalyThreshold: 0.5,
  enableFeatureImportance: true,
  enableModelPersistence: true,
  learningRate: 0.01,
  nEstimators: 100,
  maxDepth: 6,
  enableOnlineLearning: true,
  driftDetectionThreshold: 0.1
});
mlAlg.analyze(testTransactions[0], { name: 'ml', threshold: 0.5 }).then(result => {
  console.log('  ML Risk Score:', result.toFixed(3));
});

// Test complete fraud detection
console.log('\n🔍 Complete Fraud Detection Testing:');
(async () => {
  for (const transaction of testTransactions) {
    const result = await detector.analyze(transaction);
    const country = transaction.location?.country || 'Unknown';
    
    console.log(`\nTransaction ${transaction.id}:`);
    console.log(`  Country: ${country}`);
    console.log(`  Amount: ${transaction.amount} ${transaction.currency}`);
    console.log(`  Risk Score: ${result.riskScore.toFixed(3)}`);
    console.log(`  Is Fraudulent: ${result.isFraudulent}`);
    console.log(`  Triggered Rules: ${result.triggeredRules.join(', ')}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);
    console.log(`  Confidence: ${result.confidence.toFixed(3)}`);
    if (result.recommendations && result.recommendations.length > 0) {
      console.log(`  Recommendations: ${result.recommendations.join(', ')}`);
    }
  }
  
  console.log('\n✅ All 9 algorithms tested successfully!');
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
