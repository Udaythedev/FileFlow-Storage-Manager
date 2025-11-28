/**
 * Symentha AI - Predictive Analytics Engine
 * Forecasting storage usage and generating recommendations
 */

import { FileItem } from '../AppTypes';

/**
 * Storage forecast result
 */
export interface StorageForecast {
  currentUsed: number;
  currentAvailable: number;
  totalCapacity: number;
  forecastDays: number;
  projectedUsedAtEnd: number;
  daysUntilFull: number;
  fillPercentageAtEnd: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number; // 0-1 confidence
}

/**
 * Usage pattern analysis
 */
export interface UsagePattern {
  averageDailyIncrease: number;
  averageWeeklyIncrease: number;
  peakUsageDay: string; // Day of week
  peakUsageTime: string; // Time of day
  weeklyGrowthRate: number; // Percentage
  monthlyGrowthRate: number; // Percentage
  volatility: number; // 0-1 standard deviation
}

/**
 * Storage recommendation
 */
export interface StorageRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  estimatedSpaceToFree: number;
  rationale: string;
  estimatedTime: string; // e.g., "5 minutes"
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Alert for storage issues
 */
export interface StorageAlert {
  type: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  threshold: number; // Percentage full
  currentLevel: number; // Percentage full
  timestamp: number;
  actionItems?: string[];
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: number;
  usedBytes: number;
  availableBytes: number;
  fileCount: number;
}

/**
 * Storage history manager
 */
class StorageHistory {
  private history: TimeSeriesPoint[] = [];
  private maxHistoryPoints = 90; // 90 days if daily snapshots

  addSnapshot(point: TimeSeriesPoint): void {
    this.history.push(point);

    // Keep only recent data
    if (this.history.length > this.maxHistoryPoints) {
      this.history = this.history.slice(-this.maxHistoryPoints);
    }
  }

  getHistory(): TimeSeriesPoint[] {
    return [...this.history];
  }

  getLastDays(days: number): TimeSeriesPoint[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.history.filter((point) => point.timestamp >= cutoff);
  }

  clearHistory(): void {
    this.history = [];
  }

  getSize(): number {
    return this.history.length;
  }
}

/**
 * Global storage history instance
 */
const storageHistory = new StorageHistory();

/**
 * Calculate linear regression for trend analysis
 */
function calculateLinearRegression(
  points: TimeSeriesPoint[]
): {
  slope: number;
  intercept: number;
  r2: number;
} {
  if (points.length < 2) {
    return { slope: 0, intercept: 0, r2: 0 };
  }

  const n = points.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;

  const baseTime = points[0].timestamp;

  for (const point of points) {
    const x = (point.timestamp - baseTime) / (24 * 60 * 60 * 1000); // Days from start
    const y = point.usedBytes / (1024 * 1024 * 1024); // GB

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssTotal = sumY2 - (sumY * sumY) / n;
  const ssReg = slope * slope * (sumX2 - (sumX * sumX) / n);
  const r2 = ssTotal !== 0 ? ssReg / ssTotal : 0;

  return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
}

/**
 * Forecast storage usage
 */
export function forecastStorage(
  currentUsed: number,
  currentAvailable: number,
  forecastDays: number = 30,
  historicalData?: TimeSeriesPoint[]
): StorageForecast {
  const totalCapacity = currentUsed + currentAvailable;

  // Use provided historical data or fallback to stored history
  const data =
    historicalData && historicalData.length > 0
      ? historicalData
      : storageHistory.getLastDays(90);

  let projectedUsedAtEnd = currentUsed;
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let trendStrength = 0;

  if (data.length >= 2) {
    const regression = calculateLinearRegression(data);

    // slope is in GB per day
    const dailyGrowth = regression.slope;
    projectedUsedAtEnd = currentUsed + dailyGrowth * forecastDays;
    trendStrength = regression.r2;

    if (Math.abs(dailyGrowth) < 0.01) {
      trend = 'stable';
    } else if (dailyGrowth > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }
  }

  // Clamp to valid range
  projectedUsedAtEnd = Math.max(0, Math.min(totalCapacity, projectedUsedAtEnd));

  const projectedAvailable = totalCapacity - projectedUsedAtEnd;

  let daysUntilFull = Infinity;
  if (trend === 'increasing' && data.length >= 2) {
    const regression = calculateLinearRegression(data);
    const dailyGrowth = regression.slope * (1024 * 1024 * 1024); // Convert to bytes

    if (dailyGrowth > 0) {
      daysUntilFull =
        (totalCapacity - currentUsed) / dailyGrowth / (24 * 60 * 60);
      daysUntilFull = Math.max(0, daysUntilFull);
    }
  }

  return {
    currentUsed,
    currentAvailable,
    totalCapacity,
    forecastDays,
    projectedUsedAtEnd,
    daysUntilFull: isFinite(daysUntilFull) ? daysUntilFull : Infinity,
    fillPercentageAtEnd: (projectedUsedAtEnd / totalCapacity) * 100,
    trend,
    trendStrength,
  };
}

/**
 * Analyze usage patterns
 */
export function analyzeUsagePattern(
  historicalData: TimeSeriesPoint[]
): UsagePattern {
  if (historicalData.length < 2) {
    return {
      averageDailyIncrease: 0,
      averageWeeklyIncrease: 0,
      peakUsageDay: 'unknown',
      peakUsageTime: 'unknown',
      weeklyGrowthRate: 0,
      monthlyGrowthRate: 0,
      volatility: 0,
    };
  }

  // Calculate daily increases
  const dailyIncreases: number[] = [];
  for (let i = 1; i < historicalData.length; i++) {
    const prev = historicalData[i - 1];
    const curr = historicalData[i];
    const timeDiff = (curr.timestamp - prev.timestamp) / (24 * 60 * 60 * 1000); // Days
    if (timeDiff > 0) {
      const increase = (curr.usedBytes - prev.usedBytes) / timeDiff / (1024 * 1024); // MB per day
      dailyIncreases.push(increase);
    }
  }

  const averageDailyIncrease =
    dailyIncreases.length > 0
      ? dailyIncreases.reduce((a, b) => a + b, 0) / dailyIncreases.length
      : 0;

  // Calculate volatility (standard deviation)
  let volatility = 0;
  if (dailyIncreases.length > 1) {
    const mean = averageDailyIncrease;
    const variance =
      dailyIncreases.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) /
      dailyIncreases.length;
    volatility = Math.sqrt(variance);
  }

  // Estimate weekly and monthly growth
  const lastDay = historicalData[historicalData.length - 1];
  const firstDay = historicalData[0];
  const totalDays =
    (lastDay.timestamp - firstDay.timestamp) / (24 * 60 * 60 * 1000);

  let weeklyGrowthRate = 0;
  let monthlyGrowthRate = 0;

  if (totalDays > 0) {
    const totalGrowth = (lastDay.usedBytes - firstDay.usedBytes) / firstDay.usedBytes;
    const dailyRate = Math.pow(totalGrowth + 1, 1 / totalDays) - 1;
    weeklyGrowthRate = (Math.pow(1 + dailyRate, 7) - 1) * 100;
    monthlyGrowthRate = (Math.pow(1 + dailyRate, 30) - 1) * 100;
  }

  // Determine peak usage day (simplified - would need timestamp analysis)
  const peakUsageDay = 'Saturday'; // Placeholder
  const peakUsageTime = '08:00 PM'; // Placeholder

  return {
    averageDailyIncrease,
    averageWeeklyIncrease: averageDailyIncrease * 7,
    peakUsageDay,
    peakUsageTime,
    weeklyGrowthRate,
    monthlyGrowthRate,
    volatility,
  };
}

/**
 * Generate storage recommendations
 */
export function generateRecommendations(
  forecast: StorageForecast,
  pattern: UsagePattern
): StorageRecommendation[] {
  const recommendations: StorageRecommendation[] = [];
  const fillPercentage = (forecast.currentUsed / forecast.totalCapacity) * 100;

  // Critical: Storage almost full
  if (fillPercentage > 95) {
    recommendations.push({
      priority: 'critical',
      action: 'Delete old files and temporary data immediately',
      estimatedSpaceToFree: forecast.currentUsed * 0.1, // 10%
      rationale:
        'Storage is critically full and may cause system errors. Free at least 10% immediately.',
      estimatedTime: '15-30 minutes',
      riskLevel: 'high',
    });
  }

  // Warning: Will be full soon
  if (forecast.daysUntilFull < 7 && isFinite(forecast.daysUntilFull)) {
    recommendations.push({
      priority: 'high',
      action: 'Archive or delete large files and duplicate files',
      estimatedSpaceToFree: forecast.currentUsed * 0.2, // 20%
      rationale: `At current growth rate, storage will be full in ${Math.round(forecast.daysUntilFull)} days.`,
      estimatedTime: '30-60 minutes',
      riskLevel: 'high',
    });
  }

  // Medium: Significant growth detected
  if (pattern.weeklyGrowthRate > 10) {
    recommendations.push({
      priority: 'medium',
      action: 'Review and organize large folders',
      estimatedSpaceToFree: 0,
      rationale: `Weekly growth rate is ${pattern.weeklyGrowthRate.toFixed(1)}%. Consider organizing data.`,
      estimatedTime: '30-45 minutes',
      riskLevel: 'medium',
    });
  }

  // Medium: High volatility
  if (pattern.volatility > 500) {
    recommendations.push({
      priority: 'medium',
      action: 'Implement cleanup schedule for temporary files',
      estimatedSpaceToFree: 0,
      rationale: 'Storage usage is highly volatile. Regular cleanup recommended.',
      estimatedTime: 'One-time setup',
      riskLevel: 'medium',
    });
  }

  // Low: Preventive maintenance
  if (recommendations.length === 0 && fillPercentage > 50) {
    recommendations.push({
      priority: 'low',
      action: 'Consider archiving old project files',
      estimatedSpaceToFree: forecast.currentUsed * 0.05, // 5%
      rationale: 'Proactive storage management keeps system running smoothly.',
      estimatedTime: '1-2 hours',
      riskLevel: 'low',
    });
  }

  return recommendations;
}

/**
 * Generate storage alerts
 */
export function generateAlerts(forecast: StorageForecast): StorageAlert[] {
  const alerts: StorageAlert[] = [];
  const fillPercentage = (forecast.currentUsed / forecast.totalCapacity) * 100;

  // Critical alert: Over 95%
  if (fillPercentage > 95) {
    alerts.push({
      type: 'critical',
      title: '⚠️ Critical Storage Alert',
      message: `Storage is ${fillPercentage.toFixed(1)}% full. System performance may be severely affected.`,
      threshold: 95,
      currentLevel: fillPercentage,
      timestamp: Date.now(),
      actionItems: [
        'Delete unnecessary files immediately',
        'Empty trash/recycle bin',
        'Disable cloud sync temporarily',
      ],
    });
  }

  // Warning alert: Over 85%
  if (fillPercentage > 85) {
    alerts.push({
      type: 'warning',
      title: '⚠️ High Storage Usage',
      message: `Storage is ${fillPercentage.toFixed(1)}% full. Recommended to free up space soon.`,
      threshold: 85,
      currentLevel: fillPercentage,
      timestamp: Date.now(),
      actionItems: [
        'Review large files',
        'Delete duplicates',
        'Archive old data',
      ],
    });
  }

  // Info alert: Will be full soon
  if (
    forecast.daysUntilFull < 14 &&
    isFinite(forecast.daysUntilFull) &&
    fillPercentage < 85
  ) {
    alerts.push({
      type: 'warning',
      title: 'ℹ️ Storage Forecast',
      message: `At current usage rate, storage will be full in ${Math.round(forecast.daysUntilFull)} days.`,
      threshold: 80,
      currentLevel: fillPercentage,
      timestamp: Date.now(),
      actionItems: [
        'Plan cleanup activities',
        'Review growth trends',
        'Consider storage upgrade',
      ],
    });
  }

  // Info alert: Unusual activity
  if (forecast.trend === 'increasing' && forecast.trendStrength > 0.7) {
    alerts.push({
      type: 'info',
      title: 'ℹ️ Increasing Storage Usage',
      message: 'Storage usage is increasing steadily. Monitor usage patterns.',
      threshold: 50,
      currentLevel: fillPercentage,
      timestamp: Date.now(),
    });
  }

  return alerts;
}

/**
 * Record storage snapshot
 */
export function recordStorageSnapshot(
  usedBytes: number,
  availableBytes: number,
  fileCount: number
): void {
  storageHistory.addSnapshot({
    timestamp: Date.now(),
    usedBytes,
    availableBytes,
    fileCount,
  });
}

/**
 * Get storage history
 */
export function getStorageHistory(): TimeSeriesPoint[] {
  return storageHistory.getHistory();
}

/**
 * Clear storage history
 */
export function clearStorageHistory(): void {
  storageHistory.clearHistory();
}

/**
 * Get history stats
 */
export function getHistoryStats(): {
  totalPoints: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
  spanDays: number;
} {
  const history = storageHistory.getHistory();

  if (history.length === 0) {
    return {
      totalPoints: 0,
      oldestTimestamp: null,
      newestTimestamp: null,
      spanDays: 0,
    };
  }

  const oldest = history[0].timestamp;
  const newest = history[history.length - 1].timestamp;
  const spanDays = (newest - oldest) / (24 * 60 * 60 * 1000);

  return {
    totalPoints: history.length,
    oldestTimestamp: oldest,
    newestTimestamp: newest,
    spanDays,
  };
}
