# FraudCatcher

A comprehensive fraud detection library available for both Node.js and Python. This open source project provides multiple fraud detection algorithms and scoring mechanisms to help identify suspicious activities across various domains.

## Features

- **9 Advanced Algorithms**: Comprehensive fraud detection covering all major attack vectors
- **Cross-platform**: Available for both Node.js and Python
- **Configurable**: Customizable rules, thresholds, and weights
- **Real-time Scoring**: Fast fraud risk assessment with sub-millisecond response times
- **Extensible**: Easy to add custom detection rules and algorithms
- **Type Safe**: Full TypeScript support for Node.js version
- **Machine Learning**: Built-in ML algorithms with automatic retraining
- **Behavioral Analysis**: Advanced user behavior pattern recognition
- **Network Security**: IP reputation, proxy/VPN/Tor detection
- **Device Fingerprinting**: Advanced device identification and sharing detection

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

### Node.js
```typescript
import { FraudDetector } from 'fraud-catcher';

const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'device', 'time', 'merchant', 'behavioral', 'network', 'ml'],
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
  }
});

const result = await detector.analyze({
  id: 'tx_123',
  userId: 'user123',
  amount: 1500,
  currency: 'USD',
  timestamp: new Date(),
  location: { lat: 40.7128, lng: -74.0060, country: 'US' },
  merchantId: 'merchant_456',
  merchantCategory: 'electronics',
  deviceId: 'device_789',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  metadata: {
    screenResolution: '1920x1080',
    timezone: 'America/New_York'
  }
});

console.log(result.riskScore); // 0.0 - 1.0
console.log(result.isFraudulent); // boolean
console.log(result.triggeredRules); // ['amount', 'device', ...]
console.log(result.recommendations); // ['Review transaction amount...', ...]
```

### Python
```python
from fraud_catcher import FraudDetector, Transaction, Location
from datetime import datetime

detector = FraudDetector({
    'rules': ['velocity', 'amount', 'location', 'device', 'time', 'merchant', 'behavioral', 'network', 'ml'],
    'thresholds': {
        'velocity': 0.8,
        'amount': 0.9,
        'location': 0.7,
        'device': 0.8,
        'time': 0.6,
        'merchant': 0.7,
        'behavioral': 0.6,
        'network': 0.8,
        'ml': 0.5
    }
})

transaction = Transaction(
    id='tx_123',
    user_id='user123',
    amount=1500.0,
    currency='USD',
    timestamp=datetime.now(),
    location=Location(lat=40.7128, lng=-74.0060, country='US'),
    merchant_id='merchant_456',
    merchant_category='electronics',
    device_id='device_789',
    ip_address='192.168.1.1',
    user_agent='Mozilla/5.0...',
    metadata={
        'screen_resolution': '1920x1080',
        'timezone': 'America/New_York'
    }
)

result = await detector.analyze(transaction)

print(result.risk_score)  # 0.0 - 1.0
print(result.is_fraudulent)  # boolean
print(result.triggered_rules)  # ['amount', 'device', ...]
print(result.recommendations)  # ['Review transaction amount...', ...]
```

## Detection Algorithms

FraudCatcher includes 9 sophisticated fraud detection algorithms:

### 1. **Velocity Algorithm** 🚀
Detects unusual transaction frequency patterns
- Time-window based analysis
- Transaction count and amount thresholds
- Configurable velocity limits

### 2. **Amount Algorithm** 💰
Identifies suspicious transaction amounts
- Currency-aware normalization
- Multi-tier risk scoring
- Support for multiple currencies

### 3. **Location Algorithm** 🌍
Detects impossible or suspicious travel patterns
- Haversine distance calculation
- Time-based travel validation
- Geo-fencing support

### 4. **Device Algorithm** 📱
Advanced device fingerprinting and sharing detection
- Device fingerprint analysis
- Device sharing patterns
- Device velocity monitoring

### 5. **Time Algorithm** ⏰
Detects unusual transaction timing patterns
- Suspicious hour detection
- Weekend/holiday analysis
- Timezone anomaly detection

### 6. **Merchant Algorithm** 🏪
Merchant risk scoring and reputation analysis
- Category-based risk assessment
- Merchant reputation tracking
- Velocity analysis per merchant

### 7. **Behavioral Algorithm** 🧠
Advanced user behavior pattern recognition
- Spending pattern analysis
- Location behavior tracking
- Timing pattern recognition

### 8. **Network Algorithm** 🌐
IP reputation and network security analysis
- IP reputation checking
- Proxy/VPN/Tor detection
- Geographic IP analysis

### 9. **Machine Learning Algorithm** 🤖
ML-powered anomaly detection
- Ensemble model support
- Automatic feature extraction
- Continuous learning and retraining

## Architecture

This project is structured to support both Node.js and Python packages while sharing core logic:

```
fraudCatcher/
├── core/                    # Shared core logic
│   ├── algorithms/         # 9 fraud detection algorithms
│   ├── models/            # Data models and interfaces
│   └── utils/             # Utility functions
├── packages/
│   ├── node/              # Node.js package
│   └── python/            # Python package
├── docs/                  # Documentation
├── examples/              # Usage examples
└── tests/                 # Shared tests
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/enexspecial/fraud-catcher/issues)
- Documentation: [Full documentation](https://fraud-catcher.readthedocs.io)
