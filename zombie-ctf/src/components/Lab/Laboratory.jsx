import React, { useState } from "react";
import "./Laboratory.css";

const Laboratory = () => {
    const [found, setFound] = useState(false);

    const handleClick = () => {
        setFound(true);
    };

    return (
        <div className="lab-container">
            <div className="glitch-overlay"></div>

            {!found && (
                <div
                    className="puzzle-piece"
                    onClick={handleClick}
                    title="Something feels off here..."
                >
                    GENESIS
                </div>
            )}

            {found && (
                <div className="flag-message">
                    <h2>🧩 Puzzle Found!</h2>
                    <p>Flag Part 1: <strong>GENESIS</strong></p>
                </div>
            )}
        </div>
    );
};

export default Laboratory;