const { FraudDetector } = require('fraud-catcher');

// Initialize the fraud detector
const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location'],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7
  },
  globalThreshold: 0.7,
  enableLogging: true
});

// Example transaction
const transaction = {
  id: 'tx_123456',
  userId: 'user_789',
  amount: 1500,
  currency: 'USD',
  timestamp: new Date(),
  location: {
    lat: 40.7128,
    lng: -74.0060,
    country: 'US',
    city: 'New York',
    state: 'NY'
  },
  merchantId: 'merchant_456',
  merchantCategory: 'electronics',
  paymentMethod: 'credit_card',
  deviceId: 'device_123',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  metadata: {
    cardLast4: '1234',
    cardType: 'visa'
  }
};

// Analyze the transaction
async function analyzeTransaction() {
  try {
    console.log('Analyzing transaction...');
    const result = await detector.analyze(transaction);
    
    console.log('\n=== Fraud Analysis Results ===');
    console.log(`Transaction ID: ${result.transactionId}`);
    console.log(`Risk Score: ${result.riskScore.toFixed(3)}`);
    console.log(`Is Fraudulent: ${result.isFraudulent}`);
    console.log(`Confidence: ${result.confidence.toFixed(3)}`);
    console.log(`Triggered Rules: ${result.triggeredRules.join(', ')}`);
    console.log(`Processing Time: ${result.details.processingTime}ms`);
    
    if (result.recommendations && result.recommendations.length > 0) {
      console.log('\n=== Recommendations ===');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    // Get velocity stats
    const velocityStats = detector.getVelocityStats('user_789', 60);
    console.log('\n=== Velocity Statistics ===');
    console.log(`Transactions in last 60 minutes: ${velocityStats.count}`);
    console.log(`Total amount in last 60 minutes: $${velocityStats.totalAmount}`);
    
  } catch (error) {
    console.error('Error analyzing transaction:', error);
  }
}

// Run the example
analyzeTransaction();
