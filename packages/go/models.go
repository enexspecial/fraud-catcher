package fraudcatcher

import (
	"time"
)

// Transaction represents a financial transaction
type Transaction struct {
	ID            string                 `json:"id"`
	UserID        string                 `json:"user_id"`
	Amount        float64                `json:"amount"`
	Currency      string                 `json:"currency"`
	Timestamp     time.Time              `json:"timestamp"`
	Location      *Location              `json:"location,omitempty"`
	DeviceID      string                 `json:"device_id,omitempty"`
	UserAgent     string                 `json:"user_agent,omitempty"`
	IPAddress     string                 `json:"ip_address,omitempty"`
	MerchantID    string                 `json:"merchant_id,omitempty"`
	Category      string                 `json:"category,omitempty"`
	PaymentMethod string                 `json:"payment_method,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

// Location represents a geographical location
type Location struct {
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Country string  `json:"country,omitempty"`
	City    string  `json:"city,omitempty"`
	State   string  `json:"state,omitempty"`
	ZipCode string  `json:"zip_code,omitempty"`
}

// FraudResult represents the result of fraud analysis
type FraudResult struct {
	TransactionID   string             `json:"transaction_id"`
	RiskScore       float64            `json:"risk_score"`
	IsFraud         bool               `json:"is_fraud"`
	Confidence      float64            `json:"confidence"`
	AlgorithmScores map[string]float64 `json:"algorithm_scores"`
	Reasons         []string           `json:"reasons"`
	Recommendations []string           `json:"recommendations"`
	ProcessedAt     time.Time          `json:"processed_at"`
}

// Config represents the configuration for the fraud detector
type Config struct {
	Rules                []string           `json:"rules"`
	Thresholds           map[string]float64 `json:"thresholds"`
	GlobalThreshold      float64            `json:"global_threshold"`
	EnableLogging        bool               `json:"enable_logging"`
	MaxUserProfiles      int                `json:"max_user_profiles"`
	ProfileRetentionDays int                `json:"profile_retention_days"`
	CacheEnabled         bool               `json:"cache_enabled"`
	CacheTTL             time.Duration      `json:"cache_ttl"`
	CacheMaxSize         int                `json:"cache_max_size"`
}

// DetectionRule represents a fraud detection rule
type DetectionRule string

const (
	RuleAmount     DetectionRule = "amount"
	RuleTime       DetectionRule = "time"
	RuleLocation   DetectionRule = "location"
	RuleDevice     DetectionRule = "device"
	RuleBehavioral DetectionRule = "behavioral"
	RuleMerchant   DetectionRule = "merchant"
	RuleVelocity   DetectionRule = "velocity"
	RuleNetwork    DetectionRule = "network"
	RuleML         DetectionRule = "ml"
)

// RiskLevel represents the risk level of a transaction
type RiskLevel string

const (
	RiskLow    RiskLevel = "low"
	RiskMedium RiskLevel = "medium"
	RiskHigh   RiskLevel = "high"
)

// GetRiskLevel returns the risk level based on the risk score
func (fr *FraudResult) GetRiskLevel() RiskLevel {
	switch {
	case fr.RiskScore >= 0.8:
		return RiskHigh
	case fr.RiskScore >= 0.5:
		return RiskMedium
	default:
		return RiskLow
	}
}

// IsHighRisk returns true if the transaction is high risk
func (fr *FraudResult) IsHighRisk() bool {
	return fr.RiskScore >= 0.8
}

// IsMediumRisk returns true if the transaction is medium risk
func (fr *FraudResult) IsMediumRisk() bool {
	return fr.RiskScore >= 0.5 && fr.RiskScore < 0.8
}

// IsLowRisk returns true if the transaction is low risk
func (fr *FraudResult) IsLowRisk() bool {
	return fr.RiskScore < 0.5
}

// AddReason adds a reason to the fraud result
func (fr *FraudResult) AddReason(reason string) {
	fr.Reasons = append(fr.Reasons, reason)
}

// AddRecommendation adds a recommendation to the fraud result
func (fr *FraudResult) AddRecommendation(recommendation string) {
	fr.Recommendations = append(fr.Recommendations, recommendation)
}

// SetAlgorithmScore sets the score for a specific algorithm
func (fr *FraudResult) SetAlgorithmScore(algorithm string, score float64) {
	if fr.AlgorithmScores == nil {
		fr.AlgorithmScores = make(map[string]float64)
	}
	fr.AlgorithmScores[algorithm] = score
}

// GetAlgorithmScore returns the score for a specific algorithm
func (fr *FraudResult) GetAlgorithmScore(algorithm string) float64 {
	if fr.AlgorithmScores == nil {
		return 0.0
	}
	return fr.AlgorithmScores[algorithm]
}
