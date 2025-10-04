import { Transaction, DetectionRule, Location } from '../models/Transaction';
import { CountryService } from '../services/CountryService';

export interface LocationConfig {
  maxDistanceKm: number;
  suspiciousDistanceKm: number;
  timeWindowMinutes: number;
  enableGeoFencing: boolean;
  trustedLocations?: Location[];
}

export class LocationAlgorithm {
  private config: LocationConfig;
  private userLocations: Map<string, Location[]> = new Map();
  private countryService: CountryService;

  constructor(config: LocationConfig) {
    this.config = config;
    this.countryService = new CountryService();
  }

  async analyze(transaction: Transaction, _rule: DetectionRule): Promise<number> {
    if (!transaction.location) {
      return 0.0; // No location data, no risk
    }

    const userId = transaction.userId;
    const currentLocation = transaction.location;
    const now = new Date(transaction.timestamp);
    const countryCode = currentLocation.country;

    // Get user's recent locations
    const recentLocations = this.getRecentLocations(userId, now);
    
    let riskScore = 0;

    // Check country risk level first
    if (this.countryService.isSuspiciousCountry(countryCode)) {
      riskScore += 0.8; // Very high risk for suspicious countries
    } else if (this.countryService.isVeryHighRiskCountry(countryCode)) {
      riskScore += 0.6; // High risk for very high risk countries
    } else if (this.countryService.isHighRiskCountry(countryCode)) {
      riskScore += 0.4; // Medium-high risk for high risk countries
    } else {
      // Use country-specific fraud index for normal countries
      const countryRisk = this.countryService.getCountryRiskScore(countryCode);
      riskScore += countryRisk * 0.3; // Scale down for normal countries
    }

    // Check against recent locations
    if (recentLocations.length > 0) {
      const minDistance = Math.min(
        ...recentLocations.map(loc => this.calculateDistance(currentLocation, loc))
      );

      if (minDistance > this.config.maxDistanceKm) {
        riskScore += 0.4; // Impossible travel distance
      } else if (minDistance > this.config.suspiciousDistanceKm) {
        // Suspicious but possible travel distance
        const range = this.config.maxDistanceKm - this.config.suspiciousDistanceKm;
        const position = minDistance - this.config.suspiciousDistanceKm;
        riskScore += 0.2 + (position / range) * 0.2; // 0.2 to 0.4
      } else {
        // Normal travel distance
        riskScore += minDistance / this.config.suspiciousDistanceKm * 0.1; // 0.0 to 0.1
      }
    }

    // Check against trusted locations if enabled
    if (this.config.enableGeoFencing && this.config.trustedLocations) {
      const isInTrustedLocation = this.config.trustedLocations.some(trustedLoc =>
        this.calculateDistance(currentLocation, trustedLoc) <= 1.0 // Within 1km
      );
      
      if (isInTrustedLocation) {
        riskScore = Math.min(riskScore, 0.2); // Reduce risk for trusted locations
      }
    }

    // Check for international transactions (higher risk)
    if (recentLocations.length > 0) {
      const lastLocation = recentLocations[recentLocations.length - 1];
      if (lastLocation.country && lastLocation.country !== countryCode) {
        // International transaction - check if both countries are high risk
        const lastCountryRisk = this.countryService.getCountryRiskScore(lastLocation.country);
        const currentCountryRisk = this.countryService.getCountryRiskScore(countryCode);
        
        if (lastCountryRisk > 0.5 || currentCountryRisk > 0.5) {
          riskScore += 0.3; // Additional risk for international high-risk transactions
        } else {
          riskScore += 0.1; // Lower risk for international transactions between low-risk countries
        }
      }
    }

    // Store current location
    this.addLocation(userId, currentLocation);

    return Math.min(riskScore, 1.0);
  }

  private getRecentLocations(userId: string, currentTime: Date): Location[] {
    const userLocations = this.userLocations.get(userId) || [];
    const timeWindow = this.config.timeWindowMinutes * 60 * 1000; // Convert to milliseconds

    return userLocations.filter(loc => {
      // Assuming location has timestamp, otherwise use current time
      const locTime = (loc as any).timestamp ? new Date((loc as any).timestamp) : currentTime;
      return (currentTime.getTime() - locTime.getTime()) <= timeWindow;
    });
  }

  private addLocation(userId: string, location: Location): void {
    const userLocations = this.userLocations.get(userId) || [];
    const locationWithTimestamp = { ...location, timestamp: new Date() };
    userLocations.push(locationWithTimestamp as any);
    
    // Keep only recent locations to manage memory
    const cutoffTime = new Date().getTime() - (this.config.timeWindowMinutes * 60 * 1000);
    const filteredLocations = userLocations.filter(loc => 
      (loc as any).timestamp && new Date((loc as any).timestamp).getTime() > cutoffTime
    );
    
    this.userLocations.set(userId, filteredLocations);
  }

  private calculateDistance(loc1: Location, loc2: Location): number {
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

  isImpossibleTravel(from: Location, to: Location, timeDiffMinutes: number): boolean {
    const distance = this.calculateDistance(from, to);
    const maxPossibleDistance = (timeDiffMinutes / 60) * 1000; // Assuming max 1000 km/h travel speed
    return distance > maxPossibleDistance;
  }

  getTravelSpeed(from: Location, to: Location, timeDiffMinutes: number): number {
    const distance = this.calculateDistance(from, to);
    return distance / (timeDiffMinutes / 60); // km/h
  }
}
