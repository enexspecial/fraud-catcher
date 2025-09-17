"""
FraudCatcher - A comprehensive fraud detection library for Python.

This package provides multiple fraud detection algorithms and scoring mechanisms
to help identify suspicious activities across various domains.
"""

from .fraud_detector import FraudDetector
from .models import Transaction, Location, FraudResult, DetectionRule, FraudDetectorConfig
from .algorithms import (
    VelocityAlgorithm,
    AmountAlgorithm,
    LocationAlgorithm,
    VelocityConfig,
    AmountConfig,
    LocationConfig,
)

__version__ = "1.0.0"
__author__ = "John Henry"
__email__ = "john04star@gmail.com"

__all__ = [
    "FraudDetector",
    "Transaction",
    "Location", 
    "FraudResult",
    "DetectionRule",
    "FraudDetectorConfig",
    "VelocityAlgorithm",
    "AmountAlgorithm",
    "LocationAlgorithm",
    "VelocityConfig",
    "AmountConfig",
    "LocationConfig",
]
