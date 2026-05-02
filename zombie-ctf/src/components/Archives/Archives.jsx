import React, { useState, useEffect, useRef } from 'react';
import './Archives.css';
import API_BASE_URL from '../../config';

// ─── Typewriter hook ─────────────────────────────────────────────
const useTypewriter = (text, speed = 24, startDelay = 0, active = true) => {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    useEffect(() => {
        if (!active) return;
        setDisplayed(''); setDone(false);
        let i = 0;
        const t0 = setTimeout(() => {
            const t = setInterval(() => {
                setDisplayed(text.slice(0, i + 1));
                i++;
                if (i >= text.length) { clearInterval(t); setDone(true); }
            }, speed);
            return () => clearInterval(t);
        }, startDelay);
        return () => clearTimeout(t0);
    }, [text, active]);
    return { displayed, done };
};

// ─── Acrostic poem lines (first letters → G E N E S I S) ─────────
// Displayed as natural prose — first letters are NOT visually split
const ACROSTIC_LINES = [
    "Growth marked our beginning — twelve vials, all catalogued.",
    "Even the board called it a triumph. We believed them.",
    "None of us read the pressure anomaly in the right way.",
    "Errors accumulate. The vector mutated faster than any model predicted.",
    "Somewhere between midnight and 01:00, Wing C went silent.",
    "In her last entry Marsh wrote only four words: I did not know.",
    "Salvation was always the goal. It was never the outcome.   — Archive ref. 7-B",
];

// Hex bytes that decode to GENESIS (ASCII)
// G=47 E=45 N=4E E=45 S=53 I=49 S=53
const HEX_CLUE = ['47', '45', '4E', '45', '53', '49', '53'];

// ─── Manuscript pages ─────────────────────────────────────────────
const PAGES = [
    {
        title: 'PERSONNEL FILE — DR. EVELYN MARSH',
        subtitle: 'Clearance: OMEGA · Status: MISSING (Day 3)',
        sections: [
            { type: 'fields', items: [
                ['Full Name', 'Dr. Evelyn Marsh'],
                ['Role', 'Lead Virologist — Project Genesis'],
                ['Division', 'BioSynthesis Unit, Station 7-B'],
                ['Clearance', 'OMEGA — Eyes Only'],
                ['Patents', '14 (RNA synthesis, mutagenic vectors)'],
                ['Last Seen', 'Day 3 · 04:22 UTC · Sector B corridor'],
            ]},
            { type: 'divider' },
            { type: 'label', text: 'BACKGROUND' },
            { type: 'para', text: 'Recruited 2019 from the National Institute for Biosafety Research. Her CHRYSALIS protocol promised a universal immune-enhancing serum, reaching 94% efficacy in controlled trials.' },
            { type: 'para', text: 'In her final security debrief (Day 0), Marsh flagged anomalous pressure readings in the ARC-7 storage manifold. The report was filed. Nothing was done.' },
            { type: 'warning', text: 'NOTE: All physical files from Station 7-B were destroyed in the Wing C incident. Only this digital record survived the purge.' },
        ]
    },
    {
        title: 'CHRYSALIS PROTOCOL — RESEARCH NOTES',
        subtitle: 'Document Class: OMEGA · Author: Dr. E. Marsh · Archived: Day -4',
        sections: [
            { type: 'label', text: 'COMPOUND ARC-7 — SYNTHETIC INHIBITOR' },
            { type: 'para', text: 'ARC-7 prevents the retroviral vector from crossing epithelial cell boundaries. Without it, lateral transmission between hosts is near-instantaneous at the viral loads we were working with.' },
            { type: 'para', text: 'The compound was stored in the eastern archives wing under cold storage manifest REF-07. The inventory system assigned it a simple codename to avoid drawing attention from non-clearance staff.' },
            { type: 'divider' },
            { type: 'label', text: 'FINAL LOG — DR. MARSH · DAY 1 · 03:14 UTC' },
            { type: 'quote', text: '"Someone used my clearance token at 01:47. I was asleep. The override disabled ARC-7\'s cold storage — the compound degraded within hours. By 03:00 the vector was already airborne in Wing C."' },
            { type: 'quote', text: '"This was not an accident. Sector B was already producing scaled quantities. Someone knew. Someone planned this."' },
            { type: 'para', text: 'The above log was recovered from a corrupted terminal backup. The system recorded a second override at 03:15 — one minute after this entry was written. Dr. Marsh was never seen again.' },
            { type: 'warning', text: 'AUDIO FILE: marsh_log_day1.wav — CORRUPTED · Recovery: 0%' },
        ]
    },
    {
        title: 'OPERATIVE PROTOCOL — INHIBITOR ACTIVATION',
        subtitle: 'Emergency Authorization · Distributed Key Protocol',
        sections: [
            { type: 'label', text: 'MULTI-OPERATIVE AUTHORIZATION REQUIRED' },
            { type: 'para', text: 'For security, the ARC-7 inhibitor activation code has been distributed across all operatives in this unit. No single operative holds the complete sequence.' },
            { type: 'para', text: 'Your fragment is shown below. You must coordinate with the other operatives in your team. Collect all fragments in operative order and enter the assembled code at the terminal.' },
            { type: 'divider' },
            { type: 'fragment' },
            { type: 'divider' },
            { type: 'warning', text: 'SECURITY NOTE: Do not transmit fragments over unsecured channels. Find the other operatives. Verify in person.' },
        ]
    },
];

// ─── Corrupted Image Component ────────────────────────────────────
const CorruptedImage = ({ onScan }) => {
    const canvasRef = useRef(null);
    const [scanned, setScanned] = useState(false);
    const [scanLine, setScanLine] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        // Draw base: a "scientific document" header
        ctx.fillStyle = '#0a0a08';
        ctx.fillRect(0, 0, W, H);

        // Scanlines background
        for (let y = 0; y < H; y += 3) {
            ctx.fillStyle = `rgba(200,180,100,${0.015 + Math.random() * 0.02})`;
            ctx.fillRect(0, y, W, 1);
        }

        // Document header (clean top portion)
        ctx.fillStyle = 'rgba(20,16,10,0.9)';
        ctx.fillRect(10, 10, W - 20, 70);
        ctx.strokeStyle = 'rgba(160,120,60,0.4)';
        ctx.strokeRect(10, 10, W - 20, 70);

        ctx.fillStyle = 'rgba(200,160,80,0.8)';
        ctx.font = '10px monospace';
        ctx.fillText('PROJECT GENESIS — CHRYSALIS FILE [CORRUPTED]', 20, 28);
        ctx.fillStyle = 'rgba(180,140,60,0.5)';
        ctx.fillText('CLASSIFICATION: OMEGA  |  RECOVERY ATTEMPT: PARTIAL', 20, 44);
        ctx.fillStyle = 'rgba(140,100,40,0.5)';
        ctx.fillText('DATA SEGMENTS: ██ of 47 RECOVERED', 20, 60);

        // Corrupted middle section — random noise blocks
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * W;
            const y = 90 + Math.random() * (H - 180);
            const w = 20 + Math.random() * 80;
            const h = 4 + Math.random() * 20;
            const r = Math.floor(Math.random() * 80);
            const g = Math.floor(Math.random() * 60);
            const b = Math.floor(Math.random() * 20);
            ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + Math.random() * 0.5})`;
            ctx.fillRect(x, y, w, h);
        }

        // Glitch color bands
        for (let i = 0; i < 8; i++) {
            const y = 90 + Math.random() * (H - 180);
            ctx.fillStyle = `rgba(0,255,80,${0.03 + Math.random() * 0.06})`;
            ctx.fillRect(0, y, W, 2 + Math.random() * 6);
        }

        // The HEX CLUE — visible in the corruption
        ctx.fillStyle = 'rgba(0,220,80,0.85)';
        ctx.font = 'bold 13px monospace';
        const hexStr = HEX_CLUE.join(' ');
        const hexX = 20 + Math.random() * 20;
        const hexY = 130 + Math.random() * 30;
        // Draw with glitch offset
        ctx.fillStyle = 'rgba(255,0,60,0.4)';
        ctx.fillText(hexStr, hexX + 2, hexY + 1);
        ctx.fillStyle = 'rgba(0,255,80,0.9)';
        ctx.fillText(hexStr, hexX, hexY);

        // Label above hex
        ctx.fillStyle = 'rgba(0,180,60,0.5)';
        ctx.font = '9px monospace';
        ctx.fillText('▸ RECOVERED DATA SEGMENT [ASCII ENCODED]:', hexX, hexY - 12);

        // Bottom corrupted area
        for (let y = H - 80; y < H - 20; y++) {
            if (Math.random() > 0.5) {
                ctx.fillStyle = `rgba(${Math.random()*60},${Math.random()*40},0,0.4)`;
                ctx.fillRect(0, y, W * Math.random(), 1);
            }
        }

        // Bottom text (partially visible)
        ctx.fillStyle = 'rgba(160,120,60,0.3)';
        ctx.font = '9px monospace';
        ctx.fillText('CHRYSALIS ARTIFACT REF: [REDACTED] · STORAGE: EASTERN ARCHIVES WING', 20, H - 25);

    }, []);

    return (
        <div className="corrupted-image-wrap">
            <div className="ci-label">
                <span className="ci-status-dot" />
                CHRYSALIS_PROJECT_FILE.PNG — CORRUPTED
            </div>
            <div className="ci-canvas-wrap">
                <canvas ref={canvasRef} width={420} height={240} className="ci-canvas" />
                {!scanned && (
                    <div className="ci-scan-overlay">
                        <button className="ci-scan-btn" onClick={() => { setScanned(true); onScan && onScan(); }}>
                            ⬛ ATTEMPT FILE RECOVERY
                        </button>
                    </div>
                )}
                {scanned && (
                    <div className="ci-scan-line" style={{ top: `${scanLine}%` }} />
                )}
            </div>
            {scanned && (
                <div className="ci-recovery-note">
                    PARTIAL RECOVERY COMPLETE · Hex segment extracted · Segment appears ASCII-encoded
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────
const Archives = ({ onBack, user, setUser }) => {
    const [phase, setPhase] = useState('gate'); // gate | manuscript | done
    const [gateInput, setGateInput] = useState('');
    const [gateError, setGateError] = useState('');
    const [shake, setShake] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [showAcrosticHint, setShowAcrosticHint] = useState(false);
    const [showHexHint, setShowHexHint] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [flagInput, setFlagInput] = useState('');
    const [flagMsg, setFlagMsg] = useState('');
    const [found, setFound] = useState(false);
    const [myFragment, setMyFragment] = useState(null);
    const [showFlagBox, setShowFlagBox] = useState(false);

    const WORD = 'ARCHIVES';
    const intro = 'RESTRICTED ACCESS — LOCATION ARCHIVES\n\nAll records are classified Omega-level.\nA cryptographic challenge is required.\n\nAn associated file has been detected — attempting recovery...';
    const { displayed: introText, done: introDone } = useTypewriter(intro, 20, 200);

    // Determine player's fragment letter
    useEffect(() => {
        if (!user) return;
        fetch(`${API_BASE_URL}/api/auth/room-users/${user.roomCode}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    const idx = d.users.findIndex(u => u.uniqueId === user.uniqueId);
                    const letterIdx = idx !== -1 ? idx % WORD.length : 0;
                    setMyFragment({ letter: WORD[letterIdx], position: letterIdx + 1, total: WORD.length });
                }
            });
    }, [user?.roomCode, user?.uniqueId]);

    const handleReset = () => {
        setPhase('gate'); setGateInput(''); setGateError('');
        setAttempts(0); setShowAcrosticHint(false); setShowHexHint(false);
        setActiveTab(0); setFlagInput(''); setFlagMsg('');
        setFound(false); setShowFlagBox(false);
    };

    const handleGateSubmit = (e) => {
        e.preventDefault();
        const val = gateInput.trim().toLowerCase();
        if (val === 'genesis') {
            setPhase('manuscript');
        } else {
            const n = attempts + 1;
            setAttempts(n);
            setGateError(`AUTHORIZATION DENIED — INCORRECT PASSPHRASE`);
            setShake(true);
            setGateInput('');
            setTimeout(() => { setShake(false); setGateError(''); }, 1600);
            if (n >= 2) setShowHexHint(true);
            if (n >= 4) setShowAcrosticHint(true);
        }
    };

    const handleFlagSubmit = async (e) => {
        e.preventDefault();
        setFlagMsg('Verifying...');
        try {
            const res = await fetch(`${API_BASE_URL}/api/puzzles/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uniqueId: user.uniqueId, puzzleId: 'archive', answer: flagInput.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setFound(true);
                setFlagMsg(data.zombieConverted ? 'CORRUPTION PROPAGATED. YOU ARE NOW INFECTED.' : 'INHIBITOR PROTOCOL INITIATED. ARCHIVES CLEARED.');
                setUser(data.user);
                setPhase('done');
                setTimeout(() => onBack(), 3500);
            } else {
                setFlagMsg('INVALID CODE. Reassemble at the artifact.');
                setTimeout(() => setFlagMsg(''), 2500);
            }
        } catch { setFlagMsg('Server error.'); }
    };

    const renderSection = (sec, i) => {
        switch (sec.type) {
            case 'fields': return (
                <div key={i} className="ms-fields">
                    {sec.items.map(([l, v], j) => (
                        <div key={j} className="ms-field">
                            <span className="ms-fl">{l}:</span>
                            <span className="ms-fv">{v}</span>
                        </div>
                    ))}
                </div>
            );
            case 'label': return <div key={i} className="ms-label">{sec.text}</div>;
            case 'para':  return <p key={i} className="ms-para">{sec.text}</p>;
            case 'quote': return <blockquote key={i} className="ms-quote">{sec.text}</blockquote>;
            case 'divider': return <div key={i} className="ms-divider" />;
            case 'warning': return <div key={i} className="ms-warning">{sec.text}</div>;
            case 'fragment': return (
                <div key={i} className="ms-fragment-box">
                    <div className="frag-header">YOUR OPERATIVE FRAGMENT</div>
                    {myFragment ? (
                        <>
                            <div className="frag-letter">{myFragment.letter}</div>
                            <div className="frag-pos">Position {myFragment.position} of {myFragment.total}</div>
                            <div className="frag-note">
                                Assemble with all operatives at the CHRYSALIS ARTIFACT.<br />
                                Read letters in position order (1 → {myFragment.total}).
                            </div>
                        </>
                    ) : (
                        <div className="frag-loading">LOADING FRAGMENT...</div>
                    )}
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="archives-container">
            <div className="arch-dust" aria-hidden>
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="dust-mote" style={{ left: `${5 + i * 9}%`, animationDelay: `${i * 0.8}s`, animationDuration: `${7 + (i % 3) * 2}s` }} />
                ))}
            </div>

            <div className="location-header">
                <button className="back-btn" onClick={onBack}>[ RETURN TO MAP ]</button>
                <span className="arch-title">LOCATION ARCHIVES</span>
                <button className="reset-puzzle-btn" onClick={handleReset}>[ RESET ]</button>
            </div>

            <div className="archives-scroll-area">

                {/* ── GATE PHASE ── */}
                {phase === 'gate' && (
                    <div className="arch-gate-wrap">

                        {/* Terminal intro */}
                        <div className="arch-terminal">
                            <div className="term-bar">
                                <span className="td red"/><span className="td yellow"/><span className="td green"/>
                                <span className="term-label">ARCHIVE_TERMINAL v3.1</span>
                            </div>
                            <pre className="term-text">{introText}{!introDone && <span className="tw-cur">█</span>}</pre>
                        </div>

                        {/* Corrupted image */}
                        {introDone && (
                            <CorruptedImage onScan={() => {}} />
                        )}

                        {/* Hex hint (after 2 wrong attempts) */}
                        {showHexHint && (
                            <div className="arch-hint-box hex-hint">
                                <div className="hint-label">⬛ ANALYST NOTE</div>
                                <p>The recovered hex segment above is ASCII-encoded. Each pair of hex digits represents one character.</p>
                                <code>47=G · 45=E · 4E=N · 45=E · 53=S · 49=I · 53=S</code>
                            </div>
                        )}

                        {/* Gate riddle */}
                        {introDone && (
                            <div className="arch-riddle-card">
                                <div className="riddle-head">
                                    <span className="riddle-icon">🔐</span>
                                    <h2>SECURITY CHALLENGE — PASSPHRASE REQUIRED</h2>
                                    <div className="riddle-level">CRYPTOGRAPHIC · OMEGA CLEARANCE</div>
                                </div>

                                <div className="riddle-body">
                                    <div className="riddle-instruction">
                                        A recovered log fragment from Dr. Marsh — integrity: <span className="warn-text">PARTIAL</span>.<br />
                                        Cross-reference with the recovered data above. The system requires a passphrase to proceed.
                                    </div>

                                    <div className="acrostic-block">
                                        {ACROSTIC_LINES.map((line, i) => (
                                            <div key={i} className="acrostic-line">
                                                {showAcrosticHint ? (
                                                    <>
                                                        <span className="acrostic-letter-hint">{line[0]}</span>
                                                        <span className="acrostic-rest">{line.slice(1)}</span>
                                                    </>
                                                ) : (
                                                    <span className="acrostic-rest">{line}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {showAcrosticHint && (
                                        <div className="arch-hint-inline">
                                            ↑ HINT: Something is encoded at the very start of each line.
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleGateSubmit} className={`gate-form ${shake ? 'shake' : ''}`}>
                                    <input
                                        type="text"
                                        value={gateInput}
                                        onChange={e => setGateInput(e.target.value)}
                                        placeholder="Enter passphrase..."
                                        autoComplete="off"
                                        maxLength={30}
                                    />
                                    <button type="submit" className="arch-btn amber">AUTHORIZE →</button>
                                </form>

                                {gateError && <div className="arch-error">{gateError}</div>}
                            </div>
                        )}
                    </div>
                )}

                {/* ── MANUSCRIPT PHASE ── */}
                {phase === 'manuscript' && (
                    <div className="arch-manuscript-wrap">
                        <div className="unlock-banner">🔓 VAULT UNLOCKED — {PAGES.length} CLASSIFIED DOCUMENTS RELEASED</div>

                        {/* Tabs */}
                        <div className="ms-tabs">
                            {PAGES.map((p, i) => (
                                <button key={i} className={`ms-tab ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
                                    DOC {i + 1}
                                </button>
                            ))}
                        </div>

                        {/* Page */}
                        <div className="ms-page">
                            <div className="ms-corner tl"/><div className="ms-corner tr"/>
                            <div className="ms-corner bl"/><div className="ms-corner br"/>
                            <div className="ms-stamp">CLASSIFIED</div>
                            <div className="ms-header">
                                <h2>{PAGES[activeTab].title}</h2>
                                <p className="ms-sub">{PAGES[activeTab].subtitle}</p>
                                <div className="ms-rule" />
                            </div>
                            <div className="ms-body">
                                {PAGES[activeTab].sections.map(renderSection)}
                            </div>
                            <div className="ms-footer">
                                <span>PAGE {activeTab + 1} / {PAGES.length}</span>
                                <span>PROJECT GENESIS — RESTRICTED</span>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="ms-nav">
                            <button className="arch-btn dim" onClick={() => setActiveTab(p => Math.max(0, p - 1))} disabled={activeTab === 0}>← PREV</button>
                            <div className="ms-dots">
                                {PAGES.map((_, i) => <span key={i} className={`ms-dot ${i === activeTab ? 'active' : ''}`} onClick={() => setActiveTab(i)} />)}
                            </div>
                            {activeTab < PAGES.length - 1
                                ? <button className="arch-btn dim" onClick={() => setActiveTab(p => p + 1)}>NEXT →</button>
                                : <button className="arch-btn green" onClick={() => setShowFlagBox(true)}>SUBMIT CODE →</button>
                            }
                        </div>

                        {/* Flag submission */}
                        {showFlagBox && (
                            <div className="flag-panel">
                                <div className="flag-panel-head">⌨ INHIBITOR TERMINAL — ENTER ACTIVATION CODE</div>
                                <p className="flag-panel-desc">Assembled from operative fragments at the CHRYSALIS ARTIFACT. All 8 characters, in position order.</p>
                                <form onSubmit={handleFlagSubmit} className="flag-form">
                                    <input
                                        type="text"
                                        value={flagInput}
                                        onChange={e => setFlagInput(e.target.value)}
                                        placeholder="Enter the activation code..."
                                        autoComplete="off"
                                    />
                                    <button type="submit" className="arch-btn green">INITIATE →</button>
                                </form>
                                {flagMsg && <div className={`flag-msg ${found ? 'ok' : 'err'}`}>{flagMsg}</div>}
                            </div>
                        )}
                    </div>
                )}

                {/* ── DONE ── */}
                {phase === 'done' && (
                    <div className="arch-done">
                        <div className="done-icon">{found ? '✅' : '⚠️'}</div>
                        <h2>{flagMsg}</h2>
                        <p>Returning to map...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Archives;
