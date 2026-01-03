const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth'); // Your existing auth

// Create a call session
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { tutorId, studentId, scheduledAt } = req.body;
    
    // Verify user is authorized (tutor or student)
    if (req.user.id !== tutorId && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const Session = require('./models/Session');
    const { v4: uuidv4 } = require('uuid');
    
    const session = new Session({
      tutorId,
      studentId,
      roomId: uuidv4(),
      scheduledAt,
      status: 'scheduled',
    });

    await session.save();

    res.json({
      success: true,
      session: {
        id: session._id,
        roomId: session.roomId,
        scheduledAt: session.scheduledAt,
      },
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session details
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const Session = require('./models/Session');
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user is part of the session
    if (session.tutorId.toString() !== req.user.id && 
        session.studentId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// End session
router.post('/:sessionId/end', authMiddleware, async (req, res) => {
  try {
    const Session = require('./models/Session');
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

module.exports = router;