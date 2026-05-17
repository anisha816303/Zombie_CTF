import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./VentilationShafts.css";
import API_BASE_URL from "../../config";

const NUM_VALVES = 5;
const TARGET_ANGLES = [90, 180, 270, 0, 90]; // Solution angles

const VentilationShafts = ({ onBack, user, setUser }) => {
  const [valves, setValves] = useState([0, 0, 0, 0, 0]);
  const [found, setFound] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [humans, setHumans] = useState([]);
  
  // Voting state
  const [myVote, setMyVote] = useState(null);
  const [voteStatus, setVoteStatus] = useState(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(API_BASE_URL);
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-room', user.roomCode));

    socket.on('ventilation-update', (data) => {
      setValves(data.valves);
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
    if (found && user.persona === 'zombie') {
      fetchVoteStatus();
    }
  }, [found, user.persona]);

  const fetchVoteStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/puzzles/ventilation-vote-status/${user.roomCode}`);
      const data = await res.json();
      if (data.success) {
        setVoteStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch vote status', e);
    }
  };

  const handleValveClick = (index) => {
    if (found) return;
    setValves(prev => {
      const newValves = [...prev];
      newValves[index] = (newValves[index] + 90) % 360;
      socketRef.current.emit('ventilation-action', { roomCode: user.roomCode, valves: newValves });
      return newValves;
    });
  };

  const checkSolution = () => {
    for (let i = 0; i < NUM_VALVES; i++) {
      if (valves[i] !== TARGET_ANGLES[i]) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!checkSolution()) {
      setMessage("AIRFLOW BLOCKED. ALIGNMENT INCORRECT.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    setMessage("OVERRIDING ENVIRONMENTAL CONTROLS...");

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
        if (hData.success) {
          setHumans(hData.humans);
        }
        fetchVoteStatus();
      } else {
        setMessage("SYSTEM REJECTED OVERRIDE.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("SERVER ERROR.");
    }
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
        if (data.finalized) {
          setVoteStatus(prev => ({
            ...prev,
            finalized: true,
            targetName: data.targetName,
            votesCount: data.votesCount,
            totalZombies: data.totalZombies
          }));
        } else {
          setVoteStatus(prev => ({
            ...prev,
            votesCount: data.votesCount,
            totalZombies: data.totalZombies
          }));
        }
      }
    } catch (e) {
      console.error('Vote failed', e);
    }
    setVoteSubmitting(false);
  };

  const isFinalized = voteStatus?.finalized;

  return (
    <div className="ventilation-container">
      <div className="glitch-overlay-vent" />

      <div className="location-header">
        <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
      </div>

      <div className="ventilation-content">
        {!found ? (
          <>
            <div className="vent-header">
              <h2>💨 VENTILATION SHAFTS 💨</h2>
              <p>Override the environmental controls to distribute the Chrysalis virus to the remaining safe zones.</p>
              <p>Align the valves to open the main airflow ducts.</p>
            </div>

            <div className="valves-panel">
              {valves.map((angle, i) => (
                <div className="valve-wrapper" key={i}>
                  <div className="valve-target-indicator" style={{ transform: `rotate(${TARGET_ANGLES[i]}deg)` }} />
                  <div 
                    className="valve" 
                    style={{ transform: `rotate(${angle}deg)` }}
                    onClick={() => handleValveClick(i)}
                  >
                    <div className="valve-handle"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="vent-footer">
              <button 
                className="submit-vent-btn" 
                onClick={handleSubmit}
                disabled={submitting || !checkSolution()}
              >
                EXECUTE OVERRIDE
              </button>
              {message && <div className="vent-message">{message}</div>}
            </div>
          </>
        ) : (
          <div className="mb-success zombie-target-panel vent-success-panel">
            <div className="mb-success-icon" style={{color: '#f33'}}>☣</div>

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
