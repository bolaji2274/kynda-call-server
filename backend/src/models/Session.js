const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  startedAt: Date,
  endedAt: Date,
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true,
  },
  recordingUrl: String,
  metadata: {
    duration: Number,
    quality: String,
    avgBitrate: Number,
    participants: [String],
  },
}, {
  timestamps: true,
});

// Indexes for performance
sessionSchema.index({ tutorId: 1, createdAt: -1 });
sessionSchema.index({ studentId: 1, createdAt: -1 });
sessionSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('Session', sessionSchema);