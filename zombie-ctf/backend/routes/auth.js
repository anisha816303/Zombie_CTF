const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');

// Start Game (Host only)
router.post('/start-game', async (req, res) => {
  try {
    const { roomCode, uniqueId } = req.body;
    const room = await Room.findOne({ roomCode });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    if (room.adminId !== uniqueId) return res.status(403).json({ error: 'Only the host can start the game' });

    room.status = 'active';
    await room.save();

    // Broadcast to room
    const io = req.app.get('io');
    if (io) {
      io.to(roomCode).emit('game-started');
    }

    res.json({ success: true, message: 'Game started!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Create Room (Host)
router.post('/create-room', async (req, res) => {
  try {
    let { roomCode, adminName } = req.body;
    
    // Auto-generate if not provided
    if (!roomCode) {
      roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    }

    const existing = await Room.findOne({ roomCode });
    if (existing) return res.status(400).json({ error: 'Room code already exists' });

    const adminId = 'ADM-' + Math.floor(1000 + Math.random() * 9000);
    const admin = new User({ name: adminName || 'Admin', uniqueId: adminId, roomCode, isAdmin: true });
    await admin.save();

    const room = new Room({ roomCode, adminId });
    await room.save();

    res.status(201).json({ success: true, room, admin });
  } catch (error) {
    res.status(500).json({ error: 'Room creation failed' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, roomCode } = req.body;
    
    if (!name || !roomCode) return res.status(400).json({ error: 'Name and Room Code are required' });

    const room = await Room.findOne({ roomCode });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    let uniqueId;
    let isUnique = false;
    while (!isUnique) {
      uniqueId = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await User.findOne({ uniqueId });
      if (!existing) isUnique = true;
    }

    const user = new User({ name, uniqueId, roomCode });
    await user.save();

    // Notify lobby
    const io = req.app.get('io');
    if (io) {
      io.to(roomCode).emit('player-joined');
    }

    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/room-users/:roomCode', async (req, res) => {
  try {
    const users = await User.find({ roomCode: req.params.roomCode });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/room-status/:roomCode', async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ success: true, status: room.status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { uniqueId } = req.body;
    if (!uniqueId) return res.status(400).json({ error: 'Unique ID is required' });

    const user = await User.findOne({ uniqueId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
