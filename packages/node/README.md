# Fraud Catcher

A comprehensive fraud detection library for Node.js and TypeScript applications.

## Features

- **Real-time Fraud Detection**: Analyze transactions in real-time with configurable rules
- **Multiple Detection Algorithms**: Amount, time, location, device, and velocity-based detection
- **TypeScript Support**: Full TypeScript definitions included
- **Configurable Thresholds**: Customize risk thresholds for different detection rules
- **High Performance**: Optimized for production use with minimal latency
- **Easy Integration**: Simple API that integrates seamlessly into existing applications

## Installation

```bash
npm install fraud-catcher
```

## Quick Start

```typescript
import { FraudDetector, Transaction } from 'fraud-catcher';

// Initialize the fraud detector
const detector = new FraudDetector({
  rules: ['amount', 'time', 'location', 'device'],
  thresholds: {
    amount: 0.9,
    time: 0.5,
    location: 0.7,
    device: 0.6
  },
  globalThreshold: 0.7,
  enableLogging: false
});

// Analyze a transaction
const transaction: Transaction = {
  id: 'tx_001',
  userId: 'user_123',
  amount: 1000,
  currency: 'USD',
  timestamp: new Date(),
  location: {
    lat: 40.7128,
    lng: -74.0060,
    country: 'US'
  },
  deviceId: 'device_456',
  ipAddress: '192.168.1.1'
};

const result = await detector.analyze(transaction);

console.log('Risk Score:', result.riskScore);
console.log('Is Fraudulent:', result.isFraudulent);
console.log('Triggered Rules:', result.triggeredRules);
```

## Configuration

### FraudDetectorConfig

```typescript
interface FraudDetectorConfig {
  rules: string[];                    // Detection rules to enable
  thresholds: Record<string, number>; // Risk thresholds for each rule
  globalThreshold: number;            // Overall fraud threshold
  enableLogging: boolean;             // Enable debug logging
  customRules?: any[];                // Custom detection rules
}
```

### Available Rules

- **amount**: Detects suspicious transaction amounts
- **time**: Identifies transactions during suspicious hours
- **location**: Flags transactions from suspicious locations
- **device**: Detects missing or suspicious device information
- **velocity**: Analyzes transaction frequency patterns

## Transaction Interface

```typescript
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  timestamp: Date | string;
  location?: {
    lat: number;
    lng: number;
    country?: string;
    city?: string;
    state?: string;
  };
  merchantId?: string;
  merchantCategory?: string;
  paymentMethod?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}
```

## Fraud Result

```typescript
interface FraudResult {
  transactionId: string;
  riskScore: number;           // 0-1 risk score
  isFraudulent: boolean;       // Whether transaction is flagged as fraud
  isFraud: boolean;            // Alias for isFraudulent
  confidence: number;          // Confidence level (0-1)
  triggeredRules: string[];    // Rules that were triggered
  processingTime: number;      // Processing time in milliseconds
  timestamp: Date;             // Analysis timestamp
  details: {
    algorithm: string;
    processingTime: number;
    timestamp: Date;
  };
  recommendations?: string[];  // Fraud prevention recommendations
}
```

## Examples

### Basic Usage

```typescript
import { FraudDetector, Transaction } from 'fraud-catcher';

const detector = new FraudDetector({
  rules: ['amount', 'time'],
  thresholds: { amount: 0.8, time: 0.6 },
  globalThreshold: 0.7,
  enableLogging: true
});

const transaction: Transaction = {
  id: 'tx_001',
  userId: 'user_123',
  amount: 5000,
  currency: 'USD',
  timestamp: new Date()
};

const result = await detector.analyze(transaction);
```

### High-Risk Transaction Detection

```typescript
const highRiskTransaction: Transaction = {
  id: 'tx_002',
  userId: 'user_456',
  amount: 15000,                    // High amount
  currency: 'USD',
  timestamp: new Date(2024, 0, 1, 2, 0, 0), // 2 AM
  location: {
    lat: 40.7128,
    lng: -74.0060,
    country: 'XX'                   // Suspicious country
  }
  // No device ID (suspicious)
};

const result = await detector.analyze(highRiskTransaction);
// result.riskScore will be high
// result.isFraudulent will be true
// result.triggeredRules will include multiple rules
```

## Performance

- **Processing Time**: Typically under 10ms per transaction
- **Memory Usage**: Minimal memory footprint
- **Concurrency**: Supports high-concurrency scenarios
- **Scalability**: Designed for production-scale applications

## Requirements

- Node.js >= 14.0.0
- TypeScript >= 4.0.0 (for TypeScript projects)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/enexspecial/fraud-catcher/issues)
- Documentation: [Full documentation](https://github.com/enexspecial/fraud-catcher#readme)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.
