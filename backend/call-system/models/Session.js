const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // ← Use your existing User model
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // ← Use your existing User model
    required: true,
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  scheduledAt: Date,
  startedAt: Date,
  endedAt: Date,
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  recordingUrl: String,
  metadata: {
    duration: Number,
    participants: [String],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CallSession', sessionSchema);