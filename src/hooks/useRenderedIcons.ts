import { useEffect, useRef, useState } from 'react';
import type { DeckProject } from '@/types';
import { renderIcons } from '@/utils/renderClient';
import { useUIStore } from '@/store/uiStore';

/** Renders all icons in the render worker; owns and closes the resulting ImageBitmaps (no leaks). */
export function useRenderedIcons(project: DeckProject, size: number): Map<string, ImageBitmap> {
  const [bitmaps, setBitmaps] = useState<Map<string, ImageBitmap>>(new Map());
  const live = useRef<Map<string, ImageBitmap>>(new Map());
  const token = useRef(0);

  useEffect(() => {
    const mine = ++token.current;
    renderIcons(project, size)
      .then((next) => {
        if (mine !== token.current) {
          next.forEach((b) => b.close());
          return;
        }
        live.current.forEach((b) => b.close());
        live.current = next;
        setBitmaps(next);
      })
      .catch((e: unknown) => useUIStore.getState().toast('error', `Render failed: ${String(e)}`));
  }, [project, size]);

  useEffect(
    () => () => {
      token.current++;
      live.current.forEach((b) => b.close());
      live.current = new Map();
    },
    [],
  );
  return bitmaps;
}
