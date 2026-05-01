const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Puzzle configuration (testing logic)
const PUZZLES = {
  lab: { answer: 'genesis' }, // Example answer
  sector_b: { answer: 'containment' },
  med_bay: { answer: 'antidote' }
};

// Zombie threshold
const ZOMBIE_THRESHOLD = 1; // 1 for testing
const ZOMBIE_CHANCE = 0.2; // 50% chance for testing!

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

    let zombieConverted = false;

    // Check Zombie Conversion
    if (user.completedPuzzles >= ZOMBIE_THRESHOLD && user.persona !== 'zombie') {
      const roll = Math.random();
      console.log(`[INFECTION CHECK] User: ${user.uniqueId} | Roll: ${roll.toFixed(2)} | Chance: ${ZOMBIE_CHANCE}`);
      if (roll <= ZOMBIE_CHANCE) {
        console.log(`[INFECTION CHECK] -> CONVERTED TO ZOMBIE`);
        user.persona = 'zombie';
        user.isInfected = true;
        zombieConverted = true;
      } else {
        console.log(`[INFECTION CHECK] -> REMAINED HUMAN`);
      }
    }

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
    }

    res.json({
      success: true,
      message: 'Flag accepted!',
      newRole: user.persona,
      zombieConverted,
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

module.exports = router;
