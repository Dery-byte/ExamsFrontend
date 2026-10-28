import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Banknote, CalendarDays, Gift, HandCoins, History, Landmark, Loader2, PiggyBank, Receipt, TrendingUp, Users, Wallet } from 'lucide-react';
import { getFinanceDashboard } from '../../api/endpoints';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import { formatDate, formatMoney } from '../../utils/money';
import { tx } from '../../utils/terms';

const METHOD: Record<string, string> = { PAYSTACK: 'Online', CASH: 'Cash', BANK_TRANSFER: 'Bank', OTHER: 'Other' };

/** The accounts office at a glance: today's takings (by method and cashier), the week and month, and what is still owed. */
export default function AccountsDashboard() {
  const { data: d, isLoading, isError, refetch } = useQuery({ queryKey: ['finance-dashboard'], queryFn: getFinanceDashboard, refetchInterval: 60_000 });

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + DASH_CSS}</style>
      <div className="fe-head">
        <div className="fe-title">
          <div className="fe-logo"><Landmark size={24} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className="fe-h1">Accounts office</h1>
            <p className="fe-sub">{d ? `${d.me.name} · ${d.me.duty === 'BURSAR' ? 'Bursar' : d.me.duty === 'SUPER_ADMIN' ? 'Super Admin' : 'Cashier'} · ${formatDate(new Date().toISOString())}` : '…'}</p>
          </div>
        </div>
        <div className="fe-actions">
          <Link to="/accounts/fees?tab=payments" className="fe-btn" style={{ textDecoration: 'none' }}><Receipt size={15} /> Record a payment</Link>
        </div>
      </div>

      {isLoading ? <div className="fe-card"><div className="fe-empty"><Loader2 size={26} className="fe-spin" /></div></div>
        : isError || !d ? <div className="fe-card"><div className="fe-empty"><AlertCircle size={30} style={{ color: '#f87171' }} /><h3>Couldn't load the dashboard</h3>
          <p><button className="fe-link" onClick={() => refetch()}>Try again</button></p></div></div>
        : (
          <>
            {!d.paystack.configured && <div className="fe-note warn" style={{ marginBottom: 14 }}><AlertCircle size={15} /><span>Online payment (Paystack) is not connected, so students can only pay at the office.</span></div>}
            {d.session.residencyUnknown > 0 && (
              <div className="fe-note warn" style={{ marginBottom: 14 }}><AlertCircle size={15} />
                <span>{d.session.residencyUnknown} student{d.session.residencyUnknown === 1 ? ' has' : 's have'} no day / boarding residency recorded and {d.session.residencyUnknown === 1 ? 'is' : 'are'} charged only the items for everyone.</span></div>
            )}

            <div className="fe-kpis">
              <Kpi label="Received today" value={formatMoney(d.today.total, d.currency)} icon={<Banknote size={18} />} color="#34d399"
                foot={`${d.today.count} payment${d.today.count === 1 ? '' : 's'}${d.me.duty !== 'SUPER_ADMIN' ? ` · you took ${formatMoney(d.today.mine, d.currency)}` : ''}`} />
              <Kpi label="This week" value={formatMoney(d.week.total, d.currency)} icon={<CalendarDays size={18} />} color="#38bdf8" foot="Since Monday" />
              <Kpi label="This month" value={formatMoney(d.month.total, d.currency)} icon={<TrendingUp size={18} />} color="var(--accent-light)" foot="Since the 1st" />
              <Kpi label={`Outstanding · ${d.session.name}`} value={formatMoney(d.session.outstanding, d.currency)} icon={<AlertCircle size={18} />} color="#fbbf24"
                foot={<>
                  <div className="fe-bar" style={{ marginBottom: 6 }}><span style={{ width: `${d.session.owed ? Math.min(100, (d.session.paid / d.session.owed) * 100) : 0}%` }} /></div>
                  {d.session.debtors} of {d.session.students} {tx('students')} still owe
                </>} />
            </div>
            <div className="fe-kpis">
              {d.handIn && <Kpi label="Your cash to hand in" value={formatMoney(d.handIn.expectedCash, d.currency)} icon={<HandCoins size={18} />} color="#fbbf24"
                foot={<Link to="/accounts/cash-book" className="fe-link">{d.handIn.payments ? `${d.handIn.payments} payment(s) since your last cash-up · hand in` : 'All handed in · cash book'}</Link>} />}
              <Kpi label="Earlier years (arrears)" value={formatMoney(d.session.arrears ?? 0, d.currency)} icon={<History size={18} />} color="#f87171"
                foot={<Link to="/accounts/year-end" className="fe-link">{d.session.withArrears ?? 0} {tx('students')} owe from before · year end</Link>} />
              <Kpi label="Concessions this session" value={formatMoney(d.session.discounts ?? 0, d.currency)} icon={<Gift size={18} />} color="var(--accent-light)"
                foot={<Link to="/accounts/concessions" className="fe-link">Fees forgone · concessions</Link>} />
              <Kpi label="Credit held" value={formatMoney(d.session.credit ?? 0, d.currency)} icon={<Wallet size={18} />} color="#34d399" foot={tx('Paid ahead; used on the next bill or semester')} />
              {d.wallets && d.wallets.held > 0 && <Kpi label="Held in student wallets" value={formatMoney(d.wallets.held, d.currency)} icon={<PiggyBank size={18} />} color="#34d399"
                foot={<Link to="/accounts/wallets" className="fe-link">{d.wallets.students} {tx('students')} · used only when they choose</Link>} />}
            </div>

            <div className="fa-grid">
              <section className="fe-card">
                <div className="fe-card-head"><div className="fe-prog"><div className="fe-prog-ico"><Wallet size={16} /></div><div className="fe-prog-name">Today by method</div></div></div>
                <Breakdown rows={d.todayByMethod} currency={d.currency} empty="Nothing received yet today." />
              </section>
              <section className="fe-card">
                <div className="fe-card-head"><div className="fe-prog"><div className="fe-prog-ico"><Users size={16} /></div><div className="fe-prog-name">Today by cashier</div></div></div>
                <Breakdown rows={d.todayByCashier} currency={d.currency} empty="Nothing received yet today." />
              </section>
            </div>

            <section className="fe-card">
              <div className="fe-card-head">
                <div className="fe-prog"><div className="fe-prog-ico"><Receipt size={16} /></div><div className="fe-prog-name">Latest payments</div></div>
                <Link to="/accounts/fees?tab=payments" className="fe-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>All payments <ArrowRight size={14} /></Link>
              </div>
              {d.recent.length === 0 ? <div className="fe-empty" style={{ padding: 28 }}><p>No payments this month yet.</p></div> : (
                <ul className="fa-list">
                  {d.recent.map(p => (
                    <li key={p.id}>
                      <div style={{ minWidth: 0 }}>
                        <div className="fe-strong" style={{ overflowWrap: 'anywhere' }}>{p.studentName} <span className="fe-muted fe-small">· {p.studentId}</span></div>
                        <div className="fe-muted fe-small">{p.receiptNo ?? p.reference} · {METHOD[p.method] ?? p.method}{p.recordedBy ? ` · ${p.recordedBy}` : ''} · {formatDate(p.paidAt, true)}</div>
                      </div>
                      <div className="fe-strong" style={{ whiteSpace: 'nowrap' }}>{formatMoney(p.amount, d.currency)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
    </div>
  );
}

function Kpi({ label, value, foot, icon, color }: { label: string; value: string; foot: ReactNode; icon: ReactNode; color: string }) {
  return (
    <div className="fe-kpi">
      <div className="fe-kpi-ico" style={{ background: `color-mix(in srgb, ${color} 12.2%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 25.1%, transparent)` }}>{icon}</div>
      <div className="fe-kpi-label">{label}</div>
      <div className="fe-kpi-value">{value}</div>
      <div className="fe-kpi-foot">{foot}</div>
    </div>
  );
}

function Breakdown({ rows, currency, empty }: { rows: { label: string; amount: number }[]; currency: string; empty: string }) {
  const max = Math.max(1, ...rows.map(r => r.amount));
  if (rows.length === 0) return <div className="fe-empty" style={{ padding: 24 }}><p>{empty}</p></div>;
  return (
    <ul className="fa-list">
      {rows.map(r => (
        <li key={r.label} style={{ flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 140px', minWidth: 0 }}>{r.label}</span>
          <span className="fe-strong" style={{ whiteSpace: 'nowrap' }}>{formatMoney(r.amount, currency)}</span>
          <div className="fe-bar" style={{ flexBasis: '100%' }}><span style={{ width: `${(r.amount / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

const DASH_CSS = `
.fa-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 900px) { .fa-grid { grid-template-columns: 1fr 1fr; } }
.fa-grid > .fe-card { margin-bottom: 0; }
.fa-grid + .fe-card { margin-top: 16px; }
.fa-list { list-style: none; margin: 0; padding: 4px 16px 12px; }
.fa-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
.fa-list li:last-child { border-bottom: none; }
`;
