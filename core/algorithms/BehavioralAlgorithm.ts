import { Transaction, DetectionRule } from '../models/Transaction';

export interface BehavioralConfig {
  enableSpendingPatterns: boolean;
  enableTransactionTiming: boolean;
  enableLocationPatterns: boolean;
  enableDevicePatterns: boolean;
  patternHistoryDays: number;
  anomalyThreshold: number;
  enableMachineLearning: boolean;
  learningRate: number;
}

export interface UserBehaviorProfile {
  userId: string;
  averageAmount: number;
  medianAmount: number;
  spendingVariance: number;
  preferredHours: number[];
  preferredDays: number[];
  commonLocations: Array<{ lat: number; lng: number; count: number }>;
  commonMerchants: string[];
  commonCategories: string[];
  transactionFrequency: number; // transactions per day
  lastTransaction: Date;
  totalTransactions: number;
  totalAmount: number;
  riskScore: number;
  lastUpdated: Date;
}

export interface BehavioralAnomaly {
  type: 'spending' | 'timing' | 'location' | 'merchant' | 'frequency';
  severity: 'low' | 'medium' | 'high';
  score: number;
  description: string;
  expectedValue: any;
  actualValue: any;
}

export class BehavioralAlgorithm {
  private config: BehavioralConfig;
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private transactionHistory: Map<string, Transaction[]> = new Map();

  constructor(config: BehavioralConfig) {
    this.config = config;
  }

  async analyze(transaction: Transaction, rule: DetectionRule): Promise<number> {
    const userId = transaction.userId;
    
    // Get or create user behavior profile
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createInitialProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    // Analyze various behavioral patterns
    const anomalies: BehavioralAnomaly[] = [];

    if (this.config.enableSpendingPatterns) {
      const spendingAnomalies = this.analyzeSpendingPatterns(transaction, profile);
      anomalies.push(...spendingAnomalies);
    }

    if (this.config.enableTransactionTiming) {
      const timingAnomalies = this.analyzeTimingPatterns(transaction, profile);
      anomalies.push(...timingAnomalies);
    }

    if (this.config.enableLocationPatterns && transaction.location) {
      const locationAnomalies = this.analyzeLocationPatterns(transaction, profile);
      anomalies.push(...locationAnomalies);
    }

    if (this.config.enableDevicePatterns) {
      const deviceAnomalies = this.analyzeDevicePatterns(transaction, profile);
      anomalies.push(...deviceAnomalies);
    }

    // Calculate overall risk score based on anomalies
    const riskScore = this.calculateRiskScore(anomalies);
    
    // Update user profile
    this.updateUserProfile(transaction, profile);
    
    // Store transaction in history
    this.addTransactionToHistory(transaction);

    return Math.min(riskScore, 1.0);
  }

  private createInitialProfile(userId: string): UserBehaviorProfile {
    return {
      userId,
      averageAmount: 0,
      medianAmount: 0,
      spendingVariance: 0,
      preferredHours: [],
      preferredDays: [],
      commonLocations: [],
      commonMerchants: [],
      commonCategories: [],
      transactionFrequency: 0,
      lastTransaction: new Date(),
      totalTransactions: 0,
      totalAmount: 0,
      riskScore: 0,
      lastUpdated: new Date()
    };
  }

  private analyzeSpendingPatterns(transaction: Transaction, profile: UserBehaviorProfile): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = [];
    const amount = transaction.amount;

    // Check for unusual spending amounts
    if (profile.totalTransactions > 0) {
      const spendingDeviation = Math.abs(amount - profile.averageAmount) / profile.averageAmount;
      
      if (spendingDeviation > 2.0) { // 200% deviation
        anomalies.push({
          type: 'spending',
          severity: 'high',
          score: 0.8,
          description: 'Unusually high spending amount',
          expectedValue: profile.averageAmount,
          actualValue: amount
        });
      } else if (spendingDeviation > 1.0) { // 100% deviation
        anomalies.push({
          type: 'spending',
          severity: 'medium',
          score: 0.4,
          description: 'Above average spending amount',
          expectedValue: profile.averageAmount,
          actualValue: amount
        });
      }
    }

    return anomalies;
  }

  private analyzeTimingPatterns(transaction: Transaction, profile: UserBehaviorProfile): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = [];
    const transactionTime = new Date(transaction.timestamp);
    const hour = transactionTime.getHours();
    const dayOfWeek = transactionTime.getDay();

    // Check for unusual transaction times
    if (profile.preferredHours.length > 0) {
      const isUnusualHour = !profile.preferredHours.includes(hour);
      if (isUnusualHour) {
        anomalies.push({
          type: 'timing',
          severity: 'medium',
          score: 0.3,
          description: 'Transaction at unusual hour',
          expectedValue: profile.preferredHours,
          actualValue: hour
        });
      }
    }

    // Check for unusual days
    if (profile.preferredDays.length > 0) {
      const isUnusualDay = !profile.preferredDays.includes(dayOfWeek);
      if (isUnusualDay) {
        anomalies.push({
          type: 'timing',
          severity: 'low',
          score: 0.2,
          description: 'Transaction on unusual day',
          expectedValue: profile.preferredDays,
          actualValue: dayOfWeek
        });
      }
    }

    return anomalies;
  }

  private analyzeLocationPatterns(transaction: Transaction, profile: UserBehaviorProfile): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = [];
    const location = transaction.location!;

    if (profile.commonLocations.length > 0) {
      // Check if location is far from common locations
      const minDistance = Math.min(
        ...profile.commonLocations.map(commonLoc => 
          this.calculateDistance(location, commonLoc)
        )
      );

      if (minDistance > 100) { // More than 100km from any common location
        anomalies.push({
          type: 'location',
          severity: 'high',
          score: 0.7,
          description: 'Transaction from unusual location',
          expectedValue: profile.commonLocations[0],
          actualValue: location
        });
      } else if (minDistance > 50) { // More than 50km from any common location
        anomalies.push({
          type: 'location',
          severity: 'medium',
          score: 0.4,
          description: 'Transaction from distant location',
          expectedValue: profile.commonLocations[0],
          actualValue: location
        });
      }
    }

    return anomalies;
  }

  private analyzeDevicePatterns(transaction: Transaction, profile: UserBehaviorProfile): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = [];

    // This would require device history tracking
    // For now, we'll implement basic device pattern analysis
    if (transaction.deviceId) {
      // Check if this is a new device for the user
      // This would require storing device history
      // Placeholder implementation
    }

    return anomalies;
  }

  private calculateRiskScore(anomalies: BehavioralAnomaly[]): number {
    if (anomalies.length === 0) return 0.0;

    let totalScore = 0.0;
    let totalWeight = 0.0;

    for (const anomaly of anomalies) {
      let weight = 1.0;
      
      switch (anomaly.severity) {
        case 'high':
          weight = 3.0;
          break;
        case 'medium':
          weight = 2.0;
          break;
        case 'low':
          weight = 1.0;
          break;
      }

      totalScore += anomaly.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0.0;
  }

  private updateUserProfile(transaction: Transaction, profile: UserBehaviorProfile): void {
    const now = new Date(transaction.timestamp);
    
    // Update basic stats
    profile.totalTransactions++;
    profile.totalAmount += transaction.amount;
    profile.averageAmount = profile.totalAmount / profile.totalTransactions;
    profile.lastTransaction = now;
    profile.lastUpdated = now;

    // Update spending variance (simplified)
    if (profile.totalTransactions > 1) {
      const amounts = this.getUserTransactionAmounts(transaction.userId);
      profile.spendingVariance = this.calculateVariance(amounts);
    }

    // Update preferred hours and days
    this.updatePreferredTimes(transaction, profile);

    // Update common locations
    if (transaction.location) {
      this.updateCommonLocations(transaction.location, profile);
    }

    // Update common merchants and categories
    if (transaction.merchantId) {
      this.updateCommonMerchants(transaction.merchantId, profile);
    }
    if (transaction.merchantCategory) {
      this.updateCommonCategories(transaction.merchantCategory, profile);
    }

    // Update transaction frequency
    this.updateTransactionFrequency(transaction.userId, profile);
  }

  private addTransactionToHistory(transaction: Transaction): void {
    const userId = transaction.userId;
    if (!this.transactionHistory.has(userId)) {
      this.transactionHistory.set(userId, []);
    }

    const history = this.transactionHistory.get(userId)!;
    history.push(transaction);

    // Keep only recent transactions
    const cutoffTime = new Date().getTime() - (this.config.patternHistoryDays * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(tx => 
      new Date(tx.timestamp).getTime() > cutoffTime
    );
    
    this.transactionHistory.set(userId, filteredHistory);
  }

  private getUserTransactionAmounts(userId: string): number[] {
    const history = this.transactionHistory.get(userId) || [];
    return history.map(tx => tx.amount);
  }

  private calculateVariance(amounts: number[]): number {
    if (amounts.length < 2) return 0;
    
    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
    
    return Math.sqrt(variance); // Standard deviation
  }

  private updatePreferredTimes(transaction: Transaction, profile: UserBehaviorProfile): void {
    const transactionTime = new Date(transaction.timestamp);
    const hour = transactionTime.getHours();
    const dayOfWeek = transactionTime.getDay();

    // Update preferred hours
    if (!profile.preferredHours.includes(hour)) {
      profile.preferredHours.push(hour);
      profile.preferredHours.sort();
    }

    // Update preferred days
    if (!profile.preferredDays.includes(dayOfWeek)) {
      profile.preferredDays.push(dayOfWeek);
      profile.preferredDays.sort();
    }
  }

  private updateCommonLocations(location: any, profile: UserBehaviorProfile): void {
    const existingLocation = profile.commonLocations.find(loc => 
      Math.abs(loc.lat - location.lat) < 0.01 && Math.abs(loc.lng - location.lng) < 0.01
    );

    if (existingLocation) {
      existingLocation.count++;
    } else {
      profile.commonLocations.push({
        lat: location.lat,
        lng: location.lng,
        count: 1
      });
    }

    // Keep only top 10 locations
    profile.commonLocations.sort((a, b) => b.count - a.count);
    profile.commonLocations = profile.commonLocations.slice(0, 10);
  }

  private updateCommonMerchants(merchantId: string, profile: UserBehaviorProfile): void {
    if (!profile.commonMerchants.includes(merchantId)) {
      profile.commonMerchants.push(merchantId);
    }
  }

  private updateCommonCategories(category: string, profile: UserBehaviorProfile): void {
    if (!profile.commonCategories.includes(category)) {
      profile.commonCategories.push(category);
    }
  }

  private updateTransactionFrequency(userId: string, profile: UserBehaviorProfile): void {
    const history = this.transactionHistory.get(userId) || [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentTransactions = history.filter(tx => 
      new Date(tx.timestamp) > oneDayAgo
    );
    
    profile.transactionFrequency = recentTransactions.length;
  }

  private calculateDistance(loc1: any, loc2: any): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(loc2.lat - loc1.lat);
    const dLon = this.deg2rad(loc2.lng - loc1.lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(loc1.lat)) * Math.cos(this.deg2rad(loc2.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Utility methods
  getUserProfile(userId: string): UserBehaviorProfile | undefined {
    return this.userProfiles.get(userId);
  }

  getBehavioralAnomalies(userId: string): BehavioralAnomaly[] {
    // This would analyze the user's recent behavior and return anomalies
    // For now, return empty array
    return [];
  }

  getSpendingPattern(userId: string): { average: number; median: number; variance: number } {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return { average: 0, median: 0, variance: 0 };
    }

    return {
      average: profile.averageAmount,
      median: profile.medianAmount,
      variance: profile.spendingVariance
    };
  }

  getLocationPattern(userId: string): Array<{ lat: number; lng: number; count: number }> {
    const profile = this.userProfiles.get(userId);
    return profile?.commonLocations || [];
  }

  getTimingPattern(userId: string): { preferredHours: number[]; preferredDays: number[] } {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return { preferredHours: [], preferredDays: [] };
    }

    return {
      preferredHours: profile.preferredHours,
      preferredDays: profile.preferredDays
    };
  }
}
