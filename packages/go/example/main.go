package main

import (
	"fmt"
	"log"
	"time"

	fraudcatcher "github.com/fraud-catcher/go"
)

func main() {
	// Create fraud detector configuration
	config := fraudcatcher.Config{
		Rules: []string{"amount", "time", "location"},
		Thresholds: map[string]float64{
			"amount":   0.8,
			"time":     0.6,
			"location": 0.7,
		},
		GlobalThreshold:      0.7,
		EnableLogging:        true,
		MaxUserProfiles:      10000,
		ProfileRetentionDays: 30,
		CacheEnabled:         true,
		CacheTTL:             time.Hour,
		CacheMaxSize:         1000,
	}

	// Create fraud detector
	detector := fraudcatcher.NewFraudDetector(config)
	fmt.Println("Fraud Detector initialized successfully!")

	// Example 1: Normal transaction
	fmt.Println("\n=== Example 1: Normal Transaction ===")
	normalTransaction := fraudcatcher.Transaction{
		ID:        "tx_001",
		UserID:    "user_001",
		Amount:    100.0,
		Currency:  "USD",
		Timestamp: time.Date(2023, 1, 15, 14, 30, 0, 0, time.UTC), // 2:30 PM
		Location: &fraudcatcher.Location{
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

	result, err := detector.Analyze(normalTransaction)
	if err != nil {
		log.Fatalf("Error analyzing transaction: %v", err)
	}

	printResult("Normal Transaction", result)

	// Example 2: High amount transaction
	fmt.Println("\n=== Example 2: High Amount Transaction ===")
	highAmountTransaction := fraudcatcher.Transaction{
		ID:        "tx_002",
		UserID:    "user_001",
		Amount:    50000.0, // Very high amount
		Currency:  "USD",
		Timestamp: time.Date(2023, 1, 15, 14, 30, 0, 0, time.UTC),
		Location: &fraudcatcher.Location{
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

	result, err = detector.Analyze(highAmountTransaction)
	if err != nil {
		log.Fatalf("Error analyzing transaction: %v", err)
	}

	printResult("High Amount Transaction", result)

	// Example 3: Suspicious time transaction
	fmt.Println("\n=== Example 3: Suspicious Time Transaction ===")
	suspiciousTimeTransaction := fraudcatcher.Transaction{
		ID:        "tx_003",
		UserID:    "user_002",
		Amount:    1000.0,
		Currency:  "USD",
		Timestamp: time.Date(2023, 1, 15, 3, 0, 0, 0, time.UTC), // 3:00 AM
		Location: &fraudcatcher.Location{
			Lat:     40.7128,
			Lng:     -74.0060,
			Country: "US",
			City:    "New York",
		},
		DeviceID:      "device_002",
		UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		IPAddress:     "192.168.1.101",
		MerchantID:    "merchant_002",
		Category:      "retail",
		PaymentMethod: "credit_card",
	}

	result, err = detector.Analyze(suspiciousTimeTransaction)
	if err != nil {
		log.Fatalf("Error analyzing transaction: %v", err)
	}

	printResult("Suspicious Time Transaction", result)

	// Example 4: Weekend transaction
	fmt.Println("\n=== Example 4: Weekend Transaction ===")
	weekendTransaction := fraudcatcher.Transaction{
		ID:        "tx_004",
		UserID:    "user_003",
		Amount:    500.0,
		Currency:  "USD",
		Timestamp: time.Date(2023, 1, 14, 20, 0, 0, 0, time.UTC), // Saturday 8:00 PM
		Location: &fraudcatcher.Location{
			Lat:     40.7128,
			Lng:     -74.0060,
			Country: "US",
			City:    "New York",
		},
		DeviceID:      "device_003",
		UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		IPAddress:     "192.168.1.102",
		MerchantID:    "merchant_003",
		Category:      "retail",
		PaymentMethod: "credit_card",
	}

	result, err = detector.Analyze(weekendTransaction)
	if err != nil {
		log.Fatalf("Error analyzing transaction: %v", err)
	}

	printResult("Weekend Transaction", result)

	// Example 5: Multiple transactions for same user (testing user profiling)
	fmt.Println("\n=== Example 5: User Profiling Test ===")
	userID := "user_004"

	// Process several transactions for the same user
	for i := 0; i < 5; i++ {
		transaction := fraudcatcher.Transaction{
			ID:        fmt.Sprintf("tx_%d", 100+i),
			UserID:    userID,
			Amount:    100.0 + float64(i*50), // Increasing amounts
			Currency:  "USD",
			Timestamp: time.Date(2023, 1, 15, 14+i, 0, 0, 0, time.UTC), // Different hours
			Location: &fraudcatcher.Location{
				Lat:     40.7128,
				Lng:     -74.0060,
				Country: "US",
				City:    "New York",
			},
			DeviceID:      "device_004",
			UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			IPAddress:     "192.168.1.103",
			MerchantID:    "merchant_004",
			Category:      "retail",
			PaymentMethod: "credit_card",
		}

		result, err := detector.Analyze(transaction)
		if err != nil {
			log.Fatalf("Error analyzing transaction: %v", err)
		}

		fmt.Printf("Transaction %d - Risk Score: %.2f, Is Fraud: %t\n", i+1, result.RiskScore, result.IsFraud)
	}

	// Get user profile
	profile := detector.GetUserProfile(userID)
	if profile != nil {
		fmt.Printf("\nUser Profile for %s:\n", userID)
		fmt.Printf("  Transaction Count: %d\n", profile.TransactionCount)
		fmt.Printf("  Total Amount: %.2f\n", profile.TotalAmount)
		fmt.Printf("  Average Amount: %.2f\n", profile.AverageAmount)
		fmt.Printf("  Risk Score: %.2f\n", profile.RiskScore)
		fmt.Printf("  Is High Risk: %t\n", profile.IsHighRisk)
	}

	// Example 6: Test algorithm management
	fmt.Println("\n=== Example 6: Algorithm Management ===")

	// Get enabled algorithms
	enabledAlgs := detector.GetEnabledAlgorithms()
	fmt.Printf("Enabled algorithms: %d\n", len(enabledAlgs))
	for _, alg := range enabledAlgs {
		fmt.Printf("  - %s: %s\n", alg.GetName(), alg.GetDescription())
	}

	// Disable time algorithm
	detector.DisableAlgorithm("time")
	fmt.Println("Disabled time algorithm")

	// Analyze transaction without time algorithm
	transaction := fraudcatcher.Transaction{
		ID:        "tx_005",
		UserID:    "user_005",
		Amount:    1000.0,
		Currency:  "USD",
		Timestamp: time.Date(2023, 1, 15, 3, 0, 0, 0, time.UTC), // 3:00 AM
		Location: &fraudcatcher.Location{
			Lat:     40.7128,
			Lng:     -74.0060,
			Country: "US",
			City:    "New York",
		},
	}

	result, err = detector.Analyze(transaction)
	if err != nil {
		log.Fatalf("Error analyzing transaction: %v", err)
	}

	fmt.Printf("Transaction analyzed without time algorithm - Risk Score: %.2f\n", result.RiskScore)

	// Re-enable time algorithm
	detector.EnableAlgorithm("time")
	fmt.Println("Re-enabled time algorithm")

	// Example 7: Get system metrics
	fmt.Println("\n=== Example 7: System Metrics ===")
	metrics := detector.GetMetrics()
	fmt.Printf("Transactions Processed: %d\n", metrics.TransactionsProcessed)
	fmt.Printf("Fraud Detected: %d\n", metrics.FraudDetected)
	fmt.Printf("False Positives: %d\n", metrics.FalsePositives)
	fmt.Printf("False Negatives: %d\n", metrics.FalseNegatives)
	fmt.Printf("Average Response Time: %.4f seconds\n", metrics.AverageResponseTime)

	// Get comprehensive stats
	stats := detector.GetStats()
	fmt.Printf("\nSystem Statistics:\n")
	fmt.Printf("  User Profiles: %d\n", stats["user_profiles_count"])
	fmt.Printf("  Enabled Algorithms: %d\n", stats["enabled_algorithms"])
	fmt.Printf("  Total Algorithms: %d\n", stats["total_algorithms"])

	fmt.Println("\n=== Fraud Detection Demo Complete ===")
}

func printResult(title string, result *fraudcatcher.FraudResult) {
	fmt.Printf("%s:\n", title)
	fmt.Printf("  Transaction ID: %s\n", result.TransactionID)
	fmt.Printf("  Risk Score: %.2f\n", result.RiskScore)
	fmt.Printf("  Is Fraud: %t\n", result.IsFraud)
	fmt.Printf("  Confidence: %.2f\n", result.Confidence)
	fmt.Printf("  Risk Level: %s\n", result.GetRiskLevel())

	if len(result.AlgorithmScores) > 0 {
		fmt.Printf("  Algorithm Scores:\n")
		for alg, score := range result.AlgorithmScores {
			fmt.Printf("    %s: %.2f\n", alg, score)
		}
	}

	if len(result.Reasons) > 0 {
		fmt.Printf("  Reasons:\n")
		for _, reason := range result.Reasons {
			fmt.Printf("    - %s\n", reason)
		}
	}

	if len(result.Recommendations) > 0 {
		fmt.Printf("  Recommendations:\n")
		for _, rec := range result.Recommendations {
			fmt.Printf("    - %s\n", rec)
		}
	}

	fmt.Printf("  Processed At: %s\n", result.ProcessedAt.Format(time.RFC3339))
	fmt.Println()
}
