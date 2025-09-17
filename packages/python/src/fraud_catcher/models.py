"""
Data models and interfaces for the fraud detection system.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Union
from datetime import datetime


@dataclass
class Location:
    """Represents a geographical location."""
    lat: float
    lng: float
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


@dataclass
class Transaction:
    """Represents a financial transaction."""
    id: str
    user_id: str
    amount: float
    currency: str = "USD"
    timestamp: Union[datetime, str] = None
    location: Optional[Location] = None
    merchant_id: Optional[str] = None
    merchant_category: Optional[str] = None
    payment_method: Optional[str] = None
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
        elif isinstance(self.timestamp, str):
            self.timestamp = datetime.fromisoformat(self.timestamp.replace('Z', '+00:00'))


@dataclass
class FraudResult:
    """Represents the result of fraud analysis."""
    transaction_id: str
    risk_score: float  # 0.0 - 1.0
    is_fraudulent: bool
    confidence: float  # 0.0 - 1.0
    triggered_rules: List[str]
    details: Dict[str, Any]
    recommendations: Optional[List[str]] = None


@dataclass
class DetectionRule:
    """Represents a fraud detection rule."""
    name: str
    weight: float  # 0.0 - 1.0
    threshold: float  # 0.0 - 1.0
    enabled: bool = True
    config: Optional[Dict[str, Any]] = None


@dataclass
class FraudDetectorConfig:
    """Configuration for the fraud detector."""
    rules: List[str]
    thresholds: Dict[str, float]
    global_threshold: float = 0.7
    enable_logging: bool = False
    custom_rules: Optional[List[DetectionRule]] = None
