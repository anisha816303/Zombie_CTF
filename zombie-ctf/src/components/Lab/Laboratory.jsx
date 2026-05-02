import React, { useState, useMemo, useEffect } from "react";
import "./Laboratory.css";
import API_BASE_URL from "../../config";

const TypewriterHeader = ({ text }) => {
    const [displayedText, setDisplayedText] = useState("");
    const [done, setDone] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        setDisplayedText(""); setDone(false); setHidden(false);
        let i = 0;
        const timer = setInterval(() => {
            setDisplayedText(text.slice(0, i));
            i++;
            if (i > text.length) {
                clearInterval(timer);
                setDone(true);
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

const Laboratory = ({ onBack, user, setUser }) => {
    const [flagInput, setFlagInput] = useState("");
    const [message, setMessage] = useState("");
    const [found, setFound] = useState(false);
    const [popupText, setPopupText] = useState("");
    const [terminalVisible, setTerminalVisible] = useState(false);
    const [showClue, setShowClue] = useState(false);
    const [players, setPlayers] = useState([]);
    const [myFragment, setMyFragment] = useState(null);

    const sentence = ["IT", "SPREADS", "THROUGH", "EVERYONE"];
    const shapeTypes = ["Circle", "Square", "Rectangle", "Trapezium", "Diamond"];

    useEffect(() => {
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
                            quarter: myIndex % 4,
                            groupId,
                            shapeType: shapeTypes[groupId % shapeTypes.length]
                        });
                    }
                }
            });
    }, [user.roomCode, user.uniqueId]);

    const tiles = useMemo(() => {
        const numTiles = 30;
        const targetIndex = Math.floor(Math.random() * numTiles);
        return Array.from({ length: numTiles }).map((_, i) => ({
            id: i,
            x: Math.random() * 85 + 5,
            y: Math.random() * 80 + 12,
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
                setShowClue(true);
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("Checking...");
        try {
            const res = await fetch(`${API_BASE_URL}/api/puzzles/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uniqueId: user.uniqueId, puzzleId: 'lab', answer: flagInput })
            });
            const data = await res.json();
            if (data.success) {
                setFound(true);
                setMessage(data.zombieConverted ? "SYSTEM ERROR: INFECTION DETECTED. YOU ARE NOW A ZOMBIE." : "Flag Accepted.");
                setUser(data.user);
                setTimeout(() => onBack(), 700);
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

            <TypewriterHeader text="Explore the lab... the data fragments are corrupted, but one remains untouched. Extract it to uncover the truth." />

            {/* Scrollable content area */}
            <div className="lab-scroll-area">
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

                {showClue && myFragment && !found && (
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
                                <p>Data fragment extracted. Collaborate with your team to unlock the system.</p>
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
        </div>
    );
};

export default Laboratory;
