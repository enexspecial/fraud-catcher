import { Transaction, DetectionRule } from '../models/Transaction';

export interface NetworkConfig {
  enableIPAnalysis: boolean;
  enableProxyDetection: boolean;
  enableVPNDetection: boolean;
  enableTorDetection: boolean;
  suspiciousCountries: string[];
  trustedCountries: string[];
  maxConnectionsPerIP: number;
  ipVelocityWindow: number; // in minutes
  enableGeoIPAnalysis: boolean;
  enableASNAnalysis: boolean;
}

export interface IPProfile {
  ipAddress: string;
  country: string;
  region?: string;
  city?: string;
  isp?: string;
  asn?: string;
  isProxy: boolean;
  isVPN: boolean;
  isTor: boolean;
  isSuspicious: boolean;
  userCount: number;
  transactionCount: number;
  totalAmount: number;
  firstSeen: Date;
  lastSeen: Date;
  uniqueUsers: Set<string>;
  riskScore: number;
}

export interface NetworkAnomaly {
  type: 'ip_reputation' | 'geo_anomaly' | 'velocity' | 'proxy' | 'vpn' | 'tor';
  severity: 'low' | 'medium' | 'high';
  score: number;
  description: string;
  details: any;
}

export class NetworkAlgorithm {
  private config: NetworkConfig;
  private ipProfiles: Map<string, IPProfile> = new Map();
  private userIPs: Map<string, Set<string>> = new Map();
  private suspiciousIPs: Set<string> = new Set();
  private trustedIPs: Set<string> = new Set();

  constructor(config: NetworkConfig) {
    this.config = config;
  }

  async analyze(transaction: Transaction, rule: DetectionRule): Promise<number> {
    if (!transaction.ipAddress) {
      return 0.0; // No IP data available
    }

    const ipAddress = transaction.ipAddress;
    let riskScore = 0.0;

    // Get or create IP profile
    const ipProfile = await this.getOrCreateIPProfile(ipAddress);

    // Analyze IP reputation
    if (this.config.enableIPAnalysis) {
      const reputationRisk = this.analyzeIPReputation(ipProfile);
      riskScore += reputationRisk;
    }

    // Analyze geographic anomalies
    if (this.config.enableGeoIPAnalysis) {
      const geoRisk = this.analyzeGeoAnomaly(transaction, ipProfile);
      riskScore += geoRisk;
    }

    // Analyze IP velocity
    const velocityRisk = this.analyzeIPVelocity(ipAddress, transaction);
    riskScore += velocityRisk;

    // Analyze proxy/VPN/Tor usage
    if (this.config.enableProxyDetection) {
      const proxyRisk = this.analyzeProxyUsage(ipProfile);
      riskScore += proxyRisk;
    }

    if (this.config.enableVPNDetection) {
      const vpnRisk = this.analyzeVPNUsage(ipProfile);
      riskScore += vpnRisk;
    }

    if (this.config.enableTorDetection) {
      const torRisk = this.analyzeTorUsage(ipProfile);
      riskScore += torRisk;
    }

    // Analyze ASN (Autonomous System Number)
    if (this.config.enableASNAnalysis) {
      const asnRisk = this.analyzeASN(ipProfile);
      riskScore += asnRisk;
    }

    // Update IP profile
    this.updateIPProfile(ipAddress, transaction, ipProfile);

    return Math.min(riskScore, 1.0);
  }

  private async getOrCreateIPProfile(ipAddress: string): Promise<IPProfile> {
    let profile = this.ipProfiles.get(ipAddress);
    
    if (!profile) {
      // In production, you would use a GeoIP service like MaxMind
      const geoData = await this.getGeoIPData(ipAddress);
      
      profile = {
        ipAddress,
        country: geoData.country || 'Unknown',
        region: geoData.region,
        city: geoData.city,
        isp: geoData.isp,
        asn: geoData.asn,
        isProxy: false, // Would be determined by proxy detection service
        isVPN: false,   // Would be determined by VPN detection service
        isTor: false,   // Would be determined by Tor detection service
        isSuspicious: this.suspiciousIPs.has(ipAddress),
        userCount: 0,
        transactionCount: 0,
        totalAmount: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
        uniqueUsers: new Set(),
        riskScore: 0
      };
      
      this.ipProfiles.set(ipAddress, profile);
    }
    
    return profile;
  }

  private async getGeoIPData(ipAddress: string): Promise<any> {
    // Simplified GeoIP data - in production, use a real GeoIP service
    // This is a mock implementation
    return {
      country: this.getCountryFromIP(ipAddress),
      region: 'Unknown',
      city: 'Unknown',
      isp: 'Unknown',
      asn: 'Unknown'
    };
  }

  private getCountryFromIP(ipAddress: string): string {
    // Simplified country detection - in production, use MaxMind or similar
    // This is just a mock implementation
    const ipParts = ipAddress.split('.');
    if (ipParts.length === 4) {
      const firstOctet = parseInt(ipParts[0]);
      if (firstOctet >= 1 && firstOctet <= 126) return 'US';
      if (firstOctet >= 128 && firstOctet <= 191) return 'CA';
      if (firstOctet >= 192 && firstOctet <= 223) return 'GB';
    }
    return 'Unknown';
  }

  private analyzeIPReputation(profile: IPProfile): number {
    let riskScore = 0.0;

    // Check if IP is in suspicious list
    if (this.suspiciousIPs.has(profile.ipAddress)) {
      riskScore += 0.8;
    }

    // Check if IP is trusted (reduce risk)
    if (this.trustedIPs.has(profile.ipAddress)) {
      riskScore -= 0.3;
    }

    // Check country reputation
    if (this.config.suspiciousCountries.includes(profile.country)) {
      riskScore += 0.4;
    }

    if (this.config.trustedCountries.includes(profile.country)) {
      riskScore -= 0.2;
    }

    // Check for high user count (potential shared IP)
    if (profile.userCount > this.config.maxConnectionsPerIP) {
      riskScore += 0.3;
    }

    return Math.max(0, riskScore);
  }

  private analyzeGeoAnomaly(transaction: Transaction, ipProfile: IPProfile): number {
    if (!transaction.location) {
      return 0.0;
    }

    // Check if IP country matches transaction location country
    const transactionCountry = this.getCountryFromLocation(transaction.location);
    
    if (transactionCountry && transactionCountry !== ipProfile.country) {
      return 0.6; // High risk for country mismatch
    }

    return 0.0;
  }

  private getCountryFromLocation(location: any): string | null {
    return location.country || null;
  }

  private analyzeIPVelocity(ipAddress: string, transaction: Transaction): number {
    const profile = this.ipProfiles.get(ipAddress);
    if (!profile) return 0.0;

    const timeWindow = this.config.ipVelocityWindow * 60 * 1000; // Convert to milliseconds
    const now = new Date(transaction.timestamp);
    const timeDiff = now.getTime() - profile.firstSeen.getTime();
    
    if (timeDiff < timeWindow) {
      const velocity = profile.transactionCount / (timeDiff / (60 * 1000)); // Transactions per minute
      
      if (velocity > 10) { // More than 10 transactions per minute
        return 0.7; // High velocity risk
      } else if (velocity > 5) { // More than 5 transactions per minute
        return 0.4; // Medium velocity risk
      }
    }
    
    return 0.0;
  }

  private analyzeProxyUsage(profile: IPProfile): number {
    if (profile.isProxy) {
      return 0.5; // Medium risk for proxy usage
    }
    return 0.0;
  }

  private analyzeVPNUsage(profile: IPProfile): number {
    if (profile.isVPN) {
      return 0.3; // Low-medium risk for VPN usage
    }
    return 0.0;
  }

  private analyzeTorUsage(profile: IPProfile): number {
    if (profile.isTor) {
      return 0.8; // High risk for Tor usage
    }
    return 0.0;
  }

  private analyzeASN(profile: IPProfile): number {
    // Analyze Autonomous System Number for suspicious patterns
    // This would require ASN reputation data
    if (profile.asn && this.isSuspiciousASN(profile.asn)) {
      return 0.4;
    }
    return 0.0;
  }

  private isSuspiciousASN(asn: string): boolean {
    // Simplified ASN analysis - in production, use ASN reputation data
    // This is just a mock implementation
    const suspiciousASNs = ['AS12345', 'AS67890']; // Example suspicious ASNs
    return suspiciousASNs.includes(asn);
  }

  private updateIPProfile(ipAddress: string, transaction: Transaction, profile: IPProfile): void {
    profile.transactionCount++;
    profile.totalAmount += transaction.amount;
    profile.lastSeen = new Date(transaction.timestamp);
    
    // Add user to unique users
    profile.uniqueUsers.add(transaction.userId);
    profile.userCount = profile.uniqueUsers.size;

    // Update user IPs
    if (!this.userIPs.has(transaction.userId)) {
      this.userIPs.set(transaction.userId, new Set());
    }
    this.userIPs.get(transaction.userId)!.add(ipAddress);
  }

  // Utility methods
  getIPProfile(ipAddress: string): IPProfile | undefined {
    return this.ipProfiles.get(ipAddress);
  }

  getUserIPs(userId: string): string[] {
    return Array.from(this.userIPs.get(userId) || []);
  }

  markIPAsSuspicious(ipAddress: string): void {
    this.suspiciousIPs.add(ipAddress);
    const profile = this.ipProfiles.get(ipAddress);
    if (profile) {
      profile.isSuspicious = true;
    }
  }

  markIPAsTrusted(ipAddress: string): void {
    this.trustedIPs.add(ipAddress);
    const profile = this.ipProfiles.get(ipAddress);
    if (profile) {
      profile.isSuspicious = false;
    }
  }

  getTopIPsByVolume(limit: number = 10): IPProfile[] {
    return Array.from(this.ipProfiles.values())
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, limit);
  }

  getRiskiestIPs(limit: number = 10): IPProfile[] {
    return Array.from(this.ipProfiles.values())
      .filter(profile => profile.riskScore > 0.5)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  }

  getNetworkAnomalies(userId: string): NetworkAnomaly[] {
    const userIPs = this.getUserIPs(userId);
    const anomalies: NetworkAnomaly[] = [];

    for (const ipAddress of userIPs) {
      const profile = this.ipProfiles.get(ipAddress);
      if (!profile) continue;

      if (profile.isProxy) {
        anomalies.push({
          type: 'proxy',
          severity: 'medium',
          score: 0.5,
          description: 'Transaction from proxy IP',
          details: { ipAddress, isp: profile.isp }
        });
      }

      if (profile.isVPN) {
        anomalies.push({
          type: 'vpn',
          severity: 'low',
          score: 0.3,
          description: 'Transaction from VPN IP',
          details: { ipAddress, isp: profile.isp }
        });
      }

      if (profile.isTor) {
        anomalies.push({
          type: 'tor',
          severity: 'high',
          score: 0.8,
          description: 'Transaction from Tor IP',
          details: { ipAddress, isp: profile.isp }
        });
      }

      if (profile.userCount > this.config.maxConnectionsPerIP) {
        anomalies.push({
          type: 'velocity',
          severity: 'medium',
          score: 0.4,
          description: 'IP used by multiple users',
          details: { ipAddress, userCount: profile.userCount }
        });
      }
    }

    return anomalies;
  }
}
