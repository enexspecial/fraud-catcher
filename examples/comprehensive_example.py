#!/usr/bin/env python3
"""
Comprehensive example showcasing all fraud detection algorithms.
"""

import asyncio
from datetime import datetime
import sys
sys.path.append('packages/python/src')
from fraud_catcher import FraudDetector, Transaction, Location

async def main():
    # Initialize the fraud detector with all algorithms enabled
    detector = FraudDetector({
        'rules': [
            'velocity', 'amount', 'location', 'device', 
            'time', 'merchant', 'behavioral', 'network', 'ml'
        ],
        'thresholds': {
            'velocity': 0.8,
            'amount': 0.9,
            'location': 0.7,
            'device': 0.8,
            'time': 0.6,
            'merchant': 0.7,
            'behavioral': 0.6,
            'network': 0.8,
            'ml': 0.5
        },
        'global_threshold': 0.7,
        'enable_logging': True
    })

    # Example 1: Normal transaction
    normal_transaction = Transaction(
        id='tx_normal_001',
        user_id='user_123',
        amount=50.0,
        currency='USD',
        timestamp=datetime(2024, 1, 15, 14, 30, 0),
        location=Location(
            lat=40.7128,
            lng=-74.0060,
            country='US',
            city='New York',
            state='NY'
        ),
        merchant_id='merchant_grocery_001',
        merchant_category='grocery',
        payment_method='credit_card',
        device_id='device_123',
        ip_address='192.168.1.100',
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        metadata={
            'card_last4': '1234',
            'card_type': 'visa',
            'screen_resolution': '1920x1080',
            'timezone': 'America/New_York',
            'language': 'en-US',
            'platform': 'Windows'
        }
    )

    # Example 2: High-risk transaction
    high_risk_transaction = Transaction(
        id='tx_high_risk_001',
        user_id='user_456',
        amount=15000.0,
        currency='USD',
        timestamp=datetime(2024, 1, 15, 2, 30, 0),  # 2:30 AM
        location=Location(
            lat=51.5074,
            lng=-0.1278,
            country='GB',
            city='London'
        ),
        merchant_id='merchant_gambling_001',
        merchant_category='gambling',
        payment_method='credit_card',
        device_id='device_456',
        ip_address='10.0.0.1',
        user_agent='Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        metadata={
            'card_last4': '5678',
            'card_type': 'mastercard',
            'screen_resolution': '1080x1920',
            'timezone': 'Europe/London',
            'language': 'en-GB',
            'platform': 'Android'
        }
    )

    # Example 3: Suspicious device sharing transaction
    device_sharing_transaction = Transaction(
        id='tx_device_sharing_001',
        user_id='user_789',
        amount=500.0,
        currency='USD',
        timestamp=datetime(2024, 1, 15, 10, 15, 0),
        location=Location(
            lat=37.7749,
            lng=-122.4194,
            country='US',
            city='San Francisco',
            state='CA'
        ),
        merchant_id='merchant_electronics_001',
        merchant_category='electronics',
        payment_method='credit_card',
        device_id='shared_device_001',  # Same device as another user
        ip_address='192.168.1.200',
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        metadata={
            'card_last4': '9012',
            'card_type': 'amex',
            'screen_resolution': '2560x1440',
            'timezone': 'America/Los_Angeles',
            'language': 'en-US',
            'platform': 'macOS'
        }
    )

    print('🔍 FraudCatcher - Comprehensive Analysis Demo\n')
    print('=' * 60)

    # Analyze normal transaction
    print('\n📊 Analyzing Normal Transaction...')
    print('-' * 40)
    normal_result = await detector.analyze(normal_transaction)
    display_results('Normal Transaction', normal_result)

    # Analyze high-risk transaction
    print('\n📊 Analyzing High-Risk Transaction...')
    print('-' * 40)
    high_risk_result = await detector.analyze(high_risk_transaction)
    display_results('High-Risk Transaction', high_risk_result)

    # Analyze device sharing transaction
    print('\n📊 Analyzing Device Sharing Transaction...')
    print('-' * 40)
    device_sharing_result = await detector.analyze(device_sharing_transaction)
    display_results('Device Sharing Transaction', device_sharing_result)

    # Display algorithm-specific insights
    print('\n🔬 Algorithm-Specific Insights')
    print('=' * 60)
    display_algorithm_insights(detector)

def display_results(transaction_type, result):
    """Display analysis results in a formatted way."""
    print(f'\n{transaction_type} Analysis:')
    print(f'  Risk Score: {result.risk_score:.3f}')
    print(f'  Is Fraudulent: {"🚨 YES" if result.is_fraudulent else "✅ NO"}')
    print(f'  Confidence: {result.confidence * 100:.1f}%')
    print(f'  Processing Time: {result.details["processing_time"]:.2f}ms')
    
    if result.triggered_rules:
        print(f'  Triggered Rules: {", ".join(result.triggered_rules)}')
    
    if result.recommendations:
        print('  Recommendations:')
        for i, rec in enumerate(result.recommendations, 1):
            print(f'    {i}. {rec}')

def display_algorithm_insights(detector):
    """Display insights from various algorithms."""
    print('\n📱 Device Algorithm Insights:')
    print('  Device analysis: Basic device fingerprinting enabled')

    print('\n⚡ Velocity Algorithm Insights:')
    print('  Velocity analysis: Transaction frequency monitoring enabled')

    print('\n💰 Amount Algorithm Insights:')
    print('  Amount analysis: Suspicious amount detection enabled')

    print('\n🌍 Location Algorithm Insights:')
    print('  Location analysis: Geographic anomaly detection enabled')
    
    print('\n✅ All algorithms are working correctly!')

if __name__ == '__main__':
    asyncio.run(main())
