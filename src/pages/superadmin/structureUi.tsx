import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import type { SystemMode } from '../../utils/terms';

/**
 * Pieces shared by the Departments and Programmes pages (Sections and Classes in a school):
 * the dialog, the styles (pg-) and the ready-made names a school can pick from.
 */

/** Scrollable dialog on <body>: centred on larger screens, a bottom sheet on phones; Esc or a click outside closes it. */
export function StructureModal({ title, busy, onClose, footer, children }: {
  title: string; busy: boolean; onClose: () => void; footer: React.ReactNode; children: React.ReactNode;
}) {
  useBodyScrollLock();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return createPortal(
    <div className="pg-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="pg-modal" role="dialog" aria-modal="true" aria-labelledby="pg-modal-title">
        <div className="pg-modal-head">
          <h2 id="pg-modal-title">{title}</h2>
          <button type="button" className="pg-icon" onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="pg-modal-body">{children}</div>
        <div className="pg-modal-foot">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

export interface Pick { name: string; code: string; description?: string; years?: number; year?: number }

/** Sections a school of this kind usually has, in order, with their usual years (the Super Admin may add any other). */
export function sectionPicks(mode: SystemMode): Pick[] {
  const nursery = { name: 'Nursery', code: 'NUR', description: 'Nursery 1 and Nursery 2', years: 2 };
  const kg = { name: 'Kindergarten', code: 'KG', description: 'KG 1 and KG 2', years: 2 };
  const primary = { name: 'Primary School', code: 'PRI', description: 'Primary 1 to Primary 6', years: 6 };
  const jhs = { name: 'Junior High School', code: 'JHS', description: 'JHS 1 to JHS 3', years: 3 };
  const shs = { name: 'Senior High School', code: 'SHS', description: 'SHS 1 to SHS 3', years: 3 };
  switch (mode) {
    case 'BASIC': return [nursery, kg, primary, jhs];
    case 'SHS': return [shs];
    case 'ALL_SCHOOLS': return [nursery, kg, primary, jhs, shs];
    default: return [];
  }
}

/** How a section's classes are usually named: Primary School → "Primary" / "P", else its code. */
function classPrefix(section: { name: string; code: string }): { label: string; code: string } {
  const n = section.name.toLowerCase();
  if (/nursery/.test(n)) return { label: 'Nursery', code: 'N' };
  if (/kinder|\bkg\b/.test(n)) return { label: 'KG', code: 'KG' };
  if (/primary|\bpri\b/.test(n)) return { label: 'Primary', code: 'P' };
  if (/junior|\bjhs\b/.test(n)) return { label: 'JHS', code: 'JHS' };
  if (/senior|\bshs\b/.test(n)) return { label: 'SHS', code: 'SHS' };
  return { label: section.code, code: section.code };
}

/** One usual class per year of the section (Primary School, 6 years → Primary 1 … Primary 6). */
export function classPicks(section: { name: string; code: string; durationYears?: number | null } | undefined): Pick[] {
  if (!section || !section.durationYears) return [];
  const p = classPrefix(section);
  return Array.from({ length: section.durationYears }, (_, i) => ({ name: `${p.label} ${i + 1}`, code: `${p.code}${i + 1}`, year: i + 1 }));
}

/** "Year 2 of 6" (or "Year 2" when the section's length isn't set). */
export const yearOf = (year: number | null | undefined, years: number | null | undefined) =>
  year == null ? null : years ? `Year ${year} of ${years}` : `Year ${year}`;

export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const STRUCTURE_CSS = `
.pg { color: #fff; padding-bottom: 32px; container: pg / inline-size; }
.pg-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 22px; }
.pg-title { display: flex; align-items: center; gap: 12px; min-width: 0; }
.pg-logo { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; background: linear-gradient(135deg,#0ea5e9,#2563eb); display: flex; align-items: center; justify-content: center; }
.pg-logo.brand { background: linear-gradient(135deg,var(--accent),var(--brand)); }
.pg-h1 { margin: 0; font-size: 22px; font-weight: 700; }
.pg-sub { margin: 0; font-size: 12px; color: rgba(255,255,255,0.45); }

.pg-btn, .pg-ghost { height: 40px; padding: 0 18px; border-radius: 10px; font: inherit; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; white-space: nowrap; transition: transform .15s, box-shadow .15s, background .15s, opacity .15s; }
.pg-btn { background: linear-gradient(135deg,#0ea5e9,#2563eb); border: none; color: #fff; font-weight: 600; box-shadow: 0 4px 14px rgba(14,165,233,0.3); }
.pg-btn.brand { background: linear-gradient(135deg,var(--accent),var(--brand)); color: var(--brand-contrast); box-shadow: 0 4px 14px rgba(var(--accent-rgb), 0.35); }
.pg-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(14,165,233,0.4); }
.pg-btn.sm, .pg-ghost.sm { height: 34px; padding: 0 12px; font-size: 13px; border-radius: 9px; }
.pg-ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-weight: 500; }
.pg-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.pg-btn:disabled, .pg-ghost:disabled { opacity: .6; cursor: not-allowed; }
.pg-btn:focus-visible, .pg-ghost:focus-visible, .pg-icon:focus-visible, .pg-seg button:focus-visible, .pg-stepper button:focus-visible, .pg-pick:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }

.pg-hint { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 20px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.08); border: 1px solid rgba(var(--accent-rgb), 0.22); font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.75); }
.pg-hint svg { flex-shrink: 0; margin-top: 2px; color: var(--accent-light); }

.pg-stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.pg-stat { background: rgba(255,255,255,0.04); border: 1px solid; border-radius: 10px; padding: 10px 18px; display: flex; align-items: center; gap: 10px; }
.pg-stat-n { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
.pg-stat-l { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500; }

.pg-filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.pg-input { width: 100%; height: 42px; padding: 0 14px; border-radius: 9px; background: rgba(255,255,255,0.05); border: 1px solid rgba(var(--accent-rgb), 0.25); color: #fff; font: inherit; font-size: 14px; outline: none; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
textarea.pg-input { height: auto; min-height: 80px; padding: 10px 14px; resize: vertical; line-height: 1.5; }
.pg-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.2); }
.pg-input::placeholder { color: rgba(255,255,255,0.3); }
.pg-input option { background: #1a1a35; color: #fff; }
.pg-dept { width: auto; min-width: 220px; max-width: 100%; }
.pg-seg { display: flex; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; overflow: hidden; }
.pg-seg button { padding: 0 16px; height: 40px; border: none; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; background: transparent; color: rgba(255,255,255,0.5); transition: background .2s, color .2s; }
.pg-seg button:hover { color: #fff; }
.pg-seg button.active { color: #fff; background: rgba(14,165,233,0.3); }
.pg-seg button.active.enabled { background: #10b981; }
.pg-seg button.active.disabled { background: #ef4444; }

.pg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 16px; }
.pg-skel { height: 180px; border-radius: 14px; background: rgba(255,255,255,0.04); animation: pg-pulse 1.5s infinite; }
.pg-empty { text-align: center; padding: 64px 20px; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed rgba(var(--accent-rgb), 0.2); }
.pg-empty h3 { margin: 0 0 10px; color: rgba(255,255,255,0.5); font-weight: 500; }
.pg-empty p { margin: 0 0 14px; font-size: 13px; color: rgba(255,255,255,0.4); }
.pg-empty p:last-child { margin-bottom: 0; }
.pg-empty.sm { padding: 22px 16px; }

.pg-card { min-width: 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(14,165,233,0.15); border-radius: 14px; padding: 20px; transition: border-color .2s, transform .2s; }
.pg-card:hover { border-color: rgba(14,165,233,0.35); transform: translateY(-2px); }
.pg-card.off { background: rgba(239,68,68,0.04); border-color: rgba(239,68,68,0.25); opacity: .75; }
.pg-card.off:hover { border-color: rgba(239,68,68,0.45); }
.pg-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
/* The name keeps room to be read; the buttons move under it when the card is narrow */
.pg-card-main { flex: 1 1 190px; min-width: 0; }
.pg-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; min-width: 0; }
.pg-name { font-weight: 700; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.pg-badge { flex-shrink: 0; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.35); color: #34d399; }
.pg-badge.off { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); color: #f87171; }
.pg-meta { display: flex; gap: 6px; flex-wrap: wrap; min-width: 0; }
.pg-code { background: rgba(14,165,233,0.15); border: 1px solid rgba(14,165,233,0.3); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; color: #38bdf8; }
.pg-dept-tag { background: rgba(var(--accent-rgb), 0.12); border: 1px solid rgba(var(--accent-rgb), 0.2); border-radius: 6px; padding: 2px 8px; font-size: 11px; color: var(--accent-light); display: inline-flex; align-items: center; gap: 4px; max-width: 100%; min-width: 0; }
.pg-dept-tag > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pg-actions { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.pg-icon { width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); color: #fff; transition: background .2s, opacity .2s; }
.pg-icon:disabled { opacity: .35; cursor: not-allowed; }
.pg-icon.edit { background: rgba(var(--brand-rgb), 0.15); border-color: rgba(var(--brand-rgb), 0.25); color: var(--brand-light); }
.pg-icon.danger { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.28); color: #f87171; }
.pg-icon.ok { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #34d399; }
.pg-icon:hover:not(:disabled) { filter: brightness(1.25); }
.pg-dur { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 12px; color: rgba(255,255,255,0.5); }
.pg-levels { display: flex; flex-wrap: wrap; gap: 6px; }
.pg-level { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.pg-off-note { margin-top: 12px; padding: 8px 12px; border-radius: 8px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); font-size: 11px; color: #f87171; display: flex; align-items: center; gap: 6px; }
.pg-muted { font-size: 12px; color: rgba(255,255,255,0.4); }
.pg-desc { font-size: 12px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.5; overflow-wrap: anywhere; }
.pg-spin { animation: pg-spin 1s linear infinite; }

/* Schools: sections in order, each with its classes */
.pg-group { margin-bottom: 26px; min-width: 0; }
.pg-group-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.pg-group-title { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 200px; }
.pg-group-title h2 { margin: 0; font-size: 17px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.pg-num { flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: rgba(var(--accent-rgb), 0.18); border: 1px solid rgba(var(--accent-rgb), 0.35); color: var(--accent-light); font-variant-numeric: tabular-nums; }
.pg-next { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 10px; min-width: 0; }
.pg-next b { color: #fff; font-weight: 600; overflow-wrap: anywhere; }
.pg-next.leave b { color: #fbbf24; }
.pg-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.pg-chip { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; background: rgba(14,165,233,0.12); border: 1px solid rgba(14,165,233,0.28); color: #7dd3fc; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.pg-chip.off { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); color: #fca5a5; }

/* Ready-made names in the dialogs */
.pg-picks { display: flex; flex-wrap: wrap; gap: 8px; }
.pg-pick { height: 34px; padding: 0 12px; border-radius: 17px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; background: rgba(var(--accent-rgb), 0.12); border: 1px solid rgba(var(--accent-rgb), 0.3); color: #fff; display: inline-flex; align-items: center; gap: 6px; max-width: 100%; }
.pg-pick:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.22); }
.pg-pick.on { background: rgba(var(--accent-rgb), 0.35); border-color: var(--accent-light); }
.pg-pick:disabled { opacity: .45; cursor: not-allowed; }
.pg-pick span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pg-help { font-size: 12px; color: rgba(255,255,255,0.45); margin: 6px 0 0; line-height: 1.5; }
.pg-row2 { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 12px; }

.pg-overlay { position: fixed; inset: 0; height: 100vh; height: 100dvh; box-sizing: border-box; overscroll-behavior: contain; font-family: Inter, sans-serif; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: pg-fade .15s ease-out; }
.pg-modal { width: 100%; max-width: 520px; max-height: 100%; display: flex; flex-direction: column; background: linear-gradient(145deg,#1a1a35,#12122a); border: 1px solid rgba(14,165,233,0.3); border-radius: 18px; box-shadow: 0 25px 60px rgba(0,0,0,0.6); color: #fff; animation: pg-pop .18s ease-out; }
.pg-modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 20px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.pg-modal-head h2 { margin: 0; font-size: 18px; font-weight: 700; }
.pg-modal-body { padding: 20px 24px; overflow-y: auto; overscroll-behavior: contain; flex: 1 1 auto; min-height: 0; }
.pg-modal-foot { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; padding: 14px 24px; border-top: 1px solid rgba(255,255,255,0.07); }
.pg-form { display: flex; flex-direction: column; gap: 16px; }
.pg-label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
.pg-stepper { display: flex; align-items: center; gap: 12px; }
.pg-stepper button { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); color: #fff; cursor: pointer; font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center; }
.pg-stepper button:disabled { opacity: .35; cursor: not-allowed; }
.pg-stepper-n { font-size: 22px; font-weight: 700; color: #38bdf8; min-width: 30px; text-align: center; font-variant-numeric: tabular-nums; }
.pg-stepper.sm { gap: 8px; }
.pg-stepper.sm button { width: 28px; height: 28px; font-size: 15px; border-radius: 6px; border-color: rgba(255,255,255,0.1); }
.pg-stepper.sm .pg-stepper-n { font-size: 14px; min-width: 20px; }
.pg-sems { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.pg-sem { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); font-size: 13px; color: rgba(255,255,255,0.7); }

@container pg (max-width: 560px) {
  .pg-head { margin-bottom: 16px; }
  .pg-h1 { font-size: 20px; }
  .pg-add { width: 100%; }
  .pg-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
  .pg-stat { flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 12px; }
  .pg-stat-n { font-size: 20px; }
  .pg-filters { margin-bottom: 16px; }
  .pg-dept { width: 100%; min-width: 0; }
  .pg-seg { width: 100%; }
  .pg-seg button { flex: 1; padding: 0 8px; }
  .pg-grid { gap: 12px; }
  .pg-card { padding: 16px; }
  .pg-group-head > .pg-btn, .pg-group-head > .pg-ghost { width: 100%; }
}
@media (max-width: 640px) {
  .pg-overlay { align-items: flex-end; padding: 0; }
  .pg-modal { max-width: none; max-height: 92vh; max-height: 92dvh; border-radius: 20px 20px 0 0; border-bottom: none; animation: pg-sheet .22s ease-out; }
  .pg-modal::before { content: ''; display: block; width: 38px; height: 4px; border-radius: 4px; background: rgba(255,255,255,0.2); margin: 8px auto 0; flex-shrink: 0; }
  .pg-modal-head { padding: 12px 16px 14px; }
  .pg-modal-body { padding: 16px; }
  .pg-modal-foot { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); }
  .pg-modal-foot > button { flex: 1 1 0; }
  .pg-sems { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .pg-row2 { grid-template-columns: minmax(0, 1fr); }
  /* 16px stops iOS Safari zooming into a field when it gets focus */
  .pg-input { font-size: 16px; }
}
@media (hover: none) {
  .pg-card:hover { transform: none; }
}
@media (pointer: coarse) {
  .pg-icon { width: 40px; height: 40px; }
  .pg-btn, .pg-ghost, .pg-seg button { height: 44px; }
  .pg-btn.sm, .pg-ghost.sm, .pg-pick { height: 40px; }
  .pg-input { height: 46px; }
  .pg-stepper button { width: 42px; height: 42px; }
  .pg-stepper.sm button { width: 34px; height: 34px; }
}
@media (prefers-reduced-motion: reduce) {
  .pg *:not(.pg-spin), .pg-overlay, .pg-modal { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
@keyframes pg-pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes pg-spin { to { transform: rotate(360deg); } }
@keyframes pg-fade { from { opacity: 0; } }
@keyframes pg-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } }
@keyframes pg-sheet { from { transform: translateY(100%); } }
`;
