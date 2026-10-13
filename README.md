# DeckCraft Studio

Client-side PWA for batch-styling and exporting icon sets for the Logitech MX Creative Keypad (each file ≤150 KB), Stream Deck and Loupedeck. Everything runs in the browser; projects persist in IndexedDB.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build (PWA) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm test` / `npm run test:coverage` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Usage

Drop or paste SVG/PNG/WebP/JPG files, or use the icon browser. Select tiles (click, Shift/Ctrl+click, marquee), then edit background, glyph and badge styles in the sidebar; with no selection the master style is edited. Export a ZIP from the header. The Logitech folder is auto-compressed (palette quantization, then downscale) to stay under 150 KB, with an audit shown in the export dialog. Projects can be saved/loaded as `.deckcraft` files.

See `docs/` for the PRD, architecture and playbook.
