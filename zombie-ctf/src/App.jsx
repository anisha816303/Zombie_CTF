import React, { useState } from "react";
import Map from "./components/Map/Map";
import Laboratory from "./components/Lab/Laboratory";
import SectorB from "./components/SectorB/SectorB";
import MedBay from "./components/MedBay/MedBay";
import Auth from "./components/Auth/Auth";
import AdminDashboard from "./components/Admin/AdminDashboard";

import API_BASE_URL from "./config";
import Lobby from "./components/Lobby/Lobby";

function App() {
  const [user, setUser] = useState(null);
  const [scene, setScene] = useState("map"); 
  const [roomStatus, setRoomStatus] = useState('waiting');

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
  if (user.persona === 'zombie') {
    document.body.classList.add('zombie-mode');
  } else {
    document.body.classList.remove('zombie-mode');
  }

  return scene === "map"
    ? <Map 
        onEnterLab={() => setScene("lab")} 
        onEnterSectorB={() => setScene("sector_b")} 
        onEnterMedBay={() => setScene("med_bay")} 
        user={user} 
        setUser={setUser}
        showAdminBtn={user.isAdmin}
        onOpenAdmin={() => setScene("admin")}
      />
    : scene === "lab" 
      ? <Laboratory onBack={() => setScene("map")} user={user} setUser={setUser} />
      : scene === "sector_b"
        ? <SectorB onBack={() => setScene("map")} user={user} setUser={setUser} />
        : <MedBay onBack={() => setScene("map")} user={user} setUser={setUser} />;
}

export default App;