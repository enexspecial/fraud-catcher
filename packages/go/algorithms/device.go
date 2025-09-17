package algorithms

import (
	"context"
	"crypto/md5"
	"fmt"
	"math"
	"sync"
	"time"

	fraudcatcher "github.com/fraud-catcher/go"
)

// DeviceConfig represents the configuration for the device algorithm
type DeviceConfig struct {
	EnableFingerprinting      bool    `json:"enable_fingerprinting"`
	SuspiciousDeviceThreshold float64 `json:"suspicious_device_threshold"`
	NewDeviceRiskMultiplier   float64 `json:"new_device_risk_multiplier"`
	DeviceVelocityWindow      int     `json:"device_velocity_window"`
	MaxDevicesPerUser         int     `json:"max_devices_per_user"`
	EnableDeviceReputation    bool    `json:"enable_device_reputation"`
	EnableDeviceClustering    bool    `json:"enable_device_clustering"`
	EnableCrossUserAnalysis   bool    `json:"enable_cross_user_analysis"`
	DeviceSharingThreshold    float64 `json:"device_sharing_threshold"`
}

// DeviceFingerprint represents a device fingerprint
type DeviceFingerprint struct {
	DeviceID         string                 `json:"device_id"`
	UserAgent        string                 `json:"user_agent"`
	IPAddress        string                 `json:"ip_address"`
	ScreenResolution string                 `json:"screen_resolution"`
	Timezone         string                 `json:"timezone"`
	Language         string                 `json:"language"`
	Platform         string                 `json:"platform"`
	FirstSeen        time.Time              `json:"first_seen"`
	LastSeen         time.Time              `json:"last_seen"`
	TransactionCount int                    `json:"transaction_count"`
	TotalAmount      float64                `json:"total_amount"`
	IsTrusted        bool                   `json:"is_trusted"`
	RiskScore        float64                `json:"risk_score"`
	Metadata         map[string]interface{} `json:"metadata"`
}

// DeviceProfile represents a user's device profile
type DeviceProfile struct {
	UserID            string                        `json:"user_id"`
	DeviceCount       int                           `json:"device_count"`
	PrimaryDevice     string                        `json:"primary_device"`
	DeviceHistory     map[string]*DeviceFingerprint `json:"device_history"`
	UserAgentPatterns map[string]int                `json:"user_agent_patterns"`
	IPAddressHistory  map[string]*IPData            `json:"ip_address_history"`
	LastDevice        string                        `json:"last_device"`
	LastTransaction   time.Time                     `json:"last_transaction"`
	LastUpdated       int64                         `json:"last_updated"`
}

// IPData represents data for an IP address
type IPData struct {
	IPAddress        string    `json:"ip_address"`
	FirstSeen        time.Time `json:"first_seen"`
	LastSeen         time.Time `json:"last_seen"`
	TransactionCount int       `json:"transaction_count"`
	TotalAmount      float64   `json:"total_amount"`
	IsTrusted        bool      `json:"is_trusted"`
}

// DeviceAlgorithm implements fraud detection based on device information
type DeviceAlgorithm struct {
	*fraudcatcher.BaseAlgorithm
	config             DeviceConfig
	deviceFingerprints map[string]*DeviceFingerprint
	userDevices        map[string]map[string]bool
	deviceUsers        map[string]map[string]bool
	userProfiles       map[string]*DeviceProfile
	mutex              sync.RWMutex
}

// NewDeviceAlgorithm creates a new device algorithm
func NewDeviceAlgorithm(config DeviceConfig) *DeviceAlgorithm {
	base := fraudcatcher.NewBaseAlgorithm("device", "Detects suspicious device patterns and device sharing", 0.5)

	algorithm := &DeviceAlgorithm{
		BaseAlgorithm:      base,
		config:             config,
		deviceFingerprints: make(map[string]*DeviceFingerprint),
		userDevices:        make(map[string]map[string]bool),
		deviceUsers:        make(map[string]map[string]bool),
		userProfiles:       make(map[string]*DeviceProfile),
	}

	return algorithm
}

// Analyze analyzes a transaction for device-based fraud
func (da *DeviceAlgorithm) Analyze(ctx context.Context, transaction fraudcatcher.Transaction, rule fraudcatcher.DetectionRule) (float64, error) {
	if !da.IsEnabled() {
		return 0.0, nil
	}

	if transaction.DeviceID == "" && transaction.UserAgent == "" && transaction.IPAddress == "" {
		return 0.0, nil // No device data available
	}

	deviceID := da.getOrCreateDeviceID(transaction)
	fingerprint := da.createFingerprint(transaction, deviceID)

	riskScore := 0.0

	// Check if device is new or suspicious
	existingFingerprint, exists := da.deviceFingerprints[deviceID]

	if !exists {
		// New device - check if user has too many devices
		userDeviceCount := da.getUserDeviceCount(transaction.UserID)
		if userDeviceCount >= da.config.MaxDevicesPerUser {
			riskScore += 0.6 // High risk for too many devices
		} else {
			riskScore += 0.3 * da.config.NewDeviceRiskMultiplier // Medium risk for new device
		}

		// Store new device
		da.deviceFingerprints[deviceID] = fingerprint
		da.addUserDevice(transaction.UserID, deviceID)
	} else {
		// Existing device - check for anomalies
		deviceRisk := da.calculateDeviceRisk(existingFingerprint, fingerprint)
		riskScore += deviceRisk

		// Update device fingerprint
		da.updateDeviceFingerprint(deviceID, transaction)
	}

	// Check device velocity (transactions per device)
	deviceVelocity := da.calculateDeviceVelocity(deviceID)
	if deviceVelocity > da.config.SuspiciousDeviceThreshold {
		riskScore += 0.4
	}

	// Check for device sharing patterns
	if da.config.EnableCrossUserAnalysis {
		sharingRisk := da.calculateDeviceSharingRisk(deviceID, transaction.UserID)
		riskScore += sharingRisk
	}

	// Update user profile
	da.updateUserProfile(transaction.UserID, deviceID, transaction)

	return math.Min(riskScore, 1.0), nil
}

// getOrCreateDeviceID gets or creates a device ID for the transaction
func (da *DeviceAlgorithm) getOrCreateDeviceID(transaction fraudcatcher.Transaction) string {
	if transaction.DeviceID != "" {
		return transaction.DeviceID
	}

	// Generate device ID from available data
	components := []string{
		transaction.UserAgent,
		transaction.IPAddress,
	}

	if transaction.Metadata != nil {
		if screenRes, exists := transaction.Metadata["screen_resolution"]; exists {
			components = append(components, fmt.Sprintf("%v", screenRes))
		}
	}

	hash := md5.Sum([]byte(fmt.Sprintf("%v", components)))
	return fmt.Sprintf("device_%x", hash)
}

// createFingerprint creates a device fingerprint from transaction data
func (da *DeviceAlgorithm) createFingerprint(transaction fraudcatcher.Transaction, deviceID string) *DeviceFingerprint {
	now := time.Now()

	fingerprint := &DeviceFingerprint{
		DeviceID:         deviceID,
		UserAgent:        transaction.UserAgent,
		IPAddress:        transaction.IPAddress,
		FirstSeen:        now,
		LastSeen:         now,
		TransactionCount: 1,
		TotalAmount:      transaction.Amount,
		IsTrusted:        false,
		RiskScore:        0.0,
		Metadata:         make(map[string]interface{}),
	}

	// Extract additional data from metadata
	if transaction.Metadata != nil {
		if screenRes, exists := transaction.Metadata["screen_resolution"]; exists {
			fingerprint.ScreenResolution = fmt.Sprintf("%v", screenRes)
		}
		if timezone, exists := transaction.Metadata["timezone"]; exists {
			fingerprint.Timezone = fmt.Sprintf("%v", timezone)
		}
		if language, exists := transaction.Metadata["language"]; exists {
			fingerprint.Language = fmt.Sprintf("%v", language)
		}
		if platform, exists := transaction.Metadata["platform"]; exists {
			fingerprint.Platform = fmt.Sprintf("%v", platform)
		}
	}

	return fingerprint
}

// calculateDeviceRisk calculates risk based on device fingerprint changes
func (da *DeviceAlgorithm) calculateDeviceRisk(existing, current *DeviceFingerprint) float64 {
	riskScore := 0.0

	// Check for device fingerprint changes
	if existing.UserAgent != current.UserAgent {
		riskScore += 0.3 // User agent changed
	}

	if existing.IPAddress != current.IPAddress {
		riskScore += 0.2 // IP address changed
	}

	if existing.ScreenResolution != current.ScreenResolution {
		riskScore += 0.1 // Screen resolution changed
	}

	if existing.Timezone != current.Timezone {
		riskScore += 0.1 // Timezone changed
	}

	// Check for rapid device changes
	timeDiff := current.LastSeen.Sub(existing.LastSeen)
	if timeDiff < time.Minute {
		riskScore += 0.2 // Rapid device switching
	}

	return math.Min(riskScore, 0.8)
}

// calculateDeviceVelocity calculates the velocity of transactions per device
func (da *DeviceAlgorithm) calculateDeviceVelocity(deviceID string) float64 {
	fingerprint, exists := da.deviceFingerprints[deviceID]
	if !exists {
		return 0
	}

	timeWindow := time.Duration(da.config.DeviceVelocityWindow) * time.Minute
	timeDiff := time.Since(fingerprint.FirstSeen)

	if timeDiff < timeWindow {
		return float64(fingerprint.TransactionCount) / timeDiff.Minutes() // Transactions per minute
	}

	return 0
}

// calculateDeviceSharingRisk calculates risk based on device sharing patterns
func (da *DeviceAlgorithm) calculateDeviceSharingRisk(deviceID, userID string) float64 {
	da.mutex.RLock()
	defer da.mutex.RUnlock()

	deviceUsers, exists := da.deviceUsers[deviceID]
	if !exists {
		return 0.0
	}

	userCount := len(deviceUsers)
	if userCount > 1 {
		// Device is used by multiple users
		sharingRatio := float64(userCount-1) / float64(userCount)
		if sharingRatio > da.config.DeviceSharingThreshold {
			return 0.5 // High risk for device sharing
		}
		return 0.2 // Medium risk for device sharing
	}

	return 0.0
}

// getUserDeviceCount returns the number of devices for a user
func (da *DeviceAlgorithm) getUserDeviceCount(userID string) int {
	da.mutex.RLock()
	defer da.mutex.RUnlock()

	devices, exists := da.userDevices[userID]
	if !exists {
		return 0
	}

	return len(devices)
}

// addUserDevice adds a device to a user's device list
func (da *DeviceAlgorithm) addUserDevice(userID, deviceID string) {
	da.mutex.Lock()
	defer da.mutex.Unlock()

	if da.userDevices[userID] == nil {
		da.userDevices[userID] = make(map[string]bool)
	}
	da.userDevices[userID][deviceID] = true

	if da.deviceUsers[deviceID] == nil {
		da.deviceUsers[deviceID] = make(map[string]bool)
	}
	da.deviceUsers[deviceID][userID] = true
}

// updateDeviceFingerprint updates a device fingerprint with new transaction data
func (da *DeviceAlgorithm) updateDeviceFingerprint(deviceID string, transaction fraudcatcher.Transaction) {
	da.mutex.Lock()
	defer da.mutex.Unlock()

	fingerprint, exists := da.deviceFingerprints[deviceID]
	if exists {
		fingerprint.LastSeen = transaction.Timestamp
		fingerprint.TransactionCount++
		fingerprint.TotalAmount += transaction.Amount
	}
}

// updateUserProfile updates the user's device profile
func (da *DeviceAlgorithm) updateUserProfile(userID, deviceID string, transaction fraudcatcher.Transaction) {
	da.mutex.Lock()
	defer da.mutex.Unlock()

	profile, exists := da.userProfiles[userID]
	if !exists {
		profile = &DeviceProfile{
			UserID:            userID,
			DeviceHistory:     make(map[string]*DeviceFingerprint),
			UserAgentPatterns: make(map[string]int),
			IPAddressHistory:  make(map[string]*IPData),
			LastUpdated:       0,
		}
		da.userProfiles[userID] = profile
	}

	profile.DeviceCount = da.getUserDeviceCount(userID)
	profile.LastDevice = deviceID
	profile.LastTransaction = transaction.Timestamp
	profile.LastUpdated = transaction.Timestamp.Unix()

	// Update user agent patterns
	if transaction.UserAgent != "" {
		profile.UserAgentPatterns[transaction.UserAgent]++
	}

	// Update IP address history
	if transaction.IPAddress != "" {
		if ipData, exists := profile.IPAddressHistory[transaction.IPAddress]; exists {
			ipData.LastSeen = transaction.Timestamp
			ipData.TransactionCount++
			ipData.TotalAmount += transaction.Amount
		} else {
			profile.IPAddressHistory[transaction.IPAddress] = &IPData{
				IPAddress:        transaction.IPAddress,
				FirstSeen:        transaction.Timestamp,
				LastSeen:         transaction.Timestamp,
				TransactionCount: 1,
				TotalAmount:      transaction.Amount,
				IsTrusted:        false,
			}
		}
	}

	// Set primary device if not set
	if profile.PrimaryDevice == "" {
		profile.PrimaryDevice = deviceID
	}
}

// GetDeviceFingerprint returns a device fingerprint by ID
func (da *DeviceAlgorithm) GetDeviceFingerprint(deviceID string) *DeviceFingerprint {
	da.mutex.RLock()
	defer da.mutex.RUnlock()
	return da.deviceFingerprints[deviceID]
}

// GetUserDevices returns the devices for a user
func (da *DeviceAlgorithm) GetUserDevices(userID string) []string {
	da.mutex.RLock()
	defer da.mutex.RUnlock()

	devices, exists := da.userDevices[userID]
	if !exists {
		return nil
	}

	var deviceList []string
	for deviceID := range devices {
		deviceList = append(deviceList, deviceID)
	}

	return deviceList
}

// MarkDeviceAsTrusted marks a device as trusted
func (da *DeviceAlgorithm) MarkDeviceAsTrusted(deviceID string) {
	da.mutex.Lock()
	defer da.mutex.Unlock()

	fingerprint, exists := da.deviceFingerprints[deviceID]
	if exists {
		fingerprint.IsTrusted = true
	}
}

// GetDeviceStats returns statistics for a device
func (da *DeviceAlgorithm) GetDeviceStats(deviceID string) map[string]interface{} {
	da.mutex.RLock()
	defer da.mutex.RUnlock()

	fingerprint, exists := da.deviceFingerprints[deviceID]
	if !exists {
		return map[string]interface{}{
			"transaction_count": 0,
			"total_amount":      0.0,
			"is_trusted":        false,
		}
	}

	return map[string]interface{}{
		"transaction_count": fingerprint.TransactionCount,
		"total_amount":      fingerprint.TotalAmount,
		"is_trusted":        fingerprint.IsTrusted,
		"first_seen":        fingerprint.FirstSeen,
		"last_seen":         fingerprint.LastSeen,
		"risk_score":        fingerprint.RiskScore,
	}
}

// GetUserProfile returns the user profile for a given user ID
func (da *DeviceAlgorithm) GetUserProfile(userID string) *DeviceProfile {
	da.mutex.RLock()
	defer da.mutex.RUnlock()
	return da.userProfiles[userID]
}

// GetDeviceUsers returns the users associated with a device
func (da *DeviceAlgorithm) GetDeviceUsers(deviceID string) []string {
	da.mutex.RLock()
	defer da.mutex.RUnlock()

	users, exists := da.deviceUsers[deviceID]
	if !exists {
		return nil
	}

	var userList []string
	for userID := range users {
		userList = append(userList, userID)
	}

	return userList
}

// GetStats returns statistics for the device algorithm
func (da *DeviceAlgorithm) GetStats() map[string]interface{} {
	da.mutex.RLock()
	defer da.mutex.RUnlock()

	stats := da.BaseAlgorithm.GetStats()
	stats["device_fingerprints_count"] = len(da.deviceFingerprints)
	stats["user_profiles_count"] = len(da.userProfiles)
	stats["total_devices"] = len(da.deviceFingerprints)
	stats["config"] = da.config

	return stats
}

// Reset resets the algorithm state
func (da *DeviceAlgorithm) Reset() error {
	da.mutex.Lock()
	defer da.mutex.Unlock()

	da.deviceFingerprints = make(map[string]*DeviceFingerprint)
	da.userDevices = make(map[string]map[string]bool)
	da.deviceUsers = make(map[string]map[string]bool)
	da.userProfiles = make(map[string]*DeviceProfile)

	return nil
}
