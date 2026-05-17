import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import "./VentilationShafts.css";
import API_BASE_URL from "../../config";

// ─── Typewriter hook (matching MedBay style) ────────────────────
const useTypewriter = (text, speed = 28, active = true) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!active) return;
    setDisplayed(''); setDone(false); setHidden(false);
    let i = 0;
    const t = setInterval(() => {
      setDisplayed(text.slice(0, i + 1)); i++;
      if (i >= text.length) { clearInterval(t); setDone(true); setTimeout(() => setHidden(true), 3000); }
    }, speed);
    return () => clearInterval(t);
  }, [text, active]);
  return { displayed, done, hidden };
};

// ─── Full-screen Smoke Particle System ──────────────────────────
const SmokeCanvas = ({ keys, onKeyReveal }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animRef = useRef(null);
  const revealedRef = useRef(new Set());
  const pointerRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointer = (e) => {
      if (e.touches && e.touches.length > 0) {
        pointerRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else {
        pointerRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    
    // Clear pointer when interaction stops
    const clearPointer = () => pointerRef.current = { x: -1000, y: -1000 };

    window.addEventListener('mousemove', handlePointer);
    window.addEventListener('touchmove', handlePointer);
    window.addEventListener('touchend', clearPointer);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const initParticles = () => {
      const particles = [];
      const w = canvas.width, h = canvas.height;
      for (let i = 0; i < 200; i++) { // thicker smoke
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 40 + Math.random() * 100,
          speedX: (Math.random() - 0.5) * 0.4,
          speedY: -0.1 - Math.random() * 0.3,
          opacity: 0.15 + Math.random() * 0.4, // much more opaque
          life: Math.random() * 300,
          maxLife: 300 + Math.random() * 300,
        });
      }
      return particles;
    };

    particlesRef.current = initParticles();

    const render = () => {
      const w = canvas.width, h = canvas.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      particlesRef.current.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.life++;

        // Push away from pointer (swipe effect)
        const dx = p.x - pointerRef.current.x;
        const dy = p.y - pointerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const pushForce = (150 - dist) / 150;
          p.x += (dx / dist) * pushForce * 12;
          p.y += (dy / dist) * pushForce * 12;
        }

        if (p.y < -p.size) p.y = h + p.size;
        if (p.x < -p.size) p.x = w + p.size;
        if (p.x > w + p.size) p.x = -p.size;

        if (p.life > p.maxLife) {
          p.x = Math.random() * w;
          p.y = h + Math.random() * 60;
          p.life = 0;
          p.opacity = 0.15 + Math.random() * 0.4;
        }

        const lifeRatio = p.life / p.maxLife;
        const fade = lifeRatio < 0.15 ? lifeRatio / 0.15 : lifeRatio > 0.75 ? (1 - lifeRatio) / 0.25 : 1;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        // Darker, thicker green
        gradient.addColorStop(0, `rgba(40, 160, 40, ${p.opacity * fade * 0.6})`);
        gradient.addColorStop(0.5, `rgba(20, 80, 20, ${p.opacity * fade * 0.25})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      });

      // Check if pointer reveals any keys
      keys.forEach((key, idx) => {
        if (revealedRef.current.has(idx)) return;
        const kx = (key.x / 100) * w;
        const ky = (key.y / 100) * h;
        const ptrDist = Math.sqrt((pointerRef.current.x - kx) ** 2 + (pointerRef.current.y - ky) ** 2);
        if (ptrDist < 120) { // reveal when user swipes near it
          revealedRef.current.add(idx);
          onKeyReveal(idx);
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handlePointer);
      window.removeEventListener('touchmove', handlePointer);
      window.removeEventListener('touchend', clearPointer);
    };
  }, [keys]);

  return <canvas ref={canvasRef} className="smoke-canvas-fullscreen" />;
};

// ─── Main Component ─────────────────────────────────────────────
const VentilationShafts = ({ onBack, user, setUser }) => {
  const [zombieCount, setZombieCount] = useState(0);
  const [myLockIndex, setMyLockIndex] = useState(null);
  const [zombieNames, setZombieNames] = useState({});
  const [keys, setKeys] = useState([]);
  const [revealedKeys, setRevealedKeys] = useState(new Set());
  const [collectedKeys, setCollectedKeys] = useState(new Set());
  const [unlockedLocks, setUnlockedLocks] = useState(new Set());
  const [found, setFound] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [humans, setHumans] = useState([]);

  // Phase tracking: 'search' → 'unlock' → 'execute'
  const myKeyCollected = collectedKeys.has(myLockIndex);
  const myLockUnlocked = unlockedLocks.has(myLockIndex);
  const allUnlocked = zombieCount > 0 && unlockedLocks.size >= zombieCount;

  // Voting state
  const [myVote, setMyVote] = useState(null);
  const [voteStatus, setVoteStatus] = useState(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  const socketRef = useRef(null);

  const introText = 'ENVIRONMENTAL OVERRIDE — ACCESSING DUCT NETWORK\n\nThe ventilation system has been compromised.\nToxic smoke floods the corridors, carrying the Chrysalis pathogen.\n\nHidden access keys are embedded in the duct panels.\nThe smoke will reveal them — find your key in the haze.';
  const { displayed, done: twDone, hidden: twHidden } = useTypewriter(introText, 22);

  // Fetch zombie info and generate keys
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/room-users/${user.roomCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const zombies = data.users.filter(u => u.persona === 'zombie' && !u.isAdmin);
          const count = zombies.length;
          setZombieCount(count);

          const myIdx = zombies.findIndex(z => z.uniqueId === user.uniqueId);
          if (myIdx !== -1) {
            setMyLockIndex(myIdx);
            const nameMap = {};
            zombies.forEach((z, idx) => { nameMap[idx] = z.name; });
            setZombieNames(nameMap);
          } else {
            setMyLockIndex(0);
          }

          // Generate deterministic key positions based on room code
          const seed = user.roomCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const generatedKeys = [];
          for (let i = 0; i < count; i++) {
            const pseudoRand = (seed * (i + 1) * 7919) % 10000;
            generatedKeys.push({
              id: i,
              x: 15 + (pseudoRand % 70),
              y: 25 + ((pseudoRand * 13) % 50),
              symbol: String.fromCharCode(0x0391 + i),
            });
          }
          setKeys(generatedKeys);
        }
      })
      .catch(() => { setMyLockIndex(0); setZombieCount(1); });
  }, [user.roomCode, user.uniqueId]);

  // Socket
  useEffect(() => {
    const socket = io(API_BASE_URL);
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-room', user.roomCode));

    socket.on('ventilation-update', (data) => {
      if (data.collectedKeys) setCollectedKeys(new Set(data.collectedKeys));
      if (data.unlockedLocks) setUnlockedLocks(new Set(data.unlockedLocks));
    });

    socket.on('ventilation-vote-update', (data) => {
      setVoteStatus(prev => ({
        ...prev,
        votesCount: data.votes.length,
        totalZombies: data.totalZombies,
        finalized: data.finalized,
        targetName: data.targetName,
        targetId: data.targetId
      }));
    });

    return () => socket.disconnect();
  }, [user.roomCode]);

  useEffect(() => {
    if (found && user.persona === 'zombie') fetchVoteStatus();
  }, [found, user.persona]);

  const isFinalized = voteStatus?.finalized;

  // Auto-navigate back to map when vote is finalized
  useEffect(() => {
    if (isFinalized) {
      const t = setTimeout(() => onBack(), 4000);
      return () => clearTimeout(t);
    }
  }, [isFinalized]);

  const fetchVoteStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/puzzles/ventilation-vote-status/${user.roomCode}`);
      const data = await res.json();
      if (data.success) setVoteStatus(data);
    } catch (e) { console.error('Failed to fetch vote status', e); }
  };

  const handleKeyReveal = useCallback((keyIdx) => {
    setRevealedKeys(prev => new Set([...prev, keyIdx]));
  }, []);

  const handleCollectKey = (keyIdx) => {
    if (keyIdx !== myLockIndex) return;
    if (collectedKeys.has(keyIdx)) return;

    const newCollected = new Set([...collectedKeys, keyIdx]);
    setCollectedKeys(newCollected);
    socketRef.current?.emit('ventilation-action', {
      roomCode: user.roomCode,
      collectedKeys: [...newCollected],
      unlockedLocks: [...unlockedLocks],
    });
  };

  const handleUnlockLock = (lockIdx) => {
    if (lockIdx !== myLockIndex) return;
    if (!collectedKeys.has(lockIdx)) return;
    if (unlockedLocks.has(lockIdx)) return;

    const newUnlocked = new Set([...unlockedLocks, lockIdx]);
    setUnlockedLocks(newUnlocked);
    socketRef.current?.emit('ventilation-action', {
      roomCode: user.roomCode,
      collectedKeys: [...collectedKeys],
      unlockedLocks: [...newUnlocked],
    });
  };

  const handleSubmit = async () => {
    if (!allUnlocked) {
      setMessage("ALL SEALS MUST BE UNLOCKED.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setMessage("OVERRIDING...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/puzzles/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId: user.uniqueId, puzzleId: 'ventilation_shafts', answer: 'override' })
      });
      const data = await res.json();
      if (data.success) {
        setFound(true);
        setUser(data.user);
        const hRes = await fetch(`${API_BASE_URL}/api/puzzles/humans/${user.roomCode}`);
        const hData = await hRes.json();
        if (hData.success) setHumans(hData.humans);
        fetchVoteStatus();
      } else {
        setMessage(data.message || "OVERRIDE REJECTED.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch { setMessage("SERVER ERROR."); }
    setSubmitting(false);
  };

  const handleVote = async (targetId) => {
    if (voteSubmitting) return;
    setVoteSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/puzzles/ventilation-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: user.uniqueId, targetId, roomCode: user.roomCode })
      });
      const data = await res.json();
      if (data.success || data.finalized) {
        setMyVote(targetId);
        setVoteStatus(prev => ({
          ...prev,
          finalized: data.finalized || false,
          targetName: data.targetName,
          votesCount: data.votesCount,
          totalZombies: data.totalZombies
        }));
      }
    } catch (e) { console.error('Vote failed', e); }
    setVoteSubmitting(false);
  };

  // Determine current phase for step-by-step UX
  const phase = myKeyCollected
    ? (myLockUnlocked ? 'execute' : 'unlock')
    : 'search';

  return (
    <div className="ventilation-container">
      <div className="glitch-overlay-vent" />

      {/* Full-screen smoke — always visible as part of the background */}
      <SmokeCanvas keys={keys} onKeyReveal={handleKeyReveal} />

      {/* Keys floating over the background (full-screen positioned) */}
      {!found && keys.map((key, idx) => {
        const isRevealed = revealedKeys.has(idx);
        const isCollected = collectedKeys.has(idx);
        const isMine = idx === myLockIndex;
        return (
          <div
            key={key.id}
            className={`vent-key ${isRevealed ? 'revealed' : ''} ${isCollected ? 'collected' : ''} ${isMine ? 'mine' : ''}`}
            style={{ left: `${key.x}%`, top: `${key.y}%` }}
            onClick={() => isRevealed && !isCollected && isMine && handleCollectKey(idx)}
          >
            <div className="key-icon">🔑</div>
            <div className="key-label">
              {isMine ? 'YOUR KEY' : (zombieNames[idx] || `KEY ${idx + 1}`)}
            </div>
          </div>
        );
      })}

      <div className="location-header">
        <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
      </div>

      {/* Typewriter intro */}
      <div className={`vent-typewriter ${twHidden ? 'hidden' : ''}`}>
        <pre className="vent-tw-text">{displayed}{!twDone && <span className="tw-cur">█</span>}</pre>
      </div>

      {/* Phase indicator — subtle hint at bottom */}
      {!found && (
        <div className="vent-phase-hint">
          {phase === 'search' && (
            <div className="phase-text">
              <span className="search-pulse" />
              SEARCHING FOR YOUR KEY IN THE SMOKE...
            </div>
          )}
          {phase === 'unlock' && !myLockUnlocked && (
            <div className="phase-text phase-unlock">
              🔑 KEY COLLECTED — UNLOCK YOUR SEAL BELOW
            </div>
          )}
          {phase === 'execute' && !allUnlocked && (
            <div className="phase-text phase-wait">
              🔓 YOUR SEAL IS OPEN — WAITING FOR OTHERS ({unlockedLocks.size}/{zombieCount})
            </div>
          )}
          {phase === 'execute' && allUnlocked && (
            <div className="phase-text phase-ready">
              ⚡ ALL SEALS OPEN — EXECUTE OVERRIDE
            </div>
          )}
        </div>
      )}

      {/* Lock panel — slides up ONLY after key is collected */}
      {!found && myKeyCollected && (
        <div className={`vent-lock-overlay ${myLockUnlocked ? 'minimized' : ''}`}>
          <div className="vent-lock-panel">
            <div className="lock-panel-title">AIRLOCK SEALS</div>
            <div className="lock-grid">
              {Array.from({ length: zombieCount }, (_, i) => {
                const isUnlocked = unlockedLocks.has(i);
                const hasKey = collectedKeys.has(i);
                const isMine = i === myLockIndex;
                return (
                  <div
                    key={i}
                    className={`lock-item ${isUnlocked ? 'unlocked' : ''} ${isMine ? 'mine' : ''} ${hasKey && !isUnlocked ? 'ready' : ''}`}
                    onClick={() => isMine && hasKey && !isUnlocked && handleUnlockLock(i)}
                  >
                    <div className="lock-icon">{isUnlocked ? '🔓' : '🔒'}</div>
                    <div className="lock-name">{isMine ? 'YOU' : (zombieNames[i] || `#${i + 1}`)}</div>
                    {isMine && !hasKey && <div className="lock-status">FIND KEY</div>}
                    {isMine && hasKey && !isUnlocked && <div className="lock-status tap">TAP TO UNLOCK</div>}
                    {isUnlocked && <div className="lock-status done">OPEN</div>}
                  </div>
                );
              })}
            </div>
            <div className="lock-progress">
              SEALS OPEN: {unlockedLocks.size} / {zombieCount}
            </div>
          </div>
        </div>
      )}

      {/* Execute override button — appears ONLY after your lock is unlocked */}
      {!found && myLockUnlocked && (
        <div className="vent-execute-bar">
          <button
            className="submit-vent-btn"
            onClick={handleSubmit}
            disabled={submitting || !allUnlocked}
          >
            ☣ EXECUTE OVERRIDE
          </button>
          {message && <div className="vent-message">{message}</div>}
        </div>
      )}

      {/* Voting panel — after puzzle solved */}
      {found && (
        <div className="vent-vote-overlay">
          <div className="mb-success zombie-target-panel vent-success-panel">
            <div className="mb-success-icon" style={{ color: '#f33' }}>☣</div>

            {isFinalized ? (
              <div className="vote-finalized-panel">
                <h2 className="vote-finalized-title">☠ TARGET SELECTED ☠</h2>
                <div className="vote-finalized-name">{voteStatus.targetName}</div>
                <p className="vote-finalized-sub">
                  The horde has spoken. Secondary infection deployed.
                  <br />Returning to map...
                </p>
              </div>
            ) : (
              <>
                <div className="vote-collab-banner">
                  <div className="vote-collab-icon">🧟‍♂️</div>
                  <h2>HORDE COUNCIL II</h2>
                  <p>
                    The air carries our gift.
                    <br />Vote together to select the next operative to assimilate.
                  </p>
                </div>

                {voteStatus && (
                  <div className="vote-progress">
                    <div className="vote-progress-bar">
                      <div
                        className="vote-progress-fill"
                        style={{ width: `${(voteStatus.votesCount / Math.max(voteStatus.totalZombies, 1)) * 100}%` }}
                      />
                    </div>
                    <div className="vote-progress-label">
                      {voteStatus.votesCount} / {voteStatus.totalZombies} zombies voted
                    </div>
                  </div>
                )}

                <div className="human-list vote-list">
                  {humans.length === 0 ? (
                    <p>No humans remaining...</p>
                  ) : (
                    humans.map(h => {
                      const voteCount = voteStatus?.tally?.[h.uniqueId] || 0;
                      const isMyVote = myVote === h.uniqueId;
                      return (
                        <button
                          key={h.uniqueId}
                          className={`target-btn vote-target-btn ${isMyVote ? 'voted' : ''}`}
                          onClick={() => handleVote(h.uniqueId)}
                          disabled={voteSubmitting}
                        >
                          <span className="vote-target-name">
                            {isMyVote && <span className="vote-check">✓ </span>}
                            {h.name}
                          </span>
                          {voteCount > 0 && (
                            <span className="vote-count">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {myVote && (
                  <div className="vote-waiting-msg">
                    Waiting for all zombies to vote...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VentilationShafts;
