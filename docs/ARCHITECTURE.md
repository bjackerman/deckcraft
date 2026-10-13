# System Architecture & Technical Specification — DeckCraft Studio

## 1. High-Level Architectural Diagram

```
+---------------------------------------------------------------------------------------+
|                                    DeckCraft Studio PWA                               |
+---------------------------------------------------------------------------------------+
|  Presentation Layer (React 19 + Tailwind CSS v4 + Lucide Icons)                       |
|  +--------------------+  +----------------------+  +--------------------------------+ |
|  |  Device Grid View  |  | Batch Inspector UI   |  | Asset Gallery & Icon Search    | |
|  |  (MX 3x3, SD 3x5)  |  | (Styles, Colors, Bg) |  | (Lucide, SimpleIcons, Uploads) | |
|  +---------+----------+  +----------+-----------+  +---------------+----------------+ |
|            |                        |                              |                  |
+------------|------------------------|------------------------------|------------------+
|  Application State Layer (Zustand + Immer)                                            |
|  +--------------------+  +----------------------+  +--------------------------------+ |
|  |  useProjectStore   |  |     useUIStore       |  |       useExportStore           | |
|  |  - icons: IconItem |  |  - activeProfile     |  |  - exportFormat                | |
|  |  - masterStyle     |  |  - selectedIconIds   |  |  - targetHardware              | |
|  |  - history (undo)  |  |  - zoom / bezelMode  |  |  - compressionLevel            | |
|  +---------+----------+  +----------+-----------+  +---------------+----------------+ |
|            |                                                       |                  |
+------------|-------------------------------------------------------|------------------+
|  Persistence & Offline Storage (Dexie.js / IndexedDB)              |                  |
|  +----------------------------------------------+                  |                  |
|  | Tables: 'projects', 'assets', 'presets'      |                  |                  |
|  +----------------------------------------------+                  |                  |
|                                                                    |                  |
+--------------------------------------------------------------------|------------------+
|  Worker Pipeline (Non-Blocking Multithreading)                     |                  |
|  +-----------------------------------------+  +--------------------v----------------+ |
|  | Render Worker (OffscreenCanvas)         |  | Export & Compression Worker (fflate)| |
|  | - SVG parse & recolor                   |  | - Parallel canvas rendering         | |
|  | - Background gradient & squircle clip   |  | - <= 150KB Logi MX verification     | |
|  | - Drop shadow & optical padding         |  | - Streaming ZIP archive generation  | |
|  +-----------------------------------------+  +-------------------------------------+ |
+---------------------------------------------------------------------------------------+
```

## 2. Core Data Models (`src/types/index.ts`)

```typescript
export type HardwareProfileId = 
  | 'logitech-mx-keypad' // 3x3, 9 LCD keys, <= 150KB
  | 'stream-deck-mini'   // 2x3, 6 keys
  | 'stream-deck-mk2'    // 3x5, 15 keys
  | 'stream-deck-xl'     // 4x8, 32 keys
  | 'stream-deck-plus'   // 4x2, 8 keys + dials
  | 'loupedeck-live'     // 3x4, 12 keys
  | 'custom-grid';

export type ShapeGeometry = 'square' | 'rounded' | 'squircle' | 'circle' | 'hexagon';

export type BackgroundType = 'solid' | 'linear-gradient' | 'radial-gradient' | 'glass' | 'transparent';

export interface BackgroundStyle {
  type: BackgroundType;
  primaryColor: string;
  secondaryColor?: string;
  gradientAngle: number; // 0 to 360 deg
  shape: ShapeGeometry;
  borderRadius: number; // 0 to 50%
  borderWidth: number; // px
  borderColor: string;
  shadowBlur: number;
  shadowColor: string;
}

export interface GlyphStyle {
  mode: 'monochrome' | 'dual-tone' | 'original';
  tintColor: string;
  secondaryTintColor?: string;
  scale: number; // 0.2 to 1.2
  offsetX: number; // -50 to 50 px
  offsetY: number;
  rotation: number; // 0, 90, 180, 270 deg
  dropShadowBlur: number;
  dropShadowColor: string;
}

export interface BadgeStyle {
  enabled: boolean;
  text?: string;
  textColor: string;
  backgroundColor: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center-bottom';
  fontSize: number;
}

export interface IconStyle {
  background: BackgroundStyle;
  glyph: GlyphStyle;
  badge: BadgeStyle;
}

export interface IconItem {
  id: string;
  name: string;
  sourceType: 'svg' | 'raster';
  rawPayload: string; // Sanitized SVG XML string or base64 data URI
  customStyle?: Partial<IconStyle>; // Overrides master style if defined
  isLocked: boolean; // If true, ignores master style batch updates
  statePairId?: string; // Links toggled pairs (e.g. Muted vs Unmuted)
  toggleState?: 'primary' | 'secondary';
  cachedRenderUri?: string;
}

export interface DeckProject {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  hardwareProfile: HardwareProfileId;
  masterStyle: IconStyle;
  icons: IconItem[];
}
```

## 3. The Non-Destructive Vector & Canvas Pipeline

### 3.1 SVG Vector Ingestion & Sanitization
1. Imported SVGs pass through `DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true, svgFilters: true } })`.
2. Normalized to standard `viewBox="0 0 100 100"` coordinates.
3. In monochrome mode: All `fill` and `stroke` attributes (except `fill="none"`) are dynamically mapped to `currentColor`, enabling real-time CSS/Canvas palette swapping without modifying original geometry.

### 3.2 Web Worker Batch Rendering (`src/workers/render.worker.ts`)
1. Uses `OffscreenCanvas(288, 288)` inside a dedicated Web Worker pool.
2. Draws Background:
   - For `squircle`: Uses continuous curvature spline curve approximation (`x^4 + y^4 = r^4`).
   - Clips canvas context to shape path.
   - Paints solid fill or gradient.
   - Strokes border path if `borderWidth > 0`.
3. Draws Glyph:
   - Draws SVG or Image bitmap centered with padding and optical scaling.
   - Applies shadow filter if requested.
4. Draws Badge / Label overlay if enabled.
5. Converts canvas to `ImageBitmap` or `Blob` and transfers back to main thread via transferable objects for zero serialization overhead.

### 3.3 Logitech MX Creative Console Compliance Engine
Logi Options+ strictly enforces <= 150 KB per asset.
1. The export worker checks the size of the generated PNG/SVG.
2. If an asset exceeds 145 KB (safety margin):
   - For PNG: Drops bit depth from 32-bit RGBA to optimized 8-bit paletted PNG via client-side png quantization or reduces scale from 288x288 to 144x144.
   - For SVG: Runs vector simplification (SVGO browser-build) to prune decimal precision and metadata.
3. Guarantees 100% upload success in Logi Options+ without manual user troubleshooting.
