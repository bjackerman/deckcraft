# Product Requirements Document (PRD) — DeckCraft Studio

## 1. Vision & Executive Summary
DeckCraft Studio is a specialized, open-source, client-side PWA designed to eliminate the friction of creating cohesive icon packs for hardware control consoles. It empowers content creators, live streamers, audio/video editors, and software developers to import disparate icons, uniformly batch-style them with matching backgrounds and colorways, preview them in realistic hardware bezels, and export production-ready packages in seconds.

## 2. Community Research & Target Personas

### 2.1 Community Pain Points (Reddit & Forum Findings)
- **r/logitech & r/streamdeck:**
  - *"I have icons from 4 different packs; one is flat white, one is 3D, one is an iOS squircle. They look hideous together on my keypad."*
  - *"Logitech MX Creative Keypad rejects files over 150 KB. I had to manually compress 9 icons one by one in Squoosh."*
  - *"Elgato Key Creator is completely single-icon. If I change my desk theme from purple to amber, I have to redo 32 keys manually."*
  - *"I spent 2 hours designing icons, accidentally closed the tab, and lost everything because there was no project file."*
  - *"I need two versions of my mute button: grey when unmuted, glowing red with a slash when muted. It should take 5 seconds to generate the pair."*

### 2.2 Target Personas
1. **The Creative Professional (Logitech MX Keypad User):**
   - Video editors (Premiere/DaVinci) and designers using the MX Creative Console. Needs clean 3x3 layout previews, high-contrast monochrome glyphs, precision padding, and direct compliance with Logi Options+ (SVG or <=150KB PNG).
2. **The Streamer / Broadcaster (Elgato Stream Deck XL/Plus):**
   - Requires bold, legible icons with status indicator pairs (live/off, mute/unmute), high-contrast gradients, and one-click ZIP packaging with 144x144 and 288x288 retina assets.
3. **The Software Engineer / DevOps Power-User:**
   - Uses terminal, Docker, Kubernetes, and Git hotkeys. Relies on official brand logos (SimpleIcons) unified with a consistent dark-slate squircle background and hotkey text labels (e.g., `⌘K`, `F5`).

---

## 3. Functional Requirements

### FR-1: Multi-Source Asset Ingestion
- **FR-1.1 File Dropzone:** Drag-and-drop support for SVG, PNG, WebP, JPG, and GIF.
- **FR-1.2 Batch Multi-Upload:** Ingest up to 100 icons simultaneously with automated naming based on source filenames.
- **FR-1.3 Clipboard Paste:** Direct `Ctrl+V` / `Cmd+V` image paste support.
- **FR-1.4 Integrated Icon Browser:**
  - Searchable client-side vector libraries: Lucide Icons (general utilities) and Simple Icons (tech, apps, developer tools, social brands).
  - One-click addition of vector glyphs directly to the active project canvas.
- **FR-1.5 SVG Vector Sanitization:** All SVGs sanitized with `DOMPurify` to strip `<script>`, external references, and malicious attributes.

### FR-2: Unified Batch Styling Engine (Master Style)
Styles can be applied globally to all icons, to a selected subset, or overridden per individual icon:
- **FR-2.1 Background Layer:**
  - **Type:** Solid Color, Linear Gradient (angle, dual stops), Radial Gradient, Frosted Glass (blur + subtle border), Transparent.
  - **Geometry:** Corner Radius slider (0% sharp square to 50% circle), Squircle (continuous curvature superellipse), Hexagon, Beveled.
  - **Border:** Stroke width (0-20px), border color, inner/outer glow, inset shadow.
- **FR-2.2 Foreground / Glyph Layer:**
  - **Recoloring:** Single-click monochrome tinting (replace all SVG fills/strokes with selected palette color), dual-tone tinting, or preserve original colors.
  - **Sizing & Optical Padding:** Global scale slider (20% to 100% of canvas area) with auto-centering.
  - **Positioning:** Nudge X/Y offsets, 90-degree rotations, flip horizontal/vertical.
  - **Shadow/Effects:** Drop shadow (blur, distance, opacity, color) for high legibility against varied backgrounds.
- **FR-2.3 Overlay & Badge Layer:**
  - **Text Label:** Optional text label (subtext, hotkey badge) with configurable font, size, weight, and position (top, bottom, center).
  - **Status Pips:** Notification dot / corner badge (e.g., green dot, red recording circle, alert exclamation).
- **FR-2.4 Toggle Pair Generator:**
  - One-click duplicate to create "State B" (e.g., Inactive -> Active, Mute -> Live).
  - Preset color swaps (e.g., Slate Grey -> Vibrant Crimson, Glyphs gains a diagonal strikethrough slash).

### FR-3: Hardware Grid & Live Preview Matrix
- **FR-3.1 Device Layout Profiles:**
  - **Logitech MX Creative Keypad:** 3x3 LCD Grid with realistic pale grey / graphite bezel frame.
  - **Elgato Stream Deck Mini:** 2x3 Grid.
  - **Elgato Stream Deck (MK.2 / Standard):** 3x5 Grid.
  - **Elgato Stream Deck XL:** 4x8 Grid.
  - **Elgato Stream Deck +:** 4x2 Keys + Touchstrip preview.
  - **Loupedeck Live / Razer Stream Controller:** 3x4 Grid + circular dial buttons.
  - **Custom / Infinite Grid:** User-defined rows and columns.
- **FR-3.2 Interactive Canvas Controls:**
  - Drag-and-drop reordering of key slots.
  - Multi-select (Shift+Click, marquee drag) for selective batch styling.
  - "Lock Style" toggle per icon to exempt specific keys from global master updates.

### FR-4: Project Persistence & Workspace Management
- **FR-4.1 Local Auto-Save:** Instant persistence to browser IndexedDB on every edit. Zero data loss on refresh or browser crash.
- **FR-4.2 Native Project Bundle (`.deckcraft`):**
  - Portable JSON manifest containing all layer parameters and base64/SVG vector asset payloads.
  - Complete project import/export enabling cross-device synchronization and sharing.
- **FR-4.3 Style Preset Library:**
  - Save custom style configurations as reusable templates (e.g., "Cyberpunk Neon", "Logitech Pale Grey", "Dark Minimalist Obsidian").
  - 10+ pre-bundled factory presets out-of-the-box.

### FR-5: Export & Hardware Optimization Engine
- **FR-5.1 Hardware Presets:**
  - **Logitech MX Creative Console:**
    - Format: Optimized SVG (vector) AND 288x288 PNG.
    - Strict Check: Automatic verification that file sizes are <= 150 KB. If a PNG exceeds 150 KB, worker applies intelligent quantizing to guarantee compliance.
  - **Elgato Stream Deck:**
    - 144x144 (Standard) and 288x288 (@2x Retina) PNGs.
    - Formatted folder structure ready for drag-and-drop into Elgato Stream Deck software.
  - **Loupedeck:**
    - 90x90 & 120x120 PNGs and SVGs.
  - **Universal / Custom:**
    - Custom export resolutions (from 64x64 up to 1024x1024 px).
- **FR-5.2 Package Formats:**
  - Batch ZIP archive containing organized folders, named according to user convention (`{index}_{keyName}_{state}.png`).
  - Bundle includes `project.deckcraft` inside the ZIP so opening the ZIP in DeckCraft Studio reloads the full editable project.
  - Single-key instant download (PNG / SVG).

---

## 4. Non-Functional Requirements
- **NFR-1 Performance:** Batch rendering of 36 icons must complete in < 250ms using Web Workers.
- **NFR-2 Zero Server Latency & Privacy:** App operates 100% offline once cached.
- **NFR-3 Responsiveness & A11y:** Smooth operation across desktop displays (1080p, 1440p, 4K) with full keyboard accessibility.
- **NFR-4 PWA Standard:** Passes all Lighthouse PWA criteria (installable, offline service worker, responsive, valid manifest).
