/**
 * Adds a show/hide "eye" button inside a password box made outside React, such as the input of a
 * SweetAlert pop-up (Swal.getInput() in its didOpen).
 *
 * The box itself is never moved or wrapped: SweetAlert reads the typed value from the box that sits
 * directly inside its pop-up, so a wrapped box reads as empty ("Access code is required"). The button
 * is laid over the box's right end instead and follows it when the pop-up's layout changes.
 */

const EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';

const BTN = 36;

export function addPasswordEye(input: HTMLInputElement | null, what = 'code') {
  const host = input?.parentElement;
  if (!input || !host || input.dataset.eye) return;
  input.dataset.eye = '1';
  input.style.paddingRight = '46px';
  // The button is placed against the box's position inside its parent
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = `position:absolute;width:${BTN}px;height:${BTN}px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:#64748b;cursor:pointer;border-radius:6px;padding:0;margin:0;z-index:1;`;

  const place = () => {
    // offsetTop/Left are relative to the positioned parent (the pop-up)
    btn.style.top = `${input.offsetTop + (input.offsetHeight - BTN) / 2}px`;
    btn.style.left = `${input.offsetLeft + input.offsetWidth - BTN - 6}px`;
    btn.style.display = input.offsetParent ? 'flex' : 'none';
  };
  const render = () => {
    const shown = input.type === 'text';
    btn.innerHTML = shown ? EYE_OFF : EYE;
    btn.setAttribute('aria-label', shown ? `Hide ${what}` : `Show ${what}`);
    btn.setAttribute('aria-pressed', String(shown));
    btn.title = shown ? `Hide ${what}` : `Show ${what}`;
  };

  // Keep focus (and the phone keyboard) in the box while toggling
  btn.addEventListener('mousedown', e => e.preventDefault());
  btn.addEventListener('click', () => {
    const end = input.value.length;
    input.type = input.type === 'password' ? 'text' : 'password';
    render();
    input.focus();
    try { input.setSelectionRange(end, end); } catch { /* not supported for this type */ }
  });

  render();
  input.insertAdjacentElement('afterend', btn);
  place();

  // The pop-up's layout can change (a validation message, the window resizing, a phone rotating)
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
  ro?.observe(host);
  ro?.observe(input);
  window.addEventListener('resize', place);
  // Stop following once the pop-up has gone
  const gone = new MutationObserver(() => {
    if (!btn.isConnected) { ro?.disconnect(); window.removeEventListener('resize', place); gone.disconnect(); }
  });
  gone.observe(document.body, { childList: true, subtree: true });
}
