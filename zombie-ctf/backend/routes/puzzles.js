const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');

// Puzzle configuration (testing logic)
const PUZZLES = {
  lab: { answer: 'it spreads through everyone' }, // Example answer
  sector_b: { answer: 'containment' },
  med_bay: { answer: 'antidote' },
  archive: { answer: 'archives' },
  server_core: { answer: 'stabilize' },
  ventilation_shafts: { answer: 'override' }
};

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

    // ── Archive puzzle: reveal latent infection ──
    // Players were pre-selected as latentInfected when the game started.
    // Clearing archives reveals their fate.
    if (puzzleId === 'archive' && user.persona !== 'zombie') {
      if (user.latentInfected) {
        // The virus was already in them — activate it
        user.persona = 'zombie';
        user.isInfected = true;
        zombieConverted = true;
        convertedUsers.push({ uniqueId: user.uniqueId, name: user.name });
        console.log(`[INFECTION REVEAL] ${user.name} in room ${user.roomCode} was latent infected — now a zombie.`);
      } else {
        console.log(`[INFECTION REVEAL] ${user.name} in room ${user.roomCode} is clean. Archives cleared safely.`);
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
    console.error('[SUBMIT ERROR]', error);
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
    user.latentInfected = false;

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

// ── Zombie collaborative voting (Among Us style) ──────────────────

// Cast a vote for a target
router.post('/zombie-vote', async (req, res) => {
  try {
    const { voterId, targetId, roomCode } = req.body;
    if (!voterId || !targetId || !roomCode) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const room = await Room.findOne({ roomCode });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // If vote is already finalized, reject
    if (room.zombieVoteFinalized) {
      return res.json({
        success: false,
        message: 'Vote already finalized',
        finalized: true,
        targetName: room.zombieVoteTargetName
      });
    }

    // Check if this zombie already voted — update their vote
    const existingVoteIdx = room.zombieVotes.findIndex(v => v.voterId === voterId);
    if (existingVoteIdx >= 0) {
      room.zombieVotes[existingVoteIdx].targetId = targetId;
    } else {
      room.zombieVotes.push({ voterId, targetId });
    }

    // Count total zombies in the room (to know when all have voted)
    const totalZombies = await User.countDocuments({
      roomCode,
      persona: 'zombie',
      isAdmin: false
    });

    // Check if all zombies have voted
    const allVoted = room.zombieVotes.length >= totalZombies;

    // If all voted, finalize — tally votes and pick winner
    if (allVoted) {
      // Tally votes
      const tally = {};
      for (const vote of room.zombieVotes) {
        tally[vote.targetId] = (tally[vote.targetId] || 0) + 1;
      }
      // Find the target with the most votes (random tiebreak)
      let maxVotes = 0;
      let winners = [];
      for (const [tid, count] of Object.entries(tally)) {
        if (count > maxVotes) {
          maxVotes = count;
          winners = [tid];
        } else if (count === maxVotes) {
          winners.push(tid);
        }
      }
      const winnerId = winners[Math.floor(Math.random() * winners.length)];
      const target = await User.findOne({ uniqueId: winnerId });

      if (target) {
        room.zombieVoteFinalized = true;
        room.zombieVoteTargetId = winnerId;
        room.zombieVoteTargetName = target.name;

        // Infect the target
        target.infectionPendingUntil = new Date(Date.now() + 60000); // 60s countdown
        await target.save();

        const io = req.app.get('io');
        if (io) {
          io.to(roomCode).emit('zombie-vote-update', {
            votes: room.zombieVotes,
            totalZombies,
            finalized: true,
            targetId: winnerId,
            targetName: target.name
          });
          io.to(roomCode).emit('infection-targeted', { targetId: winnerId });
        }
      }
    } else {
      // Broadcast vote update (not finalized yet)
      const io = req.app.get('io');
      if (io) {
        io.to(roomCode).emit('zombie-vote-update', {
          votes: room.zombieVotes,
          totalZombies,
          finalized: false,
          targetId: null,
          targetName: null
        });
      }
    }

    await room.save();

    res.json({
      success: true,
      finalized: room.zombieVoteFinalized,
      targetName: room.zombieVoteTargetName,
      votesCount: room.zombieVotes.length,
      totalZombies
    });

  } catch (error) {
    console.error('[ZOMBIE VOTE ERROR]', error);
    res.status(500).json({ error: 'Vote failed' });
  }
});

// Get current vote status
router.get('/zombie-vote-status/:roomCode', async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const totalZombies = await User.countDocuments({
      roomCode: req.params.roomCode,
      persona: 'zombie',
      isAdmin: false
    });

    // Build tally for UI
    const tally = {};
    for (const vote of room.zombieVotes) {
      tally[vote.targetId] = (tally[vote.targetId] || 0) + 1;
    }

    res.json({
      success: true,
      finalized: room.zombieVoteFinalized,
      targetId: room.zombieVoteTargetId,
      targetName: room.zombieVoteTargetName,
      votesCount: room.zombieVotes.length,
      totalZombies,
      tally
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get vote status' });
  }
});

// ── Second Zombie collaborative voting (Ventilation Shafts) ──────────────

router.post('/ventilation-vote', async (req, res) => {
  try {
    const { voterId, targetId, roomCode } = req.body;
    if (!voterId || !targetId || !roomCode) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const room = await Room.findOne({ roomCode });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.ventilationVoteFinalized) {
      return res.json({
        success: false,
        message: 'Vote already finalized',
        finalized: true,
        targetName: room.ventilationVoteTargetName
      });
    }

    const existingVoteIdx = room.ventilationVotes.findIndex(v => v.voterId === voterId);
    if (existingVoteIdx >= 0) {
      room.ventilationVotes[existingVoteIdx].targetId = targetId;
    } else {
      room.ventilationVotes.push({ voterId, targetId });
    }

    const totalZombies = await User.countDocuments({
      roomCode,
      persona: 'zombie',
      isAdmin: false
    });

    const allVoted = room.ventilationVotes.length >= totalZombies;

    if (allVoted) {
      const tally = {};
      for (const vote of room.ventilationVotes) {
        tally[vote.targetId] = (tally[vote.targetId] || 0) + 1;
      }
      let maxVotes = 0;
      let winners = [];
      for (const [tid, count] of Object.entries(tally)) {
        if (count > maxVotes) {
          maxVotes = count;
          winners = [tid];
        } else if (count === maxVotes) {
          winners.push(tid);
        }
      }
      const winnerId = winners[Math.floor(Math.random() * winners.length)];
      const target = await User.findOne({ uniqueId: winnerId });

      if (target) {
        room.ventilationVoteFinalized = true;
        room.ventilationVoteTargetId = winnerId;
        room.ventilationVoteTargetName = target.name;

        // Infect the target
        target.infectionPendingUntil = new Date(Date.now() + 60000); // 60s countdown
        await target.save();

        const io = req.app.get('io');
        if (io) {
          io.to(roomCode).emit('ventilation-vote-update', {
            votes: room.ventilationVotes,
            totalZombies,
            finalized: true,
            targetId: winnerId,
            targetName: target.name
          });
          io.to(roomCode).emit('infection-targeted', { targetId: winnerId });
        }
      }
    } else {
      const io = req.app.get('io');
      if (io) {
        io.to(roomCode).emit('ventilation-vote-update', {
          votes: room.ventilationVotes,
          totalZombies,
          finalized: false,
          targetId: null,
          targetName: null
        });
      }
    }

    await room.save();

    res.json({
      success: true,
      finalized: room.ventilationVoteFinalized,
      targetName: room.ventilationVoteTargetName,
      votesCount: room.ventilationVotes.length,
      totalZombies
    });

  } catch (error) {
    console.error('[VENTILATION VOTE ERROR]', error);
    res.status(500).json({ error: 'Vote failed' });
  }
});

router.get('/ventilation-vote-status/:roomCode', async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const totalZombies = await User.countDocuments({
      roomCode: req.params.roomCode,
      persona: 'zombie',
      isAdmin: false
    });

    const tally = {};
    for (const vote of room.ventilationVotes) {
      tally[vote.targetId] = (tally[vote.targetId] || 0) + 1;
    }

    res.json({
      success: true,
      finalized: room.ventilationVoteFinalized,
      targetId: room.ventilationVoteTargetId,
      targetName: room.ventilationVoteTargetName,
      votesCount: room.ventilationVotes.length,
      totalZombies,
      tally
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get vote status' });
  }
});

// Legacy target-infect (kept for backward compat, now checks vote finalization)
router.post('/target-infect', async (req, res) => {
  try {
    const { targetId, roomCode } = req.body;

    // Check if vote is already finalized
    const room = await Room.findOne({ roomCode });
    if (room && room.zombieVoteFinalized) {
      return res.json({ success: false, message: 'Target already selected by vote' });
    }

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
      user.completedPuzzles = Math.max(user.completedPuzzles, 3);
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
