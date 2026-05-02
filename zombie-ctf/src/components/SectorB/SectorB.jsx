import React, { useState, useEffect, useRef } from "react";
import "./SectorB.css";
import API_BASE_URL from "../../config";

const TypewriterHeader = ({ text }) => {
    const [displayedText, setDisplayedText] = useState("");
    const [done, setDone] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        setDisplayedText("");
        setDone(false);
        setHidden(false);
        let i = 0;
        const timer = setInterval(() => {
            setDisplayedText(text.slice(0, i));
            i++;
            if (i > text.length) {
                clearInterval(timer);
                setDone(true);
                // Fade out 2.5s after finishing
                setTimeout(() => setHidden(true), 2500);
            }
        }, 45);
        return () => clearInterval(timer);
    }, [text]);

    return (
        <div className={`typewriter-header ${hidden ? "hidden" : ""}`}>
            {displayedText}
            {!done && <span className="tw-cursor">█</span>}
        </div>
    );
};

const SectorB = ({ onBack, user, setUser }) => {
    const [enteredCode, setEnteredCode] = useState("");
    const [message, setMessage] = useState("");
    const [found, setFound] = useState(false);
    const [showValvePanel, setShowValvePanel] = useState(false);
    const [valveProgress, setValveProgress] = useState(0);
    const [isValveDone, setIsValveDone] = useState(false);
    const [isPressing, setIsPressing] = useState(false);

    // Dynamic Assignment State
    const [assignment, setAssignment] = useState({ color: 'red', valveIndex: 0, fullCode: "" });

    const turnInterval = useRef(null);
    const COLORS = ['red', 'green', 'blue', 'orange'];

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/auth/room-users/${user.roomCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const myIndex = data.users.findIndex(u => u.uniqueId === user.uniqueId);
                    if (myIndex !== -1) {
                        const colorIdx = Math.floor(myIndex / 5) % COLORS.length;
                        const color = COLORS[colorIdx];
                        const valveIndex = myIndex % 5;
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

    const startTurning = (e) => {
        if (isValveDone) return;
        e.preventDefault();
        setIsPressing(true);
        turnInterval.current = setInterval(() => {
            setValveProgress(prev => {
                if (prev >= 100) {
                    clearInterval(turnInterval.current);
                    setIsValveDone(true);
                    setIsPressing(false);
                    return 100;
                }
                return prev + 2;
            });
        }, 50);
    };

    const stopTurning = () => {
        if (turnInterval.current) clearInterval(turnInterval.current);
        setIsPressing(false);
    };

    const handleReset = () => {
        setEnteredCode("");
        setMessage("");
        setValveProgress(0);
        setIsValveDone(false);
        setShowValvePanel(false);
        setIsPressing(false);
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

    // Compute color CSS value
    const colorMap = { red: '#ff3333', green: '#00ff50', blue: '#3399ff', orange: '#ff9900' };
    const activeColor = colorMap[puzzleState.color] || '#00ff50';

    return (
        <div className="sectorb-container">
            <div className="glitch-overlay"></div>

            {/* Fixed Header */}
            <div className="location-header">
                <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
                <button className="reset-puzzle-btn" onClick={handleReset}>[ RESET PUZZLE ]</button>
            </div>

            <TypewriterHeader text="Explore the room... the door holds the way to unlocking the secret and the schemes behind all of this..." />

            {!found && (
                <>
                    {/* Hidden Trigger — tiny blinking LED light */}
                    <div className="hidden-led-trigger" onClick={() => setShowValvePanel(true)} title="Diagnostic Port" />

                    {/* ─── Valve Panel ─── */}
                    {showValvePanel && (
                        <div className="valve-panel-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowValvePanel(false); }}>
                            <div className="valve-panel">

                                {/* Title */}
                                <div className="valve-panel-title">
                                    <h3>MECHANICAL OVERRIDE</h3>
                                    <span className="valve-panel-subtitle">
                                        {puzzleState.color.toUpperCase()} TEAM — UNIT {puzzleState.valveIndex + 1}
                                    </span>
                                </div>

                                {/* Valve Grid */}
                                <div className="valve-grid">
                                    {[0, 1, 2, 3, 4].map(idx => {
                                        const isActive = idx === puzzleState.valveIndex;
                                        return (
                                            <div key={idx} className={`valve-station ${isActive ? 'active-valve' : 'inactive-valve'}`}>
                                                <div className="valve-handle-wrap">
                                                    <div
                                                        className={`valve-handle ${isActive && valveProgress > 0 ? 'rotating' : ''} ${isValveDone && isActive ? 'done' : ''}`}
                                                        style={{ color: isActive ? activeColor : 'transparent' }}
                                                        onMouseDown={isActive ? startTurning : null}
                                                        onMouseUp={stopTurning}
                                                        onMouseLeave={stopTurning}
                                                        onTouchStart={isActive ? startTurning : null}
                                                        onTouchEnd={stopTurning}
                                                        onTouchCancel={stopTurning}
                                                    >
                                                        {isValveDone && isActive && (
                                                            <span className="valve-digit">{puzzleState.digit}</span>
                                                        )}
                                                    </div>
                                                    {isActive && (
                                                        <div className="valve-ring" style={{ color: activeColor }} />
                                                    )}
                                                </div>
                                                <p className={isActive ? "active-valve-label" : ""}>
                                                    U{idx + 1}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Progress Section */}
                                {!isValveDone && (
                                    <div className="valve-progress-section">
                                        <div className="valve-progress-label">HOLD TO ROTATE UNIT {puzzleState.valveIndex + 1}</div>
                                        <button
                                            className={`valve-hold-btn ${isPressing ? 'pressing' : ''}`}
                                            onMouseDown={startTurning}
                                            onMouseUp={stopTurning}
                                            onMouseLeave={stopTurning}
                                            onTouchStart={startTurning}
                                            onTouchEnd={stopTurning}
                                            onTouchCancel={stopTurning}
                                        >
                                            ⟳ HOLD TO TURN
                                        </button>
                                        <div className="valve-bar">
                                            <div className="valve-fill" style={{ width: `${valveProgress}%` }} />
                                        </div>
                                    </div>
                                )}

                                {/* Success State */}
                                {isValveDone && (
                                    <div className="valve-success-section">
                                        <div className="valve-success-text">
                                            UNIT {puzzleState.valveIndex + 1} SYNCHRONIZED
                                            <br />
                                            YOUR DIGIT IS:
                                            <span className="big-digit">{puzzleState.digit}</span>
                                        </div>
                                        <button className="open-keypad-btn" onClick={() => setShowValvePanel(false)}>
                                            PROCEED TO KEYPAD →
                                        </button>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="valve-panel-footer">
                                    <button className="close-panel" onClick={() => setShowValvePanel(false)}>
                                        [ CLOSE ]
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Final Keypad ─── */}
                    {!showValvePanel && isValveDone && (
                        <div className="final-keypad-container">
                            <div className="numpad-container">
                                <div className="numpad-title">OVERRIDE KEYPAD — ENTER 5-DIGIT CODE</div>
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
                <div className="success-panel">
                    <h2>{message}</h2>
                    <p>Sector B: SECURED</p>
                </div>
            )}
        </div>
    );
};

export default SectorB;
