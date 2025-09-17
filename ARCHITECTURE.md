# FraudCatcher Architecture

## Overview

FraudCatcher is a comprehensive fraud detection library designed to work across multiple platforms (Node.js and Python) while sharing core detection logic. The architecture is built with modularity, extensibility, and performance in mind.

## Core Architecture

### Shared Core Logic (`/core/`)

The core directory contains the shared business logic that powers both the Node.js and Python packages:

```
core/
├── models/
│   └── Transaction.ts          # Data models and interfaces
├── algorithms/
│   ├── VelocityAlgorithm.ts    # Transaction velocity detection
│   ├── AmountAlgorithm.ts      # Amount-based fraud detection
│   └── LocationAlgorithm.ts    # Location-based fraud detection
└── FraudDetector.ts            # Main orchestrator class
```

### Package Structure

#### Node.js Package (`/packages/node/`)
- **Language**: TypeScript
- **Build System**: TypeScript compiler
- **Testing**: Jest
- **Linting**: ESLint with TypeScript rules
- **Package Manager**: npm

#### Python Package (`/packages/python/`)
- **Language**: Python 3.8+
- **Build System**: setuptools + pyproject.toml
- **Testing**: pytest
- **Linting**: flake8, black, isort, mypy
- **Package Manager**: pip

## Detection Algorithms

### 1. Velocity Algorithm
**Purpose**: Detects unusual transaction frequency patterns

**Key Features**:
- Time-window based analysis
- Transaction count and amount thresholds
- Memory-efficient history management
- Configurable time windows

**Configuration**:
```typescript
{
  timeWindow: 60,        // minutes
  maxTransactions: 10,   // max transactions in window
  maxAmount: 5000        // max total amount in window
}
```

### 2. Amount Algorithm
**Purpose**: Identifies suspicious transaction amounts

**Key Features**:
- Currency-aware normalization
- Multi-tier risk scoring
- Configurable thresholds
- Support for multiple currencies

**Configuration**:
```typescript
{
  suspiciousThreshold: 1000,    // USD
  highRiskThreshold: 5000,      // USD
  currencyMultipliers: {        // Currency conversion rates
    'USD': 1,
    'EUR': 1.1,
    'GBP': 1.3,
    'JPY': 0.007
  }
}
```

### 3. Location Algorithm
**Purpose**: Detects impossible or suspicious travel patterns

**Key Features**:
- Haversine distance calculation
- Time-based travel validation
- Geo-fencing support
- Trusted location whitelisting

**Configuration**:
```typescript
{
  maxDistanceKm: 1000,          // Impossible travel distance
  suspiciousDistanceKm: 100,    // Suspicious travel distance
  timeWindowMinutes: 60,        // Analysis time window
  enableGeoFencing: false,      // Enable trusted locations
  trustedLocations: []          // Array of trusted locations
}
```

## Data Flow

1. **Transaction Input**: User provides transaction data
2. **Rule Processing**: Each enabled rule processes the transaction
3. **Algorithm Execution**: Individual algorithms calculate risk scores
4. **Score Aggregation**: Weighted combination of algorithm scores
5. **Decision Making**: Compare against global threshold
6. **Result Generation**: Return comprehensive fraud analysis

## Configuration System

### Rule Configuration
```typescript
interface DetectionRule {
  name: string;           // Algorithm identifier
  weight: number;         // 0.0 - 1.0, influence on final score
  threshold: number;      // 0.0 - 1.0, rule-specific threshold
  enabled: boolean;       // Whether rule is active
  config?: object;        // Algorithm-specific configuration
}
```

### Global Configuration
```typescript
interface FraudDetectorConfig {
  rules: string[];                    // Enabled rule names
  thresholds: Record<string, number>; // Rule-specific thresholds
  globalThreshold: number;            // Final decision threshold
  enableLogging: boolean;             // Enable debug logging
  customRules?: DetectionRule[];      // Additional custom rules
}
```

## Performance Considerations

### Memory Management
- **Transaction History**: Automatic cleanup of old transactions
- **Location History**: Time-window based pruning
- **Algorithm State**: Stateless design where possible

### Computational Efficiency
- **Distance Calculations**: Optimized Haversine formula
- **Score Caching**: Avoid redundant calculations
- **Batch Processing**: Support for multiple transactions

### Scalability
- **Horizontal Scaling**: Stateless algorithms
- **Caching**: Redis integration ready
- **Async Processing**: Non-blocking operations

## Extensibility

### Adding New Algorithms
1. Implement algorithm class with `analyze()` method
2. Add configuration interface
3. Register in FraudDetector constructor
4. Create corresponding rule configuration

### Custom Rules
```typescript
const customRule: DetectionRule = {
  name: 'custom_rule',
  weight: 0.2,
  threshold: 0.8,
  enabled: true,
  config: { /* custom parameters */ }
};
```

## Security Considerations

### Data Privacy
- **No Persistent Storage**: Algorithms don't store sensitive data
- **Memory Cleanup**: Automatic cleanup of transaction history
- **Configurable Retention**: Customizable data retention periods

### Input Validation
- **Type Safety**: Strong typing in TypeScript
- **Data Sanitization**: Input validation and sanitization
- **Error Handling**: Graceful error handling and logging

## Testing Strategy

### Unit Tests
- **Algorithm Tests**: Individual algorithm functionality
- **Integration Tests**: End-to-end fraud detection
- **Edge Cases**: Boundary conditions and error scenarios

### Performance Tests
- **Load Testing**: High-volume transaction processing
- **Memory Testing**: Memory usage under load
- **Latency Testing**: Response time measurements

## Deployment

### Node.js Package
```bash
npm install fraud-catcher
```

### Python Package
```bash
pip install fraud-catcher
```

### Docker Support
- Multi-stage builds for both packages
- Optimized production images
- Health check endpoints

## Monitoring and Observability

### Metrics
- **Processing Time**: Algorithm execution time
- **Risk Score Distribution**: Score distribution analysis
- **Rule Trigger Rates**: Individual rule performance

### Logging
- **Structured Logging**: JSON-formatted logs
- **Configurable Levels**: Debug, info, warn, error
- **Performance Metrics**: Built-in performance tracking

## Future Enhancements

### Machine Learning Integration
- **ML Algorithm Support**: Integration with scikit-learn
- **Model Training**: Built-in model training capabilities
- **Feature Engineering**: Automated feature extraction

### Advanced Analytics
- **Anomaly Detection**: Statistical anomaly detection
- **Pattern Recognition**: Advanced pattern matching
- **Behavioral Analysis**: User behavior modeling

### Real-time Processing
- **Stream Processing**: Real-time transaction streams
- **Event Sourcing**: Event-driven architecture
- **CQRS**: Command Query Responsibility Segregation
