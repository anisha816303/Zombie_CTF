const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  adminId: { type: String, required: true },
  status: { type: String, enum: ['waiting', 'active', 'finished'], default: 'waiting' },
  createdAt: { type: Date, default: Date.now },
  // Zombie collaborative voting (MedBay)
  zombieVotes: [{
    voterId: { type: String },
    targetId: { type: String }
  }],
  zombieVoteFinalized: { type: Boolean, default: false },
  zombieVoteTargetId: { type: String, default: null },
  zombieVoteTargetName: { type: String, default: null },
  // Second Zombie collaborative voting (Ventilation Shafts)
  ventilationVotes: [{
    voterId: { type: String },
    targetId: { type: String }
  }],
  ventilationVoteFinalized: { type: Boolean, default: false },
  ventilationVoteTargetId: { type: String, default: null },
  ventilationVoteTargetName: { type: String, default: null }
});

module.exports = mongoose.model('Room', roomSchema);
