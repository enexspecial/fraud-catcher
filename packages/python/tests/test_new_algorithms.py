"""
Tests for the new fraud detection algorithms.
"""

import pytest
import asyncio
from datetime import datetime
from fraud_catcher import (
    DeviceAlgorithm, DeviceConfig,
    TimeAlgorithm, TimeConfig,
    MerchantAlgorithm, MerchantConfig,
    BehavioralAlgorithm, BehavioralConfig,
    NetworkAlgorithm, NetworkConfig,
    MLAlgorithm, MLConfig,
    Transaction, Location, DetectionRule
)


class TestDeviceAlgorithm:
    """Test cases for DeviceAlgorithm."""
    
    @pytest.fixture
    def algorithm(self):
        config = DeviceConfig(
            enable_fingerprinting=True,
            suspicious_device_threshold=5,
            new_device_risk_multiplier=1.5,
            device_velocity_window=60,
            max_devices_per_user=5
        )
        return DeviceAlgorithm(config)
    
    @pytest.fixture
    def rule(self):
        return DetectionRule(
            name='device',
            weight=0.15,
            threshold=0.8,
            enabled=True
        )
    
    @pytest.mark.asyncio
    async def test_new_device_detection(self, algorithm, rule):
        """Test detection of new device risk."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=100.0,
            currency='USD',
            timestamp=datetime.now(),
            device_id='device_001',
            user_agent='Mozilla/5.0...',
            ip_address='192.168.1.1'
        )
        
        score = await algorithm.analyze(transaction, rule)
        assert score > 0
        assert score <= 1
    
    @pytest.mark.asyncio
    async def test_device_sharing_detection(self, algorithm, rule):
        """Test detection of device sharing."""
        device_id = 'shared_device'
        
        # First user
        transaction1 = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=100.0,
            currency='USD',
            timestamp=datetime.now(),
            device_id=device_id,
            user_agent='Mozilla/5.0...',
            ip_address='192.168.1.1'
        )
        
        # Second user with same device
        transaction2 = Transaction(
            id='tx_002',
            user_id='user_002',
            amount=200.0,
            currency='USD',
            timestamp=datetime.now(),
            device_id=device_id,
            user_agent='Mozilla/5.0...',
            ip_address='192.168.1.1'
        )
        
        await algorithm.analyze(transaction1, rule)
        score = await algorithm.analyze(transaction2, rule)
        
        assert score > 0.4  # Should detect device sharing


class TestTimeAlgorithm:
    """Test cases for TimeAlgorithm."""
    
    @pytest.fixture
    def algorithm(self):
        config = TimeConfig(
            suspicious_hours=[0, 1, 2, 3, 4, 5, 22, 23],
            weekend_risk_multiplier=1.2,
            holiday_risk_multiplier=1.5,
            timezone_threshold=8,
            enable_holiday_detection=True,
            custom_holidays=[]
        )
        return TimeAlgorithm(config)
    
    @pytest.fixture
    def rule(self):
        return DetectionRule(
            name='time',
            weight=0.10,
            threshold=0.6,
            enabled=True
        )
    
    @pytest.mark.asyncio
    async def test_suspicious_hour_detection(self, algorithm, rule):
        """Test detection of suspicious hour transactions."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=100.0,
            currency='USD',
            timestamp=datetime(2024, 1, 1, 2, 0, 0)  # 2 AM
        )
        
        score = await algorithm.analyze(transaction, rule)
        assert score > 0.3  # Should detect suspicious hour
    
    @pytest.mark.asyncio
    async def test_weekend_detection(self, algorithm, rule):
        """Test detection of weekend transactions."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=100.0,
            currency='USD',
            timestamp=datetime(2024, 1, 6, 14, 0, 0)  # Saturday 2 PM
        )
        
        score = await algorithm.analyze(transaction, rule)
        assert score > 0.1  # Should detect weekend


class TestMerchantAlgorithm:
    """Test cases for MerchantAlgorithm."""
    
    @pytest.fixture
    def algorithm(self):
        config = MerchantConfig(
            high_risk_categories=['gambling', 'adult', 'cash_advance'],
            suspicious_merchants=['suspicious_merchant'],
            trusted_merchants=['trusted_merchant'],
            category_risk_scores={
                'gambling': 0.8,
                'electronics': 0.3,
                'grocery': 0.1
            },
            merchant_velocity_window=60,
            max_transactions_per_merchant=20,
            enable_category_analysis=True,
            enable_merchant_reputation=True
        )
        return MerchantAlgorithm(config)
    
    @pytest.fixture
    def rule(self):
        return DetectionRule(
            name='merchant',
            weight=0.15,
            threshold=0.7,
            enabled=True
        )
    
    @pytest.mark.asyncio
    async def test_high_risk_category_detection(self, algorithm, rule):
        """Test detection of high-risk category transactions."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=100.0,
            currency='USD',
            timestamp=datetime.now(),
            merchant_id='merchant_001',
            merchant_category='gambling'
        )
        
        score = await algorithm.analyze(transaction, rule)
        assert score > 0.5  # Should detect high-risk category
    
    @pytest.mark.asyncio
    async def test_suspicious_merchant_detection(self, algorithm, rule):
        """Test detection of suspicious merchant transactions."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=100.0,
            currency='USD',
            timestamp=datetime.now(),
            merchant_id='suspicious_merchant',
            merchant_category='electronics'
        )
        
        score = await algorithm.analyze(transaction, rule)
        assert score > 0.7  # Should detect suspicious merchant


class TestBehavioralAlgorithm:
    """Test cases for BehavioralAlgorithm."""
    
    @pytest.fixture
    def algorithm(self):
        config = BehavioralConfig(
            enable_spending_patterns=True,
            enable_transaction_timing=True,
            enable_location_patterns=True,
            enable_device_patterns=True,
            pattern_history_days=30,
            anomaly_threshold=0.7,
            enable_machine_learning=False,
            learning_rate=0.01
        )
        return BehavioralAlgorithm(config)
    
    @pytest.fixture
    def rule(self):
        return DetectionRule(
            name='behavioral',
            weight=0.10,
            threshold=0.6,
            enabled=True
        )
    
    @pytest.mark.asyncio
    async def test_spending_pattern_anomaly(self, algorithm, rule):
        """Test detection of spending pattern anomalies."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=10000.0,  # Unusually high amount
            currency='USD',
            timestamp=datetime.now()
        )
        
        score = await algorithm.analyze(transaction, rule)
        assert score > 0.3  # Should detect spending anomaly
    
    @pytest.mark.asyncio
    async def test_location_pattern_anomaly(self, algorithm, rule):
        """Test detection of location pattern anomalies."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=100.0,
            currency='USD',
            timestamp=datetime.now(),
            location=Location(
                lat=40.7128,
                lng=-74.0060,
                country='US',
                city='New York'
            )
        )
        
        score = await algorithm.analyze(transaction, rule)
        assert score >= 0  # Should analyze location


class TestNetworkAlgorithm:
    """Test cases for NetworkAlgorithm."""
    
    @pytest.fixture
    def algorithm(self):
        config = NetworkConfig(
            enable_ip_analysis=True,
            enable_proxy_detection=True,
            enable_vpn_detection=True,
            enable_tor_detection=True,
            suspicious_countries=['XX', 'ZZ'],
            trusted_countries=['US', 'CA', 'GB'],
            max_connections_per_ip=10,
            ip_velocity_window=60,
            enable_geo_ip_analysis=True,
            enable_asn_analysis=True
        )
        return NetworkAlgorithm(config)
    
    @pytest.fixture
    def rule(self):
        return DetectionRule(
            name='network',
            weight=0.10,
            threshold=0.8,
            enabled=True
        )
    
    @pytest.mark.asyncio
    async def test_ip_analysis(self, algorithm, rule):
        """Test IP analysis functionality."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=100.0,
            currency='USD',
            timestamp=datetime.now(),
            ip_address='192.168.1.1'
        )
        
        score = await algorithm.analyze(transaction, rule)
        assert score >= 0  # Should analyze IP
    
    @pytest.mark.asyncio
    async def test_ip_velocity_detection(self, algorithm, rule):
        """Test detection of IP velocity anomalies."""
        ip_address = '192.168.1.1'
        
        # Create multiple transactions from same IP
        for i in range(15):
            transaction = Transaction(
                id=f'tx_{i}',
                user_id=f'user_{i}',
                amount=100.0,
                currency='USD',
                timestamp=datetime.now(),
                ip_address=ip_address
            )
            
            await algorithm.analyze(transaction, rule)
        
        # Check if IP is flagged for high velocity
        profile = algorithm.get_ip_profile(ip_address)
        assert profile is not None
        assert profile.transaction_count > 10


class TestMLAlgorithm:
    """Test cases for MLAlgorithm."""
    
    @pytest.fixture
    def algorithm(self):
        config = MLConfig(
            enable_training=True,
            model_type='ensemble',
            feature_extractors=['amount', 'velocity', 'location'],
            training_data_size=1000,
            retrain_interval=24,
            anomaly_threshold=0.5,
            enable_feature_importance=True,
            enable_model_persistence=True
        )
        return MLAlgorithm(config)
    
    @pytest.fixture
    def rule(self):
        return DetectionRule(
            name='ml',
            weight=0.20,
            threshold=0.5,
            enabled=True
        )
    
    @pytest.mark.asyncio
    async def test_ml_analysis(self, algorithm, rule):
        """Test ML analysis functionality."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=1000.0,
            currency='USD',
            timestamp=datetime.now(),
            location=Location(lat=40.7128, lng=-74.0060)
        )
        
        score = await algorithm.analyze(transaction, rule)
        assert score >= 0
        assert score <= 1
    
    @pytest.mark.asyncio
    async def test_feature_extraction(self, algorithm, rule):
        """Test feature extraction functionality."""
        transaction = Transaction(
            id='tx_001',
            user_id='user_001',
            amount=1000.0,
            currency='USD',
            timestamp=datetime.now(),
            location=Location(lat=40.7128, lng=-74.0060)
        )
        
        features = await algorithm.extract_features(transaction)
        assert features['amount'] == 1000.0
        assert features['location_lat'] == 40.7128
        assert features['location_lng'] == -74.0060
