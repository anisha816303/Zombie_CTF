import React, { useState, useEffect, useMemo, useRef } from "react";
import "./SectorB.css";
import API_BASE_URL from "../../config";

const TypewriterHeader = ({ text }) => {
    const [displayedText, setDisplayedText] = useState("");
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            setDisplayedText(text.slice(0, i));
            i++;
            if (i > text.length) clearInterval(timer);
        }, 50);
        return () => clearInterval(timer);
    }, [text]);
    return <div className="typewriter-header">{displayedText}</div>;
};

const SectorB = ({ onBack, user, setUser }) => {
    const [enteredCode, setEnteredCode] = useState("");
    const [message, setMessage] = useState("");
    const [found, setFound] = useState(false);
    const [showValvePanel, setShowValvePanel] = useState(false);
    const [valveProgress, setValveProgress] = useState(0);
    const [isValveDone, setIsValveDone] = useState(false);
    
    // Dynamic Assignment State
    const [assignment, setAssignment] = useState({ color: 'red', valveIndex: 0, fullCode: "" });
    
    const turnInterval = useRef(null);
    const COLORS = ['red', 'green', 'blue', 'orange'];

    useEffect(() => {
        // Fetch room users to assign color/valve in order of entry
        fetch(`${API_BASE_URL}/api/auth/room-users/${user.roomCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const myIndex = data.users.findIndex(u => u.uniqueId === user.uniqueId);
                    if (myIndex !== -1) {
                        const colorIdx = Math.floor(myIndex / 5) % COLORS.length;
                        const color = COLORS[colorIdx];
                        const valveIndex = myIndex % 5;
                        
                        // Deterministic code for this room + color group
                        const roomColorSeed = (user.roomCode + color).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                        const fullCode = (roomColorSeed * 12345).toString().slice(-5);
                        const digit = fullCode[valveIndex];
                        setAssignment({ color, valveIndex, fullCode, digit });
                        console.log(`[DEV] SECTOR B OVERRIDE (${color.toUpperCase()}):`, fullCode);
                    }
                }
            });
    }, [user.roomCode, user.uniqueId]);

    const puzzleState = assignment;

    const startTurning = () => {
        if (isValveDone) return;
        turnInterval.current = setInterval(() => {
            setValveProgress(prev => {
                if (prev >= 100) {
                    clearInterval(turnInterval.current);
                    setIsValveDone(true);
                    return 100;
                }
                return prev + 2;
            });
        }, 50);
    };

    const stopTurning = () => {
        if (turnInterval.current) clearInterval(turnInterval.current);
    };

    const handleKeypadPress = (num) => {
        if (enteredCode.length < 5) setEnteredCode(prev => prev + num);
    };

    const handleSubmitCode = async () => {
        if (enteredCode === puzzleState.fullCode) {
            setMessage("Checking database...");
            try {
                const res = await fetch(`${API_BASE_URL}/api/puzzles/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uniqueId: user.uniqueId, puzzleId: 'sector_b', answer: 'containment' })
                });
                const data = await res.json();
                if (data.success) {
                    setFound(true);
                    setMessage(data.zombieConverted ? "INFECTION DETECTED. YOU ARE NOW A ZOMBIE." : "ACCESS GRANTED.");
                    setUser(data.user);
                    setTimeout(() => onBack(), 3000);
                }
            } catch (err) {
                setMessage("Server error.");
            }
        } else {
            setMessage("INVALID OVERRIDE CODE");
            setEnteredCode("");
            setTimeout(() => setMessage(""), 2000);
        }
    };

    return (
        <div className="sectorb-container">
            <div className="glitch-overlay"></div>
            
            <div className="location-header">
                <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
            </div>

            <TypewriterHeader text="Explore the room... the door holds the way to unlocking the secret and the schemes behind all of this..." />

            {!found && (
                <>
                    {/* The Door Trigger */}
                    <div className="door-trigger" onClick={() => setShowValvePanel(true)}></div>

                    {showValvePanel && (
                        <div className="valve-panel-overlay">
                            <div className="valve-panel">
                                <h3>MECHANICAL OVERRIDE: {puzzleState.color.toUpperCase()}</h3>
                                <div className="valve-grid">
                                    {[0, 1, 2, 3, 4].map(idx => (
                                        <div 
                                            key={idx} 
                                            className={`valve-station ${idx === puzzleState.valveIndex ? 'active-valve' : 'inactive-valve'}`}
                                        >
                                            <div 
                                                className={`valve-handle ${idx === puzzleState.valveIndex && valveProgress > 0 ? 'rotating' : ''} ${isValveDone ? 'done' : ''}`}
                                                style={{ color: idx === puzzleState.valveIndex ? puzzleState.color : 'transparent' }}
                                                onMouseDown={idx === puzzleState.valveIndex ? startTurning : null}
                                                onMouseUp={stopTurning}
                                                onMouseLeave={stopTurning}
                                                onTouchStart={idx === puzzleState.valveIndex ? startTurning : null}
                                                onTouchEnd={stopTurning}
                                            >
                                                {isValveDone && idx === puzzleState.valveIndex && <span className="valve-digit">{puzzleState.digit}</span>}
                                            </div>
                                            <p>UNIT {idx + 1}</p>
                                        </div>
                                    ))}
                                </div>

                                {puzzleState.valveIndex !== null && !isValveDone && (
                                    <div className="valve-progress-container">
                                        <p>HOLD TO ROTATE UNIT {puzzleState.valveIndex + 1}</p>
                                        <div className="valve-bar"><div className="valve-fill" style={{ width: `${valveProgress}%` }}></div></div>
                                    </div>
                                )}

                                {isValveDone && (
                                    <div className="valve-success-info">
                                        <p>UNIT {puzzleState.valveIndex + 1} SYNCHRONIZED. YOUR DIGIT: <span className="big-digit">{puzzleState.digit}</span></p>
                                        <button className="open-keypad-btn" onClick={() => setShowValvePanel(false)}>PROCEED TO KEYPAD</button>
                                    </div>
                                )}
                                <button className="close-panel" onClick={() => setShowValvePanel(false)}>CLOSE</button>
                            </div>
                        </div>
                    )}

                    {/* Keypad Trigger (Always visible on the door) */}
                    <div className="keypad-trigger" onClick={() => setShowValvePanel(false)}>
                         {/* This will open the numpad if valve is done */}
                    </div>

                    {!showValvePanel && isValveDone && (
                        <div className="final-keypad-container">
                            <div className="numpad-container">
                                <div className="numpad-display">
                                    {enteredCode.padEnd(5, '_').split('').map((char, i) => (
                                        <span key={i} className={char !== '_' ? 'typed' : ''}>{char}</span>
                                    ))}
                                </div>
                                <div className="numpad-grid">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'CLR', 0, 'OK'].map(val => (
                                        <button 
                                            key={val} 
                                            className={`num-btn ${val === 'OK' ? 'ok-btn' : ''} ${val === 'CLR' ? 'clr-btn' : ''}`} 
                                            onClick={() => {
                                                if (val === 'CLR') setEnteredCode("");
                                                else if (val === 'OK') handleSubmitCode();
                                                else handleKeypadPress(val);
                                            }}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                                {message && <p className="keypad-message">{message}</p>}
                            </div>
                        </div>
                    )}
                </>
            )}

            {found && (
                <div className="puzzle-panel success-panel">
                    <h2>{message}</h2>
                    <p>Sector B: SECURED</p>
                </div>
            )}
        </div>
    );
};

export default SectorB;
