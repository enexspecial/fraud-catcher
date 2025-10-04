import { Country, CountryRiskProfile } from '../models/Country';
import { COUNTRIES, COUNTRY_RISK_LEVELS, CURRENCY_MULTIPLIERS, REGIONS } from '../data/Countries';

export class CountryService {
  private countries = COUNTRIES;
  private riskProfiles = new Map<string, CountryRiskProfile>();

  /**
   * Get country information by country code
   */
  getCountry(code: string): Country | undefined {
    return this.countries[code.toUpperCase()];
  }

  /**
   * Get fraud risk score for a country (0-1 scale)
   */
  getCountryRiskScore(code: string): number {
    const country = this.getCountry(code);
    return country?.fraudIndex || 0.5; // Default medium risk for unknown countries
  }

  /**
   * Check if a country is considered high risk
   */
  isHighRiskCountry(code: string): boolean {
    const country = this.getCountry(code);
    return country?.riskLevel === 'high' || country?.riskLevel === 'very_high';
  }

  /**
   * Check if a country is considered very high risk
   */
  isVeryHighRiskCountry(code: string): boolean {
    const country = this.getCountry(code);
    return country?.riskLevel === 'very_high';
  }

  /**
   * Check if a country code is suspicious (proxy, unknown, etc.)
   */
  isSuspiciousCountry(code: string): boolean {
    return ['XX', 'ZZ'].includes(code.toUpperCase());
  }

  /**
   * Check if a country is developed (lower fraud risk)
   */
  isDevelopedCountry(code: string): boolean {
    const country = this.getCountry(code);
    return country?.isDeveloped || false;
  }

  /**
   * Get all countries in a specific region
   */
  getCountriesByRegion(region: string): Country[] {
    return Object.values(this.countries).filter(country => country.region === region);
  }

  /**
   * Get all high risk countries
   */
  getHighRiskCountries(): Country[] {
    return Object.values(this.countries).filter(country => 
      country.riskLevel === 'high' || country.riskLevel === 'very_high'
    );
  }

  /**
   * Get all trusted (low risk) countries
   */
  getTrustedCountries(): Country[] {
    return Object.values(this.countries).filter(country => country.riskLevel === 'low');
  }

  /**
   * Get countries by risk level
   */
  getCountriesByRiskLevel(riskLevel: 'low' | 'medium' | 'high' | 'very_high'): Country[] {
    return Object.values(this.countries).filter(country => country.riskLevel === riskLevel);
  }

  /**
   * Validate if a country code exists
   */
  validateCountryCode(code: string): boolean {
    return code.toUpperCase() in this.countries;
  }

  /**
   * Get primary currency for a country
   */
  getCurrencyForCountry(code: string): string {
    const country = this.getCountry(code);
    return country?.currency || 'USD';
  }

  /**
   * Get primary timezone for a country
   */
  getTimezoneForCountry(code: string): string {
    const country = this.getCountry(code);
    return country?.timezone || 'UTC';
  }

  /**
   * Get primary language for a country
   */
  getLanguageForCountry(code: string): string {
    const country = this.getCountry(code);
    return country?.language || 'en';
  }

  /**
   * Get currency multiplier for normalization
   */
  getCurrencyMultiplier(currency: string): number {
    return CURRENCY_MULTIPLIERS[currency] || 1.0;
  }

  /**
   * Normalize amount to USD equivalent
   */
  normalizeAmountToUSD(amount: number, currency: string): number {
    const multiplier = this.getCurrencyMultiplier(currency);
    return amount * multiplier;
  }

  /**
   * Get region for a country
   */
  getRegionForCountry(code: string): string {
    const country = this.getCountry(code);
    return country?.region || 'Unknown';
  }

  /**
   * Check if two countries are in the same region
   */
  areCountriesInSameRegion(code1: string, code2: string): boolean {
    const region1 = this.getRegionForCountry(code1);
    const region2 = this.getRegionForCountry(code2);
    return region1 === region2 && region1 !== 'Unknown';
  }

  /**
   * Get risk level for a country
   */
  getRiskLevel(code: string): 'low' | 'medium' | 'high' | 'very_high' {
    const country = this.getCountry(code);
    return country?.riskLevel || 'medium';
  }

  /**
   * Calculate risk score based on multiple factors
   */
  calculateComprehensiveRiskScore(code: string, additionalFactors?: {
    isProxy?: boolean;
    isVPN?: boolean;
    isTor?: boolean;
    velocity?: number;
    amount?: number;
  }): number {
    let riskScore = this.getCountryRiskScore(code);
    
    // Apply additional risk factors
    if (additionalFactors) {
      if (additionalFactors.isProxy) riskScore += 0.3;
      if (additionalFactors.isVPN) riskScore += 0.2;
      if (additionalFactors.isTor) riskScore += 0.4;
      
      // Velocity factor (higher velocity = higher risk)
      if (additionalFactors.velocity && additionalFactors.velocity > 10) {
        riskScore += 0.2;
      }
      
      // Amount factor (higher amounts = higher risk for high-risk countries)
      if (additionalFactors.amount && this.isHighRiskCountry(code)) {
        const normalizedAmount = this.normalizeAmountToUSD(additionalFactors.amount, this.getCurrencyForCountry(code));
        if (normalizedAmount > 10000) {
          riskScore += 0.3;
        }
      }
    }
    
    return Math.min(riskScore, 1.0);
  }

  /**
   * Get all available country codes
   */
  getAllCountryCodes(): string[] {
    return Object.keys(this.countries);
  }

  /**
   * Get country statistics
   */
  getCountryStatistics(): {
    total: number;
    byRiskLevel: Record<string, number>;
    byRegion: Record<string, number>;
    developed: number;
    developing: number;
  } {
    const countries = Object.values(this.countries);
    
    const byRiskLevel = countries.reduce((acc, country) => {
      acc[country.riskLevel] = (acc[country.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byRegion = countries.reduce((acc, country) => {
      acc[country.region] = (acc[country.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const developed = countries.filter(c => c.isDeveloped).length;
    const developing = countries.filter(c => !c.isDeveloped).length;
    
    return {
      total: countries.length,
      byRiskLevel,
      byRegion,
      developed,
      developing
    };
  }

  /**
   * Search countries by name or code
   */
  searchCountries(query: string): Country[] {
    const searchTerm = query.toLowerCase();
    return Object.values(this.countries).filter(country => 
      country.name.toLowerCase().includes(searchTerm) ||
      country.code.toLowerCase().includes(searchTerm) ||
      country.region.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get countries with similar risk profiles
   */
  getSimilarRiskCountries(code: string, limit: number = 5): Country[] {
    const targetCountry = this.getCountry(code);
    if (!targetCountry) return [];
    
    const targetRisk = targetCountry.fraudIndex;
    
    return Object.values(this.countries)
      .filter(country => country.code !== code)
      .sort((a, b) => Math.abs(a.fraudIndex - targetRisk) - Math.abs(b.fraudIndex - targetRisk))
      .slice(0, limit);
  }

  /**
   * Update country risk profile (for dynamic risk adjustment)
   */
  updateCountryRiskProfile(code: string, profile: Partial<CountryRiskProfile>): void {
    const existing = this.riskProfiles.get(code) || {
      country: code,
      fraudRisk: this.getCountryRiskScore(code),
      chargebackRate: 0,
      suspiciousActivity: 0,
      regulatoryRisk: 0
    };
    
    this.riskProfiles.set(code, { ...existing, ...profile });
  }

  /**
   * Get updated risk profile for a country
   */
  getUpdatedRiskProfile(code: string): CountryRiskProfile | undefined {
    return this.riskProfiles.get(code);
  }
}
