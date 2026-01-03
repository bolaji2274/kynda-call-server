// src/services/quality.service.js
class QualityService {
  constructor() {
    this.qualityThresholds = {
      excellent: { latency: 50, packetLoss: 0.005, jitter: 10 },
      good: { latency: 150, packetLoss: 0.02, jitter: 30 },
      fair: { latency: 300, packetLoss: 0.05, jitter: 50 },
      poor: { latency: 500, packetLoss: 0.1, jitter: 100 },
    };
  }
  
  calculateQualityScore(metrics) {
    const { latency, packetLoss, jitter } = metrics;
    
    let score = 100;
    
    // Latency impact (40 points)
    if (latency > 500) score -= 40;
    else if (latency > 300) score -= 30;
    else if (latency > 150) score -= 15;
    else if (latency > 50) score -= 5;
    
    // Packet loss impact (40 points)
    if (packetLoss > 0.1) score -= 40;
    else if (packetLoss > 0.05) score -= 30;
    else if (packetLoss > 0.02) score -= 15;
    else if (packetLoss > 0.005) score -= 5;
    
    // Jitter impact (20 points)
    if (jitter > 100) score -= 20;
    else if (jitter > 50) score -= 15;
    else if (jitter > 30) score -= 10;
    else if (jitter > 10) score -= 5;
    
    return Math.max(0, score);
  }
  
  getQualityLevel(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'very-poor';
  }
  
  async analyzeCallQuality(callLog) {
    const metrics = callLog.qualityMetrics;
    const score = this.calculateQualityScore(metrics);
    const level = this.getQualityLevel(score);
    
    return {
      score,
      level,
      metrics,
      recommendations: this.getRecommendations(level, metrics),
    };
  }
  
  getRecommendations(level, metrics) {
    const recommendations = [];
    
    if (level === 'poor' || level === 'very-poor') {
      if (metrics.packetLoss > 0.05) {
        recommendations.push('High packet loss detected. Consider switching to audio-only mode.');
      }
      
      if (metrics.averageLatency > 300) {
        recommendations.push('High latency detected. Check network connection or try moving closer to router.');
      }
      
      if (metrics.jitter > 50) {
        recommendations.push('High jitter detected. Network instability may be affecting call quality.');
      }
    }
    
    return recommendations;
  }
}

module.exports = new QualityService();

