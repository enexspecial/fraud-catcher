"""
Main fraud detector class that orchestrates all algorithms.
"""

import time
from datetime import datetime
from typing import Dict, List, Optional, Any

from .models import Transaction, FraudResult, FraudDetectorConfig, DetectionRule
from .algorithms import (
    VelocityAlgorithm, VelocityConfig,
    AmountAlgorithm, AmountConfig,
    LocationAlgorithm, LocationConfig,
    DeviceAlgorithm, DeviceConfig,
    TimeAlgorithm, TimeConfig,
    MerchantAlgorithm, MerchantConfig,
    BehavioralAlgorithm, BehavioralConfig,
    NetworkAlgorithm, NetworkConfig,
    MLAlgorithm, MLConfig
)


class FraudDetector:
    """Main fraud detection orchestrator."""
    
    def __init__(self, config: FraudDetectorConfig):
        self.config = config
        self.algorithms: Dict[str, Any] = {}
        self.rules: Dict[str, DetectionRule] = {}
        self._initialize_algorithms()
        self._initialize_rules()
    
    def _initialize_algorithms(self) -> None:
        """Initialize all fraud detection algorithms."""
        # Initialize velocity algorithm
        velocity_config = VelocityConfig(
            time_window=60,  # 1 hour
            max_transactions=10,
            max_amount=5000.0
        )
        self.algorithms['velocity'] = VelocityAlgorithm(velocity_config)
        
        # Initialize amount algorithm
        amount_config = AmountConfig(
            suspicious_threshold=1000.0,
            high_risk_threshold=5000.0,
            currency_multipliers={
                'USD': 1.0,
                'EUR': 1.1,
                'GBP': 1.3,
                'JPY': 0.007
            }
        )
        self.algorithms['amount'] = AmountAlgorithm(amount_config)
        
        # Initialize location algorithm
        location_config = LocationConfig(
            max_distance_km=1000.0,
            suspicious_distance_km=100.0,
            time_window_minutes=60,
            enable_geo_fencing=False,
            trusted_locations=[]
        )
        self.algorithms['location'] = LocationAlgorithm(location_config)
        
        # Initialize device algorithm
        device_config = DeviceConfig(
            enable_fingerprinting=True,
            suspicious_device_threshold=5,
            new_device_risk_multiplier=1.5,
            device_velocity_window=60,
            max_devices_per_user=5
        )
        self.algorithms['device'] = DeviceAlgorithm(device_config)
        
        # Initialize time algorithm
        time_config = TimeConfig(
            suspicious_hours=[0, 1, 2, 3, 4, 5, 22, 23],  # Late night/early morning
            weekend_risk_multiplier=1.2,
            holiday_risk_multiplier=1.5,
            timezone_threshold=8,  # 8 hours difference
            enable_holiday_detection=True,
            custom_holidays=[]
        )
        self.algorithms['time'] = TimeAlgorithm(time_config)
        
        # Initialize merchant algorithm
        merchant_config = MerchantConfig(
            high_risk_categories=['gambling', 'adult', 'cash_advance', 'cryptocurrency'],
            suspicious_merchants=[],
            trusted_merchants=[],
            category_risk_scores={
                'electronics': 0.3,
                'grocery': 0.1,
                'gas': 0.2,
                'restaurant': 0.2,
                'travel': 0.6,
                'gambling': 0.8,
                'adult': 0.9,
                'pharmacy': 0.4,
                'jewelry': 0.7,
                'cash_advance': 0.9
            },
            merchant_velocity_window=60,
            max_transactions_per_merchant=20,
            enable_category_analysis=True,
            enable_merchant_reputation=True
        )
        self.algorithms['merchant'] = MerchantAlgorithm(merchant_config)
        
        # Initialize behavioral algorithm
        behavioral_config = BehavioralConfig(
            enable_spending_patterns=True,
            enable_transaction_timing=True,
            enable_location_patterns=True,
            enable_device_patterns=True,
            pattern_history_days=30,
            anomaly_threshold=0.7,
            enable_machine_learning=False,
            learning_rate=0.01
        )
        self.algorithms['behavioral'] = BehavioralAlgorithm(behavioral_config)
        
        # Initialize network algorithm
        network_config = NetworkConfig(
            enable_ip_analysis=True,
            enable_proxy_detection=True,
            enable_vpn_detection=True,
            enable_tor_detection=True,
            suspicious_countries=['XX', 'ZZ'],  # Placeholder country codes
            trusted_countries=['US', 'CA', 'GB', 'DE', 'FR'],
            max_connections_per_ip=10,
            ip_velocity_window=60,
            enable_geo_ip_analysis=True,
            enable_asn_analysis=True
        )
        self.algorithms['network'] = NetworkAlgorithm(network_config)
        
        # Initialize ML algorithm
        ml_config = MLConfig(
            enable_training=True,
            model_type='ensemble',
            feature_extractors=['amount', 'velocity', 'location', 'merchant', 'device', 'time'],
            training_data_size=10000,
            retrain_interval=24,  # 24 hours
            anomaly_threshold=0.5,
            enable_feature_importance=True,
            enable_model_persistence=True
        )
        self.algorithms['ml'] = MLAlgorithm(ml_config)
    
    def _initialize_rules(self) -> None:
        """Initialize detection rules."""
        # Initialize default rules with updated weights for all algorithms
        self.rules['velocity'] = DetectionRule(
            name='velocity',
            weight=0.15,
            threshold=self.config.thresholds.get('velocity', 0.8),
            enabled='velocity' in self.config.rules,
            config={}
        )
        
        self.rules['amount'] = DetectionRule(
            name='amount',
            weight=0.15,
            threshold=self.config.thresholds.get('amount', 0.9),
            enabled='amount' in self.config.rules,
            config={}
        )
        
        self.rules['location'] = DetectionRule(
            name='location',
            weight=0.15,
            threshold=self.config.thresholds.get('location', 0.7),
            enabled='location' in self.config.rules,
            config={}
        )
        
        self.rules['device'] = DetectionRule(
            name='device',
            weight=0.15,
            threshold=self.config.thresholds.get('device', 0.8),
            enabled='device' in self.config.rules,
            config={}
        )
        
        self.rules['time'] = DetectionRule(
            name='time',
            weight=0.10,
            threshold=self.config.thresholds.get('time', 0.6),
            enabled='time' in self.config.rules,
            config={}
        )
        
        self.rules['merchant'] = DetectionRule(
            name='merchant',
            weight=0.15,
            threshold=self.config.thresholds.get('merchant', 0.7),
            enabled='merchant' in self.config.rules,
            config={}
        )
        
        self.rules['behavioral'] = DetectionRule(
            name='behavioral',
            weight=0.10,
            threshold=self.config.thresholds.get('behavioral', 0.6),
            enabled='behavioral' in self.config.rules,
            config={}
        )
        
        self.rules['network'] = DetectionRule(
            name='network',
            weight=0.10,
            threshold=self.config.thresholds.get('network', 0.8),
            enabled='network' in self.config.rules,
            config={}
        )
        
        self.rules['ml'] = DetectionRule(
            name='ml',
            weight=0.20,
            threshold=self.config.thresholds.get('ml', 0.5),
            enabled='ml' in self.config.rules,
            config={}
        )
        
        # Add custom rules if provided
        if self.config.custom_rules:
            for rule in self.config.custom_rules:
                self.rules[rule.name] = rule
    
    async def analyze(self, transaction: Transaction) -> FraudResult:
        """Analyze transaction for fraud patterns."""
        start_time = time.time()
        triggered_rules: List[str] = []
        total_weighted_score = 0.0
        total_weight = 0.0
        
        # Process each enabled rule
        for rule_name, rule in self.rules.items():
            if not rule.enabled:
                continue
            
            algorithm = self.algorithms.get(rule_name)
            if not algorithm:
                print(f"Warning: Algorithm not found for rule: {rule_name}")
                continue
            
            try:
                score = await algorithm.analyze(transaction, rule)
                
                if score >= rule.threshold:
                    triggered_rules.append(rule_name)
                
                total_weighted_score += score * rule.weight
                total_weight += rule.weight
            except Exception as error:
                print(f"Error processing rule {rule_name}: {error}")
        
        # Calculate final risk score
        risk_score = total_weighted_score / total_weight if total_weight > 0 else 0.0
        is_fraudulent = risk_score >= self.config.global_threshold
        
        # Calculate confidence based on number of triggered rules
        confidence = min(len(triggered_rules) / len(self.config.rules), 1.0) if self.config.rules else 0.0
        
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        result = FraudResult(
            transaction_id=transaction.id,
            risk_score=min(risk_score, 1.0),
            is_fraudulent=is_fraudulent,
            confidence=confidence,
            triggered_rules=triggered_rules,
            details={
                'algorithm': 'multi-algorithm',
                'processing_time': processing_time,
                'timestamp': datetime.now()
            }
        )
        
        # Add recommendations
        result.recommendations = self._generate_recommendations(result, transaction)
        
        if self.config.enable_logging:
            print(f"Fraud analysis completed for transaction {transaction.id}:", {
                'risk_score': result.risk_score,
                'is_fraudulent': result.is_fraudulent,
                'triggered_rules': result.triggered_rules,
                'processing_time': result.details['processing_time']
            })
        
        return result
    
    def _generate_recommendations(self, result: FraudResult, transaction: Transaction) -> List[str]:
        """Generate recommendations based on analysis results."""
        recommendations = []
        
        if 'velocity' in result.triggered_rules:
            recommendations.append('Consider implementing velocity-based transaction limits')
        
        if 'amount' in result.triggered_rules:
            recommendations.append('Review transaction amount thresholds and user spending patterns')
        
        if 'location' in result.triggered_rules:
            recommendations.append('Verify transaction location and check for unusual travel patterns')
        
        if result.risk_score > 0.8:
            recommendations.append('High risk transaction - consider manual review or additional verification')
        
        if result.confidence < 0.5:
            recommendations.append('Low confidence score - consider gathering additional transaction data')
        
        return recommendations
    
    # Utility methods for external access to algorithms
    def get_velocity_stats(self, user_id: str, time_window_minutes: int = 60) -> Dict[str, Any]:
        """Get velocity statistics for user."""
        velocity_algorithm = self.algorithms.get('velocity')
        if not velocity_algorithm:
            return {'count': 0, 'total_amount': 0.0}
        
        return {
            'count': velocity_algorithm.get_transaction_count(user_id, time_window_minutes),
            'total_amount': velocity_algorithm.get_total_amount(user_id, time_window_minutes)
        }
    
    def is_suspicious_amount(self, amount: float, currency: str = 'USD') -> bool:
        """Check if amount is suspicious."""
        amount_algorithm = self.algorithms.get('amount')
        if not amount_algorithm:
            return False
        
        return amount_algorithm.is_suspicious_amount(amount, currency)
    
    def is_impossible_travel(self, from_loc: Any, to_loc: Any, time_diff_minutes: int) -> bool:
        """Check if travel between locations is impossible."""
        location_algorithm = self.algorithms.get('location')
        if not location_algorithm:
            return False
        
        return location_algorithm.is_impossible_travel(from_loc, to_loc, time_diff_minutes)
    
    # Configuration update methods
    def update_threshold(self, rule_name: str, threshold: float) -> None:
        """Update threshold for a specific rule."""
        rule = self.rules.get(rule_name)
        if rule:
            rule.threshold = threshold
    
    def update_global_threshold(self, threshold: float) -> None:
        """Update global fraud threshold."""
        self.config.global_threshold = threshold
    
    def enable_rule(self, rule_name: str) -> None:
        """Enable a specific rule."""
        rule = self.rules.get(rule_name)
        if rule:
            rule.enabled = True
    
    def disable_rule(self, rule_name: str) -> None:
        """Disable a specific rule."""
        rule = self.rules.get(rule_name)
        if rule:
            rule.enabled = False
    
    def get_config(self) -> FraudDetectorConfig:
        """Get current configuration."""
        return self.config
