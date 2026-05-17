import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./ServerCore.css";
import API_BASE_URL from "../../config";

const NUM_NODES = 20;

const ServerCore = ({ onBack, user, setUser }) => {
  const [nodes, setNodes] = useState([]);
  const [humansCount, setHumansCount] = useState(1);
  const [flashlightPos, setFlashlightPos] = useState({ x: -100, y: -100 });
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const socketRef = useRef(null);
  const coreRef = useRef(null);

  // Initialize nodes
  useEffect(() => {
    const initNodes = [];
    // Generate 20 random positions
    for (let i = 0; i < NUM_NODES; i++) {
      initNodes.push({
        id: i,
        x: Math.random() * 80 + 10, // 10% to 90%
        y: Math.random() * 70 + 15, // 15% to 85%
        claimedBy: null,
        claimedName: null
      });
    }
    setNodes(initNodes);

    // Fetch total humans in room to calculate target
    fetch(`${API_BASE_URL}/api/puzzles/humans/${user.roomCode}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.humans.length > 0) {
          setHumansCount(d.humans.length);
        }
      })
      .catch(console.error);
  }, [user.roomCode]);

  useEffect(() => {
    const socket = io(API_BASE_URL);
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-room', user.roomCode));

    socket.on('server-core-update', (data) => {
      setNodes(data.nodes);
    });

    return () => socket.disconnect();
  }, [user.roomCode]);

  // --- Drag-based torch movement ---
  const getPointerPos = (e) => {
    if (!coreRef.current) return null;
    const rect = coreRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(clientY - rect.top, rect.height))
    };
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const pos = getPointerPos(e);
    if (pos) setFlashlightPos(pos);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    if (pos) setFlashlightPos(pos);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleNodeClick = (nodeId) => {
    setNodes(prevNodes => {
      const newNodes = prevNodes.map(n => {
        if (n.id === nodeId) {
          // Toggle claim
          if (n.claimedBy === user.uniqueId) {
            return { ...n, claimedBy: null, claimedName: null }; // unclaim
          } else if (!n.claimedBy) {
            return { ...n, claimedBy: user.uniqueId, claimedName: user.name }; // claim
          }
        }
        return n;
      });
      socketRef.current.emit('server-core-action', { roomCode: user.roomCode, nodes: newNodes });
      return newNodes;
    });
  };

  const handleSubmit = async () => {
    const claimedCount = nodes.filter(n => n.claimedBy).length;
    if (claimedCount < NUM_NODES) {
      setMessage("ERROR: ALL 20 NODES MUST BE STABILIZED.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    const myClaims = nodes.filter(n => n.claimedBy === user.uniqueId).length;
    const targetPerHuman = Math.floor(NUM_NODES / humansCount);

    if (myClaims !== targetPerHuman) {
      setMessage(`LOAD UNBALANCED. STABILIZE EXACTLY ${targetPerHuman} NODES.`);
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Check if everyone has the right amount (roughly)
    // Actually, backend will verify just the puzzle answer. 
    // We will submit the puzzle if we pass frontend checks.
    if (submitting) return;
    setSubmitting(true);
    setMessage("STABILIZING...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/puzzles/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId: user.uniqueId, puzzleId: 'server_core', answer: 'stabilize' })
      });
      const data = await res.json();
      if (data.success) {
        setMessage("CORE STABILIZED. MELTDOWN AVERTED.");
        setUser(data.user);
        setTimeout(() => onBack(), 3000);
      } else {
        setMessage(data.message || "SYNC FAILED.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("SERVER ERROR.");
    }
    setSubmitting(false);
  };

  const myClaims = nodes.filter(n => n.claimedBy === user.uniqueId).length;
  const targetPerHuman = Math.floor(NUM_NODES / humansCount);
  const totalClaimed = nodes.filter(n => n.claimedBy).length;
  const tempPercent = Math.min(100, 40 + (20 - totalClaimed) * 3); // Temp rises as fewer nodes stabilized

  return (
    <div className="server-core-container">
      <div className="core-scanlines" />

      <div className="location-header">
        <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
      </div>

      <div className="core-header">
        <h2>⚠ CORE MELTDOWN IMMINENT ⚠</h2>
        <p>Locate hidden diagnostic nodes with the torch and stabilize the grid before it overloads.</p>
        <div className="core-stats">
          <span>OPERATIVES: {humansCount}</span>
          <span>YOUR TARGET: {targetPerHuman} NODES</span>
        </div>
      </div>

      {/* Temperature indicator */}
      <div className="core-temp-bar">
        <div className="temp-label">
          <span>CORE TEMPERATURE</span>
          <span style={{ color: tempPercent > 70 ? '#ff3333' : '#ffaa00' }}>
            {tempPercent > 70 ? 'CRITICAL' : 'ELEVATED'}
          </span>
        </div>
        <div className="temp-track">
          <div className="temp-fill" style={{ width: `${tempPercent}%` }} />
        </div>
      </div>

      {/* Search area */}
      <div 
        className="core-interactive-area" 
        ref={coreRef} 
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Flashlight mask overlay */}
        <div 
          className="flashlight-overlay"
          style={{
            background: flashlightPos.x < 0
              ? 'rgba(0, 0, 0, 0.95)'
              : `radial-gradient(circle 100px at ${flashlightPos.x}px ${flashlightPos.y}px, transparent 0%, rgba(0, 0, 0, 0.93) 100%)`
          }}
        />

        {/* Draggable torch */}
        <div
          className={`torch-handle ${isDragging ? 'dragging' : ''} ${flashlightPos.x < 0 ? 'docked' : ''}`}
          style={flashlightPos.x >= 0 ? { left: flashlightPos.x, top: flashlightPos.y } : {}}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="torch-icon">🔦</div>
          {flashlightPos.x < 0 && <div className="torch-hint">DRAG TO SEARCH</div>}
        </div>

        {nodes.map(node => {
          const isClaimed = !!node.claimedBy;
          const isMine = node.claimedBy === user.uniqueId;
          
          return (
            <div 
              key={node.id}
              className={`core-node ${isClaimed ? 'claimed' : ''} ${isMine ? 'mine' : ''}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => handleNodeClick(node.id)}
            >
              <div className="node-inner" />
              {isClaimed && <span className="node-owner">{isMine ? 'YOU' : node.claimedName}</span>}
            </div>
          );
        })}
      </div>

      {/* Footer with progress */}
      <div className="core-footer">
        <div className="core-progress-bar">
          <div className="progress-row">
            <span className="progress-label">GRID STABILIZED</span>
            <span className={`progress-value ${totalClaimed >= NUM_NODES ? 'ready' : ''}`}>
              {totalClaimed} / {NUM_NODES}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(totalClaimed / NUM_NODES) * 100}%` }} />
          </div>
          <div className="progress-row">
            <span className="progress-label">YOUR LOAD</span>
            <span className={`progress-value ${myClaims === targetPerHuman ? 'ready' : myClaims > targetPerHuman ? 'warning' : ''}`}>
              {myClaims} / {targetPerHuman}
            </span>
          </div>
        </div>

        <button 
          className="submit-core-btn" 
          onClick={handleSubmit}
          disabled={submitting || totalClaimed < NUM_NODES || myClaims !== targetPerHuman}
        >
          ⚡ STABILIZE CORE
        </button>
        {message && (
          <div className={`core-message ${message.includes('AVERTED') ? 'success' : ''}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerCore;
