"""
Tests for the FraudDetector class.
"""

import pytest
import asyncio
from datetime import datetime
from fraud_catcher import FraudDetector, Transaction, Location


class TestFraudDetector:
    """Test cases for FraudDetector."""
    
    @pytest.fixture
    def detector(self):
        """Create a fraud detector instance for testing."""
        return FraudDetector({
            'rules': ['velocity', 'amount', 'location'],
            'thresholds': {
                'velocity': 0.8,
                'amount': 0.9,
                'location': 0.7
            },
            'global_threshold': 0.7,
            'enable_logging': False
        })
    
    @pytest.fixture
    def normal_transaction(self):
        """Create a normal transaction for testing."""
        return Transaction(
            id='tx_001',
            user_id='user_001',
            amount=100.0,
            currency='USD',
            timestamp=datetime.now(),
            location=Location(lat=40.7128, lng=-74.0060)
        )
    
    @pytest.fixture
    def high_amount_transaction(self):
        """Create a high amount transaction for testing."""
        return Transaction(
            id='tx_002',
            user_id='user_002',
            amount=10000.0,  # High amount
            currency='USD',
            timestamp=datetime.now()
        )
    
    @pytest.mark.asyncio
    async def test_analyze_normal_transaction(self, detector, normal_transaction):
        """Test analysis of a normal transaction."""
        result = await detector.analyze(normal_transaction)
        
        assert result is not None
        assert result.transaction_id == 'tx_001'
        assert 0 <= result.risk_score <= 1
        assert isinstance(result.is_fraudulent, bool)
        assert isinstance(result.triggered_rules, list)
    
    @pytest.mark.asyncio
    async def test_analyze_high_amount_transaction(self, detector, high_amount_transaction):
        """Test analysis of a high amount transaction."""
        result = await detector.analyze(high_amount_transaction)
        
        assert result.risk_score > 0.5
        assert 'amount' in result.triggered_rules
    
    @pytest.mark.asyncio
    async def test_velocity_detection(self, detector):
        """Test velocity-based fraud detection."""
        user_id = 'user_003'
        
        # Create multiple transactions in quick succession
        for i in range(15):
            transaction = Transaction(
                id=f'tx_{i}',
                user_id=user_id,
                amount=100.0,
                currency='USD',
                timestamp=datetime.now()
            )
            await detector.analyze(transaction)
        
        # The last transaction should trigger velocity rule
        last_transaction = Transaction(
            id='tx_final',
            user_id=user_id,
            amount=100.0,
            currency='USD',
            timestamp=datetime.now()
        )
        
        result = await detector.analyze(last_transaction)
        assert 'velocity' in result.triggered_rules
    
    def test_is_suspicious_amount(self, detector):
        """Test suspicious amount detection."""
        assert detector.is_suspicious_amount(2000.0, 'USD') is True
        assert detector.is_suspicious_amount(500.0, 'USD') is False
    
    def test_get_velocity_stats(self, detector):
        """Test velocity statistics retrieval."""
        stats = detector.get_velocity_stats('user_001', 60)
        
        assert 'count' in stats
        assert 'total_amount' in stats
        assert isinstance(stats['count'], int)
        assert isinstance(stats['total_amount'], float)
    
    def test_configuration_updates(self, detector):
        """Test configuration update methods."""
        # Test threshold updates
        detector.update_threshold('amount', 0.5)
        detector.update_global_threshold(0.8)
        
        # Test rule enabling/disabling
        detector.disable_rule('velocity')
        detector.enable_rule('velocity')
        
        # Test config retrieval
        config = detector.get_config()
        assert config is not None
        assert 'rules' in config
        assert 'thresholds' in config
