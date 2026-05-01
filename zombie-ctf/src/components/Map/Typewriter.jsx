import React, { useState, useEffect, useRef } from "react";

const getLines = (user) => {
  if (!user || user.completedPuzzles === 0) {
    return [
      { text: "Initializing system...", delay: 80, pauseAfter: 600 },
      { text: "...", delay: 200, pauseAfter: 400 },
      { text: "...", delay: 200, pauseAfter: 400 },
      { text: "ERROR: Multiple containment failures detected.", delay: 55, pauseAfter: 900, className: "tw-error" },
      { text: "", delay: 0, pauseAfter: 300 },
      { text: "Project Genesis status: COMPROMISED", delay: 60, pauseAfter: 800, className: "tw-warning" },
      { text: "", delay: 0, pauseAfter: 400 },
      { text: "Day 0 was supposed to be the cure.", delay: 60, pauseAfter: 400 },
      { text: "Day 1 became the outbreak.", delay: 60, pauseAfter: 400 },
      { text: "Day 3... we stopped counting.", delay: 60, pauseAfter: 700 },
      { text: "", delay: 0, pauseAfter: 300 },
      { text: "The infection spread faster than any model predicted.", delay: 45, pauseAfter: 350 },
      { text: "Entire sectors went dark within hours.", delay: 55, pauseAfter: 700 },
      { text: "", delay: 0, pauseAfter: 300 },
      { text: "You are now connected to the last operational network.", delay: 45, pauseAfter: 600, className: "tw-highlight" },
      { text: "", delay: 0, pauseAfter: 300 },
      { text: "Your objective is simple:", delay: 65, pauseAfter: 300 },
      { text: "Find the fragments. Reconstruct the truth. Survive.", delay: 50, pauseAfter: 800, className: "tw-highlight" },
      { text: "", delay: 0, pauseAfter: 400 },
      { text: "Access to most zones has been restricted.", delay: 55, pauseAfter: 350 },
      { text: "Only one location remains available.", delay: 55, pauseAfter: 700 },
      { text: "", delay: 0, pauseAfter: 400 },
      { text: ">> LABORATORY ACCESS GRANTED", delay: 60, pauseAfter: 0, className: "tw-access", isLast: true },
    ];
  }
  
  if (user.persona === 'zombie') {
    return [
      { text: "WARNING: INFECTION DETECTED.", delay: 80, pauseAfter: 600, className: "tw-error" },
      { text: "...", delay: 200, pauseAfter: 400 },
      { text: "Your biological signature has mutated.", delay: 55, pauseAfter: 500 },
      { text: "Higher cognitive functions: COMPROMISED", delay: 60, pauseAfter: 800, className: "tw-warning" },
      { text: "", delay: 0, pauseAfter: 300 },
      { text: "The hunger is unbearable.", delay: 60, pauseAfter: 400 },
      { text: "You can hear their heartbeats in Sector B.", delay: 60, pauseAfter: 600 },
      { text: "But the doors are sealed.", delay: 60, pauseAfter: 700 },
      { text: "", delay: 0, pauseAfter: 300 },
      { text: "You need the antidote. Or maybe...", delay: 45, pauseAfter: 800, className: "tw-highlight" },
      { text: "You just need to spread it.", delay: 65, pauseAfter: 600, className: "tw-error" },
      { text: "", delay: 0, pauseAfter: 400 },
      { text: ">> MED BAY ACCESS FORCED OPEN", delay: 60, pauseAfter: 0, className: "tw-access", isLast: true },
    ];
  }

  return [
    { text: "Sector logs updated.", delay: 80, pauseAfter: 400 },
    { text: "Genesis sequence contained.", delay: 55, pauseAfter: 600, className: "tw-highlight" },
    { text: "...", delay: 200, pauseAfter: 400 },
    { text: "But the facility is still locked down.", delay: 55, pauseAfter: 500 },
    { text: "You found something in the lab. A partial blueprint.", delay: 60, pauseAfter: 800 },
    { text: "", delay: 0, pauseAfter: 300 },
    { text: "It points towards the manufacturing plant.", delay: 50, pauseAfter: 400 },
    { text: "Sector B.", delay: 60, pauseAfter: 600 },
    { text: "They were mass-producing it.", delay: 60, pauseAfter: 700 },
    { text: "", delay: 0, pauseAfter: 300 },
    { text: "Proceed with extreme caution.", delay: 45, pauseAfter: 800, className: "tw-warning" },
    { text: "", delay: 0, pauseAfter: 400 },
    { text: ">> SECTOR B ACCESS GRANTED", delay: 60, pauseAfter: 0, className: "tw-access", isLast: true },
  ];
};

const Typewriter = ({ user, onComplete }) => {
  const LINES = getLines(user);
  
  const [lines, setLines] = useState([]);           // fully typed lines
  const [currentLine, setCurrentLine] = useState(0); // which line we're on
  const [currentText, setCurrentText] = useState(""); // partial text of current line
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (currentLine >= LINES.length) {
      setDone(true);
      if (onComplete) setTimeout(onComplete, 800);
      return;
    }

    const line = LINES[currentLine];

    // Empty line — push immediately then pause
    if (line.text === "") {
      timeoutRef.current = setTimeout(() => {
        setLines((prev) => [...prev, { text: "", className: "" }]);
        setCurrentLine((l) => l + 1);
        setCurrentText("");
        setCharIdx(0);
      }, line.pauseAfter);
      return;
    }

    // Still typing characters
    if (charIdx < line.text.length) {
      timeoutRef.current = setTimeout(() => {
        setCurrentText((t) => t + line.text[charIdx]);
        setCharIdx((i) => i + 1);
      }, line.delay);
      return;
    }

    // Finished typing this line — pause, then commit
    timeoutRef.current = setTimeout(() => {
      setLines((prev) => [
        ...prev,
        { text: line.text, className: line.className || "", isLast: !!line.isLast },
      ]);
      setCurrentLine((l) => l + 1);
      setCurrentText("");
      setCharIdx(0);
    }, line.pauseAfter);

    return () => clearTimeout(timeoutRef.current);
  }, [currentLine, charIdx]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <div className="typewriter-box">
      {lines.map((line, i) =>
        line.text === "" ? (
          <br key={i} />
        ) : (
          <div key={i} className={`tw-line ${line.className || ""} ${line.isLast ? "tw-last" : ""}`}>
            {line.text}
          </div>
        )
      )}

      {/* Currently typing line */}
      {currentLine < LINES.length && LINES[currentLine].text !== "" && (
        <div className={`tw-line tw-typing ${LINES[currentLine].className || ""}`}>
          {currentText}
          <span className="tw-cursor">█</span>
        </div>
      )}

      {done && <span className="tw-cursor tw-blink">█</span>}
    </div>
  );
};

export default Typewriter;
