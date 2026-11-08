import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  title: ReactNode;
  /** Short body: the item being acted on and one line on what happens. */
  children?: ReactNode;
  confirmLabel: string;
  /** Shown on the confirm button with a spinner while `busy`. */
  busyLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small centred confirm box (same look as the quiz "is ready" prompt).
 * Rendered into <body> so the dimmed backdrop covers the whole page, sidebar included.
 * Deliberately NOT dismissed by a backdrop click or Escape: only the Cancel button closes it.
 */
export default function ConfirmDialog({
  title, children, confirmLabel, busyLabel, cancelLabel = 'Cancel', tone = 'primary', busy = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  useEffect(() => {
    const html = document.documentElement;
    const prev = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => { html.style.overflow = prev.html; document.body.style.overflow = prev.body; };
  }, []);

  return createPortal(
    <div className="cd-overlay">
      <div className="cd-box" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h5 id={titleId}>{title}</h5>
        {children && <div className="cd-body">{children}</div>}
        <div className="cd-actions">
          {/* Safer default focus for destructive actions */}
          <button type="button" className="cd-btn cd-btn--ghost" onClick={onCancel} disabled={busy} autoFocus={tone === 'danger'}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`cd-btn cd-btn--${tone}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus={tone !== 'danger'}
          >
            {busy ? <><Loader2 className="cd-spin" size={15} aria-hidden /> {busyLabel ?? confirmLabel}</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
