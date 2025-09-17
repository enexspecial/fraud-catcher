export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface CounterMetric {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface HistogramMetric {
  name: string;
  buckets: Record<string, number>;
  sum: number;
  count: number;
  labels?: Record<string, string>;
}

export interface GaugeMetric {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export class MetricsCollector {
  private counters = new Map<string, CounterMetric>();
  private histograms = new Map<string, HistogramMetric>();
  private gauges = new Map<string, GaugeMetric>();

  // Counter metrics
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.counters.get(key);
    
    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, { name, value, labels });
    }
  }

  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.getKey(name, labels);
    return this.counters.get(key)?.value || 0;
  }

  // Histogram metrics
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.histograms.get(key);
    
    if (existing) {
      existing.count++;
      existing.sum += value;
      
      // Update buckets (simplified implementation)
      for (const [bucket, count] of Object.entries(existing.buckets)) {
        if (value <= parseFloat(bucket)) {
          existing.buckets[bucket] = count + 1;
        }
      }
    } else {
      const buckets = {
        '0.1': 0,
        '0.5': 0,
        '1.0': 0,
        '2.5': 0,
        '5.0': 0,
        '10.0': 0,
        '+Inf': 0
      };
      
      // Initialize buckets
      for (const bucket of Object.keys(buckets)) {
        if (value <= parseFloat(bucket)) {
          buckets[bucket] = 1;
        }
      }
      
      this.histograms.set(key, {
        name,
        buckets,
        sum: value,
        count: 1,
        labels
      });
    }
  }

  getHistogram(name: string, labels?: Record<string, string>): HistogramMetric | undefined {
    const key = this.getKey(name, labels);
    return this.histograms.get(key);
  }

  // Gauge metrics
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, { name, value, labels });
  }

  getGauge(name: string, labels?: Record<string, string>): number {
    const key = this.getKey(name, labels);
    return this.gauges.get(key)?.value || 0;
  }

  // Get all metrics
  getAllMetrics(): {
    counters: CounterMetric[];
    histograms: HistogramMetric[];
    gauges: GaugeMetric[];
  } {
    return {
      counters: Array.from(this.counters.values()),
      histograms: Array.from(this.histograms.values()),
      gauges: Array.from(this.gauges.values())
    };
  }

  // Clear metrics
  clear(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    
    return `${name}{${labelString}}`;
  }
}
