export interface Country {
  code: string;           // ISO 3166-1 alpha-2
  name: string;           // Full country name
  region: string;         // Geographic region
  currency: string;       // Primary currency
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  isDeveloped: boolean;   // Economic development level
  fraudIndex: number;     // 0-1 fraud risk score
  timezone: string;       // Primary timezone
  language: string;       // Primary language
}

export interface CountryRiskProfile {
  country: string;
  fraudRisk: number;      // 0-1 scale
  chargebackRate: number; // 0-1 scale
  suspiciousActivity: number; // 0-1 scale
  regulatoryRisk: number; // 0-1 scale
}

export interface Location {
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  state?: string;
  timezone?: string;
  region?: string;
}
