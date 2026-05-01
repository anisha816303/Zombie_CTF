import React, { useState, useMemo } from "react";
import "./Laboratory.css";
import API_BASE_URL from "../../config";

const Laboratory = ({ onBack, user, setUser }) => {
    const [flagInput, setFlagInput] = useState("");
    const [message, setMessage] = useState("");
    const [found, setFound] = useState(false);
    const [popupText, setPopupText] = useState("");
    const [terminalVisible, setTerminalVisible] = useState(false);

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
            setPopupText("FLAG: genesis");
            setTimeout(() => {
                setPopupText("");
                setTerminalVisible(true);
            }, 4000);
        } else {
            setPopupText("CORRUPTED DATA");
            setTimeout(() => setPopupText(""), 800);
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

            {popupText && (
                <div className={`tile-popup ${popupText.includes('FLAG') ? 'popup-success' : 'popup-error'}`}>
                    {popupText}
                </div>
            )}

            <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>

            {(terminalVisible || found) && (
                <div className="puzzle-panel">
                    <h2>LABORATORY TERMINAL</h2>
                    {!found ? (
                        <form onSubmit={handleSubmit} className="puzzle-form">
                            <p>Analyze the visual samples in the room to find the anomaly.</p>
                            <div className="puzzle-clue">
                                Clue: One of these data fragments behaves differently. Find it to extract the keyword.
                            </div>
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