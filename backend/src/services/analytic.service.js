// ============================================================================
// src/services/analytics.service.js
const CallLog = require('../models/CallLog');
const Session = require('../models/Session');

class AnalyticsService {
  async getDashboardStats(userId, role) {
    const dateRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
    };
    
    const query = role === 'tutor' 
      ? { tutorId: userId }
      : { studentId: userId };
    
    const [totalSessions, completedSessions, avgQuality] = await Promise.all([
      Session.countDocuments({ ...query, createdAt: { $gte: dateRange.start } }),
      Session.countDocuments({ ...query, status: 'completed' }),
      this.getAverageQuality(userId, role, dateRange),
    ]);
    
    return {
      totalSessions,
      completedSessions,
      averageQuality: avgQuality,
      period: '30 days',
    };
  }
  
  async getAverageQuality(userId, role, dateRange) {
    const sessions = await Session.find({
      [role === 'tutor' ? 'tutorId' : 'studentId']: userId,
      status: 'completed',
      endedAt: { $gte: dateRange.start, $lte: dateRange.end },
    });
    
    if (sessions.length === 0) return 'unknown';
    
    const qualities = sessions.map(s => s.metadata.quality).filter(q => q !== 'unknown');
    
    if (qualities.length === 0) return 'unknown';
    
    const qualityScores = {
      'excellent': 5,
      'good': 4,
      'fair': 3,
      'poor': 2,
      'very-poor': 1,
    };
    
    const avgScore = qualities.reduce((sum, q) => sum + qualityScores[q], 0) / qualities.length;
    
    if (avgScore >= 4.5) return 'excellent';
    if (avgScore >= 3.5) return 'good';
    if (avgScore >= 2.5) return 'fair';
    if (avgScore >= 1.5) return 'poor';
    return 'very-poor';
  }
  
  async getUsageReport(startDate, endDate) {
    const sessions = await Session.find({
      status: 'completed',
      endedAt: { $gte: startDate, $lte: endDate },
    });
    
    const totalDuration = sessions.reduce((sum, s) => sum + (s.metadata.duration || 0), 0);
    const totalBandwidth = sessions.reduce((sum, s) => sum + (s.metadata.bandwidth?.average || 0), 0);
    
    return {
      totalSessions: sessions.length,
      totalDuration: Math.floor(totalDuration / 60), // minutes
      averageDuration: sessions.length > 0 ? Math.floor(totalDuration / sessions.length / 60) : 0,
      totalBandwidth: Math.floor(totalBandwidth / sessions.length) || 0,
      period: { start: startDate, end: endDate },
    };
  }
}

module.exports = new AnalyticsService();

