// src/controllers/call.controller.js
const CallLog = require('../models/CallLog');

exports.getCallStats = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const callLog = await CallLog.findBySessionId(sessionId);
    
    if (!callLog) {
      return res.status(404).json({ error: 'Call log not found' });
    }
    
    const duration = callLog.getCallDuration();
    
    res.json({
      success: true,
      stats: {
        duration,
        participants: callLog.participants.length,
        events: callLog.events.length,
        quality: callLog.qualityMetrics,
      },
    });
  } catch (error) {
    console.error('Get call stats error:', error);
    res.status(500).json({ error: 'Failed to fetch call stats' });
  }
};

exports.getQualityReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) dateRange.end = new Date(endDate);
    
    const stats = await CallLog.getQualityStats(dateRange);
    
    res.json({ success: true, stats: stats[0] || {} });
  } catch (error) {
    console.error('Get quality report error:', error);
    res.status(500).json({ error: 'Failed to generate quality report' });
  }
};

