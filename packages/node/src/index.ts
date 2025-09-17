// Re-export all public types and classes
export { FraudDetector } from '../../core/FraudDetector';
export { 
  Transaction, 
  Location, 
  FraudResult, 
  DetectionRule, 
  FraudDetectorConfig 
} from '../../core/models/Transaction';

// Re-export individual algorithms for advanced usage
export { VelocityAlgorithm, VelocityConfig } from '../../core/algorithms/VelocityAlgorithm';
export { AmountAlgorithm, AmountConfig } from '../../core/algorithms/AmountAlgorithm';
export { LocationAlgorithm, LocationConfig } from '../../core/algorithms/LocationAlgorithm';

// Default export for convenience
export { FraudDetector as default } from '../../core/FraudDetector';
