"""
Amount-based fraud detection algorithm.
"""

from typing import Dict, Optional
from dataclasses import dataclass
from ..models import Transaction, DetectionRule


@dataclass
class AmountConfig:
    """Configuration for amount algorithm."""
    suspicious_threshold: float
    high_risk_threshold: float
    currency_multipliers: Optional[Dict[str, float]] = None


class AmountAlgorithm:
    """Detects fraud based on transaction amounts."""
    
    def __init__(self, config: AmountConfig):
        self.config = config
        if self.config.currency_multipliers is None:
            self.config.currency_multipliers = {
                'USD': 1.0,
                'EUR': 1.1,
                'GBP': 1.3,
                'JPY': 0.007
            }
    
    async def analyze(self, transaction: Transaction, rule: DetectionRule) -> float:
        """Analyze transaction for amount-based fraud patterns."""
        amount = transaction.amount
        currency = transaction.currency or 'USD'
        
        # Apply currency multiplier if configured
        multiplier = self.config.currency_multipliers.get(currency, 1.0)
        normalized_amount = amount * multiplier
        
        # Calculate risk based on amount thresholds
        if normalized_amount >= self.config.high_risk_threshold:
            return 1.0  # Maximum risk for very high amounts
        elif normalized_amount >= self.config.suspicious_threshold:
            # Linear interpolation between suspicious and high risk thresholds
            range_val = self.config.high_risk_threshold - self.config.suspicious_threshold
            position = normalized_amount - self.config.suspicious_threshold
            return 0.5 + (position / range_val) * 0.5  # 0.5 to 1.0
        else:
            # Low risk for amounts below suspicious threshold
            return (normalized_amount / self.config.suspicious_threshold) * 0.5  # 0.0 to 0.5
    
    def is_suspicious_amount(self, amount: float, currency: str = 'USD') -> bool:
        """Check if amount is suspicious."""
        multiplier = self.config.currency_multipliers.get(currency, 1.0)
        normalized_amount = amount * multiplier
        return normalized_amount >= self.config.suspicious_threshold
    
    def is_high_risk_amount(self, amount: float, currency: str = 'USD') -> bool:
        """Check if amount is high risk."""
        multiplier = self.config.currency_multipliers.get(currency, 1.0)
        normalized_amount = amount * multiplier
        return normalized_amount >= self.config.high_risk_threshold
    
    def get_risk_level(self, amount: float, currency: str = 'USD') -> str:
        """Get risk level for amount."""
        multiplier = self.config.currency_multipliers.get(currency, 1.0)
        normalized_amount = amount * multiplier
        
        if normalized_amount >= self.config.high_risk_threshold:
            return 'high'
        elif normalized_amount >= self.config.suspicious_threshold:
            return 'medium'
        else:
            return 'low'
