package fraudcatcher

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLocationAlgorithm(t *testing.T) {
	config := Config{
		Rules:           []string{"location"},
		Thresholds:      map[string]float64{"location": 0.7},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test normal location transaction
	transaction := Transaction{
		ID:        "tx_001",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: time.Now(),
		Location: &Location{
			Lat:     40.7128,
			Lng:     -74.0060,
			Country: "US",
			City:    "New York",
		},
	}

	result, err := detector.Analyze(transaction)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.GreaterOrEqual(t, result.RiskScore, 0.0)

	// Test impossible travel
	impossibleTravelTransaction := Transaction{
		ID:        "tx_002",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: time.Now().Add(1 * time.Minute), // 1 minute later
		Location: &Location{
			Lat:     51.5074, // London
			Lng:     -0.1278,
			Country: "GB",
			City:    "London",
		},
	}

	result, err = detector.Analyze(impossibleTravelTransaction)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, result.RiskScore, 0.5) // Should be high risk for impossible travel
}

func TestDeviceAlgorithm(t *testing.T) {
	config := Config{
		Rules:           []string{"device"},
		Thresholds:      map[string]float64{"device": 0.5},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test new device transaction
	transaction := Transaction{
		ID:        "tx_001",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: time.Now(),
		DeviceID:  "device_001",
		UserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		IPAddress: "192.168.1.100",
	}

	result, err := detector.Analyze(transaction)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, result.RiskScore, 0.0) // Should have some risk for new device

	// Test device fingerprint change
	changedDeviceTransaction := Transaction{
		ID:        "tx_002",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: time.Now().Add(1 * time.Minute),
		DeviceID:  "device_001",
		UserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", // Different user agent
		IPAddress: "192.168.1.101",                                                      // Different IP
	}

	result, err = detector.Analyze(changedDeviceTransaction)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, result.RiskScore, 0.0) // Should have risk for device changes
}

func TestBehavioralAlgorithm(t *testing.T) {
	config := Config{
		Rules:           []string{"behavioral"},
		Thresholds:      map[string]float64{"behavioral": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test normal transaction
	transaction := Transaction{
		ID:        "tx_001",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: time.Now(),
		Location: &Location{
			Lat:     40.7128,
			Lng:     -74.0060,
			Country: "US",
		},
		DeviceID:      "device_001",
		UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		IPAddress:     "192.168.1.100",
		MerchantID:    "merchant_001",
		Category:      "retail",
		PaymentMethod: "credit_card",
	}

	result, err := detector.Analyze(transaction)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.GreaterOrEqual(t, result.RiskScore, 0.0)

	// Test high amount transaction (should trigger spending anomaly)
	highAmountTransaction := Transaction{
		ID:        "tx_002",
		UserID:    "user_001",
		Amount:    50000.0, // Very high amount
		Currency:  "USD",
		Timestamp: time.Now().Add(1 * time.Minute),
		Location: &Location{
			Lat:     40.7128,
			Lng:     -74.0060,
			Country: "US",
		},
		DeviceID:      "device_001",
		UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		IPAddress:     "192.168.1.100",
		MerchantID:    "merchant_001",
		Category:      "retail",
		PaymentMethod: "credit_card",
	}

	result, err = detector.Analyze(highAmountTransaction)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, result.RiskScore, 0.0) // Should have risk for high amount
}

func TestAllAlgorithmsIntegration(t *testing.T) {
	config := Config{
		Rules: []string{"amount", "time", "location", "device", "behavioral"},
		Thresholds: map[string]float64{
			"amount":     0.8,
			"time":       0.6,
			"location":   0.7,
			"device":     0.5,
			"behavioral": 0.6,
		},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test comprehensive transaction
	transaction := Transaction{
		ID:        "tx_comprehensive",
		UserID:    "user_001",
		Amount:    1000.0,
		Currency:  "USD",
		Timestamp: time.Date(2023, 1, 15, 3, 0, 0, 0, time.UTC), // 3:00 AM (suspicious time)
		Location: &Location{
			Lat:     40.7128,
			Lng:     -74.0060,
			Country: "US",
			City:    "New York",
		},
		DeviceID:      "device_001",
		UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		IPAddress:     "192.168.1.100",
		MerchantID:    "merchant_001",
		Category:      "retail",
		PaymentMethod: "credit_card",
	}

	result, err := detector.Analyze(transaction)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.GreaterOrEqual(t, result.RiskScore, 0.0)
	assert.LessOrEqual(t, result.RiskScore, 1.0)

	// Check that all algorithms contributed to the score
	assert.NotNil(t, result.AlgorithmScores)
	assert.Contains(t, result.AlgorithmScores, "amount")
	assert.Contains(t, result.AlgorithmScores, "time")
	assert.Contains(t, result.AlgorithmScores, "location")
	assert.Contains(t, result.AlgorithmScores, "device")
	assert.Contains(t, result.AlgorithmScores, "behavioral")

	// Check that reasons were generated
	assert.NotEmpty(t, result.Reasons)

	// Check that recommendations were generated
	assert.NotEmpty(t, result.Recommendations)
}

func TestAlgorithmManagement(t *testing.T) {
	config := Config{
		Rules:           []string{"amount", "time", "location", "device", "behavioral"},
		Thresholds:      map[string]float64{"amount": 0.8, "time": 0.6, "location": 0.7, "device": 0.5, "behavioral": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test getting all algorithms
	enabledAlgs := detector.GetEnabledAlgorithms()
	assert.Len(t, enabledAlgs, 5) // All 5 algorithms should be enabled

	// Test disabling an algorithm
	detector.DisableAlgorithm("time")
	enabledAlgs = detector.GetEnabledAlgorithms()
	assert.Len(t, enabledAlgs, 4) // Should be 4 after disabling time

	// Test re-enabling an algorithm
	detector.EnableAlgorithm("time")
	enabledAlgs = detector.GetEnabledAlgorithms()
	assert.Len(t, enabledAlgs, 5) // Should be 5 again

	// Test getting specific algorithm
	amountAlg, exists := detector.GetAlgorithm("amount")
	assert.True(t, exists)
	assert.NotNil(t, amountAlg)
	assert.Equal(t, "amount", amountAlg.GetName())

	// Test getting non-existent algorithm
	nonExistentAlg, exists := detector.GetAlgorithm("non_existent")
	assert.False(t, exists)
	assert.Nil(t, nonExistentAlg)
}

func TestUserProfiling(t *testing.T) {
	config := Config{
		Rules:           []string{"behavioral"},
		Thresholds:      map[string]float64{"behavioral": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	userID := "user_profile_test"

	// Process multiple transactions for the same user
	for i := 0; i < 10; i++ {
		transaction := Transaction{
			ID:        fmt.Sprintf("tx_%d", i),
			UserID:    userID,
			Amount:    100.0 + float64(i*10), // Increasing amounts
			Currency:  "USD",
			Timestamp: time.Now().Add(time.Duration(i) * time.Hour),
			Location: &Location{
				Lat:     40.7128,
				Lng:     -74.0060,
				Country: "US",
			},
			DeviceID:      "device_001",
			UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			IPAddress:     "192.168.1.100",
			MerchantID:    "merchant_001",
			Category:      "retail",
			PaymentMethod: "credit_card",
		}

		result, err := detector.Analyze(transaction)
		require.NoError(t, err)
		assert.NotNil(t, result)
	}

	// Get user profile
	profile := detector.GetUserProfile(userID)
	assert.NotNil(t, profile)
	assert.Equal(t, userID, profile.UserID)
	assert.Equal(t, 10, profile.TransactionCount)
	assert.Greater(t, profile.TotalAmount, 0.0)
	assert.Greater(t, profile.AverageAmount, 0.0)
}

func TestConcurrentAccess(t *testing.T) {
	config := Config{
		Rules:           []string{"amount", "time", "location", "device", "behavioral"},
		Thresholds:      map[string]float64{"amount": 0.8, "time": 0.6, "location": 0.7, "device": 0.5, "behavioral": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test concurrent access
	done := make(chan bool, 20)

	for i := 0; i < 20; i++ {
		go func(i int) {
			transaction := Transaction{
				ID:        fmt.Sprintf("tx_%d", i),
				UserID:    fmt.Sprintf("user_%d", i%5), // 5 different users
				Amount:    100.0 + float64(i),
				Currency:  "USD",
				Timestamp: time.Now(),
				Location: &Location{
					Lat:     40.7128 + float64(i%10)*0.01,
					Lng:     -74.0060 + float64(i%10)*0.01,
					Country: "US",
				},
				DeviceID:      fmt.Sprintf("device_%d", i%3), // 3 different devices
				UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				IPAddress:     fmt.Sprintf("192.168.1.%d", 100+i%10),
				MerchantID:    fmt.Sprintf("merchant_%d", i%5),
				Category:      "retail",
				PaymentMethod: "credit_card",
			}

			_, err := detector.Analyze(transaction)
			assert.NoError(t, err)
			done <- true
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 20; i++ {
		<-done
	}

	// Verify all transactions were processed
	metrics := detector.GetMetrics()
	assert.Equal(t, int64(20), metrics.TransactionsProcessed)
}

func TestPerformance(t *testing.T) {
	config := Config{
		Rules:           []string{"amount", "time", "location", "device", "behavioral"},
		Thresholds:      map[string]float64{"amount": 0.8, "time": 0.6, "location": 0.7, "device": 0.5, "behavioral": 0.6},
		GlobalThreshold: 0.7,
		EnableLogging:   false,
	}

	detector := NewFraudDetector(config)

	// Test performance with many transactions
	start := time.Now()
	transactionCount := 1000

	for i := 0; i < transactionCount; i++ {
		transaction := Transaction{
			ID:        fmt.Sprintf("tx_%d", i),
			UserID:    fmt.Sprintf("user_%d", i%100), // 100 different users
			Amount:    100.0 + float64(i%1000),
			Currency:  "USD",
			Timestamp: time.Now(),
			Location: &Location{
				Lat:     40.7128 + float64(i%100)*0.01,
				Lng:     -74.0060 + float64(i%100)*0.01,
				Country: "US",
			},
			DeviceID:      fmt.Sprintf("device_%d", i%50), // 50 different devices
			UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			IPAddress:     fmt.Sprintf("192.168.1.%d", 100+i%50),
			MerchantID:    fmt.Sprintf("merchant_%d", i%20),
			Category:      "retail",
			PaymentMethod: "credit_card",
		}

		_, err := detector.Analyze(transaction)
		require.NoError(t, err)
	}

	elapsed := time.Since(start)
	avgTime := elapsed / time.Duration(transactionCount)

	// Should process transactions very quickly
	assert.Less(t, avgTime, 10*time.Millisecond, "Average processing time should be less than 10ms")

	// Verify all transactions were processed
	metrics := detector.GetMetrics()
	assert.Equal(t, int64(transactionCount), metrics.TransactionsProcessed)
	assert.Less(t, metrics.AverageResponseTime, 0.01) // Less than 10ms average
}
