# 🌍 Global Country Support

FraudCatcher now includes comprehensive global country support with 100+ countries, risk profiling, currency handling, and regional analysis.

## 🎯 Features

### ✅ **Complete Country Database**
- **100+ Countries**: Full ISO 3166-1 alpha-2 country codes
- **Risk Profiling**: Low, Medium, High, Very High risk levels
- **Currency Support**: 50+ currencies with USD normalization
- **Regional Grouping**: 8 geographic regions
- **Timezone Support**: Primary timezone for each country
- **Language Detection**: Primary language for each country

### ✅ **Advanced Risk Assessment**
- **Country Risk Scores**: 0-1 fraud risk index per country
- **Dynamic Risk Adjustment**: Real-time risk profile updates
- **Regional Analysis**: Risk patterns by geographic region
- **Economic Development**: Developed vs developing country classification

### ✅ **Currency & Amount Handling**
- **Multi-Currency Support**: 50+ currencies with real exchange rates
- **USD Normalization**: Automatic conversion to USD equivalent
- **Country-Specific Thresholds**: Risk thresholds adjusted by country
- **Amount Risk Scaling**: Higher amounts = higher risk for high-risk countries

## 🚀 Quick Start

### Basic Usage

```typescript
import { CountryService } from 'fraud-catcher';

const countryService = new CountryService();

// Get country information
const country = countryService.getCountry('US');
console.log(country.name); // "United States"
console.log(country.riskLevel); // "low"
console.log(country.fraudIndex); // 0.2

// Check risk levels
console.log(countryService.isHighRiskCountry('NG')); // true (Nigeria)
console.log(countryService.isSuspiciousCountry('XX')); // true (Unknown/Proxy)

// Currency handling
console.log(countryService.getCurrencyForCountry('JP')); // "JPY"
console.log(countryService.normalizeAmountToUSD(1000, 'JPY')); // ~7 USD
```

### Fraud Detection with Country Support

```typescript
import { FraudDetector } from 'fraud-catcher';

const detector = new FraudDetector({
  rules: ['location', 'amount', 'network'],
  thresholds: {
    location: 0.7,
    amount: 0.8,
    network: 0.6
  },
  globalThreshold: 0.6
});

const transaction = {
  id: 'tx_001',
  userId: 'user_001',
  amount: 1000,
  currency: 'USD',
  timestamp: new Date(),
  location: { 
    lat: 40.7128, 
    lng: -74.0060, 
    country: 'US' 
  },
  ipAddress: '192.168.1.1'
};

const result = await detector.analyze(transaction);
console.log(result.riskScore); // 0.0-1.0
console.log(result.isFraudulent); // boolean
```

## 📊 Country Risk Levels

### **Very High Risk Countries**
- **XX, ZZ**: Unknown/Proxy/Suspicious
- **Nigeria (NG)**: 0.8 fraud index
- **Pakistan (PK)**: 0.85 fraud index
- **Bangladesh (BD)**: 0.8 fraud index
- **Venezuela (VE)**: 0.9 fraud index

### **High Risk Countries**
- **Brazil (BR)**: 0.6 fraud index
- **Russia (RU)**: 0.7 fraud index
- **Turkey (TR)**: 0.65 fraud index
- **Indonesia (ID)**: 0.7 fraud index
- **Philippines (PH)**: 0.75 fraud index

### **Medium Risk Countries**
- **Mexico (MX)**: 0.4 fraud index
- **China (CN)**: 0.45 fraud index
- **India (IN)**: 0.5 fraud index
- **Thailand (TH)**: 0.4 fraud index
- **Malaysia (MY)**: 0.35 fraud index

### **Low Risk Countries**
- **United States (US)**: 0.2 fraud index
- **Canada (CA)**: 0.15 fraud index
- **United Kingdom (GB)**: 0.18 fraud index
- **Germany (DE)**: 0.12 fraud index
- **Japan (JP)**: 0.1 fraud index
- **Singapore (SG)**: 0.08 fraud index

## 💰 Currency Support

### **Supported Currencies**
- **Major Currencies**: USD, EUR, GBP, JPY, CAD, AUD, CHF
- **Asian Currencies**: CNY, INR, KRW, SGD, HKD, TWD, THB, MYR, IDR, PHP, VND
- **European Currencies**: SEK, NOK, DKK, PLN, CZK, HUF, RON, BGN
- **Middle Eastern**: AED, SAR, QAR, KWD, BHD, OMR, JOD, ILS
- **African Currencies**: ZAR, NGN, EGP, KES, GHS, MAD, TND
- **South American**: BRL, ARS, CLP, COP, PEN, VES, UYU

### **Currency Normalization**
```typescript
// Automatic USD conversion
const usdAmount = countryService.normalizeAmountToUSD(1000, 'JPY'); // ~7 USD
const eurAmount = countryService.normalizeAmountToUSD(100, 'EUR'); // ~110 USD

// Get currency multiplier
const jpyMultiplier = countryService.getCurrencyMultiplier('JPY'); // 0.007
const eurMultiplier = countryService.getCurrencyMultiplier('EUR'); // 1.1
```

## 🌏 Regional Analysis

### **Geographic Regions**
- **North America**: US, CA, MX
- **Europe**: GB, DE, FR, IT, ES, NL, SE, NO, CH, etc.
- **Asia**: JP, KR, CN, IN, SG, HK, TW, TH, MY, etc.
- **Oceania**: AU, NZ
- **Middle East**: AE, SA, QA, KW, BH, OM, JO, IL
- **Africa**: ZA, EG, KE, GH, MA, TN, NG, etc.
- **South America**: BR, AR, CL, CO, PE, VE, etc.
- **Central America**: GT, HN, SV, NI, CR, PA
- **Caribbean**: CU, JM, HT, DO, PR, TT, BB

### **Regional Risk Analysis**
```typescript
// Get countries by region
const europeanCountries = countryService.getCountriesByRegion('Europe');
const asianCountries = countryService.getCountriesByRegion('Asia');

// Get risk statistics
const stats = countryService.getCountryStatistics();
console.log('Total Countries:', stats.total); // 100+
console.log('By Risk Level:', stats.byRiskLevel);
console.log('By Region:', stats.byRegion);
```

## 🔍 Advanced Features

### **Search & Discovery**
```typescript
// Search countries
const unitedCountries = countryService.searchCountries('United');
const asianCountries = countryService.searchCountries('Asia');

// Find similar risk countries
const similarToUS = countryService.getSimilarRiskCountries('US', 5);
const similarToNigeria = countryService.getSimilarRiskCountries('NG', 5);
```

### **Comprehensive Risk Calculation**
```typescript
const riskScore = countryService.calculateComprehensiveRiskScore('NG', {
  isProxy: true,      // +0.3 risk
  isVPN: false,       // +0.2 risk
  isTor: false,       // +0.4 risk
  velocity: 15,       // +0.2 risk (high velocity)
  amount: 50000       // +0.3 risk (high amount in high-risk country)
});
```

### **Dynamic Risk Updates**
```typescript
// Update country risk profile
countryService.updateCountryRiskProfile('NG', {
  fraudRisk: 0.9,
  chargebackRate: 0.8,
  suspiciousActivity: 0.7,
  regulatoryRisk: 0.6
});

// Get updated profile
const updatedProfile = countryService.getUpdatedRiskProfile('NG');
```

## 🎯 Algorithm Integration

### **LocationAlgorithm**
- Country risk assessment
- International transaction detection
- Regional pattern analysis
- Suspicious country identification

### **NetworkAlgorithm**
- IP geolocation validation
- Country-based IP reputation
- Proxy/VPN detection by country
- Regional network analysis

### **AmountAlgorithm**
- Country-specific amount thresholds
- Currency normalization
- Risk-adjusted thresholds
- High-risk country amount scaling

## 📈 Business Value

### **For Developers**
- **Complete Framework**: Ready-to-use country support
- **No External Dependencies**: Self-contained country database
- **Type Safety**: Full TypeScript support
- **Easy Integration**: Simple API for all algorithms

### **For Businesses**
- **Global Coverage**: Support for worldwide transactions
- **Accurate Risk Assessment**: Country-specific fraud detection
- **Currency Support**: Multi-currency transaction handling
- **Compliance Ready**: Regional regulatory compliance

## 🚀 Professional Services

### **Country Customization** ($500-1500)
- Custom country risk profiles
- Regional threshold adjustment
- Currency exchange rate updates
- Local compliance requirements

### **Advanced Integration** ($1000-3000)
- Real-time IP geolocation
- External risk data sources
- Custom risk algorithms
- Performance optimization

### **Complete Implementation** ($2000-5000)
- Full country support setup
- Custom risk models
- Real-time data integration
- Ongoing maintenance

## 📚 Examples

See `examples/country_usage_example.ts` for comprehensive usage examples.

## 🔧 Configuration

```typescript
// Custom country configuration
const customConfig = {
  // Override default risk scores
  customRiskScores: {
    'US': 0.1,  // Lower risk for US
    'NG': 0.9   // Higher risk for Nigeria
  },
  
  // Custom currency multipliers
  customCurrencyMultipliers: {
    'BTC': 50000,  // Bitcoin
    'ETH': 3000    // Ethereum
  },
  
  // Regional risk adjustments
  regionalAdjustments: {
    'Europe': 0.9,    // 10% lower risk
    'Africa': 1.2     // 20% higher risk
  }
};
```

## 🎉 Getting Started

1. **Install the package**
   ```bash
   npm install fraud-catcher
   ```

2. **Import and use**
   ```typescript
   import { CountryService, FraudDetector } from 'fraud-catcher';
   ```

3. **Start detecting fraud globally**
   ```typescript
   const countryService = new CountryService();
   const detector = new FraudDetector({ /* config */ });
   ```

## 📞 Support

Need help with country support implementation?

- **Documentation**: [Full API docs](docs/api.md)
- **Examples**: [Usage examples](examples/)
- **Professional Services**: [Contact us](mailto:support@fraud-catcher.com)
- **Community**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**🌍 Detect fraud globally with confidence!**
