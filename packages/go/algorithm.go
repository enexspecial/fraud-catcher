package fraudcatcher

import (
	"context"
	"time"
)

// FraudAlgorithm represents a fraud detection algorithm
type FraudAlgorithm interface {
	// Analyze analyzes a transaction and returns a risk score
	Analyze(ctx context.Context, transaction Transaction, rule DetectionRule) (float64, error)

	// GetName returns the name of the algorithm
	GetName() string

	// GetDescription returns a description of the algorithm
	GetDescription() string

	// IsEnabled returns true if the algorithm is enabled
	IsEnabled() bool

	// SetEnabled enables or disables the algorithm
	SetEnabled(enabled bool)

	// GetThreshold returns the threshold for this algorithm
	GetThreshold() float64

	// SetThreshold sets the threshold for this algorithm
	SetThreshold(threshold float64)

	// GetConfig returns the configuration for this algorithm
	GetConfig() interface{}

	// SetConfig sets the configuration for this algorithm
	SetConfig(config interface{}) error

	// Reset resets the algorithm state
	Reset() error

	// GetStats returns statistics for this algorithm
	GetStats() map[string]interface{}
}

// BaseAlgorithm provides common functionality for all algorithms
type BaseAlgorithm struct {
	name        string
	description string
	enabled     bool
	threshold   float64
	config      interface{}
}

// NewBaseAlgorithm creates a new base algorithm
func NewBaseAlgorithm(name, description string, threshold float64) *BaseAlgorithm {
	return &BaseAlgorithm{
		name:        name,
		description: description,
		enabled:     true,
		threshold:   threshold,
	}
}

// GetName returns the name of the algorithm
func (ba *BaseAlgorithm) GetName() string {
	return ba.name
}

// GetDescription returns a description of the algorithm
func (ba *BaseAlgorithm) GetDescription() string {
	return ba.description
}

// IsEnabled returns true if the algorithm is enabled
func (ba *BaseAlgorithm) IsEnabled() bool {
	return ba.enabled
}

// SetEnabled enables or disables the algorithm
func (ba *BaseAlgorithm) SetEnabled(enabled bool) {
	ba.enabled = enabled
}

// GetThreshold returns the threshold for this algorithm
func (ba *BaseAlgorithm) GetThreshold() float64 {
	return ba.threshold
}

// SetThreshold sets the threshold for this algorithm
func (ba *BaseAlgorithm) SetThreshold(threshold float64) {
	ba.threshold = threshold
}

// GetConfig returns the configuration for this algorithm
func (ba *BaseAlgorithm) GetConfig() interface{} {
	return ba.config
}

// SetConfig sets the configuration for this algorithm
func (ba *BaseAlgorithm) SetConfig(config interface{}) error {
	ba.config = config
	return nil
}

// Reset resets the algorithm state
func (ba *BaseAlgorithm) Reset() error {
	return nil
}

// GetStats returns statistics for this algorithm
func (ba *BaseAlgorithm) GetStats() map[string]interface{} {
	return map[string]interface{}{
		"name":        ba.name,
		"description": ba.description,
		"enabled":     ba.enabled,
		"threshold":   ba.threshold,
	}
}

// AlgorithmManager manages fraud detection algorithms
type AlgorithmManager struct {
	algorithms map[string]FraudAlgorithm
	enabled    map[string]bool
}

// NewAlgorithmManager creates a new algorithm manager
func NewAlgorithmManager() *AlgorithmManager {
	return &AlgorithmManager{
		algorithms: make(map[string]FraudAlgorithm),
		enabled:    make(map[string]bool),
	}
}

// RegisterAlgorithm registers a fraud detection algorithm
func (am *AlgorithmManager) RegisterAlgorithm(algorithm FraudAlgorithm) {
	name := algorithm.GetName()
	am.algorithms[name] = algorithm
	am.enabled[name] = algorithm.IsEnabled()
}

// GetAlgorithm returns a fraud detection algorithm by name
func (am *AlgorithmManager) GetAlgorithm(name string) (FraudAlgorithm, bool) {
	algorithm, exists := am.algorithms[name]
	return algorithm, exists
}

// EnableAlgorithm enables a fraud detection algorithm
func (am *AlgorithmManager) EnableAlgorithm(name string) {
	if algorithm, exists := am.algorithms[name]; exists {
		algorithm.SetEnabled(true)
		am.enabled[name] = true
	}
}

// DisableAlgorithm disables a fraud detection algorithm
func (am *AlgorithmManager) DisableAlgorithm(name string) {
	if algorithm, exists := am.algorithms[name]; exists {
		algorithm.SetEnabled(false)
		am.enabled[name] = false
	}
}

// IsAlgorithmEnabled returns true if an algorithm is enabled
func (am *AlgorithmManager) IsAlgorithmEnabled(name string) bool {
	return am.enabled[name]
}

// GetEnabledAlgorithms returns a list of enabled algorithms
func (am *AlgorithmManager) GetEnabledAlgorithms() []FraudAlgorithm {
	var enabled []FraudAlgorithm
	for name, algorithm := range am.algorithms {
		if am.enabled[name] {
			enabled = append(enabled, algorithm)
		}
	}
	return enabled
}

// GetAllAlgorithms returns all registered algorithms
func (am *AlgorithmManager) GetAllAlgorithms() []FraudAlgorithm {
	var algorithms []FraudAlgorithm
	for _, algorithm := range am.algorithms {
		algorithms = append(algorithms, algorithm)
	}
	return algorithms
}

// AnalyzeTransaction analyzes a transaction using all enabled algorithms
func (am *AlgorithmManager) AnalyzeTransaction(ctx context.Context, transaction Transaction) (*FraudResult, error) {
	result := &FraudResult{
		TransactionID:   transaction.ID,
		RiskScore:       0.0,
		IsFraud:         false,
		Confidence:      0.0,
		AlgorithmScores: make(map[string]float64),
		Reasons:         []string{},
		Recommendations: []string{},
		ProcessedAt:     time.Now(),
	}

	var totalScore float64
	var algorithmCount int

	for name, algorithm := range am.algorithms {
		if !am.enabled[name] {
			continue
		}

		score, err := algorithm.Analyze(ctx, transaction, DetectionRule(name))
		if err != nil {
			continue // Skip algorithms that fail
		}

		result.SetAlgorithmScore(name, score)
		totalScore += score
		algorithmCount++

		// Add reasons based on score
		if score >= algorithm.GetThreshold() {
			result.AddReason(algorithm.GetDescription() + " detected high risk")
		}
	}

	// Calculate average risk score
	if algorithmCount > 0 {
		result.RiskScore = totalScore / float64(algorithmCount)
	}

	// Determine if fraud based on global threshold
	result.IsFraud = result.RiskScore >= 0.7 // Default global threshold
	result.Confidence = result.RiskScore

	// Add recommendations
	if result.IsFraud {
		result.AddRecommendation("Review transaction manually")
		result.AddRecommendation("Consider additional verification")
	} else if result.RiskScore >= 0.5 {
		result.AddRecommendation("Monitor transaction closely")
	}

	return result, nil
}
