import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarClock, AlertTriangle, Lock, X, CreditCard, RefreshCw, Loader2 } from 'lucide-react';
import { getSubscriptionNotice, checkSubscriptionPayment, type SubscriptionNotice as Notice } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';

export const formatDay = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const inDays = (n?: number | null) => (n == null ? '' : n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

/** Headline and detail for the person the developer chose to tell (Super Admins, and Admins if chosen). */
export function noticeText(n: Notice): { tone: 'info' | 'warn' | 'bad'; title: string; body: string } {
  switch (n.state) {
    case 'ACTIVE':
      return { tone: 'info', title: `Subscription ends ${inDays(n.daysLeft)}`,
        body: `The portal is paid until ${formatDay(n.paidUntil)}. Please arrange renewal to avoid any interruption.` };
    case 'GRACE':
      return { tone: 'warn',
        title: n.unlicensed ? 'Subscription needs attention' : 'Subscription payment overdue',
        body: (n.unlicensed ? 'No valid subscription key is installed for this portal. '
          : `The subscription ended on ${formatDay(n.paidUntil)}. Everything still works for now, but `)
          + `the portal becomes read-only on ${formatDay(n.nextChange)} unless it is renewed.` };
    case 'RESTRICTED':
      return { tone: 'bad', title: 'Portal is read-only',
        body: `The subscription is overdue. Everyone can still sign in, view and export, but nothing can be changed and no new exams can start `
          + `(exams already in progress can be finished). The portal will be suspended on ${formatDay(n.nextChange)} unless it is renewed.` };
    default:
      return { tone: 'bad', title: 'Portal suspended',
        body: (n.manual ? 'Access has been suspended by the service provider. ' : 'The subscription was not renewed. ')
          + 'Only Super Admins can sign in, to view and export the institution\'s data. Full access returns once the subscription is renewed.' };
  }
}

const money = (currency: string, amount: string) => {
  const n = Number(amount);
  return `${currency} ${isNaN(n) ? amount : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * "Pay online" (the vendor's Paystack page, in a new tab) and "I've paid, check now", which asks the
 * vendor portal straight away instead of waiting for the next check-in.
 */
export function PayActions({ notice, className = '' }: { notice: Notice; className?: string }) {
  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);
  const inv = notice.invoice;
  if (!inv && !notice.canCheckPayment) return null;

  const check = async () => {
    setChecking(true);
    try {
      const next = await checkSubscriptionPayment();
      qc.setQueriesData({ queryKey: ['subscription-notice'] }, next);
      if (!next.checked) toast('Checked a moment ago. Try again in half a minute.');
      else if (next.state === 'ACTIVE' && !next.invoice) toast.success('Payment received. The subscription is renewed.');
      else if (inv && !next.invoice) toast.success('Payment received.');
      else toast('No payment yet. If you have just paid, it can take a minute to arrive.');
    } catch {
      toast.error('Could not check right now. Please try again shortly.');
    } finally { setChecking(false); }
  };

  return (
    <div className={`sn-pay ${className}`}>
      {inv && (
        <a className="sn-btn sn-btn-primary" href={inv.payUrl} target="_blank" rel="noopener noreferrer">
          <CreditCard size={15} aria-hidden /> Pay {money(inv.currency, inv.amount)} online
        </a>
      )}
      {notice.canCheckPayment && (
        <button type="button" className="sn-btn" onClick={check} disabled={checking}>
          {checking ? <Loader2 size={15} className="sn-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />} I've paid, check now
        </button>
      )}
      {inv && <span className="sn-inv">Invoice {inv.number} · due {formatDay(inv.dueDate)} · renews to {formatDay(inv.coversUntil)}</span>}
      <style>{PAY_CSS}</style>
    </div>
  );
}

const HIDE_KEY = 'subscription_notice_hidden';

/**
 * The subscription notice at the top of the Super Admin and Admin pages. Only people in the audience the
 * developer chose get details from the server; read-only and suspended notices can't be dismissed.
 */
export default function SubscriptionNotice({ dark = false }: { dark?: boolean }) {
  const { user } = useAuth();
  const eligible = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const { data } = useQuery({
    queryKey: ['subscription-notice', user?.username], queryFn: getSubscriptionNotice,
    enabled: eligible, staleTime: 5 * 60_000, refetchInterval: 10 * 60_000, retry: false,
  });
  const key = data?.state ? `${data.state}:${data.nextChange ?? ''}:${data.paidUntil ?? ''}` : '';
  const [hidden, setHidden] = useState<string | null>(() => {
    try { return sessionStorage.getItem(HIDE_KEY); } catch { return null; }
  });

  if (!eligible || !data?.show || !data.state) return null;
  const dismissible = data.state === 'ACTIVE' || data.state === 'GRACE';
  if (dismissible && hidden === key) return null;

  const { tone, title, body } = noticeText(data);
  const Icon = tone === 'info' ? CalendarClock : tone === 'warn' ? AlertTriangle : Lock;
  const close = () => {
    setHidden(key);
    try { sessionStorage.setItem(HIDE_KEY, key); } catch { /* storage blocked */ }
  };

  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={`sn sn-${tone}${dark ? ' sn-dark' : ''}`}>
      <Icon size={18} className="sn-ico" aria-hidden />
      <div className="sn-text">
        <strong>{title}.</strong> {body}
        {data.contact && <span className="sn-contact">To renew or ask about this: {data.contact}</span>}
        <PayActions notice={data} />
      </div>
      {dismissible && <button className="sn-close" onClick={close} aria-label="Hide this notice"><X size={16} /></button>}
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.sn { display: flex; align-items: flex-start; gap: 10px; margin: 0 0 16px; padding: 12px 14px; border-radius: 12px;
  border: 1px solid var(--sn-line); background: var(--sn-bg); color: var(--sn-ink); font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 13.5px; line-height: 1.5; }
.sn-info { --sn-bg: #eff6ff; --sn-line: #93c5fd; --sn-ink: #1e3a8a; --sn-ico: #2563eb; --sn-sub: #1e40af; }
.sn-warn { --sn-bg: #fffbeb; --sn-line: #f59e0b; --sn-ink: #78350f; --sn-ico: #b45309; --sn-sub: #92400e; }
.sn-bad  { --sn-bg: #fef2f2; --sn-line: #f87171; --sn-ink: #7f1d1d; --sn-ico: #dc2626; --sn-sub: #991b1b; }
.sn-dark.sn-info { --sn-bg: rgba(59,130,246,.12); --sn-line: rgba(96,165,250,.4); --sn-ink: #dbeafe; --sn-ico: #93c5fd; --sn-sub: #bfdbfe; }
.sn-dark.sn-warn { --sn-bg: rgba(245,158,11,.12); --sn-line: rgba(251,191,36,.45); --sn-ink: #fde68a; --sn-ico: #fbbf24; --sn-sub: #fcd34d; }
.sn-dark.sn-bad  { --sn-bg: rgba(239,68,68,.13); --sn-line: rgba(248,113,113,.45); --sn-ink: #fecaca; --sn-ico: #f87171; --sn-sub: #fca5a5; }
.sn-ico { flex-shrink: 0; margin-top: 2px; color: var(--sn-ico); }
.sn-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.sn-contact { display: block; margin-top: 4px; font-size: 12.5px; color: var(--sn-sub); font-weight: 600; }
.sn-close { flex-shrink: 0; border: none; background: transparent; color: var(--sn-sub); cursor: pointer; padding: 4px;
  border-radius: 6px; display: inline-flex; min-width: 32px; min-height: 32px; align-items: center; justify-content: center; }
.sn-close:hover { background: rgba(127,127,127,.15); }
`;

/* Own styles: also used on the Portal unavailable page, outside the banner (hence the fallbacks) */
const PAY_CSS = `
.sn-pay { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
.sn-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 12px; border-radius: 9px; font: inherit;
  font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; border: 1px solid var(--sn-line, #cbd5e1);
  background: transparent; color: var(--sn-ink, #0f172a); }
.sn-btn:hover { background: rgba(127,127,127,.12); text-decoration: none; }
.sn-btn:disabled { opacity: .6; cursor: default; }
.sn-btn-primary { background: var(--sn-ico, var(--brand, #5156be)); border-color: var(--sn-ico, var(--brand, #5156be)); color: var(--sn-on-ico, #fff); }
.sn-btn-primary:hover { filter: brightness(1.08); background: var(--sn-ico, var(--brand, #5156be)); }
.sn-dark .sn-btn-primary { --sn-on-ico: #0f0f1a; }
.sn-inv { flex-basis: 100%; font-size: 12px; color: var(--sn-sub, #64748b); }
.sn-spin { animation: sn-spin 1s linear infinite; }
@keyframes sn-spin { to { transform: rotate(360deg); } }
@media (max-width: 480px) { .sn-pay .sn-btn { flex: 1 1 100%; justify-content: center; } }
`;
