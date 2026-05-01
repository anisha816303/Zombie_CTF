import React, { useState } from "react";
import "./MedBay.css";
import API_BASE_URL from "../../config";

const MedBay = ({ onBack, user, setUser }) => {
    const [flagInput, setFlagInput] = useState("");
    const [message, setMessage] = useState("");
    const [found, setFound] = useState(false);

    // Mini-game state
    const [terminalVisible, setTerminalVisible] = useState(false);
    const [popupText, setPopupText] = useState("");
    const [scanProgress, setScanProgress] = useState(0);

    const handleScan = () => {
        if (scanProgress < 100) {
            const nextProg = scanProgress + 20;
            setScanProgress(nextProg);
            if (nextProg >= 100) {
                setPopupText("FLAG: antidote");
                setTimeout(() => {
                    setPopupText("");
                    setTerminalVisible(true);
                }, 4000);
            }
        }
    };

    const handleReset = () => {
        setFlagInput("");
        setMessage("");
        setTerminalVisible(false);
        setPopupText("");
        setScanProgress(0);
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
                    puzzleId: 'med_bay', 
                    answer: flagInput 
                })
            });
            const data = await res.json();
            if (data.success) {
                setFound(true);
                setMessage("Flag Accepted.");
                setUser(data.user);
            } else {
                setMessage(data.message || "Incorrect flag.");
            }
        } catch (err) {
            setMessage("Server error.");
        }
    };

    return (
        <div className="medbay-container">
            <div className="glitch-overlay"></div>
            
            <div className="location-header">
                <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
                <button className="reset-puzzle-btn" onClick={handleReset}>[ RESET PUZZLE ]</button>
            </div>

            {!found && !terminalVisible && (
                <>
                    <div className="hidden-instrument-btn" onClick={handleScan} title="Examine Equipment"></div>
                    
                    {scanProgress > 0 && scanProgress < 100 && (
                        <div className="scan-progress-overlay">
                            BLOOD VIAL EXTRACTED: {scanProgress}%
                        </div>
                    )}
                </>
            )}

            {popupText && (
                <div className={`tile-popup ${popupText.includes('FLAG') ? 'popup-success' : 'popup-error'}`}>
                    {popupText}
                </div>
            )}

            {(terminalVisible || found) && (
                <div className="puzzle-panel">
                    <h2>MED BAY TERMINAL</h2>
                    {!found ? (
                        <form onSubmit={handleSubmit} className="puzzle-form">
                            <p>Medical records accessed. Blood samples missing.</p>
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
                            <p>Med Bay: DATA RECOVERED</p>
                        </div>
                    )}
                    {message && !found && <div className="flag-message error-msg">{message}</div>}
                </div>
            )}
        </div>
    );
};

export default MedBay;
