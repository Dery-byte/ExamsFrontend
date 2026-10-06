import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Student-side dialog: rendered on <body> (the page wrapper's fade-in animation leaves a transform
 * that would otherwise trap a fixed overlay inside the content area), covers the whole screen,
 * stays centred, locks the page behind it and keeps keyboard focus inside.
 */
export default function FeeDialog({ title, subtitle, onClose, busy, wide, footer, children }: {
  title: string; subtitle?: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean;
  footer: ReactNode; children: ReactNode;
}) {
  useBodyScrollLock();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    // Start on the first control that isn't the close button
    const first = Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).find(el => !el.classList.contains('sf-x'));
    (first ?? dialog)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); before?.focus?.(); };
  }, []);

  return createPortal(
    <div className="sf-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busyRef.current) onClose(); }}>
      <div ref={ref} className={`sf-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="sf-modal-head">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="sf-x" onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="sf-modal-body">{children}</div>
        <div className="sf-modal-foot">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}
