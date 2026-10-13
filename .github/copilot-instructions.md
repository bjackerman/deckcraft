# GitHub Copilot Instructions for DeckCraft Studio

You are an expert Principal Frontend & Systems Architect building **DeckCraft Studio**, a privacy-first, client-side Progressive Web App (PWA) for batch-designing and exporting hardware icon sets (Logitech MX Creative Console, Elgato Stream Deck, Loupedeck).

## Core Architectural Invariants
1. **100% Client-Side & Privacy-First:** Zero backend servers for image processing. No user images or SVGs may ever leave the client browser.
2. **Non-Blocking Batch Processing:** All raster transformations, format conversions, and ZIP compression MUST execute inside Web Workers (`OffscreenCanvas` and `fflate`) to maintain 60 FPS on the UI thread even with 100+ icons.
3. **Strict Memory Hygiene:** Always revoke Object URLs (`URL.revokeObjectURL`) when components unmount or assets update to prevent memory leaks during heavy image editing.
4. **Non-Destructive Layer Pipeline:** An icon consists of independent parametric layers: `Background` (fill, gradient, shape, border), `Glyph` (vector SVG or raster, tint, scale, offset), and `Overlay/Badge` (text, notification dot, toggle indicator). Modifying a global style MUST update all linked icons without overwriting source assets.
5. **Offline-First PWA:** The app must be fully functional offline using Workbox Service Worker caching.

## Tech Stack & Language Standards
- **Framework:** React 19 + TypeScript (Strict mode enabled, zero `any` types).
- **Build System:** Vite 6 with `@vitejs/plugin-react` and `vite-plugin-pwa`.
- **Styling:** Tailwind CSS v4 with semantic design tokens and dark mode as first-class default.
- **Icons:** `lucide-react`.
- **State Management:** Zustand with Immer middleware for granular state slices (`projectStore`, `uiStore`, `exportStore`).
- **Persistence:** IndexedDB via `dexie` for project persistence, draft auto-saving, and asset blob storage.
- **Sanitization:** `dompurify` for all user-imported SVG vectors before parsing or rendering.
- **Compression & Export:** `fflate` for fast streaming ZIP packaging.
- **Testing:** Vitest for unit tests; Playwright for end-to-end user workflow validation.

## Code Quality & Implementation Rules
- Write modular, single-responsibility files. Components must not exceed 250 lines; extract hooks and utilities.
- Use explicit TypeScript interfaces for all data structures (see `src/types/`).
- Handle hardware constraints explicitly: e.g., Logitech MX Creative Console enforces <= 150 KB per asset; the export engine must calculate byte sizes and provide auto-compression fallbacks.
- Implement comprehensive error boundaries and user-friendly toast notifications for corrupted file imports.
- Maintain accessible markup (ARIA attributes, keyboard navigation for the icon grid, high-contrast themes).
