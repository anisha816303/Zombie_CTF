import React, { useState, useEffect } from "react";
import { io } from 'socket.io-client';
import Map from "./components/Map/Map";
import Laboratory from "./components/Lab/Laboratory";
import SectorB from "./components/SectorB/SectorB";
import MedBay from "./components/MedBay/MedBay";
import Archives from "./components/Archives/Archives";
import ControlRoom from "./components/ControlRoom/ControlRoom";
import Auth from "./components/Auth/Auth";
import AdminDashboard from "./components/Admin/AdminDashboard";

import API_BASE_URL from "./config";
import Lobby from "./components/Lobby/Lobby";

function App() {
  const [user, setUser] = useState(null);
  const [scene, setScene] = useState("map"); 
  const [roomStatus, setRoomStatus] = useState('waiting');
  const [visualPersona, setVisualPersona] = useState('person');
  const [infectionTimer, setInfectionTimer] = useState(null);

  useEffect(() => {
    if (user && scene === "map") setVisualPersona(user.persona);
  }, [user?.persona, scene]);

  const checkRoomStatus = async (roomCode) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/room-status/${roomCode}`);
      const data = await res.json();
      if (data.success) {
        setRoomStatus(data.status);
      }
    } catch (err) {
      console.error("Failed to check room status", err);
    }
  };

  // When user logs in, check if game is already active
  if (user && roomStatus === 'waiting') {
    checkRoomStatus(user.roomCode);
  }

  // Global socket listener so user state updates regardless of scene
  useEffect(() => {
    if (!user) return;
    const socket = io(API_BASE_URL);
    socket.on('connect', () => socket.emit('join-room', user.roomCode));

    socket.on('zombies-converted', (payload) => {
      if (!payload || !payload.converted) return;
      const me = payload.converted.find(c => c.uniqueId === user.uniqueId);
      if (me) {
        // fetch authoritative user record
        fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uniqueId: user.uniqueId })
        }).then(r => r.json()).then(d => {
          if (d.success && d.user) setUser(d.user);
        }).catch(() => {});
      }
    });

    socket.on('progress-update', (data) => {
      if (!data) return;
      if (data.userName === user.name) setUser(prev => ({ ...prev, score: data.newScore, persona: data.persona }));
    });

    socket.on('infection-targeted', (data) => {
      if (data.targetId === user.uniqueId) {
        setInfectionTimer(60);
      }
    });

    return () => socket.disconnect();
  }, [user?.uniqueId]);

  useEffect(() => {
    if (infectionTimer === null) return;
    if (infectionTimer <= 0) {
      setInfectionTimer(null);
      fetch(`${API_BASE_URL}/api/puzzles/timeout-infect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId: user.uniqueId })
      }).catch(() => {});
      return;
    }
    const t = setInterval(() => setInfectionTimer(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [infectionTimer, user?.uniqueId]);

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  // If room is waiting, show Lobby
  if (roomStatus === 'waiting') {
    return <Lobby user={user} onStartGame={() => setRoomStatus('active')} />;
  }

  // If user is Admin, show Dashboard (but they can also toggle to play)
  // Actually, let's keep it simple: Host plays too.
  // But AdminDashboard is still useful for tracking.
  // Maybe show AdminDashboard in a separate tab? 
  // Let's just follow "Normal user can be admin and play"
  
  if (user.isAdmin && scene === "admin") {
    return <AdminDashboard user={user} onBack={() => setScene("map")} />;
  }

  // Zombie mode theme injection
  if (visualPersona === 'zombie') {
    document.body.classList.add('zombie-mode');
  } else {
    document.body.classList.remove('zombie-mode');
  }

  return (
    <>
      {infectionTimer !== null && (
        <div className="global-infection-overlay">
          <div className="infection-warning">⚠️ BIOHAZARD TARGETED ⚠️</div>
          <div className="infection-time">{infectionTimer}s</div>
          <div className="infection-sub">Clear a puzzle before time runs out!</div>
        </div>
      )}
      {scene === "map"
    ? <Map 
        onEnterLab={() => setScene("lab")}
        onEnterSectorB={() => setScene("sector_b")}
        onEnterMedBay={() => setScene("med_bay")} 
        onEnterArchive={() => setScene("archive")}
        onEnterControlRoom={() => setScene("control_room")}
        user={user} 
        setUser={setUser}
        showAdminBtn={user.isAdmin}
        onOpenAdmin={() => setScene("admin")}
      />
    : scene === "lab" 
      ? <Laboratory onBack={() => setScene("map")} user={user} setUser={setUser} />
      : scene === "sector_b"
        ? <SectorB onBack={() => setScene("map")} user={user} setUser={setUser} />
        : scene === "archive"
          ? <Archives onBack={() => setScene("map")} user={user} setUser={setUser} />
          : scene === "control_room"
            ? <ControlRoom onBack={() => setScene("map")} user={user} setUser={setUser} />
            : <MedBay onBack={() => setScene("map")} user={user} setUser={setUser} />}
    </>
  );
}

export default App;