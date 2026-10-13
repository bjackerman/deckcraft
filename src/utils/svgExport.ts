import type { IconStyle } from '@/types';
import { gradientEndpoints } from '@/utils/color';
import { badgeAnchor, glyphBox, pipGeometry, slashLine } from '@/utils/layout';
import { shapePath } from '@/utils/squircle';
import { optimizeSvg } from '@/utils/svgo';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

export interface SvgGlyph {
  /** Normalized/tinted SVG markup for vector sources. */
  svg?: string | null;
  /** PNG data URI for raster sources. */
  pngDataUri?: string | null;
}

/** Builds a self-contained vector rendition of an icon (mirrors the raster pipeline). */
export function buildIconSvg(style: IconStyle, glyph: SvgGlyph, size = 288): string {
  const bg = style.background;
  const k = size / 288;
  const inset = (bg.borderWidth * k) / 2 + bg.shadowBlur * k * 0.6;
  const d = shapePath(bg.shape, size, bg.borderRadius, inset);
  const second = bg.secondaryColor ?? bg.primaryColor;
  const defs: string[] = [];
  let fill = bg.primaryColor;
  let fillOpacity = 1;

  if (bg.type === 'linear-gradient') {
    const e = gradientEndpoints(size, bg.gradientAngle);
    defs.push(
      `<linearGradient id="dc-bg" gradientUnits="userSpaceOnUse" x1="${e.x0.toFixed(2)}" y1="${e.y0.toFixed(2)}" x2="${e.x1.toFixed(2)}" y2="${e.y1.toFixed(2)}"><stop offset="0" stop-color="${bg.primaryColor}"/><stop offset="1" stop-color="${second}"/></linearGradient>`,
    );
    fill = 'url(#dc-bg)';
  } else if (bg.type === 'radial-gradient') {
    defs.push(
      `<radialGradient id="dc-bg" gradientUnits="userSpaceOnUse" cx="${size / 2}" cy="${size / 2}" r="${size * 0.7}"><stop offset="0" stop-color="${bg.primaryColor}"/><stop offset="1" stop-color="${second}"/></radialGradient>`,
    );
    fill = 'url(#dc-bg)';
  } else if (bg.type === 'glass') {
    fillOpacity = 0.55;
  }
  if (bg.shadowBlur > 0 && bg.type !== 'transparent') {
    defs.push(
      `<filter id="dc-bgshadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="${(bg.shadowBlur * k) / 2}" flood-color="${bg.shadowColor}"/></filter>`,
    );
  }
  const g = style.glyph;
  if (g.dropShadowBlur > 0) {
    defs.push(
      `<filter id="dc-gshadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="${2 * k}" stdDeviation="${(g.dropShadowBlur * k) / 2}" flood-color="${g.dropShadowColor}"/></filter>`,
    );
  }
  defs.push(`<clipPath id="dc-clip"><path d="${d}"/></clipPath>`);

  const body: string[] = [];
  if (bg.type !== 'transparent') {
    const filter = bg.shadowBlur > 0 ? ' filter="url(#dc-bgshadow)"' : '';
    body.push(`<path d="${d}" fill="${fill}" fill-opacity="${fillOpacity}"${filter}/>`);
    if (bg.type === 'glass') {
      defs.push(
        '<linearGradient id="dc-gloss" x1="0" y1="0" x2="0" y2="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>',
      );
      body.push(`<path d="${d}" fill="url(#dc-gloss)"/>`);
      body.push(`<path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="${2 * k}"/>`);
    }
    if (bg.borderWidth > 0) {
      body.push(`<path d="${d}" fill="none" stroke="${bg.borderColor}" stroke-width="${bg.borderWidth * k}"/>`);
    }
  }

  const inner: string[] = [];
  const box = glyphBox(size, g);
  const x = box.cx - box.box / 2, y = box.cy - box.box / 2;
  const shadow = g.dropShadowBlur > 0 ? ' filter="url(#dc-gshadow)"' : '';
  const rot = box.rotation ? ` transform="rotate(${box.rotation} ${box.cx.toFixed(2)} ${box.cy.toFixed(2)})"` : '';
  if (glyph.svg) {
    const placed = glyph.svg
      .replace(/^<\?xml[^>]*\?>\s*/, '')
      .replace(/<svg\b/, `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${box.box.toFixed(2)}" height="${box.box.toFixed(2)}"`);
    inner.push(`<g${rot}${shadow}>${placed}</g>`);
  } else if (glyph.pngDataUri) {
    inner.push(
      `<g${rot}${shadow}><image x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${box.box.toFixed(2)}" height="${box.box.toFixed(2)}" href="${glyph.pngDataUri}"/></g>`,
    );
  }
  if (g.slash) {
    const s = slashLine(size);
    const line = (w: number, c: string) =>
      `<line x1="${s.x0}" y1="${s.y0}" x2="${s.x1}" y2="${s.y1}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    inner.push(line(s.width * 1.9, 'rgba(2,6,23,0.85)'), line(s.width, g.tintColor));
  }
  body.push(bg.type === 'transparent' ? inner.join('') : `<g clip-path="url(#dc-clip)">${inner.join('')}</g>`);

  const b = style.badge;
  if (b.enabled) {
    if (b.pipColor) {
      const p = pipGeometry(size);
      body.push(`<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${b.pipColor}" stroke="rgba(2,6,23,0.9)" stroke-width="${3 * k}"/>`);
    }
    if (b.text) {
      const a = badgeAnchor(b.position, size);
      const fs = b.fontSize * k;
      const w = b.text.length * fs * 0.62 + fs * 0.8;
      const h = fs * 1.5;
      const bx = a.align === 'left' ? a.x : a.align === 'right' ? a.x - w : a.x - w / 2;
      const by = a.y < size / 2 ? a.y : a.y - h;
      body.push(
        `<rect x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${(h / 2.4).toFixed(2)}" fill="${b.backgroundColor}"/>`,
        `<text x="${(bx + w / 2).toFixed(2)}" y="${(by + h / 2).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,Segoe UI,sans-serif" font-weight="700" font-size="${fs}" fill="${b.textColor}">${esc(b.text)}</text>`,
      );
    }
  }

  return optimizeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs>${defs.join('')}</defs>${body.join('')}</svg>`,
  );
}
