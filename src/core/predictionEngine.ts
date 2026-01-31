/**
 * Usage prediction engine
 * Calculates when usage will run out based on historical data
 */
import { UsageDataPoint, PredictionResult } from './types';
import { logger } from '../utils/logger';

export class PredictionEngine {
  private minDataPoints = 2;
  private minTimeSpan = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Calculate prediction based on historical data
   */
  calculatePrediction(history: UsageDataPoint[], currentRemaining: number, currentTotal: number): PredictionResult {
    // Default result when prediction is not available
    const notAvailable: PredictionResult = {
      daysUntilDepletion: 0,
      estimatedDepletionDate: new Date(),
      dailyUsageRate: 0,
      available: false,
    };

    if (history.length < this.minDataPoints) {
      logger.debug('Not enough data points for prediction');
      return notAvailable;
    }

    // Sort history by timestamp
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

    // Get the oldest and newest points
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];

    const timeSpan = newest.timestamp - oldest.timestamp;
    if (timeSpan < this.minTimeSpan) {
      logger.debug('Time span too short for prediction');
      return notAvailable;
    }

    // Calculate usage rate (remaining per millisecond)
    const remainingChange = oldest.remaining - newest.remaining;
    const usageRate = remainingChange / timeSpan; // negative means consuming

    if (usageRate >= 0) {
      // Usage is not decreasing or increasing
      logger.debug('Usage rate is non-negative, cannot predict');
      return notAvailable;
    }

    // Calculate days until depletion
    // dailyUsageRate is positive (amount consumed per day)
    const dailyUsageRate = Math.abs(usageRate) * 24 * 60 * 60 * 1000;
    const daysUntilDepletion = currentRemaining / dailyUsageRate;

    // Calculate estimated depletion date
    const estimatedDepletionDate = new Date(Date.now() + daysUntilDepletion * 24 * 60 * 60 * 1000);

    logger.debug(`Prediction: ${daysUntilDepletion.toFixed(1)} days until depletion`);

    return {
      daysUntilDepletion,
      estimatedDepletionDate,
      dailyUsageRate,
      available: true,
    };
  }

  /**
   * Format prediction result as human-readable text
   */
  formatPrediction(prediction: PredictionResult): string {
    if (!prediction.available) {
      return '数据不足';
    }

    const { daysUntilDepletion, estimatedDepletionDate } = prediction;

    if (daysUntilDepletion < 0) {
      return '已用完';
    }

    if (daysUntilDepletion < 1) {
      const hours = Math.floor(daysUntilDepletion * 24);
      return `约 ${hours} 小时后用完 (${estimatedDepletionDate.toLocaleDateString()})`;
    }

    if (daysUntilDepletion < 30) {
      const days = Math.floor(daysUntilDepletion);
      return `约 ${days} 天后用完 (${estimatedDepletionDate.toLocaleDateString()})`;
    }

    const months = Math.floor(daysUntilDepletion / 30);
    return `约 ${months} 个月后用完 (${estimatedDepletionDate.toLocaleDateString()})`;
  }

  /**
   * Format short prediction for status bar
   */
  formatShortPrediction(prediction: PredictionResult): string {
    if (!prediction.available) {
      return '';
    }

    const { daysUntilDepletion } = prediction;

    if (daysUntilDepletion < 0) {
      return '已用完';
    }

    if (daysUntilDepletion < 1) {
      const hours = Math.floor(daysUntilDepletion * 24);
      return `剩${hours}小时`;
    }

    if (daysUntilDepletion < 30) {
      return `剩${Math.floor(daysUntilDepletion)}天`;
    }

    const months = Math.floor(daysUntilDepletion / 30);
    return `剩${months}月`;
  }
}
