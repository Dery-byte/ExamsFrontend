import type { ReactNode } from 'react';
import Swal from 'sweetalert2';
import { tx } from '../../utils/terms';

/** Pill class (fee styles) and wording for every status the accounts screens show. */
export const PILL: Record<string, string> = {
  PAID: 'SUCCESS', PART_PAID: 'PENDING', UNPAID: 'FAILED', CANCELLED: 'VOIDED', DECLINED: 'ABANDONED', WRITTEN_OFF: 'ABANDONED',
  SUCCESS: 'SUCCESS', PENDING: 'PENDING', FAILED: 'FAILED', ABANDONED: 'ABANDONED', VOIDED: 'VOIDED',
  DONE: 'SUCCESS', SUBMITTED: 'PENDING', CONFIRMED: 'SUCCESS',
};
export const STATUS_TEXT: Record<string, string> = {
  PAID: 'Paid', PART_PAID: 'Part paid', UNPAID: 'Unpaid', CANCELLED: 'Cancelled', DECLINED: 'Declined', WRITTEN_OFF: 'Written off',
  SUCCESS: 'Paid', PENDING: 'Pending', FAILED: 'Failed', ABANDONED: 'Not completed', VOIDED: 'Cancelled',
  DONE: 'Refunded', SUBMITTED: 'Awaiting bursar', CONFIRMED: 'Confirmed',
};

export const Pill = ({ status }: { status: string }) => <span className={`fe-pill ${PILL[status] ?? 'ABANDONED'}`}>{STATUS_TEXT[status] ?? status}</span>;

/** The server's message (in this institution's words), else the fallback. */
export const errorText = (e: any, fallback: string) => tx(e?.response?.data?.message ?? fallback);

/** Asks for a reason (required); resolves to it, or null when cancelled. */
export async function askReason(title: string, text: string, confirm: string, danger = true): Promise<string | null> {
  const r = await Swal.fire({
    title, text, input: 'text', inputPlaceholder: 'Reason', inputValidator: v => (!v?.trim() ? 'Give a reason' : undefined),
    icon: danger ? 'warning' : 'question', showCancelButton: true, confirmButtonText: confirm, cancelButtonText: 'Back',
    ...(danger ? { confirmButtonColor: '#e34948' } : {}),
  });
  return r.isConfirmed ? String(r.value).trim() : null;
}

/** A titled card holding a list of rows (or a short empty line). */
export function Section({ title, action, empty, count, children }: { title: string; action?: ReactNode; empty: string; count: number; children: ReactNode }) {
  return (
    <div className="fe-card" style={{ marginBottom: 14 }}>
      <div className="bl-bar"><span className="fe-strong">{title}</span>{action}</div>
      {count === 0 ? <p className="fe-muted fe-small" style={{ padding: '14px 16px', margin: 0 }}>{empty}</p> : <ul className="bl-list">{children}</ul>}
    </div>
  );
}

/** Small totals in a row (stacked on phones). */
export function Totals({ items }: { items: { label: string; value: string; tone?: 'good' | 'warn' | 'bad' }[] }) {
  const color = { good: '#34d399', warn: '#fbbf24', bad: '#f87171' };
  return (
    <div className="bl-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
      {items.map(i => <div key={i.label}><span>{i.label}</span><b style={i.tone ? { color: color[i.tone] } : undefined}>{i.value}</b></div>)}
    </div>
  );
}

/** A page heading in the accounts style. */
export function AccountsHead({ icon, title, sub, actions }: { icon: ReactNode; title: string; sub: string; actions?: ReactNode }) {
  return (
    <div className="fe-head">
      <div className="fe-title">
        <div className="fe-logo">{icon}</div>
        <div style={{ minWidth: 0 }}>
          <h1 className="fe-h1">{title}</h1>
          <p className="fe-sub">{sub}</p>
        </div>
      </div>
      {actions && <div className="fe-actions">{actions}</div>}
    </div>
  );
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
