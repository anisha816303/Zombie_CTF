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

    let zombieConverted = false;
    const convertedUsers = [];

    // If the user reached the threshold, perform room-wide conversion to reach ZOMBIE_TARGET
    if (user.completedPuzzles >= ZOMBIE_THRESHOLD) {
      // Count current zombies in the room
      const currentZombies = await User.countDocuments({ roomCode: user.roomCode, persona: 'zombie', isAdmin: false });
      const need = Math.max(0, ZOMBIE_TARGET - currentZombies);

      if (need > 0) {
        // Find candidate humans in the same room (exclude admins and already-zombies)
        const candidates = await User.find({ roomCode: user.roomCode, persona: { $ne: 'zombie' }, isAdmin: false });

        // Shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        const toConvert = candidates.slice(0, need);

        for (const target of toConvert) {
          target.persona = 'zombie';
          target.isInfected = true;
          await target.save();
          convertedUsers.push({ uniqueId: target.uniqueId, name: target.name });
        }

        if (convertedUsers.length > 0) {
          zombieConverted = true;
          console.log(`[INFECTION CHECK] Converted ${convertedUsers.length} users in room ${user.roomCode}`);
        }
      } else {
        console.log(`[INFECTION CHECK] Room ${user.roomCode} already has ${currentZombies} zombies (target ${ZOMBIE_TARGET})`);
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

module.exports = router;
