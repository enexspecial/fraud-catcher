"""
Merchant-based fraud detection algorithm.
"""

import time
from datetime import datetime
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass
from ..models import Transaction, DetectionRule


@dataclass
class MerchantConfig:
    """Configuration for merchant algorithm."""
    high_risk_categories: List[str]
    suspicious_merchants: List[str]
    trusted_merchants: List[str]
    category_risk_scores: Dict[str, float]
    merchant_velocity_window: int  # in minutes
    max_transactions_per_merchant: int
    enable_category_analysis: bool
    enable_merchant_reputation: bool


@dataclass
class MerchantProfile:
    """Merchant profile information."""
    merchant_id: str
    merchant_name: Optional[str] = None
    category: str = 'unknown'
    risk_score: float = 0.0
    transaction_count: int = 0
    total_amount: float = 0.0
    average_amount: float = 0.0
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    is_trusted: bool = False
    is_suspicious: bool = False
    user_count: int = 0
    unique_users: Set[str] = None
    
    def __post_init__(self):
        if self.unique_users is None:
            self.unique_users = set()


class MerchantAlgorithm:
    """Detects fraud based on merchant patterns and reputation."""
    
    def __init__(self, config: MerchantConfig):
        self.config = config
        self.merchant_profiles: Dict[str, MerchantProfile] = {}
        self.user_merchants: Dict[str, Set[str]] = {}
        self.category_stats: Dict[str, Dict[str, float]] = {}
    
    async def analyze(self, transaction: Transaction, rule: DetectionRule) -> float:
        """Analyze transaction for merchant-based fraud patterns."""
        if not transaction.merchant_id:
            return 0.0  # No merchant data
        
        merchant_id = transaction.merchant_id
        category = transaction.merchant_category or 'unknown'
        
        risk_score = 0.0
        
        # Get or create merchant profile
        merchant_profile = self._get_or_create_merchant_profile(merchant_id, category, transaction)
        
        # Check if merchant is in suspicious list
        if merchant_id in self.config.suspicious_merchants:
            risk_score += 0.8
        
        # Check if merchant is trusted (reduce risk)
        if merchant_id in self.config.trusted_merchants:
            risk_score -= 0.3
        
        # Check category risk
        if self.config.enable_category_analysis:
            category_risk = self._analyze_category_risk(category, merchant_profile)
            risk_score += category_risk
        
        # Check merchant velocity (transactions per merchant)
        velocity_risk = self._analyze_merchant_velocity(merchant_id, transaction)
        risk_score += velocity_risk
        
        # Check for unusual merchant patterns
        pattern_risk = self._analyze_merchant_patterns(transaction.user_id, merchant_id, category)
        risk_score += pattern_risk
        
        # Check merchant reputation
        if self.config.enable_merchant_reputation:
            reputation_risk = self._analyze_merchant_reputation(merchant_profile)
            risk_score += reputation_risk
        
        # Update merchant profile
        self._update_merchant_profile(merchant_id, transaction)
        
        return max(0, min(risk_score, 1.0))
    
    def _get_or_create_merchant_profile(self, merchant_id: str, category: str, transaction: Transaction) -> MerchantProfile:
        """Get or create merchant profile."""
        profile = self.merchant_profiles.get(merchant_id)
        
        if not profile:
            profile = MerchantProfile(
                merchant_id=merchant_id,
                merchant_name=transaction.metadata.get('merchant_name') if transaction.metadata else None,
                category=category,
                risk_score=0.0,
                transaction_count=0,
                total_amount=0.0,
                average_amount=0.0,
                first_seen=datetime.now(),
                last_seen=datetime.now(),
                is_trusted=merchant_id in self.config.trusted_merchants,
                is_suspicious=merchant_id in self.config.suspicious_merchants,
                user_count=0,
                unique_users=set()
            )
            
            self.merchant_profiles[merchant_id] = profile
        
        return profile
    
    def _analyze_category_risk(self, category: str, merchant_profile: MerchantProfile) -> float:
        """Analyze category-based risk."""
        # Check if category is high risk
        if category in self.config.high_risk_categories:
            return 0.6
        
        # Check category-specific risk score
        category_risk = self.config.category_risk_scores.get(category, 0.0)
        
        # Check category transaction patterns
        category_stats = self.category_stats.get(category)
        if category_stats:
            avg_amount = category_stats['total_amount'] / max(category_stats['count'], 1)
            current_avg = merchant_profile.total_amount / max(merchant_profile.transaction_count, 1)
            
            # If merchant's average is significantly higher than category average
            if current_avg > avg_amount * 2:
                return 0.3
        
        return category_risk
    
    def _analyze_merchant_velocity(self, merchant_id: str, transaction: Transaction) -> float:
        """Analyze merchant velocity risk."""
        profile = self.merchant_profiles.get(merchant_id)
        if not profile:
            return 0.0
        
        time_window_seconds = self.config.merchant_velocity_window * 60
        now = datetime.now()
        
        if profile.first_seen:
            time_diff = (now - profile.first_seen).total_seconds()
            if time_diff < time_window_seconds:
                velocity = profile.transaction_count / (time_diff / 60)  # Transactions per minute
                
                if velocity > self.config.max_transactions_per_merchant:
                    return 0.5  # High velocity risk
                elif velocity > self.config.max_transactions_per_merchant * 0.7:
                    return 0.2  # Medium velocity risk
        
        return 0.0
    
    def _analyze_merchant_patterns(self, user_id: str, merchant_id: str, category: str) -> float:
        """Analyze merchant usage patterns."""
        risk_score = 0.0
        
        # Check if user has transacted with this merchant before
        user_merchants = self.user_merchants.get(user_id, set())
        if merchant_id not in user_merchants:
            risk_score += 0.2  # New merchant for user
        
        # Check for category switching patterns
        user_categories = self._get_user_categories(user_id)
        if user_categories and category not in user_categories:
            risk_score += 0.1  # New category for user
        
        # Check for unusual merchant combinations
        recent_merchants = self._get_recent_user_merchants(user_id, 24 * 60)  # Last 24 hours
        if len(recent_merchants) > 5:
            risk_score += 0.3  # Too many different merchants
        
        return risk_score
    
    def _analyze_merchant_reputation(self, profile: MerchantProfile) -> float:
        """Analyze merchant reputation risk."""
        risk_score = 0.0
        
        # Check transaction count (too few transactions might be suspicious)
        if profile.transaction_count < 5:
            risk_score += 0.2
        
        # Check user diversity (merchants with only one user might be suspicious)
        if profile.user_count < 3:
            risk_score += 0.1
        
        # Check amount consistency (simplified)
        if profile.transaction_count > 10:
            # This would require storing individual amounts for proper variance calculation
            # For now, use a simplified approach
            if profile.average_amount > 0:
                # High variance in amounts could indicate suspicious activity
                risk_score += 0.1
        
        return risk_score
    
    def _update_merchant_profile(self, merchant_id: str, transaction: Transaction) -> None:
        """Update merchant profile with new transaction."""
        profile = self.merchant_profiles.get(merchant_id)
        if not profile:
            return
        
        profile.transaction_count += 1
        profile.total_amount += transaction.amount
        profile.average_amount = profile.total_amount / profile.transaction_count
        profile.last_seen = datetime.now()
        
        # Add user to unique users
        profile.unique_users.add(transaction.user_id)
        profile.user_count = len(profile.unique_users)
        
        # Update category stats
        category = transaction.merchant_category or 'unknown'
        if category not in self.category_stats:
            self.category_stats[category] = {'count': 0, 'total_amount': 0.0}
        
        self.category_stats[category]['count'] += 1
        self.category_stats[category]['total_amount'] += transaction.amount
        
        # Update user merchants
        if transaction.user_id not in self.user_merchants:
            self.user_merchants[transaction.user_id] = set()
        self.user_merchants[transaction.user_id].add(merchant_id)
    
    def _get_user_categories(self, user_id: str) -> List[str]:
        """Get categories used by user."""
        user_merchants = self.user_merchants.get(user_id, set())
        categories = set()
        
        for merchant_id in user_merchants:
            profile = self.merchant_profiles.get(merchant_id)
            if profile:
                categories.add(profile.category)
        
        return list(categories)
    
    def _get_recent_user_merchants(self, user_id: str, time_window_minutes: int) -> List[str]:
        """Get recent merchants for user."""
        user_merchants = self.user_merchants.get(user_id, set())
        cutoff_time = time.time() - (time_window_minutes * 60)
        
        recent_merchants = []
        for merchant_id in user_merchants:
            profile = self.merchant_profiles.get(merchant_id)
            if profile and profile.last_seen:
                if profile.last_seen.timestamp() > cutoff_time:
                    recent_merchants.append(merchant_id)
        
        return recent_merchants
    
    # Utility methods
    def get_merchant_profile(self, merchant_id: str) -> Optional[MerchantProfile]:
        """Get merchant profile by ID."""
        return self.merchant_profiles.get(merchant_id)
    
    def get_user_merchants(self, user_id: str) -> List[str]:
        """Get merchants used by user."""
        return list(self.user_merchants.get(user_id, set()))
    
    def get_category_stats(self, category: str) -> Optional[Dict[str, float]]:
        """Get statistics for category."""
        return self.category_stats.get(category)
    
    def mark_merchant_as_trusted(self, merchant_id: str) -> None:
        """Mark merchant as trusted."""
        profile = self.merchant_profiles.get(merchant_id)
        if profile:
            profile.is_trusted = True
            profile.is_suspicious = False
    
    def mark_merchant_as_suspicious(self, merchant_id: str) -> None:
        """Mark merchant as suspicious."""
        profile = self.merchant_profiles.get(merchant_id)
        if profile:
            profile.is_suspicious = True
            profile.is_trusted = False
    
    def get_top_merchants_by_volume(self, limit: int = 10) -> List[MerchantProfile]:
        """Get top merchants by transaction volume."""
        return sorted(
            self.merchant_profiles.values(),
            key=lambda x: x.total_amount,
            reverse=True
        )[:limit]
    
    def get_riskiest_merchants(self, limit: int = 10) -> List[MerchantProfile]:
        """Get riskiest merchants."""
        return sorted(
            [p for p in self.merchant_profiles.values() if p.risk_score > 0.5],
            key=lambda x: x.risk_score,
            reverse=True
        )[:limit]
