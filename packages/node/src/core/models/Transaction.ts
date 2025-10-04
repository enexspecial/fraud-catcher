export interface Location {
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  state?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  timestamp: Date | string;
  location?: Location;
  merchantId?: string;
  merchantCategory?: string;
  paymentMethod?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface FraudResult {
  transactionId: string;
  riskScore: number; // 0.0 - 1.0
  isFraudulent: boolean;
  isFraud: boolean; // Alias for compatibility
  confidence: number; // 0.0 - 1.0
  triggeredRules: string[];
  processingTime: number; // Moved to top level for easier access
  details: {
    algorithm: string;
    processingTime: number;
    timestamp: Date;
    algorithmScores?: Record<string, number>;
  };
  recommendations?: string[];
  timestamp: Date; // Added for consistency
}

export interface DetectionRule {
  name: string;
  weight: number; // 0.0 - 1.0
  threshold: number; // 0.0 - 1.0
  enabled: boolean;
  config?: Record<string, any>;
}

export interface FraudDetectorConfig {
  rules: string[];
  thresholds: Record<string, number>;
  globalThreshold: number;
  enableLogging: boolean;
  customRules?: DetectionRule[];
}
