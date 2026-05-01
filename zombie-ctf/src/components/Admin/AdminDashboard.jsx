import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './AdminDashboard.css';
import API_BASE_URL from '../../config';

const AdminDashboard = ({ user }) => {
    const [players, setPlayers] = useState([]);
    const [logs, setLogs] = useState([]);
    const socket = io(API_BASE_URL);

    useEffect(() => {
        // Initial fetch
        fetch(`${API_BASE_URL}/api/puzzles/players/${user.roomCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) setPlayers(data.players);
            });

        // Join room
        socket.emit('join-room', user.roomCode);

        // Listen for updates
        socket.on('progress-update', (data) => {
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${data.userName} solved ${data.puzzleId.toUpperCase()}!`, ...prev]);
            
            // Update player in list
            setPlayers(prev => prev.map(p => {
                if (p.name === data.userName) {
                    return { ...p, score: data.newScore, persona: data.persona };
                }
                return p;
            }));
        });

        return () => socket.disconnect();
    }, [user.roomCode]);

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>ADMIN CONTROL: ROOM {user.roomCode}</h1>
                <div className="admin-stats">
                    <span>ACTIVE OPERATORS: {players.length}</span>
                </div>
            </div>

            <div className="admin-grid">
                <div className="players-list">
                    <h2>OPERATOR STATUS</h2>
                    <div className="table-header">
                        <span>NAME</span>
                        <span>SCORE</span>
                        <span>STATUS</span>
                    </div>
                    {players.map(p => (
                        <div key={p.uniqueId} className={`player-row ${p.persona}`}>
                            <span>{p.name}</span>
                            <span>{p.score}</span>
                            <span>{p.persona.toUpperCase()}</span>
                        </div>
                    ))}
                </div>

                <div className="live-logs">
                    <h2>LIVE MISSION LOGS</h2>
                    <div className="logs-box">
                        {logs.map((log, i) => (
                            <div key={i} className="log-entry">{log}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
