import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, CircleDot, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// Shared building blocks for the developer console panels.

export type Tone = 'ok' | 'warn' | 'bad' | 'neutral';

const TONES: Record<string, Tone> = {
  UP: 'ok', OK: 'ok', CONFIGURED: 'ok',
  DEGRADED: 'warn', STALLED: 'warn', NOT_CONFIGURED: 'warn',
  DOWN: 'bad',
};

export const toneOf = (status: string | undefined): Tone => (status && TONES[status]) || 'neutral';

const TONE_ICON: Record<Tone, ReactNode> = {
  ok: <CheckCircle2 size={14} />, warn: <AlertTriangle size={14} />, bad: <XCircle size={14} />, neutral: <CircleDot size={14} />,
};

export function StatusBadge({ status }: { status: string }) {
  const tone = toneOf(status);
  return <span className={`dd-pill dd-pill-${tone}`}>{TONE_ICON[tone]} {status.replace(/_/g, ' ').toLowerCase()}</span>;
}

export function PanelHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="dd-phead">
      <div className="dd-phead-text">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="dd-phead-actions">{actions}</div>}
    </header>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch { toast.error('Could not copy to the clipboard'); }
  };
  return (
    <button type="button" className="dd-btn dd-btn-sm dd-btn-quiet" onClick={copy} aria-label={label}>
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? 'Copied' : label}
    </button>
  );
}

export function Meter({ percent, tone }: { percent: number; tone: Tone }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="dd-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}>
      <span className={`dd-meter-fill dd-tone-${tone}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function PanelLoading({ label }: { label: string }) {
  return (
    <div className="dd-skeleton" aria-busy="true" aria-label={label}>
      <span /><span /><span />
    </div>
  );
}

export function PanelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="dd-callout dd-callout-bad" role="alert">
      <XCircle size={18} />
      <div><strong>{message}</strong>{onRetry && <> <button className="dd-link" onClick={onRetry}>Try again</button></>}</div>
    </div>
  );
}

/** Re-renders every `ms` so relative times ("2 min ago") stay current. */
export function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function relativeTime(iso: string, now = Date.now()) {
  const sec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(sec);
  if (abs < 10) return 'just now';
  if (abs < 60) return rtf.format(sec, 'second');
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
  return rtf.format(Math.round(sec / 86400), 'day');
}

export const fullDate = (iso: string) => new Date(iso).toLocaleString();

export function formatUptime(min: number) {
  if (min < 60) return `${min} min`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} h ${min % 60} min`;
  return `${Math.floor(min / 1440)} d ${Math.floor((min % 1440) / 60)} h`;
}

export function formatMb(mb: number | null | undefined) {
  if (mb == null) return '–';
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB` : `${mb} MB`;
}

export const apiMessage = (err: any, fallback: string) => err?.response?.data?.message ?? fallback;
