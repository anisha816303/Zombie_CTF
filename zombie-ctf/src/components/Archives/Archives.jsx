import React, { useState } from 'react';
import './Archives.css';
import API_BASE_URL from '../../config';

const Archives = ({ onBack, user, setUser }) => {
    const [input, setInput] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Checking...');
        try {
            const res = await fetch(`${API_BASE_URL}/api/puzzles/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uniqueId: user.uniqueId, puzzleId: 'archive', answer: input })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(data.zombieConverted ? 'SYSTEM: Infection propagated.' : 'Archive puzzle solved.');
                setUser(data.user);
                // Auto-return to map for smooth flow
                setTimeout(() => onBack(), 700);
            } else {
                setMessage(data.message || 'Incorrect.');
            }
        } catch (err) {
            setMessage('Server error.');
        }
    };

    return (
        <div className="archives-container">
            <div className="location-header">
                <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
            </div>

            <div className="archives-content">
                <h2>LOCATION ARCHIVES</h2>
                <p>Dusty catalogues and encrypted manifests. A small test puzzle awaits.</p>

                <div className="archive-panel">
                    <p>Clue: the word you seek rhymes with "bartries".</p>
                    <form onSubmit={handleSubmit} className="archive-form">
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Enter passphrase..." required />
                        <button type="submit">SUBMIT</button>
                    </form>
                    {message && <div className="archive-msg">{message}</div>}
                </div>
            </div>
        </div>
    );
};

export default Archives;
