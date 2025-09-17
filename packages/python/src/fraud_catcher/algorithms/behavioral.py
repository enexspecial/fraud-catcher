"""
Behavioral analysis fraud detection algorithm.
"""

import math
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from ..models import Transaction, DetectionRule, Location


@dataclass
class BehavioralConfig:
    """Configuration for behavioral algorithm."""
    enable_spending_patterns: bool
    enable_transaction_timing: bool
    enable_location_patterns: bool
    enable_device_patterns: bool
    pattern_history_days: int
    anomaly_threshold: float
    enable_machine_learning: bool
    learning_rate: float


@dataclass
class UserBehaviorProfile:
    """User behavior profile."""
    user_id: str
    average_amount: float = 0.0
    median_amount: float = 0.0
    spending_variance: float = 0.0
    preferred_hours: List[int] = None
    preferred_days: List[int] = None
    common_locations: List[Dict[str, Any]] = None
    common_merchants: List[str] = None
    common_categories: List[str] = None
    transaction_frequency: float = 0.0
    last_transaction: Optional[datetime] = None
    total_transactions: int = 0
    total_amount: float = 0.0
    risk_score: float = 0.0
    last_updated: Optional[datetime] = None
    
    def __post_init__(self):
        if self.preferred_hours is None:
            self.preferred_hours = []
        if self.preferred_days is None:
            self.preferred_days = []
        if self.common_locations is None:
            self.common_locations = []
        if self.common_merchants is None:
            self.common_merchants = []
        if self.common_categories is None:
            self.common_categories = []


@dataclass
class BehavioralAnomaly:
    """Behavioral anomaly information."""
    type: str  # 'spending', 'timing', 'location', 'merchant', 'frequency'
    severity: str  # 'low', 'medium', 'high'
    score: float
    description: str
    expected_value: Any
    actual_value: Any


class BehavioralAlgorithm:
    """Detects fraud based on user behavior patterns."""
    
    def __init__(self, config: BehavioralConfig):
        self.config = config
        self.user_profiles: Dict[str, UserBehaviorProfile] = {}
        self.transaction_history: Dict[str, List[Transaction]] = {}
    
    async def analyze(self, transaction: Transaction, rule: DetectionRule) -> float:
        """Analyze transaction for behavioral fraud patterns."""
        user_id = transaction.user_id
        
        # Get or create user behavior profile
        profile = self.user_profiles.get(user_id)
        if not profile:
            profile = self._create_initial_profile(user_id)
            self.user_profiles[user_id] = profile
        
        # Analyze various behavioral patterns
        anomalies = []
        
        if self.config.enable_spending_patterns:
            spending_anomalies = self._analyze_spending_patterns(transaction, profile)
            anomalies.extend(spending_anomalies)
        
        if self.config.enable_transaction_timing:
            timing_anomalies = self._analyze_timing_patterns(transaction, profile)
            anomalies.extend(timing_anomalies)
        
        if self.config.enable_location_patterns and transaction.location:
            location_anomalies = self._analyze_location_patterns(transaction, profile)
            anomalies.extend(location_anomalies)
        
        if self.config.enable_device_patterns:
            device_anomalies = self._analyze_device_patterns(transaction, profile)
            anomalies.extend(device_anomalies)
        
        # Calculate overall risk score based on anomalies
        risk_score = self._calculate_risk_score(anomalies)
        
        # Update user profile
        self._update_user_profile(transaction, profile)
        
        # Store transaction in history
        self._add_transaction_to_history(transaction)
        
        return min(risk_score, 1.0)
    
    def _create_initial_profile(self, user_id: str) -> UserBehaviorProfile:
        """Create initial user behavior profile."""
        return UserBehaviorProfile(
            user_id=user_id,
            last_updated=datetime.now()
        )
    
    def _analyze_spending_patterns(self, transaction: Transaction, profile: UserBehaviorProfile) -> List[BehavioralAnomaly]:
        """Analyze spending pattern anomalies."""
        anomalies = []
        amount = transaction.amount
        
        # Check for unusual spending amounts
        if profile.total_transactions > 0:
            spending_deviation = abs(amount - profile.average_amount) / profile.average_amount if profile.average_amount > 0 else 0
            
            if spending_deviation > 2.0:  # 200% deviation
                anomalies.append(BehavioralAnomaly(
                    type='spending',
                    severity='high',
                    score=0.8,
                    description='Unusually high spending amount',
                    expected_value=profile.average_amount,
                    actual_value=amount
                ))
            elif spending_deviation > 1.0:  # 100% deviation
                anomalies.append(BehavioralAnomaly(
                    type='spending',
                    severity='medium',
                    score=0.4,
                    description='Above average spending amount',
                    expected_value=profile.average_amount,
                    actual_value=amount
                ))
        
        return anomalies
    
    def _analyze_timing_patterns(self, transaction: Transaction, profile: UserBehaviorProfile) -> List[BehavioralAnomaly]:
        """Analyze timing pattern anomalies."""
        anomalies = []
        transaction_time = transaction.timestamp if isinstance(transaction.timestamp, datetime) else datetime.now()
        hour = transaction_time.hour
        day_of_week = transaction_time.weekday() + 1  # Convert to 1-7
        
        # Check for unusual transaction times
        if profile.preferred_hours:
            is_unusual_hour = hour not in profile.preferred_hours
            if is_unusual_hour:
                anomalies.append(BehavioralAnomaly(
                    type='timing',
                    severity='medium',
                    score=0.3,
                    description='Transaction at unusual hour',
                    expected_value=profile.preferred_hours,
                    actual_value=hour
                ))
        
        # Check for unusual days
        if profile.preferred_days:
            is_unusual_day = day_of_week not in profile.preferred_days
            if is_unusual_day:
                anomalies.append(BehavioralAnomaly(
                    type='timing',
                    severity='low',
                    score=0.2,
                    description='Transaction on unusual day',
                    expected_value=profile.preferred_days,
                    actual_value=day_of_week
                ))
        
        return anomalies
    
    def _analyze_location_patterns(self, transaction: Transaction, profile: UserBehaviorProfile) -> List[BehavioralAnomaly]:
        """Analyze location pattern anomalies."""
        anomalies = []
        location = transaction.location
        
        if profile.common_locations:
            # Check if location is far from common locations
            min_distance = min(
                self._calculate_distance(location, common_loc)
                for common_loc in profile.common_locations
            )
            
            if min_distance > 100:  # More than 100km from any common location
                anomalies.append(BehavioralAnomaly(
                    type='location',
                    severity='high',
                    score=0.7,
                    description='Transaction from unusual location',
                    expected_value=profile.common_locations[0],
                    actual_value={'lat': location.lat, 'lng': location.lng}
                ))
            elif min_distance > 50:  # More than 50km from any common location
                anomalies.append(BehavioralAnomaly(
                    type='location',
                    severity='medium',
                    score=0.4,
                    description='Transaction from distant location',
                    expected_value=profile.common_locations[0],
                    actual_value={'lat': location.lat, 'lng': location.lng}
                ))
        
        return anomalies
    
    def _analyze_device_patterns(self, transaction: Transaction, profile: UserBehaviorProfile) -> List[BehavioralAnomaly]:
        """Analyze device pattern anomalies."""
        anomalies = []
        
        # This would require device history tracking
        # For now, we'll implement basic device pattern analysis
        if transaction.device_id:
            # Check if this is a new device for the user
            # This would require storing device history
            pass
        
        return anomalies
    
    def _calculate_risk_score(self, anomalies: List[BehavioralAnomaly]) -> float:
        """Calculate risk score from anomalies."""
        if not anomalies:
            return 0.0
        
        total_score = 0.0
        total_weight = 0.0
        
        for anomaly in anomalies:
            weight = 1.0
            
            if anomaly.severity == 'high':
                weight = 3.0
            elif anomaly.severity == 'medium':
                weight = 2.0
            elif anomaly.severity == 'low':
                weight = 1.0
            
            total_score += anomaly.score * weight
            total_weight += weight
        
        return total_score / total_weight if total_weight > 0 else 0.0
    
    def _update_user_profile(self, transaction: Transaction, profile: UserBehaviorProfile) -> None:
        """Update user behavior profile."""
        now = datetime.now()
        
        # Update basic stats
        profile.total_transactions += 1
        profile.total_amount += transaction.amount
        profile.average_amount = profile.total_amount / profile.total_transactions
        profile.last_transaction = now
        profile.last_updated = now
        
        # Update spending variance (simplified)
        if profile.total_transactions > 1:
            amounts = self._get_user_transaction_amounts(transaction.user_id)
            profile.spending_variance = self._calculate_variance(amounts)
        
        # Update preferred times
        self._update_preferred_times(transaction, profile)
        
        # Update common locations
        if transaction.location:
            self._update_common_locations(transaction.location, profile)
        
        # Update common merchants and categories
        if transaction.merchant_id:
            self._update_common_merchants(transaction.merchant_id, profile)
        if transaction.merchant_category:
            self._update_common_categories(transaction.merchant_category, profile)
        
        # Update transaction frequency
        self._update_transaction_frequency(transaction.user_id, profile)
    
    def _add_transaction_to_history(self, transaction: Transaction) -> None:
        """Add transaction to user's history."""
        user_id = transaction.user_id
        if user_id not in self.transaction_history:
            self.transaction_history[user_id] = []
        
        self.transaction_history[user_id].append(transaction)
        
        # Keep only recent transactions
        cutoff_time = time.time() - (self.config.pattern_history_days * 24 * 60 * 60)
        self.transaction_history[user_id] = [
            tx for tx in self.transaction_history[user_id]
            if tx.timestamp.timestamp() > cutoff_time
        ]
    
    def _get_user_transaction_amounts(self, user_id: str) -> List[float]:
        """Get transaction amounts for user."""
        history = self.transaction_history.get(user_id, [])
        return [tx.amount for tx in history]
    
    def _calculate_variance(self, amounts: List[float]) -> float:
        """Calculate variance of amounts."""
        if len(amounts) < 2:
            return 0.0
        
        mean = sum(amounts) / len(amounts)
        variance = sum((amount - mean) ** 2 for amount in amounts) / len(amounts)
        return variance ** 0.5  # Standard deviation
    
    def _update_preferred_times(self, transaction: Transaction, profile: UserBehaviorProfile) -> None:
        """Update preferred transaction times."""
        transaction_time = transaction.timestamp if isinstance(transaction.timestamp, datetime) else datetime.now()
        hour = transaction_time.hour
        day_of_week = transaction_time.weekday() + 1
        
        # Update preferred hours
        if hour not in profile.preferred_hours:
            profile.preferred_hours.append(hour)
            profile.preferred_hours.sort()
        
        # Update preferred days
        if day_of_week not in profile.preferred_days:
            profile.preferred_days.append(day_of_week)
            profile.preferred_days.sort()
    
    def _update_common_locations(self, location: Location, profile: UserBehaviorProfile) -> None:
        """Update common locations."""
        existing_location = None
        for loc in profile.common_locations:
            if (abs(loc['lat'] - location.lat) < 0.01 and 
                abs(loc['lng'] - location.lng) < 0.01):
                existing_location = loc
                break
        
        if existing_location:
            existing_location['count'] += 1
        else:
            profile.common_locations.append({
                'lat': location.lat,
                'lng': location.lng,
                'count': 1
            })
        
        # Keep only top 10 locations
        profile.common_locations.sort(key=lambda x: x['count'], reverse=True)
        profile.common_locations = profile.common_locations[:10]
    
    def _update_common_merchants(self, merchant_id: str, profile: UserBehaviorProfile) -> None:
        """Update common merchants."""
        if merchant_id not in profile.common_merchants:
            profile.common_merchants.append(merchant_id)
    
    def _update_common_categories(self, category: str, profile: UserBehaviorProfile) -> None:
        """Update common categories."""
        if category not in profile.common_categories:
            profile.common_categories.append(category)
    
    def _update_transaction_frequency(self, user_id: str, profile: UserBehaviorProfile) -> None:
        """Update transaction frequency."""
        history = self.transaction_history.get(user_id, [])
        now = datetime.now()
        one_day_ago = datetime.fromtimestamp(now.timestamp() - 24 * 60 * 60)
        
        recent_transactions = [
            tx for tx in history
            if tx.timestamp > one_day_ago
        ]
        
        profile.transaction_frequency = len(recent_transactions)
    
    def _calculate_distance(self, loc1: Location, loc2: Dict[str, float]) -> float:
        """Calculate distance between two locations in kilometers."""
        R = 6371  # Earth's radius in kilometers
        d_lat = self._deg2rad(loc2['lat'] - loc1.lat)
        d_lon = self._deg2rad(loc2['lng'] - loc1.lng)
        a = (
            math.sin(d_lat/2) * math.sin(d_lat/2) +
            math.cos(self._deg2rad(loc1.lat)) * math.cos(self._deg2rad(loc2['lat'])) *
            math.sin(d_lon/2) * math.sin(d_lon/2)
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    
    def _deg2rad(self, deg: float) -> float:
        """Convert degrees to radians."""
        return deg * (math.pi/180)
    
    # Utility methods
    def get_user_profile(self, user_id: str) -> Optional[UserBehaviorProfile]:
        """Get user behavior profile."""
        return self.user_profiles.get(user_id)
    
    def get_behavioral_anomalies(self, user_id: str) -> List[BehavioralAnomaly]:
        """Get behavioral anomalies for user."""
        # This would analyze the user's recent behavior and return anomalies
        # For now, return empty list
        return []
    
    def get_spending_pattern(self, user_id: str) -> Dict[str, float]:
        """Get spending pattern for user."""
        profile = self.user_profiles.get(user_id)
        if not profile:
            return {'average': 0.0, 'median': 0.0, 'variance': 0.0}
        
        return {
            'average': profile.average_amount,
            'median': profile.median_amount,
            'variance': profile.spending_variance
        }
    
    def get_location_pattern(self, user_id: str) -> List[Dict[str, Any]]:
        """Get location pattern for user."""
        profile = self.user_profiles.get(user_id)
        return profile.common_locations if profile else []
    
    def get_timing_pattern(self, user_id: str) -> Dict[str, List[int]]:
        """Get timing pattern for user."""
        profile = self.user_profiles.get(user_id)
        if not profile:
            return {'preferred_hours': [], 'preferred_days': []}
        
        return {
            'preferred_hours': profile.preferred_hours,
            'preferred_days': profile.preferred_days
        }
