/**
 * Adds a show/hide "eye" button inside a password box made outside React, such as the input of a
 * SweetAlert pop-up (Swal.getInput() in its didOpen).
 */

const EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';

export function addPasswordEye(input: HTMLInputElement | null, what = 'code') {
  if (!input || input.dataset.eye || !input.parentNode) return;
  input.dataset.eye = '1';

  // The box keeps its own margins on the wrapper, so the pop-up's layout doesn't move
  const cs = getComputedStyle(input);
  const wrap = document.createElement('div');
  wrap.style.cssText = `position:relative;display:flex;align-items:center;margin:${cs.margin};max-width:100%;box-sizing:border-box;`;
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  input.style.margin = '0';
  input.style.width = '100%';
  input.style.boxSizing = 'border-box';
  input.style.paddingRight = '46px';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = 'position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:#64748b;cursor:pointer;border-radius:6px;padding:0;';
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
  wrap.appendChild(btn);
}
