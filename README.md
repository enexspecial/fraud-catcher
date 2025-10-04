# 🌍 FraudCatcher - Global Fraud Detection Framework

[![npm version](https://badge.fury.io/js/fraud-catcher.svg)](https://badge.fury.io/js/fraud-catcher)
[![Python version](https://img.shields.io/pypi/v/fraud-catcher.svg)](https://pypi.org/project/fraud-catcher/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive fraud detection framework supporting **100+ countries** and **50+ currencies**. Detect fraud globally with our open-source framework and professional implementation services.

## ✨ What's Included (Free)

- ✅ **9 Fraud Detection Algorithms** - Complete framework
- ✅ **Global Country Support** - 100+ countries with risk profiles
- ✅ **Multi-Currency Handling** - 50+ currencies with USD normalization
- ✅ **Cross-Platform** - Node.js, Python, PHP, and Go
- ✅ **Zero Dependencies** - Works out of the box
- ✅ **TypeScript Support** - Full type safety
- ✅ **Easy Integration** - Simple API, clear documentation

## 🚀 Quick Start

### Node.js
```bash
npm install fraud-catcher
```

```typescript
import { FraudDetector } from 'fraud-catcher';

const detector = new FraudDetector({
  rules: ['velocity', 'amount', 'location', 'network'],
  thresholds: {
    velocity: 0.8,
    amount: 0.9,
    location: 0.7,
    network: 0.6
  },
  globalThreshold: 0.7
});

const transaction = {
  id: 'tx_123',
  userId: 'user_123',
  amount: 1000,
  currency: 'USD',
  timestamp: new Date(),
  location: { lat: 40.7128, lng: -74.0060, country: 'US' },
  ipAddress: '192.168.1.1'
};

const result = await detector.analyze(transaction);
console.log(result.riskScore); // 0.0-1.0
console.log(result.isFraudulent); // boolean
```

### Python
```bash
pip install fraud-catcher
```

```python
from fraud_catcher import FraudDetector

detector = FraudDetector({
    'rules': ['velocity', 'amount', 'location', 'network'],
    'thresholds': {
        'velocity': 0.8,
        'amount': 0.9,
        'location': 0.7,
        'network': 0.6
    },
    'global_threshold': 0.7
})

transaction = {
    'id': 'tx_123',
    'user_id': 'user_123',
    'amount': 1000,
    'currency': 'USD',
    'timestamp': datetime.now(),
    'location': {'lat': 40.7128, 'lng': -74.0060, 'country': 'US'},
    'ip_address': '192.168.1.1'
}

result = detector.analyze(transaction)
print(result.risk_score)  # 0.0-1.0
print(result.is_fraudulent)  # boolean
```

## 🌍 Global Country Support

### 100+ Countries Supported
- **Low Risk**: US, CA, GB, DE, FR, JP, SG, AU, etc.
- **Medium Risk**: MX, IT, ES, CN, IN, TH, MY, etc.
- **High Risk**: BR, RU, TR, ID, PH, ZA, EG, etc.
- **Very High Risk**: NG, PK, BD, VE, XX, ZZ, etc.

### Multi-Currency Support
- **Major Currencies**: USD, EUR, GBP, JPY, CAD, AUD, CHF
- **Asian Currencies**: CNY, INR, KRW, SGD, HKD, TWD, THB, MYR
- **European Currencies**: SEK, NOK, DKK, PLN, CZK, HUF
- **And 30+ more currencies**

### Country Risk Assessment
```typescript
import { CountryService } from 'fraud-catcher';

const countryService = new CountryService();

// Get country information
const country = countryService.getCountry('US');
console.log(country.riskLevel); // 'low'
console.log(country.fraudIndex); // 0.2

// Check risk levels
console.log(countryService.isHighRiskCountry('NG')); // true (Nigeria)
console.log(countryService.isSuspiciousCountry('XX')); // true (Unknown/Proxy)

// Currency handling
console.log(countryService.normalizeAmountToUSD(1000, 'JPY')); // ~7 USD
```

## 🔧 Professional Services

Need production-ready features? We offer professional implementation services:

### 🚀 Implementation Services
- **Complete ML Pipeline**: $2K-5K
- **Database Integration**: $1K-3K
- **API Integrations**: $1K-2K
- **Production Deployment**: $5K-15K
- **Custom Development**: $200-500/hour

### 📚 Support Services
- **Implementation Support**: $99/month
- **Code Reviews**: $199/month
- **Custom Development**: $299/month
- **Training Sessions**: $2000/session

## 🎯 Perfect For

- **E-commerce Platforms** - Detect fraudulent orders
- **Payment Processors** - Real-time fraud screening
- **Fintech Startups** - Build fraud detection into your app
- **SaaS Applications** - Protect your users from fraud
- **Any Business** - Handling online transactions

## 📊 Algorithm Overview

| Algorithm | Description | Global Support |
|-----------|-------------|----------------|
| **Velocity** | Transaction frequency analysis | ✅ Country-specific thresholds |
| **Amount** | Amount-based risk scoring | ✅ Multi-currency support |
| **Location** | Geographic fraud detection | ✅ 100+ countries |
| **Network** | IP reputation and proxy detection | ✅ Global IP analysis |
| **Device** | Device fingerprinting and sharing | ✅ Cross-platform |
| **Time** | Time-based pattern analysis | ✅ Timezone support |
| **Merchant** | Merchant risk scoring | ✅ Global merchant data |
| **Behavioral** | User behavior analysis | ✅ Pattern recognition |
| **ML** | Machine learning integration | ✅ Advanced features available |

## 🌟 Why Choose FraudCatcher?

### ✅ **For Developers**
- **Complete Framework** - Ready to implement
- **No Vendor Lock-in** - Full source code access
- **Active Community** - Open source with support
- **Easy Integration** - Simple API, clear docs

### ✅ **For Businesses**
- **Professional Services** - Get production-ready features
- **Global Coverage** - Works anywhere in the world
- **Transparent Pricing** - Know exactly what you're paying
- **Proven Patterns** - Based on industry best practices

## 📚 Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [API Reference](docs/API.md)
- [Usage Examples](docs/USAGE.md)
- [Country Support](COUNTRY_SUPPORT.md)
- [Architecture Overview](ARCHITECTURE.md)

## 🚀 Examples

See the [examples/](examples/) directory for comprehensive usage examples:

- [Basic Usage](examples/node_example.js) - Node.js
- [Python Example](examples/python_example.py) - Python
- [Country Support](examples/country_usage_example.ts) - Global features
- [Comprehensive Demo](examples/comprehensive_example.js) - Full features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 📞 Support

- **Documentation**: [Full docs](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Professional Services**: [Contact us](mailto:support@fraud-catcher.com)
- **Community**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**🌍 Detect fraud globally with confidence!**

*Built with ❤️ by developers who understand fraud detection*