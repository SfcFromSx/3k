Original prompt: The game show run by itself, not need me to click to continue. only can reamain a pause function for me to click.

Latest prompt: 1.Review all the project. And update the doc and test incording to the  current version of code.
2.Find all kinds of the points to optimize and solve them. Make sure the code is easy to read, fast and stable to run, and ...
3.The language switch functions between CN and EN seems has no button to trigger.

- Added autoplay scheduling to the arena so turns continue automatically while the game is in `PLAYING`.
- Replaced the manual next-turn button with a pause/resume toggle.
- Added UI feedback so the arena clearly shows whether autoplay is running or paused.
- Added tests for autoplay and pause behavior.
- Verified `npm test -- --run`, `npm run build`, and `npm run lint` all pass after the change.
- Verified in a real browser session that starting the simulation sends the first model request automatically without pressing a next-turn button.
- Added a repeatable avatar generator at `scripts/generate-character-avatars.mjs`.
- Generated 100 SVG avatars for each of the 10 characters under `public/avatars` and wired the game cards to use per-character variants.
- Verified in the browser that identity cards now load `/avatars/<character>/avatar-###.svg` instead of the old placeholder.
- Added per-player `thinkingEN` storage on chat messages, captured from either `<think>...</think>` blocks or provider reasoning fields.
- Added a compact info button on AI player chat bubbles so hidden reasoning can be expanded on demand without cluttering the main transcript.
- Increased defaults and limits: rounds now default to 10 with a max of 50, and turns per round now default to 20 with a max of 100.
- Added skill history persistence in `localStorage`, with seeded/current snapshots and versioned round-review updates for each player.
- Added a `Skill History` viewer on identity cards so version counts and prior notebook snapshots are inspectable in the UI.
- Moved translation work onto an idle background queue so chat progression is prioritized and translations fill in asynchronously afterward.
- Added a shared `src/i18n/uiText.ts` dictionary for EN/CN UI copy and wired both the setup screen and arena to it.
- Added visible CN/EN language toggle buttons, with icons and accessible labels, to both the setup screen and the live arena.
- Added UI-language coverage in `SetupScreen.test.tsx` and `GameArena.test.tsx`.
- Refined `GameArena.tsx` to use narrower Zustand selectors, localized status labels, and localized skill-history source labels.
- Hardened `SetupScreen.tsx` model discovery with unmount cancellation to avoid stale state updates.
- Replaced the round character shuffle in `gameEngine.ts` with a Fisher-Yates shuffle and added a fresh-match translation-runtime reset.
- Switched chat message ids in `useGameStore.ts` to UUID-style ids for safer async updates.
- Rewrote `README.md`, `SDD.md`, `GDD.md`, and `GDD_CN.md` so they match the current codebase instead of the older planned version.
- Removed the unused `src/App.css` file left over from the starter template.
- Verified `npm run test:run`, `npm run lint`, and `npm run build` all pass after the refactor.
- Ran a browser validation with mocked Ollama responses and captured setup/arena screenshots under `output/browser-check/`.

TODO / follow-up ideas:
- The arena language toggle intentionally changes interface labels only; chat text still depends on original English plus optional async translation.
- If you want full bilingual character metadata, the identity cards could also switch faction labels from raw English values to localized labels.
- Expanded `src/assets/characters.json` from 10 to 30 bundled characters and regenerated the avatar set to 3,000 SVGs total.
- Refreshed the 30-character roster with wiki-backed alias and courtesy-name data in `src/assets/characters.json`.
- Updated `src/services/gameEngine.ts` so player candidate summaries include aliases and the Judge now receives a structured source-of-truth profile with aliases, faction, role, traits, and bio.
- Fixed judge-side win detection so alias guesses such as `Am I Kongming?` count as correct for the matching character.
- Added regression coverage in `src/services/gameEngine.test.ts` for alias-aware player prompts, alias guesses, and Judge reference-profile grounding.
- Verified `npm run test:run`, `npm run lint`, and `npm run build` all pass after the character-reference update.
- Ran the web-game Playwright client against the setup screen and visually checked `output/web-game/wiki-judge-check/shot-0.png`; no browser console errors were emitted in that pass.
- Fixed avatar URL generation in `src/assets/avatarCatalog.ts` to respect `import.meta.env.BASE_URL`, which prevents broken player-card avatars when the app is deployed under a subpath such as GitHub Pages.
- Added `src/assets/avatarCatalog.test.ts` to lock in root-path and subpath avatar URL behavior.
- Re-verified `npm run test:run`, `npm run lint`, and `npm run build` after the avatar-path fix.
- Added project-file mirroring for skill history in `src/services/skillHistory.ts`; every saved skill snapshot now posts to a local Vite endpoint in dev.
- Added a Vite middleware in `vite.config.ts` that writes skill exports to `data/skill-history/player-a|b|c/` as `history.json`, `current.md`, and one markdown file per version.
- Added `src/services/skillHistory.test.ts` to verify snapshot export requests are emitted for seed, new-version, and duplicate-content saves.
- Updated `README.md`, `SDD.md`, `GDD.md`, and `GDD_CN.md` so they describe the new on-disk skill export behavior.
- Verified the file-export path end to end by posting a snapshot to the dev server and confirming the expected files were created under `data/skill-history/player-a/`; removed the temporary verification payload afterward and left `data/skill-history/.gitkeep` plus `.gitignore`.
