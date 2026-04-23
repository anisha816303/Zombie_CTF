# Zombie_CTF

Overview
--------

This repository is a small React app bootstrapped with Vite. The app files live under the `src` folder and the development server is powered by Vite for fast HMR.

Prerequisites
-------------

- Node.js 18 or later (LTS recommended)
- `npm` (bundled with Node) or `yarn`

Quick setup
-----------
Within the folder zombie-ctf:

1. Install dependencies:

```bash
npm install
```

2. Start the development server (opens at http://localhost:5173 by default):

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview the production build locally:

```bash
npm run preview
```

Notes for Windows / PowerShell
-----------------------------

- Use PowerShell or Windows Terminal when running the commands above.
- If you hit permission issues, try running the terminal as Administrator or use `npx` instead of globally installed tools.

Common Scripts
--------------

- `npm run dev` — Runs the Vite development server with HMR.
- `npm run build` — Produces an optimized production build in the `dist` folder.
- `npm run preview` — Serves the production build locally for verification.

Project structure (key files)
-----------------------------

- [src/main.jsx](src/main.jsx) — App entry and renderer.
- [src/App.jsx](src/App.jsx) — Root app component.
- [src/index.css](src/index.css) — Global styles.
- [src/components/Map/Map.jsx](src/components/Map/Map.jsx) — Map component.
- [src/components/Lab/Laboratory.jsx](src/components/Lab/Laboratory.jsx) — Laboratory view.

Troubleshooting
---------------

- If the dev server fails to start because the port is in use, set a different port: `npm run dev -- --port 3000`.
- If you see runtime errors after a dependency update, remove `node_modules` and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

References
----------

- Vite: https://vitejs.dev/
- React: https://reactjs.org/


