package algorithms

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	fraudcatcher "github.com/fraud-catcher/go"
)

// TimeConfig represents the configuration for the time algorithm
type TimeConfig struct {
	SuspiciousHours        []int       `json:"suspicious_hours"`
	WeekendRiskMultiplier  float64     `json:"weekend_risk_multiplier"`
	HolidayRiskMultiplier  float64     `json:"holiday_risk_multiplier"`
	TimezoneThreshold      int         `json:"timezone_threshold"`
	EnableHolidayDetection bool        `json:"enable_holiday_detection"`
	CustomHolidays         []time.Time `json:"custom_holidays"`
	EnableUserTimeProfiles bool        `json:"enable_user_time_profiles"`
}

// TimePattern represents a time pattern for analysis
type TimePattern struct {
	Hour      int     `json:"hour"`
	DayOfWeek int     `json:"day_of_week"`
	IsWeekend bool    `json:"is_weekend"`
	IsHoliday bool    `json:"is_holiday"`
	Timezone  string  `json:"timezone"`
	RiskScore float64 `json:"risk_score"`
}

// UserTimeProfile represents a user's time-based transaction profile
type UserTimeProfile struct {
	UserID           string        `json:"user_id"`
	TransactionCount int           `json:"transaction_count"`
	HourDistribution map[int]int   `json:"hour_distribution"`
	DayDistribution  map[int]int   `json:"day_distribution"`
	WeekendActivity  int           `json:"weekend_activity"`
	HolidayActivity  int           `json:"holiday_activity"`
	PreferredHours   []int         `json:"preferred_hours"`
	LastTransaction  time.Time     `json:"last_transaction"`
	TimePatterns     []TimePattern `json:"time_patterns"`
	LastUpdated      int64         `json:"last_updated"`
}

// TimeAlgorithm implements fraud detection based on transaction timing
type TimeAlgorithm struct {
	*fraudcatcher.BaseAlgorithm
	config       TimeConfig
	userProfiles map[string]*UserTimeProfile
	holidays     map[string]bool
	mutex        sync.RWMutex
}

// NewTimeAlgorithm creates a new time algorithm
func NewTimeAlgorithm(config TimeConfig) *TimeAlgorithm {
	base := fraudcatcher.NewBaseAlgorithm("time", "Detects suspicious transaction timing patterns", 0.6)

	algorithm := &TimeAlgorithm{
		BaseAlgorithm: base,
		config:        config,
		userProfiles:  make(map[string]*UserTimeProfile),
		holidays:      make(map[string]bool),
	}

	algorithm.initializeHolidays()
	return algorithm
}

// Analyze analyzes a transaction for time-based fraud
func (ta *TimeAlgorithm) Analyze(ctx context.Context, transaction fraudcatcher.Transaction, rule fraudcatcher.DetectionRule) (float64, error) {
	if !ta.IsEnabled() {
		return 0.0, nil
	}

	transactionTime := transaction.Timestamp
	timePattern := ta.analyzeTimePattern(transactionTime, transaction)

	riskScore := 0.0

	// Check for suspicious hours
	if ta.isSuspiciousHour(timePattern.Hour) {
		riskScore += 0.4
	}

	// Check for weekend transactions
	if timePattern.IsWeekend {
		riskScore += 0.2 * ta.config.WeekendRiskMultiplier
	}

	// Check for holiday transactions
	if timePattern.IsHoliday {
		riskScore += 0.3 * ta.config.HolidayRiskMultiplier
	}

	// Check for unusual time patterns for this user
	if ta.config.EnableUserTimeProfiles {
		userPatternRisk := ta.analyzeUserTimePattern(transaction.UserID, timePattern)
		riskScore += userPatternRisk
	}

	// Check for timezone anomalies
	timezoneRisk := ta.analyzeTimezoneAnomaly(transaction, timePattern)
	riskScore += timezoneRisk

	// Store pattern for future analysis
	ta.storeUserTimePattern(transaction.UserID, timePattern)

	return math.Min(riskScore, 1.0), nil
}

// analyzeTimePattern analyzes the time pattern of a transaction
func (ta *TimeAlgorithm) analyzeTimePattern(transactionTime time.Time, transaction fraudcatcher.Transaction) TimePattern {
	hour := transactionTime.Hour()
	dayOfWeek := int(transactionTime.Weekday())
	isWeekend := dayOfWeek == 0 || dayOfWeek == 6 // Sunday or Saturday
	isHoliday := ta.isHoliday(transactionTime)
	timezone := ta.extractTimezone(transaction)

	return TimePattern{
		Hour:      hour,
		DayOfWeek: dayOfWeek,
		IsWeekend: isWeekend,
		IsHoliday: isHoliday,
		Timezone:  timezone,
		RiskScore: 0.0,
	}
}

// isSuspiciousHour checks if an hour is considered suspicious
func (ta *TimeAlgorithm) isSuspiciousHour(hour int) bool {
	for _, suspiciousHour := range ta.config.SuspiciousHours {
		if hour == suspiciousHour {
			return true
		}
	}
	return false
}

// analyzeUserTimePattern analyzes user-specific time patterns
func (ta *TimeAlgorithm) analyzeUserTimePattern(userID string, currentPattern TimePattern) float64 {
	profile := ta.getUserProfile(userID)

	if profile.TransactionCount == 0 {
		return 0.1 // Slight risk for first transaction
	}

	// Analyze frequency of transactions at this time
	similarPatterns := ta.findSimilarPatterns(profile, currentPattern)

	totalPatterns := len(profile.TimePatterns)
	similarCount := len(similarPatterns)
	frequency := float64(similarCount) / float64(totalPatterns)

	// If user rarely transacts at this time, it's suspicious
	if frequency < 0.1 {
		return 0.3
	} else if frequency < 0.3 {
		return 0.1
	}

	return 0.0
}

// findSimilarPatterns finds patterns similar to the current pattern
func (ta *TimeAlgorithm) findSimilarPatterns(profile *UserTimeProfile, currentPattern TimePattern) []TimePattern {
	var similar []TimePattern

	for _, pattern := range profile.TimePatterns {
		if pattern.Hour == currentPattern.Hour && pattern.DayOfWeek == currentPattern.DayOfWeek {
			similar = append(similar, pattern)
		}
	}

	return similar
}

// analyzeTimezoneAnomaly analyzes timezone-related anomalies
func (ta *TimeAlgorithm) analyzeTimezoneAnomaly(transaction fraudcatcher.Transaction, timePattern TimePattern) float64 {
	if transaction.Location == nil {
		return 0.0 // No location data
	}

	// Extract timezone from location or transaction metadata
	expectedTimezone := ta.getTimezoneFromLocation(transaction.Location)
	actualTimezone := timePattern.Timezone

	if expectedTimezone != "" && actualTimezone != "" {
		timezoneDiff := ta.calculateTimezoneDifference(expectedTimezone, actualTimezone)
		if timezoneDiff > ta.config.TimezoneThreshold {
			return 0.4 // High risk for timezone mismatch
		}
	}

	return 0.0
}

// extractTimezone extracts timezone from transaction
func (ta *TimeAlgorithm) extractTimezone(transaction fraudcatcher.Transaction) string {
	// Try to extract timezone from metadata
	if transaction.Metadata != nil {
		if tz, exists := transaction.Metadata["timezone"]; exists {
			if tzStr, ok := tz.(string); ok {
				return tzStr
			}
		}
	}

	// Try to extract from location
	if transaction.Location != nil && transaction.Location.Country != "" {
		return ta.getCountryTimezone(transaction.Location.Country)
	}

	// Default to UTC
	return "UTC"
}

// getTimezoneFromLocation gets timezone from location
func (ta *TimeAlgorithm) getTimezoneFromLocation(location *fraudcatcher.Location) string {
	if location.Country != "" {
		return ta.getCountryTimezone(location.Country)
	}
	return ""
}

// getCountryTimezone returns timezone for a country
func (ta *TimeAlgorithm) getCountryTimezone(country string) string {
	timezoneMap := map[string]string{
		"US": "America/New_York",
		"GB": "Europe/London",
		"DE": "Europe/Berlin",
		"FR": "Europe/Paris",
		"JP": "Asia/Tokyo",
		"AU": "Australia/Sydney",
		"CA": "America/Toronto",
		"BR": "America/Sao_Paulo",
		"IN": "Asia/Kolkata",
		"CN": "Asia/Shanghai",
	}

	return timezoneMap[country]
}

// calculateTimezoneDifference calculates timezone difference in hours
func (ta *TimeAlgorithm) calculateTimezoneDifference(tz1, tz2 string) int {
	timezoneOffsets := map[string]int{
		"UTC":               0,
		"America/New_York":  -5,
		"Europe/London":     0,
		"Europe/Berlin":     1,
		"Europe/Paris":      1,
		"Asia/Tokyo":        9,
		"Australia/Sydney":  10,
		"America/Toronto":   -5,
		"America/Sao_Paulo": -3,
		"Asia/Kolkata":      5,
		"Asia/Shanghai":     8,
	}

	offset1 := timezoneOffsets[tz1]
	offset2 := timezoneOffsets[tz2]

	diff := offset1 - offset2
	if diff < 0 {
		diff = -diff
	}

	return diff
}

// isHoliday checks if a date is a holiday
func (ta *TimeAlgorithm) isHoliday(date time.Time) bool {
	if !ta.config.EnableHolidayDetection {
		return false
	}

	dateStr := date.Format("2006-01-02")

	// Check custom holidays
	for _, holiday := range ta.config.CustomHolidays {
		if holiday.Format("2006-01-02") == dateStr {
			return true
		}
	}

	// Check built-in holidays
	return ta.holidays[dateStr]
}

// initializeHolidays initializes built-in holidays
func (ta *TimeAlgorithm) initializeHolidays() {
	if !ta.config.EnableHolidayDetection {
		return
	}

	currentYear := time.Now().Year()
	holidays := []string{
		"2006-01-01", // New Year's Day
		"2006-12-25", // Christmas
		"2006-12-31", // New Year's Eve
	}

	for _, holiday := range holidays {
		// Replace year with current year
		holidayWithYear := holiday
		if holiday[0:4] == "2006" {
			holidayWithYear = time.Now().Format("2006") + holiday[4:]
		}
		ta.holidays[holidayWithYear] = true
	}
}

// getUserProfile returns the user profile for the given user ID
func (ta *TimeAlgorithm) getUserProfile(userID string) *UserTimeProfile {
	ta.mutex.Lock()
	defer ta.mutex.Unlock()

	profile, exists := ta.userProfiles[userID]
	if !exists {
		profile = &UserTimeProfile{
			UserID:           userID,
			HourDistribution: make(map[int]int),
			DayDistribution:  make(map[int]int),
			TimePatterns:     []TimePattern{},
			LastUpdated:      0,
		}
		ta.userProfiles[userID] = profile
	}

	return profile
}

// storeUserTimePattern stores a time pattern for a user
func (ta *TimeAlgorithm) storeUserTimePattern(userID string, pattern TimePattern) {
	profile := ta.getUserProfile(userID)

	ta.mutex.Lock()
	defer ta.mutex.Unlock()

	profile.TransactionCount++
	profile.HourDistribution[pattern.Hour]++
	profile.DayDistribution[pattern.DayOfWeek]++

	if pattern.IsWeekend {
		profile.WeekendActivity++
	}

	if pattern.IsHoliday {
		profile.HolidayActivity++
	}

	profile.TimePatterns = append(profile.TimePatterns, pattern)
	profile.LastTransaction = time.Now()
	profile.LastUpdated = time.Now().Unix()

	// Keep only last 100 patterns per user to manage memory
	if len(profile.TimePatterns) > 100 {
		profile.TimePatterns = profile.TimePatterns[len(profile.TimePatterns)-100:]
	}
}

// IsSuspiciousTime checks if a time is suspicious
func (ta *TimeAlgorithm) IsSuspiciousTime(hour int, dayOfWeek int) bool {
	return ta.isSuspiciousHour(hour) || (dayOfWeek == 0 || dayOfWeek == 6)
}

// GetTimeRiskLevel returns the risk level for a time
func (ta *TimeAlgorithm) GetTimeRiskLevel(hour int, dayOfWeek int) fraudcatcher.RiskLevel {
	if ta.isSuspiciousHour(hour) {
		return fraudcatcher.RiskHigh
	}

	if dayOfWeek == 0 || dayOfWeek == 6 {
		return fraudcatcher.RiskMedium
	}

	return fraudcatcher.RiskLow
}

// GetUserTimeProfile returns the user time profile
func (ta *TimeAlgorithm) GetUserTimeProfile(userID string) *UserTimeProfile {
	ta.mutex.RLock()
	defer ta.mutex.RUnlock()
	return ta.userProfiles[userID]
}

// GetMostCommonTransactionTime returns the most common transaction time for a user
func (ta *TimeAlgorithm) GetMostCommonTransactionTime(userID string) (int, int) {
	profile := ta.GetUserTimeProfile(userID)
	if profile == nil || len(profile.TimePatterns) == 0 {
		return -1, -1
	}

	timeCounts := make(map[string]int)

	for _, pattern := range profile.TimePatterns {
		key := fmt.Sprintf("%d-%d", pattern.Hour, pattern.DayOfWeek)
		timeCounts[key]++
	}

	maxCount := 0
	var mostCommon string

	for key, count := range timeCounts {
		if count > maxCount {
			maxCount = count
			mostCommon = key
		}
	}

	if mostCommon == "" {
		return -1, -1
	}

	// Parse the key back to hour and day
	var hour, day int
	fmt.Sscanf(mostCommon, "%d-%d", &hour, &day)
	return hour, day
}

// GetStats returns statistics for the time algorithm
func (ta *TimeAlgorithm) GetStats() map[string]interface{} {
	ta.mutex.RLock()
	defer ta.mutex.RUnlock()

	stats := ta.BaseAlgorithm.GetStats()
	stats["user_profiles_count"] = len(ta.userProfiles)
	stats["holidays_count"] = len(ta.holidays)
	stats["config"] = ta.config

	return stats
}

// Reset resets the algorithm state
func (ta *TimeAlgorithm) Reset() error {
	ta.mutex.Lock()
	defer ta.mutex.Unlock()

	ta.userProfiles = make(map[string]*UserTimeProfile)
	return nil
}
