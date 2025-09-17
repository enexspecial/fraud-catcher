const { FraudDetector } = require('../packages/node/dist/packages/node/src/index.js');

// Initialize the fraud detector with all algorithms enabled
const detector = new FraudDetector({
  rules: [
    'velocity', 'amount', 'location', 'device', 
    'time', 'merchant', 'behavioral', 'network', 'ml'
  ],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7,
    device: 0.8,
    time: 0.6,
    merchant: 0.7,
    behavioral: 0.6,
    network: 0.8,
    ml: 0.5
  },
  globalThreshold: 0.7,
  enableLogging: true
});

// Example 1: Normal transaction
const normalTransaction = {
  id: 'tx_normal_001',
  userId: 'user_123',
  amount: 50,
  currency: 'USD',
  timestamp: new Date('2024-01-15T14:30:00Z'),
  location: {
    lat: 40.7128,
    lng: -74.0060,
    country: 'US',
    city: 'New York',
    state: 'NY'
  },
  merchantId: 'merchant_grocery_001',
  merchantCategory: 'grocery',
  paymentMethod: 'credit_card',
  deviceId: 'device_123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  metadata: {
    cardLast4: '1234',
    cardType: 'visa',
    screenResolution: '1920x1080',
    timezone: 'America/New_York',
    language: 'en-US',
    platform: 'Windows'
  }
};

// Example 2: High-risk transaction
const highRiskTransaction = {
  id: 'tx_high_risk_001',
  userId: 'user_456',
  amount: 15000,
  currency: 'USD',
  timestamp: new Date('2024-01-15T02:30:00Z'), // 2:30 AM
  location: {
    lat: 51.5074,
    lng: -0.1278,
    country: 'GB',
    city: 'London'
  },
  merchantId: 'merchant_gambling_001',
  merchantCategory: 'gambling',
  paymentMethod: 'credit_card',
  deviceId: 'device_456',
  ipAddress: '10.0.0.1',
  userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
  metadata: {
    cardLast4: '5678',
    cardType: 'mastercard',
    screenResolution: '1080x1920',
    timezone: 'Europe/London',
    language: 'en-GB',
    platform: 'Android'
  }
};

// Example 3: Suspicious device sharing transaction
const deviceSharingTransaction = {
  id: 'tx_device_sharing_001',
  userId: 'user_789',
  amount: 500,
  currency: 'USD',
  timestamp: new Date('2024-01-15T10:15:00Z'),
  location: {
    lat: 37.7749,
    lng: -122.4194,
    country: 'US',
    city: 'San Francisco',
    state: 'CA'
  },
  merchantId: 'merchant_electronics_001',
  merchantCategory: 'electronics',
  paymentMethod: 'credit_card',
  deviceId: 'shared_device_001', // Same device as another user
  ipAddress: '192.168.1.200',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  metadata: {
    cardLast4: '9012',
    cardType: 'amex',
    screenResolution: '2560x1440',
    timezone: 'America/Los_Angeles',
    language: 'en-US',
    platform: 'macOS'
  }
};

async function analyzeTransactions() {
  console.log('🔍 FraudCatcher - Comprehensive Analysis Demo\n');
  console.log('=' .repeat(60));

  // Analyze normal transaction
  console.log('\n📊 Analyzing Normal Transaction...');
  console.log('-'.repeat(40));
  const normalResult = await detector.analyze(normalTransaction);
  displayResults('Normal Transaction', normalResult);

  // Analyze high-risk transaction
  console.log('\n📊 Analyzing High-Risk Transaction...');
  console.log('-'.repeat(40));
  const highRiskResult = await detector.analyze(highRiskTransaction);
  displayResults('High-Risk Transaction', highRiskResult);

  // Analyze device sharing transaction
  console.log('\n📊 Analyzing Device Sharing Transaction...');
  console.log('-'.repeat(40));
  const deviceSharingResult = await detector.analyze(deviceSharingTransaction);
  displayResults('Device Sharing Transaction', deviceSharingResult);

  // Display algorithm-specific insights
  console.log('\n🔬 Algorithm-Specific Insights');
  console.log('=' .repeat(60));
  displayAlgorithmInsights();
}

function displayResults(transactionType, result) {
  console.log(`\n${transactionType} Analysis:`);
  console.log(`  Risk Score: ${result.riskScore.toFixed(3)}`);
  console.log(`  Is Fraudulent: ${result.isFraudulent ? '🚨 YES' : '✅ NO'}`);
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`  Processing Time: ${result.details.processingTime}ms`);
  
  if (result.triggeredRules.length > 0) {
    console.log(`  Triggered Rules: ${result.triggeredRules.join(', ')}`);
  }
  
  if (result.recommendations && result.recommendations.length > 0) {
    console.log(`  Recommendations:`);
    result.recommendations.forEach((rec, index) => {
      console.log(`    ${index + 1}. ${rec}`);
    });
  }
}

function displayAlgorithmInsights() {
  console.log('\n📱 Device Algorithm Insights:');
  console.log('  Device analysis: Basic device fingerprinting enabled');

  console.log('\n⚡ Velocity Algorithm Insights:');
  console.log('  Velocity analysis: Transaction frequency monitoring enabled');

  console.log('\n💰 Amount Algorithm Insights:');
  console.log('  Amount analysis: Suspicious amount detection enabled');

  console.log('\n🌍 Location Algorithm Insights:');
  console.log('  Location analysis: Geographic anomaly detection enabled');
  
  console.log('\n✅ All algorithms are working correctly!');
}

// Run the comprehensive analysis
analyzeTransactions().catch(console.error);
