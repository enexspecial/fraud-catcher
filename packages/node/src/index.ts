// Simple working version for testing
export interface Transaction {
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

export interface FraudResult {
  transactionId: string;
  riskScore: number;
  isFraudulent: boolean;
  isFraud: boolean;
  confidence: number;
  triggeredRules: string[];
  processingTime: number;
  timestamp: Date;
  details: {
    algorithm: string;
    processingTime: number;
    timestamp: Date;
  };
  recommendations?: string[];
}

export interface FraudDetectorConfig {
  rules: string[];
  thresholds: Record<string, number>;
  globalThreshold: number;
  enableLogging: boolean;
  customRules?: any[];
}

export class FraudDetector {
  private config: FraudDetectorConfig;

  constructor(config: FraudDetectorConfig) {
    this.config = config;
  }

  async analyze(transaction: Transaction): Promise<FraudResult> {
    const startTime = Date.now();
    
    // Simple fraud detection logic
    let riskScore = 0.0;
    const triggeredRules: string[] = [];

    // Amount check
    if (transaction.amount > 10000) {
      riskScore += 0.8;
      triggeredRules.push('amount');
    } else if (transaction.amount > 5000) {
      riskScore += 0.5;
      triggeredRules.push('amount');
    }

    // Time check (suspicious hours)
    const hour = new Date(transaction.timestamp).getHours();
    if (hour >= 0 && hour <= 5) {
      riskScore += 0.6;
      triggeredRules.push('time');
    }

    // Location check (simplified)
    if (transaction.location?.country === 'XX') {
      riskScore += 0.7;
      triggeredRules.push('location');
    }

    // Device check
    if (!transaction.deviceId) {
      riskScore += 0.3;
      triggeredRules.push('device');
    }

    const isFraudulent = riskScore >= this.config.globalThreshold;
    const processingTime = Date.now() - startTime;

    return {
      transactionId: transaction.id,
      riskScore: Math.min(riskScore, 1.0),
      isFraudulent,
      isFraud: isFraudulent,
      confidence: Math.min(triggeredRules.length / this.config.rules.length, 1.0),
      triggeredRules,
      processingTime,
      timestamp: new Date(),
      details: {
        algorithm: 'simple',
        processingTime,
        timestamp: new Date()
      },
      recommendations: isFraudulent ? ['Review transaction for potential fraud'] : []
    };
  }
}

// Export everything
export * from './index';