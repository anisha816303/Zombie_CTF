import React, { useState, useMemo, useEffect } from "react";
import "./Laboratory.css";
import API_BASE_URL from "../../config";

const Laboratory = ({ onBack, user, setUser }) => {
    const [flagInput, setFlagInput] = useState("");
    const [message, setMessage] = useState("");
    const [found, setFound] = useState(false);
    const [popupText, setPopupText] = useState("");
    const [terminalVisible, setTerminalVisible] = useState(false);
    
    // Clue and Fragment State
    const [cluesLeft, setCluesLeft] = useState(3);
    const [showClue, setShowClue] = useState(false);
    const [roomHint, setRoomHint] = useState("");
    const [players, setPlayers] = useState([]);
    const [myFragment, setMyFragment] = useState(null);

    const sentence = ["IT", "SPREADS", "THROUGH", "EVERYONE"];
    const shapeTypes = ["Circle", "Square", "Rectangle", "Trapezium", "Diamond"];

    useEffect(() => {
        // Fetch players to determine my fragment
        fetch(`${API_BASE_URL}/api/auth/room-users/${user.roomCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setPlayers(data.users);
                    const myIndex = data.users.findIndex(u => u.uniqueId === user.uniqueId);
                    if (myIndex !== -1) {
                        const groupId = Math.floor(myIndex / 4);
                        setMyFragment({
                            word: sentence[myIndex % 4],
                            quarter: myIndex % 4, // 0: TL, 1: TR, 2: BL, 3: BR
                            groupId: groupId,
                            shapeType: shapeTypes[groupId % shapeTypes.length]
                        });
                    }
                }
            });
    }, [user.roomCode, user.uniqueId]);

    // Generate tiles only once
    const tiles = useMemo(() => {
        const numTiles = 30;
        const targetIndex = Math.floor(Math.random() * numTiles);
        return Array.from({ length: numTiles }).map((_, i) => ({
            id: i,
            x: Math.random() * 90 + 5,
            y: Math.random() * 80 + 10,
            delay: Math.random() * 2,
            duration: 2 + Math.random() * 2,
            isCorrect: i === targetIndex
        }));
    }, []);

    const handleTileClick = (isCorrect) => {
        if (isCorrect) {
            setPopupText("ANOMALOUS DATA EXTRACTED");
            setTimeout(() => {
                setPopupText("");
                setTerminalVisible(true);
                setShowClue(true); // Automatically reveal fragment on success
            }, 2000);
        } else {
            setPopupText("CORRUPTED DATA");
            setTimeout(() => setPopupText(""), 800);
        }
    };

    const handleReset = () => {
        setFlagInput("");
        setMessage("");
        setTerminalVisible(false);
        setPopupText("");
        setShowClue(false);
        setRoomHint("");
    };

    const handleGetClue = () => {
        if (cluesLeft > 0 && !showClue) {
            setCluesLeft(cluesLeft - 1);
            setRoomHint("Analyze the visual samples carefully. One data fragment behaves differently. Find it to extract your personal sequence.");
        }
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
                    puzzleId: 'lab', 
                    answer: flagInput 
                })
            });
            const data = await res.json();
            if (data.success) {
                setFound(true);
                setMessage(data.zombieConverted ? "SYSTEM ERROR: INFECTION DETECTED. YOU ARE NOW A ZOMBIE." : "Flag Accepted.");
                setUser(data.user);
            } else {
                setMessage(data.message || "Incorrect flag.");
            }
        } catch (err) {
            setMessage("Server error.");
        }
    };

    return (
        <div className="lab-container">
            <div className="glitch-overlay"></div>
            
            <div className="location-header">
                <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
                <button className="reset-puzzle-btn" onClick={handleReset}>[ RESET PUZZLE ]</button>
            </div>

            {!found && !terminalVisible && tiles.map(tile => (
                <div 
                    key={tile.id}
                    className={`glitch-tile ${tile.isCorrect ? 'target-tile' : ''}`}
                    style={{
                        left: `${tile.x}%`,
                        top: `${tile.y}%`,
                        animationDelay: `${tile.delay}s`,
                        animationDuration: `${tile.duration}s`
                    }}
                    onClick={() => handleTileClick(tile.isCorrect)}
                />
            ))}

            <div className={`clue-system ${terminalVisible ? 'terminal-open' : ''}`}>
                {!showClue && (
                    <button 
                        className="clue-btn" 
                        onClick={handleGetClue} 
                        disabled={cluesLeft === 0 || !!roomHint}
                    >
                        {roomHint ? "HINT RECEIVED" : `GET CLUE (${cluesLeft}/3)`}
                    </button>
                )}
                
                {roomHint && !showClue && (
                    <div className="room-hint-box">
                        <p>{roomHint}</p>
                    </div>
                )}

                {showClue && myFragment && (
                    <div className="fragment-display">
                        <div className="fragment-info">
                            <p>OPERATOR ID: {user.name}</p>
                            <p>GROUP: {myFragment.shapeType.toUpperCase()} {myFragment.groupId + 1}</p>
                            <p>FRAGMENT: <span className="highlight">{myFragment.word}</span></p>
                        </div>
                        <div className={`shape-container ${myFragment.shapeType}`}>
                            <div className={`shape-quarter quarter-${myFragment.quarter} type-${myFragment.shapeType}`}></div>
                        </div>
                        <p className="clue-hint">Match your {myFragment.shapeType} with 3 other operators. Enter the combined flag below.</p>
                    </div>
                )}
            </div>

            {popupText && (
                <div className={`tile-popup ${popupText.includes('EXTRACTED') ? 'popup-success' : 'popup-error'}`}>
                    {popupText}
                </div>
            )}

            {(terminalVisible || found) && (
                <div className="puzzle-panel">
                    <h2>LABORATORY TERMINAL</h2>
                    {!found ? (
                        <form onSubmit={handleSubmit} className="puzzle-form">
                            <p>Data fragment extracted successfully. Collaborate with your team to unlock the system.</p>
                            <input 
                                type="text" 
                                value={flagInput} 
                                onChange={(e) => setFlagInput(e.target.value)} 
                                placeholder="Enter Flag..." 
                                required 
                            />
                            <button type="submit" className="submit-btn">SUBMIT</button>
                        </form>
                    ) : (
                        <div className="flag-message success-msg">
                            <h2>{message}</h2>
                            <p>Lab Sector: CLEARED</p>
                        </div>
                    )}
                    {message && !found && <div className="flag-message error-msg">{message}</div>}
                </div>
            )}
        </div>
    );
};

export default Laboratory;