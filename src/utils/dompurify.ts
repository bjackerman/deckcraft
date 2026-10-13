import DOMPurify from 'dompurify';

const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;
const EXTERNAL_URL_IN_STYLE = /url\(\s*['"]?\s*(?!#)/i;

let hooked = false;

function installHooks(): void {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    for (const attr of ['href', 'xlink:href']) {
      const v = node.getAttribute?.(attr);
      if (v != null && !v.startsWith('#') && !SAFE_DATA_IMAGE.test(v)) node.removeAttribute(attr);
    }
    const style = node.getAttribute?.('style');
    if (style && EXTERNAL_URL_IN_STYLE.test(style)) node.removeAttribute('style');
    for (const attr of ['fill', 'stroke', 'filter', 'mask', 'clip-path']) {
      const v = node.getAttribute?.(attr);
      if (v && /url\(\s*['"]?\s*(?!#)/i.test(v)) node.removeAttribute(attr);
    }
  });
}

/** Sanitizes untrusted SVG markup: no scripts, event handlers, foreignObject or external references. */
export function sanitizeSvg(svg: string): string {
  installHooks();
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'style', 'iframe', 'object', 'embed', 'animate', 'set'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick'],
  });
}
