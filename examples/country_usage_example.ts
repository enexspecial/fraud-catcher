import { CountryService } from '../core/services/CountryService';
import { FraudDetector } from '../core/FraudDetector';
import { Transaction } from '../core/models/Transaction';

/**
 * Example demonstrating global country support in fraud detection
 */
async function demonstrateCountrySupport() {
  console.log('🌍 Global Country Support Demo\n');

  // Initialize country service
  const countryService = new CountryService();

  // 1. Basic country information
  console.log('1. Basic Country Information:');
  console.log('US:', countryService.getCountry('US'));
  console.log('NG (Nigeria):', countryService.getCountry('NG'));
  console.log('XX (Suspicious):', countryService.getCountry('XX'));
  console.log();

  // 2. Risk assessment
  console.log('2. Risk Assessment:');
  console.log('US Risk Score:', countryService.getCountryRiskScore('US'));
  console.log('Nigeria Risk Score:', countryService.getCountryRiskScore('NG'));
  console.log('Is Nigeria High Risk?', countryService.isHighRiskCountry('NG'));
  console.log('Is XX Suspicious?', countryService.isSuspiciousCountry('XX'));
  console.log();

  // 3. Currency handling
  console.log('3. Currency Handling:');
  console.log('US Currency:', countryService.getCurrencyForCountry('US'));
  console.log('Japan Currency:', countryService.getCurrencyForCountry('JP'));
  console.log('EUR Multiplier:', countryService.getCurrencyMultiplier('EUR'));
  console.log('JPY Multiplier:', countryService.getCurrencyMultiplier('JPY'));
  console.log('1000 JPY in USD:', countryService.normalizeAmountToUSD(1000, 'JPY'));
  console.log();

  // 4. Regional analysis
  console.log('4. Regional Analysis:');
  console.log('North America Countries:', countryService.getCountriesByRegion('North America').length);
  console.log('High Risk Countries:', countryService.getHighRiskCountries().length);
  console.log('Trusted Countries:', countryService.getTrustedCountries().length);
  console.log();

  // 5. Fraud detection with country support
  console.log('5. Fraud Detection with Country Support:');
  
  const detector = new FraudDetector({
    rules: ['location', 'amount', 'network'],
    thresholds: {
      location: 0.7,
      amount: 0.8,
      network: 0.6
    },
    globalThreshold: 0.6
  });

  // Test transactions from different countries
  const testTransactions: Transaction[] = [
    {
      id: 'tx_001',
      userId: 'user_001',
      amount: 1000,
      currency: 'USD',
      timestamp: new Date(),
      location: { lat: 40.7128, lng: -74.0060, country: 'US' },
      ipAddress: '192.168.1.1'
    },
    {
      id: 'tx_002',
      userId: 'user_002',
      amount: 50000, // High amount
      currency: 'NGN',
      timestamp: new Date(),
      location: { lat: 6.5244, lng: 3.3792, country: 'NG' }, // Nigeria
      ipAddress: '192.168.1.2'
    },
    {
      id: 'tx_003',
      userId: 'user_003',
      amount: 100,
      currency: 'USD',
      timestamp: new Date(),
      location: { lat: 0, lng: 0, country: 'XX' }, // Suspicious country
      ipAddress: '192.168.1.3'
    },
    {
      id: 'tx_004',
      userId: 'user_004',
      amount: 1000000, // Very high amount in JPY
      currency: 'JPY',
      timestamp: new Date(),
      location: { lat: 35.6762, lng: 139.6503, country: 'JP' },
      ipAddress: '192.168.1.4'
    }
  ];

  for (const transaction of testTransactions) {
    const result = await detector.analyze(transaction);
    const country = countryService.getCountry(transaction.location?.country || 'XX');
    
    console.log(`Transaction ${transaction.id}:`);
    console.log(`  Country: ${country?.name} (${transaction.location?.country})`);
    console.log(`  Amount: ${transaction.amount} ${transaction.currency}`);
    console.log(`  Risk Score: ${result.riskScore.toFixed(3)}`);
    console.log(`  Is Fraudulent: ${result.isFraudulent}`);
    console.log(`  Risk Level: ${countryService.getRiskLevel(transaction.location?.country || 'XX')}`);
    console.log();
  }

  // 6. Country statistics
  console.log('6. Country Statistics:');
  const stats = countryService.getCountryStatistics();
  console.log('Total Countries:', stats.total);
  console.log('By Risk Level:', stats.byRiskLevel);
  console.log('By Region:', stats.byRegion);
  console.log('Developed Countries:', stats.developed);
  console.log('Developing Countries:', stats.developing);
  console.log();

  // 7. Search functionality
  console.log('7. Search Functionality:');
  console.log('Search "United":', countryService.searchCountries('United').map(c => c.name));
  console.log('Search "Asia":', countryService.searchCountries('Asia').length, 'countries');
  console.log();

  // 8. Similar risk countries
  console.log('8. Similar Risk Countries:');
  console.log('Similar to US:', countryService.getSimilarRiskCountries('US', 3).map(c => c.name));
  console.log('Similar to NG:', countryService.getSimilarRiskCountries('NG', 3).map(c => c.name));
  console.log();

  // 9. Comprehensive risk calculation
  console.log('9. Comprehensive Risk Calculation:');
  const comprehensiveRisk = countryService.calculateComprehensiveRiskScore('NG', {
    isProxy: true,
    isVPN: false,
    isTor: false,
    velocity: 15,
    amount: 50000
  });
  console.log('Nigeria with proxy, high velocity, high amount:', comprehensiveRisk.toFixed(3));
  console.log();

  console.log('✅ Country support demonstration complete!');
}

// Run the demonstration
if (require.main === module) {
  demonstrateCountrySupport().catch(console.error);
}

export { demonstrateCountrySupport };
