import { useLayoutEffect } from 'react';

let locks = 0;
let saved: { htmlOverflow: string; bodyOverflow: string; bodyPaddingRight: string } | null = null;

/**
 * Stops the page behind a dialog from scrolling while it is open. Nested dialogs share one lock;
 * the scrollbar's width is padded back so the page doesn't shift sideways.
 */
export function useBodyScrollLock(active = true) {
  useLayoutEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    if (locks++ === 0) {
      const scrollbar = window.innerWidth - html.clientWidth;
      saved = { htmlOverflow: html.style.overflow, bodyOverflow: body.style.overflow, bodyPaddingRight: body.style.paddingRight };
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    return () => {
      if (--locks === 0 && saved) {
        html.style.overflow = saved.htmlOverflow;
        body.style.overflow = saved.bodyOverflow;
        body.style.paddingRight = saved.bodyPaddingRight;
        saved = null;
      }
    };
  }, [active]);
}
