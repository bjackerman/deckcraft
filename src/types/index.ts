export type HardwareProfileId =
  | 'logitech-mx-keypad'
  | 'stream-deck-mini'
  | 'stream-deck-mk2'
  | 'stream-deck-xl'
  | 'stream-deck-plus'
  | 'loupedeck-live'
  | 'custom-grid';

export type ShapeGeometry = 'square' | 'rounded' | 'squircle' | 'circle' | 'hexagon';

export type BackgroundType = 'solid' | 'linear-gradient' | 'radial-gradient' | 'glass' | 'transparent';

export interface BackgroundStyle {
  type: BackgroundType;
  primaryColor: string;
  secondaryColor?: string;
  gradientAngle: number;
  shape: ShapeGeometry;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  shadowBlur: number;
  shadowColor: string;
}

export interface GlyphStyle {
  mode: 'monochrome' | 'dual-tone' | 'original';
  tintColor: string;
  secondaryTintColor?: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  dropShadowBlur: number;
  dropShadowColor: string;
  /** Diagonal strike-through slash used by toggle pairs. */
  slash?: boolean;
}

export interface BadgeStyle {
  enabled: boolean;
  text?: string;
  textColor: string;
  backgroundColor: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center-bottom';
  fontSize: number;
  /** Status dot color; when set a corner pip is drawn. */
  pipColor?: string;
}

export interface IconStyle {
  background: BackgroundStyle;
  glyph: GlyphStyle;
  badge: BadgeStyle;
}

export interface IconStyleOverride {
  background?: Partial<BackgroundStyle>;
  glyph?: Partial<GlyphStyle>;
  badge?: Partial<BadgeStyle>;
}

export interface IconItem {
  id: string;
  name: string;
  sourceType: 'svg' | 'raster';
  rawPayload: string;
  customStyle?: IconStyleOverride;
  isLocked: boolean;
  /** Frozen full style captured when the icon is locked; ignores master updates. */
  lockedStyle?: IconStyle;
  statePairId?: string;
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

export interface HardwareProfile {
  id: HardwareProfileId;
  label: string;
  rows: number;
  cols: number;
}

export interface StylePreset {
  id: string;
  name: string;
  style: IconStyle;
  builtin?: boolean;
}

export type ExportTarget = 'logitech' | 'elgato' | 'loupedeck' | 'universal';

export interface RenderItem {
  id: string;
  name: string;
  toggleState?: 'primary' | 'secondary';
  style: IconStyle;
  /** Pre-tinted raster of the glyph (SVG/raster sources are rasterized on the main thread). */
  glyph: ImageBitmap | null;
  /** Tinted SVG markup for vector sources, used for SVG export. */
  glyphSvg: string | null;
}

export type WorkerRequest =
  | { kind: 'render'; requestId: number; size: number; items: RenderItem[] }
  | {
      kind: 'export';
      requestId: number;
      target: ExportTarget;
      customSize: number;
      pattern: string;
      bundle: string;
      items: RenderItem[];
    };

export interface RenderedAsset {
  id: string;
  blob: Blob;
}

export interface AuditEntry {
  file: string;
  bytes: number;
  ok: boolean;
  quantized: boolean;
}

export type WorkerResponse =
  | { kind: 'render'; requestId: number; assets: { id: string; bitmap: ImageBitmap }[] }
  | { kind: 'export'; requestId: number; zip: Uint8Array; audit: AuditEntry[] }
  | { kind: 'error'; requestId: number; message: string };
