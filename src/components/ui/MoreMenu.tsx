import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import './MoreMenu.css';

export interface MoreMenuItem {
  icon: ReactNode;
  label: string;
  /** Hover text, e.g. why an action is locked. */
  hint?: string;
  /** Red, after a divider (delete and the like). */
  danger?: boolean;
  /** Greyed (still chosen, so it can explain itself). */
  muted?: boolean;
  onSelect: () => void;
}

/**
 * "⋯" button with a small action menu, shared by the staff list cards.
 * Keyboard: arrows move, Enter chooses, Esc closes; closes on an outside click; opens upwards
 * near the bottom of the screen. `onOpenChange` lets the card lift itself above its neighbours.
 */
export default function MoreMenu({ label, items, onOpenChange }: {
  label: string; items: MoreMenuItem[]; onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpenState] = useState(false);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const setOpen = (v: boolean) => { setOpenState(v); onOpenChange?.(v); };

  useEffect(() => {
    if (!open) return;
    const r = btn.current?.getBoundingClientRect();
    setUp(!!r && window.innerHeight - r.bottom < 40 + items.length * 42);
    wrap.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const list = Array.from(wrap.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
  };

  return (
    <div className="mm" ref={wrap}>
      <button ref={btn} type="button" className="mm-btn" onClick={() => setOpen(!open)}
        aria-haspopup="menu" aria-expanded={open} aria-label={label} title="More actions">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className={`mm-menu${up ? ' up' : ''}`} role="menu" onKeyDown={onMenuKey}>
          {items.map(it => (
            <button key={it.label} type="button" role="menuitem" title={it.hint}
              className={`mm-item${it.danger ? ' danger' : ''}${it.muted ? ' muted' : ''}`}
              onClick={() => { setOpen(false); it.onSelect(); }}>
              {it.icon}<span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
