import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Dialog shell for the Fees pages: closes on Esc or a click outside, unless a save is running. */
export default function FeeModal({ title, subtitle, onClose, busy, narrow, footer, children }: {
  title: string; subtitle?: ReactNode; onClose: () => void; busy?: boolean; narrow?: boolean;
  footer: ReactNode; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Once per opening (parents pass inline handlers; re-running would steal focus while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busyRef.current) closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first field so keyboard users land inside the dialog
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.fe-close)')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fe-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={ref} className={`fe-modal${narrow ? ' narrow' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="fe-modal-head">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="fe-icon-btn fe-close" onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="fe-modal-body">{children}</div>
        <div className="fe-modal-foot">{footer}</div>
      </div>
    </div>
  );
}
