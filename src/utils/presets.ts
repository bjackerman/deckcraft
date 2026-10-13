import type { IconStyle, StylePreset } from '@/types';
import { DEFAULT_STYLE } from './constants';
import { mergeStyle } from './style';

function preset(id: string, name: string, o: Parameters<typeof mergeStyle>[1]): StylePreset {
  return { id, name, builtin: true, style: mergeStyle(structuredClone(DEFAULT_STYLE) as IconStyle, o) };
}

export const FACTORY_PRESETS: StylePreset[] = [
  preset('obsidian-slate', 'Obsidian Slate', {}),
  preset('logitech-pale-grey', 'Logitech Pale Grey', {
    background: { type: 'linear-gradient', primaryColor: '#e5e7eb', secondaryColor: '#b8bcc4', shape: 'rounded', borderRadius: 20, borderWidth: 2, borderColor: '#9ca3af' },
    glyph: { tintColor: '#1f2937', dropShadowBlur: 0 },
  }),
  preset('cyberpunk-neon', 'Cyberpunk Neon', {
    background: { type: 'linear-gradient', primaryColor: '#1a0b3d', secondaryColor: '#0b1a3d', gradientAngle: 160, borderWidth: 4, borderColor: '#f0abfc', shadowBlur: 10, shadowColor: '#d946ef' },
    glyph: { mode: 'dual-tone', tintColor: '#22d3ee', secondaryTintColor: '#f472b6', dropShadowBlur: 12, dropShadowColor: '#22d3eeaa' },
  }),
  preset('pastel-studio', 'Pastel Studio', {
    background: { type: 'linear-gradient', primaryColor: '#fbcfe8', secondaryColor: '#c7d2fe', shape: 'squircle' },
    glyph: { tintColor: '#4c1d95', dropShadowBlur: 0 },
  }),
  preset('retro-terminal', 'Retro Terminal Green', {
    background: { type: 'solid', primaryColor: '#020a02', shape: 'square', borderWidth: 4, borderColor: '#22c55e' },
    glyph: { tintColor: '#4ade80', dropShadowBlur: 10, dropShadowColor: '#22c55e' },
  }),
  preset('minimalist-white', 'Minimalist White', {
    background: { type: 'solid', primaryColor: '#ffffff', shape: 'rounded', borderRadius: 18, borderWidth: 2, borderColor: '#e2e8f0' },
    glyph: { tintColor: '#0f172a', dropShadowBlur: 0 },
  }),
  preset('sunset-amber', 'Sunset Amber', {
    background: { type: 'linear-gradient', primaryColor: '#f59e0b', secondaryColor: '#be123c', gradientAngle: 150 },
    glyph: { tintColor: '#fff7ed' },
  }),
  preset('ocean-glass', 'Ocean Glass', {
    background: { type: 'glass', primaryColor: '#0ea5e9', shape: 'squircle' },
    glyph: { tintColor: '#f0f9ff' },
  }),
  preset('streamer-red', 'Streamer Red', {
    background: { type: 'radial-gradient', primaryColor: '#ef4444', secondaryColor: '#7f1d1d', shape: 'circle' },
    glyph: { tintColor: '#ffffff', scale: 0.5 },
  }),
  preset('hex-forest', 'Hex Forest', {
    background: { type: 'linear-gradient', primaryColor: '#166534', secondaryColor: '#052e16', shape: 'hexagon' },
    glyph: { tintColor: '#dcfce7', scale: 0.5 },
  }),
];
