const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Puzzle configuration (testing logic)
const PUZZLES = {
  lab: { answer: 'it spreads through everyone' }, // Example answer
  sector_b: { answer: 'containment' },
  med_bay: { answer: 'antidote' },
  archive: { answer: 'archives' }
};

// Zombie conversion config
// Trigger conversions when a player reaches this many completed puzzles
const ZOMBIE_THRESHOLD = 3; // after completing 3rd puzzle
// Target number of zombies per room when threshold is reached
const ZOMBIE_TARGET = 5;
// Individual chance fallback (kept for compatibility, not primary mechanism)
const ZOMBIE_CHANCE = 0.3;

router.post('/submit', async (req, res) => {
  try {
    const { uniqueId, puzzleId, answer } = req.body;
    if (!uniqueId || !puzzleId || !answer) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const user = await User.findOne({ uniqueId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const correct = PUZZLES[puzzleId] && PUZZLES[puzzleId].answer.toLowerCase() === answer.toLowerCase();

    if (!correct) {
      return res.json({ success: false, message: 'Incorrect flag.' });
    }

    // It's correct!
    user.completedPuzzles += 1;
    user.score += 100;

    if (user.infectionPendingUntil) {
      user.infectionPendingUntil = null;
    }

    let zombieConverted = false;
    const convertedUsers = [];

    // Convert the person when they clear the archives puzzle, up to ZOMBIE_TARGET
    if (puzzleId === 'archive' && user.persona !== 'zombie') {
      const currentZombies = await User.countDocuments({ roomCode: user.roomCode, persona: 'zombie', isAdmin: false });
      if (currentZombies < ZOMBIE_TARGET) {
        user.persona = 'zombie';
        user.isInfected = true;
        convertedUsers.push({ uniqueId: user.uniqueId, name: user.name });
        zombieConverted = true;
        console.log(`[INFECTION CHECK] Converted user ${user.name} in room ${user.roomCode} upon clearing archives.`);
      } else {
        console.log(`[INFECTION CHECK] Room ${user.roomCode} already has ${currentZombies} zombies (target ${ZOMBIE_TARGET}). Not converting ${user.name}.`);
      }
    }

    // Save the user (their progress/score)
    await user.save();

    // Broadcast to room
    const io = req.app.get('io');
    if (io) {
      io.to(user.roomCode).emit('progress-update', {
        userName: user.name,
        puzzleId,
        newScore: user.score,
        persona: user.persona
      });
      if (zombieConverted && convertedUsers.length > 0) {
        io.to(user.roomCode).emit('zombies-converted', { converted: convertedUsers });
      }
    }

    res.json({
      success: true,
      message: 'Flag accepted!',
      newRole: user.persona,
      zombieConverted,
      convertedUsers,
      user
    });

  } catch (error) {
    res.status(500).json({ error: 'Submission failed' });
  }
});

router.get('/players/:roomCode', async (req, res) => {
  try {
    const players = await User.find({ roomCode: req.params.roomCode, isAdmin: false });
    res.json({ success: true, players });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

router.post('/reset', async (req, res) => {
  try {
    const { uniqueId } = req.body;
    if (!uniqueId) return res.status(400).json({ error: 'Missing uniqueId' });

    const user = await User.findOne({ uniqueId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.completedPuzzles = 0;
    user.persona = 'person';
    user.isInfected = false;
    user.score = 0;

    await user.save();
    res.json({ success: true, message: 'Progress reset!', user });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

router.get('/humans/:roomCode', async (req, res) => {
  try {
    const humans = await User.find({ roomCode: req.params.roomCode, isAdmin: false, persona: { $ne: 'zombie' } });
    res.json({ success: true, humans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch humans' });
  }
});

router.post('/target-infect', async (req, res) => {
  try {
    const { targetId, roomCode } = req.body;
    const target = await User.findOne({ uniqueId: targetId });
    if (!target) return res.status(404).json({ error: 'Target not found' });

    target.infectionPendingUntil = new Date(Date.now() + 60000); // 60s
    await target.save();

    const io = req.app.get('io');
    if (io) {
      io.to(roomCode).emit('infection-targeted', { targetId });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Infection targeting failed' });
  }
});

router.post('/timeout-infect', async (req, res) => {
  try {
    const { uniqueId } = req.body;
    const user = await User.findOne({ uniqueId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Allow a bit of leeway with time comparison or just rely on frontend call
    if (user.persona !== 'zombie' && user.infectionPendingUntil) {
      user.persona = 'zombie';
      user.isInfected = true;
      user.infectionPendingUntil = null;
      await user.save();

      const io = req.app.get('io');
      if (io) {
        io.to(user.roomCode).emit('zombies-converted', { converted: [{ uniqueId: user.uniqueId, name: user.name }] });
      }
      return res.json({ success: true, converted: true });
    }
    res.json({ success: false });
  } catch (error) {
    res.status(500).json({ error: 'Timeout infection failed' });
  }
});

module.exports = router;
