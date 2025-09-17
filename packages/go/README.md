# Fraud Catcher - Go Package

A high-performance fraud detection library for Go applications.

## Features

- **Zero Dependencies**: Core functionality works without external dependencies
- **High Performance**: Optimized for speed and low memory usage
- **Multiple Algorithms**: Amount, Time, Location, Device, Behavioral analysis
- **Configurable**: Flexible configuration options
- **Thread-Safe**: Safe for concurrent use
- **Cross-Platform**: Works on all Go-supported platforms

## Installation

```bash
go get github.com/fraud-catcher/go
```

## Quick Start

```go
package main

import (
    "fmt"
    "time"
    fraudcatcher "github.com/fraud-catcher/go"
)

func main() {
    // Create fraud detector
    detector := fraudcatcher.NewFraudDetector(fraudcatcher.Config{
        Rules: []string{"amount", "time", "location"},
        Thresholds: map[string]float64{
            "amount": 0.8,
            "time": 0.6,
            "location": 0.7,
        },
        GlobalThreshold: 0.7,
    })

    // Create transaction
    transaction := fraudcatcher.Transaction{
        ID: "tx_001",
        UserID: "user_001",
        Amount: 1500.0,
        Currency: "USD",
        Timestamp: time.Now(),
        Location: &fraudcatcher.Location{
            Lat: 40.7128,
            Lng: -74.0060,
            Country: "US",
        },
    }

    // Analyze transaction
    result, err := detector.Analyze(transaction)
    if err != nil {
        panic(err)
    }

    fmt.Printf("Risk Score: %.2f\n", result.RiskScore)
    fmt.Printf("Is Fraud: %t\n", result.IsFraud)
    fmt.Printf("Confidence: %.2f\n", result.Confidence)
}
```

## Configuration

```go
config := fraudcatcher.Config{
    Rules: []string{"amount", "time", "location", "device", "behavioral"},
    Thresholds: map[string]float64{
        "amount": 0.8,
        "time": 0.6,
        "location": 0.7,
        "device": 0.5,
        "behavioral": 0.6,
    },
    GlobalThreshold: 0.7,
    EnableLogging: true,
    MaxUserProfiles: 10000,
    ProfileRetentionDays: 30,
}
```

## Algorithms

### Amount Algorithm
- **User-Specific Thresholds**: Learns from individual spending patterns
- **Statistical Analysis**: Z-scores, percentiles, and standard deviation
- **Currency Intelligence**: Multi-currency support with conversion
- **Dynamic Risk Scoring**: Adapts to user behavior over time

### Time Algorithm
- **Suspicious Hours Detection**: Identifies unusual transaction times
- **Weekend/Holiday Analysis**: Enhanced risk scoring for non-business hours
- **User Time Profiles**: Learns individual timing patterns
- **Timezone Intelligence**: Detects impossible time zone changes

### Location Algorithm
- **Impossible Travel Detection**: Identifies physically impossible journeys
- **Geofencing**: Trusted location management
- **Travel Intelligence**: Advanced travel pattern analysis
- **Location Clustering**: Identifies frequent and suspicious locations

### Device Algorithm
- **Device Fingerprinting**: Advanced device identification
- **Device Sharing Detection**: Identifies shared devices across users
- **Device Velocity Analysis**: Detects rapid device switching
- **Device Reputation**: Tracks device trustworthiness

### Behavioral Algorithm
- **Comprehensive Profiling**: Multi-dimensional user behavior analysis
- **Anomaly Detection**: Advanced statistical anomaly detection
- **Pattern Recognition**: Learns from spending, timing, location, and device patterns
- **Adaptive Thresholds**: Self-adjusting risk thresholds
- **Cross-User Analysis**: Compares against similar user groups

## Performance

- **Response Time**: < 1ms per transaction
- **Throughput**: 100,000+ transactions per second
- **Memory Usage**: < 50MB for 10,000 user profiles
- **Concurrency**: Thread-safe for high-concurrency applications

## Examples

See the `examples/` directory for comprehensive usage examples.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT License - see LICENSE file for details.
