# Repository Scaffolding, DevOps & CI/CD — DeckCraft Studio

## 1. Directory Layout

```
deckcraft-studio/
├── .github/
│   ├── copilot-instructions.md          # Primary Copilot System prompt
│   └── workflows/
│       ├── ci.yml                       # Lint, Typecheck, Vitest, Playwright
│       └── deploy.yml                   # Automated GitHub Pages / Cloudflare deploy
├── docs/
│   ├── PRD.md                           # Product Requirements Document
│   ├── ARCHITECTURE.md                  # System Architecture Specification
│   ├── SCAFFOLDING_AND_DEVOPS.md        # This setup guide
│   └── COPILOT_PROMPTS.md               # Step-by-step Copilot prompts
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── maskable-icon.png
│   └── manifest.webmanifest             # PWA Manifest
├── src/
│   ├── assets/                          # Static sample assets & preset icons
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── DeviceBezel.tsx          # Logitech MX / Stream Deck frame mockups
│   │   │   ├── KeyGrid.tsx              # Grid container with drag-drop reordering
│   │   │   └── KeyTile.tsx              # Individual interactive LCD key tile
│   │   ├── controls/
│   │   │   ├── BackgroundControls.tsx   # Color, gradient, squircle radius sliders
│   │   │   ├── GlyphControls.tsx        # Tint, scale, rotation, optical alignment
│   │   │   ├── BadgeControls.tsx        # Text sub-labels and status pips
│   │   │   ├── PresetSelector.tsx       # Theme presets (Obsidian, Neon, Pale Grey)
│   │   │   └── HardwareProfileBar.tsx   # Device selector (Logitech MX vs SD XL)
│   │   ├── dialogs/
│   │   │   ├── ExportDialog.tsx         # Resolution, hardware target, <=150KB audit
│   │   │   ├── IconBrowserModal.tsx     # Lucide & SimpleIcons searchable browser
│   │   │   └── ProjectManagerModal.tsx  # Load, save, duplicate .deckcraft files
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── ToastContainer.tsx
│   ├── db/
│   │   └── index.ts                     # Dexie.js IndexedDB schema & helpers
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useProjectAutoSave.ts
│   ├── store/
│   │   ├── projectStore.ts              # Zustand active project state
│   │   ├── uiStore.ts                   # Selection, zoom, bezel mode state
│   │   └── exportStore.ts               # Packaging options
│   ├── types/
│   │   └── index.ts                     # TypeScript definitions
│   ├── utils/
│   │   ├── color.ts                     # Hex, HSL, gradient utilities
│   │   ├── dompurify.ts                 # Vector sanitization wrapper
│   │   ├── squircle.ts                  # Superellipse bezier path math
│   │   └── svgo.ts                      # Client-side SVG optimizer
│   ├── workers/
│   │   ├── render.worker.ts             # OffscreenCanvas batch renderer
│   │   └── export.worker.ts             # fflate ZIP streaming packager
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── tests/
│   ├── unit/
│   │   ├── color.test.ts
│   │   ├── squircle.test.ts
│   │   ├── render-worker.test.ts
│   │   └── project-store.test.ts
│   └── e2e/
│       ├── batch-styling.spec.ts        # Playwright batch color change test
│       ├── import-export.spec.ts        # Playwright dropzone to ZIP test
│       └── logitech-mx-compliance.spec.ts # Size <=150KB validation test
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
└── playwright.config.ts
```

## 2. Pinned `package.json`

```json
{
  "name": "deckcraft-studio",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write "src/**/*.{ts,tsx,css}"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "dexie": "^4.0.11",
    "dompurify": "^3.2.4",
    "fflate": "^0.8.2",
    "immer": "^10.1.1",
    "lucide-react": "^0.475.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "simple-icons": "^14.5.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.1",
    "@tailwindcss/vite": "^4.0.6",
    "@types/dompurify": "^3.0.5",
    "@types/node": "^22.13.4",
    "@types/react": "^19.0.9",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.20.1",
    "prettier": "^3.5.1",
    "tailwindcss": "^4.0.6",
    "typescript": "^5.7.3",
    "vite": "^6.1.0",
    "vite-plugin-pwa": "^0.21.1",
    "vitest": "^3.0.5"
  }
}
```

## 3. Key Configuration Files

### 3.1 `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'DeckCraft Studio',
        short_name: 'DeckCraft',
        description: 'Batch Icon Designer & Exporter for Logitech MX & Stream Deck',
        theme_color: '#0f172a',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
});
```

### 3.2 `.github/workflows/ci.yml`
```yaml
name: CI Suite

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Typecheck
        run: npm run typecheck
      - name: Lint
        run: npm run lint
      - name: Unit Tests
        run: npm run test:coverage
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      - name: End-to-End Tests
        run: npm run test:e2e
      - name: Build Application
        run: npm run build
```

### 3.3 `.github/workflows/deploy.yml`
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - id: deployment
        uses: actions/deploy-pages@v4
```
