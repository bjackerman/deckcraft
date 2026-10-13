/** Lightweight SVG optimizer (comment/metadata stripping and numeric precision reduction). */
export function optimizeSvg(svg: string, precision = 2): string {
  const round = (m: string) => {
    const n = Number(m);
    return Number.isFinite(n) ? String(Number(n.toFixed(precision))) : m;
  };
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    .replace(/-?\d*\.\d{3,}/g, round)
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
