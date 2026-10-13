import type { HardwareProfile, HardwareProfileId, IconStyle, DeckProject } from '@/types';

export const HARDWARE_PROFILES: Record<HardwareProfileId, HardwareProfile> = {
  'logitech-mx-keypad': { id: 'logitech-mx-keypad', label: 'Logitech MX Creative Keypad', rows: 3, cols: 3 },
  'stream-deck-mini': { id: 'stream-deck-mini', label: 'Stream Deck Mini', rows: 2, cols: 3 },
  'stream-deck-mk2': { id: 'stream-deck-mk2', label: 'Stream Deck MK.2', rows: 3, cols: 5 },
  'stream-deck-xl': { id: 'stream-deck-xl', label: 'Stream Deck XL', rows: 4, cols: 8 },
  'stream-deck-plus': { id: 'stream-deck-plus', label: 'Stream Deck +', rows: 2, cols: 4 },
  'loupedeck-live': { id: 'loupedeck-live', label: 'Loupedeck Live', rows: 3, cols: 4 },
  'custom-grid': { id: 'custom-grid', label: 'Custom grid', rows: 4, cols: 4 },
};

export const LOGITECH_MAX_BYTES = 150 * 1024;
/** Safety margin below the hard 150 KB Logi Options+ limit. */
export const LOGITECH_SAFE_BYTES = 145 * 1024;
export const RENDER_REFERENCE_SIZE = 288;

export const DEFAULT_STYLE: IconStyle = {
  background: {
    type: 'linear-gradient',
    primaryColor: '#1e293b',
    secondaryColor: '#0f172a',
    gradientAngle: 135,
    shape: 'squircle',
    borderRadius: 22,
    borderWidth: 0,
    borderColor: '#334155',
    shadowBlur: 0,
    shadowColor: '#000000',
  },
  glyph: {
    mode: 'monochrome',
    tintColor: '#f8fafc',
    secondaryTintColor: '#38bdf8',
    scale: 0.58,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    dropShadowBlur: 6,
    dropShadowColor: '#00000099',
  },
  badge: {
    enabled: false,
    text: '',
    textColor: '#f8fafc',
    backgroundColor: '#00000099',
    position: 'center-bottom',
    fontSize: 30,
  },
};

export function createProject(hardwareProfile: HardwareProfileId = 'logitech-mx-keypad'): DeckProject {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: 'Untitled deck',
    createdAt: now,
    updatedAt: now,
    hardwareProfile,
    masterStyle: structuredClone(DEFAULT_STYLE),
    icons: [],
  };
}
