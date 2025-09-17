package algorithms

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	fraudcatcher "github.com/fraud-catcher/go"
)

// LocationConfig represents the configuration for the location algorithm
type LocationConfig struct {
	MaxDistanceKm           float64                `json:"max_distance_km"`
	SuspiciousDistanceKm    float64                `json:"suspicious_distance_km"`
	TimeWindowMinutes       int                    `json:"time_window_minutes"`
	EnableGeoFencing        bool                   `json:"enable_geo_fencing"`
	TrustedLocations        []fraudcatcher.Location `json:"trusted_locations"`
	EnableTravelIntelligence bool                  `json:"enable_travel_intelligence"`
	MaxTravelSpeedKmh       float64                `json:"max_travel_speed_kmh"`
	EnableLocationClustering bool                  `json:"enable_location_clustering"`
}

// LocationProfile represents a user's location-based transaction profile
type LocationProfile struct {
	UserID              string                    `json:"user_id"`
	TransactionCount    int                       `json:"transaction_count"`
	HomeLocation        *fraudcatcher.Location    `json:"home_location"`
	FrequentLocations   map[string]*LocationData  `json:"frequent_locations"`
	TravelPatterns      map[string]int            `json:"travel_patterns"`
	CountryDistribution map[string]int            `json:"country_distribution"`
	LastLocation        *fraudcatcher.Location    `json:"last_location"`
	LastTransaction     time.Time                 `json:"last_transaction"`
	LocationHistory     []fraudcatcher.Location   `json:"location_history"`
	LastUpdated         int64                     `json:"last_updated"`
}

// LocationData represents data for a specific location
type LocationData struct {
	Location  fraudcatcher.Location `json:"location"`
	Count     int                   `json:"count"`
	FirstSeen time.Time             `json:"first_seen"`
	LastSeen  time.Time             `json:"last_seen"`
	TotalAmount float64             `json:"total_amount"`
}

// LocationAlgorithm implements fraud detection based on transaction location
type LocationAlgorithm struct {
	*fraudcatcher.BaseAlgorithm
	config       LocationConfig
	userProfiles map[string]*LocationProfile
	mutex        sync.RWMutex
}

// NewLocationAlgorithm creates a new location algorithm
func NewLocationAlgorithm(config LocationConfig) *LocationAlgorithm {
	base := fraudcatcher.NewBaseAlgorithm("location", "Detects suspicious transaction locations and travel patterns", 0.7)

	algorithm := &LocationAlgorithm{
		BaseAlgorithm: base,
		config:        config,
		userProfiles:  make(map[string]*LocationProfile),
	}

	return algorithm
}

// Analyze analyzes a transaction for location-based fraud
func (la *LocationAlgorithm) Analyze(ctx context.Context, transaction fraudcatcher.Transaction, rule fraudcatcher.DetectionRule) (float64, error) {
	if !la.IsEnabled() {
		return 0.0, nil
	}

	if transaction.Location == nil {
		return 0.0, nil // No location data, no risk
	}

	userID := transaction.UserID
	currentLocation := *transaction.Location
	now := transaction.Timestamp

	// Get or create user profile
	profile := la.getUserProfile(userID)

	// Update profile with new location
	la.updateUserProfile(profile, currentLocation, transaction.Amount, now)

	// Calculate risk score
	riskScore := la.calculateRiskScore(profile, currentLocation, now)

	return math.Min(riskScore, 1.0), nil
}

// getUserProfile returns the user profile for the given user ID
func (la *LocationAlgorithm) getUserProfile(userID string) *LocationProfile {
	la.mutex.Lock()
	defer la.mutex.Unlock()

	profile, exists := la.userProfiles[userID]
	if !exists {
		profile = &LocationProfile{
			UserID:              userID,
			FrequentLocations:   make(map[string]*LocationData),
			TravelPatterns:      make(map[string]int),
			CountryDistribution: make(map[string]int),
			LocationHistory:     []fraudcatcher.Location{},
			LastUpdated:         0,
		}
		la.userProfiles[userID] = profile
	}

	return profile
}

// updateUserProfile updates the user profile with new location data
func (la *LocationAlgorithm) updateUserProfile(profile *LocationProfile, location fraudcatcher.Location, amount float64, timestamp time.Time) {
	la.mutex.Lock()
	defer la.mutex.Unlock()

	profile.TransactionCount++
	profile.LastLocation = &location
	profile.LastTransaction = timestamp
	profile.LastUpdated = timestamp.Unix()

	// Update country distribution
	if location.Country != "" {
		profile.CountryDistribution[location.Country]++
	}

	// Update frequent locations
	locationKey := la.getLocationKey(location)
	if locationData, exists := profile.FrequentLocations[locationKey]; exists {
		locationData.Count++
		locationData.LastSeen = timestamp
		locationData.TotalAmount += amount
	} else {
		profile.FrequentLocations[locationKey] = &LocationData{
			Location:    location,
			Count:       1,
			FirstSeen:   timestamp,
			LastSeen:    timestamp,
			TotalAmount: amount,
		}
	}

	// Update location history
	profile.LocationHistory = append(profile.LocationHistory, location)

	// Keep only recent locations to manage memory
	if len(profile.LocationHistory) > 100 {
		profile.LocationHistory = profile.LocationHistory[len(profile.LocationHistory)-100:]
	}

	// Set home location if not set and this is a frequent location
	if profile.HomeLocation == nil && profile.FrequentLocations[locationKey].Count >= 3 {
		profile.HomeLocation = &location
	}
}

// calculateRiskScore calculates the risk score for a location
func (la *LocationAlgorithm) calculateRiskScore(profile *LocationProfile, currentLocation fraudcatcher.Location, timestamp time.Time) float64 {
	riskScore := 0.0

	// Check for impossible travel
	if la.config.EnableTravelIntelligence && profile.LastLocation != nil {
		impossibleTravelRisk := la.checkImpossibleTravel(*profile.LastLocation, currentLocation, timestamp, profile.LastTransaction)
		riskScore += impossibleTravelRisk
	}

	// Check against recent locations
	if len(profile.LocationHistory) > 0 {
		recentLocationRisk := la.checkRecentLocations(profile, currentLocation, timestamp)
		riskScore += recentLocationRisk
	}

	// Check against trusted locations if enabled
	if la.config.EnableGeoFencing && len(la.config.TrustedLocations) > 0 {
		trustedLocationRisk := la.checkTrustedLocations(currentLocation)
		riskScore += trustedLocationRisk
	}

	// Check for unusual country patterns
	countryRisk := la.checkCountryPatterns(profile, currentLocation)
	riskScore += countryRisk

	// Check for location clustering anomalies
	if la.config.EnableLocationClustering {
		clusteringRisk := la.checkLocationClustering(profile, currentLocation)
		riskScore += clusteringRisk
	}

	return riskScore
}

// checkImpossibleTravel checks for impossible travel patterns
func (la *LocationAlgorithm) checkImpossibleTravel(from, to fraudcatcher.Location, toTime, fromTime time.Time) float64 {
	distance := la.calculateDistance(from, to)
	timeDiff := toTime.Sub(fromTime).Hours()

	if timeDiff <= 0 {
		return 0.0 // Same time or future time
	}

	maxPossibleDistance := timeDiff * la.config.MaxTravelSpeedKmh

	if distance > maxPossibleDistance {
		return 1.0 // Impossible travel
	}

	// Calculate travel speed
	travelSpeed := distance / timeDiff

	// High risk for very fast travel
	if travelSpeed > la.config.MaxTravelSpeedKmh*0.8 {
		return 0.7
	}

	// Medium risk for fast travel
	if travelSpeed > la.config.MaxTravelSpeedKmh*0.5 {
		return 0.4
	}

	return 0.0
}

// checkRecentLocations checks against recent location history
func (la *LocationAlgorithm) checkRecentLocations(profile *LocationProfile, currentLocation fraudcatcher.Location, timestamp time.Time) float64 {
	timeWindow := time.Duration(la.config.TimeWindowMinutes) * time.Minute
	recentLocations := la.getRecentLocations(profile, timestamp, timeWindow)

	if len(recentLocations) == 0 {
		return 0.1 // Slight risk for first location
	}

	minDistance := math.Inf(1)
	for _, location := range recentLocations {
		distance := la.calculateDistance(location, currentLocation)
		if distance < minDistance {
			minDistance = distance
		}
	}

	if minDistance > la.config.MaxDistanceKm {
		return 1.0 // Impossible travel distance
	} else if minDistance > la.config.SuspiciousDistanceKm {
		// Suspicious but possible travel distance
		range := la.config.MaxDistanceKm - la.config.SuspiciousDistanceKm
		position := minDistance - la.config.SuspiciousDistanceKm
		return 0.5 + (position/range)*0.5 // 0.5 to 1.0
	} else {
		// Normal travel distance
		return minDistance / la.config.SuspiciousDistanceKm * 0.5 // 0.0 to 0.5
	}
}

// checkTrustedLocations checks if location is in trusted areas
func (la *LocationAlgorithm) checkTrustedLocations(currentLocation fraudcatcher.Location) float64 {
	for _, trustedLoc := range la.config.TrustedLocations {
		distance := la.calculateDistance(trustedLoc, currentLocation)
		if distance <= 1.0 { // Within 1km
			return -0.2 // Reduce risk for trusted locations
		}
	}
	return 0.0
}

// checkCountryPatterns checks for unusual country patterns
func (la *LocationAlgorithm) checkCountryPatterns(profile *LocationProfile, currentLocation fraudcatcher.Location) float64 {
	if currentLocation.Country == "" {
		return 0.0
	}

	totalTransactions := profile.TransactionCount
	if totalTransactions == 0 {
		return 0.0
	}

	countryCount := profile.CountryDistribution[currentLocation.Country]
	countryFrequency := float64(countryCount) / float64(totalTransactions)

	// High risk for very rare countries
	if countryFrequency < 0.05 {
		return 0.6
	} else if countryFrequency < 0.1 {
		return 0.3
	}

	return 0.0
}

// checkLocationClustering checks for location clustering anomalies
func (la *LocationAlgorithm) checkLocationClustering(profile *LocationProfile, currentLocation fraudcatcher.Location) float64 {
	if len(profile.FrequentLocations) < 3 {
		return 0.0 // Not enough data for clustering
	}

	// Find the closest frequent location
	minDistance := math.Inf(1)
	for _, locationData := range profile.FrequentLocations {
		distance := la.calculateDistance(locationData.Location, currentLocation)
		if distance < minDistance {
			minDistance = distance
		}
	}

	// If very far from any frequent location, it's suspicious
	if minDistance > 100 { // 100km
		return 0.5
	} else if minDistance > 50 { // 50km
		return 0.2
	}

	return 0.0
}

// getRecentLocations returns locations within the time window
func (la *LocationAlgorithm) getRecentLocations(profile *LocationProfile, currentTime time.Time, timeWindow time.Duration) []fraudcatcher.Location {
	var recent []fraudcatcher.Location

	for _, location := range profile.LocationHistory {
		// Assuming location has timestamp, otherwise use current time
		// In a real implementation, you'd store timestamps with locations
		recent = append(recent, location)
	}

	return recent
}

// calculateDistance calculates the distance between two locations using Haversine formula
func (la *LocationAlgorithm) calculateDistance(loc1, loc2 fraudcatcher.Location) float64 {
	const R = 6371 // Earth's radius in kilometers

	lat1 := la.deg2rad(loc1.Lat)
	lat2 := la.deg2rad(loc2.Lat)
	dLat := la.deg2rad(loc2.Lat - loc1.Lat)
	dLon := la.deg2rad(loc2.Lng - loc1.Lng)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

// deg2rad converts degrees to radians
func (la *LocationAlgorithm) deg2rad(deg float64) float64 {
	return deg * (math.Pi / 180)
}

// getLocationKey creates a key for location grouping
func (la *LocationAlgorithm) getLocationKey(location fraudcatcher.Location) string {
	// Round to 2 decimal places for grouping nearby locations
	lat := math.Round(location.Lat*100) / 100
	lng := math.Round(location.Lng*100) / 100
	return fmt.Sprintf("%.2f,%.2f", lat, lng)
}

// IsImpossibleTravel checks if travel between two locations is impossible
func (la *LocationAlgorithm) IsImpossibleTravel(from, to fraudcatcher.Location, timeDiffMinutes int) bool {
	distance := la.calculateDistance(from, to)
	maxPossibleDistance := float64(timeDiffMinutes) / 60 * la.config.MaxTravelSpeedKmh
	return distance > maxPossibleDistance
}

// GetTravelSpeed calculates the travel speed between two locations
func (la *LocationAlgorithm) GetTravelSpeed(from, to fraudcatcher.Location, timeDiffMinutes int) float64 {
	distance := la.calculateDistance(from, to)
	return distance / (float64(timeDiffMinutes) / 60) // km/h
}

// GetUserProfile returns the user profile for a given user ID
func (la *LocationAlgorithm) GetUserProfile(userID string) *LocationProfile {
	la.mutex.RLock()
	defer la.mutex.RUnlock()
	return la.userProfiles[userID]
}

// GetFrequentLocations returns the most frequent locations for a user
func (la *LocationAlgorithm) GetFrequentLocations(userID string, limit int) []*LocationData {
	profile := la.GetUserProfile(userID)
	if profile == nil {
		return nil
	}

	// Sort by count (simplified - in production, use proper sorting)
	var locations []*LocationData
	for _, locationData := range profile.FrequentLocations {
		locations = append(locations, locationData)
	}

	// Simple bubble sort by count
	for i := 0; i < len(locations)-1; i++ {
		for j := 0; j < len(locations)-i-1; j++ {
			if locations[j].Count < locations[j+1].Count {
				locations[j], locations[j+1] = locations[j+1], locations[j]
			}
		}
	}

	if limit > 0 && limit < len(locations) {
		return locations[:limit]
	}

	return locations
}

// GetStats returns statistics for the location algorithm
func (la *LocationAlgorithm) GetStats() map[string]interface{} {
	la.mutex.RLock()
	defer la.mutex.RUnlock()

	stats := la.BaseAlgorithm.GetStats()
	stats["user_profiles_count"] = len(la.userProfiles)
	stats["config"] = la.config

	return stats
}

// Reset resets the algorithm state
func (la *LocationAlgorithm) Reset() error {
	la.mutex.Lock()
	defer la.mutex.Unlock()

	la.userProfiles = make(map[string]*LocationProfile)
	return nil
}
