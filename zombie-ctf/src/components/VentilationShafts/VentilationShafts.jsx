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

// ─── Smoke Particle System ──────────────────────────────────────
const SmokeCanvas = ({ keys, onKeyReveal, width, height }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animRef = useRef(null);
  const revealedRef = useRef(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Initialize smoke particles
    const initParticles = () => {
      const particles = [];
      for (let i = 0; i < 60; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 20 + Math.random() * 50,
          speedX: (Math.random() - 0.5) * 0.8,
          speedY: -0.3 - Math.random() * 0.5,
          opacity: 0.15 + Math.random() * 0.25,
          life: Math.random() * 200,
          maxLife: 200 + Math.random() * 200,
        });
      }
      return particles;
    };

    particlesRef.current = initParticles();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw ambient haze
      ctx.fillStyle = 'rgba(0, 30, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      particlesRef.current.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.life++;

        // Wrap around
        if (p.y < -p.size) p.y = height + p.size;
        if (p.x < -p.size) p.x = width + p.size;
        if (p.x > width + p.size) p.x = -p.size;

        // Reset old particles
        if (p.life > p.maxLife) {
          p.x = Math.random() * width;
          p.y = height + Math.random() * 40;
          p.life = 0;
          p.opacity = 0.15 + Math.random() * 0.25;
        }

        const lifeRatio = p.life / p.maxLife;
        const fade = lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `rgba(80, 200, 80, ${p.opacity * fade * 0.4})`);
        gradient.addColorStop(0.5, `rgba(40, 100, 40, ${p.opacity * fade * 0.2})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);

        // Check if smoke reveals any keys
        keys.forEach((key, idx) => {
          if (revealedRef.current.has(idx)) return;
          const kx = (key.x / 100) * width;
          const ky = (key.y / 100) * height;
          const dist = Math.sqrt((p.x - kx) ** 2 + (p.y - ky) ** 2);
          if (dist < p.size * 0.6 && fade > 0.5) {
            revealedRef.current.add(idx);
            onKeyReveal(idx);
          }
        });
      });

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [keys, width, height]);

  return <canvas ref={canvasRef} className="smoke-canvas" />;
};

// ─── Main Component ─────────────────────────────────────────────
const VentilationShafts = ({ onBack, user, setUser }) => {
  const [zombieCount, setZombieCount] = useState(0);
  const [myLockIndex, setMyLockIndex] = useState(null);
  const [zombieNames, setZombieNames] = useState({});
  const [keys, setKeys] = useState([]);
  const [revealedKeys, setRevealedKeys] = useState(new Set());
  const [collectedKeys, setCollectedKeys] = useState(new Set()); // keys collected by ANY zombie
  const [unlockedLocks, setUnlockedLocks] = useState(new Set());
  const [found, setFound] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [humans, setHumans] = useState([]);
  const [areaDims, setAreaDims] = useState({ width: 360, height: 400 });
  const areaRef = useRef(null);

  // Voting state
  const [myVote, setMyVote] = useState(null);
  const [voteStatus, setVoteStatus] = useState(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  const socketRef = useRef(null);

  const introText = 'ENVIRONMENTAL OVERRIDE — ACCESSING DUCT NETWORK\n\nThe ventilation system has been compromised.\nToxic smoke floods the corridors, carrying the Chrysalis pathogen.\n\nHidden access keys are embedded in the duct panels.\nThe smoke will reveal them — collect your key and unlock the seal.';
  const { displayed, done: twDone, hidden: twHidden } = useTypewriter(introText, 22);

  // Measure area
  useEffect(() => {
    const measure = () => {
      if (areaRef.current) {
        const rect = areaRef.current.getBoundingClientRect();
        setAreaDims({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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
              x: 10 + (pseudoRand % 80), // 10% to 90%
              y: 10 + ((pseudoRand * 13) % 70), // 10% to 80%
              symbol: String.fromCharCode(0x0391 + i), // Greek letters: Α, Β, Γ, ...
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
    if (keyIdx !== myLockIndex) return; // Only collect YOUR key
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
    if (lockIdx !== myLockIndex) return; // Only unlock YOUR lock
    if (!collectedKeys.has(lockIdx)) return; // Must have collected the key first
    if (unlockedLocks.has(lockIdx)) return;

    const newUnlocked = new Set([...unlockedLocks, lockIdx]);
    setUnlockedLocks(newUnlocked);
    socketRef.current?.emit('ventilation-action', {
      roomCode: user.roomCode,
      collectedKeys: [...collectedKeys],
      unlockedLocks: [...newUnlocked],
    });
  };

  const allUnlocked = zombieCount > 0 && unlockedLocks.size >= zombieCount;

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

  const isFinalized = voteStatus?.finalized;
  const myKeyCollected = collectedKeys.has(myLockIndex);
  const myLockUnlocked = unlockedLocks.has(myLockIndex);

  return (
    <div className="ventilation-container">
      <div className="glitch-overlay-vent" />

      <div className="location-header">
        <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
      </div>

      {/* Typewriter intro */}
      <div className={`vent-typewriter ${twHidden ? 'hidden' : ''}`}>
        <pre className="vent-tw-text">{displayed}{!twDone && <span className="tw-cur">█</span>}</pre>
      </div>

      <div className="ventilation-content">
        {!found ? (
          <>
            {/* Smoke search area */}
            <div className="vent-search-area" ref={areaRef}>
              <SmokeCanvas
                keys={keys}
                onKeyReveal={handleKeyReveal}
                width={areaDims.width}
                height={areaDims.height}
              />

              {/* Hidden keys revealed by smoke */}
              {keys.map((key, idx) => {
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

              {/* Area label */}
              <div className="search-area-label">
                <span className="search-pulse" /> TOXIC SMOKE ZONE — KEYS HIDDEN
              </div>
            </div>

            {/* Lock panel */}
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

            {/* Submit */}
            <div className="vent-footer">
              <button
                className="submit-vent-btn"
                onClick={handleSubmit}
                disabled={submitting || !allUnlocked}
              >
                ☣ EXECUTE OVERRIDE
              </button>
              {message && <div className="vent-message">{message}</div>}
            </div>
          </>
        ) : (
          <div className="mb-success zombie-target-panel vent-success-panel">
            <div className="mb-success-icon" style={{ color: '#f33' }}>☣</div>

            {isFinalized ? (
              <div className="vote-finalized-panel">
                <h2 className="vote-finalized-title">☠ TARGET SELECTED ☠</h2>
                <div className="vote-finalized-name">{voteStatus.targetName}</div>
                <p className="vote-finalized-sub">
                  The horde has spoken. Secondary infection deployed.
                </p>
                <button className="vote-return-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
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
        )}
      </div>
    </div>
  );
};

export default VentilationShafts;
