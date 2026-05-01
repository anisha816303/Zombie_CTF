import React, { useState, useEffect, useRef } from "react";
import "./Map.css";
import Typewriter from "./Typewriter";

// CTF Easter egg
console.log("Genesis was never meant to be contained.");

// Node positions (percentage-based so they scale)
const NODES = [
  {
    id: "lab",
    label: "LABORATORY",
    status: "ONLINE",
    emoji: "🧪",
    pos: { x: 52, y: 48 },
    locked: false,
  },
  {
    id: "sector_b",
    label: "SECTOR B",
    status: "RESTRICTED",
    emoji: "🏭",
    pos: { x: 22, y: 32 },
    locked: true,
  },
  {
    id: "med_bay",
    label: "MED BAY",
    status: "OFFLINE",
    emoji: "🏥",
    pos: { x: 75, y: 28 },
    locked: true,
  },
  {
    id: "control",
    label: "CONTROL",
    status: "CORRUPTED",
    emoji: "📡",
    pos: { x: 78, y: 70 },
    locked: true,
  },
  {
    id: "archive",
    label: "ARCHIVES",
    status: "INACCESSIBLE",
    emoji: "🗂️",
    pos: { x: 28, y: 72 },
    locked: true,
  },
];



import API_BASE_URL from "../../config";

const Map = ({ onEnterLab, onEnterSectorB, onEnterMedBay, user, showAdminBtn, onOpenAdmin }) => {
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [targetVisible, setTargetVisible] = useState(false);
  const [popup, setPopup] = useState(null);         // node id of locked popup
  const [warningIdx, setWarningIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const areaRef = useRef(null);

  let targetNodeId = "lab";
  if (user?.completedPuzzles >= 1) {
    targetNodeId = user?.persona === "zombie" ? "med_bay" : "sector_b";
  }

  const getWarnings = () => {
    if (!user || user.completedPuzzles === 0) {
      return [
        "WARNING: Infection levels rising",
        "ALERT: Containment protocol failed",
        "WARNING: Network instability detected",
        "ALERT: Bio-hazard level CRITICAL",
        "WARNING: Unknown signal traced — sector 7",
      ];
    }
    if (user.persona === 'zombie') {
      return [
        "SYSTEM CORRUPTED",
        "FLESH DETECTED IN MED BAY",
        "HUNT INITIATED",
        "HUNGER RISING",
        "INFECTION SPREADING"
      ];
    }
    return [
      "WARNING: Sector B containment breach",
      "ALERT: Stay clear of infected zones",
      "WARNING: Hostile entities detected",
      "EVACUATION PROTOCOL INITIATED"
    ];
  };

  const WARNINGS = getWarnings();

  // Show target node after typewriter + short delay
  useEffect(() => {
    if (typewriterDone) {
      const t = setTimeout(() => setTargetVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [typewriterDone]);

  // Cycle warning messages
  useEffect(() => {
    const t = setInterval(() => {
      setWarningIdx((i) => (i + 1) % WARNINGS.length);
    }, 3500);
    return () => clearInterval(t);
  }, [WARNINGS.length]); // Added WARNINGS.length to dependency

  // Live clock
  useEffect(() => {
    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", { hour12: false })
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const handleNodeClick = (node) => {
    if (node.locked) {
      setPopup(node.id);
      return;
    }
    // Lab node → navigate
    if (node.id === "lab" && onEnterLab) {
      onEnterLab();
    }
    // Sector B navigate
    if (node.id === "sector_b" && onEnterSectorB) {
      onEnterSectorB();
    }
    // Med Bay navigate
    if (node.id === "med_bay" && onEnterMedBay) {
      onEnterMedBay();
    }
  };

  const handleReset = async () => {
    if (!window.confirm("RESET ALL PROGRESS? This is for testing only.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/puzzles/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId: user.uniqueId })
      });
      const data = await res.json();
      if (data.success) {
        // Update user state and reload or just let React re-render
        // Since we are resetting, we might want to restart the typewriter
        window.location.reload(); 
      }
    } catch (err) {
      console.error("Reset failed", err);
    }
  };

  return (
    <div className="map-page">
      {/* Background */}
      <div className="map-bg" />
      <div className="map-scanlines" />
      <div className="map-flicker" />

      {/* Top bar */}
      <div className="status-bar">
        <span className="status-left">PROJECT GENESIS — SECTOR MAP</span>
        <div className="status-right">
          {showAdminBtn && <button className="admin-debug-btn" onClick={onOpenAdmin}>[ ADMIN PANEL ]</button>}
          <button className="reset-debug-btn" onClick={handleReset}>[ RESET PROGRESS ]</button>
          &nbsp;|&nbsp; SYS-TIME: {currentTime} &nbsp;|&nbsp; NODE COUNT: {NODES.length}
        </div>
      </div>

      {/* Corner warning */}
      <div className="warning-banner">
        <span className="warning-label">⚠ SYSTEM ALERT</span>
        {WARNINGS[warningIdx]}
      </div>

      {/* Main content */}
      <div className="map-content">
        {/* Left — typewriter */}
        <div className="typewriter-panel">
          <Typewriter user={user} onComplete={() => setTypewriterDone(true)} />
        </div>

        {/* Right — map nodes */}
        <div className="map-nodes-area" ref={areaRef}>
          {/* SVG connection lines */}
          <svg className="map-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
            {NODES.filter((n) => n.id !== "lab").map((node) => {
              const lab = NODES.find((n) => n.id === "lab");
              return (
                <line
                  key={node.id}
                  x1={`${lab.pos.x}%`}
                  y1={`${lab.pos.y}%`}
                  x2={`${node.pos.x}%`}
                  y2={`${node.pos.y}%`}
                  stroke="rgba(0,255,80,0.12)"
                  strokeWidth="0.3"
                  strokeDasharray="1,2"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {NODES.map((node) => {
            /* Target node hidden until typewriter done */
            if (node.id === targetNodeId && !targetVisible) return null;

            // Dynamic node logic
            let isLocked = node.locked;
            let currentStatus = node.status;
            
            if (node.id === "lab") {
              isLocked = false;
              if (user?.completedPuzzles >= 1) currentStatus = "CLEARED";
            }
            if (node.id === "sector_b" && user?.completedPuzzles >= 1 && user?.persona === "person") {
              isLocked = false;
              currentStatus = "ONLINE";
            }
            if (node.id === "med_bay" && user?.completedPuzzles >= 1 && user?.persona === "zombie") {
              isLocked = false;
              currentStatus = "INFECTED";
            }

            return (
              <div
                key={node.id}
                className={`map-node ${isLocked ? "node-locked" : "node-unlocked"} ${node.id === targetNodeId && targetVisible ? "node-appear" : ""
                  }`}
                style={{
                  left: `${node.pos.x}%`,
                  top: `${node.pos.y}%`,
                }}
                onClick={() => handleNodeClick({ ...node, locked: isLocked })}
                title={isLocked ? "ACCESS DENIED" : `Enter ${node.label}`}
              >
                <div className="node-icon">{node.emoji}</div>
                <div className="node-label">{node.label}</div>
                <div className="node-status">{currentStatus}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Locked popup */}
      {popup && (
        <div className="glitch-popup" onClick={() => setPopup(null)}>
          <div
            className="glitch-popup-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-title">ACCESS DENIED</div>
            <div className="popup-sub">REQUIREMENTS NOT MET</div>
            <button className="popup-close" onClick={() => setPopup(null)}>
              [CLOSE]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
