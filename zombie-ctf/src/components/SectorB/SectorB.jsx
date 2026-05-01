import React, { useState } from "react";
import "./SectorB.css";
import API_BASE_URL from "../../config";

const SectorB = ({ onBack, user, setUser }) => {
    const [flagInput, setFlagInput] = useState("");
    const [message, setMessage] = useState("");
    const [found, setFound] = useState(false);

    // Mini-game state
    const [terminalVisible, setTerminalVisible] = useState(false);
    const [popupText, setPopupText] = useState("");
    const [powerSequence, setPowerSequence] = useState([]);

    const handleSwitch = (id) => {
        const newSeq = [...powerSequence, id];
        if (newSeq.length === 3) {
            // Check if correct (2, 1, 3)
            if (newSeq[0] === 2 && newSeq[1] === 1 && newSeq[2] === 3) {
                setPopupText("FLAG: containment");
                setTimeout(() => {
                    setPopupText("");
                    setTerminalVisible(true);
                }, 4000);
            } else {
                setPopupText("SEQUENCE FAILED");
                setTimeout(() => setPopupText(""), 800);
            }
            setPowerSequence([]);
        } else {
            setPowerSequence(newSeq);
        }
    };

    const handleReset = () => {
        setFlagInput("");
        setMessage("");
        setTerminalVisible(false);
        setPopupText("");
        setPowerSequence([]);
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
                <button className="reset-puzzle-btn" onClick={handleReset}>[ RESET PUZZLE ]</button>
            </div>

            {!found && !terminalVisible && (
                <>
                    {/* Floating hints */}
                    <div className="sectorb-hints">
                        <p>SYSTEM OFFLINE</p>
                        <p>Clue: Center first, then Left, then Right.</p>
                        {powerSequence.length > 0 && <p className="sequence-text">INPUT: {powerSequence.map(s => `[${s}] `)}</p>}
                    </div>

                    {/* Invisible relays over the fuse box */}
                    <div className="hidden-relay relay-1" onClick={() => handleSwitch(1)} title="Relay 1"></div>
                    <div className="hidden-relay relay-2" onClick={() => handleSwitch(2)} title="Relay 2"></div>
                    <div className="hidden-relay relay-3" onClick={() => handleSwitch(3)} title="Relay 3"></div>
                </>
            )}

            {popupText && (
                <div className={`tile-popup ${popupText.includes('FLAG') ? 'popup-success' : 'popup-error'}`}>
                    {popupText}
                </div>
            )}

            {(terminalVisible || found) && (
                <div className="puzzle-panel">
                    <h2>SECTOR B TERMINAL</h2>
                    {!found ? (
                        <form onSubmit={handleSubmit} className="puzzle-form">
                            <p>Industrial containment systems online.</p>
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
