#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to fix with their specific issues
const fixes = [
  // BehavioralAlgorithm.ts
  {
    file: 'core/algorithms/BehavioralAlgorithm.ts',
    fixes: [
      { from: 'profile: UserBehaviorProfile', to: '_profile: UserBehaviorProfile' },
      { from: 'userId: string', to: '_userId: string' }
    ]
  },
  // DeviceAlgorithm.ts
  {
    file: 'core/algorithms/DeviceAlgorithm.ts',
    fixes: [
      { from: "transaction.metadata?.screenResolution", to: "transaction.metadata?.['screenResolution']" },
      { from: "transaction.metadata?.timezone", to: "transaction.metadata?.['timezone']" },
      { from: "transaction.metadata?.language", to: "transaction.metadata?.['language']" },
      { from: "transaction.metadata?.platform", to: "transaction.metadata?.['platform']" },
      { from: 'userId: string', to: '_userId: string' }
    ]
  },
  // MerchantAlgorithm.ts
  {
    file: 'core/algorithms/MerchantAlgorithm.ts',
    fixes: [
      { from: 'rule: DetectionRule', to: '_rule: DetectionRule' },
      { from: "transaction.metadata?.merchantName", to: "transaction.metadata?.['merchantName']" },
      { from: 'expectedVariance: number', to: '_expectedVariance: number' }
    ]
  },
  // MLAlgorithm.ts
  {
    file: 'core/algorithms/MLAlgorithm.ts',
    fixes: [
      { from: 'rule: DetectionRule', to: '_rule: DetectionRule' },
      { from: 'enableTraining: true', to: 'enableTraining: true' },
      { from: 'enableTraining: false', to: 'enableTraining: false' },
      { from: 'userId: string', to: '_userId: string' },
      { from: 'currentTime: Date', to: '_currentTime: Date' },
      { from: 'featureArray: number[]', to: '_featureArray: number[]' },
      { from: 'key: string', to: '_key: string' },
      { from: 'modelName: string', to: '_modelName: string' },
      { from: 'name: string', to: '_name: string' }
    ]
  },
  // NetworkAlgorithm.ts
  {
    file: 'core/algorithms/NetworkAlgorithm.ts',
    fixes: [
      { from: 'rule: DetectionRule', to: '_rule: DetectionRule' },
      { from: 'transaction.ipAddress!', to: 'transaction.ipAddress || ""' }
    ]
  },
  // TimeAlgorithm.ts
  {
    file: 'core/algorithms/TimeAlgorithm.ts',
    fixes: [
      { from: 'rule: DetectionRule', to: '_rule: DetectionRule' },
      { from: "transaction.metadata?.timezone", to: "transaction.metadata?.['timezone']" },
      { from: 'transaction.timezone!', to: 'transaction.timezone || ""' },
      { from: 'hour: number | undefined', to: 'hour: number' },
      { from: 'dayOfWeek: number | undefined', to: 'dayOfWeek: number' }
    ]
  },
  // FraudDetector.ts
  {
    file: 'core/FraudDetector.ts',
    fixes: [
      { from: 'this.config.thresholds.velocity', to: 'this.config.thresholds["velocity"]' },
      { from: 'this.config.thresholds.amount', to: 'this.config.thresholds["amount"]' },
      { from: 'this.config.thresholds.location', to: 'this.config.thresholds["location"]' },
      { from: 'this.config.thresholds.device', to: 'this.config.thresholds["device"]' },
      { from: 'this.config.thresholds.time', to: 'this.config.thresholds["time"]' },
      { from: 'this.config.thresholds.merchant', to: 'this.config.thresholds["merchant"]' },
      { from: 'this.config.thresholds.behavioral', to: 'this.config.thresholds["behavioral"]' },
      { from: 'this.config.thresholds.network', to: 'this.config.thresholds["network"]' },
      { from: 'this.config.thresholds.ml', to: 'this.config.thresholds["ml"]' }
    ]
  }
];

// Apply fixes
fixes.forEach(({ file, fixes: fileFixes }) => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  fileFixes.forEach(({ from, to }) => {
    const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, to);
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${file}`);
});

console.log('TypeScript error fixes applied!');
