import { Transaction, DetectionRule } from '../models/Transaction';

// Abstract interfaces for dependency injection
export interface IDataProvider {
  getTransactionHistory(userId: string, timeWindow: number): Promise<Transaction[]>;
  getUserProfile(userId: string): Promise<any>;
  getMerchantData(merchantId: string): Promise<any>;
  getLocationData(location: any): Promise<any>;
}

export interface IModelStorage {
  saveModel(modelId: string, model: MLModel): Promise<void>;
  loadModel(modelId: string): Promise<MLModel | null>;
  deleteModel(modelId: string): Promise<void>;
  listModels(): Promise<string[]>;
}

export interface IFeatureExtractor {
  name: string;
  extract(transaction: Transaction, context?: any): Promise<FeatureValue>;
}

export interface IAlgorithmProvider {
  name: string;
  analyze(features: FeatureVector, model: MLModel): Promise<number>;
  train(features: FeatureVector[], labels: number[], config: any): Promise<MLModel>;
}

export type FeatureValue = number | boolean | string;

export interface MLConfig {
  enableTraining: boolean;
  modelType: 'ensemble' | 'isolation_forest' | 'one_class_svm' | 'autoencoder' | 'gradient_boosting';
  contamination?: number;
  randomState?: number;
  features?: string[];
  modelPath?: string;
  featureExtractors?: string[];
  trainingDataSize?: number;
  retrainInterval?: number;
  anomalyThreshold?: number;
  enableFeatureImportance?: boolean;
  enableModelPersistence?: boolean;
  learningRate?: number;
  nEstimators?: number;
  maxDepth?: number;
  enableOnlineLearning?: boolean;
  driftDetectionThreshold?: number;
  
  // Dependency injection
  dataProvider?: IDataProvider;
  modelStorage?: IModelStorage;
  customFeatureExtractors?: IFeatureExtractor[];
  algorithmProvider?: IAlgorithmProvider;
}

export interface FeatureVector {
  [key: string]: number | boolean | string;
}

export interface MLModel {
  id: string;
  type: string;
  version: string;
  features: string[];
  weights: Map<string, number>;
  thresholds: Map<string, number>;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  lastTrained: Date;
  trainingDataSize: number;
}

export interface TrainingData {
  features: FeatureVector[];
  labels: number[];
  weights?: number[];
}

export class MLAlgorithm {
  private _config: MLConfig;
  private _models = new Map<string, MLModel>();
  private _featureHistory = new Map<string, FeatureVector[]>();
  private _performanceHistory = new Map<string, number[]>();
  private _lastRetrain = new Date();
  private _featureImportance = new Map<string, number>();
  private _featureExtractors = new Map<string, IFeatureExtractor>();
  private _dataProvider: IDataProvider;
  private _modelStorage: IModelStorage;
  private _algorithmProvider: IAlgorithmProvider;

  constructor(config: MLConfig) {
    this._config = {
      contamination: 0.1,
      randomState: 42,
      features: ['amount', 'hour', 'dayOfWeek', 'isWeekend', 'hasDevice', 'hasLocation', 'country'],
      featureExtractors: ['amount', 'velocity', 'location', 'merchant', 'device', 'time'],
      trainingDataSize: 10000,
      retrainInterval: 24,
      anomalyThreshold: 0.5,
      enableFeatureImportance: true,
      enableModelPersistence: true,
      learningRate: 0.01,
      nEstimators: 100,
      maxDepth: 6,
      enableOnlineLearning: true,
      driftDetectionThreshold: 0.1,
      ...config
    };

    // Initialize dependencies with fallbacks
    this._dataProvider = config.dataProvider || new DefaultDataProvider();
    this._modelStorage = config.modelStorage || new DefaultModelStorage();
    this._algorithmProvider = config.algorithmProvider || new DefaultAlgorithmProvider();

    this.initializeFeatureExtractors();
    this.initializeDefaultModel();
  }

  async analyze(transaction: Transaction, rule: DetectionRule): Promise<number> {
    try {
      // Extract comprehensive features
      const features = await this.extractFeatures(transaction);
      
      // Store features for training if enabled
      if (this._config.enableTraining) {
        this.storeFeatures(transaction.userId, features);
      }

      // Get the appropriate model
      const model = this.getModel(rule.name);
      
      // Calculate risk score using the model
      const riskScore = this.calculateRiskScore(features, model);
      
      // Apply online learning if enabled
      if (this._config.enableOnlineLearning) {
        this.updateModelOnline(features, riskScore, model);
      }

      // Check for model drift and retrain if necessary
      if (this.shouldRetrain()) {
        await this.retrainModelInternal(model);
      }

      return Math.min(Math.max(riskScore, 0), 1.0);
    } catch (error) {
      console.error('ML Algorithm error:', error);
      // Fallback to basic rule-based scoring
      return this.fallbackAnalysis(transaction);
    }
  }

  private async extractFeatures(transaction: Transaction): Promise<FeatureVector> {
    const timestamp = new Date(transaction.timestamp);
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const month = timestamp.getMonth();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = this.isHoliday(timestamp);
    
    // Normalize amount based on currency
    const normalizedAmount = this.normalizeAmount(transaction.amount, transaction.currency);
    
    // Calculate velocity features
    const velocityFeatures = await this.calculateVelocityFeatures(transaction);
    
    // Calculate location features
    const locationFeatures = await this.calculateLocationFeatures(transaction);
    
    // Calculate device features
    const deviceFeatures = await this.calculateDeviceFeatures(transaction);
    
    // Calculate merchant features
    const merchantFeatures = await this.calculateMerchantFeatures(transaction);
    
    // Calculate behavioral features
    const behavioralFeatures = await this.calculateBehavioralFeatures(transaction);

    return {
      // Basic features
      amount: normalizedAmount,
      hour: hour,
      dayOfWeek: dayOfWeek,
      month: month,
      isWeekend: isWeekend,
      isHoliday: isHoliday,
      
      // Device features
      hasDevice: !!transaction.deviceId,
      hasLocation: !!transaction.location,
      hasUserAgent: !!transaction.userAgent,
      hasIPAddress: !!transaction.ipAddress,
      
      // Location features
      country: this.encodeCountry(transaction.location?.country || 'unknown'),
      isInternational: this.isInternationalTransaction(transaction),
      distanceFromHome: locationFeatures.distanceFromHome,
      
      // Velocity features
      transactionsLastHour: velocityFeatures.transactionsLastHour,
      transactionsLastDay: velocityFeatures.transactionsLastDay,
      amountLastHour: velocityFeatures.amountLastHour,
      amountLastDay: velocityFeatures.amountLastDay,
      
      // Device features
      deviceRisk: deviceFeatures.deviceRisk,
      newDevice: deviceFeatures.newDevice,
      deviceVelocity: deviceFeatures.deviceVelocity,
      
      // Merchant features
      merchantRisk: merchantFeatures.merchantRisk,
      categoryRisk: merchantFeatures.categoryRisk,
      merchantVelocity: merchantFeatures.merchantVelocity,
      
      // Behavioral features
      spendingPatternDeviation: behavioralFeatures.spendingPatternDeviation,
      timingAnomaly: behavioralFeatures.timingAnomaly,
      locationAnomaly: behavioralFeatures.locationAnomaly,
      
      // Network features
      ipRisk: this.calculateIPRisk(transaction.ipAddress),
      proxyRisk: this.calculateProxyRisk(transaction),
      
      // Temporal features
      timeSinceLastTransaction: this.calculateTimeSinceLastTransaction(transaction),
      hourOfDayRisk: this.calculateHourRisk(hour),
      dayOfWeekRisk: this.calculateDayRisk(dayOfWeek),
      
      // Amount-based features
      amountRisk: this.calculateAmountRisk(normalizedAmount),
      roundAmount: this.isRoundAmount(transaction.amount),
      unusualAmount: this.isUnusualAmount(transaction.amount, transaction.userId),
      
      // Composite features
      riskMultiplier: this.calculateRiskMultiplier(transaction),
      anomalyScore: this.calculateAnomalyScore(transaction)
    };
  }

  private calculateRiskScore(features: FeatureVector, model: MLModel): number {
    let riskScore = 0.0;
    let totalWeight = 0.0;

    // Use model weights to calculate weighted risk score
    for (const [feature, value] of Object.entries(features)) {
      if (typeof value === 'number' && model.weights.has(feature)) {
        const weight = model.weights.get(feature)!;
        const normalizedValue = this.normalizeFeatureValue(feature, value);
        riskScore += normalizedValue * weight;
        totalWeight += Math.abs(weight);
      } else if (typeof value === 'boolean' && model.weights.has(feature)) {
        const weight = model.weights.get(feature)!;
        riskScore += (value ? 1 : 0) * weight;
        totalWeight += Math.abs(weight);
      }
    }

    // Apply model-specific calculations
    switch (model.type) {
      case 'ensemble':
        return this.ensemblePrediction(features, model);
      case 'isolation_forest':
        return this.isolationForestPrediction(features, model);
      case 'one_class_svm':
        return this.oneClassSVMPrediction(features, model);
      case 'autoencoder':
        return this.autoencoderPrediction(features, model);
      case 'gradient_boosting':
        return this.gradientBoostingPrediction(features, model);
      default:
        return totalWeight > 0 ? Math.min(riskScore / totalWeight, 1.0) : 0.0;
    }
  }

  private ensemblePrediction(features: FeatureVector, model: MLModel): number {
    // Ensemble of multiple models
    const predictions = [
      this.isolationForestPrediction(features, model),
      this.oneClassSVMPrediction(features, model),
      this.gradientBoostingPrediction(features, model)
    ];
    
    return predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length;
  }

  private isolationForestPrediction(features: FeatureVector, model: MLModel): number {
    // Simplified Isolation Forest implementation
    let anomalyScore = 0.0;
    const nTrees = this._config.nEstimators || 100;
    
    for (let i = 0; i < nTrees; i++) {
      const treeScore = this.isolationTreeScore(features, model);
      anomalyScore += treeScore;
    }
    
    return Math.min(anomalyScore / nTrees, 1.0);
  }

  private isolationTreeScore(features: FeatureVector, model: MLModel): number {
    // Simplified isolation tree scoring
    let score = 0.0;
    const featureKeys = Object.keys(features);
    
    for (const key of featureKeys) {
      if (model.weights.has(key)) {
        const value = features[key];
        const weight = model.weights.get(key)!;
        
        if (typeof value === 'number') {
          const normalizedValue = this.normalizeFeatureValue(key, value);
          score += Math.abs(normalizedValue - 0.5) * weight;
        }
      }
    }
    
    return Math.min(score / featureKeys.length, 1.0);
  }

  private oneClassSVMPrediction(features: FeatureVector, model: MLModel): number {
    // Simplified One-Class SVM implementation
    let distance = 0.0;
    let totalWeight = 0.0;
    
    for (const [feature, value] of Object.entries(features)) {
      if (model.weights.has(feature)) {
        const weight = model.weights.get(feature)!;
        const normalizedValue = this.normalizeFeatureValue(feature, value as number);
        const center = 0.5; // Assumed center of normal distribution
        distance += Math.pow(normalizedValue - center, 2) * weight;
        totalWeight += weight;
      }
    }
    
    const avgDistance = totalWeight > 0 ? distance / totalWeight : 0;
    return Math.min(avgDistance * 2, 1.0); // Scale to 0-1
  }

  private autoencoderPrediction(features: FeatureVector, model: MLModel): number {
    // Simplified Autoencoder implementation
    const input = this.vectorizeFeatures(features);
    const encoded = this.encode(input, model);
    const decoded = this.decode(encoded, model);
    const reconstructionError = this.calculateReconstructionError(input, decoded);
    
    return Math.min(reconstructionError, 1.0);
  }

  private gradientBoostingPrediction(features: FeatureVector, model: MLModel): number {
    // Simplified Gradient Boosting implementation
    let prediction = 0.0;
    const nEstimators = this._config.nEstimators || 100;
    
    for (let i = 0; i < nEstimators; i++) {
      const treePrediction = this.gradientBoostingTree(features, model, i);
      prediction += treePrediction * this._config.learningRate!;
    }
    
    return Math.min(Math.max(prediction, 0), 1.0);
  }

  private gradientBoostingTree(features: FeatureVector, model: MLModel, treeIndex: number): number {
    // Simplified decision tree for gradient boosting
    let prediction = 0.0;
    
    // Use different features for different trees
    const featureKeys = Object.keys(features);
    const selectedFeature = featureKeys[treeIndex % featureKeys.length];
    
    if (model.weights.has(selectedFeature)) {
      const value = features[selectedFeature];
      const weight = model.weights.get(selectedFeature)!;
      
      if (typeof value === 'number') {
        const normalizedValue = this.normalizeFeatureValue(selectedFeature, value);
        prediction = normalizedValue * weight;
      } else if (typeof value === 'boolean') {
        prediction = (value ? 1 : -1) * weight;
      }
    }
    
    return prediction;
  }

  private vectorizeFeatures(features: FeatureVector): number[] {
    return Object.values(features).map(value => {
      if (typeof value === 'number') return value;
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (typeof value === 'string') return this.encodeString(value);
      return 0;
    });
  }

  private encode(input: number[], model: MLModel): number[] {
    // Simplified encoding layer
    const encodedSize = Math.max(1, Math.floor(input.length / 2));
    const encoded = new Array(encodedSize).fill(0);
    
    for (let i = 0; i < encodedSize; i++) {
      for (let j = 0; j < input.length; j++) {
        const weight = model.weights.get(`encode_${i}_${j}`) || 0.1;
        encoded[i] += input[j] * weight;
      }
    }
    
    return encoded;
  }

  private decode(encoded: number[], model: MLModel): number[] {
    // Simplified decoding layer
    const decodedSize = encoded.length * 2;
    const decoded = new Array(decodedSize).fill(0);
    
    for (let i = 0; i < decodedSize; i++) {
      for (let j = 0; j < encoded.length; j++) {
        const weight = model.weights.get(`decode_${i}_${j}`) || 0.1;
        decoded[i] += encoded[j] * weight;
      }
    }
    
    return decoded;
  }

  private calculateReconstructionError(original: number[], reconstructed: number[]): number {
    let error = 0.0;
    const minLength = Math.min(original.length, reconstructed.length);
    
    for (let i = 0; i < minLength; i++) {
      error += Math.pow(original[i] - reconstructed[i], 2);
    }
    
    return Math.sqrt(error / minLength);
  }

  private normalizeFeatureValue(feature: string, value: number): number {
    // Normalize feature values to 0-1 range
    const normalizationRanges: { [key: string]: [number, number] } = {
      amount: [0, 100000],
      hour: [0, 23],
      dayOfWeek: [0, 6],
      month: [0, 11],
      transactionsLastHour: [0, 100],
      transactionsLastDay: [0, 1000],
      amountLastHour: [0, 50000],
      amountLastDay: [0, 500000]
    };
    
    const range = normalizationRanges[feature];
    if (range) {
      const [min, max] = range;
      return Math.min(Math.max((value - min) / (max - min), 0), 1);
    }
    
    return Math.min(Math.max(value, 0), 1);
  }

  private async calculateVelocityFeatures(transaction: Transaction): Promise<any> {
    try {
      const history = await this._dataProvider.getTransactionHistory(transaction.userId, 24);
      const now = new Date(transaction.timestamp);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const transactionsLastHour = history.filter(t => new Date(t.timestamp) >= oneHourAgo).length;
      const transactionsLastDay = history.filter(t => new Date(t.timestamp) >= oneDayAgo).length;
      const amountLastHour = history
        .filter(t => new Date(t.timestamp) >= oneHourAgo)
        .reduce((sum, t) => sum + t.amount, 0);
      const amountLastDay = history
        .filter(t => new Date(t.timestamp) >= oneDayAgo)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        transactionsLastHour,
        transactionsLastDay,
        amountLastHour,
        amountLastDay
      };
    } catch (error) {
      console.warn('Velocity features calculation failed:', error);
      return { transactionsLastHour: 0, transactionsLastDay: 0, amountLastHour: 0, amountLastDay: 0 };
    }
  }

  private async calculateLocationFeatures(transaction: Transaction): Promise<any> {
    try {
      if (!transaction.location) {
        return { distanceFromHome: 0, isInternational: false };
      }

      const userProfile = await this._dataProvider.getUserProfile(transaction.userId);
      const locationData = await this._dataProvider.getLocationData(transaction.location);
      
      const distanceFromHome = userProfile?.homeLocation ? 
        this.calculateDistance(userProfile.homeLocation, transaction.location) : 0;
      
      return {
        distanceFromHome,
        isInternational: this.isInternationalTransaction(transaction)
      };
    } catch (error) {
      console.warn('Location features calculation failed:', error);
      return { distanceFromHome: 0, isInternational: this.isInternationalTransaction(transaction) };
    }
  }

  private async calculateDeviceFeatures(transaction: Transaction): Promise<any> {
    try {
      const history = await this._dataProvider.getTransactionHistory(transaction.userId, 168); // 1 week
      const deviceHistory = history.filter(t => t.deviceId === transaction.deviceId);
      
      return {
        deviceRisk: transaction.deviceId ? 0.1 : 0.8,
        newDevice: !transaction.deviceId || deviceHistory.length === 0,
        deviceVelocity: deviceHistory.length
      };
    } catch (error) {
      console.warn('Device features calculation failed:', error);
      return {
        deviceRisk: transaction.deviceId ? 0.1 : 0.8,
        newDevice: !transaction.deviceId,
        deviceVelocity: 0
      };
    }
  }

  private async calculateMerchantFeatures(transaction: Transaction): Promise<any> {
    try {
      if (!transaction.merchantId) {
        return { merchantRisk: 0.5, categoryRisk: 0.5, merchantVelocity: 0 };
      }

      const merchantData = await this._dataProvider.getMerchantData(transaction.merchantId);
      const history = await this._dataProvider.getTransactionHistory(transaction.userId, 168);
      const merchantHistory = history.filter(t => t.merchantId === transaction.merchantId);
      
      const highRiskCategories = ['gambling', 'adult', 'cash_advance', 'cryptocurrency'];
      const categoryRisk = highRiskCategories.includes(transaction.merchantCategory || '') ? 0.8 : 0.1;
      
      return {
        merchantRisk: merchantData?.riskScore || 0.2,
        categoryRisk: categoryRisk,
        merchantVelocity: merchantHistory.length
      };
    } catch (error) {
      console.warn('Merchant features calculation failed:', error);
      const highRiskCategories = ['gambling', 'adult', 'cash_advance', 'cryptocurrency'];
      const categoryRisk = highRiskCategories.includes(transaction.merchantCategory || '') ? 0.8 : 0.1;
      
      return {
        merchantRisk: 0.2,
        categoryRisk: categoryRisk,
        merchantVelocity: 0
      };
    }
  }

  private async calculateBehavioralFeatures(transaction: Transaction): Promise<any> {
    try {
      const history = await this._dataProvider.getTransactionHistory(transaction.userId, 720); // 30 days
      const userProfile = await this._dataProvider.getUserProfile(transaction.userId);
      
      // Calculate spending pattern deviation
      const avgAmount = history.reduce((sum, t) => sum + t.amount, 0) / Math.max(history.length, 1);
      const spendingPatternDeviation = Math.abs(transaction.amount - avgAmount) / Math.max(avgAmount, 1);
      
      // Calculate timing anomaly
      const hour = new Date(transaction.timestamp).getHours();
      const hourHistory = history.map(t => new Date(t.timestamp).getHours());
      const hourFrequency = hourHistory.filter(h => h === hour).length / Math.max(hourHistory.length, 1);
      const timingAnomaly = 1 - hourFrequency;
      
      // Calculate location anomaly
      const locationHistory = history.filter(t => t.location?.country === transaction.location?.country).length;
      const locationAnomaly = 1 - (locationHistory / Math.max(history.length, 1));
      
      return {
        spendingPatternDeviation: Math.min(spendingPatternDeviation, 1),
        timingAnomaly: Math.min(timingAnomaly, 1),
        locationAnomaly: Math.min(locationAnomaly, 1)
      };
    } catch (error) {
      console.warn('Behavioral features calculation failed:', error);
      return {
        spendingPatternDeviation: 0.1,
        timingAnomaly: 0.1,
        locationAnomaly: 0.1
      };
    }
  }

  private calculateIPRisk(ipAddress?: string): number {
    if (!ipAddress) return 0.8;
    // Simplified IP risk calculation
    return 0.1;
  }

  private calculateProxyRisk(transaction: Transaction): number {
    // Simplified proxy detection
    return 0.1;
  }

  private calculateTimeSinceLastTransaction(transaction: Transaction): number {
    // This would integrate with transaction history
    return 0.5;
  }

  private calculateHourRisk(hour: number): number {
    const suspiciousHours = [0, 1, 2, 3, 4, 5, 22, 23];
    return suspiciousHours.includes(hour) ? 0.7 : 0.1;
  }

  private calculateDayRisk(dayOfWeek: number): number {
    return dayOfWeek === 0 || dayOfWeek === 6 ? 0.3 : 0.1;
  }

  private calculateAmountRisk(amount: number): number {
    if (amount > 10000) return 0.8;
    if (amount > 5000) return 0.5;
    if (amount > 1000) return 0.2;
    return 0.1;
  }

  private isRoundAmount(amount: number): boolean {
    return amount % 100 === 0;
  }

  private isUnusualAmount(amount: number, userId: string): boolean {
    // This would check against user's spending history
    return false;
  }

  private calculateRiskMultiplier(transaction: Transaction): number {
    let multiplier = 1.0;
    
    if (!transaction.deviceId) multiplier *= 1.5;
    if (!transaction.location) multiplier *= 1.3;
    if (this.isInternationalTransaction(transaction)) multiplier *= 1.2;
    if (transaction.amount > 10000) multiplier *= 1.4;
    
    return multiplier;
  }

  private calculateAnomalyScore(transaction: Transaction): number {
    // Composite anomaly score
    let score = 0.0;
    
    if (transaction.amount > 10000) score += 0.3;
    if (!transaction.deviceId) score += 0.2;
    if (this.isInternationalTransaction(transaction)) score += 0.2;
    if (this.isHoliday(new Date(transaction.timestamp))) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private isInternationalTransaction(transaction: Transaction): boolean {
    return transaction.location?.country !== 'US';
  }

  private isHoliday(date: Date): boolean {
    // Simplified holiday detection
    const month = date.getMonth();
    const day = date.getDate();
    
    // New Year's Day, Christmas, etc.
    return (month === 0 && day === 1) || (month === 11 && day === 25);
  }

  private normalizeAmount(amount: number, currency: string): number {
    const currencyMultipliers: { [key: string]: number } = {
      'USD': 1,
      'EUR': 1.1,
      'GBP': 1.3,
      'JPY': 0.007,
      'CAD': 0.75,
      'AUD': 0.65
    };
    
    return amount * (currencyMultipliers[currency] || 1);
  }

  private encodeCountry(country: string): number {
    const countryCodes: { [key: string]: number } = {
      'US': 1, 'CA': 2, 'GB': 3, 'DE': 4, 'FR': 5, 'NG': 6,
      'XX': 99, 'unknown': 0
    };
    
    return countryCodes[country] || 0;
  }

  private encodeString(str: string): number {
    // Simple string encoding
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  private storeFeatures(userId: string, features: FeatureVector): void {
    if (!this._featureHistory.has(userId)) {
      this._featureHistory.set(userId, []);
    }
    
    const userFeatures = this._featureHistory.get(userId)!;
    userFeatures.push(features);
    
    // Keep only recent features
    if (userFeatures.length > 1000) {
      userFeatures.splice(0, userFeatures.length - 1000);
    }
  }

  private updateModelOnline(features: FeatureVector, prediction: number, model: MLModel): void {
    // Simplified online learning
    const learningRate = this._config.learningRate!;
    
    for (const [feature, value] of Object.entries(features)) {
      if (model.weights.has(feature)) {
        const currentWeight = model.weights.get(feature)!;
        const normalizedValue = typeof value === 'number' ? this.normalizeFeatureValue(feature, value) : (value ? 1 : 0);
        const error = prediction - 0.5; // Target is 0.5 for balanced learning
        const newWeight = currentWeight + learningRate * error * normalizedValue;
        model.weights.set(feature, newWeight);
      }
    }
  }

  private shouldRetrain(): boolean {
    const hoursSinceLastRetrain = (Date.now() - this._lastRetrain.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRetrain >= (this._config.retrainInterval || 24);
  }

  private async retrainModelInternal(model: MLModel): Promise<void> {
    try {
      // Collect training data from feature history
      const trainingData = this.collectTrainingData();
      
      if (trainingData.features.length > 100) {
        await this.trainModel(model, trainingData);
        this._lastRetrain = new Date();
      }
    } catch (error) {
      console.error('Model retraining failed:', error);
    }
  }

  private collectTrainingData(): TrainingData {
    const features: FeatureVector[] = [];
    const labels: number[] = [];
    
    // This would collect actual training data in a real implementation
    // For now, we'll use synthetic data based on feature patterns
    
    for (const userFeatures of this._featureHistory.values()) {
      for (const featureVector of userFeatures) {
        features.push(featureVector);
        // Simple labeling based on feature patterns
        const label = this.generateLabel(featureVector);
        labels.push(label);
      }
    }
    
    return { features, labels };
  }

  private generateLabel(features: FeatureVector): number {
    // Simple labeling logic for training
    let riskScore = 0.0;
    
    if ((features.amount as number) > 0.8) riskScore += 0.3;
    if ((features.hour as number) < 0.2 || (features.hour as number) > 0.9) riskScore += 0.2;
    if (features.isWeekend) riskScore += 0.1;
    if (!features.hasDevice) riskScore += 0.2;
    if ((features.country as number) > 0.8) riskScore += 0.2;
    
    return riskScore > 0.5 ? 1 : 0;
  }

  private async trainModel(model: MLModel, trainingData: TrainingData): Promise<void> {
    // Simplified model training
    const features = trainingData.features;
    const labels = trainingData.labels;
    
    if (features.length === 0) return;
    
    // Calculate feature weights based on correlation with labels
    const featureKeys = Object.keys(features[0]);
    
    for (const featureKey of featureKeys) {
      const correlation = this.calculateCorrelation(
        features.map(f => typeof f[featureKey] === 'number' ? f[featureKey] as number : 0),
        labels
      );
      model.weights.set(featureKey, correlation);
    }
    
    // Update model performance metrics
    const predictions = features.map(f => this.calculateRiskScore(f, model));
    model.performance = this.calculatePerformanceMetrics(labels, predictions);
    model.lastTrained = new Date();
    model.trainingDataSize = features.length;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculatePerformanceMetrics(labels: number[], predictions: number[]): any {
    const threshold = 0.5;
    const predictedLabels = predictions.map(p => p >= threshold ? 1 : 0);
    
    let truePositives = 0, falsePositives = 0, trueNegatives = 0, falseNegatives = 0;
    
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] === 1 && predictedLabels[i] === 1) truePositives++;
      else if (labels[i] === 0 && predictedLabels[i] === 1) falsePositives++;
      else if (labels[i] === 0 && predictedLabels[i] === 0) trueNegatives++;
      else if (labels[i] === 1 && predictedLabels[i] === 0) falseNegatives++;
    }
    
    const accuracy = (truePositives + trueNegatives) / labels.length;
    const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    
    return { accuracy, precision, recall, f1Score };
  }

  private getModel(ruleName: string): MLModel {
    if (!this._models.has(ruleName)) {
      this.initializeDefaultModel();
    }
    return this._models.get(ruleName)!;
  }

  private initializeDefaultModel(): void {
    const defaultModel: MLModel = {
      id: 'default',
      type: this._config.modelType,
      version: '1.0.0',
      features: this._config.features!,
      weights: new Map(),
      thresholds: new Map(),
      performance: {
        accuracy: 0.5,
        precision: 0.5,
        recall: 0.5,
        f1Score: 0.5
      },
      lastTrained: new Date(),
      trainingDataSize: 0
    };
    
    // Initialize default weights
    for (const feature of this._config.features!) {
      defaultModel.weights.set(feature, Math.random() * 0.2 - 0.1); // Random weights between -0.1 and 0.1
    }
    
    this._models.set('ml', defaultModel);
  }

  private fallbackAnalysis(transaction: Transaction): number {
    // Fallback to simple rule-based analysis
    let riskScore = 0.0;
    
    if (transaction.amount > 10000) riskScore += 0.4;
    if (transaction.amount > 50000) riskScore += 0.3;
    
    const hour = new Date(transaction.timestamp).getHours();
    if (hour >= 0 && hour <= 5) riskScore += 0.3;
    
    const dayOfWeek = new Date(transaction.timestamp).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) riskScore += 0.2;
    
    if (!transaction.deviceId) riskScore += 0.3;
    if (!transaction.location) riskScore += 0.2;
    if (transaction.location?.country === 'XX') riskScore += 0.5;
    
    return Math.min(riskScore, 1.0);
  }

  // Public methods for external access
  public getModelPerformance(ruleName: string = 'ml'): any {
    const model = this._models.get(ruleName);
    return model ? model.performance : null;
  }

  public getFeatureImportance(ruleName: string = 'ml'): Map<string, number> {
    const model = this._models.get(ruleName);
    if (!model) return new Map();
    
    const importance = new Map<string, number>();
    for (const [feature, weight] of model.weights) {
      importance.set(feature, Math.abs(weight));
    }
    
    return importance;
  }

  public async retrainModel(ruleName: string = 'ml'): Promise<void> {
    const model = this._models.get(ruleName);
    if (model) {
      await this.retrainModelInternal(model);
    }
  }

  public saveModel(ruleName: string = 'ml', path?: string): Promise<void> {
    // Model persistence implementation
    return Promise.resolve();
  }

  public loadModel(ruleName: string = 'ml', path?: string): Promise<void> {
    // Model loading implementation
    return Promise.resolve();
  }

  // Helper methods
  private calculateDistance(loc1: any, loc2: any): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLon = this.toRadians(loc2.lng - loc1.lng);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(loc1.lat)) * Math.cos(this.toRadians(loc2.lat)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  private initializeFeatureExtractors(): void {
    // Register default feature extractors
    this._featureExtractors.set('amount', new AmountFeatureExtractor());
    this._featureExtractors.set('velocity', new VelocityFeatureExtractor(this._dataProvider));
    this._featureExtractors.set('location', new LocationFeatureExtractor(this._dataProvider));
    this._featureExtractors.set('device', new DeviceFeatureExtractor(this._dataProvider));
    this._featureExtractors.set('merchant', new MerchantFeatureExtractor(this._dataProvider));
    this._featureExtractors.set('behavioral', new BehavioralFeatureExtractor(this._dataProvider));
    
    // Register custom feature extractors
    if (this._config.customFeatureExtractors) {
      for (const extractor of this._config.customFeatureExtractors) {
        this._featureExtractors.set(extractor.name, extractor);
      }
    }
  }
}

// Default implementations for dependency injection
class DefaultDataProvider implements IDataProvider {
  async getTransactionHistory(userId: string, timeWindow: number): Promise<Transaction[]> {
    // Default implementation - returns empty array
    // In real implementation, this would connect to your database
    return [];
  }

  async getUserProfile(userId: string): Promise<any> {
    // Default implementation - returns null
    // In real implementation, this would fetch user profile from your system
    return null;
  }

  async getMerchantData(merchantId: string): Promise<any> {
    // Default implementation - returns null
    // In real implementation, this would fetch merchant data from your system
    return null;
  }

  async getLocationData(location: any): Promise<any> {
    // Default implementation - returns null
    // In real implementation, this would fetch location data from your system
    return null;
  }
}

class DefaultModelStorage implements IModelStorage {
  private models = new Map<string, MLModel>();

  async saveModel(modelId: string, model: MLModel): Promise<void> {
    // Default implementation - stores in memory
    // In real implementation, this would save to file system, database, or cloud storage
    this.models.set(modelId, model);
  }

  async loadModel(modelId: string): Promise<MLModel | null> {
    // Default implementation - loads from memory
    // In real implementation, this would load from file system, database, or cloud storage
    return this.models.get(modelId) || null;
  }

  async deleteModel(modelId: string): Promise<void> {
    this.models.delete(modelId);
  }

  async listModels(): Promise<string[]> {
    return Array.from(this.models.keys());
  }
}

class DefaultAlgorithmProvider implements IAlgorithmProvider {
  name = 'default';

  async analyze(features: FeatureVector, model: MLModel): Promise<number> {
    // Default implementation - simple weighted scoring
    let score = 0.0;
    let totalWeight = 0.0;

    for (const [feature, value] of Object.entries(features)) {
      if (model.weights.has(feature)) {
        const weight = model.weights.get(feature)!;
        const normalizedValue = typeof value === 'number' ? value : (value ? 1 : 0);
        score += normalizedValue * weight;
        totalWeight += Math.abs(weight);
      }
    }

    return totalWeight > 0 ? Math.min(score / totalWeight, 1.0) : 0.0;
  }

  async train(features: FeatureVector[], labels: number[], config: any): Promise<MLModel> {
    // Default implementation - simple correlation-based training
    const model: MLModel = {
      id: 'trained',
      type: 'default',
      version: '1.0.0',
      features: Object.keys(features[0] || {}),
      weights: new Map(),
      thresholds: new Map(),
      performance: { accuracy: 0.5, precision: 0.5, recall: 0.5, f1Score: 0.5 },
      lastTrained: new Date(),
      trainingDataSize: features.length
    };

    // Calculate feature weights based on correlation
    for (const feature of model.features) {
      const values = features.map(f => typeof f[feature] === 'number' ? f[feature] as number : 0);
      const correlation = this.calculateCorrelation(values, labels);
      model.weights.set(feature, correlation);
    }

    return model;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
}

// Default feature extractors
class AmountFeatureExtractor implements IFeatureExtractor {
  name = 'amount';

  async extract(transaction: Transaction): Promise<FeatureValue> {
    return transaction.amount;
  }
}

class VelocityFeatureExtractor implements IFeatureExtractor {
  name = 'velocity';
  constructor(private dataProvider: IDataProvider) {}

  async extract(transaction: Transaction): Promise<FeatureValue> {
    const history = await this.dataProvider.getTransactionHistory(transaction.userId, 24);
    return history.length;
  }
}

class LocationFeatureExtractor implements IFeatureExtractor {
  name = 'location';
  constructor(private dataProvider: IDataProvider) {}

  async extract(transaction: Transaction): Promise<FeatureValue> {
    return transaction.location?.country || 'unknown';
  }
}

class DeviceFeatureExtractor implements IFeatureExtractor {
  name = 'device';
  constructor(private dataProvider: IDataProvider) {}

  async extract(transaction: Transaction): Promise<FeatureValue> {
    return !!transaction.deviceId;
  }
}

class MerchantFeatureExtractor implements IFeatureExtractor {
  name = 'merchant';
  constructor(private dataProvider: IDataProvider) {}

  async extract(transaction: Transaction): Promise<FeatureValue> {
    return transaction.merchantCategory || 'unknown';
  }
}

class BehavioralFeatureExtractor implements IFeatureExtractor {
  name = 'behavioral';
  constructor(private dataProvider: IDataProvider) {}

  async extract(transaction: Transaction): Promise<FeatureValue> {
    const history = await this.dataProvider.getTransactionHistory(transaction.userId, 168);
    const avgAmount = history.reduce((sum, t) => sum + t.amount, 0) / Math.max(history.length, 1);
    return Math.abs(transaction.amount - avgAmount) / Math.max(avgAmount, 1);
  }
}
