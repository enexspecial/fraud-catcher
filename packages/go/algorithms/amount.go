package algorithms

import (
	"context"
	"math"
	"sync"

	"github.com/fraud-catcher/go"
)

// AmountConfig represents the configuration for the amount algorithm
type AmountConfig struct {
	SuspiciousThreshold float64            `json:"suspicious_threshold"`
	HighRiskThreshold   float64            `json:"high_risk_threshold"`
	CurrencyMultipliers map[string]float64 `json:"currency_multipliers"`
	UserSpecificThresholds bool            `json:"user_specific_thresholds"`
	EnableStatisticalAnalysis bool         `json:"enable_statistical_analysis"`
}

// AmountAlgorithm implements fraud detection based on transaction amounts
type AmountAlgorithm struct {
	*fraudcatcher.BaseAlgorithm
	config      AmountConfig
	userProfiles map[string]*UserAmountProfile
	mutex       sync.RWMutex
}

// UserAmountProfile represents a user's spending profile
type UserAmountProfile struct {
	UserID           string    `json:"user_id"`
	TransactionCount int       `json:"transaction_count"`
	TotalAmount      float64   `json:"total_amount"`
	AverageAmount    float64   `json:"average_amount"`
	MedianAmount     float64   `json:"median_amount"`
	MaxAmount        float64   `json:"max_amount"`
	MinAmount        float64   `json:"min_amount"`
	StandardDeviation float64  `json:"standard_deviation"`
	Amounts          []float64 `json:"amounts"`
	LastUpdated      int64     `json:"last_updated"`
}

// NewAmountAlgorithm creates a new amount algorithm
func NewAmountAlgorithm(config AmountConfig) *AmountAlgorithm {
	base := fraudcatcher.NewBaseAlgorithm("amount", "Detects suspicious transaction amounts", 0.8)
	
	return &AmountAlgorithm{
		BaseAlgorithm: base,
		config:        config,
		userProfiles:  make(map[string]*UserAmountProfile),
	}
}

// Analyze analyzes a transaction for amount-based fraud
func (aa *AmountAlgorithm) Analyze(ctx context.Context, transaction fraudcatcher.Transaction, rule fraudcatcher.DetectionRule) (float64, error) {
	if !aa.IsEnabled() {
		return 0.0, nil
	}

	amount := transaction.Amount
	currency := transaction.Currency
	userID := transaction.UserID

	// Apply currency multiplier if configured
	multiplier := aa.getCurrencyMultiplier(currency)
	normalizedAmount := amount * multiplier

	// Get or create user profile
	profile := aa.getUserProfile(userID)
	
	// Update profile with new transaction
	aa.updateUserProfile(profile, normalizedAmount)

	// Calculate risk score
	riskScore := aa.calculateRiskScore(normalizedAmount, profile)

	return math.Min(riskScore, 1.0), nil
}

// getCurrencyMultiplier returns the currency multiplier for the given currency
func (aa *AmountAlgorithm) getCurrencyMultiplier(currency string) float64 {
	if aa.config.CurrencyMultipliers == nil {
		return 1.0
	}
	
	multiplier, exists := aa.config.CurrencyMultipliers[currency]
	if !exists {
		return 1.0
	}
	
	return multiplier
}

// getUserProfile returns the user profile for the given user ID
func (aa *AmountAlgorithm) getUserProfile(userID string) *UserAmountProfile {
	aa.mutex.Lock()
	defer aa.mutex.Unlock()

	profile, exists := aa.userProfiles[userID]
	if !exists {
		profile = &UserAmountProfile{
			UserID:      userID,
			Amounts:     []float64{},
			LastUpdated: 0,
		}
		aa.userProfiles[userID] = profile
	}

	return profile
}

// updateUserProfile updates the user profile with a new transaction amount
func (aa *AmountAlgorithm) updateUserProfile(profile *UserAmountProfile, amount float64) {
	aa.mutex.Lock()
	defer aa.mutex.Unlock()

	profile.TransactionCount++
	profile.TotalAmount += amount
	profile.Amounts = append(profile.Amounts, amount)

	// Update statistics
	profile.AverageAmount = profile.TotalAmount / float64(profile.TransactionCount)
	
	// Update min/max
	if amount > profile.MaxAmount {
		profile.MaxAmount = amount
	}
	if profile.MinAmount == 0 || amount < profile.MinAmount {
		profile.MinAmount = amount
	}

	// Calculate median
	profile.MedianAmount = aa.calculateMedian(profile.Amounts)

	// Calculate standard deviation
	profile.StandardDeviation = aa.calculateStandardDeviation(profile.Amounts, profile.AverageAmount)
}

// calculateRiskScore calculates the risk score for a transaction amount
func (aa *AmountAlgorithm) calculateRiskScore(amount float64, profile *UserAmountProfile) float64 {
	// If user has no history, use global thresholds
	if profile.TransactionCount == 0 {
		return aa.calculateGlobalRiskScore(amount)
	}

	// If user-specific thresholds are enabled, use user profile
	if aa.config.UserSpecificThresholds {
		return aa.calculateUserSpecificRiskScore(amount, profile)
	}

	// Use global thresholds
	return aa.calculateGlobalRiskScore(amount)
}

// calculateGlobalRiskScore calculates risk score using global thresholds
func (aa *AmountAlgorithm) calculateGlobalRiskScore(amount float64) float64 {
	if amount >= aa.config.HighRiskThreshold {
		return 1.0 // Maximum risk for very high amounts
	} else if amount >= aa.config.SuspiciousThreshold {
		// Linear interpolation between suspicious and high risk thresholds
		range := aa.config.HighRiskThreshold - aa.config.SuspiciousThreshold
		position := amount - aa.config.SuspiciousThreshold
		return 0.5 + (position/range)*0.5 // 0.5 to 1.0
	} else {
		// Low risk for amounts below suspicious threshold
		return amount / aa.config.SuspiciousThreshold * 0.5 // 0.0 to 0.5
	}
}

// calculateUserSpecificRiskScore calculates risk score using user-specific patterns
func (aa *AmountAlgorithm) calculateUserSpecificRiskScore(amount float64, profile *UserAmountProfile) float64 {
	// Z-score analysis
	zScore := aa.calculateZScore(amount, profile.AverageAmount, profile.StandardDeviation)
	
	// Convert Z-score to risk score (0-1)
	riskScore := aa.zScoreToRiskScore(zScore)

	// Statistical analysis if enabled
	if aa.config.EnableStatisticalAnalysis {
		statisticalRisk := aa.calculateStatisticalRisk(amount, profile)
		riskScore = math.Max(riskScore, statisticalRisk)
	}

	return math.Min(riskScore, 1.0)
}

// calculateZScore calculates the Z-score for an amount
func (aa *AmountAlgorithm) calculateZScore(amount, mean, stdDev float64) float64 {
	if stdDev == 0 {
		return 0
	}
	return (amount - mean) / stdDev
}

// zScoreToRiskScore converts a Z-score to a risk score
func (aa *AmountAlgorithm) zScoreToRiskScore(zScore float64) float64 {
	// Z-score > 3: Very high risk (0.9-1.0)
	// Z-score > 2: High risk (0.7-0.9)
	// Z-score > 1: Medium risk (0.4-0.7)
	// Z-score <= 1: Low risk (0.0-0.4)
	
	absZScore := math.Abs(zScore)
	
	switch {
	case absZScore >= 3:
		return 0.9 + (absZScore-3)*0.1
	case absZScore >= 2:
		return 0.7 + (absZScore-2)*0.2
	case absZScore >= 1:
		return 0.4 + (absZScore-1)*0.3
	default:
		return absZScore * 0.4
	}
}

// calculateStatisticalRisk calculates risk based on statistical analysis
func (aa *AmountAlgorithm) calculateStatisticalRisk(amount float64, profile *UserAmountProfile) float64 {
	// Percentile analysis
	percentile := aa.calculatePercentile(amount, profile.Amounts)
	
	// High percentile = high risk
	if percentile >= 95 {
		return 0.9
	} else if percentile >= 90 {
		return 0.7
	} else if percentile >= 80 {
		return 0.5
	}
	
	return 0.2
}

// calculateMedian calculates the median of a slice of amounts
func (aa *AmountAlgorithm) calculateMedian(amounts []float64) float64 {
	if len(amounts) == 0 {
		return 0
	}
	
	// Sort amounts (simplified - in production, use proper sorting)
	sorted := make([]float64, len(amounts))
	copy(sorted, amounts)
	
	// Simple bubble sort (in production, use more efficient sorting)
	for i := 0; i < len(sorted)-1; i++ {
		for j := 0; j < len(sorted)-i-1; j++ {
			if sorted[j] > sorted[j+1] {
				sorted[j], sorted[j+1] = sorted[j+1], sorted[j]
			}
		}
	}
	
	mid := len(sorted) / 2
	if len(sorted)%2 == 0 {
		return (sorted[mid-1] + sorted[mid]) / 2
	}
	return sorted[mid]
}

// calculateStandardDeviation calculates the standard deviation
func (aa *AmountAlgorithm) calculateStandardDeviation(amounts []float64, mean float64) float64 {
	if len(amounts) <= 1 {
		return 0
	}
	
	var sumSquaredDiffs float64
	for _, amount := range amounts {
		diff := amount - mean
		sumSquaredDiffs += diff * diff
	}
	
	variance := sumSquaredDiffs / float64(len(amounts)-1)
	return math.Sqrt(variance)
}

// calculatePercentile calculates the percentile of an amount in a dataset
func (aa *AmountAlgorithm) calculatePercentile(amount float64, amounts []float64) float64 {
	if len(amounts) == 0 {
		return 0
	}
	
	count := 0
	for _, a := range amounts {
		if a <= amount {
			count++
		}
	}
	
	return float64(count) / float64(len(amounts)) * 100
}

// IsSuspiciousAmount checks if an amount is suspicious
func (aa *AmountAlgorithm) IsSuspiciousAmount(amount float64, currency string) bool {
	multiplier := aa.getCurrencyMultiplier(currency)
	normalizedAmount := amount * multiplier
	return normalizedAmount >= aa.config.SuspiciousThreshold
}

// IsHighRiskAmount checks if an amount is high risk
func (aa *AmountAlgorithm) IsHighRiskAmount(amount float64, currency string) bool {
	multiplier := aa.getCurrencyMultiplier(currency)
	normalizedAmount := amount * multiplier
	return normalizedAmount >= aa.config.HighRiskThreshold
}

// GetRiskLevel returns the risk level for an amount
func (aa *AmountAlgorithm) GetRiskLevel(amount float64, currency string) fraudcatcher.RiskLevel {
	multiplier := aa.getCurrencyMultiplier(currency)
	normalizedAmount := amount * multiplier

	if normalizedAmount >= aa.config.HighRiskThreshold {
		return fraudcatcher.RiskHigh
	} else if normalizedAmount >= aa.config.SuspiciousThreshold {
		return fraudcatcher.RiskMedium
	}
	return fraudcatcher.RiskLow
}

// GetUserProfile returns the user profile for a given user ID
func (aa *AmountAlgorithm) GetUserProfile(userID string) *UserAmountProfile {
	aa.mutex.RLock()
	defer aa.mutex.RUnlock()
	return aa.userProfiles[userID]
}

// GetStats returns statistics for the amount algorithm
func (aa *AmountAlgorithm) GetStats() map[string]interface{} {
	aa.mutex.RLock()
	defer aa.mutex.RUnlock()
	
	stats := aa.BaseAlgorithm.GetStats()
	stats["user_profiles_count"] = len(aa.userProfiles)
	stats["config"] = aa.config
	
	return stats
}

// Reset resets the algorithm state
func (aa *AmountAlgorithm) Reset() error {
	aa.mutex.Lock()
	defer aa.mutex.Unlock()
	
	aa.userProfiles = make(map[string]*UserAmountProfile)
	return nil
}
