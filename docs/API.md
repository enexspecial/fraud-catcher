# FraudCatcher API Documentation

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Classes](#core-classes)
- [Data Models](#data-models)
- [Algorithms](#algorithms)
- [Configuration](#configuration)
- [Examples](#examples)
- [Error Handling](#error-handling)
- [Performance](#performance)

## Overview

FraudCatcher provides a comprehensive fraud detection API with 9 advanced algorithms. The library is available for both Node.js (TypeScript) and Python, sharing the same core logic and providing consistent APIs across platforms.

## Installation

### Node.js
```bash
npm install fraud-catcher
```

### Python
```bash
pip install fraud-catcher
```

## Quick Start

### Node.js/TypeScript
```typescript
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
  id: 'tx_123',
  userId: 'user123',
  amount: 1500,
  currency: 'USD',
  timestamp: new Date(),
  location: { lat: 40.7128, lng: -74.0060, country: 'US' }
});

console.log(result.riskScore); // 0.0 - 1.0
console.log(result.isFraudulent); // boolean
```

### Python
```python
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
    id='tx_123',
    user_id='user123',
    amount=1500.0,
    currency='USD',
    timestamp=datetime.now(),
    location=Location(lat=40.7128, lng=-74.0060, country='US')
)

result = await detector.analyze(transaction)
print(result.risk_score)  # 0.0 - 1.0
print(result.is_fraudulent)  # boolean
```

## Core Classes

### FraudDetector

The main class for fraud detection analysis.

#### Constructor

**Node.js/TypeScript:**
```typescript
new FraudDetector(config: FraudDetectorConfig)
```

**Python:**
```python
FraudDetector(config: dict)
```

#### Methods

##### `analyze(transaction: Transaction): Promise<FraudResult>`

Analyzes a transaction for fraud risk.

**Parameters:**
- `transaction` (Transaction): The transaction to analyze

**Returns:**
- `Promise<FraudResult>`: Analysis results including risk score and recommendations

**Example:**
```typescript
const result = await detector.analyze(transaction);
console.log(result.riskScore); // 0.0 - 1.0
console.log(result.isFraudulent); // boolean
console.log(result.triggeredRules); // ['velocity', 'amount']
console.log(result.recommendations); // ['Review transaction amount...']
```

##### `getAlgorithmStats(algorithmName: string): object`

Gets statistics for a specific algorithm.

**Parameters:**
- `algorithmName` (string): Name of the algorithm

**Returns:**
- `object`: Algorithm-specific statistics

##### `updateRule(ruleName: string, updates: Partial<DetectionRule>): void`

Updates a detection rule configuration.

**Parameters:**
- `ruleName` (string): Name of the rule to update
- `updates` (Partial<DetectionRule>): Rule updates to apply

**Example:**
```typescript
detector.updateRule('velocity', {
  threshold: 0.9,
  enabled: false
});
```

## Data Models

### Transaction

Represents a financial transaction to be analyzed.

#### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique transaction identifier |
| `userId` | string | Yes | User who initiated the transaction |
| `amount` | number | Yes | Transaction amount |
| `currency` | string | Yes | Currency code (e.g., 'USD', 'EUR') |
| `timestamp` | Date/string | Yes | Transaction timestamp |
| `location` | Location | No | Geographic location |
| `merchantId` | string | No | Merchant identifier |
| `merchantCategory` | string | No | Merchant category |
| `paymentMethod` | string | No | Payment method used |
| `deviceId` | string | No | Device identifier |
| `ipAddress` | string | No | IP address |
| `userAgent` | string | No | User agent string |
| `metadata` | object | No | Additional metadata |

#### Example

```typescript
const transaction: Transaction = {
  id: 'tx_123',
  userId: 'user123',
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
  deviceId: 'device_789',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  metadata: {
    cardLast4: '1234',
    cardType: 'visa'
  }
};
```

### Location

Represents a geographic location.

#### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `lat` | number | Yes | Latitude |
| `lng` | number | Yes | Longitude |
| `country` | string | No | Country code |
| `city` | string | No | City name |
| `state` | string | No | State/province |

### FraudResult

Represents the result of fraud analysis.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `transactionId` | string | Transaction identifier |
| `riskScore` | number | Risk score (0.0 - 1.0) |
| `isFraudulent` | boolean | Whether transaction is fraudulent |
| `isFraud` | boolean | Alias for isFraudulent |
| `confidence` | number | Confidence level (0.0 - 1.0) |
| `triggeredRules` | string[] | Rules that were triggered |
| `processingTime` | number | Processing time in milliseconds |
| `recommendations` | string[] | Recommended actions |
| `timestamp` | Date | Analysis timestamp |
| `details` | object | Detailed analysis information |

## Algorithms

### 1. Velocity Algorithm

Detects unusual transaction frequency patterns.

#### Configuration

```typescript
interface VelocityConfig {
  timeWindow: number;        // Analysis window in minutes
  maxTransactions: number;   // Max transactions in window
  maxAmount: number;         // Max total amount in window
}
```

#### Example

```typescript
const velocityConfig: VelocityConfig = {
  timeWindow: 60,        // 1 hour window
  maxTransactions: 10,   // Max 10 transactions
  maxAmount: 5000        // Max $5000 total
};
```

### 2. Amount Algorithm

Identifies suspicious transaction amounts.

#### Configuration

```typescript
interface AmountConfig {
  suspiciousThreshold: number;    // Suspicious amount threshold
  highRiskThreshold: number;      // High risk amount threshold
  currencyMultipliers: Record<string, number>; // Currency conversion rates
}
```

### 3. Location Algorithm

Detects impossible or suspicious travel patterns.

#### Configuration

```typescript
interface LocationConfig {
  maxDistanceKm: number;          // Impossible travel distance
  suspiciousDistanceKm: number;   // Suspicious travel distance
  timeWindowMinutes: number;      // Analysis time window
  enableGeoFencing: boolean;      // Enable trusted locations
  trustedLocations: Location[];   // Array of trusted locations
}
```

### 4. Device Algorithm

Advanced device fingerprinting and sharing detection.

#### Configuration

```typescript
interface DeviceConfig {
  maxDevicesPerUser: number;      // Max devices per user
  suspiciousDeviceThreshold: number; // Suspicious device threshold
  enableFingerprinting: boolean;   // Enable device fingerprinting
  enableSharingDetection: boolean; // Enable device sharing detection
}
```

### 5. Time Algorithm

Detects unusual transaction timing patterns.

#### Configuration

```typescript
interface TimeConfig {
  suspiciousHours: number[];      // Suspicious hours (0-23)
  enableWeekendAnalysis: boolean; // Analyze weekend patterns
  enableHolidayAnalysis: boolean; // Analyze holiday patterns
  timezoneThreshold: number;      // Timezone anomaly threshold
}
```

### 6. Merchant Algorithm

Merchant risk scoring and reputation analysis.

#### Configuration

```typescript
interface MerchantConfig {
  highRiskCategories: string[];   // High-risk merchant categories
  suspiciousMerchants: string[];  // Known suspicious merchants
  trustedMerchants: string[];     // Trusted merchants
  categoryRiskScores: Record<string, number>; // Category risk scores
  merchantVelocityWindow: number; // Velocity analysis window
  maxTransactionsPerMerchant: number; // Max transactions per merchant
}
```

### 7. Behavioral Algorithm

Advanced user behavior pattern recognition.

#### Configuration

```typescript
interface BehavioralConfig {
  enableSpendingPatterns: boolean;    // Enable spending pattern analysis
  enableTransactionTiming: boolean;   // Enable timing pattern analysis
  enableLocationPatterns: boolean;    // Enable location pattern analysis
  enableDevicePatterns: boolean;      // Enable device pattern analysis
  patternHistoryDays: number;         // Pattern history in days
  anomalyThreshold: number;           // Anomaly detection threshold
  enableMachineLearning: boolean;     // Enable ML-based analysis
  learningRate: number;               // ML learning rate
}
```

### 8. Network Algorithm

IP reputation and network security analysis.

#### Configuration

```typescript
interface NetworkConfig {
  enableIPAnalysis: boolean;          // Enable IP reputation analysis
  enableProxyDetection: boolean;      // Enable proxy detection
  enableVPNDetection: boolean;        // Enable VPN detection
  enableTorDetection: boolean;        // Enable Tor detection
  suspiciousCountries: string[];      // Suspicious country codes
  trustedCountries: string[];         // Trusted country codes
  maxConnectionsPerIP: number;        // Max connections per IP
  ipVelocityWindow: number;           // IP velocity analysis window
  enableGeoIPAnalysis: boolean;       // Enable GeoIP analysis
  enableASNAnalysis: boolean;         // Enable ASN analysis
}
```

### 9. Machine Learning Algorithm

ML-powered anomaly detection.

#### Configuration

```typescript
interface MLConfig {
  enableTraining: boolean;            // Enable model training
  modelType: string;                  // Model type ('isolation_forest', 'one_class_svm')
  contamination: number;              // Expected contamination rate
  randomState: number;                // Random state for reproducibility
  features: string[];                 // Features to use for training
  modelPath?: string;                 // Path to saved model
}
```

## Configuration

### FraudDetectorConfig

Main configuration interface for the fraud detector.

#### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `rules` | string[] | Yes | List of enabled algorithm names |
| `thresholds` | Record<string, number> | Yes | Algorithm-specific thresholds |
| `globalThreshold` | number | Yes | Global fraud threshold (0.0 - 1.0) |
| `enableLogging` | boolean | No | Enable debug logging |
| `customRules` | DetectionRule[] | No | Custom detection rules |

#### Example

```typescript
const config: FraudDetectorConfig = {
  rules: ['velocity', 'amount', 'location', 'device'],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7,
    device: 0.8
  },
  globalThreshold: 0.7,
  enableLogging: true,
  customRules: [
    {
      name: 'custom_rule',
      weight: 0.5,
      threshold: 0.8,
      enabled: true,
      config: { customParam: 'value' }
    }
  ]
};
```

### DetectionRule

Configuration for individual detection rules.

#### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Rule name |
| `weight` | number | Yes | Rule weight (0.0 - 1.0) |
| `threshold` | number | Yes | Rule threshold (0.0 - 1.0) |
| `enabled` | boolean | Yes | Whether rule is enabled |
| `config` | object | No | Rule-specific configuration |

## Examples

### Basic Usage

```typescript
import { FraudDetector } from 'fraud-catcher';

const detector = new FraudDetector({
  rules: ['velocity', 'amount'],
  thresholds: { velocity: 0.8, amount: 0.9 },
  globalThreshold: 0.7
});

const result = await detector.analyze({
  id: 'tx_001',
  userId: 'user123',
  amount: 1000,
  currency: 'USD',
  timestamp: new Date()
});

if (result.isFraudulent) {
  console.log('Transaction flagged as fraudulent');
  console.log('Risk score:', result.riskScore);
  console.log('Triggered rules:', result.triggeredRules);
}
```

### Advanced Configuration

```typescript
import { FraudDetector } from 'fraud-catcher';

const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'device', 'behavioral'],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7,
    device: 0.8,
    behavioral: 0.6
  },
  globalThreshold: 0.7,
  enableLogging: true,
  customRules: [
    {
      name: 'high_value_rule',
      weight: 0.3,
      threshold: 0.9,
      enabled: true,
      config: { minAmount: 10000 }
    }
  ]
});
```

### Batch Processing

```typescript
const transactions = [
  { id: 'tx_001', userId: 'user1', amount: 100, currency: 'USD', timestamp: new Date() },
  { id: 'tx_002', userId: 'user2', amount: 5000, currency: 'USD', timestamp: new Date() },
  { id: 'tx_003', userId: 'user3', amount: 50, currency: 'USD', timestamp: new Date() }
];

const results = await Promise.all(
  transactions.map(tx => detector.analyze(tx))
);

results.forEach((result, index) => {
  console.log(`Transaction ${transactions[index].id}: ${result.riskScore}`);
});
```

## Error Handling

### Common Errors

#### InvalidTransactionError
Thrown when transaction data is invalid.

```typescript
try {
  const result = await detector.analyze(invalidTransaction);
} catch (error) {
  if (error instanceof InvalidTransactionError) {
    console.error('Invalid transaction:', error.message);
  }
}
```

#### AlgorithmError
Thrown when an algorithm fails to process.

```typescript
try {
  const result = await detector.analyze(transaction);
} catch (error) {
  if (error instanceof AlgorithmError) {
    console.error('Algorithm error:', error.algorithmName, error.message);
  }
}
```

### Error Types

| Error Type | Description |
|------------|-------------|
| `InvalidTransactionError` | Invalid transaction data |
| `AlgorithmError` | Algorithm processing error |
| `ConfigurationError` | Invalid configuration |
| `TimeoutError` | Processing timeout |

## Performance

### Optimization Tips

1. **Enable Caching**: Use caching for repeated analysis
2. **Batch Processing**: Process multiple transactions together
3. **Selective Algorithms**: Only enable necessary algorithms
4. **Tune Thresholds**: Optimize thresholds for your use case

### Performance Metrics

- **Processing Time**: Typically < 10ms per transaction
- **Memory Usage**: ~50MB for 10,000 transactions
- **Throughput**: 1000+ transactions/second

### Monitoring

```typescript
// Get performance metrics
const metrics = detector.getMetrics();
console.log('Processing time:', metrics.processingTime);
console.log('Cache hit rate:', metrics.cacheHitRate);
console.log('Algorithm performance:', metrics.algorithmPerformance);
```

## Best Practices

1. **Start Simple**: Begin with basic algorithms and add complexity
2. **Tune Thresholds**: Adjust thresholds based on your data
3. **Monitor Performance**: Track metrics and optimize
4. **Handle Errors**: Implement proper error handling
5. **Test Thoroughly**: Test with various transaction types
6. **Update Regularly**: Keep algorithms and models updated

## Support

- **Documentation**: [Full documentation](https://fraud-catcher.readthedocs.io)
- **Issues**: [GitHub Issues](https://github.com/enexspecial/fraud-catcher/issues)
- **Discussions**: [GitHub Discussions](https://github.com/enexspecial/fraud-catcher/discussions)
