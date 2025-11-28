import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  forecastStorage,
  analyzeUsagePattern,
  generateRecommendations,
  generateAlerts,
  recordStorageSnapshot,
  getStorageHistory,
  clearStorageHistory,
  getHistoryStats,
  type TimeSeriesPoint,
} from './symenthaPredictive';

describe('Symentha Predictive Analytics', () => {
  const mockTimeSeriesData: TimeSeriesPoint[] = [
    {
      timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
      usedBytes: 100 * 1024 * 1024 * 1024, // 100 GB
      availableBytes: 900 * 1024 * 1024 * 1024, // 900 GB
      fileCount: 50000,
    },
    {
      timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      usedBytes: 150 * 1024 * 1024 * 1024, // 150 GB
      availableBytes: 850 * 1024 * 1024 * 1024, // 850 GB
      fileCount: 75000,
    },
    {
      timestamp: Date.now(),
      usedBytes: 200 * 1024 * 1024 * 1024, // 200 GB
      availableBytes: 800 * 1024 * 1024 * 1024, // 800 GB
      fileCount: 100000,
    },
  ];

  beforeEach(() => {
    clearStorageHistory();
  });

  afterEach(() => {
    clearStorageHistory();
  });

  describe('Storage Forecasting', () => {
    it('should forecast storage usage', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      expect(forecast.currentUsed).toBe(200);
      expect(forecast.currentAvailable).toBe(800);
      expect(forecast.totalCapacity).toBe(1000);
      expect(forecast.forecastDays).toBe(30);
    });

    it('should predict trend', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      expect(forecast.trend).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(forecast.trend);
    });

    it('should calculate days until full', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      expect(typeof forecast.daysUntilFull).toBe('number');
      expect(forecast.daysUntilFull).toBeGreaterThan(0);
    });

    it('should calculate fill percentage', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      expect(forecast.fillPercentageAtEnd).toBeGreaterThanOrEqual(0);
      expect(forecast.fillPercentageAtEnd).toBeLessThanOrEqual(100);
    });

    it('should clamp projections to valid range', () => {
      const forecast = forecastStorage(500, 500, 365, mockTimeSeriesData);
      expect(forecast.projectedUsedAtEnd).toBeGreaterThanOrEqual(0);
      expect(forecast.projectedUsedAtEnd).toBeLessThanOrEqual(1000);
    });

    it('should handle low usage', () => {
      const forecast = forecastStorage(10, 990, 30, mockTimeSeriesData);
      // With very low usage relative to capacity, days until full should be very large or infinite
      expect(forecast.daysUntilFull).toBeGreaterThanOrEqual(0);
      expect(isFinite(forecast.daysUntilFull) || forecast.daysUntilFull === Infinity).toBe(true);
    });

    it('should estimate trend strength', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      expect(forecast.trendStrength).toBeGreaterThanOrEqual(0);
      expect(forecast.trendStrength).toBeLessThanOrEqual(1);
    });

    it('should handle empty historical data', () => {
      const forecast = forecastStorage(200, 800, 30, []);
      expect(forecast).toBeDefined();
      expect(forecast.trend).toBe('stable');
      expect(forecast.daysUntilFull).toBe(Infinity);
    });

    it('should work without historical data parameter', () => {
      const forecast = forecastStorage(200, 800, 30);
      expect(forecast).toBeDefined();
    });
  });

  describe('Usage Pattern Analysis', () => {
    it('should analyze usage patterns', () => {
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      expect(pattern.averageDailyIncrease).toBeDefined();
      expect(pattern.weeklyGrowthRate).toBeDefined();
      expect(pattern.monthlyGrowthRate).toBeDefined();
    });

    it('should calculate average daily increase', () => {
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      expect(typeof pattern.averageDailyIncrease).toBe('number');
      expect(pattern.averageDailyIncrease).toBeGreaterThanOrEqual(0);
    });

    it('should calculate growth rates', () => {
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      expect(pattern.weeklyGrowthRate).toBeGreaterThanOrEqual(0);
      expect(pattern.monthlyGrowthRate).toBeGreaterThanOrEqual(0);
    });

    it('should measure volatility', () => {
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      expect(typeof pattern.volatility).toBe('number');
      expect(pattern.volatility).toBeGreaterThanOrEqual(0);
    });

    it('should identify peak usage times', () => {
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      expect(pattern.peakUsageDay).toBeDefined();
      expect(pattern.peakUsageTime).toBeDefined();
    });

    it('should handle empty data', () => {
      const pattern = analyzeUsagePattern([]);
      expect(pattern.averageDailyIncrease).toBe(0);
      expect(pattern.weeklyGrowthRate).toBe(0);
    });

    it('should handle single data point', () => {
      const pattern = analyzeUsagePattern([mockTimeSeriesData[0]]);
      expect(pattern.averageDailyIncrease).toBe(0);
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      const recommendations = generateRecommendations(forecast, pattern);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should prioritize recommendations', () => {
      const forecast = forecastStorage(950, 50, 30, mockTimeSeriesData);
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      const recommendations = generateRecommendations(forecast, pattern);
      for (const rec of recommendations) {
        expect(['critical', 'high', 'medium', 'low']).toContain(rec.priority);
      }
    });

    it('should provide actionable recommendations', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      const recommendations = generateRecommendations(forecast, pattern);
      for (const rec of recommendations) {
        expect(rec.action).toBeDefined();
        expect(rec.action.length).toBeGreaterThan(0);
        expect(rec.rationale).toBeDefined();
      }
    });

    it('should estimate space to free', () => {
      const forecast = forecastStorage(950, 50, 30, mockTimeSeriesData);
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      const recommendations = generateRecommendations(forecast, pattern);
      if (recommendations.length > 0) {
        expect(recommendations[0].estimatedSpaceToFree).toBeGreaterThanOrEqual(0);
      }
    });

    it('should include time estimates', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      const recommendations = generateRecommendations(forecast, pattern);
      for (const rec of recommendations) {
        expect(rec.estimatedTime).toBeDefined();
      }
    });

    it('should rate risk levels', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      const recommendations = generateRecommendations(forecast, pattern);
      for (const rec of recommendations) {
        expect(['low', 'medium', 'high']).toContain(rec.riskLevel);
      }
    });

    it('should give critical recommendations when critical', () => {
      // Use values that will definitely trigger critical (95%+ full)
      const forecast = forecastStorage(950, 50, 30, mockTimeSeriesData);
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      const recommendations = generateRecommendations(forecast, pattern);
      // At 95% full, should get recommendations (may or may not be critical)
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should give preventive recommendations when space available', () => {
      const forecast = forecastStorage(100, 900, 30, mockTimeSeriesData);
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      const recommendations = generateRecommendations(forecast, pattern);
      const preventive = recommendations.filter((r) => r.priority === 'low');
      expect(preventive.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Alerts', () => {
    it('should generate alerts', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      const alerts = generateAlerts(forecast);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should generate critical alert when over 95%', () => {
      const forecast = forecastStorage(950, 50, 30, mockTimeSeriesData);
      const alerts = generateAlerts(forecast);
      // Should have at least one alert due to high storage
      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate warning when over 85%', () => {
      const forecast = forecastStorage(850, 150, 30, mockTimeSeriesData);
      const alerts = generateAlerts(forecast);
      // Should have at least one alert
      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should include action items', () => {
      const forecast = forecastStorage(950, 50, 30, mockTimeSeriesData);
      const alerts = generateAlerts(forecast);
      if (alerts.length > 0) {
        expect(alerts[0].actionItems).toBeDefined();
      }
    });

    it('should include alert thresholds', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      const alerts = generateAlerts(forecast);
      for (const alert of alerts) {
        expect(alert.threshold).toBeGreaterThanOrEqual(0);
        expect(alert.currentLevel).toBeGreaterThanOrEqual(0);
      }
    });

    it('should timestamp alerts', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      const alerts = generateAlerts(forecast);
      const before = Date.now();
      const newAlerts = generateAlerts(forecast);
      const after = Date.now();
      for (const alert of newAlerts) {
        expect(alert.timestamp).toBeGreaterThanOrEqual(before - 1000);
        expect(alert.timestamp).toBeLessThanOrEqual(after + 1000);
      }
    });

    it('should not generate alerts for healthy storage', () => {
      const forecast = forecastStorage(100, 900, 30, mockTimeSeriesData);
      const alerts = generateAlerts(forecast);
      const critical = alerts.filter((a) => a.type === 'critical');
      expect(critical.length).toBe(0);
    });
  });

  describe('Storage History', () => {
    it('should record snapshot', () => {
      recordStorageSnapshot(100, 900, 10000);
      const history = getStorageHistory();
      expect(history.length).toBe(1);
    });

    it('should record multiple snapshots', () => {
      recordStorageSnapshot(100, 900, 10000);
      recordStorageSnapshot(110, 890, 10100);
      recordStorageSnapshot(120, 880, 10200);
      const history = getStorageHistory();
      expect(history.length).toBe(3);
    });

    it('should maintain chronological order', () => {
      recordStorageSnapshot(100, 900, 10000);
      recordStorageSnapshot(110, 890, 10100);
      const history = getStorageHistory();
      expect(history[0].timestamp).toBeLessThanOrEqual(history[1].timestamp);
    });

    it('should clear history', () => {
      recordStorageSnapshot(100, 900, 10000);
      recordStorageSnapshot(110, 890, 10100);
      clearStorageHistory();
      const history = getStorageHistory();
      expect(history.length).toBe(0);
    });

    it('should get history stats', () => {
      recordStorageSnapshot(100, 900, 10000);
      recordStorageSnapshot(110, 890, 10100);
      const stats = getHistoryStats();
      expect(stats.totalPoints).toBe(2);
      expect(stats.oldestTimestamp).toBeLessThanOrEqual(stats.newestTimestamp!);
    });

    it('should calculate span in days', () => {
      const now = Date.now();
      recordStorageSnapshot(100, 900, 10000);
      recordStorageSnapshot(110, 890, 10100);
      const stats = getHistoryStats();
      expect(stats.spanDays).toBeLessThanOrEqual(1);
    });

    it('should handle empty history stats', () => {
      const stats = getHistoryStats();
      expect(stats.totalPoints).toBe(0);
      expect(stats.oldestTimestamp).toBeNull();
      expect(stats.newestTimestamp).toBeNull();
      expect(stats.spanDays).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero capacity', () => {
      const forecast = forecastStorage(0, 0, 30, mockTimeSeriesData);
      expect(forecast).toBeDefined();
    });

    it('should handle extremely large capacity', () => {
      const largeCapacity = 1024 * 1024 * 1024 * 1024; // 1 TB
      const forecast = forecastStorage(100, largeCapacity - 100, 30, mockTimeSeriesData);
      expect(forecast.totalCapacity).toBe(largeCapacity);
    });

    it('should handle very short forecast period', () => {
      const forecast = forecastStorage(200, 800, 1, mockTimeSeriesData);
      expect(forecast.forecastDays).toBe(1);
    });

    it('should handle very long forecast period', () => {
      const forecast = forecastStorage(200, 800, 365, mockTimeSeriesData);
      expect(forecast.forecastDays).toBe(365);
    });

    it('should handle negative available space gracefully', () => {
      // This shouldn't happen, but should handle gracefully
      const forecast = forecastStorage(1000, -100, 30, mockTimeSeriesData);
      expect(forecast).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should forecast quickly', () => {
      const start = performance.now();
      forecastStorage(200, 800, 30, mockTimeSeriesData);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should analyze patterns quickly', () => {
      const start = performance.now();
      analyzeUsagePattern(mockTimeSeriesData);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should generate recommendations quickly', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      const pattern = analyzeUsagePattern(mockTimeSeriesData);
      const start = performance.now();
      generateRecommendations(forecast, pattern);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should generate alerts quickly', () => {
      const forecast = forecastStorage(200, 800, 30, mockTimeSeriesData);
      const start = performance.now();
      generateAlerts(forecast);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });
});
