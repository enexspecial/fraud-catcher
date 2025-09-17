#!/usr/bin/env python3
"""
Example usage of the FraudCatcher Python package.
"""

import asyncio
from datetime import datetime
from fraud_catcher import FraudDetector, Transaction, Location

async def main():
    # Initialize the fraud detector
    detector = FraudDetector({
        'rules': ['velocity', 'amount', 'location'],
        'thresholds': {
            'velocity': 0.8,
            'amount': 0.9,
            'location': 0.7
        },
        'global_threshold': 0.7,
        'enable_logging': True
    })
    
    # Example transaction
    transaction = Transaction(
        id='tx_123456',
        user_id='user_789',
        amount=1500.0,
        currency='USD',
        timestamp=datetime.now(),
        location=Location(
            lat=40.7128,
            lng=-74.0060,
            country='US',
            city='New York',
            state='NY'
        ),
        merchant_id='merchant_456',
        merchant_category='electronics',
        payment_method='credit_card',
        device_id='device_123',
        ip_address='192.168.1.1',
        user_agent='Mozilla/5.0...',
        metadata={
            'card_last4': '1234',
            'card_type': 'visa'
        }
    )
    
    # Analyze the transaction
    try:
        print('Analyzing transaction...')
        result = await detector.analyze(transaction)
        
        print('\n=== Fraud Analysis Results ===')
        print(f'Transaction ID: {result.transaction_id}')
        print(f'Risk Score: {result.risk_score:.3f}')
        print(f'Is Fraudulent: {result.is_fraudulent}')
        print(f'Confidence: {result.confidence:.3f}')
        print(f'Triggered Rules: {", ".join(result.triggered_rules)}')
        print(f'Processing Time: {result.details["processing_time"]:.2f}ms')
        
        if result.recommendations:
            print('\n=== Recommendations ===')
            for i, rec in enumerate(result.recommendations, 1):
                print(f'{i}. {rec}')
        
        # Get velocity stats
        velocity_stats = detector.get_velocity_stats('user_789', 60)
        print('\n=== Velocity Statistics ===')
        print(f'Transactions in last 60 minutes: {velocity_stats["count"]}')
        print(f'Total amount in last 60 minutes: ${velocity_stats["total_amount"]:.2f}')
        
        # Check if amount is suspicious
        is_suspicious = detector.is_suspicious_amount(1500.0, 'USD')
        print(f'\nIs $1500 suspicious? {is_suspicious}')
        
    except Exception as error:
        print(f'Error analyzing transaction: {error}')

if __name__ == '__main__':
    asyncio.run(main())
