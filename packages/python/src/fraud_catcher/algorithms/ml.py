"""
Machine learning fraud detection algorithm.
"""

import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from ..models import Transaction, DetectionRule


@dataclass
class MLConfig:
    """Configuration for ML algorithm."""
    enable_training: bool
    model_type: str  # 'isolation_forest', 'one_class_svm', 'local_outlier_factor', 'ensemble'
    feature_extractors: List[str]
    training_data_size: int
    retrain_interval: int  # in hours
    anomaly_threshold: float
    enable_feature_importance: bool
    enable_model_persistence: bool
    model_path: Optional[str] = None


@dataclass
class MLFeatures:
    """ML features extracted from transaction."""
    amount: float
    amount_log: float
    hour: int
    day_of_week: int
    is_weekend: int
    is_holiday: int
    user_transaction_count: int
    user_total_amount: float
    user_average_amount: float
    user_velocity: float
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    merchant_category_risk: Optional[float] = None
    device_newness: float = 0.0
    ip_risk_score: Optional[float] = None
    time_since_last_transaction: float = 0.0
    amount_deviation: float = 0.0
    location_distance: Optional[float] = None
    merchant_velocity: float = 0.0


@dataclass
class MLModel:
    """ML model information."""
    name: str
    type: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    features: List[str]
    trained_at: datetime
    last_used: datetime
    is_active: bool


class MLAlgorithm:
    """Machine learning fraud detection algorithm."""
    
    def __init__(self, config: MLConfig):
        self.config = config
        self.models: Dict[str, MLModel] = {}
        self.feature_history: Dict[str, List[MLFeatures]] = {}
        self.training_data: List[MLFeatures] = []
        self.last_training_time = datetime.now()
        self._initialize_models()
    
    async def analyze(self, transaction: Transaction, rule: DetectionRule) -> float:
        """Analyze transaction using ML models."""
        if not self.config.enable_training:
            return 0.0  # ML disabled
        
        # Extract features from transaction
        features = await self._extract_features(transaction)
        
        # Store features for training
        self._store_features(transaction.user_id, features)
        
        # Get anomaly score from active model
        anomaly_score = await self._get_anomaly_score(features)
        
        # Convert anomaly score to risk score (0-1)
        risk_score = self._convert_anomaly_score_to_risk(anomaly_score)
        
        # Retrain model if needed
        await self._check_and_retrain()
        
        return min(risk_score, 1.0)
    
    async def _extract_features(self, transaction: Transaction) -> MLFeatures:
        """Extract features from transaction."""
        transaction_time = transaction.timestamp if isinstance(transaction.timestamp, datetime) else datetime.now()
        hour = transaction_time.hour
        day_of_week = transaction_time.weekday() + 1
        is_weekend = 1 if day_of_week in [6, 7] else 0
        
        # Get user history for velocity calculations
        user_history = self._get_user_history(transaction.user_id)
        user_transaction_count = len(user_history)
        user_total_amount = sum(tx.amount for tx in user_history)
        user_average_amount = user_total_amount / user_transaction_count if user_transaction_count > 0 else 0.0
        
        # Calculate user velocity (transactions per hour)
        user_velocity = self._calculate_user_velocity(transaction.user_id)
        
        # Calculate time since last transaction
        time_since_last_transaction = self._calculate_time_since_last_transaction(transaction.user_id, transaction_time)
        
        # Calculate amount deviation from user average
        amount_deviation = abs(transaction.amount - user_average_amount) / user_average_amount if user_average_amount > 0 else 0.0
        
        # Calculate location distance from user's common locations
        location_distance = self._calculate_location_distance(transaction)
        
        # Calculate merchant velocity
        merchant_velocity = self._calculate_merchant_velocity(transaction.merchant_id)
        
        # Calculate device newness (0 = new, 1 = old)
        device_newness = self._calculate_device_newness(transaction.device_id)
        
        # Calculate merchant category risk
        merchant_category_risk = self._calculate_merchant_category_risk(transaction.merchant_category)
        
        # Calculate IP risk score
        ip_risk_score = self._calculate_ip_risk_score(transaction.ip_address)
        
        return MLFeatures(
            amount=transaction.amount,
            amount_log=float(transaction.amount + 1).__log__(),  # Log transform
            hour=hour,
            day_of_week=day_of_week,
            is_weekend=is_weekend,
            is_holiday=1 if self._is_holiday(transaction_time) else 0,
            user_transaction_count=user_transaction_count,
            user_total_amount=user_total_amount,
            user_average_amount=user_average_amount,
            user_velocity=user_velocity,
            location_lat=transaction.location.lat if transaction.location else None,
            location_lng=transaction.location.lng if transaction.location else None,
            merchant_category_risk=merchant_category_risk,
            device_newness=device_newness,
            ip_risk_score=ip_risk_score,
            time_since_last_transaction=time_since_last_transaction,
            amount_deviation=amount_deviation,
            location_distance=location_distance,
            merchant_velocity=merchant_velocity
        )
    
    def _get_user_history(self, user_id: str) -> List[Transaction]:
        """Get user's transaction history."""
        # This would return user's transaction history
        # For now, return empty list
        return []
    
    def _calculate_user_velocity(self, user_id: str) -> float:
        """Calculate transactions per hour for the user."""
        # This would use actual transaction history
        return 0.5  # Placeholder
    
    def _calculate_time_since_last_transaction(self, user_id: str, current_time: datetime) -> float:
        """Calculate hours since last transaction."""
        # This would use actual transaction history
        return 24.0  # Placeholder - 24 hours
    
    def _calculate_location_distance(self, transaction: Transaction) -> Optional[float]:
        """Calculate distance from user's most common location."""
        if not transaction.location:
            return None
        
        # This would use actual location history
        return 0.0  # Placeholder
    
    def _calculate_merchant_velocity(self, merchant_id: Optional[str]) -> float:
        """Calculate transactions per hour for this merchant."""
        if not merchant_id:
            return 0.0
        
        # This would use actual merchant transaction history
        return 0.1  # Placeholder
    
    def _calculate_device_newness(self, device_id: Optional[str]) -> float:
        """Calculate how long this device has been used."""
        if not device_id:
            return 1.0  # New device
        
        # This would use actual device history
        return 0.8  # Placeholder - 80% newness
    
    def _calculate_merchant_category_risk(self, category: Optional[str]) -> Optional[float]:
        """Calculate risk score for merchant category."""
        if not category:
            return 0.5  # Unknown category
        
        # Risk scores for different categories
        category_risks = {
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
        }
        
        return category_risks.get(category, 0.5)
    
    def _calculate_ip_risk_score(self, ip_address: Optional[str]) -> Optional[float]:
        """Calculate IP risk score."""
        if not ip_address:
            return 0.5  # Unknown IP
        
        # This would use IP reputation data
        return 0.3  # Placeholder
    
    def _is_holiday(self, date: datetime) -> bool:
        """Check if date is a holiday."""
        # Simplified holiday detection
        month = date.month
        day = date.day
        
        # New Year's Day
        if month == 1 and day == 1:
            return True
        # Christmas
        if month == 12 and day == 25:
            return True
        
        return False
    
    def _store_features(self, user_id: str, features: MLFeatures) -> None:
        """Store features for training."""
        if user_id not in self.feature_history:
            self.feature_history[user_id] = []
        
        self.feature_history[user_id].append(features)
        
        # Keep only recent features
        if len(self.feature_history[user_id]) > 1000:
            self.feature_history[user_id] = self.feature_history[user_id][-1000:]
        
        # Add to training data
        self.training_data.append(features)
        
        # Keep training data size manageable
        if len(self.training_data) > self.config.training_data_size:
            self.training_data = self.training_data[-self.config.training_data_size:]
    
    async def _get_anomaly_score(self, features: MLFeatures) -> float:
        """Get anomaly score from active model."""
        active_model = self._get_active_model()
        if not active_model:
            return 0.5  # No model available
        
        # Convert features to array for model prediction
        feature_array = self._features_to_array(features)
        
        try:
            # This would use the actual ML model
            # For now, return a random score
            import random
            return random.random()
        except Exception as error:
            print(f"Error getting anomaly score: {error}")
            return 0.5
    
    def _features_to_array(self, features: MLFeatures) -> List[float]:
        """Convert features object to array for ML model."""
        feature_array = []
        
        for key, value in features.__dict__.items():
            if isinstance(value, (int, float)):
                feature_array.append(float(value))
            elif isinstance(value, bool):
                feature_array.append(1.0 if value else 0.0)
            elif value is None:
                feature_array.append(0.0)
        
        return feature_array
    
    def _convert_anomaly_score_to_risk(self, anomaly_score: float) -> float:
        """Convert anomaly score to risk score (0-1)."""
        # Convert anomaly score to risk score (0-1)
        # This depends on the ML model used
        if anomaly_score < 0.1:
            return 0.1  # Low risk
        elif anomaly_score < 0.3:
            return 0.3  # Medium risk
        elif anomaly_score < 0.7:
            return 0.7  # High risk
        else:
            return 0.9  # Very high risk
    
    async def _check_and_retrain(self) -> None:
        """Check if model needs retraining."""
        now = datetime.now()
        hours_since_last_training = (now - self.last_training_time).total_seconds() / 3600
        
        if hours_since_last_training >= self.config.retrain_interval:
            await self._retrain_models()
            self.last_training_time = now
    
    async def _retrain_models(self) -> None:
        """Retrain ML models."""
        if len(self.training_data) < 100:
            return  # Not enough data for training
        
        try:
            # This would implement actual model training
            # For now, just log that training would happen
            print(f"Retraining models with {len(self.training_data)} samples")
            
            # Update model metadata
            for model_name, model in self.models.items():
                if model:
                    model.last_used = datetime.now()
        except Exception as error:
            print(f"Error retraining models: {error}")
    
    def _initialize_models(self) -> None:
        """Initialize ML models based on configuration."""
        model_types = ['ensemble'] if self.config.model_type == 'ensemble' else [self.config.model_type]
        
        for model_type in model_types:
            self.models[model_type] = MLModel(
                name=model_type,
                type=model_type,
                accuracy=0.0,
                precision=0.0,
                recall=0.0,
                f1_score=0.0,
                features=self.config.feature_extractors,
                trained_at=datetime.now(),
                last_used=datetime.now(),
                is_active=model_type == self.config.model_type
            )
    
    def _get_active_model(self) -> Optional[MLModel]:
        """Get active ML model."""
        for name, model in self.models.items():
            if model.is_active:
                return model
        return None
    
    # Utility methods
    def get_model_info(self, model_name: str) -> Optional[MLModel]:
        """Get model information."""
        return self.models.get(model_name)
    
    def get_all_models(self) -> List[MLModel]:
        """Get all models."""
        return list(self.models.values())
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from trained model."""
        # This would return feature importance from the trained model
        # For now, return placeholder data
        return {
            'amount': 0.3,
            'user_velocity': 0.25,
            'location_distance': 0.2,
            'merchant_category_risk': 0.15,
            'device_newness': 0.1
        }
    
    def get_training_data_size(self) -> int:
        """Get training data size."""
        return len(self.training_data)
    
    def get_feature_history_size(self, user_id: str) -> int:
        """Get feature history size for user."""
        return len(self.feature_history.get(user_id, []))
    
    async def force_retrain(self) -> None:
        """Force model retraining."""
        await self._retrain_models()
        self.last_training_time = datetime.now()
    
    def export_model(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Export model for persistence."""
        model = self.models.get(model_name)
        if not model:
            return None
        
        return {
            **model.__dict__,
            'training_data': self.training_data[-1000:],  # Last 1000 samples
            'exported_at': datetime.now()
        }
    
    def import_model(self, model_data: Dict[str, Any]) -> bool:
        """Import model from persistence."""
        try:
            # Import model from persistence
            self.models[model_data['name']] = MLModel(**model_data)
            return True
        except Exception as error:
            print(f"Error importing model: {error}")
            return False
