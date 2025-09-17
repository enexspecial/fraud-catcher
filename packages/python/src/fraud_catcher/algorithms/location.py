"""
Location-based fraud detection algorithm.
"""

import math
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
from ..models import Transaction, DetectionRule, Location


@dataclass
class LocationConfig:
    """Configuration for location algorithm."""
    max_distance_km: float
    suspicious_distance_km: float
    time_window_minutes: int
    enable_geo_fencing: bool = False
    trusted_locations: Optional[List[Location]] = None


class LocationAlgorithm:
    """Detects fraud based on location patterns."""
    
    def __init__(self, config: LocationConfig):
        self.config = config
        self.user_locations: Dict[str, List[Location]] = {}
        if self.config.trusted_locations is None:
            self.config.trusted_locations = []
    
    async def analyze(self, transaction: Transaction, rule: DetectionRule) -> float:
        """Analyze transaction for location-based fraud patterns."""
        if not transaction.location:
            return 0.0  # No location data, no risk
        
        user_id = transaction.user_id
        current_location = transaction.location
        now = transaction.timestamp if isinstance(transaction.timestamp, datetime) else datetime.now()
        
        # Get user's recent locations
        recent_locations = self._get_recent_locations(user_id, now)
        
        risk_score = 0.0
        
        # Check against recent locations
        if recent_locations:
            min_distance = min(
                self._calculate_distance(current_location, loc)
                for loc in recent_locations
            )
            
            if min_distance > self.config.max_distance_km:
                risk_score = 1.0  # Impossible travel distance
            elif min_distance > self.config.suspicious_distance_km:
                # Suspicious but possible travel distance
                range_val = self.config.max_distance_km - self.config.suspicious_distance_km
                position = min_distance - self.config.suspicious_distance_km
                risk_score = 0.5 + (position / range_val) * 0.5  # 0.5 to 1.0
            else:
                # Normal travel distance
                risk_score = (min_distance / self.config.suspicious_distance_km) * 0.5  # 0.0 to 0.5
        
        # Check against trusted locations if enabled
        if self.config.enable_geo_fencing and self.config.trusted_locations:
            is_in_trusted_location = any(
                self._calculate_distance(current_location, trusted_loc) <= 1.0
                for trusted_loc in self.config.trusted_locations
            )
            
            if is_in_trusted_location:
                risk_score = min(risk_score, 0.2)  # Reduce risk for trusted locations
        
        # Store current location
        self._add_location(user_id, current_location)
        
        return min(risk_score, 1.0)
    
    def _get_recent_locations(self, user_id: str, current_time: datetime) -> List[Location]:
        """Get recent locations for user."""
        user_locations = self.user_locations.get(user_id, [])
        time_window_seconds = self.config.time_window_minutes * 60
        
        return [
            loc for loc in user_locations
            if hasattr(loc, 'timestamp') and 
            (current_time - loc.timestamp).total_seconds() <= time_window_seconds
        ]
    
    def _add_location(self, user_id: str, location: Location) -> None:
        """Add location to user's history."""
        if user_id not in self.user_locations:
            self.user_locations[user_id] = []
        
        # Add timestamp to location
        location_with_timestamp = Location(
            lat=location.lat,
            lng=location.lng,
            country=location.country,
            city=location.city,
            state=location.state,
            timestamp=datetime.now()
        )
        
        self.user_locations[user_id].append(location_with_timestamp)
        
        # Keep only recent locations to manage memory
        cutoff_time = time.time() - (self.config.time_window_minutes * 60)
        self.user_locations[user_id] = [
            loc for loc in self.user_locations[user_id]
            if hasattr(loc, 'timestamp') and loc.timestamp.timestamp() > cutoff_time
        ]
    
    def _calculate_distance(self, loc1: Location, loc2: Location) -> float:
        """Calculate distance between two locations in kilometers."""
        R = 6371  # Earth's radius in kilometers
        d_lat = self._deg2rad(loc2.lat - loc1.lat)
        d_lon = self._deg2rad(loc2.lng - loc1.lng)
        a = (
            math.sin(d_lat/2) * math.sin(d_lat/2) +
            math.cos(self._deg2rad(loc1.lat)) * math.cos(self._deg2rad(loc2.lat)) *
            math.sin(d_lon/2) * math.sin(d_lon/2)
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    
    def _deg2rad(self, deg: float) -> float:
        """Convert degrees to radians."""
        return deg * (math.pi/180)
    
    def is_impossible_travel(self, from_loc: Location, to_loc: Location, time_diff_minutes: int) -> bool:
        """Check if travel between locations is impossible."""
        distance = self._calculate_distance(from_loc, to_loc)
        max_possible_distance = (time_diff_minutes / 60) * 1000  # Assuming max 1000 km/h travel speed
        return distance > max_possible_distance
    
    def get_travel_speed(self, from_loc: Location, to_loc: Location, time_diff_minutes: int) -> float:
        """Get travel speed between locations in km/h."""
        distance = self._calculate_distance(from_loc, to_loc)
        return distance / (time_diff_minutes / 60)  # km/h
