# Zombie CTF: Project Chrysalis Outbreak

Welcome to **Zombie CTF**, a collaborative, real-time puzzle game where humans race against a biological threat to secure an underground facility, while a secret infected faction tries to sabotage their efforts and spread the virus.

## The Storyline

### The Genesis (Project Chrysalis)
Dr. Evelyn Marsh, the lead virologist at Station 7-B, developed the **Chrysalis Protocol**—a revolutionary genetic enhancement designed to eradicate disease. However, the vector mutated. A synthetic inhibitor known as **ARC-7** was the only thing keeping the virus contained. On Day 1 at 01:47 UTC, someone used the Director's override to disable the ARC-7 cold storage. By 03:00 UTC, the virus was airborne in Wing C. Dr. Marsh left behind fragmented logs and vanished. The facility went into absolute lockdown. 

### The Rising Tension (The Outbreak)
Players assume the roles of operatives deployed to Station 7-B to restore the facility and synthesize the antidote. 
As operatives work through the initial sectors (like bypassing the lockdown in Sector B and recovering corrupted logs in the Archives), a hidden truth emerges: **The virus has already infiltrated the team.** 
When the Archives are breached, the system recognizes the biological anomalies. A select few operatives succumb to the virus in secret, their UI turning red as their genome is rewritten. The game morphs from a cooperative puzzle room into a paranoid game of survival.

### New Roles & Deception
After the initial outbreak, specific operatives may step into specialized roles:
- **The Medic**: Tasked with deciphering the erratic biosignals in the **MedBay**, the Medic is the only one who can confirm the antidote sequencing. But if an infected player clears the MedBay first, they gain access to the biological targeting systems, allowing them to selectively deploy airborne pathogens to infect specific human targets with a ticking 60-second death timer.
- **The Detective**: (Planned Expansion) Tasked with cross-referencing system logs to figure out who initiated the 01:47 override, using tools to reveal hidden statuses of other players.
- **The Saboteurs (Zombies)**: Must blend in while intentionally misleading human teammates in collaborative puzzles like the **Control Room**, where wave synchronization requires perfect teamwork.

### The Descent (Diverging Paths)
Once the lockdown is temporarily lifted in the Control Room and the MedBay is compromised, the paths of the living and the infected split.

**For the Operatives (The Path to Extraction):**
1. **The Server Core**: The Director rigged the cooling systems to overload. Operatives must reroute power and stabilize the core temperature to prevent a catastrophic meltdown.
2. **The Decontamination Airlock**: A deadly trap designed to flood with Chrysalis vapor. Humans must balance a complex chemical equation to synthesize a temporary neutralizer and escape the chamber.
3. **The Executive Quarters**: Deep in the facility, operatives must sift through the Director's encrypted personal logs to find his physical master keycard, the only item that can authorize a surface extraction.
4. **The Extraction Helipad**: The final stand. Operatives must calibrate the communication array to signal the extraction chopper while manually holding the blast doors shut against the approaching horde.

**For the Saboteurs (The Path to Assimilation):**
1. **The Ventilation Shafts**: The infected move to the environmental controls to override the airflow, distributing the Chrysalis virus across the remaining human safe zones.
2. **The Bio-Waste Processing Facility**: The zombies must corrupt the emergency incinerators, ensuring the ARC-7 inhibitor cannot be mass-burned to cleanse the facility.
3. **The Armory**: The infected sabotage the automated turret defenses and EMP the weapon lockers, leaving the humans defenseless for their final run.
4. **The Hive Mind Nexus (Sub-Level 9)**: The zombies physically link their mutated neural pathways to the facility's mainframe, attempting a complete system takeover to permanently seal all exits.

### The Climax
The game evolves into a frantic race. The remaining humans are rushing upwards toward the Helipad to secure extraction, while the infected descend into the Hive Mind Nexus to initiate a total facility lockdown. The ticking timer of the MedBay targeted infections continues to pressure the operatives, forcing them to solve their puzzles flawlessly or face assimilation.

### The Conclusion
- **Human Victory (Containment & Escape)**: The operatives successfully signal the chopper at the Helipad, using the Director's keycard to initiate a localized orbital strike on the facility as they fly away. The virus is contained, and the ARC-7 formula is secured for the outside world.
- **Zombie Victory (Global Assimilation)**: The infected successfully link with the Hive Mind Nexus before the chopper can be signaled. The blast doors drop, sealing the humans inside. With full control of the facility's communications, the infected broadcast an "all clear," luring rescue teams down into the depths to begin the global spread.

## Development Setup

### Backend
1. Navigate to `backend` directory.
2. Run `npm install`
3. Run `npm start` (Requires MongoDB running locally or a `MONGO_URI` env variable)

### Frontend
1. Navigate to `src` directory.
2. Run `npm install`
3. Run `npm run dev`
