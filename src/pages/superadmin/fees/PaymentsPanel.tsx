import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Ban, ChevronLeft, ChevronRight, Info, Loader2, Plus, Receipt, RefreshCw, Search, UserRound } from 'lucide-react';
import FeeModal from './FeeModal';
import ReceiptModal from '../../user/fees/ReceiptModal';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getFeePayments, recheckFeePayment, recordFeePayment, searchFeeStudents, voidFeePayment,
  type FeeDue, type FeeOverview, type FeePaymentInfo, type FeeStudentMatch, type PaymentMethod,
} from '../../../api/endpoints';
import { formatDate, formatMoney, moneyInput, parseMoney, paymentMethodLabel, roundMoney } from '../../../utils/money';
import { levelName, tx, levelSuffix, showLevelPicker } from '../../../utils/terms';

const PAGE_SIZE = 25;
const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'SUCCESS', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'ABANDONED', label: 'Abandoned' },
  { value: 'VOIDED', label: 'Cancelled' },
];
const STATUS_LABEL: Record<string, string> = { SUCCESS: 'Paid', PENDING: 'Pending', FAILED: 'Failed', ABANDONED: 'Abandoned', VOIDED: 'Cancelled' };

function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/**
 * Every payment in the session, with filters; record cash / bank payments (and print the receipt);
 * re-check pending online ones. Only the bursar (or the Super Admin) cancels a payment.
 */
export default function PaymentsPanel({ overview, onChanged }: { overview: FeeOverview; onChanged: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth() as any;
  const bursar = user?.role !== 'ACCOUNTANT' || user?.financeDuty === 'BURSAR';
  // The bursar cancels any recorded payment; a cashier only their own until they hand it in
  const canVoid = (p: FeePaymentInfo) => bursar || (p.recordedById === user?.id && !p.cashedUp);
  const [receipt, setReceipt] = useState<FeePaymentInfo | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [programId, setProgramId] = useState<number | ''>('');
  const [level, setLevel] = useState<number | ''>('');
  const [page, setPage] = useState(0);
  const [recording, setRecording] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const search = useDebounced(q.trim());
  const currency = overview.currency;
  const sessionId = overview.session.id;

  useEffect(() => { setPage(0); }, [search, status, programId, level, sessionId]);

  const params = {
    sessionId, status: status || undefined, programId: programId || undefined,
    level: level === '' ? undefined : level, q: search || undefined, page, size: PAGE_SIZE,
  };
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['fee-payments', params],
    queryFn: () => getFeePayments(params),
    placeholderData: keepPreviousData,
  });
  const rows = data?.content ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const program = overview.programs.find(p => p.id === programId);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['fee-payments'] });
    onChanged();
  };

  const recheck = async (p: FeePaymentInfo) => {
    setBusyId(p.id);
    try {
      const updated = await recheckFeePayment(p.id);
      toast.success(updated.status === 'SUCCESS' ? 'Payment confirmed by Paystack'
        : updated.status === 'PENDING' ? 'Still waiting on the payer' : `Paystack reports: ${STATUS_LABEL[updated.status].toLowerCase()}`);
      refresh();
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not reach Paystack'));
    } finally { setBusyId(null); }
  };

  const cancel = async (p: FeePaymentInfo) => {
    const res = await Swal.fire({
      title: 'Cancel this payment?',
      html: `${formatMoney(p.amount, currency)} from <b>${escapeHtml(p.studentName)}</b> will no longer count towards their fees. The entry stays in the register as cancelled.`,
      input: 'text', inputPlaceholder: 'Reason, e.g. entered for the wrong student',
      inputValidator: v => (!v || !v.trim() ? 'Give a reason' : undefined),
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Cancel payment', cancelButtonText: 'Keep it', confirmButtonColor: '#e34948',
    });
    if (!res.isConfirmed) return;
    setBusyId(p.id);
    try {
      await voidFeePayment(p.id, String(res.value).trim());
      toast.success('Payment cancelled');
      refresh();
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not cancel the payment'));
    } finally { setBusyId(null); }
  };

  return (
    <>
      <div className="fe-toolbar">
        <div className="fe-search">
          <Search size={15} />
          <input className="fe-input" placeholder={tx('Search name, Student ID, email or reference')} value={q} onChange={e => setQ(e.target.value)} aria-label="Search payments" />
        </div>
        <select className="fe-select" value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="fe-select prog" value={programId} onChange={e => { setProgramId(e.target.value ? Number(e.target.value) : ''); setLevel(''); }} aria-label={tx('Programme')}>
          <option value="">{tx('All programmes')}</option>
          {overview.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {program && showLevelPicker(program.levels.length) && (
          <select className="fe-select" value={level} onChange={e => setLevel(e.target.value ? Number(e.target.value) : '')} aria-label={tx('Level')}>
            <option value="">{tx('All levels')}</option>
            {program.levels.map(l => <option key={l.level} value={l.level}>{levelName(l.level)}</option>)}
          </select>
        )}
        <button type="button" className="fe-icon-btn" onClick={() => refetch()} title="Refresh" aria-label="Refresh payments" style={{ width: 38, height: 38 }}>
          <RefreshCw size={15} className={isFetching ? 'fe-spin' : undefined} />
        </button>
        {overview.session.current && (
          <button type="button" className="fe-btn" onClick={() => setRecording(true)}><Plus size={15} /> Record payment</button>
        )}
      </div>

      <div className="fe-card">
        {isLoading ? (
          <div style={{ padding: 18, display: 'grid', gap: 10 }}>{[1, 2, 3, 4].map(i => <div key={i} className="fe-skel" style={{ height: 44 }} />)}</div>
        ) : isError ? (
          <div className="fe-empty"><h3>Couldn't load payments</h3><p><button className="fe-link" onClick={() => refetch()}>Try again</button></p></div>
        ) : rows.length === 0 ? (
          <div className="fe-empty">
            <Receipt size={34} style={{ color: 'rgba(var(--accent-rgb), 0.45)' }} />
            <h3>{search || status || programId ? 'No payments match these filters' : 'No payments yet'}</h3>
            <p>{search || status || programId ? 'Try a different search or clear the filters.'
              : `Online payments appear here as soon as students pay. Cash and bank payments you record show up here too.`}</p>
          </div>
        ) : (
          <>
            <div className="fe-table-wrap">
              <table className="fe-table fe-stack pay">
                <thead>
                  <tr>
                    <th>Date</th><th>{tx('Student')}</th><th>{tx('Programme')}</th><th>Receipt</th><th>Method</th>
                    <th className="fe-num">Amount</th><th>Status</th><th />
                  </tr>
                </thead>
                <tbody style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .15s' }}>
                  {rows.map(p => (
                    <tr key={p.id}>
                      <td className="fe-c-date" style={{ whiteSpace: 'nowrap' }}>
                        <div>{formatDate(p.paidAt ?? p.createdAt)}</div>
                        <div className="fe-muted fe-small">{new Date(p.paidAt ?? p.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="fe-c-title">
                        <div className="fe-strong">{p.studentName}</div>
                        <div className="fe-muted fe-small">{p.studentId}</div>
                      </td>
                      <td className="fe-c-prog" data-label={tx('Programme')}>
                        <div>{p.programName ?? '—'}</div>
                        <div className="fe-muted fe-small">{levelSuffix(p.level).replace(' · ', '')}</div>
                      </td>
                      <td className="fe-c-ref" data-label="Receipt">
                        {p.receiptNo && <div className="fe-mono fe-strong" style={{ whiteSpace: 'nowrap' }}>{p.receiptNo}</div>}
                        <div className="fe-mono fe-muted fe-small">{p.reference}</div>
                        {p.periodName && p.periodName !== 'Whole year' && <div className="fe-muted fe-small">{tx(p.periodName)}</div>}
                      </td>
                      <td className="fe-c-method" data-label="Method">
                        <div>{paymentMethodLabel(p)}</div>
                        {p.recordedBy && <div className="fe-muted fe-small">by {p.recordedBy}</div>}
                      </td>
                      <td className="fe-num fe-c-amount">
                        <div className="fe-strong">{formatMoney(p.amount, p.currency)}</div>
                        {(p.items.length > 0 || paidFor(p).length > 0) && (
                          <div className="fe-muted fe-small" style={{ maxWidth: 200, marginLeft: 'auto', whiteSpace: 'normal' }}
                            title={(p.items.length ? p.items : paidFor(p)).map(i => `${'name' in i ? i.name : i.label}: ${formatMoney(i.amount, p.currency)}`).join('\n')}>
                            {truncate(p.items.length ? p.items.map(i => i.name).join(', ') : paidFor(p).map(a => a.label).join(', '), 48)}
                          </div>
                        )}
                      </td>
                      <td className="fe-c-status">
                        <span className={`fe-pill ${p.status}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
                        {(p.message || p.note) && p.status !== 'SUCCESS' && (
                          <div className="fe-muted fe-small" style={{ marginTop: 4, maxWidth: 220 }} title={p.note ?? p.message ?? ''}>
                            {truncate(p.status === 'VOIDED' ? p.note : p.message, 60)}
                          </div>
                        )}
                        {p.note && p.status === 'SUCCESS' && <div className="fe-muted fe-small" style={{ marginTop: 4, maxWidth: 220 }} title={p.note}>{truncate(p.note, 60)}</div>}
                      </td>
                      <td className="fe-c-actions">
                        <div className="fe-row-actions">
                          {p.method === 'PAYSTACK' && p.status !== 'SUCCESS' && (
                            <button type="button" className="fe-ghost sm" onClick={() => recheck(p)} disabled={busyId === p.id} title="Ask Paystack for the latest status">
                              {busyId === p.id ? <Loader2 size={13} className="fe-spin" /> : <RefreshCw size={13} />} Check
                            </button>
                          )}
                          {(p.status === 'SUCCESS' || p.status === 'VOIDED') && (
                            <button type="button" className="fe-ghost sm" onClick={() => setReceipt(p)} title="View and print the receipt">
                              <Receipt size={13} /> Receipt
                            </button>
                          )}
                          {canVoid(p) && p.method !== 'PAYSTACK' && p.status === 'SUCCESS' && (
                            <button type="button" className="fe-icon-btn danger" onClick={() => cancel(p)} disabled={busyId === p.id} title="Cancel this payment" aria-label={`Cancel payment ${p.reference}`}>
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="fe-pager">
              <span>{page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total.toLocaleString()} payment{total === 1 ? '' : 's'}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button type="button" className="fe-icon-btn" onClick={() => setPage(p => p - 1)} disabled={page === 0} aria-label="Previous page"><ChevronLeft size={15} /></button>
                <span>Page {page + 1} of {pages}</span>
                <button type="button" className="fe-icon-btn" onClick={() => setPage(p => p + 1)} disabled={page + 1 >= pages} aria-label="Next page"><ChevronRight size={15} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {recording && <RecordPaymentModal currency={currency} onClose={() => setRecording(false)}
        onSaved={p => { setRecording(false); refresh(); setReceipt(p); }} />}
      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}

/** Where a payment went, when that isn't simply one fee: bills, several terms, credit. */
const paidFor = (p: FeePaymentInfo) => {
  const a = p.allocations ?? [];
  return a.length > 1 || a.some(x => x.kind !== 'FEE') ? a : [];
};

/**
 * Cash or bank payment received at the accounts office: to everything owed, oldest first (fees, then
 * bills), unless one fee or bill is chosen; anything beyond what is owed is kept as credit. The
 * receipt opens once it's recorded. `initial`: open with this student already chosen.
 */
export function RecordPaymentModal({ currency, onClose, onSaved, initial }: { currency: string; onClose: () => void; onSaved: (p: FeePaymentInfo) => void; initial?: FeeStudentMatch }) {
  const [q, setQ] = useState('');
  const [student, setStudent] = useState<FeeStudentMatch | null>(initial ?? null);
  const [amount, setAmount] = useState(initial?.balance ? String(initial.balance) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [paidOn, setPaidOn] = useState(localToday());
  const [note, setNote] = useState('');
  const [items, setItems] = useState<string[]>([]);
  /** '' = everything owed, oldest first; 'f12' = that fee; 'b7' = that bill. */
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const term = useDebounced(q.trim(), 300);

  const { data: matches = [], isFetching } = useQuery({
    queryKey: ['fee-student-search', term],
    queryFn: () => searchFeeStudents(term),
    enabled: !student && term.length >= 2,
  });

  const dues = student?.dues ?? [];
  const bills = student?.bills ?? [];
  const due: FeeDue | null = useMemo(() => dues.find(d => `f${d.fee.id}` === target) ?? null, [dues, target]);
  const bill = bills.find(b => `b${b.id}` === target) ?? null;

  const pick = (s: FeeStudentMatch) => {
    setStudent(s);
    setItems([]);
    setTarget('');
    setAmount(s.balance ? String(s.balance) : '');
  };
  const choose = (t: string) => {
    setTarget(t);
    setItems([]);
    const d = dues.find(x => `f${x.fee.id}` === t), b = bills.find(x => `b${x.id}` === t);
    const bal = d ? d.balance : b ? b.balance : student?.balance ?? 0;
    setAmount(bal > 0 ? String(bal) : '');
  };

  const owedItems = (due?.items ?? []).filter(i => i.balance > 0);
  const byItem = items.length > 0;
  const toggleItem = (name: string) => {
    const next = items.includes(name) ? items.filter(n => n !== name) : [...items, name];
    setItems(next);
    // The amount follows the chosen items' balances
    if (next.length > 0) setAmount(String(roundMoney(owedItems.filter(i => next.includes(i.name)).reduce((sum, i) => sum + i.balance, 0))));
  };

  const value = parseMoney(amount);
  const noFee = student != null && student.balance == null;
  const allOwed = student?.balance ?? 0;
  /** Beyond everything owed: kept as credit. */
  const extra = roundMoney(value - allOwed);
  const canSave = !!student && !noFee && value > 0 && !saving;

  const save = async () => {
    if (!student || !canSave) return;
    setSaving(true);
    try {
      const p = await recordFeePayment({
        studentId: student.id, method, paidOn, note: note.trim() || undefined, scheduleId: due?.fee.id, billId: bill?.id,
        ...(byItem ? { items } : { amount: value }),
      });
      toast.success(`${formatMoney(p.amount, currency)} recorded for ${p.studentName}${p.receiptNo ? ` · receipt ${p.receiptNo}` : ''}`);
      onSaved(p);
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not record the payment'));
    } finally { setSaving(false); }
  };

  return (
    <FeeModal
      title="Record a payment"
      subtitle="Money received at the accounts office. It counts towards what the student owes straight away."
      onClose={onClose} busy={saving} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={!canSave}>
            {saving ? <Loader2 size={15} className="fe-spin" /> : <Receipt size={15} />} Record {value > 0 ? formatMoney(value, currency) : 'payment'}
          </button>
        </div>
      </>}
    >
      <div className="fe-field">
        <label className="fe-label" htmlFor="fe-stu">{tx('Student')}</label>
        {student ? (
          <div className="fe-picked">
            <div style={{ minWidth: 0 }}>
              <div className="fe-strong">{student.name}</div>
              <div className="fe-muted fe-small">{student.studentId} · {student.programName ?? tx('No programme')}{levelSuffix(student.level)}</div>
              <div className="fe-small" style={{ marginTop: 4 }}>
                {student.balance == null
                  ? <span style={{ color: '#fbbf24' }}>No fee or bill for this student yet</span>
                  : <>Owes <span style={{ color: student.balance ? '#fbbf24' : '#34d399', fontWeight: 700 }}>{formatMoney(student.balance, currency)}</span> in all
                    {(student.credit ?? 0) > 0 && <> · {formatMoney(student.credit, currency)} in credit</>}</>}
              </div>
            </div>
            {!initial && <button type="button" className="fe-ghost sm" onClick={() => { setStudent(null); setAmount(''); setItems([]); setTarget(''); }}>Change</button>}
          </div>
        ) : (
          <>
            <div className="fe-search">
              <Search size={15} />
              <input id="fe-stu" className="fe-input" placeholder={tx('Name, Student ID or email')} value={q} onChange={e => setQ(e.target.value)} autoComplete="off" />
            </div>
            {term.length >= 2 && (
              <div className="fe-results" role="listbox">
                {isFetching && matches.length === 0 ? (
                  <div className="fe-muted fe-small" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 size={13} className="fe-spin" /> Searching…</div>
                ) : matches.length === 0 ? (
                  <div className="fe-muted fe-small" style={{ padding: 12 }}>{tx('No students match')} “{term}”.</div>
                ) : matches.map(s => (
                  <button type="button" key={s.id} className="fe-result" role="option" aria-selected={false} onClick={() => pick(s)}>
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                      <UserRound size={16} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                      <span style={{ minWidth: 0 }}>
                        <span className="fe-strong" style={{ display: 'block' }}>{s.name}</span>
                        <span className="fe-muted fe-small">{s.studentId}{s.programName ? ` · ${s.programName}` : ''}{levelSuffix(s.level)}</span>
                      </span>
                    </span>
                    <span className="fe-small" style={{ whiteSpace: 'nowrap', color: s.balance ? '#fbbf24' : 'rgba(255,255,255,0.45)' }}>
                      {s.balance != null ? `Owes ${formatMoney(s.balance, currency)}` : 'No fee'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {student && !noFee && dues.length + bills.length > 1 && (
        <div className="fe-field">
          <label className="fe-label" htmlFor="fe-due-pick">Pay towards</label>
          <select id="fe-due-pick" className="fe-select" style={{ width: '100%' }} value={target} onChange={e => choose(e.target.value)}>
            <option value="">Everything owed, oldest first</option>
            {dues.map(d => (
              <option key={d.fee.id} value={`f${d.fee.id}`}>
                {tx(d.fee.periodName ?? 'Fee')} fees · {d.balance > 0 ? `owes ${formatMoney(d.balance, currency)}` : 'paid'}
              </option>
            ))}
            {bills.map(b => <option key={b.id} value={`b${b.id}`}>{b.title} · owes {formatMoney(b.balance, currency)}</option>)}
          </select>
          <div className="fe-hint">{target ? 'This first; anything more goes to the oldest of the rest.' : tx('School fees from the oldest semester, then bills from the oldest.')}</div>
        </div>
      )}

      {owedItems.length > 0 && (
        <div className="fe-field">
          <span className="fe-label">What is it for? <span className="fe-muted" style={{ fontWeight: 500 }}>(leave empty for the fee as a whole)</span></span>
          <div className="fe-checks">
            {owedItems.map(i => {
              const on = items.includes(i.name);
              return (
                <label key={i.name} className={`fe-check${on ? ' on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleItem(i.name)} />
                  {i.name} <span className="fe-muted fe-small">{formatMoney(i.balance, currency)}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="fe-grid2">
        <div className="fe-field">
          <label className="fe-label" htmlFor="fe-amt">Amount received</label>
          <div className="fe-money">
            <span>{currency}</span>
            <input id="fe-amt" className="fe-input" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(moneyInput(e.target.value))}
              disabled={!student || noFee || byItem} />
          </div>
          {byItem && <div className="fe-hint">Set by the items chosen above.</div>}
          {!byItem && extra > 0 && <div className="fe-hint" style={{ color: '#fbbf24' }}>{formatMoney(extra, currency)} more than is owed: {tx('it is kept as credit for the next bill or semester.')}</div>}
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="fe-method">Paid by</label>
          <select id="fe-method" className="fe-select" style={{ width: '100%' }} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank deposit / transfer</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div className="fe-grid2">
        <div className="fe-field">
          <label className="fe-label" htmlFor="fe-date">Date received</label>
          <input id="fe-date" type="date" className="fe-input" style={{ width: '100%' }} value={paidOn} max={localToday()} onChange={e => setPaidOn(e.target.value)} />
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="fe-mnote">Bank / teller ref. <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
          <input id="fe-mnote" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. GCB deposit slip 004512" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>
      <div className="fe-note info" style={{ marginBottom: 0 }}>
        <Info size={15} />
        <span>Online payments by card or Mobile Money are recorded automatically; only record money paid in person or into the school's account. A numbered receipt is made for every payment.</span>
      </div>
    </FeeModal>
  );
}

/** Today as yyyy-mm-dd in the browser's own time zone (toISOString would give the UTC day). */
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const truncate = (s: string | null | undefined, n: number) => !s ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s;
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
