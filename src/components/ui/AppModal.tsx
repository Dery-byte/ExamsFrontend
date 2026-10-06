import { useEffect, useId, useRef, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './AppModal.css';

/* ─── page scroll lock ──────────────────────────────────────────────
   Locks <html> as well as <body>: html/body both set overflow-x in index.css, so the
   viewport scrolls on <html> and locking <body> alone would leave the page scrollable.
   Ref-counted so stacked modals don't unlock each other. */
let lockCount = 0;
let saved: { html: string; body: string; paddingRight: string } | null = null;

function lockPageScroll() {
  if (lockCount++ > 0) return;
  const html = document.documentElement;
  const body = document.body;
  const scrollbar = window.innerWidth - html.clientWidth;
  saved = { html: html.style.overflow, body: body.style.overflow, paddingRight: body.style.paddingRight };
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  // Keep content from shifting sideways when the desktop scrollbar disappears.
  if (scrollbar > 0) body.style.paddingRight = `${(parseFloat(getComputedStyle(body).paddingRight) || 0) + scrollbar}px`;
}

function unlockPageScroll() {
  if (--lockCount > 0 || !saved) return;
  document.documentElement.style.overflow = saved.html;
  document.body.style.overflow = saved.body;
  document.body.style.paddingRight = saved.paddingRight;
  saved = null;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface AppModalProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small chip under the subtitle, e.g. course code and quiz title. */
  meta?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Footer content; defaults to a single Close button. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Accessible modal dialog rendered into <body>, so it always covers the full viewport
 * (page wrappers with transforms would otherwise trap position: fixed).
 * Handles scroll lock, Escape, backdrop click, focus trap and focus restore.
 * Becomes a bottom sheet on phones.
 */
export default function AppModal({ title, subtitle, meta, onClose, children, footer, size = 'md' }: AppModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockPageScroll();
    closeBtnRef.current?.focus({ preventScroll: true });
    return () => {
      unlockPageScroll();
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, []);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="am-overlay"
      // Close only when the press both starts and ends on the backdrop, so a text drag that ends outside doesn't dismiss.
      onMouseDown={e => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={e => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div
        ref={dialogRef}
        className={`am-dialog am-dialog-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="am-header">
          <div className="am-header-text">
            <h2 id={titleId} className="am-title">{title}</h2>
            {subtitle && <p id={descId} className="am-subtitle">{subtitle}</p>}
            {meta && <div className="am-meta">{meta}</div>}
          </div>
          <button ref={closeBtnRef} type="button" onClick={onClose} className="am-icon-btn" aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="am-body">{children}</div>

        <footer className="am-footer">
          {footer ?? <button type="button" onClick={onClose} className="btn-lexa btn-lexa-primary">Close</button>}
        </footer>
      </div>
    </div>,
    document.body
  );
}

/* ─── shared body states ────────────────────────────────────────── */
export function ModalState({ icon, title, children, tone = 'muted', action }: {
  icon: ReactNode; title?: ReactNode; children?: ReactNode; tone?: 'muted' | 'error' | 'loading'; action?: ReactNode;
}) {
  return (
    <div
      className="am-state"
      role={tone === 'error' ? 'alert' : tone === 'loading' ? 'status' : undefined}
      aria-live={tone === 'loading' ? 'polite' : undefined}
    >
      <div className={`am-state-icon am-state-icon-${tone}`} aria-hidden="true">{icon}</div>
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
