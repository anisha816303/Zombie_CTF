import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './Lobby.css';
import API_BASE_URL from '../../config';

const Lobby = ({ user, onStartGame }) => {
    const [players, setPlayers] = useState([]);
    const [socketConnected, setSocketConnected] = useState(false);

    const fetchPlayers = () => {
        fetch(`${API_BASE_URL}/api/puzzles/players/${user.roomCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Include the host in the player list for visibility
                    // In our current logic, host is also a User with isAdmin: true
                    // Let's just fetch all users in the room
                    fetch(`${API_BASE_URL}/api/auth/room-users/${user.roomCode}`)
                        .then(r => r.json())
                        .then(d => {
                            if (d.success) setPlayers(d.users);
                        });
                }
            });
    };

    useEffect(() => {
        fetchPlayers();

        // Setup socket once and join
        const sock = io(API_BASE_URL);
        sock.on('connect', () => {
            sock.emit('join-room', user.roomCode);
            setSocketConnected(true);
        });

        sock.on('player-joined', () => fetchPlayers());
        sock.on('game-started', () => onStartGame());

        // Poll room status as a fallback for missed socket events
        const poll = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/room-status/${user.roomCode}`);
                const data = await res.json();
                if (data.success && data.status === 'active') {
                    clearInterval(poll);
                    onStartGame();
                }
            } catch (err) {
                // ignore
            }
        }, 2000);

        return () => {
            clearInterval(poll);
            sock.disconnect();
        };
    }, [user.roomCode]);

    const handleStart = async () => {
        const res = await fetch(`${API_BASE_URL}/api/auth/start-game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomCode: user.roomCode, uniqueId: user.uniqueId })
        });
        const data = await res.json();
        if (data.success) {
            onStartGame();
        } else {
            alert(data.error);
        }
    };

    return (
        <div className="lobby-container">
            <div className="lobby-box">
                <h1>MISSION LOBBY: {user.roomCode}</h1>
                <p className="lobby-subtitle">Waiting for operators to initialize...</p>

                <div className="players-grid">
                    {players.map(p => (
                        <div key={p.uniqueId} className={`player-card ${p.isAdmin ? 'is-host' : ''}`}>
                            <span className="player-emoji">{p.isAdmin ? '👑' : '👤'}</span>
                            <span className="player-name">{p.name} {p.uniqueId === user.uniqueId ? '(YOU)' : ''}</span>
                        </div>
                    ))}
                    {/* Empty slots */}
                    {[...Array(Math.max(0, 30 - players.length))].map((_, i) => (
                        <div key={i} className="player-card empty-slot">
                            <span>WAITING...</span>
                        </div>
                    ))}
                </div>

                {user.isAdmin ? (
                    <button className="start-btn" onClick={handleStart}>INITIALIZE MISSION</button>
                ) : (
                    <div className="waiting-msg">WAITING FOR HOST TO START...</div>
                )}
            </div>
        </div>
    );
};

export default Lobby;
