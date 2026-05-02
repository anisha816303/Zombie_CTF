import React, { useState, useEffect, useRef } from "react";
import { io } from 'socket.io-client';
import "./SectorB.css";
import API_BASE_URL from "../../config";

const SectorB = ({ onBack, user, setUser }) => {
    const [flagInput, setFlagInput] = useState("");
    const [message, setMessage] = useState("");
    const [found, setFound] = useState(false);

    // Collaborative Game State
    const [assignedStation, setAssignedStation] = useState(null); // 'left' or 'right'
    const [assignedColor, setAssignedColor] = useState(null); // 'red', 'green', 'blue', 'orange'
    const [isHolding, setIsHolding] = useState(false);
    const [roomStates, setRoomStates] = useState({}); // userId -> { station, color, isHolding }
    const [syncProgress, setSyncProgress] = useState(0);
    const [isSynced, setIsSynced] = useState(false);
    const [terminalVisible, setTerminalVisible] = useState(false);
    
    const socketRef = useRef(null);
    const progressInterval = useRef(null);

    const COLORS = ['red', 'green', 'blue', 'orange'];

    // Initialize Station and Color
    useEffect(() => {
        const station = Math.random() > 0.5 ? 'left' : 'right';
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        setAssignedStation(station);
        setAssignedColor(color);

        // Socket Setup
        socketRef.current = io(API_BASE_URL);
        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-room', user.roomCode);
        });

        socketRef.current.on('sector-b-update', (data) => {
            if (data.userId === user.uniqueId) return;
            setRoomStates(prev => ({
                ...prev,
                [data.userId]: { station: data.station, color: data.color, isHolding: data.isHolding }
            }));
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            if (progressInterval.current) clearInterval(progressInterval.current);
        };
    }, []);

    // Broadcast hold state
    useEffect(() => {
        if (!socketRef.current || !assignedStation || !assignedColor) return;
        socketRef.current.emit('sector-b-action', {
            roomCode: user.roomCode,
            userId: user.uniqueId,
            station: assignedStation,
            color: assignedColor,
            isHolding: isHolding
        });
    }, [isHolding, assignedStation, assignedColor]);

    // Check for partner match and progress sync
    useEffect(() => {
        if (isSynced) return;

        const partnerMatch = Object.values(roomStates).find(state => 
            state.isHolding && 
            state.color === assignedColor && 
            state.station !== assignedStation
        );

        if (isHolding && partnerMatch) {
            if (!progressInterval.current) {
                progressInterval.current = setInterval(() => {
                    setSyncProgress(prev => {
                        if (prev >= 100) {
                            clearInterval(progressInterval.current);
                            progressInterval.current = null;
                            handleSyncSuccess();
                            return 100;
                        }
                        return prev + 5; // ~2 seconds to full
                    });
                }, 100);
            }
        } else {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
                progressInterval.current = null;
            }
            setSyncProgress(0);
        }
    }, [isHolding, roomStates, assignedColor, assignedStation, isSynced]);

    const handleSyncSuccess = () => {
        setIsSynced(true);
        setTerminalVisible(true);
        setMessage("SYNCHRONIZATION COMPLETE. ACCESS GRANTED.");
    };

    const handleReset = () => {
        setFlagInput("");
        setMessage("");
        setTerminalVisible(false);
        setSyncProgress(0);
        setIsSynced(false);
        setIsHolding(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("Checking...");
        try {
            const res = await fetch(`${API_BASE_URL}/api/puzzles/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    uniqueId: user.uniqueId, 
                    puzzleId: 'sector_b', 
                    answer: flagInput 
                })
            });
            const data = await res.json();
            if (data.success) {
                setFound(true);
                setMessage(data.zombieConverted ? "SYSTEM ERROR: INFECTION DETECTED. YOU ARE NOW A ZOMBIE." : "Flag Accepted.");
                setUser(data.user);
                setTimeout(() => onBack(), 2000);
            } else {
                setMessage(data.message || "Incorrect flag.");
            }
        } catch (err) {
            setMessage("Server error.");
        }
    };

    return (
        <div className="sectorb-container">
            <div className="glitch-overlay"></div>
            
            <div className="location-header">
                <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
                <button className="reset-puzzle-btn" onClick={handleReset}>[ RESET ]</button>
            </div>

            {!terminalVisible && !found && (
                <div className="sectorb-objective">
                    <h3>[ MISSION: LOCKDOWN BYPASS ]</h3>
                    <p>STATION: <span className="highlight-text">{assignedStation?.toUpperCase()}</span></p>
                    <p>FIND A PARTNER WITH <span className={`color-text color-${assignedColor}`}>{assignedColor?.toUpperCase()}</span> GLOW</p>
                    <p className="sub-hint">AT THE {assignedStation === 'left' ? 'RIGHT' : 'LEFT'} STATION</p>
                </div>
            )}

            {!found && !terminalVisible && (
                <>
                    {/* The Switches */}
                    <div 
                        className={`arm-switch left-arm ${assignedStation === 'left' ? 'active-station' : 'disabled-station'} ${isHolding && assignedStation === 'left' ? 'holding' : ''}`}
                        onMouseDown={() => assignedStation === 'left' && setIsHolding(true)}
                        onMouseUp={() => setIsHolding(false)}
                        onMouseLeave={() => setIsHolding(false)}
                        onTouchStart={() => assignedStation === 'left' && setIsHolding(true)}
                        onTouchEnd={() => setIsHolding(false)}
                    >
                        <div className={`glow-bulb bulb-${assignedColor}`}></div>
                    </div>

                    <div 
                        className={`arm-switch right-arm ${assignedStation === 'right' ? 'active-station' : 'disabled-station'} ${isHolding && assignedStation === 'right' ? 'holding' : ''}`}
                        onMouseDown={() => assignedStation === 'right' && setIsHolding(true)}
                        onMouseUp={() => setIsHolding(false)}
                        onMouseLeave={() => setIsHolding(false)}
                        onTouchStart={() => assignedStation === 'right' && setIsHolding(true)}
                        onTouchEnd={() => setIsHolding(false)}
                    >
                        <div className={`glow-bulb bulb-${assignedColor}`}></div>
                    </div>

                    {/* Sync Overlay */}
                    {syncProgress > 0 && (
                        <div className="sync-overlay">
                            <div className="sync-meter-container">
                                <p>SYNCHRONIZING WITH PARTNER...</p>
                                <div className="sync-bar">
                                    <div className="sync-fill" style={{ width: `${syncProgress}%` }}></div>
                                </div>
                                <p className="sync-percent">{Math.round(syncProgress)}%</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {(terminalVisible || found) && (
                <div className="puzzle-panel">
                    <h2>SECTOR B TERMINAL</h2>
                    {!found ? (
                        <form onSubmit={handleSubmit} className="puzzle-form">
                            <p className="success-msg">Industrial containment systems online.</p>
                            <input 
                                type="text" 
                                value={flagInput} 
                                onChange={(e) => setFlagInput(e.target.value)} 
                                placeholder="ENTER SECURITY OVERRIDE..." 
                                required 
                            />
                            <button type="submit" className="submit-btn">BYPASS LOCKDOWN</button>
                        </form>
                    ) : (
                        <div className="flag-message success-msg">
                            <h2>{message}</h2>
                            <p>Sector B: SECURED</p>
                        </div>
                    )}
                    {message && !found && <div className="flag-message error-msg">{message}</div>}
                </div>
            )}
        </div>
    );
};

export default SectorB;
