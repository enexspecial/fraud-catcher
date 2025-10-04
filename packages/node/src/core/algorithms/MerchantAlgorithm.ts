import { Transaction, DetectionRule } from '../models/Transaction';

export interface MerchantConfig {
  highRiskCategories: string[];
  suspiciousMerchants: string[];
  trustedMerchants: string[];
  categoryRiskScores: Record<string, number>;
  merchantVelocityWindow: number; // in minutes
  maxTransactionsPerMerchant: number;
  enableCategoryAnalysis: boolean;
  enableMerchantReputation: boolean;
}

export interface MerchantProfile {
  merchantId: string;
  merchantName?: string;
  category: string;
  riskScore: number;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  firstSeen: Date;
  lastSeen: Date;
  isTrusted: boolean;
  isSuspicious: boolean;
  userCount: number;
  uniqueUsers: Set<string>;
}

export class MerchantAlgorithm {
  private config: MerchantConfig;
  private merchantProfiles: Map<string, MerchantProfile> = new Map();
  private userMerchants: Map<string, Set<string>> = new Map();
  private categoryStats: Map<string, { count: number; totalAmount: number }> = new Map();

  constructor(config: MerchantConfig) {
    this.config = config;
  }

  async analyze(transaction: Transaction, _rule: DetectionRule): Promise<number> {
    if (!transaction.merchantId) {
      return 0.0; // No merchant data
    }

    const merchantId = transaction.merchantId;
    const category = transaction.merchantCategory || 'unknown';
    
    let riskScore = 0.0;

    // Get or create merchant profile
    const merchantProfile = this.getOrCreateMerchantProfile(merchantId, category, transaction);

    // Check if merchant is in suspicious list
    if (this.config.suspiciousMerchants.includes(merchantId)) {
      riskScore += 0.8;
    }

    // Check if merchant is trusted (reduce risk)
    if (this.config.trustedMerchants.includes(merchantId)) {
      riskScore -= 0.3;
    }

    // Check category risk
    if (this.config.enableCategoryAnalysis) {
      const categoryRisk = this.analyzeCategoryRisk(category, merchantProfile);
      riskScore += categoryRisk;
    }

    // Check merchant velocity (transactions per merchant)
    const velocityRisk = this.analyzeMerchantVelocity(merchantId, transaction);
    riskScore += velocityRisk;

    // Check for unusual merchant patterns
    const patternRisk = this.analyzeMerchantPatterns(transaction.userId, merchantId, category);
    riskScore += patternRisk;

    // Check merchant reputation
    if (this.config.enableMerchantReputation) {
      const reputationRisk = this.analyzeMerchantReputation(merchantProfile);
      riskScore += reputationRisk;
    }

    // Update merchant profile
    this.updateMerchantProfile(merchantId, transaction);

    return Math.max(0, Math.min(riskScore, 1.0));
  }

  private getOrCreateMerchantProfile(merchantId: string, category: string, transaction: Transaction): MerchantProfile {
    let profile = this.merchantProfiles.get(merchantId);
    
    if (!profile) {
      profile = {
        merchantId,
        merchantName: transaction.metadata?.['merchantName'],
        category,
        riskScore: 0.0,
        transactionCount: 0,
        totalAmount: 0.0,
        averageAmount: 0.0,
        firstSeen: new Date(transaction.timestamp),
        lastSeen: new Date(transaction.timestamp),
        isTrusted: this.config.trustedMerchants.includes(merchantId),
        isSuspicious: this.config.suspiciousMerchants.includes(merchantId),
        userCount: 0,
        uniqueUsers: new Set()
      };
      
      this.merchantProfiles.set(merchantId, profile);
    }
    
    return profile;
  }

  private analyzeCategoryRisk(category: string, merchantProfile: MerchantProfile): number {
    // Check if category is high risk
    if (this.config.highRiskCategories.includes(category)) {
      return 0.6;
    }

    // Check category-specific risk score
    const categoryRisk = this.config.categoryRiskScores[category] || 0.0;
    
    // Check category transaction patterns
    const categoryStats = this.categoryStats.get(category);
    if (categoryStats) {
      const averageAmount = categoryStats.totalAmount / categoryStats.count;
      const currentAmount = merchantProfile.totalAmount / Math.max(merchantProfile.transactionCount, 1);
      
      // If merchant's average is significantly higher than category average
      if (currentAmount > averageAmount * 2) {
        return 0.3;
      }
    }

    return categoryRisk;
  }

  private analyzeMerchantVelocity(merchantId: string, transaction: Transaction): number {
    const profile = this.merchantProfiles.get(merchantId);
    if (!profile) return 0.0;

    const timeWindow = this.config.merchantVelocityWindow * 60 * 1000; // Convert to milliseconds
    const now = new Date(transaction.timestamp);
    const timeDiff = now.getTime() - profile.firstSeen.getTime();
    
    if (timeDiff < timeWindow) {
      const velocity = profile.transactionCount / (timeDiff / (60 * 1000)); // Transactions per minute
      
      if (velocity > this.config.maxTransactionsPerMerchant) {
        return 0.5; // High velocity risk
      } else if (velocity > this.config.maxTransactionsPerMerchant * 0.7) {
        return 0.2; // Medium velocity risk
      }
    }
    
    return 0.0;
  }

  private analyzeMerchantPatterns(userId: string, merchantId: string, category: string): number {
    let riskScore = 0.0;

    // Check if user has transacted with this merchant before
    const userMerchants = this.userMerchants.get(userId) || new Set();
    if (!userMerchants.has(merchantId)) {
      riskScore += 0.2; // New merchant for user
    }

    // Check for category switching patterns
    const userCategories = this.getUserCategories(userId);
    if (userCategories.length > 0 && !userCategories.includes(category)) {
      riskScore += 0.1; // New category for user
    }

    // Check for unusual merchant combinations
    const recentMerchants = this.getRecentUserMerchants(userId, 24 * 60); // Last 24 hours
    if (recentMerchants.length > 5) {
      riskScore += 0.3; // Too many different merchants
    }

    return riskScore;
  }

  private analyzeMerchantReputation(profile: MerchantProfile): number {
    let riskScore = 0.0;

    // Check transaction count (too few transactions might be suspicious)
    if (profile.transactionCount < 5) {
      riskScore += 0.2;
    }

    // Check user diversity (merchants with only one user might be suspicious)
    if (profile.userCount < 3) {
      riskScore += 0.1;
    }

    // Check amount consistency
    if (profile.transactionCount > 10) {
      const amountVariance = this.calculateAmountVariance(profile);
      if (amountVariance > 0.8) { // High variance in amounts
        riskScore += 0.2;
      }
    }

    return riskScore;
  }

  private calculateAmountVariance(profile: MerchantProfile): number {
    // Simplified variance calculation
    // In production, you'd want to store individual transaction amounts
    const averageAmount = profile.averageAmount;
    const expectedVariance = averageAmount * 0.3; // 30% variance is normal
    
    // This is a simplified calculation - in reality you'd need actual transaction data
    return Math.random() * 0.5; // Placeholder
  }

  private updateMerchantProfile(merchantId: string, transaction: Transaction): void {
    const profile = this.merchantProfiles.get(merchantId);
    if (!profile) return;

    profile.transactionCount++;
    profile.totalAmount += transaction.amount;
    profile.averageAmount = profile.totalAmount / profile.transactionCount;
    profile.lastSeen = new Date(transaction.timestamp);
    
    // Add user to unique users
    profile.uniqueUsers.add(transaction.userId);
    profile.userCount = profile.uniqueUsers.size;

    // Update category stats
    const category = transaction.merchantCategory || 'unknown';
    const categoryStats = this.categoryStats.get(category) || { count: 0, totalAmount: 0 };
    categoryStats.count++;
    categoryStats.totalAmount += transaction.amount;
    this.categoryStats.set(category, categoryStats);

    // Update user merchants
    if (!this.userMerchants.has(transaction.userId)) {
      this.userMerchants.set(transaction.userId, new Set());
    }
    this.userMerchants.get(transaction.userId)!.add(merchantId);
  }

  private getUserCategories(userId: string): string[] {
    const userMerchants = this.userMerchants.get(userId) || new Set();
    const categories = new Set<string>();
    
    for (const merchantId of userMerchants) {
      const profile = this.merchantProfiles.get(merchantId);
      if (profile) {
        categories.add(profile.category);
      }
    }
    
    return Array.from(categories);
  }

  private getRecentUserMerchants(userId: string, timeWindowMinutes: number): string[] {
    const userMerchants = this.userMerchants.get(userId) || new Set();
    const cutoffTime = new Date().getTime() - (timeWindowMinutes * 60 * 1000);
    
    return Array.from(userMerchants).filter(merchantId => {
      const profile = this.merchantProfiles.get(merchantId);
      return profile && profile.lastSeen.getTime() > cutoffTime;
    });
  }

  // Utility methods
  getMerchantProfile(merchantId: string): MerchantProfile | undefined {
    return this.merchantProfiles.get(merchantId);
  }

  getUserMerchants(userId: string): string[] {
    return Array.from(this.userMerchants.get(userId) || []);
  }

  getCategoryStats(category: string): { count: number; totalAmount: number } | undefined {
    return this.categoryStats.get(category);
  }

  markMerchantAsTrusted(merchantId: string): void {
    const profile = this.merchantProfiles.get(merchantId);
    if (profile) {
      profile.isTrusted = true;
      profile.isSuspicious = false;
    }
  }

  markMerchantAsSuspicious(merchantId: string): void {
    const profile = this.merchantProfiles.get(merchantId);
    if (profile) {
      profile.isSuspicious = true;
      profile.isTrusted = false;
    }
  }

  getTopMerchantsByVolume(limit: number = 10): MerchantProfile[] {
    return Array.from(this.merchantProfiles.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);
  }

  getRiskiestMerchants(limit: number = 10): MerchantProfile[] {
    return Array.from(this.merchantProfiles.values())
      .filter(profile => profile.riskScore > 0.5)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  }
}
