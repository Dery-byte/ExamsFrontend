import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Ban, ChevronLeft, ChevronRight, Info, Loader2, Plus, Receipt, RefreshCw, Search, UserRound } from 'lucide-react';
import FeeModal from './FeeModal';
import {
  getFeePayments, recheckFeePayment, recordFeePayment, searchFeeStudents, voidFeePayment,
  type FeeOverview, type FeePaymentInfo, type FeeStudentMatch, type PaymentMethod,
} from '../../../api/endpoints';
import { formatDate, formatMoney, moneyInput, parseMoney, paymentMethodLabel, roundMoney } from '../../../utils/money';
import { levelName, tx } from '../../../utils/terms';

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

/** Every payment in the session, with filters; record cash / bank payments; re-check pending ones. */
export default function PaymentsPanel({ overview, onChanged }: { overview: FeeOverview; onChanged: () => void }) {
  const qc = useQueryClient();
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
      toast.error(e?.response?.data?.message ?? 'Could not reach Paystack');
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
      toast.error(e?.response?.data?.message ?? 'Could not cancel the payment');
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
        <select className="fe-select" value={programId} onChange={e => { setProgramId(e.target.value ? Number(e.target.value) : ''); setLevel(''); }} aria-label={tx('Programme')} style={{ maxWidth: 220 }}>
          <option value="">{tx('All programmes')}</option>
          {overview.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {program && (
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
            <Receipt size={34} style={{ color: 'rgba(139,92,246,0.45)' }} />
            <h3>{search || status || programId ? 'No payments match these filters' : 'No payments yet'}</h3>
            <p>{search || status || programId ? 'Try a different search or clear the filters.'
              : `Online payments appear here as soon as students pay. Cash and bank payments you record show up here too.`}</p>
          </div>
        ) : (
          <>
            <div className="fe-table-wrap">
              <table className="fe-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Date</th><th>{tx('Student')}</th><th>{tx('Programme')}</th><th>Reference</th><th>Method</th>
                    <th className="fe-num">Amount</th><th>Status</th><th />
                  </tr>
                </thead>
                <tbody style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .15s' }}>
                  {rows.map(p => (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div>{formatDate(p.paidAt ?? p.createdAt)}</div>
                        <div className="fe-muted fe-small">{new Date(p.paidAt ?? p.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td>
                        <div className="fe-strong">{p.studentName}</div>
                        <div className="fe-muted fe-small">{p.studentId}</div>
                      </td>
                      <td>
                        <div>{p.programName ?? '—'}</div>
                        <div className="fe-muted fe-small">{p.level != null ? levelName(p.level) : ''}</div>
                      </td>
                      <td><span className="fe-mono">{p.reference}</span></td>
                      <td>
                        <div>{paymentMethodLabel(p)}</div>
                        {p.recordedBy && <div className="fe-muted fe-small">by {p.recordedBy}</div>}
                      </td>
                      <td className="fe-num">
                        <div className="fe-strong">{formatMoney(p.amount, p.currency)}</div>
                        {p.items.length > 0 && (
                          <div className="fe-muted fe-small" style={{ maxWidth: 200, marginLeft: 'auto', whiteSpace: 'normal' }}
                            title={p.items.map(i => `${i.name}: ${formatMoney(i.amount, p.currency)}`).join('\n')}>
                            {truncate(p.items.map(i => i.name).join(', '), 48)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`fe-pill ${p.status}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
                        {(p.message || p.note) && p.status !== 'SUCCESS' && (
                          <div className="fe-muted fe-small" style={{ marginTop: 4, maxWidth: 220 }} title={p.note ?? p.message ?? ''}>
                            {truncate(p.status === 'VOIDED' ? p.note : p.message, 60)}
                          </div>
                        )}
                        {p.note && p.status === 'SUCCESS' && <div className="fe-muted fe-small" style={{ marginTop: 4, maxWidth: 220 }} title={p.note}>{truncate(p.note, 60)}</div>}
                      </td>
                      <td>
                        <div className="fe-row-actions">
                          {p.method === 'PAYSTACK' && p.status !== 'SUCCESS' && (
                            <button type="button" className="fe-ghost sm" onClick={() => recheck(p)} disabled={busyId === p.id} title="Ask Paystack for the latest status">
                              {busyId === p.id ? <Loader2 size={13} className="fe-spin" /> : <RefreshCw size={13} />} Check
                            </button>
                          )}
                          {p.method !== 'PAYSTACK' && p.status === 'SUCCESS' && (
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

      {recording && <RecordPaymentModal currency={currency} onClose={() => setRecording(false)} onSaved={() => { setRecording(false); refresh(); }} />}
    </>
  );
}

/** Cash or bank payment received at the accounts office, counted against the student's current fee. */
function RecordPaymentModal({ currency, onClose, onSaved }: { currency: string; onClose: () => void; onSaved: () => void }) {
  const [q, setQ] = useState('');
  const [student, setStudent] = useState<FeeStudentMatch | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [paidOn, setPaidOn] = useState(localToday());
  const [note, setNote] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const term = useDebounced(q.trim(), 300);

  const { data: matches = [], isFetching } = useQuery({
    queryKey: ['fee-student-search', term],
    queryFn: () => searchFeeStudents(term),
    enabled: !student && term.length >= 2,
  });

  const pick = (s: FeeStudentMatch) => {
    setStudent(s);
    setItems([]);
    setAmount(s.balance && s.balance > 0 ? String(s.balance) : '');
  };

  const owedItems = (student?.items ?? []).filter(i => i.balance > 0);
  const byItem = items.length > 0;
  const toggleItem = (name: string) => {
    const next = items.includes(name) ? items.filter(n => n !== name) : [...items, name];
    setItems(next);
    // The amount follows the chosen items' balances
    if (next.length > 0) setAmount(String(roundMoney(owedItems.filter(i => next.includes(i.name)).reduce((sum, i) => sum + i.balance, 0))));
  };

  const value = parseMoney(amount);
  const noFee = student != null && student.fee == null;
  const overBalance = student?.balance != null && value > student.balance;
  const canSave = !!student && !noFee && value > 0 && !overBalance && !saving;

  const save = async () => {
    if (!student || !canSave) return;
    setSaving(true);
    try {
      const p = await recordFeePayment({
        studentId: student.id, method, paidOn, note: note.trim() || undefined,
        ...(byItem ? { items } : { amount: value }),
      });
      toast.success(`${formatMoney(p.amount, currency)} recorded for ${p.studentName}`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not record the payment');
    } finally { setSaving(false); }
  };

  return (
    <FeeModal
      title="Record a payment"
      subtitle="Money received at the accounts office. It counts towards the student's fee straight away."
      onClose={onClose} busy={saving} narrow
      footer={<>
        <span />
        <div style={{ display: 'flex', gap: 8 }}>
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
              <div className="fe-muted fe-small">{student.studentId} · {student.programName ?? tx('No programme')}{student.level != null ? ` · ${levelName(student.level)}` : ''}</div>
              <div className="fe-small" style={{ marginTop: 4 }}>
                {student.fee == null
                  ? <span style={{ color: '#fbbf24' }}>No fee set for this class in the current session</span>
                  : <>Fee {formatMoney(student.fee, currency)} · <span style={{ color: student.balance ? '#fbbf24' : '#34d399', fontWeight: 700 }}>Balance {formatMoney(student.balance, currency)}</span></>}
              </div>
            </div>
            <button type="button" className="fe-ghost sm" onClick={() => { setStudent(null); setAmount(''); setItems([]); }}>Change</button>
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
                      <UserRound size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
                      <span style={{ minWidth: 0 }}>
                        <span className="fe-strong" style={{ display: 'block' }}>{s.name}</span>
                        <span className="fe-muted fe-small">{s.studentId}{s.programName ? ` · ${s.programName}` : ''}{s.level != null ? ` · ${levelName(s.level)}` : ''}</span>
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
              disabled={!student || noFee || byItem} style={overBalance ? { borderColor: '#f87171' } : undefined} />
          </div>
          {byItem && <div className="fe-hint">Set by the items chosen above.</div>}
          {overBalance && <div className="fe-hint" style={{ color: '#f87171' }}>More than the balance of {formatMoney(student?.balance, currency)}.</div>}
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
          <label className="fe-label" htmlFor="fe-mnote">Receipt / bank ref. <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
          <input id="fe-mnote" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. Receipt no. 0042" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>
      <div className="fe-note info" style={{ marginBottom: 0 }}>
        <Info size={15} />
        <span>Online payments by card or Mobile Money are recorded automatically; only record money paid in person or into the school's account.</span>
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
