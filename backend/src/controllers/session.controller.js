// src/controllers/session.controller.js
const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');

exports.createSession = async (req, res) => {
  try {
    const { tutorId, studentId, scheduledAt, recordingEnabled, waitingRoomEnabled } = req.body;
    
    // Verify user is either tutor or admin
    if (req.user.id !== tutorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only tutors can create sessions' });
    }
    
    const session = new Session({
      tutorId,
      studentId,
      roomId: uuidv4(),
      scheduledAt,
      recordingEnabled,
      waitingRoomEnabled,
      status: 'scheduled',
    });
    
    await session.save();
    
    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        roomId: session.roomId,
        scheduledAt: session.scheduledAt,
        status: session.status,
      },
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId)
      .populate('tutorId', 'name email')
      .populate('studentId', 'name email');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify user is part of session
    if (session.tutorId._id.toString() !== req.user.id &&
        session.studentId._id.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ success: true, session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Only tutor or admin can update
    if (session.tutorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the tutor can update this session' });
    }
    
    Object.assign(session, updates);
    await session.save();
    
    res.json({ success: true, session });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Only tutor or admin can delete
    if (session.tutorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await session.cancel();
    
    res.json({ success: true, message: 'Session cancelled' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to cancel session' });
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user.id;
    
    const query = {
      $or: [
        { tutorId: userId },
        { studentId: userId },
      ],
    };
    
    if (status) {
      query.status = status;
    }
    
    const sessions = await Session.find(query)
      .populate('tutorId', 'name email')
      .populate('studentId', 'name email')
      .sort({ scheduledAt: -1 })
      .limit(50);
    
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};
