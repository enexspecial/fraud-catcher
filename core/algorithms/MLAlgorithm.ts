import { Transaction, DetectionRule } from '../models/Transaction';

export interface MLConfig {
  enableTraining: boolean;
  modelType: 'isolation_forest' | 'one_class_svm' | 'local_outlier_factor' | 'ensemble';
  featureExtractors: string[];
  trainingDataSize: number;
  retrainInterval: number; // in hours
  anomalyThreshold: number;
  enableFeatureImportance: boolean;
  enableModelPersistence: boolean;
  modelPath?: string;
}

export interface MLFeatures {
  amount: number;
  amountLog: number;
  hour: number;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  userTransactionCount: number;
  userTotalAmount: number;
  userAverageAmount: number;
  userVelocity: number;
  locationLat?: number;
  locationLng?: number;
  merchantCategoryRisk?: number;
  deviceNewness: number;
  ipRiskScore?: number;
  timeSinceLastTransaction: number;
  amountDeviation: number;
  locationDistance?: number;
  merchantVelocity: number;
  [key: string]: any;
}

export interface MLModel {
  name: string;
  type: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  features: string[];
  trainedAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

export class MLAlgorithm {
  private config: MLConfig;
  private models: Map<string, any> = new Map();
  private featureHistory: Map<string, MLFeatures[]> = new Map();
  private trainingData: MLFeatures[] = [];
  private lastTrainingTime: Date = new Date();

  constructor(config: MLConfig) {
    this.config = config;
    this.initializeModels();
  }

  async analyze(transaction: Transaction, rule: DetectionRule): Promise<number> {
    if (!this.config.enableTraining) {
      return 0.0; // ML disabled
    }

    // Extract features from transaction
    const features = await this.extractFeatures(transaction);
    
    // Store features for training
    this.storeFeatures(transaction.userId, features);

    // Get anomaly score from active model
    const anomalyScore = await this.getAnomalyScore(features);
    
    // Convert anomaly score to risk score (0-1)
    const riskScore = this.convertAnomalyScoreToRisk(anomalyScore);

    // Retrain model if needed
    await this.checkAndRetrain();

    return Math.min(riskScore, 1.0);
  }

  private async extractFeatures(transaction: Transaction): Promise<MLFeatures> {
    const transactionTime = new Date(transaction.timestamp);
    const hour = transactionTime.getHours();
    const dayOfWeek = transactionTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Get user history for velocity calculations
    const userHistory = this.getUserHistory(transaction.userId);
    const userTransactionCount = userHistory.length;
    const userTotalAmount = userHistory.reduce((sum, tx) => sum + tx.amount, 0);
    const userAverageAmount = userTransactionCount > 0 ? userTotalAmount / userTransactionCount : 0;
    
    // Calculate user velocity (transactions per hour)
    const userVelocity = this.calculateUserVelocity(transaction.userId);
    
    // Calculate time since last transaction
    const timeSinceLastTransaction = this.calculateTimeSinceLastTransaction(transaction.userId, transactionTime);
    
    // Calculate amount deviation from user average
    const amountDeviation = userAverageAmount > 0 ? 
      Math.abs(transaction.amount - userAverageAmount) / userAverageAmount : 0;
    
    // Calculate location distance from user's common locations
    const locationDistance = this.calculateLocationDistance(transaction);
    
    // Calculate merchant velocity
    const merchantVelocity = this.calculateMerchantVelocity(transaction.merchantId);
    
    // Calculate device newness (0 = new, 1 = old)
    const deviceNewness = this.calculateDeviceNewness(transaction.deviceId);
    
    // Calculate merchant category risk
    const merchantCategoryRisk = this.calculateMerchantCategoryRisk(transaction.merchantCategory);
    
    // Calculate IP risk score
    const ipRiskScore = this.calculateIPRiskScore(transaction.ipAddress);

    const features: MLFeatures = {
      amount: transaction.amount,
      amountLog: Math.log(transaction.amount + 1), // Log transform for better distribution
      hour,
      dayOfWeek,
      isWeekend: isWeekend ? 1 : 0,
      isHoliday: this.isHoliday(transactionTime) ? 1 : 0,
      userTransactionCount,
      userTotalAmount,
      userAverageAmount,
      userVelocity,
      locationLat: transaction.location?.lat,
      locationLng: transaction.location?.lng,
      merchantCategoryRisk,
      deviceNewness,
      ipRiskScore,
      timeSinceLastTransaction,
      amountDeviation,
      locationDistance,
      merchantVelocity
    };

    return features;
  }

  private getUserHistory(userId: string): Transaction[] {
    // This would return user's transaction history
    // For now, return empty array
    return [];
  }

  private calculateUserVelocity(userId: string): number {
    // Calculate transactions per hour for the user
    // This would use actual transaction history
    return 0.5; // Placeholder
  }

  private calculateTimeSinceLastTransaction(userId: string, currentTime: Date): number {
    // Calculate hours since last transaction
    // This would use actual transaction history
    return 24; // Placeholder - 24 hours
  }

  private calculateLocationDistance(transaction: Transaction): number | undefined {
    if (!transaction.location) return undefined;
    
    // Calculate distance from user's most common location
    // This would use actual location history
    return 0; // Placeholder
  }

  private calculateMerchantVelocity(merchantId: string | undefined): number {
    if (!merchantId) return 0;
    
    // Calculate transactions per hour for this merchant
    // This would use actual merchant transaction history
    return 0.1; // Placeholder
  }

  private calculateDeviceNewness(deviceId: string | undefined): number {
    if (!deviceId) return 1; // New device
    
    // Calculate how long this device has been used
    // This would use actual device history
    return 0.8; // Placeholder - 80% newness
  }

  private calculateMerchantCategoryRisk(category: string | undefined): number {
    if (!category) return 0.5; // Unknown category
    
    // Risk scores for different categories
    const categoryRisks: Record<string, number> = {
      'electronics': 0.3,
      'grocery': 0.1,
      'gas': 0.2,
      'restaurant': 0.2,
      'travel': 0.6,
      'gambling': 0.8,
      'adult': 0.9,
      'pharmacy': 0.4,
      'jewelry': 0.7,
      'cash_advance': 0.9
    };
    
    return categoryRisks[category] || 0.5;
  }

  private calculateIPRiskScore(ipAddress: string | undefined): number {
    if (!ipAddress) return 0.5; // Unknown IP
    
    // This would use IP reputation data
    // For now, return a random score
    return Math.random() * 0.5; // Placeholder
  }

  private isHoliday(date: Date): boolean {
    // Simplified holiday detection
    // In production, use a proper holiday library
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // New Year's Day
    if (month === 1 && day === 1) return true;
    // Christmas
    if (month === 12 && day === 25) return true;
    
    return false;
  }

  private storeFeatures(userId: string, features: MLFeatures): void {
    if (!this.featureHistory.has(userId)) {
      this.featureHistory.set(userId, []);
    }
    
    const userFeatures = this.featureHistory.get(userId)!;
    userFeatures.push(features);
    
    // Keep only recent features
    if (userFeatures.length > 1000) {
      userFeatures.splice(0, userFeatures.length - 1000);
    }
    
    // Add to training data
    this.trainingData.push(features);
    
    // Keep training data size manageable
    if (this.trainingData.length > this.config.trainingDataSize) {
      this.trainingData.splice(0, this.trainingData.length - this.config.trainingDataSize);
    }
  }

  private async getAnomalyScore(features: MLFeatures): Promise<number> {
    const activeModel = this.getActiveModel();
    if (!activeModel) {
      return 0.5; // No model available
    }
    
    // Convert features to array for model prediction
    const featureArray = this.featuresToArray(features);
    
    try {
      // This would use the actual ML model
      // For now, return a random score
      return Math.random();
    } catch (error) {
      console.error('Error getting anomaly score:', error);
      return 0.5;
    }
  }

  private featuresToArray(features: MLFeatures): number[] {
    // Convert features object to array for ML model
    const featureArray: number[] = [];
    
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === 'number') {
        featureArray.push(value);
      } else if (typeof value === 'boolean') {
        featureArray.push(value ? 1 : 0);
      } else if (value === undefined || value === null) {
        featureArray.push(0);
      }
    }
    
    return featureArray;
  }

  private convertAnomalyScoreToRisk(anomalyScore: number): number {
    // Convert anomaly score to risk score (0-1)
    // This depends on the ML model used
    if (anomalyScore < 0.1) return 0.1; // Low risk
    if (anomalyScore < 0.3) return 0.3; // Medium risk
    if (anomalyScore < 0.7) return 0.7; // High risk
    return 0.9; // Very high risk
  }

  private async checkAndRetrain(): Promise<void> {
    const now = new Date();
    const hoursSinceLastTraining = (now.getTime() - this.lastTrainingTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastTraining >= this.config.retrainInterval) {
      await this.retrainModels();
      this.lastTrainingTime = now;
    }
  }

  private async retrainModels(): Promise<void> {
    if (this.trainingData.length < 100) {
      return; // Not enough data for training
    }
    
    try {
      // This would implement actual model training
      // For now, just log that training would happen
      console.log(`Retraining models with ${this.trainingData.length} samples`);
      
      // Update model metadata
      for (const [modelName, model] of this.models) {
        if (model) {
          model.lastUsed = new Date();
        }
      }
    } catch (error) {
      console.error('Error retraining models:', error);
    }
  }

  private initializeModels(): void {
    // Initialize ML models based on configuration
    const modelTypes = this.config.modelType === 'ensemble' ? 
      ['isolation_forest', 'one_class_svm', 'local_outlier_factor'] : 
      [this.config.modelType];
    
    for (const modelType of modelTypes) {
      this.models.set(modelType, {
        name: modelType,
        type: modelType,
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        features: this.config.featureExtractors,
        trainedAt: new Date(),
        lastUsed: new Date(),
        isActive: modelType === this.config.modelType
      });
    }
  }

  private getActiveModel(): any {
    for (const [name, model] of this.models) {
      if (model.isActive) {
        return model;
      }
    }
    return null;
  }

  // Utility methods
  getModelInfo(modelName: string): MLModel | undefined {
    return this.models.get(modelName);
  }

  getAllModels(): MLModel[] {
    return Array.from(this.models.values());
  }

  getFeatureImportance(): Record<string, number> {
    // This would return feature importance from the trained model
    // For now, return placeholder data
    return {
      amount: 0.3,
      userVelocity: 0.25,
      locationDistance: 0.2,
      merchantCategoryRisk: 0.15,
      deviceNewness: 0.1
    };
  }

  getTrainingDataSize(): number {
    return this.trainingData.length;
  }

  getFeatureHistorySize(userId: string): number {
    return this.featureHistory.get(userId)?.length || 0;
  }

  async forceRetrain(): Promise<void> {
    await this.retrainModels();
    this.lastTrainingTime = new Date();
  }

  exportModel(modelName: string): any {
    // Export model for persistence
    const model = this.models.get(modelName);
    if (!model) return null;
    
    return {
      ...model,
      trainingData: this.trainingData.slice(-1000), // Last 1000 samples
      exportedAt: new Date()
    };
  }

  importModel(modelData: any): boolean {
    try {
      // Import model from persistence
      this.models.set(modelData.name, modelData);
      return true;
    } catch (error) {
      console.error('Error importing model:', error);
      return false;
    }
  }
}
