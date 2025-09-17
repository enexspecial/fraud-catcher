import { Transaction, DetectionRule } from '../models/Transaction';

export interface VelocityConfig {
  timeWindow: number; // in minutes
  maxTransactions: number;
  maxAmount: number;
}

export class VelocityAlgorithm {
  private config: VelocityConfig;
  private transactionHistory: Map<string, Transaction[]> = new Map();

  constructor(config: VelocityConfig) {
    this.config = config;
  }

  async analyze(transaction: Transaction, _rule: DetectionRule): Promise<number> {
    const userId = transaction.userId;
    const now = new Date(transaction.timestamp);
    const timeWindow = this.config.timeWindow * 60 * 1000; // Convert to milliseconds

    // Get user's transaction history
    const userHistory = this.transactionHistory.get(userId) || [];
    
    // Filter transactions within the time window
    const recentTransactions = userHistory.filter(tx => {
      const txTime = new Date(tx.timestamp);
      return (now.getTime() - txTime.getTime()) <= timeWindow;
    });

    // Calculate velocity metrics
    const transactionCount = recentTransactions.length + 1; // +1 for current transaction
    const totalAmount = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0) + transaction.amount;

    // Calculate risk scores
    const countRisk = Math.min(transactionCount / this.config.maxTransactions, 1);
    const amountRisk = Math.min(totalAmount / this.config.maxAmount, 1);

    // Combine risk scores with equal weight
    const velocityScore = (countRisk + amountRisk) / 2;

    // Store current transaction
    this.addTransaction(transaction);

    return Math.min(velocityScore, 1.0);
  }

  private addTransaction(transaction: Transaction): void {
    const userId = transaction.userId;
    const userHistory = this.transactionHistory.get(userId) || [];
    userHistory.push(transaction);
    
    // Keep only recent transactions to manage memory
    const cutoffTime = new Date().getTime() - (this.config.timeWindow * 60 * 1000);
    const filteredHistory = userHistory.filter(tx => 
      new Date(tx.timestamp).getTime() > cutoffTime
    );
    
    this.transactionHistory.set(userId, filteredHistory);
  }

  getTransactionCount(userId: string, timeWindowMinutes: number): number {
    const userHistory = this.transactionHistory.get(userId) || [];
    const cutoffTime = new Date().getTime() - (timeWindowMinutes * 60 * 1000);
    
    return userHistory.filter(tx => 
      new Date(tx.timestamp).getTime() > cutoffTime
    ).length;
  }

  getTotalAmount(userId: string, timeWindowMinutes: number): number {
    const userHistory = this.transactionHistory.get(userId) || [];
    const cutoffTime = new Date().getTime() - (timeWindowMinutes * 60 * 1000);
    
    return userHistory
      .filter(tx => new Date(tx.timestamp).getTime() > cutoffTime)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }
}
