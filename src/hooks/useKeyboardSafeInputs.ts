/**
 * useKeyboardSafeInputs.ts
 *
 * Phones and tablets: keeps the answer box being typed in visible between the sticky header and the
 * on-screen keyboard.
 *
 * Browsers normally scroll a focused box into view themselves, but on the exam page they often can't:
 *  - Android in full screen: the keyboard is drawn over the page and nothing moves
 *  - the last box on a page: there is nothing below it to scroll into, so it stays under the keyboard
 *  - iPhone: only the visible part of the screen moves, and the sticky header can end up over the box
 *
 * So while the keyboard is up, the page gets bottom room the height of the keyboard (the --kb-inset
 * CSS variable, used as padding by the exam page) and the box is scrolled into the space left.
 * Desktop computers (no touch screen) are left alone.
 */
import { useEffect } from 'react';
import { scrollByFor, stickyCoverBottom } from '../utils/stickyScroll';

const NOT_TYPED = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image', 'hidden']);

/** A field that opens the on-screen keyboard. */
export const isTextField = (t: EventTarget | null): t is HTMLElement =>
  t instanceof HTMLTextAreaElement ||
  (t instanceof HTMLInputElement && !NOT_TYPED.has(t.type)) ||
  (t instanceof HTMLElement && t.isContentEditable);

export const isTouchDevice = () => {
  try { return (navigator.maxTouchPoints ?? 0) > 0 || !!window.matchMedia?.('(pointer: coarse)').matches; } catch { return false; }
};

/** Space kept between the box and the keyboard or header. */
const GAP = 12;
/** The keyboard slides in over ~250-400 ms: look again while it settles. */
const SETTLE_CHECKS_MS = [60, 320, 650];

export function useKeyboardSafeInputs(enabled = true) {
  useEffect(() => {
    if (!enabled || !isTouchDevice()) return;
    const vv = window.visualViewport;
    const root = document.documentElement;

    // Chrome on Android: ask for the keyboard's size directly. It is then drawn over the page in
    // every mode (full screen included) and this hook makes the room, the same everywhere.
    const vk = (navigator as any).virtualKeyboard;
    const prevOverlay = vk ? !!vk.overlaysContent : false;
    if (vk) { try { vk.overlaysContent = true; } catch { /* not allowed here */ } }
    const usesVk = !!vk?.overlaysContent;

    /** Height of the part of the page the keyboard covers. */
    const keyboardHeight = (): number => {
      if (usesVk) return Math.max(0, Math.round(vk.boundingRect?.height || 0));
      if (!vv) return 0;
      // The visible area shrinks (and may scroll down) while the keyboard is up
      return Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
    };

    /** The visible band, in the same coordinates as getBoundingClientRect. */
    const visibleBand = (kb: number) => {
      const top = usesVk || !vv ? 0 : vv.offsetTop;
      const bottom = usesVk || !vv ? window.innerHeight - kb : vv.offsetTop + vv.height;
      return { top: Math.max(top, stickyCoverBottom()) + GAP, bottom: bottom - GAP };
    };

    let lastInset = -1;
    const apply = () => {
      const kb = keyboardHeight();
      // Ignore small changes (the address bar showing and hiding)
      const inset = kb > 80 ? kb : 0;
      if (inset !== lastInset) {
        root.style.setProperty('--kb-inset', `${inset}px`);
        lastInset = inset;
      }
      const el = document.activeElement;
      if (!inset || !isTextField(el)) return;

      const r = el.getBoundingClientRect();
      const band = visibleBand(kb);
      const room = band.bottom - band.top;
      if (room <= 0) return;
      if (r.height > room) {
        // Taller than the space (a theory box): show its top, where typing starts
        if (Math.abs(r.top - band.top) > 4) scrollByFor(el, r.top - band.top);
      } else if (r.bottom > band.bottom) {
        scrollByFor(el, r.bottom - band.bottom);
      } else if (r.top < band.top) {
        scrollByFor(el, r.top - band.top);
      }
    };

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    const onFocus = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      SETTLE_CHECKS_MS.forEach(ms => timers.push(setTimeout(schedule, ms)));
    };
    const onBlur = (e: FocusEvent) => {
      if (isTextField(e.target)) timers.push(setTimeout(schedule, 350));
    };

    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('focusout', onBlur, true);
    // Not on scroll: the student may scroll up to re-read the question while typing
    vv?.addEventListener('resize', schedule);
    if (usesVk) vk.addEventListener('geometrychange', schedule);
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('focusout', onBlur, true);
      vv?.removeEventListener('resize', schedule);
      if (usesVk) vk.removeEventListener('geometrychange', schedule);
      window.removeEventListener('resize', schedule);
      if (vk) { try { vk.overlaysContent = prevOverlay; } catch { /* ignore */ } }
      root.style.removeProperty('--kb-inset');
    };
  }, [enabled]);
}
