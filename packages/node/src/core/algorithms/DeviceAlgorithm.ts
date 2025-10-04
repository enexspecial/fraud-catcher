import { Transaction, DetectionRule } from '../models/Transaction';

export interface DeviceConfig {
  enableFingerprinting: boolean;
  suspiciousDeviceThreshold: number;
  newDeviceRiskMultiplier: number;
  deviceVelocityWindow: number; // in minutes
  maxDevicesPerUser: number;
}

export interface DeviceFingerprint {
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  firstSeen: Date;
  lastSeen: Date;
  transactionCount: number;
  totalAmount: number;
  isTrusted: boolean;
}

export class DeviceAlgorithm {
  private config: DeviceConfig;
  private deviceFingerprints: Map<string, DeviceFingerprint> = new Map();
  private userDevices: Map<string, Set<string>> = new Map();

  constructor(config: DeviceConfig) {
    this.config = config;
  }

  async analyze(transaction: Transaction, _rule: DetectionRule): Promise<number> {
    if (!transaction.deviceId && !transaction.userAgent && !transaction.ipAddress) {
      return 0.0; // No device data available
    }

    const deviceId = transaction.deviceId || this.generateDeviceId(transaction);
    const fingerprint = this.createFingerprint(transaction, deviceId);
    
    let riskScore = 0.0;

    // Check if device is new or suspicious
    const existingFingerprint = this.deviceFingerprints.get(deviceId);
    
    if (!existingFingerprint) {
      // New device - check if user has too many devices
      const userDeviceCount = this.getUserDeviceCount(transaction.userId);
      if (userDeviceCount >= this.config.maxDevicesPerUser) {
        riskScore += 0.6; // High risk for too many devices
      } else {
        riskScore += 0.3; // Medium risk for new device
      }
      
      // Store new device
      this.deviceFingerprints.set(deviceId, fingerprint);
      this.addUserDevice(transaction.userId, deviceId);
    } else {
      // Existing device - check for anomalies
      const deviceRisk = this.calculateDeviceRisk(existingFingerprint, fingerprint);
      riskScore += deviceRisk;
      
      // Update device fingerprint
      this.updateDeviceFingerprint(deviceId, transaction);
    }

    // Check device velocity (transactions per device)
    const deviceVelocity = this.calculateDeviceVelocity(deviceId);
    if (deviceVelocity > this.config.suspiciousDeviceThreshold) {
      riskScore += 0.4;
    }

    // Check for device sharing patterns
    const sharingRisk = this.calculateDeviceSharingRisk(deviceId, transaction.userId);
    riskScore += sharingRisk;

    return Math.min(riskScore, 1.0);
  }

  private generateDeviceId(transaction: Transaction): string {
    // Generate device ID from available data
    const components = [
      transaction.userAgent || 'unknown',
      transaction.ipAddress || 'unknown',
      transaction.metadata?.['screenResolution'] || 'unknown'
    ];
    
    return `device_${this.hashString(components.join('|'))}`;
  }

  private createFingerprint(transaction: Transaction, deviceId: string): DeviceFingerprint {
    const now = new Date();
    
    return {
      deviceId,
      userAgent: transaction.userAgent || '',
      ipAddress: transaction.ipAddress || '',
      screenResolution: transaction.metadata?.['screenResolution'],
      timezone: transaction.metadata?.['timezone'],
      language: transaction.metadata?.['language'],
      platform: transaction.metadata?.['platform'],
      firstSeen: now,
      lastSeen: now,
      transactionCount: 1,
      totalAmount: transaction.amount,
      isTrusted: false
    };
  }

  private calculateDeviceRisk(existing: DeviceFingerprint, current: DeviceFingerprint): number {
    let riskScore = 0.0;

    // Check for device fingerprint changes
    if (existing.userAgent !== current.userAgent) {
      riskScore += 0.3; // User agent changed
    }

    if (existing.ipAddress !== current.ipAddress) {
      riskScore += 0.2; // IP address changed
    }

    if (existing.screenResolution !== current.screenResolution) {
      riskScore += 0.1; // Screen resolution changed
    }

    if (existing.timezone !== current.timezone) {
      riskScore += 0.1; // Timezone changed
    }

    // Check for rapid device changes
    const timeDiff = current.lastSeen.getTime() - existing.lastSeen.getTime();
    if (timeDiff < 60000) { // Less than 1 minute
      riskScore += 0.2; // Rapid device switching
    }

    return Math.min(riskScore, 0.8);
  }

  private calculateDeviceVelocity(deviceId: string): number {
    const fingerprint = this.deviceFingerprints.get(deviceId);
    if (!fingerprint) return 0;

    const timeWindow = this.config.deviceVelocityWindow * 60 * 1000; // Convert to milliseconds
    const now = new Date();
    const timeDiff = now.getTime() - fingerprint.firstSeen.getTime();
    
    if (timeDiff < timeWindow) {
      return fingerprint.transactionCount / (timeDiff / (60 * 1000)); // Transactions per minute
    }
    
    return 0;
  }

  private calculateDeviceSharingRisk(deviceId: string, _userId: string): number {
    // Check if device is used by multiple users
    const deviceUsers = this.getDeviceUsers(deviceId);
    if (deviceUsers.size > 1) {
      return 0.5; // High risk for device sharing
    }
    
    return 0.0;
  }

  private getUserDeviceCount(userId: string): number {
    return this.userDevices.get(userId)?.size || 0;
  }

  private addUserDevice(userId: string, deviceId: string): void {
    if (!this.userDevices.has(userId)) {
      this.userDevices.set(userId, new Set());
    }
    this.userDevices.get(userId)!.add(deviceId);
  }

  private getDeviceUsers(deviceId: string): Set<string> {
    const users = new Set<string>();
    for (const [userId, devices] of this.userDevices) {
      if (devices.has(deviceId)) {
        users.add(userId);
      }
    }
    return users;
  }

  private updateDeviceFingerprint(deviceId: string, transaction: Transaction): void {
    const fingerprint = this.deviceFingerprints.get(deviceId);
    if (fingerprint) {
      fingerprint.lastSeen = new Date(transaction.timestamp);
      fingerprint.transactionCount++;
      fingerprint.totalAmount += transaction.amount;
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Utility methods
  getDeviceFingerprint(deviceId: string): DeviceFingerprint | undefined {
    return this.deviceFingerprints.get(deviceId);
  }

  getUserDevices(userId: string): string[] {
    return Array.from(this.userDevices.get(userId) || []);
  }

  markDeviceAsTrusted(deviceId: string): void {
    const fingerprint = this.deviceFingerprints.get(deviceId);
    if (fingerprint) {
      fingerprint.isTrusted = true;
    }
  }

  getDeviceStats(deviceId: string): { transactionCount: number; totalAmount: number; isTrusted: boolean } {
    const fingerprint = this.deviceFingerprints.get(deviceId);
    if (!fingerprint) {
      return { transactionCount: 0, totalAmount: 0, isTrusted: false };
    }
    
    return {
      transactionCount: fingerprint.transactionCount,
      totalAmount: fingerprint.totalAmount,
      isTrusted: fingerprint.isTrusted
    };
  }
}
