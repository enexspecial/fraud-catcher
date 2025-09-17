package algorithms

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	fraudcatcher "github.com/fraud-catcher/go"
)

// BehavioralConfig represents the configuration for the behavioral algorithm
type BehavioralConfig struct {
	EnableSpendingPatterns      bool    `json:"enable_spending_patterns"`
	EnableTransactionTiming     bool    `json:"enable_transaction_timing"`
	EnableLocationPatterns      bool    `json:"enable_location_patterns"`
	EnableDevicePatterns        bool    `json:"enable_device_patterns"`
	EnableVelocityAnalysis      bool    `json:"enable_velocity_analysis"`
	EnableMerchantPatterns      bool    `json:"enable_merchant_patterns"`
	EnablePaymentMethodPatterns bool    `json:"enable_payment_method_patterns"`
	PatternHistoryDays          int     `json:"pattern_history_days"`
	AnomalyThreshold            float64 `json:"anomaly_threshold"`
	EnableMachineLearning       bool    `json:"enable_machine_learning"`
	LearningRate                float64 `json:"learning_rate"`
	EnableAdaptiveThresholds    bool    `json:"enable_adaptive_thresholds"`
	EnableSeasonalAnalysis      bool    `json:"enable_seasonal_analysis"`
	EnableCrossUserAnalysis     bool    `json:"enable_cross_user_analysis"`
	MaxUserProfiles             int     `json:"max_user_profiles"`
	ProfileRetentionDays        int     `json:"profile_retention_days"`
}

// UserProfile represents a comprehensive user behavioral profile
type UserProfile struct {
	UserID            string                 `json:"user_id"`
	TransactionCount  int                    `json:"transaction_count"`
	TotalAmount       float64                `json:"total_amount"`
	AverageAmount     float64                `json:"average_amount"`
	MedianAmount      float64                `json:"median_amount"`
	StandardDeviation float64                `json:"standard_deviation"`
	SpendingPatterns  *SpendingPatterns      `json:"spending_patterns"`
	TimingPatterns    *TimingPatterns        `json:"timing_patterns"`
	LocationPatterns  *LocationPatterns      `json:"location_patterns"`
	DevicePatterns    *DevicePatterns        `json:"device_patterns"`
	MerchantPatterns  *MerchantPatterns      `json:"merchant_patterns"`
	PaymentPatterns   *PaymentPatterns       `json:"payment_patterns"`
	RiskIndicators    *RiskIndicators        `json:"risk_indicators"`
	LastUpdated       time.Time              `json:"last_updated"`
	CreatedAt         time.Time              `json:"created_at"`
	Metadata          map[string]interface{} `json:"metadata"`
}

// SpendingPatterns represents user spending behavior
type SpendingPatterns struct {
	DailySpending    map[string]float64 `json:"daily_spending"`
	WeeklySpending   map[string]float64 `json:"weekly_spending"`
	MonthlySpending  map[string]float64 `json:"monthly_spending"`
	SeasonalPatterns map[string]float64 `json:"seasonal_patterns"`
	AmountHistory    []float64          `json:"amount_history"`
}

// TimingPatterns represents user timing behavior
type TimingPatterns struct {
	PreferredHours       []int          `json:"preferred_hours"`
	WeekendActivity      float64        `json:"weekend_activity"`
	HolidayActivity      float64        `json:"holiday_activity"`
	TimezoneOffset       int            `json:"timezone_offset"`
	TransactionFrequency map[string]int `json:"transaction_frequency"`
	HourDistribution     map[int]int    `json:"hour_distribution"`
	DayDistribution      map[int]int    `json:"day_distribution"`
}

// LocationPatterns represents user location behavior
type LocationPatterns struct {
	HomeLocation        *fraudcatcher.Location   `json:"home_location"`
	FrequentLocations   map[string]*LocationData `json:"frequent_locations"`
	TravelPatterns      map[string]int           `json:"travel_patterns"`
	CountryDistribution map[string]int           `json:"country_distribution"`
	LocationHistory     []fraudcatcher.Location  `json:"location_history"`
}

// DevicePatterns represents user device behavior
type DevicePatterns struct {
	PrimaryDevice      string                 `json:"primary_device"`
	DeviceHistory      map[string]*DeviceData `json:"device_history"`
	UserAgentPatterns  map[string]int         `json:"user_agent_patterns"`
	IPAddressHistory   map[string]*IPData     `json:"ip_address_history"`
	DeviceVelocity     float64                `json:"device_velocity"`
	DeviceSharingScore float64                `json:"device_sharing_score"`
}

// MerchantPatterns represents user merchant behavior
type MerchantPatterns struct {
	PreferredMerchants   map[string]int     `json:"preferred_merchants"`
	CategoryDistribution map[string]int     `json:"category_distribution"`
	MerchantVelocity     map[string]float64 `json:"merchant_velocity"`
	MerchantRiskScores   map[string]float64 `json:"merchant_risk_scores"`
}

// PaymentPatterns represents user payment behavior
type PaymentPatterns struct {
	PreferredMethods   map[string]int     `json:"preferred_methods"`
	MethodDistribution map[string]int     `json:"method_distribution"`
	PaymentVelocity    map[string]float64 `json:"payment_velocity"`
	PaymentRiskScores  map[string]float64 `json:"payment_risk_scores"`
}

// RiskIndicators represents user risk indicators
type RiskIndicators struct {
	VelocityScore    float64   `json:"velocity_score"`
	AnomalyScore     float64   `json:"anomaly_score"`
	ConsistencyScore float64   `json:"consistency_score"`
	BehavioralScore  float64   `json:"behavioral_score"`
	LastCalculated   time.Time `json:"last_calculated"`
}

// LocationData represents location-specific data
type LocationData struct {
	Location    fraudcatcher.Location `json:"location"`
	Count       int                   `json:"count"`
	FirstSeen   time.Time             `json:"first_seen"`
	LastSeen    time.Time             `json:"last_seen"`
	TotalAmount float64               `json:"total_amount"`
}

// DeviceData represents device-specific data
type DeviceData struct {
	DeviceID    string    `json:"device_id"`
	Count       int       `json:"count"`
	FirstSeen   time.Time `json:"first_seen"`
	LastSeen    time.Time `json:"last_seen"`
	TotalAmount float64   `json:"total_amount"`
	IsTrusted   bool      `json:"is_trusted"`
}

// IPData represents IP-specific data
type IPData struct {
	IPAddress   string    `json:"ip_address"`
	Count       int       `json:"count"`
	FirstSeen   time.Time `json:"first_seen"`
	LastSeen    time.Time `json:"last_seen"`
	TotalAmount float64   `json:"total_amount"`
	IsTrusted   bool      `json:"is_trusted"`
}

// AnomalyDetectionResult represents the result of anomaly detection
type AnomalyDetectionResult struct {
	IsAnomaly    bool                   `json:"is_anomaly"`
	AnomalyScore float64                `json:"anomaly_score"`
	AnomalyType  string                 `json:"anomaly_type"`
	Confidence   float64                `json:"confidence"`
	Details      map[string]interface{} `json:"details"`
}

// BehavioralAlgorithm implements advanced behavioral fraud detection
type BehavioralAlgorithm struct {
	*fraudcatcher.BaseAlgorithm
	config       BehavioralConfig
	userProfiles map[string]*UserProfile
	mutex        sync.RWMutex
}

// NewBehavioralAlgorithm creates a new behavioral algorithm
func NewBehavioralAlgorithm(config BehavioralConfig) *BehavioralAlgorithm {
	base := fraudcatcher.NewBaseAlgorithm("behavioral", "Advanced behavioral pattern analysis and anomaly detection", 0.6)

	algorithm := &BehavioralAlgorithm{
		BaseAlgorithm: base,
		config:        config,
		userProfiles:  make(map[string]*UserProfile),
	}

	return algorithm
}

// Analyze analyzes a transaction for behavioral fraud
func (ba *BehavioralAlgorithm) Analyze(ctx context.Context, transaction fraudcatcher.Transaction, rule fraudcatcher.DetectionRule) (float64, error) {
	if !ba.IsEnabled() {
		return 0.0, nil
	}

	userID := transaction.UserID
	profile := ba.getUserProfile(userID)

	// Update profile with new transaction
	ba.updateUserProfile(profile, transaction)

	// Calculate comprehensive risk score
	riskScore := ba.calculateBehavioralRiskScore(profile, transaction)

	// Perform anomaly detection
	anomalyResult := ba.detectAnomalies(profile, transaction)
	if anomalyResult.IsAnomaly {
		riskScore += anomalyResult.AnomalyScore * 0.3
	}

	// Apply adaptive thresholds if enabled
	if ba.config.EnableAdaptiveThresholds {
		riskScore = ba.applyAdaptiveThresholds(profile, riskScore)
	}

	return math.Min(riskScore, 1.0), nil
}

// getUserProfile returns the user profile for the given user ID
func (ba *BehavioralAlgorithm) getUserProfile(userID string) *UserProfile {
	ba.mutex.Lock()
	defer ba.mutex.Unlock()

	profile, exists := ba.userProfiles[userID]
	if !exists {
		profile = &UserProfile{
			UserID: userID,
			SpendingPatterns: &SpendingPatterns{
				DailySpending:    make(map[string]float64),
				WeeklySpending:   make(map[string]float64),
				MonthlySpending:  make(map[string]float64),
				SeasonalPatterns: make(map[string]float64),
				AmountHistory:    []float64{},
			},
			TimingPatterns: &TimingPatterns{
				TransactionFrequency: make(map[string]int),
				HourDistribution:     make(map[int]int),
				DayDistribution:      make(map[int]int),
			},
			LocationPatterns: &LocationPatterns{
				FrequentLocations:   make(map[string]*LocationData),
				TravelPatterns:      make(map[string]int),
				CountryDistribution: make(map[string]int),
				LocationHistory:     []fraudcatcher.Location{},
			},
			DevicePatterns: &DevicePatterns{
				DeviceHistory:     make(map[string]*DeviceData),
				UserAgentPatterns: make(map[string]int),
				IPAddressHistory:  make(map[string]*IPData),
			},
			MerchantPatterns: &MerchantPatterns{
				PreferredMerchants:   make(map[string]int),
				CategoryDistribution: make(map[string]int),
				MerchantVelocity:     make(map[string]float64),
				MerchantRiskScores:   make(map[string]float64),
			},
			PaymentPatterns: &PaymentPatterns{
				PreferredMethods:   make(map[string]int),
				MethodDistribution: make(map[string]int),
				PaymentVelocity:    make(map[string]float64),
				PaymentRiskScores:  make(map[string]float64),
			},
			RiskIndicators: &RiskIndicators{
				LastCalculated: time.Now(),
			},
			CreatedAt: time.Now(),
			Metadata:  make(map[string]interface{}),
		}
		ba.userProfiles[userID] = profile
	}

	return profile
}

// updateUserProfile updates the user profile with new transaction data
func (ba *BehavioralAlgorithm) updateUserProfile(profile *UserProfile, transaction fraudcatcher.Transaction) {
	ba.mutex.Lock()
	defer ba.mutex.Unlock()

	now := time.Now()
	profile.TransactionCount++
	profile.TotalAmount += transaction.Amount
	profile.AverageAmount = profile.TotalAmount / float64(profile.TransactionCount)
	profile.LastUpdated = now

	// Update spending patterns
	if ba.config.EnableSpendingPatterns {
		ba.updateSpendingPatterns(profile, transaction, now)
	}

	// Update timing patterns
	if ba.config.EnableTransactionTiming {
		ba.updateTimingPatterns(profile, transaction, now)
	}

	// Update location patterns
	if ba.config.EnableLocationPatterns && transaction.Location != nil {
		ba.updateLocationPatterns(profile, *transaction.Location, transaction.Amount, now)
	}

	// Update device patterns
	if ba.config.EnableDevicePatterns {
		ba.updateDevicePatterns(profile, transaction, now)
	}

	// Update merchant patterns
	if ba.config.EnableMerchantPatterns && transaction.MerchantID != "" {
		ba.updateMerchantPatterns(profile, transaction, now)
	}

	// Update payment patterns
	if ba.config.EnablePaymentMethodPatterns && transaction.PaymentMethod != "" {
		ba.updatePaymentPatterns(profile, transaction, now)
	}

	// Update risk indicators
	ba.updateRiskIndicators(profile, transaction, now)
}

// updateSpendingPatterns updates spending pattern data
func (ba *BehavioralAlgorithm) updateSpendingPatterns(profile *UserProfile, transaction fraudcatcher.Transaction, now time.Time) {
	amount := transaction.Amount
	profile.SpendingPatterns.AmountHistory = append(profile.SpendingPatterns.AmountHistory, amount)

	// Update daily spending
	dayKey := now.Format("2006-01-02")
	profile.SpendingPatterns.DailySpending[dayKey] += amount

	// Update weekly spending
	weekKey := now.Format("2006-W01")
	profile.SpendingPatterns.WeeklySpending[weekKey] += amount

	// Update monthly spending
	monthKey := now.Format("2006-01")
	profile.SpendingPatterns.MonthlySpending[monthKey] += amount

	// Update seasonal patterns
	season := ba.getSeason(now)
	profile.SpendingPatterns.SeasonalPatterns[season] += amount

	// Calculate median and standard deviation
	profile.MedianAmount = ba.calculateMedian(profile.SpendingPatterns.AmountHistory)
	profile.StandardDeviation = ba.calculateStandardDeviation(profile.SpendingPatterns.AmountHistory, profile.AverageAmount)
}

// updateTimingPatterns updates timing pattern data
func (ba *BehavioralAlgorithm) updateTimingPatterns(profile *UserProfile, transaction fraudcatcher.Transaction, now time.Time) {
	hour := now.Hour()
	dayOfWeek := int(now.Weekday())

	profile.TimingPatterns.HourDistribution[hour]++
	profile.TimingPatterns.DayDistribution[dayOfWeek]++

	// Update weekend activity
	if dayOfWeek == 0 || dayOfWeek == 6 {
		profile.TimingPatterns.WeekendActivity++
	}

	// Update preferred hours
	if profile.TimingPatterns.HourDistribution[hour] > 3 {
		profile.TimingPatterns.PreferredHours = append(profile.TimingPatterns.PreferredHours, hour)
	}
}

// updateLocationPatterns updates location pattern data
func (ba *BehavioralAlgorithm) updateLocationPatterns(profile *UserProfile, location fraudcatcher.Location, amount float64, now time.Time) {
	locationKey := ba.getLocationKey(location)

	if locationData, exists := profile.LocationPatterns.FrequentLocations[locationKey]; exists {
		locationData.Count++
		locationData.LastSeen = now
		locationData.TotalAmount += amount
	} else {
		profile.LocationPatterns.FrequentLocations[locationKey] = &LocationData{
			Location:    location,
			Count:       1,
			FirstSeen:   now,
			LastSeen:    now,
			TotalAmount: amount,
		}
	}

	// Update country distribution
	if location.Country != "" {
		profile.LocationPatterns.CountryDistribution[location.Country]++
	}

	// Update location history
	profile.LocationPatterns.LocationHistory = append(profile.LocationPatterns.LocationHistory, location)

	// Set home location if not set and this is a frequent location
	if profile.LocationPatterns.HomeLocation == nil && profile.LocationPatterns.FrequentLocations[locationKey].Count >= 3 {
		profile.LocationPatterns.HomeLocation = &location
	}
}

// updateDevicePatterns updates device pattern data
func (ba *BehavioralAlgorithm) updateDevicePatterns(profile *UserProfile, transaction fraudcatcher.Transaction, now time.Time) {
	deviceID := transaction.DeviceID
	if deviceID == "" {
		return
	}

	if deviceData, exists := profile.DevicePatterns.DeviceHistory[deviceID]; exists {
		deviceData.Count++
		deviceData.LastSeen = now
		deviceData.TotalAmount += transaction.Amount
	} else {
		profile.DevicePatterns.DeviceHistory[deviceID] = &DeviceData{
			DeviceID:    deviceID,
			Count:       1,
			FirstSeen:   now,
			LastSeen:    now,
			TotalAmount: transaction.Amount,
			IsTrusted:   false,
		}
	}

	// Update user agent patterns
	if transaction.UserAgent != "" {
		profile.DevicePatterns.UserAgentPatterns[transaction.UserAgent]++
	}

	// Update IP address history
	if transaction.IPAddress != "" {
		if ipData, exists := profile.DevicePatterns.IPAddressHistory[transaction.IPAddress]; exists {
			ipData.Count++
			ipData.LastSeen = now
			ipData.TotalAmount += transaction.Amount
		} else {
			profile.DevicePatterns.IPAddressHistory[transaction.IPAddress] = &IPData{
				IPAddress:   transaction.IPAddress,
				Count:       1,
				FirstSeen:   now,
				LastSeen:    now,
				TotalAmount: transaction.Amount,
				IsTrusted:   false,
			}
		}
	}

	// Set primary device if not set
	if profile.DevicePatterns.PrimaryDevice == "" {
		profile.DevicePatterns.PrimaryDevice = deviceID
	}
}

// updateMerchantPatterns updates merchant pattern data
func (ba *BehavioralAlgorithm) updateMerchantPatterns(profile *UserProfile, transaction fraudcatcher.Transaction, now time.Time) {
	merchantID := transaction.MerchantID
	profile.MerchantPatterns.PreferredMerchants[merchantID]++

	// Update category distribution
	if transaction.Category != "" {
		profile.MerchantPatterns.CategoryDistribution[transaction.Category]++
	}
}

// updatePaymentPatterns updates payment pattern data
func (ba *BehavioralAlgorithm) updatePaymentPatterns(profile *UserProfile, transaction fraudcatcher.Transaction, now time.Time) {
	paymentMethod := transaction.PaymentMethod
	profile.PaymentPatterns.PreferredMethods[paymentMethod]++
}

// updateRiskIndicators updates risk indicators
func (ba *BehavioralAlgorithm) updateRiskIndicators(profile *UserProfile, transaction fraudcatcher.Transaction, now time.Time) {
	// Calculate velocity score
	if ba.config.EnableVelocityAnalysis {
		profile.RiskIndicators.VelocityScore = ba.calculateVelocityScore(profile, now)
	}

	// Calculate consistency score
	profile.RiskIndicators.ConsistencyScore = ba.calculateConsistencyScore(profile)

	// Calculate behavioral score
	profile.RiskIndicators.BehavioralScore = ba.calculateBehavioralScore(profile)

	profile.RiskIndicators.LastCalculated = now
}

// calculateBehavioralRiskScore calculates the overall behavioral risk score
func (ba *BehavioralAlgorithm) calculateBehavioralRiskScore(profile *UserProfile, transaction fraudcatcher.Transaction) float64 {
	riskScore := 0.0

	// Spending pattern analysis
	if ba.config.EnableSpendingPatterns {
		spendingRisk := ba.analyzeSpendingPatterns(profile, transaction)
		riskScore += spendingRisk * 0.3
	}

	// Timing pattern analysis
	if ba.config.EnableTransactionTiming {
		timingRisk := ba.analyzeTimingPatterns(profile, transaction)
		riskScore += timingRisk * 0.2
	}

	// Location pattern analysis
	if ba.config.EnableLocationPatterns && transaction.Location != nil {
		locationRisk := ba.analyzeLocationPatterns(profile, *transaction.Location)
		riskScore += locationRisk * 0.2
	}

	// Device pattern analysis
	if ba.config.EnableDevicePatterns {
		deviceRisk := ba.analyzeDevicePatterns(profile, transaction)
		riskScore += deviceRisk * 0.15
	}

	// Merchant pattern analysis
	if ba.config.EnableMerchantPatterns && transaction.MerchantID != "" {
		merchantRisk := ba.analyzeMerchantPatterns(profile, transaction)
		riskScore += merchantRisk * 0.1
	}

	// Payment pattern analysis
	if ba.config.EnablePaymentMethodPatterns && transaction.PaymentMethod != "" {
		paymentRisk := ba.analyzePaymentPatterns(profile, transaction)
		riskScore += paymentRisk * 0.05
	}

	return riskScore
}

// analyzeSpendingPatterns analyzes spending patterns for anomalies
func (ba *BehavioralAlgorithm) analyzeSpendingPatterns(profile *UserProfile, transaction fraudcatcher.Transaction) float64 {
	amount := transaction.Amount

	// Z-score analysis
	zScore := ba.calculateZScore(amount, profile.AverageAmount, profile.StandardDeviation)

	// Convert Z-score to risk score
	riskScore := ba.zScoreToRiskScore(zScore)

	// Percentile analysis
	percentile := ba.calculatePercentile(amount, profile.SpendingPatterns.AmountHistory)
	if percentile >= 95 {
		riskScore = math.Max(riskScore, 0.8)
	} else if percentile >= 90 {
		riskScore = math.Max(riskScore, 0.6)
	}

	return riskScore
}

// analyzeTimingPatterns analyzes timing patterns for anomalies
func (ba *BehavioralAlgorithm) analyzeTimingPatterns(profile *UserProfile, transaction fraudcatcher.Transaction) float64 {
	now := transaction.Timestamp
	hour := now.Hour()
	dayOfWeek := int(now.Weekday())

	// Check for unusual hours
	if !ba.isPreferredHour(profile, hour) {
		return 0.4
	}

	// Check for unusual days
	if !ba.isPreferredDay(profile, dayOfWeek) {
		return 0.3
	}

	return 0.0
}

// analyzeLocationPatterns analyzes location patterns for anomalies
func (ba *BehavioralAlgorithm) analyzeLocationPatterns(profile *UserProfile, location fraudcatcher.Location) float64 {
	locationKey := ba.getLocationKey(location)

	// Check if location is frequent
	if _, exists := profile.LocationPatterns.FrequentLocations[locationKey]; !exists {
		return 0.3 // New location
	}

	// Check country patterns
	if location.Country != "" {
		totalTransactions := profile.TransactionCount
		countryCount := profile.LocationPatterns.CountryDistribution[location.Country]
		countryFrequency := float64(countryCount) / float64(totalTransactions)

		if countryFrequency < 0.1 {
			return 0.4 // Rare country
		}
	}

	return 0.0
}

// analyzeDevicePatterns analyzes device patterns for anomalies
func (ba *BehavioralAlgorithm) analyzeDevicePatterns(profile *UserProfile, transaction fraudcatcher.Transaction) float64 {
	deviceID := transaction.DeviceID
	if deviceID == "" {
		return 0.2 // No device ID
	}

	// Check if device is known
	if _, exists := profile.DevicePatterns.DeviceHistory[deviceID]; !exists {
		return 0.3 // New device
	}

	// Check user agent patterns
	if transaction.UserAgent != "" {
		userAgentCount := profile.DevicePatterns.UserAgentPatterns[transaction.UserAgent]
		if userAgentCount == 0 {
			return 0.2 // New user agent
		}
	}

	return 0.0
}

// analyzeMerchantPatterns analyzes merchant patterns for anomalies
func (ba *BehavioralAlgorithm) analyzeMerchantPatterns(profile *UserProfile, transaction fraudcatcher.Transaction) float64 {
	merchantID := transaction.MerchantID
	merchantCount := profile.MerchantPatterns.PreferredMerchants[merchantID]

	if merchantCount == 0 {
		return 0.2 // New merchant
	}

	return 0.0
}

// analyzePaymentPatterns analyzes payment patterns for anomalies
func (ba *BehavioralAlgorithm) analyzePaymentPatterns(profile *UserProfile, transaction fraudcatcher.Transaction) float64 {
	paymentMethod := transaction.PaymentMethod
	methodCount := profile.PaymentPatterns.PreferredMethods[paymentMethod]

	if methodCount == 0 {
		return 0.1 // New payment method
	}

	return 0.0
}

// detectAnomalies performs comprehensive anomaly detection
func (ba *BehavioralAlgorithm) detectAnomalies(profile *UserProfile, transaction fraudcatcher.Transaction) *AnomalyDetectionResult {
	result := &AnomalyDetectionResult{
		IsAnomaly: false,
		Details:   make(map[string]interface{}),
	}

	// Spending anomaly
	if ba.config.EnableSpendingPatterns {
		spendingAnomaly := ba.detectSpendingAnomaly(profile, transaction)
		if spendingAnomaly.IsAnomaly {
			result.IsAnomaly = true
			result.AnomalyScore = math.Max(result.AnomalyScore, spendingAnomaly.AnomalyScore)
			result.Details["spending_anomaly"] = spendingAnomaly
		}
	}

	// Timing anomaly
	if ba.config.EnableTransactionTiming {
		timingAnomaly := ba.detectTimingAnomaly(profile, transaction)
		if timingAnomaly.IsAnomaly {
			result.IsAnomaly = true
			result.AnomalyScore = math.Max(result.AnomalyScore, timingAnomaly.AnomalyScore)
			result.Details["timing_anomaly"] = timingAnomaly
		}
	}

	// Location anomaly
	if ba.config.EnableLocationPatterns && transaction.Location != nil {
		locationAnomaly := ba.detectLocationAnomaly(profile, *transaction.Location)
		if locationAnomaly.IsAnomaly {
			result.IsAnomaly = true
			result.AnomalyScore = math.Max(result.AnomalyScore, locationAnomaly.AnomalyScore)
			result.Details["location_anomaly"] = locationAnomaly
		}
	}

	return result
}

// detectSpendingAnomaly detects spending anomalies
func (ba *BehavioralAlgorithm) detectSpendingAnomaly(profile *UserProfile, transaction fraudcatcher.Transaction) *AnomalyDetectionResult {
	amount := transaction.Amount
	zScore := ba.calculateZScore(amount, profile.AverageAmount, profile.StandardDeviation)

	if math.Abs(zScore) > 3 {
		return &AnomalyDetectionResult{
			IsAnomaly:    true,
			AnomalyScore: 0.9,
			AnomalyType:  "spending",
			Confidence:   0.9,
			Details: map[string]interface{}{
				"z_score": zScore,
				"amount":  amount,
				"mean":    profile.AverageAmount,
				"std_dev": profile.StandardDeviation,
			},
		}
	}

	return &AnomalyDetectionResult{IsAnomaly: false}
}

// detectTimingAnomaly detects timing anomalies
func (ba *BehavioralAlgorithm) detectTimingAnomaly(profile *UserProfile, transaction fraudcatcher.Transaction) *AnomalyDetectionResult {
	now := transaction.Timestamp
	hour := now.Hour()

	// Check for unusual hours
	if !ba.isPreferredHour(profile, hour) {
		return &AnomalyDetectionResult{
			IsAnomaly:    true,
			AnomalyScore: 0.6,
			AnomalyType:  "timing",
			Confidence:   0.7,
			Details: map[string]interface{}{
				"hour":            hour,
				"preferred_hours": profile.TimingPatterns.PreferredHours,
			},
		}
	}

	return &AnomalyDetectionResult{IsAnomaly: false}
}

// detectLocationAnomaly detects location anomalies
func (ba *BehavioralAlgorithm) detectLocationAnomaly(profile *UserProfile, location fraudcatcher.Location) *AnomalyDetectionResult {
	locationKey := ba.getLocationKey(location)

	// Check if location is completely new
	if _, exists := profile.LocationPatterns.FrequentLocations[locationKey]; !exists {
		return &AnomalyDetectionResult{
			IsAnomaly:    true,
			AnomalyScore: 0.5,
			AnomalyType:  "location",
			Confidence:   0.6,
			Details: map[string]interface{}{
				"location": location,
				"is_new":   true,
			},
		}
	}

	return &AnomalyDetectionResult{IsAnomaly: false}
}

// Helper methods
func (ba *BehavioralAlgorithm) calculateZScore(value, mean, stdDev float64) float64 {
	if stdDev == 0 {
		return 0
	}
	return (value - mean) / stdDev
}

func (ba *BehavioralAlgorithm) zScoreToRiskScore(zScore float64) float64 {
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

func (ba *BehavioralAlgorithm) calculatePercentile(value float64, values []float64) float64 {
	if len(values) == 0 {
		return 0
	}

	count := 0
	for _, v := range values {
		if v <= value {
			count++
		}
	}

	return float64(count) / float64(len(values)) * 100
}

func (ba *BehavioralAlgorithm) calculateMedian(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}

	// Simple bubble sort (in production, use more efficient sorting)
	sorted := make([]float64, len(values))
	copy(sorted, values)

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

func (ba *BehavioralAlgorithm) calculateStandardDeviation(values []float64, mean float64) float64 {
	if len(values) <= 1 {
		return 0
	}

	var sumSquaredDiffs float64
	for _, value := range values {
		diff := value - mean
		sumSquaredDiffs += diff * diff
	}

	variance := sumSquaredDiffs / float64(len(values)-1)
	return math.Sqrt(variance)
}

func (ba *BehavioralAlgorithm) getSeason(now time.Time) string {
	month := now.Month()
	switch {
	case month >= 3 && month <= 5:
		return "spring"
	case month >= 6 && month <= 8:
		return "summer"
	case month >= 9 && month <= 11:
		return "autumn"
	default:
		return "winter"
	}
}

func (ba *BehavioralAlgorithm) isPreferredHour(profile *UserProfile, hour int) bool {
	for _, preferredHour := range profile.TimingPatterns.PreferredHours {
		if preferredHour == hour {
			return true
		}
	}
	return false
}

func (ba *BehavioralAlgorithm) isPreferredDay(profile *UserProfile, dayOfWeek int) bool {
	dayCount := profile.TimingPatterns.DayDistribution[dayOfWeek]
	totalCount := 0
	for _, count := range profile.TimingPatterns.DayDistribution {
		totalCount += count
	}

	if totalCount == 0 {
		return true
	}

	frequency := float64(dayCount) / float64(totalCount)
	return frequency > 0.1 // At least 10% of transactions on this day
}

func (ba *BehavioralAlgorithm) getLocationKey(location fraudcatcher.Location) string {
	lat := math.Round(location.Lat*100) / 100
	lng := math.Round(location.Lng*100) / 100
	return fmt.Sprintf("%.2f,%.2f", lat, lng)
}

func (ba *BehavioralAlgorithm) calculateVelocityScore(profile *UserProfile, now time.Time) float64 {
	// Calculate transactions per hour in the last 24 hours
	recentTransactions := 0
	for _, amount := range profile.SpendingPatterns.AmountHistory {
		// Simplified - in production, you'd track timestamps
		recentTransactions++
	}

	velocity := float64(recentTransactions) / 24.0 // Transactions per hour
	return math.Min(velocity/10.0, 1.0)            // Normalize to 0-1
}

func (ba *BehavioralAlgorithm) calculateConsistencyScore(profile *UserProfile) float64 {
	// Calculate consistency based on spending patterns
	if len(profile.SpendingPatterns.AmountHistory) < 5 {
		return 0.5 // Not enough data
	}

	// Calculate coefficient of variation
	cv := profile.StandardDeviation / profile.AverageAmount
	return math.Max(0, 1-cv) // Higher consistency = lower CV
}

func (ba *BehavioralAlgorithm) calculateBehavioralScore(profile *UserProfile) float64 {
	// Combine various behavioral indicators
	velocityScore := profile.RiskIndicators.VelocityScore
	consistencyScore := profile.RiskIndicators.ConsistencyScore

	return (velocityScore + consistencyScore) / 2
}

func (ba *BehavioralAlgorithm) applyAdaptiveThresholds(profile *UserProfile, riskScore float64) float64 {
	// Adjust risk score based on user's historical behavior
	behavioralScore := profile.RiskIndicators.BehavioralScore

	// If user has consistent behavior, reduce risk score
	if behavioralScore > 0.7 {
		riskScore *= 0.8
	}

	// If user has inconsistent behavior, increase risk score
	if behavioralScore < 0.3 {
		riskScore *= 1.2
	}

	return math.Min(riskScore, 1.0)
}

// GetUserProfile returns the user profile for a given user ID
func (ba *BehavioralAlgorithm) GetUserProfile(userID string) *UserProfile {
	ba.mutex.RLock()
	defer ba.mutex.RUnlock()
	return ba.userProfiles[userID]
}

// GetStats returns statistics for the behavioral algorithm
func (ba *BehavioralAlgorithm) GetStats() map[string]interface{} {
	ba.mutex.RLock()
	defer ba.mutex.RUnlock()

	stats := ba.BaseAlgorithm.GetStats()
	stats["user_profiles_count"] = len(ba.userProfiles)
	stats["config"] = ba.config

	return stats
}

// Reset resets the algorithm state
func (ba *BehavioralAlgorithm) Reset() error {
	ba.mutex.Lock()
	defer ba.mutex.Unlock()

	ba.userProfiles = make(map[string]*UserProfile)
	return nil
}
