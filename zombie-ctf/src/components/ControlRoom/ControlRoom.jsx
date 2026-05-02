import React, { useState, useEffect, useRef } from "react";
import "./ControlRoom.css";
import API_BASE_URL from "../../config";

// --- Typewriter Hook ---
const useTypewriter = (text, speed = 30, active = true) => {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    useEffect(() => {
        if (!active) return;
        setDisplayed(''); setDone(false);
        let i = 0;
        const t = setInterval(() => {
            setDisplayed(text.slice(0, i + 1)); i++;
            if (i >= text.length) { clearInterval(t); setDone(true); }
        }, speed);
        return () => clearInterval(t);
    }, [text, active]);
    return { displayed, done };
};

// Target values for the puzzle
const TARGETS = { F: 44, A: 72, P: 19 };

const ControlRoom = ({ onBack, user, setUser }) => {
    const canvasRef = useRef(null);
    const [role, setRole] = useState(null); // 0=FREQ, 1=AMP, 2=PHASE
    
    // Slider states
    const [freq, setFreq] = useState(10);
    const [amp, setAmp] = useState(20);
    const [phase, setPhase] = useState(0);

    // Puzzle states
    const [localSync, setLocalSync] = useState(null);
    const [masterCode, setMasterCode] = useState('');
    const [termMsg, setTermMsg] = useState('');
    const [audioRestored, setAudioRestored] = useState(false);
    
    const [finalInput, setFinalInput] = useState('');
    const [finalMsg, setFinalMsg] = useState('');
    const [roomSolved, setRoomSolved] = useState(false);

    const loreText = `> RESTORING AUDIO LOG... SUCCESS.
> PLAYING FILE: marsh_log_day1.wav

"Someone used my clearance token at 01:47.
I was asleep. I checked the sector lockdown logs.
The doors were magnetically sealed. No one walked in.
The override was executed remotely...
It came from the DIRECTOR's terminal."`;
    const { displayed: loreDisplayed, done: loreDone } = useTypewriter(loreText, 25, audioRestored);

    useEffect(() => {
        // Fetch role
        fetch(`${API_BASE_URL}/api/auth/room-users/${user.roomCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const myIndex = data.users.findIndex(u => u.uniqueId === user.uniqueId);
                    const r = myIndex !== -1 ? myIndex % 3 : 0;
                    setRole(r);
                    // Pre-fill non-role targets so the single player's wave can actually match
                    // In a true distributed scenario, they wouldn't see the others moving,
                    // but they only need to match THEIR parameter to the target wave shape.
                    // For the math to work locally on their screen, the other two parameters 
                    // should just be set to the target.
                    if (r !== 0) setFreq(TARGETS.F);
                    if (r !== 1) setAmp(TARGETS.A);
                    if (r !== 2) setPhase(TARGETS.P);
                }
            })
            .catch(() => setRole(0));
    }, [user]);

    // Oscilloscope render
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width; const H = canvas.height;
        let animId;
        let timeOffset = 0;

        const drawWave = (f, a, p, color, lineWidth, isTarget) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            // Map 0-100 values to actual wave math
            const realF = (f / 100) * 0.2;
            const realA = (a / 100) * (H / 2 - 10);
            const realP = (p / 100) * Math.PI * 2;
            
            for (let x = 0; x < W; x++) {
                // Add timeOffset to animate the wave scrolling
                const y = H / 2 + Math.sin(x * realF + realP + (isTarget ? 0 : timeOffset)) * realA;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        const render = () => {
            ctx.fillStyle = '#020502';
            ctx.fillRect(0, 0, W, H);

            // Draw grid
            ctx.strokeStyle = '#0a1a0a'; ctx.lineWidth = 1;
            ctx.beginPath();
            for(let i=0; i<W; i+=20) { ctx.moveTo(i,0); ctx.lineTo(i,H); }
            for(let i=0; i<H; i+=20) { ctx.moveTo(0,i); ctx.lineTo(W,i); }
            ctx.stroke();

            // Target Wave (Corrupted)
            drawWave(TARGETS.F, TARGETS.A, TARGETS.P, 'rgba(50, 255, 50, 0.3)', 3, true);
            // Player Wave
            drawWave(freq, amp, phase, '#45f3ff', 2, false);

            timeOffset += 0.05; // speed of wave animation
            animId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animId);
    }, [freq, amp, phase]);

    // Check Local Sync
    useEffect(() => {
        if (role === null) return;
        let isMatch = false;
        let code = '';
        if (role === 0 && Math.abs(freq - TARGETS.F) === 0) { isMatch = true; code = TARGETS.F.toString(); }
        if (role === 1 && Math.abs(amp - TARGETS.A) === 0) { isMatch = true; code = TARGETS.A.toString(); }
        if (role === 2 && Math.abs(phase - TARGETS.P) === 0) { isMatch = true; code = TARGETS.P.toString(); }

        if (isMatch) setLocalSync(code.padStart(2, '0'));
        else setLocalSync(null);
    }, [freq, amp, phase, role]);

    const handleMasterSubmit = (e) => {
        e.preventDefault();
        const code = `${TARGETS.F}${TARGETS.A}${TARGETS.P}`;
        if (masterCode.replace(/[^0-9]/g, '') === code) {
            setTermMsg('SYNC CONFIRMED. AUDIO RESTORED.');
            setTimeout(() => setAudioRestored(true), 1500);
        } else {
            setTermMsg('INVALID OVERRIDE SEQUENCE.');
        }
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        const ans = finalInput.trim().toUpperCase();
        if (ans === 'DIRECTOR' || ans === 'THE DIRECTOR') {
            setFinalMsg('VERIFYING...');
            try {
                const res = await fetch(`${API_BASE_URL}/api/puzzles/submit`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uniqueId: user.uniqueId, puzzleId: 'control_room', answer: 'director' })
                });
                const data = await res.json();
                if (data.success) {
                    setRoomSolved(true);
                    setUser(data.user);
                    setTimeout(() => onBack(), 3000);
                }
            } catch { setFinalMsg('SERVER ERROR'); }
        } else {
            setFinalMsg('INCORRECT IDENTITY.');
        }
    };

    return (
        <div className="control-room-container">
            <div className="location-header">
                <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
            </div>

            <div className="crt-monitor">
                <div className="crt-header">
                    <span>AUDIO RECOVERY TERMINAL</span>
                    <span>{localSync ? 'SYNC: LOCK' : 'SYNC: SEARCHING'}</span>
                </div>
                <canvas ref={canvasRef} width={500} height={180} className="osc-canvas" />
            </div>

            {!audioRestored && (
                <>
                    <div className="control-deck">
                        <div className={`fader-group ${role === 0 ? 'active' : 'locked'}`}>
                            <div className="fader-label">FREQ</div>
                            <input type="range" min="0" max="100" value={freq} onChange={e => setFreq(Number(e.target.value))} className="fader-input" disabled={role !== 0} />
                            <div className="fader-value">{freq}</div>
                            {role !== 0 && <div className="locked-overlay">OPR 1</div>}
                        </div>
                        <div className={`fader-group ${role === 1 ? 'active' : 'locked'}`}>
                            <div className="fader-label">AMP</div>
                            <input type="range" min="0" max="100" value={amp} onChange={e => setAmp(Number(e.target.value))} className="fader-input" disabled={role !== 1} />
                            <div className="fader-value">{amp}</div>
                            {role !== 1 && <div className="locked-overlay">OPR 2</div>}
                        </div>
                        <div className={`fader-group ${role === 2 ? 'active' : 'locked'}`}>
                            <div className="fader-label">PHASE</div>
                            <input type="range" min="0" max="100" value={phase} onChange={e => setPhase(Number(e.target.value))} className="fader-input" disabled={role !== 2} />
                            <div className="fader-value">{phase}</div>
                            {role !== 2 && <div className="locked-overlay">OPR 3</div>}
                        </div>
                    </div>

                    <div className="sync-box">
                        <h4>LOCAL SYNC CODE</h4>
                        <div className="sync-code">{localSync ? localSync : '--'}</div>
                        <div style={{fontSize: '0.6rem', color: '#888', marginTop: '8px'}}>COMBINE WITH OTHER OPERATIVES</div>
                    </div>

                    <div className="master-terminal">
                        <h3>MASTER DECRYPTION OVERRIDE</h3>
                        <form onSubmit={handleMasterSubmit} className="master-input-wrap">
                            <input type="text" value={masterCode} onChange={e => setMasterCode(e.target.value)} placeholder="000000" maxLength={6} className="master-input" />
                            <button type="submit" className="master-btn">EXECUTE</button>
                        </form>
                        {termMsg && <div className={`term-msg ${termMsg.includes('INVALID') ? 'err' : 'ok'}`}>{termMsg}</div>}
                    </div>
                </>
            )}

            {audioRestored && (
                <div className="lore-terminal">
                    <div className="lore-text">{loreDisplayed}{!loreDone && '█'}</div>
                    {loreDone && !roomSolved && (
                        <form onSubmit={handleFinalSubmit} style={{marginTop: '20px'}}>
                            <div style={{fontSize: '0.7rem', color: '#aaa', marginBottom: '8px'}}>IDENTIFY RESPONSIBLE PARTY TO LIFT LOCKDOWN:</div>
                            <input type="text" value={finalInput} onChange={e => setFinalInput(e.target.value)} className="final-gate-input" placeholder="Identity..." />
                            <button type="submit" className="final-gate-btn">SUBMIT</button>
                            {finalMsg && <div style={{color: finalMsg.includes('INCORRECT') ? '#f33' : '#aa0', fontSize: '0.8rem', marginTop: '8px'}}>{finalMsg}</div>}
                        </form>
                    )}
                    {roomSolved && (
                        <div style={{marginTop: '20px', color: '#0f0', fontWeight: 'bold', fontSize: '1.2rem'}}>LOCKDOWN LIFTED.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ControlRoom;
