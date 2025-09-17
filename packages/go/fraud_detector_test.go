package fraudcatcher

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewFraudDetector(t *testing.T) {
	config := Config{
		Rules:           []string{"amount", "time"},
		Thresholds:      map[string]float64{"amount": 0.8, "time": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   true,
	}

	detector := NewFraudDetector(config)

	assert.NotNil(t, detector)
	assert.Equal(t, config.GlobalThreshold, detector.config.GlobalThreshold)
	assert.NotNil(t, detector.algorithmManager)
	assert.NotNil(t, detector.userProfiles)
	assert.NotNil(t, detector.metrics)
}

func TestAnalyzeTransaction(t *testing.T) {
	config := Config{
		Rules:           []string{"amount", "time"},
		Thresholds:      map[string]float64{"amount": 0.8, "time": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	transaction := Transaction{
		ID:        "tx_001",
		UserID:    "user_001",
		Amount:    1500.0,
		Currency:  "USD",
		Timestamp: time.Now(),
		Location: &Location{
			Lat:     40.7128,
			Lng:     -74.0060,
			Country: "US",
		},
	}

	result, err := detector.Analyze(transaction)

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, transaction.ID, result.TransactionID)
	assert.GreaterOrEqual(t, result.RiskScore, 0.0)
	assert.LessOrEqual(t, result.RiskScore, 1.0)
	assert.NotNil(t, result.AlgorithmScores)
	assert.NotNil(t, result.Reasons)
	assert.NotNil(t, result.Recommendations)
}

func TestAnalyzeHighAmountTransaction(t *testing.T) {
	config := Config{
		Rules:           []string{"amount"},
		Thresholds:      map[string]float64{"amount": 0.8},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// High amount transaction
	transaction := Transaction{
		ID:        "tx_high",
		UserID:    "user_001",
		Amount:    10000.0, // High amount
		Currency:  "USD",
		Timestamp: time.Now(),
	}

	result, err := detector.Analyze(transaction)

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, result.RiskScore, 0.5) // Should be high risk
	assert.True(t, result.IsFraud)           // Should be flagged as fraud
}

func TestAnalyzeSuspiciousTimeTransaction(t *testing.T) {
	config := Config{
		Rules:           []string{"time"},
		Thresholds:      map[string]float64{"time": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Transaction at suspicious time (3 AM)
	suspiciousTime := time.Date(2023, 1, 1, 3, 0, 0, 0, time.UTC)
	transaction := Transaction{
		ID:        "tx_suspicious_time",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: suspiciousTime,
	}

	result, err := detector.Analyze(transaction)

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, result.RiskScore, 0.3) // Should have some risk
}

func TestUserProfileCreation(t *testing.T) {
	config := Config{
		Rules:           []string{"amount"},
		Thresholds:      map[string]float64{"amount": 0.8},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// First transaction should create user profile
	transaction := Transaction{
		ID:        "tx_001",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: time.Now(),
	}

	_, err := detector.Analyze(transaction)
	require.NoError(t, err)

	profile := detector.GetUserProfile("user_001")
	assert.NotNil(t, profile)
	assert.Equal(t, "user_001", profile.UserID)
	assert.Equal(t, 1, profile.TransactionCount)
	assert.Equal(t, 100.0, profile.TotalAmount)
	assert.Equal(t, 100.0, profile.AverageAmount)
}

func TestUserProfileUpdate(t *testing.T) {
	config := Config{
		Rules:           []string{"amount"},
		Thresholds:      map[string]float64{"amount": 0.8},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// First transaction
	transaction1 := Transaction{
		ID:        "tx_001",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: time.Now(),
	}

	_, err := detector.Analyze(transaction1)
	require.NoError(t, err)

	// Second transaction
	transaction2 := Transaction{
		ID:        "tx_002",
		UserID:    "user_001",
		Amount:    200.0,
		Currency:  "USD",
		Timestamp: time.Now(),
	}

	_, err = detector.Analyze(transaction2)
	require.NoError(t, err)

	profile := detector.GetUserProfile("user_001")
	assert.NotNil(t, profile)
	assert.Equal(t, 2, profile.TransactionCount)
	assert.Equal(t, 300.0, profile.TotalAmount)
	assert.Equal(t, 150.0, profile.AverageAmount)
}

func TestMetrics(t *testing.T) {
	config := Config{
		Rules:           []string{"amount"},
		Thresholds:      map[string]float64{"amount": 0.8},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Process some transactions
	for i := 0; i < 5; i++ {
		transaction := Transaction{
			ID:        fmt.Sprintf("tx_%d", i),
			UserID:    "user_001",
			Amount:    100.0,
			Currency:  "USD",
			Timestamp: time.Now(),
		}

		_, err := detector.Analyze(transaction)
		require.NoError(t, err)
	}

	metrics := detector.GetMetrics()
	assert.NotNil(t, metrics)
	assert.Equal(t, int64(5), metrics.TransactionsProcessed)
	assert.Greater(t, metrics.AverageResponseTime, 0.0)
}

func TestFalsePositiveMarking(t *testing.T) {
	config := Config{
		Rules:           []string{"amount"},
		Thresholds:      map[string]float64{"amount": 0.8},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	err := detector.MarkFalsePositive("tx_001")
	assert.NoError(t, err)

	metrics := detector.GetMetrics()
	assert.Equal(t, int64(1), metrics.FalsePositives)
}

func TestFalseNegativeMarking(t *testing.T) {
	config := Config{
		Rules:           []string{"amount"},
		Thresholds:      map[string]float64{"amount": 0.8},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	err := detector.MarkFalseNegative("tx_001")
	assert.NoError(t, err)

	metrics := detector.GetMetrics()
	assert.Equal(t, int64(1), metrics.FalseNegatives)
}

func TestAlgorithmManagement(t *testing.T) {
	config := Config{
		Rules:           []string{"amount", "time"},
		Thresholds:      map[string]float64{"amount": 0.8, "time": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test getting algorithms
	amountAlg, exists := detector.GetAlgorithm("amount")
	assert.True(t, exists)
	assert.NotNil(t, amountAlg)

	timeAlg, exists := detector.GetAlgorithm("time")
	assert.True(t, exists)
	assert.NotNil(t, timeAlg)

	// Test enabling/disabling algorithms
	detector.DisableAlgorithm("time")
	enabledAlgs := detector.GetEnabledAlgorithms()
	assert.Len(t, enabledAlgs, 1) // Only amount should be enabled

	detector.EnableAlgorithm("time")
	enabledAlgs = detector.GetEnabledAlgorithms()
	assert.Len(t, enabledAlgs, 2) // Both should be enabled
}

func TestReset(t *testing.T) {
	config := Config{
		Rules:           []string{"amount"},
		Thresholds:      map[string]float64{"amount": 0.8},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Process some transactions
	transaction := Transaction{
		ID:        "tx_001",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: time.Now(),
	}

	_, err := detector.Analyze(transaction)
	require.NoError(t, err)

	// Reset
	err = detector.Reset()
	assert.NoError(t, err)

	// Check that everything is reset
	profile := detector.GetUserProfile("user_001")
	assert.Nil(t, profile)

	metrics := detector.GetMetrics()
	assert.Equal(t, int64(0), metrics.TransactionsProcessed)
}

func TestGetStats(t *testing.T) {
	config := Config{
		Rules:           []string{"amount", "time"},
		Thresholds:      map[string]float64{"amount": 0.8, "time": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	stats := detector.GetStats()
	assert.NotNil(t, stats)
	assert.Contains(t, stats, "user_profiles_count")
	assert.Contains(t, stats, "enabled_algorithms")
	assert.Contains(t, stats, "total_algorithms")
	assert.Contains(t, stats, "metrics")
	assert.Contains(t, stats, "config")
	assert.Contains(t, stats, "algorithms")
}

func TestInvalidTransaction(t *testing.T) {
	config := Config{
		Rules:           []string{"amount"},
		Thresholds:      map[string]float64{"amount": 0.8},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test empty transaction ID
	transaction := Transaction{
		UserID:   "user_001",
		Amount:   100.0,
		Currency: "USD",
	}

	_, err := detector.Analyze(transaction)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "transaction ID is required")

	// Test empty user ID
	transaction = Transaction{
		ID:       "tx_001",
		Amount:   100.0,
		Currency: "USD",
	}

	_, err = detector.Analyze(transaction)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "user ID is required")

	// Test negative amount
	transaction = Transaction{
		ID:       "tx_001",
		UserID:   "user_001",
		Amount:   -100.0,
		Currency: "USD",
	}

	_, err = detector.Analyze(transaction)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "amount must be positive")
}

func TestConcurrentAccess(t *testing.T) {
	config := Config{
		Rules:           []string{"amount"},
		Thresholds:      map[string]float64{"amount": 0.8},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test concurrent access
	done := make(chan bool, 10)

	for i := 0; i < 10; i++ {
		go func(i int) {
			transaction := Transaction{
				ID:        fmt.Sprintf("tx_%d", i),
				UserID:    fmt.Sprintf("user_%d", i),
				Amount:    100.0,
				Currency:  "USD",
				Timestamp: time.Now(),
			}

			_, err := detector.Analyze(transaction)
			assert.NoError(t, err)
			done <- true
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}

	// Verify all transactions were processed
	metrics := detector.GetMetrics()
	assert.Equal(t, int64(10), metrics.TransactionsProcessed)
}
