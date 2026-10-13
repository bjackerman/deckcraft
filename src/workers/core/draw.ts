import type { IconStyle } from '@/types';
import { gradientEndpoints } from '@/utils/color';
import { badgeAnchor, glyphBox, pipGeometry, pxScale, slashLine } from '@/utils/layout';
import { shapePath } from '@/utils/squircle';

type Ctx = OffscreenCanvasRenderingContext2D;

function backgroundInset(style: IconStyle['background'], size: number): number {
  const k = pxScale(size);
  return (style.borderWidth * k) / 2 + style.shadowBlur * k * 0.6;
}

function drawBackground(ctx: Ctx, size: number, bg: IconStyle['background']): Path2D | null {
  if (bg.type === 'transparent') return null;
  const k = pxScale(size);
  const path = new Path2D(shapePath(bg.shape, size, bg.borderRadius, backgroundInset(bg, size)));
  const second = bg.secondaryColor ?? bg.primaryColor;

  ctx.save();
  if (bg.shadowBlur > 0) {
    ctx.shadowColor = bg.shadowColor;
    ctx.shadowBlur = bg.shadowBlur * k;
  }
  if (bg.type === 'linear-gradient') {
    const e = gradientEndpoints(size, bg.gradientAngle);
    const g = ctx.createLinearGradient(e.x0, e.y0, e.x1, e.y1);
    g.addColorStop(0, bg.primaryColor);
    g.addColorStop(1, second);
    ctx.fillStyle = g;
  } else if (bg.type === 'radial-gradient') {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
    g.addColorStop(0, bg.primaryColor);
    g.addColorStop(1, second);
    ctx.fillStyle = g;
  } else if (bg.type === 'glass') {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = bg.primaryColor;
  } else {
    ctx.fillStyle = bg.primaryColor;
  }
  ctx.fill(path);
  ctx.restore();

  if (bg.type === 'glass') {
    ctx.save();
    ctx.clip(path);
    const gloss = ctx.createLinearGradient(0, 0, 0, size * 0.6);
    gloss.addColorStop(0, 'rgba(255,255,255,0.28)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
    ctx.lineWidth = 2 * k;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke(path);
  }
  if (bg.borderWidth > 0) {
    ctx.lineWidth = bg.borderWidth * k;
    ctx.strokeStyle = bg.borderColor;
    ctx.stroke(path);
  }
  return path;
}

function drawGlyph(ctx: Ctx, size: number, style: IconStyle, glyph: ImageBitmap): void {
  const g = style.glyph;
  const { cx, cy, box, rotation } = glyphBox(size, g);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  if (g.dropShadowBlur > 0) {
    ctx.shadowColor = g.dropShadowColor;
    ctx.shadowBlur = g.dropShadowBlur * pxScale(size);
    ctx.shadowOffsetY = 2 * pxScale(size);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(glyph, -box / 2, -box / 2, box, box);
  ctx.restore();
}

function drawSlash(ctx: Ctx, size: number, color: string): void {
  const s = slashLine(size);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(2,6,23,0.85)';
  ctx.lineWidth = s.width * 1.9;
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(s.x1, s.y1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = s.width;
  ctx.stroke();
  ctx.restore();
}

function drawBadge(ctx: Ctx, size: number, b: IconStyle['badge']): void {
  const k = pxScale(size);
  if (b.pipColor) {
    const p = pipGeometry(size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = b.pipColor;
    ctx.fill();
    ctx.lineWidth = 3 * k;
    ctx.strokeStyle = 'rgba(2,6,23,0.9)';
    ctx.stroke();
    ctx.restore();
  }
  if (!b.text) return;
  const a = badgeAnchor(b.position, size);
  const fs = b.fontSize * k;
  ctx.save();
  ctx.font = `700 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const tw = ctx.measureText(b.text).width;
  const padX = fs * 0.4, padY = fs * 0.25;
  const w = tw + padX * 2, h = fs + padY * 2;
  const x = a.align === 'left' ? a.x : a.align === 'right' ? a.x - w : a.x - w / 2;
  const y = a.y < size / 2 ? a.y : a.y - h;
  ctx.fillStyle = b.backgroundColor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2.4);
  ctx.fill();
  ctx.fillStyle = b.textColor;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(b.text, x + padX, y + h / 2 + fs * 0.03);
  ctx.restore();
}

/** Renders one icon (background → glyph → overlay) onto a size×size context. */
export function drawIcon(ctx: Ctx, size: number, style: IconStyle, glyph: ImageBitmap | null): void {
  ctx.clearRect(0, 0, size, size);
  const path = drawBackground(ctx, size, style.background);
  ctx.save();
  if (path) ctx.clip(path);
  if (glyph) drawGlyph(ctx, size, style, glyph);
  if (style.glyph.slash) drawSlash(ctx, size, style.glyph.tintColor);
  ctx.restore();
  if (style.badge.enabled) drawBadge(ctx, size, style.badge);
}
