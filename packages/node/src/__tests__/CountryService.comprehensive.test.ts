import { CountryService } from '../core/services/CountryService';

describe('CountryService - Comprehensive Tests', () => {
  let service: CountryService;

  beforeEach(() => {
    service = new CountryService();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Country Lookup', () => {
    it('should get country information by code', () => {
      const country = service.getCountry('US');
      expect(country).toBeDefined();
      expect(country?.code).toBe('US');
      expect(country?.name).toBeDefined();
    });

    it('should handle case insensitive country codes', () => {
      const country1 = service.getCountry('us');
      const country2 = service.getCountry('US');
      const country3 = service.getCountry('Us');
      
      expect(country1).toEqual(country2);
      expect(country2).toEqual(country3);
    });

    it('should return undefined for unknown country codes', () => {
      const country = service.getCountry('UNKNOWN');
      expect(country).toBeUndefined();
    });

    it('should return undefined for empty country code', () => {
      const country = service.getCountry('');
      expect(country).toBeUndefined();
    });
  });

  describe('Risk Assessment', () => {
    it('should get country risk score', () => {
      const riskScore = service.getCountryRiskScore('US');
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(1);
    });

    it('should return default risk score for unknown countries', () => {
      const riskScore = service.getCountryRiskScore('UNKNOWN');
      expect(riskScore).toBe(0.5); // Default medium risk
    });

    it('should identify high risk countries', () => {
      // Test with a known high risk country if available
      const isHighRisk = service.isHighRiskCountry('US');
      expect(typeof isHighRisk).toBe('boolean');
    });

    it('should identify very high risk countries', () => {
      const isVeryHighRisk = service.isVeryHighRiskCountry('US');
      expect(typeof isVeryHighRisk).toBe('boolean');
    });

    it('should identify suspicious countries', () => {
      expect(service.isSuspiciousCountry('XX')).toBe(true);
      expect(service.isSuspiciousCountry('ZZ')).toBe(true);
      expect(service.isSuspiciousCountry('US')).toBe(false);
      expect(service.isSuspiciousCountry('us')).toBe(false); // Case insensitive
    });

    it('should identify developed countries', () => {
      const isDeveloped = service.isDevelopedCountry('US');
      expect(typeof isDeveloped).toBe('boolean');
    });
  });

  describe('Country Filtering', () => {
    it('should get countries by region', () => {
      const northAmericaCountries = service.getCountriesByRegion('North America');
      expect(Array.isArray(northAmericaCountries)).toBe(true);
      
      if (northAmericaCountries.length > 0) {
        expect(northAmericaCountries[0]).toHaveProperty('code');
        expect(northAmericaCountries[0]).toHaveProperty('name');
        expect(northAmericaCountries[0]).toHaveProperty('region');
      }
    });

    it('should get high risk countries', () => {
      const highRiskCountries = service.getHighRiskCountries();
      expect(Array.isArray(highRiskCountries)).toBe(true);
      
      highRiskCountries.forEach(country => {
        expect(['high', 'very_high']).toContain(country.riskLevel);
      });
    });

    it('should get trusted countries', () => {
      const trustedCountries = service.getTrustedCountries();
      expect(Array.isArray(trustedCountries)).toBe(true);
      
      trustedCountries.forEach(country => {
        expect(country.riskLevel).toBe('low');
      });
    });

    it('should get countries by risk level', () => {
      const lowRiskCountries = service.getCountriesByRiskLevel('low');
      expect(Array.isArray(lowRiskCountries)).toBe(true);
      
      lowRiskCountries.forEach(country => {
        expect(country.riskLevel).toBe('low');
      });
    });
  });

  describe('Country Validation', () => {
    it('should validate existing country codes', () => {
      expect(service.validateCountryCode('US')).toBe(true);
      expect(service.validateCountryCode('CA')).toBe(true);
      expect(service.validateCountryCode('GB')).toBe(true);
    });

    it('should reject invalid country codes', () => {
      expect(service.validateCountryCode('UNKNOWN')).toBe(false);
      expect(service.validateCountryCode('')).toBe(false);
      expect(service.validateCountryCode('123')).toBe(false);
    });

    it('should handle case insensitive validation', () => {
      expect(service.validateCountryCode('us')).toBe(true);
      expect(service.validateCountryCode('Us')).toBe(true);
      expect(service.validateCountryCode('US')).toBe(true);
    });
  });

  describe('Currency and Localization', () => {
    it('should get currency for country', () => {
      const currency = service.getCurrencyForCountry('US');
      expect(typeof currency).toBe('string');
      expect(currency.length).toBeGreaterThan(0);
    });

    it('should return default currency for unknown countries', () => {
      const currency = service.getCurrencyForCountry('UNKNOWN');
      expect(currency).toBe('USD');
    });

    it('should get timezone for country', () => {
      const timezone = service.getTimezoneForCountry('US');
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
    });

    it('should return default timezone for unknown countries', () => {
      const timezone = service.getTimezoneForCountry('UNKNOWN');
      expect(timezone).toBe('UTC');
    });

    it('should get language for country', () => {
      const language = service.getLanguageForCountry('US');
      expect(typeof language).toBe('string');
      expect(language.length).toBeGreaterThan(0);
    });

    it('should return default language for unknown countries', () => {
      const language = service.getLanguageForCountry('UNKNOWN');
      expect(language).toBe('en');
    });
  });

  describe('Currency Multipliers', () => {
    it('should get currency multiplier', () => {
      const multiplier = service.getCurrencyMultiplier('USD');
      expect(typeof multiplier).toBe('number');
      expect(multiplier).toBeGreaterThan(0);
    });

    it('should return default multiplier for unknown currencies', () => {
      const multiplier = service.getCurrencyMultiplier('UNKNOWN');
      expect(multiplier).toBe(1.0);
    });

    it('should normalize amount to USD', () => {
      const normalizedAmount = service.normalizeAmountToUSD(100, 'USD');
      expect(normalizedAmount).toBe(100);
    });

    it('should normalize amount with different currencies', () => {
      const normalizedAmount = service.normalizeAmountToUSD(100, 'EUR');
      expect(typeof normalizedAmount).toBe('number');
      expect(normalizedAmount).toBeGreaterThan(0);
    });
  });

  describe('Geographic Information', () => {
    it('should get region for country', () => {
      const region = service.getRegionForCountry('US');
      expect(typeof region).toBe('string');
      expect(region.length).toBeGreaterThan(0);
    });

    it('should return unknown region for unknown countries', () => {
      const region = service.getRegionForCountry('UNKNOWN');
      expect(region).toBe('Unknown');
    });

    it('should check if countries are in same region', () => {
      const sameRegion = service.areCountriesInSameRegion('US', 'CA');
      expect(typeof sameRegion).toBe('boolean');
    });

    it('should return false for unknown countries', () => {
      const sameRegion = service.areCountriesInSameRegion('UNKNOWN', 'US');
      expect(sameRegion).toBe(false);
    });
  });

  describe('Risk Level Assessment', () => {
    it('should get risk level for country', () => {
      const riskLevel = service.getRiskLevel('US');
      expect(['low', 'medium', 'high', 'very_high']).toContain(riskLevel);
    });

    it('should return medium risk for unknown countries', () => {
      const riskLevel = service.getRiskLevel('UNKNOWN');
      expect(riskLevel).toBe('medium');
    });
  });

  describe('Comprehensive Risk Calculation', () => {
    it('should calculate comprehensive risk score', () => {
      const riskScore = service.calculateComprehensiveRiskScore('US');
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(1);
    });

    it('should include additional risk factors', () => {
      const riskScore = service.calculateComprehensiveRiskScore('US', {
        isProxy: true,
        isVPN: true,
        isTor: false,
        velocity: 15,
        amount: 15000
      });
      
      expect(riskScore).toBeGreaterThan(0.5); // Should be higher due to additional factors
    });

    it('should cap risk score at 1.0', () => {
      const riskScore = service.calculateComprehensiveRiskScore('XX', {
        isProxy: true,
        isVPN: true,
        isTor: true,
        velocity: 50,
        amount: 100000
      });
      
      expect(riskScore).toBeLessThanOrEqual(1.0);
    });

    it('should handle missing additional factors', () => {
      const riskScore = service.calculateComprehensiveRiskScore('US', {});
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Country Statistics', () => {
    it('should get country statistics', () => {
      const stats = service.getCountryStatistics();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byRiskLevel');
      expect(stats).toHaveProperty('byRegion');
      expect(stats).toHaveProperty('developed');
      expect(stats).toHaveProperty('developing');
      
      expect(typeof stats.total).toBe('number');
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.developed).toBe('number');
      expect(typeof stats.developing).toBe('number');
    });

    it('should have consistent statistics', () => {
      const stats = service.getCountryStatistics();
      expect(stats.developed + stats.developing).toBeLessThanOrEqual(stats.total);
    });
  });

  describe('Search Functionality', () => {
    it('should search countries by name', () => {
      const results = service.searchCountries('United');
      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('name');
        expect(results[0].name.toLowerCase()).toContain('united');
      }
    });

    it('should search countries by code', () => {
      const results = service.searchCountries('US');
      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('code');
        expect(results[0].code.toLowerCase()).toContain('us');
      }
    });

    it('should search countries by region', () => {
      const results = service.searchCountries('America');
      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('region');
        expect(results[0].region.toLowerCase()).toContain('america');
      }
    });

    it('should handle case insensitive search', () => {
      const results1 = service.searchCountries('united');
      const results2 = service.searchCountries('UNITED');
      const results3 = service.searchCountries('United');
      
      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
    });

    it('should return empty array for no matches', () => {
      const results = service.searchCountries('nonexistent');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('Similar Countries', () => {
    it('should get similar risk countries', () => {
      const similarCountries = service.getSimilarRiskCountries('US', 5);
      expect(Array.isArray(similarCountries)).toBe(true);
      expect(similarCountries.length).toBeLessThanOrEqual(5);
      
      similarCountries.forEach(country => {
        expect(country.code).not.toBe('US');
        expect(country).toHaveProperty('fraudIndex');
      });
    });

    it('should return empty array for unknown country', () => {
      const similarCountries = service.getSimilarRiskCountries('UNKNOWN', 5);
      expect(Array.isArray(similarCountries)).toBe(true);
      expect(similarCountries.length).toBe(0);
    });

    it('should respect limit parameter', () => {
      const similarCountries = service.getSimilarRiskCountries('US', 2);
      expect(similarCountries.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Dynamic Risk Profiles', () => {
    it('should update country risk profile', () => {
      service.updateCountryRiskProfile('US', {
        fraudRisk: 0.3,
        chargebackRate: 0.05,
        suspiciousActivity: 0.1,
        regulatoryRisk: 0.2
      });
      
      // Should not throw
      expect(service).toBeDefined();
    });

    it('should get updated risk profile', () => {
      service.updateCountryRiskProfile('US', {
        fraudRisk: 0.4,
        chargebackRate: 0.06
      });
      
      const profile = service.getUpdatedRiskProfile('US');
      expect(profile).toBeDefined();
      if (profile) {
        expect(profile.fraudRisk).toBe(0.4);
        expect(profile.chargebackRate).toBe(0.06);
      }
    });

    it('should return undefined for unknown country profile', () => {
      const profile = service.getUpdatedRiskProfile('UNKNOWN');
      expect(profile).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      // The actual implementation throws errors for null/undefined, so we test that behavior
      expect(() => service.getCountry(null as any)).toThrow();
      expect(() => service.getCountry(undefined as any)).toThrow();
      expect(() => service.getCountryRiskScore(null as any)).toThrow();
      expect(() => service.getCountryRiskScore(undefined as any)).toThrow();
    });

    it('should handle non-string inputs', () => {
      // The actual implementation throws errors for non-string inputs
      expect(() => service.getCountry(123 as any)).toThrow();
      expect(() => service.getCountry({} as any)).toThrow();
      expect(() => service.getCountry([] as any)).toThrow();
    });

    it('should handle very long country codes', () => {
      const longCode = 'A'.repeat(1000);
      const country = service.getCountry(longCode);
      expect(country).toBeUndefined();
    });

    it('should handle special characters in country codes', () => {
      const specialCode = 'US@#$%';
      const country = service.getCountry(specialCode);
      expect(country).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should perform lookups quickly', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        service.getCountry('US');
        service.getCountryRiskScore('US');
        service.isHighRiskCountry('US');
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle concurrent operations', () => {
      const operations = Array.from({ length: 100 }, (_, i) => {
        return () => {
          service.getCountry('US');
          service.getCountryRiskScore('CA');
          service.isHighRiskCountry('GB');
        };
      });

      const startTime = Date.now();
      operations.forEach(op => op());
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent country data', () => {
      const country = service.getCountry('US');
      if (country) {
        expect(country.code).toBe('US');
        expect(typeof country.name).toBe('string');
        expect(typeof country.region).toBe('string');
        expect(['low', 'medium', 'high', 'very_high']).toContain(country.riskLevel);
        expect(country.fraudIndex).toBeGreaterThanOrEqual(0);
        expect(country.fraudIndex).toBeLessThanOrEqual(1);
        expect(typeof country.isDeveloped).toBe('boolean');
      }
    });

    it('should have valid risk levels for all countries', () => {
      const allCodes = service.getAllCountryCodes();
      
      allCodes.forEach(code => {
        const riskLevel = service.getRiskLevel(code);
        expect(['low', 'medium', 'high', 'very_high']).toContain(riskLevel);
      });
    });

    it('should have valid currencies for all countries', () => {
      const allCodes = service.getAllCountryCodes();
      
      allCodes.forEach(code => {
        const currency = service.getCurrencyForCountry(code);
        expect(typeof currency).toBe('string');
        expect(currency.length).toBeGreaterThan(0);
      });
    });
  });
});
