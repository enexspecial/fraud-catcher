# Usage Guide

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Usage](#basic-usage)
- [Advanced Configuration](#advanced-configuration)
- [Algorithm Configuration](#algorithm-configuration)
- [Real-world Examples](#real-world-examples)
- [Best Practices](#best-practices)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Quick Start

The fastest way to get started with FraudCatcher is to use the basic configuration with a few key algorithms:

```typescript
// Node.js/TypeScript
import { FraudDetector } from 'fraud-catcher';

const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location'],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7
  },
  globalThreshold: 0.7
});

const result = await detector.analyze({
  id: 'tx_001',
  userId: 'user123',
  amount: 1000,
  currency: 'USD',
  timestamp: new Date(),
  location: { lat: 40.7128, lng: -74.0060, country: 'US' }
});

console.log('Risk Score:', result.riskScore);
console.log('Is Fraudulent:', result.isFraudulent);
```

```python
# Python
from fraud_catcher import FraudDetector, Transaction, Location
from datetime import datetime

detector = FraudDetector({
    'rules': ['velocity', 'amount', 'location'],
    'thresholds': {
        'velocity': 0.8,
        'amount': 0.9,
        'location': 0.7
    },
    'global_threshold': 0.7
})

transaction = Transaction(
    id='tx_001',
    user_id='user123',
    amount=1000.0,
    currency='USD',
    timestamp=datetime.now(),
    location=Location(lat=40.7128, lng=-74.0060, country='US')
)

result = await detector.analyze(transaction)
print(f'Risk Score: {result.risk_score}')
print(f'Is Fraudulent: {result.is_fraudulent}')
```

## Basic Usage

### 1. Simple Transaction Analysis

```typescript
// Create a basic transaction
const transaction = {
  id: 'tx_001',
  userId: 'user123',
  amount: 500,
  currency: 'USD',
  timestamp: new Date()
};

// Analyze the transaction
const result = await detector.analyze(transaction);

// Check results
if (result.isFraudulent) {
  console.log('🚨 Transaction flagged as fraudulent!');
  console.log('Risk Score:', result.riskScore);
  console.log('Triggered Rules:', result.triggeredRules);
  console.log('Recommendations:', result.recommendations);
} else {
  console.log('✅ Transaction appears legitimate');
}
```

### 2. Batch Processing

```typescript
// Process multiple transactions
const transactions = [
  { id: 'tx_001', userId: 'user1', amount: 100, currency: 'USD', timestamp: new Date() },
  { id: 'tx_002', userId: 'user2', amount: 5000, currency: 'USD', timestamp: new Date() },
  { id: 'tx_003', userId: 'user3', amount: 50, currency: 'USD', timestamp: new Date() }
];

const results = await Promise.all(
  transactions.map(tx => detector.analyze(tx))
);

// Process results
results.forEach((result, index) => {
  const tx = transactions[index];
  console.log(`Transaction ${tx.id}: ${result.riskScore} (${result.isFraudulent ? 'FRAUD' : 'LEGITIMATE'})`);
});
```

### 3. Real-time Processing

```typescript
// Express.js example
import express from 'express';
import { FraudDetector } from 'fraud-catcher';

const app = express();
const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'device'],
  thresholds: { velocity: 0.8, amount: 0.9, location: 0.7, device: 0.8 },
  globalThreshold: 0.7
});

app.post('/api/analyze', async (req, res) => {
  try {
    const result = await detector.analyze(req.body);
    
    res.json({
      success: true,
      riskScore: result.riskScore,
      isFraudulent: result.isFraudulent,
      triggeredRules: result.triggeredRules,
      recommendations: result.recommendations
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});
```

## Advanced Configuration

### 1. Custom Rule Configuration

```typescript
const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location'],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7
  },
  globalThreshold: 0.7,
  enableLogging: true,
  customRules: [
    {
      name: 'high_value_weekend',
      weight: 0.3,
      threshold: 0.9,
      enabled: true,
      config: {
        minAmount: 10000,
        weekendOnly: true
      }
    }
  ]
});
```

### 2. Algorithm-Specific Configuration

```typescript
// Configure individual algorithms
const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'device'],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7,
    device: 0.8
  },
  globalThreshold: 0.7,
  algorithmConfigs: {
    velocity: {
      timeWindow: 60,        // 1 hour window
      maxTransactions: 10,   // Max 10 transactions
      maxAmount: 5000        // Max $5000 total
    },
    amount: {
      suspiciousThreshold: 1000,    // $1000 suspicious
      highRiskThreshold: 5000,      // $5000 high risk
      currencyMultipliers: {
        'USD': 1,
        'EUR': 1.1,
        'GBP': 1.3
      }
    },
    location: {
      maxDistanceKm: 1000,          // Impossible travel
      suspiciousDistanceKm: 100,    // Suspicious travel
      timeWindowMinutes: 60,        // 1 hour window
      enableGeoFencing: true,
      trustedLocations: [
        { lat: 40.7128, lng: -74.0060, country: 'US', city: 'New York' }
      ]
    },
    device: {
      maxDevicesPerUser: 5,         // Max 5 devices per user
      suspiciousDeviceThreshold: 0.8, // 80% suspicious threshold
      enableFingerprinting: true,
      enableSharingDetection: true
    }
  }
});
```

### 3. Dynamic Configuration Updates

```typescript
// Update rules at runtime
detector.updateRule('velocity', {
  threshold: 0.9,  // Increase threshold
  enabled: false   // Disable rule
});

// Add new custom rule
detector.addCustomRule({
  name: 'suspicious_merchant',
  weight: 0.4,
  threshold: 0.8,
  enabled: true,
  config: {
    suspiciousMerchants: ['merchant_001', 'merchant_002']
  }
});
```

## Algorithm Configuration

### 1. Velocity Algorithm

Detects unusual transaction frequency patterns.

```typescript
const velocityConfig = {
  timeWindow: 60,        // Analysis window in minutes
  maxTransactions: 10,   // Max transactions in window
  maxAmount: 5000,       // Max total amount in window
  enableAmountAnalysis: true,
  enableCountAnalysis: true
};

// Usage
const detector = new FraudDetector({
  rules: ['velocity'],
  thresholds: { velocity: 0.8 },
  globalThreshold: 0.7,
  algorithmConfigs: { velocity: velocityConfig }
});
```

### 2. Amount Algorithm

Identifies suspicious transaction amounts.

```typescript
const amountConfig = {
  suspiciousThreshold: 1000,    // $1000 suspicious
  highRiskThreshold: 5000,      // $5000 high risk
  currencyMultipliers: {
    'USD': 1,
    'EUR': 1.1,
    'GBP': 1.3,
    'JPY': 0.007
  },
  enableCurrencyNormalization: true,
  enableHistoricalAnalysis: true
};
```

### 3. Location Algorithm

Detects impossible or suspicious travel patterns.

```typescript
const locationConfig = {
  maxDistanceKm: 1000,          // Impossible travel distance
  suspiciousDistanceKm: 100,    // Suspicious travel distance
  timeWindowMinutes: 60,        // Analysis time window
  enableGeoFencing: true,
  trustedLocations: [
    { lat: 40.7128, lng: -74.0060, country: 'US', city: 'New York' },
    { lat: 37.7749, lng: -122.4194, country: 'US', city: 'San Francisco' }
  ],
  enableTimezoneAnalysis: true,
  enableCountryAnalysis: true
};
```

### 4. Device Algorithm

Advanced device fingerprinting and sharing detection.

```typescript
const deviceConfig = {
  maxDevicesPerUser: 5,         // Max devices per user
  suspiciousDeviceThreshold: 0.8, // 80% suspicious threshold
  enableFingerprinting: true,
  enableSharingDetection: true,
  fingerprintComponents: [
    'userAgent',
    'screenResolution',
    'timezone',
    'language',
    'platform'
  ],
  enableDeviceVelocity: true,
  maxTransactionsPerDevice: 20
};
```

### 5. Behavioral Algorithm

Advanced user behavior pattern recognition.

```typescript
const behavioralConfig = {
  enableSpendingPatterns: true,
  enableTransactionTiming: true,
  enableLocationPatterns: true,
  enableDevicePatterns: true,
  patternHistoryDays: 30,       // 30 days of history
  anomalyThreshold: 0.7,        // 70% anomaly threshold
  enableMachineLearning: false,
  learningRate: 0.01,
  enableRealTimeLearning: false
};
```

## Real-world Examples

### 1. E-commerce Fraud Detection

```typescript
// E-commerce transaction analysis
const ecommerceDetector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'device', 'merchant'],
  thresholds: {
    velocity: 0.7,
    amount: 0.8,
    location: 0.6,
    device: 0.7,
    merchant: 0.8
  },
  globalThreshold: 0.7,
  algorithmConfigs: {
    merchant: {
      highRiskCategories: ['gambling', 'adult', 'cryptocurrency'],
      categoryRiskScores: {
        'electronics': 0.3,
        'grocery': 0.1,
        'travel': 0.6,
        'gambling': 0.8
      }
    }
  }
});

// Analyze e-commerce transaction
const ecommerceTransaction = {
  id: 'ecom_001',
  userId: 'customer_123',
  amount: 2500,
  currency: 'USD',
  timestamp: new Date(),
  location: { lat: 40.7128, lng: -74.0060, country: 'US' },
  merchantId: 'electronics_store_001',
  merchantCategory: 'electronics',
  deviceId: 'device_456',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  metadata: {
    cardLast4: '1234',
    cardType: 'visa',
    screenResolution: '1920x1080',
    timezone: 'America/New_York'
  }
};

const result = await ecommerceDetector.analyze(ecommerceTransaction);
```

### 2. Banking Transaction Monitoring

```typescript
// Banking transaction analysis
const bankingDetector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'time', 'behavioral'],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7,
    time: 0.6,
    behavioral: 0.7
  },
  globalThreshold: 0.8,
  algorithmConfigs: {
    time: {
      suspiciousHours: [0, 1, 2, 3, 4, 5, 22, 23], // Night hours
      enableWeekendAnalysis: true,
      enableHolidayAnalysis: true
    },
    behavioral: {
      enableSpendingPatterns: true,
      enableTransactionTiming: true,
      patternHistoryDays: 90, // 3 months of history
      anomalyThreshold: 0.8
    }
  }
});

// Analyze banking transaction
const bankingTransaction = {
  id: 'bank_001',
  userId: 'account_789',
  amount: 15000,
  currency: 'USD',
  timestamp: new Date('2024-01-15T02:30:00Z'), // 2:30 AM
  location: { lat: 51.5074, lng: -0.1278, country: 'GB' },
  paymentMethod: 'wire_transfer',
  deviceId: 'device_789',
  ipAddress: '10.0.0.1',
  metadata: {
    accountType: 'checking',
    transactionType: 'transfer',
    recipientBank: 'international_bank'
  }
};

const result = await bankingDetector.analyze(bankingTransaction);
```

### 3. Cryptocurrency Exchange Monitoring

```typescript
// Crypto exchange analysis
const cryptoDetector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'device', 'network'],
  thresholds: {
    velocity: 0.9,
    amount: 0.8,
    location: 0.8,
    device: 0.9,
    network: 0.7
  },
  globalThreshold: 0.8,
  algorithmConfigs: {
    network: {
      enableIPAnalysis: true,
      enableProxyDetection: true,
      enableVPNDetection: true,
      enableTorDetection: true,
      suspiciousCountries: ['XX', 'ZZ'],
      trustedCountries: ['US', 'CA', 'GB', 'DE']
    }
  }
});

// Analyze crypto transaction
const cryptoTransaction = {
  id: 'crypto_001',
  userId: 'crypto_user_456',
  amount: 50000,
  currency: 'USD',
  timestamp: new Date(),
  location: { lat: 37.7749, lng: -122.4194, country: 'US' },
  merchantId: 'crypto_exchange_001',
  merchantCategory: 'cryptocurrency',
  deviceId: 'device_123',
  ipAddress: '192.168.1.200',
  metadata: {
    cryptoType: 'bitcoin',
    walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    exchangeRate: 45000
  }
};

const result = await cryptoDetector.analyze(cryptoTransaction);
```

## Best Practices

### 1. Threshold Tuning

```typescript
// Start with conservative thresholds
const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location'],
  thresholds: {
    velocity: 0.9,  // Start high, reduce based on false positives
    amount: 0.95,   // Start high, reduce based on false positives
    location: 0.8   // Start moderate, adjust based on data
  },
  globalThreshold: 0.8
});

// Monitor and adjust based on results
// If too many false positives, lower thresholds
// If missing fraud, raise thresholds
```

### 2. Algorithm Selection

```typescript
// Choose algorithms based on your use case
const ecommerceRules = ['velocity', 'amount', 'location', 'device', 'merchant'];
const bankingRules = ['velocity', 'amount', 'location', 'time', 'behavioral'];
const cryptoRules = ['velocity', 'amount', 'location', 'device', 'network'];

// Start with basic algorithms, add complexity gradually
const basicRules = ['velocity', 'amount'];
const intermediateRules = [...basicRules, 'location', 'device'];
const advancedRules = [...intermediateRules, 'behavioral', 'network', 'ml'];
```

### 3. Error Handling

```typescript
async function analyzeTransactionSafely(transaction) {
  try {
    const result = await detector.analyze(transaction);
    return {
      success: true,
      result: result
    };
  } catch (error) {
    console.error('Analysis failed:', error);
    return {
      success: false,
      error: error.message,
      fallbackResult: {
        riskScore: 0.5, // Default moderate risk
        isFraudulent: false,
        triggeredRules: [],
        recommendations: ['Manual review required due to analysis error']
      }
    };
  }
}
```

### 4. Performance Monitoring

```typescript
// Monitor performance metrics
const startTime = Date.now();
const result = await detector.analyze(transaction);
const processingTime = Date.now() - startTime;

console.log(`Processing time: ${processingTime}ms`);

// Log performance metrics
if (processingTime > 100) {
  console.warn('Slow processing detected:', processingTime);
}

// Get detailed metrics
const metrics = detector.getMetrics();
console.log('Algorithm performance:', metrics.algorithmPerformance);
console.log('Cache hit rate:', metrics.cacheHitRate);
```

## Performance Optimization

### 1. Caching

```typescript
// Enable caching for repeated analysis
const detector = new FraudDetector({
  rules: ['velocity', 'amount'],
  thresholds: { velocity: 0.8, amount: 0.9 },
  globalThreshold: 0.7,
  enableCaching: true,
  cacheConfig: {
    defaultTTL: 300000,  // 5 minutes
    maxSize: 10000,      // 10,000 entries
    cleanupInterval: 60000 // 1 minute cleanup
  }
});
```

### 2. Batch Processing

```typescript
// Process multiple transactions efficiently
async function processBatch(transactions) {
  const batchSize = 100;
  const results = [];
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(tx => detector.analyze(tx))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

### 3. Selective Algorithm Usage

```typescript
// Use only necessary algorithms for better performance
const quickDetector = new FraudDetector({
  rules: ['amount'], // Only amount check for quick screening
  thresholds: { amount: 0.9 },
  globalThreshold: 0.9
});

const fullDetector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'device', 'behavioral'],
  thresholds: { velocity: 0.8, amount: 0.9, location: 0.7, device: 0.8, behavioral: 0.6 },
  globalThreshold: 0.7
});

// Quick screening first, then full analysis if needed
const quickResult = await quickDetector.analyze(transaction);
if (quickResult.riskScore > 0.5) {
  const fullResult = await fullDetector.analyze(transaction);
  return fullResult;
}
return quickResult;
```

## Troubleshooting

### Common Issues

#### 1. High False Positive Rate

```typescript
// Lower thresholds to reduce false positives
const detector = new FraudDetector({
  rules: ['velocity', 'amount'],
  thresholds: {
    velocity: 0.6,  // Lowered from 0.8
    amount: 0.7     // Lowered from 0.9
  },
  globalThreshold: 0.6  // Lowered from 0.7
});
```

#### 2. Missing Fraud Cases

```typescript
// Increase sensitivity to catch more fraud
const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'device'],
  thresholds: {
    velocity: 0.9,  // Increased from 0.8
    amount: 0.95,   // Increased from 0.9
    location: 0.8,  // Increased from 0.7
    device: 0.9     // Increased from 0.8
  },
  globalThreshold: 0.8  // Increased from 0.7
});
```

#### 3. Performance Issues

```typescript
// Optimize for performance
const detector = new FraudDetector({
  rules: ['velocity', 'amount'], // Fewer algorithms
  thresholds: { velocity: 0.8, amount: 0.9 },
  globalThreshold: 0.7,
  enableCaching: true,
  parallelProcessing: true,
  maxConcurrency: 10
});
```

### Debug Mode

```typescript
// Enable debug logging
const detector = new FraudDetector({
  rules: ['velocity', 'amount'],
  thresholds: { velocity: 0.8, amount: 0.9 },
  globalThreshold: 0.7,
  enableLogging: true,
  debugMode: true
});

// Check algorithm scores
const result = await detector.analyze(transaction);
console.log('Algorithm scores:', result.details.algorithmScores);
console.log('Processing time:', result.processingTime);
```

## Next Steps

1. **Read the [API Documentation](API.md)** for detailed API reference
2. **Check out [Examples](examples/)** for more usage patterns
3. **Review [Architecture](ARCHITECTURE.md)** for advanced configuration
4. **Join [Discussions](https://github.com/enexspecial/fraud-catcher/discussions)** for community support
