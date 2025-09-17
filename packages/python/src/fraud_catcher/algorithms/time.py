"""
Time-based fraud detection algorithm.
"""

import math
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from ..models import Transaction, DetectionRule, Location


@dataclass
class TimeConfig:
    """Configuration for time algorithm."""
    suspicious_hours: List[int]  # Hours considered suspicious (0-23)
    weekend_risk_multiplier: float
    holiday_risk_multiplier: float
    timezone_threshold: int  # Hours difference to consider suspicious
    enable_holiday_detection: bool
    custom_holidays: Optional[List[datetime]] = None


@dataclass
class TimePattern:
    """Time pattern information."""
    hour: int
    day_of_week: int  # 0 = Sunday, 1 = Monday, etc.
    is_weekend: bool
    is_holiday: bool
    timezone: str
    risk_score: float


class TimeAlgorithm:
    """Detects fraud based on transaction timing patterns."""
    
    def __init__(self, config: TimeConfig):
        self.config = config
        self.user_time_patterns: Dict[str, List[TimePattern]] = {}
        self.holidays: set = set()
        self._initialize_holidays()
    
    async def analyze(self, transaction: Transaction, rule: DetectionRule) -> float:
        """Analyze transaction for time-based fraud patterns."""
        transaction_time = transaction.timestamp if isinstance(transaction.timestamp, datetime) else datetime.now()
        time_pattern = self._analyze_time_pattern(transaction_time, transaction)
        
        risk_score = 0.0
        
        # Check for suspicious hours
        if time_pattern.hour in self.config.suspicious_hours:
            risk_score += 0.4
        
        # Check for weekend transactions
        if time_pattern.is_weekend:
            risk_score += 0.2 * self.config.weekend_risk_multiplier
        
        # Check for holiday transactions
        if time_pattern.is_holiday:
            risk_score += 0.3 * self.config.holiday_risk_multiplier
        
        # Check for unusual time patterns for this user
        user_pattern_risk = self._analyze_user_time_pattern(transaction.user_id, time_pattern)
        risk_score += user_pattern_risk
        
        # Check for timezone anomalies
        timezone_risk = self._analyze_timezone_anomaly(transaction, time_pattern)
        risk_score += timezone_risk
        
        # Store pattern for future analysis
        self._store_user_time_pattern(transaction.user_id, time_pattern)
        
        return min(risk_score, 1.0)
    
    def _analyze_time_pattern(self, transaction_time: datetime, transaction: Transaction) -> TimePattern:
        """Analyze time pattern from transaction."""
        hour = transaction_time.hour
        day_of_week = transaction_time.weekday() + 1  # Convert to 1-7 (Monday=1, Sunday=7)
        is_weekend = day_of_week in [6, 7]  # Saturday or Sunday
        is_holiday = self._is_holiday(transaction_time)
        timezone = self._extract_timezone(transaction)
        
        return TimePattern(
            hour=hour,
            day_of_week=day_of_week,
            is_weekend=is_weekend,
            is_holiday=is_holiday,
            timezone=timezone,
            risk_score=0.0
        )
    
    def _analyze_user_time_pattern(self, user_id: str, current_pattern: TimePattern) -> float:
        """Analyze user's time patterns for anomalies."""
        user_patterns = self.user_time_patterns.get(user_id, [])
        
        if not user_patterns:
            return 0.1  # Slight risk for first transaction
        
        # Analyze frequency of transactions at this time
        similar_patterns = [
            pattern for pattern in user_patterns
            if pattern.hour == current_pattern.hour and pattern.day_of_week == current_pattern.day_of_week
        ]
        
        total_patterns = len(user_patterns)
        similar_count = len(similar_patterns)
        frequency = similar_count / total_patterns if total_patterns > 0 else 0
        
        # If user rarely transacts at this time, it's suspicious
        if frequency < 0.1:
            return 0.3
        elif frequency < 0.3:
            return 0.1
        
        return 0.0
    
    def _analyze_timezone_anomaly(self, transaction: Transaction, time_pattern: TimePattern) -> float:
        """Analyze timezone anomalies."""
        if not transaction.location:
            return 0.0  # No location data
        
        # Extract timezone from location or transaction metadata
        expected_timezone = self._get_timezone_from_location(transaction.location)
        actual_timezone = time_pattern.timezone
        
        if expected_timezone and actual_timezone:
            timezone_diff = self._calculate_timezone_difference(expected_timezone, actual_timezone)
            if timezone_diff > self.config.timezone_threshold:
                return 0.4  # High risk for timezone mismatch
        
        return 0.0
    
    def _extract_timezone(self, transaction: Transaction) -> str:
        """Extract timezone from transaction."""
        if transaction.metadata and 'timezone' in transaction.metadata:
            return transaction.metadata['timezone']
        
        if transaction.location and transaction.location.country:
            return self._get_country_timezone(transaction.location.country)
        
        return 'UTC'
    
    def _get_timezone_from_location(self, location: Location) -> Optional[str]:
        """Get timezone from location."""
        if location.country:
            return self._get_country_timezone(location.country)
        return None
    
    def _get_country_timezone(self, country: str) -> str:
        """Get timezone for country."""
        timezone_map = {
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
        }
        return timezone_map.get(country, 'UTC')
    
    def _calculate_timezone_difference(self, tz1: str, tz2: str) -> int:
        """Calculate timezone difference in hours."""
        timezone_offsets = {
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
        }
        
        offset1 = timezone_offsets.get(tz1, 0)
        offset2 = timezone_offsets.get(tz2, 0)
        
        return abs(int(offset1 - offset2))
    
    def _is_holiday(self, date: datetime) -> bool:
        """Check if date is a holiday."""
        if not self.config.enable_holiday_detection:
            return False
        
        date_str = date.strftime('%Y-%m-%d')
        
        # Check custom holidays
        if self.config.custom_holidays:
            for holiday in self.config.custom_holidays:
                if holiday.strftime('%Y-%m-%d') == date_str:
                    return True
        
        # Check built-in holidays
        return date_str in self.holidays
    
    def _initialize_holidays(self) -> None:
        """Initialize holiday list."""
        if not self.config.enable_holiday_detection:
            return
        
        current_year = datetime.now().year
        holidays = [
            f'{current_year}-01-01',  # New Year's Day
            f'{current_year}-12-25',  # Christmas
            f'{current_year}-12-31',  # New Year's Eve
        ]
        
        self.holidays = set(holidays)
    
    def _store_user_time_pattern(self, user_id: str, pattern: TimePattern) -> None:
        """Store time pattern for user."""
        if user_id not in self.user_time_patterns:
            self.user_time_patterns[user_id] = []
        
        self.user_time_patterns[user_id].append(pattern)
        
        # Keep only recent patterns to manage memory
        if len(self.user_time_patterns[user_id]) > 100:
            self.user_time_patterns[user_id] = self.user_time_patterns[user_id][-100:]
    
    # Utility methods
    def get_user_time_patterns(self, user_id: str) -> List[TimePattern]:
        """Get time patterns for user."""
        return self.user_time_patterns.get(user_id, [])
    
    def get_most_common_transaction_time(self, user_id: str) -> Optional[Dict[str, int]]:
        """Get most common transaction time for user."""
        patterns = self.user_time_patterns.get(user_id, [])
        if not patterns:
            return None
        
        time_counts = {}
        for pattern in patterns:
            key = f"{pattern.hour}-{pattern.day_of_week}"
            time_counts[key] = time_counts.get(key, 0) + 1
        
        if not time_counts:
            return None
        
        most_common = max(time_counts.items(), key=lambda x: x[1])
        hour, day_of_week = most_common[0].split('-')
        
        return {
            'hour': int(hour),
            'day_of_week': int(day_of_week)
        }
    
    def is_suspicious_time(self, hour: int, day_of_week: int) -> bool:
        """Check if time is suspicious."""
        return (hour in self.config.suspicious_hours or 
                day_of_week in [6, 7])  # Weekend
    
    def get_time_risk_level(self, hour: int, day_of_week: int) -> str:
        """Get risk level for time."""
        if hour in self.config.suspicious_hours:
            return 'high'
        elif day_of_week in [6, 7]:  # Weekend
            return 'medium'
        else:
            return 'low'
