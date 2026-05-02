import React, { useState, useEffect, useRef, useMemo } from "react";
import "./MedBay.css";
import API_BASE_URL from "../../config";

// ─── Typewriter hook ─────────────────────────────────────────────
const useTypewriter = (text, speed = 28, active = true) => {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        if (!active) return;
        setDisplayed(''); setDone(false); setHidden(false);
        let i = 0;
        const t = setInterval(() => {
            setDisplayed(text.slice(0, i + 1)); i++;
            if (i >= text.length) { clearInterval(t); setDone(true); setTimeout(() => setHidden(true), 2800); }
        }, speed);
        return () => clearInterval(t);
    }, [text, active]);
    return { displayed, done, hidden };
};

// ─── Morse config ─────────────────────────────────────────────────
// ANTIDOTE = · — | — · | — | · · | — · · | — — — | — | ·
const MORSE_TABLE = {
    A: '·—', B: '—···', C: '—·—·', D: '—··', E: '·',
    F: '··—·', G: '——·', H: '····', I: '··', J: '·———',
    K: '—·—', L: '·—··', M: '——', N: '—·', O: '———',
    P: '·——·', Q: '——·—', R: '·—·', S: '···', T: '—',
    U: '··—', V: '···—', W: '·——', X: '—··—', Y: '—·——', Z: '——··',
};

// The signal displayed — letters separated visually by gap
const SIGNAL_GROUPS = [
    { letter: 'A', code: ['·', '—'] },
    { letter: 'N', code: ['—', '·'] },
    { letter: 'T', code: ['—'] },
    { letter: 'I', code: ['·', '·'] },
    { letter: 'D', code: ['—', '·', '·'] },
    { letter: 'O', code: ['—', '—', '—'] },
    { letter: 'T', code: ['—'] },
    { letter: 'E', code: ['·'] },
];

// ─── Audio Morse hook ────────────────────────────────────────────
const useAudioMorse = () => {
    const ctxRef = useRef(null);
    const loopRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const UNIT = 0.11; // seconds per dit
    const FREQ = 680;  // Hz — medical monitor tone

    const scheduleOneCycle = (ctx, startAt) => {
        let t = startAt;
        SIGNAL_GROUPS.forEach((g, gi) => {
            g.code.forEach((sym, si) => {
                const dur = sym === '·' ? UNIT : UNIT * 3;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine'; osc.frequency.value = FREQ;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.008);
                gain.gain.setValueAtTime(0.25, t + dur - 0.01);
                gain.gain.linearRampToValueAtTime(0, t + dur);
                osc.start(t); osc.stop(t + dur);
                t += dur + (si < g.code.length - 1 ? UNIT : 0);
            });
            t += UNIT * 3; // letter gap
        });
        return t; // end time of this cycle
    };

    const cycleDuration = (() => {
        let d = 0;
        SIGNAL_GROUPS.forEach((g) => {
            g.code.forEach((sym, si) => {
                d += sym === '·' ? 0.11 : 0.33;
                if (si < g.code.length - 1) d += 0.11;
            });
            d += 0.33;
        });
        return d;
    })();

    const start = () => {
        if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = ctxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        setPlaying(true);
        let nextStart = ctx.currentTime + 0.05;
        const schedule = () => {
            nextStart = scheduleOneCycle(ctx, nextStart);
            loopRef.current = setTimeout(schedule, (nextStart - ctx.currentTime - 0.1) * 1000);
        };
        schedule();
    };

    const stop = () => {
        clearTimeout(loopRef.current);
        if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
        setPlaying(false);
    };

    useEffect(() => () => { clearTimeout(loopRef.current); ctxRef.current?.close(); }, []);
    return { playing, start, stop, cycleDuration };
};

// ─── ECG Monitor (compact) ────────────────────────────────────────
const ECGMonitor = ({ playing, cycleDuration }) => {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const startRef = useRef(null);

    // Build flat timing array: [{on: bool, dur: ms}, ...]
    const timeline = useMemo(() => {
        const UNIT = 110; // ms
        const arr = [];
        SIGNAL_GROUPS.forEach((g, gi) => {
            g.code.forEach((sym, si) => {
                arr.push({ on: true, dur: sym === '·' ? UNIT : UNIT * 3 });
                if (si < g.code.length - 1) arr.push({ on: false, dur: UNIT });
            });
            arr.push({ on: false, dur: UNIT * 3 });
        });
        return arr;
    }, []);

    const totalMs = useMemo(() => timeline.reduce((s, e) => s + e.dur, 0), [timeline]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const mid = H / 2;

        // Pre-compute x-position → on/off lookup
        // Canvas scrolls at 1px per frame (~60fps) → 1px ≈ 16.7ms
        const PX_MS = 16.7;

        let x = 0; // global pixel counter
        let prevY = mid;

        const getY = (ms) => {
            // find segment
            let elapsed = ms % totalMs;
            for (const seg of timeline) {
                if (elapsed < seg.dur) {
                    if (!seg.on) return mid;
                    // spike: triangle shape
                    const half = seg.dur / 2;
                    const peakH = seg.dur > 150 ? 22 : 12; // dash taller than dot
                    if (elapsed < half) return mid - (peakH * elapsed / half);
                    return mid - (peakH * (seg.dur - elapsed) / half);
                }
                elapsed -= seg.dur;
            }
            return mid;
        };

        ctx.fillStyle = '#060808';
        ctx.fillRect(0, 0, W, H);

        const draw = () => {
            // Scroll left
            const img = ctx.getImageData(1, 0, W - 1, H);
            ctx.putImageData(img, 0, 0);
            ctx.fillStyle = '#060808';
            ctx.fillRect(W - 2, 0, 2, H);

            // Grid
            if (x % 16 === 0) {
                ctx.fillStyle = 'rgba(255,20,20,0.05)';
                ctx.fillRect(W - 2, 0, 1, H);
            }

            const ms = x * PX_MS;
            const y = getY(ms);
            const isSpike = y !== mid;

            ctx.strokeStyle = isSpike ? '#ff3333' : 'rgba(255,40,40,0.5)';
            ctx.lineWidth = isSpike ? 1.8 : 1.2;
            ctx.shadowBlur = isSpike ? 8 : 0;
            ctx.shadowColor = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(W - 3, prevY);
            ctx.lineTo(W - 1, y);
            ctx.stroke();
            ctx.shadowBlur = 0;

            prevY = y;
            x++;
            animRef.current = requestAnimationFrame(draw);
        };

        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    return (
        <div className="ecg-wrap">
            <div className="ecg-header">
                <span className="ecg-dot" />
                BIOSIGNAL MONITOR — STATION 7-B
                <span className="ecg-live">{playing ? 'LIVE ◉' : 'PAUSED'}</span>
            </div>
            <canvas ref={canvasRef} width={400} height={56} className="ecg-canvas" />
            <div className="ecg-footer">
                <span>FREQ: IRREGULAR</span>
                <span>PATTERN: ENCODED</span>
            </div>
        </div>
    );
};

// ─── Signal Display ───────────────────────────────────────────────
// const SignalDisplay = () => (
//     <div className="signal-display">
//         <div className="signal-label">RAW BIOSIGNAL — DECODED OUTPUT:</div>
//         <div className="signal-groups">
//             {SIGNAL_GROUPS.map((g, i) => (
//                 <div key={i} className="signal-group">
//                     {g.code.map((sym, j) => (
//                         <span key={j} className={`signal-sym ${sym === '·' ? 'dot' : 'dash'}`}>{sym}</span>
//                     ))}
//                 </div>
//             ))}
//         </div>
//         <div className="signal-note">Signal repeating. Pattern origin: unknown.</div>
//     </div>
// );

// ─── Morse Reference ─────────────────────────────────────────────
const MorseRef = () => {
    const [open, setOpen] = useState(false);
    return (
        <div className="morse-ref">
            <button className="morse-ref-toggle" onClick={() => setOpen(o => !o)}>
                {open ? '▾' : '▸'} ECG TABLE
            </button>
            {open && (
                <div className="morse-ref-grid">
                    {Object.entries(MORSE_TABLE).map(([l, c]) => (
                        <div key={l} className="morse-ref-cell">
                            <span className="morse-ref-letter">{l}</span>
                            <span className="morse-ref-code">{c}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────
const MedBay = ({ onBack, user, setUser }) => {
    const [flagInput, setFlagInput] = useState('');
    const [message, setMessage] = useState('');
    const [found, setFound] = useState(false);
    const [wrongCount, setWrongCount] = useState(0);
    const { playing, start, stop } = useAudioMorse();

    const introText = 'INFECTION CONFIRMED — BIOLOGICAL OVERRIDE ACTIVE\n\nYour genome has been rewritten. Sector B is offline.\nThe antidote formula was sealed behind medical authorization.\n\nAn anomalous biosignal has been detected from Station 7-B.\nDecode it.';
    const { displayed, done: twDone, hidden: twHidden } = useTypewriter(introText, 22);

    const handleReset = () => {
        setFlagInput(''); setMessage(''); setFound(false); setWrongCount(0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!flagInput.trim()) return;
        setMessage('Verifying...');
        try {
            const res = await fetch(`${API_BASE_URL}/api/puzzles/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uniqueId: user.uniqueId, puzzleId: 'med_bay', answer: flagInput.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setFound(true);
                setMessage('ANTIDOTE SEQUENCE CONFIRMED. PROTOCOL INITIATED.');
                setUser(data.user);
                setTimeout(() => onBack(), 3000);
            } else {
                const n = wrongCount + 1;
                setWrongCount(n);
                setMessage(n >= 2 ? 'INCORRECT — Check the signal pattern carefully.' : 'INVALID SEQUENCE.');
                setTimeout(() => setMessage(''), 2500);
                setFlagInput('');
            }
        } catch { setMessage('SERVER ERROR.'); }
    };

    return (
        <div className="medbay-container">
            <div className="glitch-overlay" />

            <div className="location-header">
                <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
                <button className="reset-puzzle-btn" onClick={handleReset}>[ RESET ]</button>
            </div>

            {/* Typewriter */}
            <div className={`typewriter-header ${twHidden ? 'hidden' : ''}`}>
                <pre className="mb-tw-text">{displayed}{!twDone && <span className="tw-cur">█</span>}</pre>
            </div>

            <div className="medbay-scroll-area">

                {!found && (
                    <>
                        <div className="ecg-controls">
                            <button
                                className={`ecg-play-btn ${playing ? 'active' : ''}`}
                                onClick={() => playing ? stop() : start()}
                            >
                                {playing ? '⏹ STOP SIGNAL' : '▶ PLAY SIGNAL'}
                            </button>
                            <span className="ecg-play-note">
                                {playing ? 'Beeps playing — decode the pattern' : 'Tap to hear the biosignal as audio'}
                            </span>
                        </div>
                        <ECGMonitor playing={playing} />
                        {/* <SignalDisplay /> */}
                        <MorseRef />

                        <div className="mb-decode-panel">
                            <div className="mb-decode-label">
                                ⌨ ENTER DECODED SIGNAL
                            </div>
                            <form onSubmit={handleSubmit} className="mb-decode-form">
                                <input
                                    type="text"
                                    value={flagInput}
                                    onChange={e => setFlagInput(e.target.value)}
                                    placeholder="Decoded message..."
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                />
                                <button type="submit" className="mb-submit-btn">CONFIRM</button>
                            </form>
                            {message && (
                                <div className={`mb-message ${found ? 'ok' : 'err'}`}>{message}</div>
                            )}
                        </div>
                    </>
                )}

                {found && (
                    <div className="mb-success">
                        <div className="mb-success-icon">🧬</div>
                        <h2>ANTIDOTE SEQUENCE CONFIRMED</h2>
                        <p>Returning to map...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedBay;
