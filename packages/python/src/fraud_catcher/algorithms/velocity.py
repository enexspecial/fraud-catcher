"""
Velocity-based fraud detection algorithm.
"""

import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
from ..models import Transaction, DetectionRule


@dataclass
class VelocityConfig:
    """Configuration for velocity algorithm."""
    time_window: int  # in minutes
    max_transactions: int
    max_amount: float


class VelocityAlgorithm:
    """Detects fraud based on transaction velocity patterns."""
    
    def __init__(self, config: VelocityConfig):
        self.config = config
        self.transaction_history: Dict[str, List[Transaction]] = {}
    
    async def analyze(self, transaction: Transaction, rule: DetectionRule) -> float:
        """Analyze transaction for velocity-based fraud patterns."""
        user_id = transaction.user_id
        now = transaction.timestamp if isinstance(transaction.timestamp, datetime) else datetime.now()
        time_window_ms = self.config.time_window * 60 * 1000  # Convert to milliseconds
        
        # Get user's transaction history
        user_history = self.transaction_history.get(user_id, [])
        
        # Filter transactions within the time window
        recent_transactions = [
            tx for tx in user_history
            if (now - tx.timestamp).total_seconds() * 1000 <= time_window_ms
        ]
        
        # Calculate velocity metrics
        transaction_count = len(recent_transactions) + 1  # +1 for current transaction
        total_amount = sum(tx.amount for tx in recent_transactions) + transaction.amount
        
        # Calculate risk scores
        count_risk = min(transaction_count / self.config.max_transactions, 1.0)
        amount_risk = min(total_amount / self.config.max_amount, 1.0)
        
        # Combine risk scores with equal weight
        velocity_score = (count_risk + amount_risk) / 2
        
        # Store current transaction
        self._add_transaction(transaction)
        
        return min(velocity_score, 1.0)
    
    def _add_transaction(self, transaction: Transaction) -> None:
        """Add transaction to user's history."""
        user_id = transaction.user_id
        if user_id not in self.transaction_history:
            self.transaction_history[user_id] = []
        
        self.transaction_history[user_id].append(transaction)
        
        # Keep only recent transactions to manage memory
        cutoff_time = time.time() - (self.config.time_window * 60)
        self.transaction_history[user_id] = [
            tx for tx in self.transaction_history[user_id]
            if tx.timestamp.timestamp() > cutoff_time
        ]
    
    def get_transaction_count(self, user_id: str, time_window_minutes: int = 60) -> int:
        """Get transaction count for user within time window."""
        user_history = self.transaction_history.get(user_id, [])
        cutoff_time = time.time() - (time_window_minutes * 60)
        
        return len([
            tx for tx in user_history
            if tx.timestamp.timestamp() > cutoff_time
        ])
    
    def get_total_amount(self, user_id: str, time_window_minutes: int = 60) -> float:
        """Get total amount for user within time window."""
        user_history = self.transaction_history.get(user_id, [])
        cutoff_time = time.time() - (time_window_minutes * 60)
        
        return sum(
            tx.amount for tx in user_history
            if tx.timestamp.timestamp() > cutoff_time
        )
