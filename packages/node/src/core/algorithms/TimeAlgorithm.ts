import { Transaction, DetectionRule } from '../models/Transaction';

export interface TimeConfig {
  suspiciousHours: number[]; // Hours considered suspicious (0-23)
  weekendRiskMultiplier: number;
  holidayRiskMultiplier: number;
  timezoneThreshold: number; // Hours difference to consider suspicious
  enableHolidayDetection: boolean;
  customHolidays?: Date[];
}

export interface TimePattern {
  hour: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  isWeekend: boolean;
  isHoliday: boolean;
  timezone: string;
  riskScore: number;
}

export class TimeAlgorithm {
  private config: TimeConfig;
  private userTimePatterns: Map<string, TimePattern[]> = new Map();
  private holidays: Set<string> = new Set();

  constructor(config: TimeConfig) {
    this.config = config;
    this.initializeHolidays();
  }

  async analyze(transaction: Transaction, _rule: DetectionRule): Promise<number> {
    const transactionTime = new Date(transaction.timestamp);
    const timePattern = this.analyzeTimePattern(transactionTime, transaction);
    
    let riskScore = 0.0;

    // Check for suspicious hours
    if (this.config.suspiciousHours.includes(timePattern.hour)) {
      riskScore += 0.4;
    }

    // Check for weekend transactions
    if (timePattern.isWeekend) {
      riskScore += 0.2 * this.config.weekendRiskMultiplier;
    }

    // Check for holiday transactions
    if (timePattern.isHoliday) {
      riskScore += 0.3 * this.config.holidayRiskMultiplier;
    }

    // Check for unusual time patterns for this user
    const userPatternRisk = this.analyzeUserTimePattern(transaction.userId, timePattern);
    riskScore += userPatternRisk;

    // Check for timezone anomalies
    const timezoneRisk = this.analyzeTimezoneAnomaly(transaction, timePattern);
    riskScore += timezoneRisk;

    // Store pattern for future analysis
    this.storeUserTimePattern(transaction.userId, timePattern);

    return Math.min(riskScore, 1.0);
  }

  private analyzeTimePattern(transactionTime: Date, transaction: Transaction): TimePattern {
    const hour = transactionTime.getHours();
    const dayOfWeek = transactionTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    const isHoliday = this.isHoliday(transactionTime);
    const timezone = this.extractTimezone(transaction);
    
    return {
      hour,
      dayOfWeek,
      isWeekend,
      isHoliday,
      timezone,
      riskScore: 0.0
    };
  }

  private analyzeUserTimePattern(userId: string, currentPattern: TimePattern): number {
    const userPatterns = this.userTimePatterns.get(userId) || [];
    
    if (userPatterns.length === 0) {
      return 0.1; // Slight risk for first transaction
    }

    // Analyze frequency of transactions at this time
    const similarPatterns = userPatterns.filter(pattern => 
      pattern.hour === currentPattern.hour && 
      pattern.dayOfWeek === currentPattern.dayOfWeek
    );

    const totalPatterns = userPatterns.length;
    const similarCount = similarPatterns.length;
    const frequency = similarCount / totalPatterns;

    // If user rarely transacts at this time, it's suspicious
    if (frequency < 0.1) {
      return 0.3;
    } else if (frequency < 0.3) {
      return 0.1;
    }

    return 0.0;
  }

  private analyzeTimezoneAnomaly(transaction: Transaction, timePattern: TimePattern): number {
    if (!transaction.location) {
      return 0.0; // No location data
    }

    // Extract timezone from location or transaction metadata
    const expectedTimezone = this.getTimezoneFromLocation(transaction.location);
    const actualTimezone = timePattern.timezone;

    if (expectedTimezone && actualTimezone) {
      const timezoneDiff = this.calculateTimezoneDifference(expectedTimezone, actualTimezone);
      if (timezoneDiff > this.config.timezoneThreshold) {
        return 0.4; // High risk for timezone mismatch
      }
    }

    return 0.0;
  }

  private extractTimezone(transaction: Transaction): string {
    // Try to extract timezone from various sources
    if (transaction.metadata?.['timezone']) {
      return transaction.metadata.timezone;
    }

    if (transaction.location?.country) {
      return this.getCountryTimezone(transaction.location.country);
    }

    // Default to UTC
    return 'UTC';
  }

  private getTimezoneFromLocation(location: any): string | null {
    if (location.country) {
      return this.getCountryTimezone(location.country);
    }
    return null;
  }

  private getCountryTimezone(country: string): string {
    // Simplified timezone mapping - in production, use a proper timezone library
    const timezoneMap: Record<string, string> = {
      'US': 'America/New_York',
      'GB': 'Europe/London',
      'DE': 'Europe/Berlin',
      'FR': 'Europe/Paris',
      'JP': 'Asia/Tokyo',
      'AU': 'Australia/Sydney',
      'CA': 'America/Toronto',
      'BR': 'America/Sao_Paulo',
      'IN': 'Asia/Kolkata',
      'CN': 'Asia/Shanghai'
    };

    return timezoneMap[country] || 'UTC';
  }

  private calculateTimezoneDifference(tz1: string, tz2: string): number {
    // Simplified timezone difference calculation
    // In production, use a proper timezone library like moment-timezone
    const timezoneOffsets: Record<string, number> = {
      'UTC': 0,
      'America/New_York': -5,
      'Europe/London': 0,
      'Europe/Berlin': 1,
      'Europe/Paris': 1,
      'Asia/Tokyo': 9,
      'Australia/Sydney': 10,
      'America/Toronto': -5,
      'America/Sao_Paulo': -3,
      'Asia/Kolkata': 5.5,
      'Asia/Shanghai': 8
    };

    const offset1 = timezoneOffsets[tz1] || 0;
    const offset2 = timezoneOffsets[tz2] || 0;
    
    return Math.abs(offset1 - offset2);
  }

  private isHoliday(date: Date): boolean {
    if (!this.config.enableHolidayDetection) {
      return false;
    }

    const dateStr = date.toISOString().split('T')[0];
    
    // Check custom holidays
    if (this.config.customHolidays) {
      for (const holiday of this.config.customHolidays) {
        if (holiday.toISOString().split('T')[0] === dateStr) {
          return true;
        }
      }
    }

    // Check built-in holidays
    return this.holidays.has(dateStr);
  }

  private initializeHolidays(): void {
    if (!this.config.enableHolidayDetection) {
      return;
    }

    // Add some common holidays (simplified)
    const currentYear = new Date().getFullYear();
    const holidays = [
      `${currentYear}-01-01`, // New Year's Day
      `${currentYear}-12-25`, // Christmas
      `${currentYear}-12-31`, // New Year's Eve
    ];

    holidays.forEach(holiday => this.holidays.add(holiday));
  }

  private storeUserTimePattern(userId: string, pattern: TimePattern): void {
    if (!this.userTimePatterns.has(userId)) {
      this.userTimePatterns.set(userId, []);
    }

    const patterns = this.userTimePatterns.get(userId)!;
    patterns.push(pattern);

    // Keep only last 100 patterns per user to manage memory
    if (patterns.length > 100) {
      patterns.splice(0, patterns.length - 100);
    }
  }

  // Utility methods
  getUserTimePatterns(userId: string): TimePattern[] {
    return this.userTimePatterns.get(userId) || [];
  }

  getMostCommonTransactionTime(userId: string): { hour: number; dayOfWeek: number } | null {
    const patterns = this.userTimePatterns.get(userId);
    if (!patterns || patterns.length === 0) {
      return null;
    }

    const timeCounts = new Map<string, number>();
    
    patterns.forEach(pattern => {
      const key = `${pattern.hour}-${pattern.dayOfWeek}`;
      timeCounts.set(key, (timeCounts.get(key) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommon = null;

    for (const [key, count] of timeCounts) {
      if (count > maxCount) {
        maxCount = count;
        const [hour, dayOfWeek] = key.split('-').map(Number);
        mostCommon = { hour, dayOfWeek };
      }
    }

    return mostCommon;
  }

  isSuspiciousTime(hour: number, dayOfWeek: number): boolean {
    return this.config.suspiciousHours.includes(hour) || 
           (dayOfWeek === 0 || dayOfWeek === 6); // Weekend
  }

  getTimeRiskLevel(hour: number, dayOfWeek: number): 'low' | 'medium' | 'high' {
    if (this.config.suspiciousHours.includes(hour)) {
      return 'high';
    }
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'medium';
    }
    
    return 'low';
  }
}
