package fraudcatcher

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/fraud-catcher/go/algorithms"
)

// FraudDetector represents the main fraud detection system
type FraudDetector struct {
	config           Config
	algorithmManager *AlgorithmManager
	userProfiles     map[string]*UserProfile
	mutex            sync.RWMutex
	metrics          *Metrics
}

// UserProfile represents a comprehensive user profile
type UserProfile struct {
	UserID           string                 `json:"user_id"`
	TransactionCount int                    `json:"transaction_count"`
	TotalAmount      float64                `json:"total_amount"`
	AverageAmount    float64                `json:"average_amount"`
	LastTransaction  time.Time              `json:"last_transaction"`
	RiskScore        float64                `json:"risk_score"`
	IsHighRisk       bool                   `json:"is_high_risk"`
	CreatedAt        time.Time              `json:"created_at"`
	LastUpdated      time.Time              `json:"last_updated"`
	Metadata         map[string]interface{} `json:"metadata"`
}

// Metrics represents system metrics
type Metrics struct {
	TransactionsProcessed int64     `json:"transactions_processed"`
	FraudDetected         int64     `json:"fraud_detected"`
	FalsePositives        int64     `json:"false_positives"`
	FalseNegatives        int64     `json:"false_negatives"`
	AverageResponseTime   float64   `json:"average_response_time"`
	LastUpdated           time.Time `json:"last_updated"`
}

// NewFraudDetector creates a new fraud detector instance
func NewFraudDetector(config Config) *FraudDetector {
	// Set default values
	if config.GlobalThreshold == 0 {
		config.GlobalThreshold = 0.7
	}
	if config.MaxUserProfiles == 0 {
		config.MaxUserProfiles = 10000
	}
	if config.ProfileRetentionDays == 0 {
		config.ProfileRetentionDays = 30
	}
	if config.CacheTTL == 0 {
		config.CacheTTL = time.Hour
	}
	if config.CacheMaxSize == 0 {
		config.CacheMaxSize = 1000
	}

	fd := &FraudDetector{
		config:           config,
		algorithmManager: NewAlgorithmManager(),
		userProfiles:     make(map[string]*UserProfile),
		metrics: &Metrics{
			LastUpdated: time.Now(),
		},
	}

	// Register default algorithms
	fd.registerDefaultAlgorithms()

	return fd
}

// registerDefaultAlgorithms registers the default fraud detection algorithms
func (fd *FraudDetector) registerDefaultAlgorithms() {
	// Amount Algorithm
	amountConfig := algorithms.AmountConfig{
		SuspiciousThreshold:       1000.0,
		HighRiskThreshold:         5000.0,
		CurrencyMultipliers:       make(map[string]float64),
		UserSpecificThresholds:    true,
		EnableStatisticalAnalysis: true,
	}
	amountAlgorithm := algorithms.NewAmountAlgorithm(amountConfig)
	fd.algorithmManager.RegisterAlgorithm(amountAlgorithm)

	// Time Algorithm
	timeConfig := algorithms.TimeConfig{
		SuspiciousHours:        []int{0, 1, 2, 3, 4, 5, 22, 23},
		WeekendRiskMultiplier:  1.2,
		HolidayRiskMultiplier:  1.5,
		TimezoneThreshold:      6,
		EnableHolidayDetection: true,
		EnableUserTimeProfiles: true,
	}
	timeAlgorithm := algorithms.NewTimeAlgorithm(timeConfig)
	fd.algorithmManager.RegisterAlgorithm(timeAlgorithm)

	// Location Algorithm
	locationConfig := algorithms.LocationConfig{
		MaxDistanceKm:            1000.0,
		SuspiciousDistanceKm:     100.0,
		TimeWindowMinutes:        60,
		EnableGeoFencing:         true,
		EnableTravelIntelligence: true,
		MaxTravelSpeedKmh:        1000.0,
		EnableLocationClustering: true,
	}
	locationAlgorithm := algorithms.NewLocationAlgorithm(locationConfig)
	fd.algorithmManager.RegisterAlgorithm(locationAlgorithm)

	// Device Algorithm
	deviceConfig := algorithms.DeviceConfig{
		EnableFingerprinting:      true,
		SuspiciousDeviceThreshold: 10.0,
		NewDeviceRiskMultiplier:   1.5,
		DeviceVelocityWindow:      60,
		MaxDevicesPerUser:         5,
		EnableDeviceReputation:    true,
		EnableDeviceClustering:    true,
		EnableCrossUserAnalysis:   true,
		DeviceSharingThreshold:    0.3,
	}
	deviceAlgorithm := algorithms.NewDeviceAlgorithm(deviceConfig)
	fd.algorithmManager.RegisterAlgorithm(deviceAlgorithm)

	// Behavioral Algorithm
	behavioralConfig := algorithms.BehavioralConfig{
		EnableSpendingPatterns:      true,
		EnableTransactionTiming:     true,
		EnableLocationPatterns:      true,
		EnableDevicePatterns:        true,
		EnableVelocityAnalysis:      true,
		EnableMerchantPatterns:      true,
		EnablePaymentMethodPatterns: true,
		PatternHistoryDays:          30,
		AnomalyThreshold:            0.7,
		EnableMachineLearning:       false,
		LearningRate:                0.01,
		EnableAdaptiveThresholds:    true,
		EnableSeasonalAnalysis:      true,
		EnableCrossUserAnalysis:     true,
		MaxUserProfiles:             10000,
		ProfileRetentionDays:        30,
	}
	behavioralAlgorithm := algorithms.NewBehavioralAlgorithm(behavioralConfig)
	fd.algorithmManager.RegisterAlgorithm(behavioralAlgorithm)

	// Code Analysis Algorithm
	codeAnalysisConfig := algorithms.CodeAnalysisConfig{
		EnableStaticAnalysis:     true,
		EnableDynamicAnalysis:    false,
		EnableBehavioralAnalysis: true,
		EnableDependencyAnalysis: true,
		EnablePatternMatching:    true,
		EnableMLAnalysis:         false,
		SeverityThresholds: map[string]float64{
			"critical": 0.9,
			"high":     0.7,
			"medium":   0.5,
			"low":      0.3,
		},
		LanguageSupport:        []string{"php", "javascript", "python", "java", "go"},
		ExcludePatterns:        []string{"*.test.js", "*.spec.js", "node_modules/*"},
		MaxFileSize:            1024 * 1024, // 1MB
		EnableRealTimeAnalysis: true,
	}
	codeAnalysisAlgorithm := algorithms.NewCodeAnalysisAlgorithm(codeAnalysisConfig)
	fd.algorithmManager.RegisterAlgorithm(codeAnalysisAlgorithm)

	// Set thresholds from config
	for rule, threshold := range fd.config.Thresholds {
		if algorithm, exists := fd.algorithmManager.GetAlgorithm(rule); exists {
			algorithm.SetThreshold(threshold)
		}
	}
}

// Analyze analyzes a transaction for fraud
func (fd *FraudDetector) Analyze(transaction Transaction) (*FraudResult, error) {
	return fd.AnalyzeWithContext(context.Background(), transaction)
}

// AnalyzeWithContext analyzes a transaction for fraud with context
func (fd *FraudDetector) AnalyzeWithContext(ctx context.Context, transaction Transaction) (*FraudResult, error) {
	startTime := time.Now()
	defer func() {
		fd.updateMetrics(time.Since(startTime))
	}()

	// Validate transaction
	if err := fd.validateTransaction(transaction); err != nil {
		return nil, fmt.Errorf("invalid transaction: %w", err)
	}

	// Get or create user profile
	userProfile := fd.getUserProfile(transaction.UserID)

	// Analyze using algorithm manager
	result, err := fd.algorithmManager.AnalyzeTransaction(ctx, transaction)
	if err != nil {
		return nil, fmt.Errorf("analysis failed: %w", err)
	}

	// Update user profile
	fd.updateUserProfile(userProfile, transaction, result)

	// Apply global threshold
	result.IsFraud = result.RiskScore >= fd.config.GlobalThreshold

	// Add user-specific context to reasons
	if userProfile.IsHighRisk {
		result.AddReason("User has high risk profile")
	}

	// Add recommendations based on risk level
	fd.addRecommendations(result, userProfile)

	return result, nil
}

// validateTransaction validates a transaction
func (fd *FraudDetector) validateTransaction(transaction Transaction) error {
	if transaction.ID == "" {
		return fmt.Errorf("transaction ID is required")
	}
	if transaction.UserID == "" {
		return fmt.Errorf("user ID is required")
	}
	if transaction.Amount <= 0 {
		return fmt.Errorf("amount must be positive")
	}
	if transaction.Currency == "" {
		transaction.Currency = "USD" // Default currency
	}
	if transaction.Timestamp.IsZero() {
		transaction.Timestamp = time.Now()
	}
	return nil
}

// getUserProfile returns the user profile for the given user ID
func (fd *FraudDetector) getUserProfile(userID string) *UserProfile {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	profile, exists := fd.userProfiles[userID]
	if !exists {
		profile = &UserProfile{
			UserID:      userID,
			CreatedAt:   time.Now(),
			LastUpdated: time.Now(),
			Metadata:    make(map[string]interface{}),
		}
		fd.userProfiles[userID] = profile
	}

	return profile
}

// updateUserProfile updates the user profile with transaction data
func (fd *FraudDetector) updateUserProfile(profile *UserProfile, transaction Transaction, result *FraudResult) {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	profile.TransactionCount++
	profile.TotalAmount += transaction.Amount
	profile.AverageAmount = profile.TotalAmount / float64(profile.TransactionCount)
	profile.LastTransaction = transaction.Timestamp
	profile.LastUpdated = time.Now()
	profile.RiskScore = result.RiskScore
	profile.IsHighRisk = result.IsFraud

	// Update metadata
	profile.Metadata["last_risk_score"] = result.RiskScore
	profile.Metadata["last_transaction_id"] = transaction.ID
	profile.Metadata["last_transaction_amount"] = transaction.Amount
}

// addRecommendations adds recommendations based on risk level and user profile
func (fd *FraudDetector) addRecommendations(result *FraudResult, profile *UserProfile) {
	if result.IsFraud {
		result.AddRecommendation("Block transaction immediately")
		result.AddRecommendation("Contact user for verification")
		result.AddRecommendation("Review user account for suspicious activity")
	} else if result.RiskScore >= 0.7 {
		result.AddRecommendation("Flag for manual review")
		result.AddRecommendation("Request additional verification")
	} else if result.RiskScore >= 0.5 {
		result.AddRecommendation("Monitor transaction closely")
		result.AddRecommendation("Consider additional verification")
	} else {
		result.AddRecommendation("Transaction appears normal")
	}

	// Add user-specific recommendations
	if profile.IsHighRisk {
		result.AddRecommendation("User has high risk profile - monitor closely")
	}

	if profile.TransactionCount < 5 {
		result.AddRecommendation("New user - consider additional verification")
	}
}

// updateMetrics updates system metrics
func (fd *FraudDetector) updateMetrics(responseTime time.Duration) {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	fd.metrics.TransactionsProcessed++

	// Update average response time
	totalTime := fd.metrics.AverageResponseTime * float64(fd.metrics.TransactionsProcessed-1)
	fd.metrics.AverageResponseTime = (totalTime + responseTime.Seconds()) / float64(fd.metrics.TransactionsProcessed)

	fd.metrics.LastUpdated = time.Now()
}

// MarkFalsePositive marks a transaction as a false positive
func (fd *FraudDetector) MarkFalsePositive(transactionID string) error {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	fd.metrics.FalsePositives++
	return nil
}

// MarkFalseNegative marks a transaction as a false negative
func (fd *FraudDetector) MarkFalseNegative(transactionID string) error {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	fd.metrics.FalseNegatives++
	return nil
}

// GetUserProfile returns the user profile for a given user ID
func (fd *FraudDetector) GetUserProfile(userID string) *UserProfile {
	fd.mutex.RLock()
	defer fd.mutex.RUnlock()
	return fd.userProfiles[userID]
}

// GetMetrics returns the current system metrics
func (fd *FraudDetector) GetMetrics() *Metrics {
	fd.mutex.RLock()
	defer fd.mutex.RUnlock()
	return fd.metrics
}

// GetConfig returns the current configuration
func (fd *FraudDetector) GetConfig() Config {
	return fd.config
}

// UpdateConfig updates the configuration
func (fd *FraudDetector) UpdateConfig(config Config) error {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	fd.config = config

	// Update algorithm thresholds
	for rule, threshold := range config.Thresholds {
		if algorithm, exists := fd.algorithmManager.GetAlgorithm(rule); exists {
			algorithm.SetThreshold(threshold)
		}
	}

	return nil
}

// GetAlgorithm returns a specific algorithm
func (fd *FraudDetector) GetAlgorithm(name string) (FraudAlgorithm, bool) {
	return fd.algorithmManager.GetAlgorithm(name)
}

// EnableAlgorithm enables a specific algorithm
func (fd *FraudDetector) EnableAlgorithm(name string) {
	fd.algorithmManager.EnableAlgorithm(name)
}

// DisableAlgorithm disables a specific algorithm
func (fd *FraudDetector) DisableAlgorithm(name string) {
	fd.algorithmManager.DisableAlgorithm(name)
}

// GetEnabledAlgorithms returns all enabled algorithms
func (fd *FraudDetector) GetEnabledAlgorithms() []FraudAlgorithm {
	return fd.algorithmManager.GetEnabledAlgorithms()
}

// Reset resets the fraud detector state
func (fd *FraudDetector) Reset() error {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	fd.userProfiles = make(map[string]*UserProfile)
	fd.metrics = &Metrics{
		LastUpdated: time.Now(),
	}

	// Reset all algorithms
	algorithms := fd.algorithmManager.GetAllAlgorithms()
	for _, algorithm := range algorithms {
		if err := algorithm.Reset(); err != nil {
			return fmt.Errorf("failed to reset algorithm %s: %w", algorithm.GetName(), err)
		}
	}

	return nil
}

// Cleanup removes old user profiles based on retention policy
func (fd *FraudDetector) Cleanup() error {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	cutoffTime := time.Now().AddDate(0, 0, -fd.config.ProfileRetentionDays)
	var toDelete []string

	for userID, profile := range fd.userProfiles {
		if profile.LastUpdated.Before(cutoffTime) {
			toDelete = append(toDelete, userID)
		}
	}

	for _, userID := range toDelete {
		delete(fd.userProfiles, userID)
	}

	return nil
}

// GetStats returns comprehensive statistics
func (fd *FraudDetector) GetStats() map[string]interface{} {
	fd.mutex.RLock()
	defer fd.mutex.RUnlock()

	stats := map[string]interface{}{
		"user_profiles_count": len(fd.userProfiles),
		"enabled_algorithms":  len(fd.algorithmManager.GetEnabledAlgorithms()),
		"total_algorithms":    len(fd.algorithmManager.GetAllAlgorithms()),
		"metrics":             fd.metrics,
		"config":              fd.config,
	}

	// Add algorithm-specific stats
	algorithmStats := make(map[string]interface{})
	for _, algorithm := range fd.algorithmManager.GetAllAlgorithms() {
		algorithmStats[algorithm.GetName()] = algorithm.GetStats()
	}
	stats["algorithms"] = algorithmStats

	return stats
}
