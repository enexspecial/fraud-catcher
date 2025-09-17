"""
Device-based fraud detection algorithm.
"""

import time
from datetime import datetime
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass
from ..models import Transaction, DetectionRule


@dataclass
class DeviceConfig:
    """Configuration for device algorithm."""
    enable_fingerprinting: bool
    suspicious_device_threshold: int
    new_device_risk_multiplier: float
    device_velocity_window: int  # in minutes
    max_devices_per_user: int


@dataclass
class DeviceFingerprint:
    """Device fingerprint information."""
    device_id: str
    user_agent: str
    ip_address: str
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    transaction_count: int = 0
    total_amount: float = 0.0
    is_trusted: bool = False


class DeviceAlgorithm:
    """Detects fraud based on device patterns and sharing."""
    
    def __init__(self, config: DeviceConfig):
        self.config = config
        self.device_fingerprints: Dict[str, DeviceFingerprint] = {}
        self.user_devices: Dict[str, Set[str]] = {}
    
    async def analyze(self, transaction: Transaction, rule: DetectionRule) -> float:
        """Analyze transaction for device-based fraud patterns."""
        if not transaction.device_id and not transaction.user_agent and not transaction.ip_address:
            return 0.0  # No device data available
        
        device_id = transaction.device_id or self._generate_device_id(transaction)
        fingerprint = self._create_fingerprint(transaction, device_id)
        
        risk_score = 0.0
        
        # Check if device is new or suspicious
        existing_fingerprint = self.device_fingerprints.get(device_id)
        
        if not existing_fingerprint:
            # New device - check if user has too many devices
            user_device_count = self._get_user_device_count(transaction.user_id)
            if user_device_count >= self.config.max_devices_per_user:
                risk_score += 0.6  # High risk for too many devices
            else:
                risk_score += 0.3  # Medium risk for new device
            
            # Store new device
            self.device_fingerprints[device_id] = fingerprint
            self._add_user_device(transaction.user_id, device_id)
        else:
            # Existing device - check for anomalies
            device_risk = self._calculate_device_risk(existing_fingerprint, fingerprint)
            risk_score += device_risk
            
            # Update device fingerprint
            self._update_device_fingerprint(device_id, transaction)
        
        # Check device velocity (transactions per device)
        device_velocity = self._calculate_device_velocity(device_id)
        if device_velocity > self.config.suspicious_device_threshold:
            risk_score += 0.4
        
        # Check for device sharing patterns
        sharing_risk = self._calculate_device_sharing_risk(device_id, transaction.user_id)
        risk_score += sharing_risk
        
        return min(risk_score, 1.0)
    
    def _generate_device_id(self, transaction: Transaction) -> str:
        """Generate device ID from available data."""
        components = [
            transaction.user_agent or 'unknown',
            transaction.ip_address or 'unknown',
            transaction.metadata.get('screen_resolution') if transaction.metadata else 'unknown'
        ]
        
        return f"device_{hash('|'.join(components)) % 1000000}"
    
    def _create_fingerprint(self, transaction: Transaction, device_id: str) -> DeviceFingerprint:
        """Create device fingerprint from transaction."""
        now = datetime.now()
        
        return DeviceFingerprint(
            device_id=device_id,
            user_agent=transaction.user_agent or '',
            ip_address=transaction.ip_address or '',
            screen_resolution=transaction.metadata.get('screen_resolution') if transaction.metadata else None,
            timezone=transaction.metadata.get('timezone') if transaction.metadata else None,
            language=transaction.metadata.get('language') if transaction.metadata else None,
            platform=transaction.metadata.get('platform') if transaction.metadata else None,
            first_seen=now,
            last_seen=now,
            transaction_count=1,
            total_amount=transaction.amount,
            is_trusted=False
        )
    
    def _calculate_device_risk(self, existing: DeviceFingerprint, current: DeviceFingerprint) -> float:
        """Calculate risk based on device fingerprint changes."""
        risk_score = 0.0
        
        # Check for device fingerprint changes
        if existing.user_agent != current.user_agent:
            risk_score += 0.3  # User agent changed
        
        if existing.ip_address != current.ip_address:
            risk_score += 0.2  # IP address changed
        
        if existing.screen_resolution != current.screen_resolution:
            risk_score += 0.1  # Screen resolution changed
        
        if existing.timezone != current.timezone:
            risk_score += 0.1  # Timezone changed
        
        # Check for rapid device changes
        if existing.last_seen and current.last_seen:
            time_diff = (current.last_seen - existing.last_seen).total_seconds()
            if time_diff < 60:  # Less than 1 minute
                risk_score += 0.2  # Rapid device switching
        
        return min(risk_score, 0.8)
    
    def _calculate_device_velocity(self, device_id: str) -> float:
        """Calculate device velocity (transactions per minute)."""
        fingerprint = self.device_fingerprints.get(device_id)
        if not fingerprint:
            return 0.0
        
        time_window_seconds = self.config.device_velocity_window * 60
        now = datetime.now()
        
        if fingerprint.first_seen:
            time_diff = (now - fingerprint.first_seen).total_seconds()
            if time_diff < time_window_seconds:
                return fingerprint.transaction_count / (time_diff / 60)  # Transactions per minute
        
        return 0.0
    
    def _calculate_device_sharing_risk(self, device_id: str, user_id: str) -> float:
        """Calculate risk of device sharing."""
        # Check if device is used by multiple users
        device_users = self._get_device_users(device_id)
        if len(device_users) > 1:
            return 0.5  # High risk for device sharing
        
        return 0.0
    
    def _get_user_device_count(self, user_id: str) -> int:
        """Get number of devices for user."""
        return len(self.user_devices.get(user_id, set()))
    
    def _add_user_device(self, user_id: str, device_id: str) -> None:
        """Add device to user's device list."""
        if user_id not in self.user_devices:
            self.user_devices[user_id] = set()
        self.user_devices[user_id].add(device_id)
    
    def _get_device_users(self, device_id: str) -> Set[str]:
        """Get users associated with device."""
        users = set()
        for user_id, devices in self.user_devices.items():
            if device_id in devices:
                users.add(user_id)
        return users
    
    def _update_device_fingerprint(self, device_id: str, transaction: Transaction) -> None:
        """Update device fingerprint with new transaction."""
        fingerprint = self.device_fingerprints.get(device_id)
        if fingerprint:
            fingerprint.last_seen = datetime.now()
            fingerprint.transaction_count += 1
            fingerprint.total_amount += transaction.amount
    
    # Utility methods
    def get_device_fingerprint(self, device_id: str) -> Optional[DeviceFingerprint]:
        """Get device fingerprint by ID."""
        return self.device_fingerprints.get(device_id)
    
    def get_user_devices(self, user_id: str) -> List[str]:
        """Get list of device IDs for user."""
        return list(self.user_devices.get(user_id, set()))
    
    def mark_device_as_trusted(self, device_id: str) -> None:
        """Mark device as trusted."""
        fingerprint = self.device_fingerprints.get(device_id)
        if fingerprint:
            fingerprint.is_trusted = True
    
    def get_device_stats(self, device_id: str) -> Dict[str, Any]:
        """Get device statistics."""
        fingerprint = self.device_fingerprints.get(device_id)
        if not fingerprint:
            return {'transaction_count': 0, 'total_amount': 0.0, 'is_trusted': False}
        
        return {
            'transaction_count': fingerprint.transaction_count,
            'total_amount': fingerprint.total_amount,
            'is_trusted': fingerprint.is_trusted
        }
