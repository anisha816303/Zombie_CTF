const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  roomCode: { type: String },
  isAdmin: { type: Boolean, default: false },
  persona: { type: String, enum: ['person', 'zombie'], default: 'person' },
  completedPuzzles: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  isInfected: { type: Boolean, default: false },
  currentLocation: { type: String, default: 'map' }
});

module.exports = mongoose.model('User', userSchema);
