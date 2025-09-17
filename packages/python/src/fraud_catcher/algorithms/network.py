"""
Network analysis fraud detection algorithm.
"""

import time
from datetime import datetime
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass
from ..models import Transaction, DetectionRule


@dataclass
class NetworkConfig:
    """Configuration for network algorithm."""
    enable_ip_analysis: bool
    enable_proxy_detection: bool
    enable_vpn_detection: bool
    enable_tor_detection: bool
    suspicious_countries: List[str]
    trusted_countries: List[str]
    max_connections_per_ip: int
    ip_velocity_window: int  # in minutes
    enable_geo_ip_analysis: bool
    enable_asn_analysis: bool


@dataclass
class IPProfile:
    """IP profile information."""
    ip_address: str
    country: str
    region: Optional[str] = None
    city: Optional[str] = None
    isp: Optional[str] = None
    asn: Optional[str] = None
    is_proxy: bool = False
    is_vpn: bool = False
    is_tor: bool = False
    is_suspicious: bool = False
    user_count: int = 0
    transaction_count: int = 0
    total_amount: float = 0.0
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    unique_users: Set[str] = None
    risk_score: float = 0.0
    
    def __post_init__(self):
        if self.unique_users is None:
            self.unique_users = set()


@dataclass
class NetworkAnomaly:
    """Network anomaly information."""
    type: str  # 'ip_reputation', 'geo_anomaly', 'velocity', 'proxy', 'vpn', 'tor'
    severity: str  # 'low', 'medium', 'high'
    score: float
    description: str
    details: Any


class NetworkAlgorithm:
    """Detects fraud based on network patterns and IP reputation."""
    
    def __init__(self, config: NetworkConfig):
        self.config = config
        self.ip_profiles: Dict[str, IPProfile] = {}
        self.user_ips: Dict[str, Set[str]] = {}
        self.suspicious_ips: Set[str] = set()
        self.trusted_ips: Set[str] = set()
    
    async def analyze(self, transaction: Transaction, rule: DetectionRule) -> float:
        """Analyze transaction for network-based fraud patterns."""
        if not transaction.ip_address:
            return 0.0  # No IP data available
        
        ip_address = transaction.ip_address
        risk_score = 0.0
        
        # Get or create IP profile
        ip_profile = await self._get_or_create_ip_profile(ip_address)
        
        # Analyze IP reputation
        if self.config.enable_ip_analysis:
            reputation_risk = self._analyze_ip_reputation(ip_profile)
            risk_score += reputation_risk
        
        # Analyze geographic anomalies
        if self.config.enable_geo_ip_analysis:
            geo_risk = self._analyze_geo_anomaly(transaction, ip_profile)
            risk_score += geo_risk
        
        # Analyze IP velocity
        velocity_risk = self._analyze_ip_velocity(ip_address, transaction)
        risk_score += velocity_risk
        
        # Analyze proxy/VPN/Tor usage
        if self.config.enable_proxy_detection:
            proxy_risk = self._analyze_proxy_usage(ip_profile)
            risk_score += proxy_risk
        
        if self.config.enable_vpn_detection:
            vpn_risk = self._analyze_vpn_usage(ip_profile)
            risk_score += vpn_risk
        
        if self.config.enable_tor_detection:
            tor_risk = self._analyze_tor_usage(ip_profile)
            risk_score += tor_risk
        
        # Analyze ASN (Autonomous System Number)
        if self.config.enable_asn_analysis:
            asn_risk = self._analyze_asn(ip_profile)
            risk_score += asn_risk
        
        # Update IP profile
        self._update_ip_profile(ip_address, transaction, ip_profile)
        
        return min(risk_score, 1.0)
    
    async def _get_or_create_ip_profile(self, ip_address: str) -> IPProfile:
        """Get or create IP profile."""
        profile = self.ip_profiles.get(ip_address)
        
        if not profile:
            # In production, you would use a GeoIP service like MaxMind
            geo_data = await self._get_geo_ip_data(ip_address)
            
            profile = IPProfile(
                ip_address=ip_address,
                country=geo_data.get('country', 'Unknown'),
                region=geo_data.get('region'),
                city=geo_data.get('city'),
                isp=geo_data.get('isp'),
                asn=geo_data.get('asn'),
                is_proxy=False,  # Would be determined by proxy detection service
                is_vpn=False,    # Would be determined by VPN detection service
                is_tor=False,    # Would be determined by Tor detection service
                is_suspicious=ip_address in self.suspicious_ips,
                user_count=0,
                transaction_count=0,
                total_amount=0.0,
                first_seen=datetime.now(),
                last_seen=datetime.now(),
                unique_users=set(),
                risk_score=0.0
            )
            
            self.ip_profiles[ip_address] = profile
        
        return profile
    
    async def _get_geo_ip_data(self, ip_address: str) -> Dict[str, Any]:
        """Get GeoIP data for IP address."""
        # Simplified GeoIP data - in production, use a real GeoIP service
        # This is a mock implementation
        return {
            'country': self._get_country_from_ip(ip_address),
            'region': 'Unknown',
            'city': 'Unknown',
            'isp': 'Unknown',
            'asn': 'Unknown'
        }
    
    def _get_country_from_ip(self, ip_address: str) -> str:
        """Get country from IP address (simplified)."""
        # Simplified country detection - in production, use MaxMind or similar
        # This is just a mock implementation
        ip_parts = ip_address.split('.')
        if len(ip_parts) == 4:
            first_octet = int(ip_parts[0])
            if 1 <= first_octet <= 126:
                return 'US'
            elif 128 <= first_octet <= 191:
                return 'CA'
            elif 192 <= first_octet <= 223:
                return 'GB'
        return 'Unknown'
    
    def _analyze_ip_reputation(self, profile: IPProfile) -> float:
        """Analyze IP reputation risk."""
        risk_score = 0.0
        
        # Check if IP is in suspicious list
        if profile.ip_address in self.suspicious_ips:
            risk_score += 0.8
        
        # Check if IP is trusted (reduce risk)
        if profile.ip_address in self.trusted_ips:
            risk_score -= 0.3
        
        # Check country reputation
        if profile.country in self.config.suspicious_countries:
            risk_score += 0.4
        
        if profile.country in self.config.trusted_countries:
            risk_score -= 0.2
        
        # Check for high user count (potential shared IP)
        if profile.user_count > self.config.max_connections_per_ip:
            risk_score += 0.3
        
        return max(0, risk_score)
    
    def _analyze_geo_anomaly(self, transaction: Transaction, ip_profile: IPProfile) -> float:
        """Analyze geographic anomalies."""
        if not transaction.location:
            return 0.0
        
        # Check if IP country matches transaction location country
        transaction_country = self._get_country_from_location(transaction.location)
        
        if transaction_country and transaction_country != ip_profile.country:
            return 0.6  # High risk for country mismatch
        
        return 0.0
    
    def _get_country_from_location(self, location) -> Optional[str]:
        """Get country from location."""
        return getattr(location, 'country', None)
    
    def _analyze_ip_velocity(self, ip_address: str, transaction: Transaction) -> float:
        """Analyze IP velocity risk."""
        profile = self.ip_profiles.get(ip_address)
        if not profile:
            return 0.0
        
        time_window_seconds = self.config.ip_velocity_window * 60
        now = datetime.now()
        
        if profile.first_seen:
            time_diff = (now - profile.first_seen).total_seconds()
            if time_diff < time_window_seconds:
                velocity = profile.transaction_count / (time_diff / 60)  # Transactions per minute
                
                if velocity > 10:  # More than 10 transactions per minute
                    return 0.7  # High velocity risk
                elif velocity > 5:  # More than 5 transactions per minute
                    return 0.4  # Medium velocity risk
        
        return 0.0
    
    def _analyze_proxy_usage(self, profile: IPProfile) -> float:
        """Analyze proxy usage risk."""
        if profile.is_proxy:
            return 0.5  # Medium risk for proxy usage
        return 0.0
    
    def _analyze_vpn_usage(self, profile: IPProfile) -> float:
        """Analyze VPN usage risk."""
        if profile.is_vpn:
            return 0.3  # Low-medium risk for VPN usage
        return 0.0
    
    def _analyze_tor_usage(self, profile: IPProfile) -> float:
        """Analyze Tor usage risk."""
        if profile.is_tor:
            return 0.8  # High risk for Tor usage
        return 0.0
    
    def _analyze_asn(self, profile: IPProfile) -> float:
        """Analyze ASN risk."""
        # Analyze Autonomous System Number for suspicious patterns
        # This would require ASN reputation data
        if profile.asn and self._is_suspicious_asn(profile.asn):
            return 0.4
        return 0.0
    
    def _is_suspicious_asn(self, asn: str) -> bool:
        """Check if ASN is suspicious."""
        # Simplified ASN analysis - in production, use ASN reputation data
        # This is just a mock implementation
        suspicious_asns = {'AS12345', 'AS67890'}  # Example suspicious ASNs
        return asn in suspicious_asns
    
    def _update_ip_profile(self, ip_address: str, transaction: Transaction, profile: IPProfile) -> None:
        """Update IP profile with new transaction."""
        profile.transaction_count += 1
        profile.total_amount += transaction.amount
        profile.last_seen = datetime.now()
        
        # Add user to unique users
        profile.unique_users.add(transaction.user_id)
        profile.user_count = len(profile.unique_users)
        
        # Update user IPs
        if transaction.user_id not in self.user_ips:
            self.user_ips[transaction.user_id] = set()
        self.user_ips[transaction.user_id].add(ip_address)
    
    # Utility methods
    def get_ip_profile(self, ip_address: str) -> Optional[IPProfile]:
        """Get IP profile by address."""
        return self.ip_profiles.get(ip_address)
    
    def get_user_ips(self, user_id: str) -> List[str]:
        """Get IP addresses used by user."""
        return list(self.user_ips.get(user_id, set()))
    
    def mark_ip_as_suspicious(self, ip_address: str) -> None:
        """Mark IP as suspicious."""
        self.suspicious_ips.add(ip_address)
        profile = self.ip_profiles.get(ip_address)
        if profile:
            profile.is_suspicious = True
    
    def mark_ip_as_trusted(self, ip_address: str) -> None:
        """Mark IP as trusted."""
        self.trusted_ips.add(ip_address)
        profile = self.ip_profiles.get(ip_address)
        if profile:
            profile.is_suspicious = False
    
    def get_top_ips_by_volume(self, limit: int = 10) -> List[IPProfile]:
        """Get top IPs by transaction volume."""
        return sorted(
            self.ip_profiles.values(),
            key=lambda x: x.transaction_count,
            reverse=True
        )[:limit]
    
    def get_riskiest_ips(self, limit: int = 10) -> List[IPProfile]:
        """Get riskiest IPs."""
        return sorted(
            [p for p in self.ip_profiles.values() if p.risk_score > 0.5],
            key=lambda x: x.risk_score,
            reverse=True
        )[:limit]
    
    def get_network_anomalies(self, user_id: str) -> List[NetworkAnomaly]:
        """Get network anomalies for user."""
        user_ips = self.get_user_ips(user_id)
        anomalies = []
        
        for ip_address in user_ips:
            profile = self.ip_profiles.get(ip_address)
            if not profile:
                continue
            
            if profile.is_proxy:
                anomalies.append(NetworkAnomaly(
                    type='proxy',
                    severity='medium',
                    score=0.5,
                    description='Transaction from proxy IP',
                    details={'ip_address': ip_address, 'isp': profile.isp}
                ))
            
            if profile.is_vpn:
                anomalies.append(NetworkAnomaly(
                    type='vpn',
                    severity='low',
                    score=0.3,
                    description='Transaction from VPN IP',
                    details={'ip_address': ip_address, 'isp': profile.isp}
                ))
            
            if profile.is_tor:
                anomalies.append(NetworkAnomaly(
                    type='tor',
                    severity='high',
                    score=0.8,
                    description='Transaction from Tor IP',
                    details={'ip_address': ip_address, 'isp': profile.isp}
                ))
            
            if profile.user_count > self.config.max_connections_per_ip:
                anomalies.append(NetworkAnomaly(
                    type='velocity',
                    severity='medium',
                    score=0.4,
                    description='IP used by multiple users',
                    details={'ip_address': ip_address, 'user_count': profile.user_count}
                ))
        
        return anomalies
