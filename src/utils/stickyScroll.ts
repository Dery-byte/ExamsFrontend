/**
 * Helpers for scrolling the exam page on phones, where a sticky header (and progress card) sit over
 * the top of the page and the on-screen keyboard over the bottom.
 */

/** Marks a sticky or fixed bar at the top of the page that content must not be scrolled under. */
export const STICKY_COVER_ATTR = 'data-sticky-cover';

/** How far down the visible screen the sticky bars reach (0 when none are showing). */
export const stickyCoverBottom = (): number => {
  let bottom = 0;
  document.querySelectorAll<HTMLElement>(`[${STICKY_COVER_ATTR}]`).forEach(el => {
    const style = getComputedStyle(el);
    if (style.display === 'none' || (style.position !== 'sticky' && style.position !== 'fixed')) return;
    const r = el.getBoundingClientRect();
    // Only bars actually pinned near the top (a sticky bar further down the page covers nothing yet)
    if (r.height > 0 && r.top <= 4) bottom = Math.max(bottom, r.bottom);
  });
  return bottom;
};

/** The element that scrolls `el` into view: the nearest scrolling ancestor, or the page itself. */
export const scrollerFor = (el: Element | null): HTMLElement | null => {
  for (let p = el?.parentElement ?? null; p && p !== document.body; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;   // the window
};

/** Scrolls by `delta` pixels whatever is scrolling `el` (the window when nothing else is). */
export const scrollByFor = (el: Element, delta: number, behavior: ScrollBehavior = 'auto') => {
  if (!delta) return;
  const s = scrollerFor(el);
  if (s) s.scrollBy({ top: delta, behavior });
  else window.scrollBy({ top: delta, behavior });
};

/** Brings `el` to the top of the visible page, just below the sticky bars. */
export const scrollBelowSticky = (el: Element, behavior: ScrollBehavior = 'auto', gap = 12) => {
  const s = scrollerFor(el);
  // Inside a scrolling panel the sticky page bars don't cover it; measure from the panel's own top
  const top = s ? s.getBoundingClientRect().top : stickyCoverBottom();
  scrollByFor(el, el.getBoundingClientRect().top - top - gap, behavior);
};
