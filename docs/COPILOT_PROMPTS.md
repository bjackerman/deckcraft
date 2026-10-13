
Feed these prompts sequentially into **GitHub Copilot Workspace** or **VS Code Copilot Chat**. Each prompt is self-contained with explicit acceptance criteria.

---

### Phase 1: Project Setup, Tooling & Core Type System
**Copilot Prompt 1:**
```text
Act as a Principal Frontend Architect. Read `.github/copilot-instructions.md` and `docs/ARCHITECTURE.md`.
Scaffold the base project setup:
1. Generate `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, and `playwright.config.ts` matching the exact specifications in `docs/SCAFFOLDING_AND_DEVOPS.md`.
2. Create `src/types/index.ts` declaring all interfaces for: `HardwareProfileId`, `ShapeGeometry`, `BackgroundType`, `BackgroundStyle`, `GlyphStyle`, `BadgeStyle`, `IconStyle`, `IconItem`, and `DeckProject`.
3. Provide factory default styles in `src/utils/constants.ts` with default profiles for Logitech MX Creative Keypad (3x3), Stream Deck MK.2 (3x5), and Stream Deck XL (4x8).
4. Verify that running `npm run typecheck` passes with zero errors.
```

---

### Phase 2: Vector & Raster Ingestion Pipeline
**Copilot Prompt 2:**
```text
Implement the multi-source asset ingestion pipeline in `src/utils/dompurify.ts` and `src/utils/ingestion.ts`:
1. Use `dompurify` to sanitize all incoming SVG vector strings, removing script tags, event handlers, and external URLs.
2. Build an SVG normalizer that ensures standard `viewBox="0 0 100 100"`, strips hardcoded pixel `width`/`height`, and prepares fill/stroke attributes for dynamic palette replacement.
3. Build `handleFileUpload(files: FileList | File[])` supporting drag-and-drop ingestion of SVGs and raster files (PNG, WebP, JPG).
4. Implement clipboard paste support (`Ctrl+V`) for image blobs.
5. Create unit tests in `tests/unit/ingestion.test.ts` verifying that malicious SVGs are sanitized, dimensions are normalized, and raster images are loaded as valid data URIs.
```

---

### Phase 3: Web Worker Batch Rendering Engine & Superellipse Math
**Copilot Prompt 3:**
```text
Implement the core rendering pipeline:
1. Create `src/utils/squircle.ts` implementing a true superellipse path generator using cubic bezier curve approximation for smooth squircle button shapes.
2. Implement `src/workers/render.worker.ts` using `OffscreenCanvas`:
   - It receives an array of `IconItem` descriptors and the current `IconStyle`.
   - Renders background: handles solid color, linear gradient (with custom angle), radial gradient, border strokes, and clipped squircle/rounded shapes.
   - Renders glyph: centers SVG/bitmap with configurable optical scale (20%-120%) and offset X/Y; applies monochrome or dual-tone color tints.
   - Renders overlay text badge / status dot if enabled.
   - Returns transferable `ImageBitmap` or object blobs.
3. Create `tests/unit/squircle.test.ts` and `tests/unit/render-worker.test.ts` verifying path bounds and batch rendering output.
```

---

### Phase 4: State Management & IndexedDB Persistence
**Copilot Prompt 4:**
```text
Implement the client-side state store and persistent database:
1. Configure `src/db/index.ts` using `dexie` with tables for `projects`, `assets`, and `presets`.
2. Build `src/store/projectStore.ts` using Zustand + Immer:
   - State: `currentProject`, `history` (undo/redo stack up to 30 steps).
   - Actions: `addIcons`, `removeIcons`, `reorderIcons`, `updateMasterStyle`, `updateIconOverride`, `toggleLockIcon`, `createToggleStatePair`.
   - Action `createToggleStatePair(iconId)`: duplicates the selected icon, marks it as secondary state, sets contrasting accent color, and adds a status badge or strikethrough.
3. Implement `src/hooks/useProjectAutoSave.ts` to automatically sync state to IndexedDB with 500ms debounce.
4. Add unit tests in `tests/unit/project-store.test.ts` checking batch style updates, lock protection, and undo/redo operations.
```

---

### Phase 5: Interactive Device Grid & Bezel Preview
**Copilot Prompt 5:**
```text
Create the visual hardware canvas UI in `src/components/canvas/`:
1. `DeviceBezel.tsx`: Render realistic photorealistic frame mockups around the key grid for:
   - Logitech MX Creative Keypad: 3x3 LCD keys with pale grey and graphite aluminum bezel, tactile key borders, and realistic LCD gloss.
   - Elgato Stream Deck: 3x5 and 4x8 dark matte frames with soft key shadows.
2. `KeyGrid.tsx`: Implement the responsive grid layout matching active hardware profile with drag-and-drop key reordering.
3. `KeyTile.tsx`: Individual key slot displaying the live rendered icon, lock status indicator, selection checkbox, and quick-action menu (duplicate as toggle pair, delete, isolate edit).
4. Add marquee selection and Shift+Click multi-select support to enable styling subsets of icons.
```

---

### Phase 6: Batch Inspector & Preset Control Panel
**Copilot Prompt 6:**
```text
Build the batch inspector and styling controls in `src/components/controls/`:
1. `BackgroundControls.tsx`:
   - Shape selector: Square, Rounded Rect, Squircle, Circle, Hexagon.
   - Fill mode: Solid, Linear Gradient, Radial Gradient, Glassmorphism.
   - Color pickers with hex inputs and quick-swatch palettes.
   - Border stroke slider and inner shadow controls.
2. `GlyphControls.tsx`:
   - Tint modes: Monochrome (one-click tint), Dual-tone, Original Colors.
   - Scale slider (20% to 120%) with "Optical Fit" auto-centering button.
   - Position nudging (X/Y offsets) and 90-degree rotation buttons.
3. `BadgeControls.tsx`:
   - Text sub-label input (for hotkeys like CMD+C, F13), font size, badge position.
4. `PresetSelector.tsx`:
   - 10 pre-configured themes: "Obsidian Slate", "Logitech Pale Grey", "Cyberpunk Neon", "Pastel Studio", "Retro Terminal Green", "Minimalist White", etc.
   - "Save as Custom Preset" button saving into IndexedDB.
```

---

### Phase 7: Hardware Export Engine & Logitech 150KB Compliance
**Copilot Prompt 7:**
```text
Implement the export and packaging engine in `src/workers/export.worker.ts` and `src/components/dialogs/ExportDialog.tsx`:
1. Support targeted export configurations:
   - **Logitech MX Creative Keypad:** Generates high-res 288x288 PNG and optimized SVG.
     * CRITICAL: Test each generated icon's byte size. If > 145 KB, automatically reduce bit depth or scale to guarantee strict <= 150 KB Logi Options+ compliance.
   - **Elgato Stream Deck:** Generates 144x144 and 288x288 PNG pairs.
   - **Universal:** Custom user dimensions and sanitized naming patterns.
2. Use `fflate` to stream all generated files into a ZIP archive without UI freezing.
3. Include the complete `project.deckcraft` JSON file inside the root of the ZIP so users can re-import the ZIP later and resume non-destructive editing.
4. Add E2E test in `tests/e2e/logitech-mx-compliance.spec.ts` asserting that every generated Logitech asset is <= 150 KB and valid.
```

---

### Phase 8: Built-in Icon Browser, PWA Offline Service Worker & Final Polish
**Copilot Prompt 8:**
```text
Complete the application with built-in asset discovery and PWA readiness:
1. `src/components/dialogs/IconBrowserModal.tsx`:
   - Client-side searchable library of Lucide icons and popular Simple Icons (Adobe, Blender, VS Code, Figma, Discord, OBS, Spotify, Terminal).
   - Clicking an icon instantly adds it as a new tile to the current project grid.
2. PWA Offline Setup:
   - Verify `vite-plugin-pwa` configuration, web manifest icons, and offline caching.
   - Test offline functionality in Chrome DevTools network simulation.
3. Run full CI pipeline locally:
   - `npm run lint` -> 0 warnings.
   - `npm run typecheck` -> 0 errors.
   - `npm run test:coverage` -> > 80% coverage on core utils.
   - `npm run test:e2e` -> all Playwright tests passing.
```

---
