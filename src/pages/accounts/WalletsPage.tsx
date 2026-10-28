import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Ban, Banknote, CheckCircle2, ClipboardCheck, Loader2, PiggyBank, Search, ShieldCheck, SlidersHorizontal, ToggleRight } from 'lucide-react';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import FeeModal from '../superadmin/fees/FeeModal';
import { BILL_CSS } from './BillsPage';
import { AccountsHead, askReason, errorText, Totals } from './accountsUi';
import {
  approveWithdrawal, getWalletOverview, payOutWithdrawal, rejectWithdrawal, reviewWithdrawal, saveWalletSettings,
  type PaymentMethod, type WalletOverview, type WalletWithdrawalInfo,
} from '../../api/endpoints';
import { formatDate, formatMoney, moneyInput, parseMoney } from '../../utils/money';
import { levelSuffix, tx } from '../../utils/terms';
import { useAuth } from '../../contexts/AuthContext';

type Tab = 'REQUESTED' | 'REVIEWED' | 'APPROVED' | 'DONE';
const TABS: { key: Tab; label: string; short: string }[] = [
  { key: 'REQUESTED', label: 'To review', short: 'Review' },
  { key: 'REVIEWED', label: 'To approve', short: 'Approve' },
  { key: 'APPROVED', label: 'To pay out', short: 'Pay out' },
  { key: 'DONE', label: 'Finished', short: 'Done' },
];
const PAYOUT: Record<string, string> = { CASH: 'Cash', MOBILE_MONEY: 'Mobile Money', BANK: 'Bank transfer' };
const FINAL: Record<string, [string, string]> = {
  PAID: ['SUCCESS', 'Paid'], REJECTED: ['FAILED', 'Rejected'], CANCELLED: ['ABANDONED', 'Cancelled by student'], REVERSED: ['VOIDED', 'Voucher cancelled'],
};

/**
 * Student wallets for the accounts office and the Super Admin: what wallets hold, and withdrawal
 * requests through their steps (bursar reviews → Super Admin approves → the office pays out). Each
 * person sees the buttons for the steps they may take; the server enforces who may do what.
 */
export default function WalletsPage() {
  const qc = useQueryClient();
  const { user } = useAuth() as any;
  const studentsBase = user?.role === 'ACCOUNTANT' ? '/accounts/students' : '/super-admin/student-accounts';
  const { data: raw, isLoading, error } = useQuery({ queryKey: ['wallet-overview'], queryFn: getWalletOverview, retry: false });
  // A server without the wallet answers with an error, or with something that isn't an overview: say so rather than "switched off"
  const data = raw && typeof raw.enabled === 'boolean' && Array.isArray(raw.open) ? raw : undefined;
  const unavailable = !isLoading && !data;
  const [tab, setTab] = useState<Tab | null>(null);
  const [q, setQ] = useState('');
  const [paying, setPaying] = useState<WalletWithdrawalInfo | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['wallet-overview'] });
  const cur = data?.currency ?? 'GHS';

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { REQUESTED: 0, REVIEWED: 0, APPROVED: 0, DONE: data?.closed.length ?? 0 };
    (data?.open ?? []).forEach(w => { c[w.status as Tab] = (c[w.status as Tab] ?? 0) + 1; });
    return c;
  }, [data]);
  // Open on the step this person acts on, when something waits there
  const mine: Tab = data?.can.approve && counts.REVIEWED ? 'REVIEWED' : data?.can.review && counts.REQUESTED ? 'REQUESTED' : counts.APPROVED ? 'APPROVED' : 'REQUESTED';
  const active = tab ?? mine;
  const needle = q.trim().toLowerCase();
  const rows = (active === 'DONE' ? data?.closed ?? [] : (data?.open ?? []).filter(w => w.status === active))
    .filter(w => !needle || `${w.studentName} ${w.username} ${w.number}`.toLowerCase().includes(needle));

  const act = async (id: number, work: () => Promise<unknown>, done: string) => {
    setBusy(id);
    try { await work(); toast.success(done); refresh(); }
    catch (e) { toast.error(errorText(e, 'That did not work')); }
    finally { setBusy(null); }
  };
  const withNote = async (title: string, text: string, confirm: string): Promise<string | null | undefined> => {
    const r = await Swal.fire({ title, text, input: 'text', inputPlaceholder: 'Note (optional)', icon: 'question',
      showCancelButton: true, confirmButtonText: confirm, cancelButtonText: 'Back' });
    return r.isConfirmed ? (String(r.value ?? '').trim() || undefined) : null;
  };
  const review = async (w: WalletWithdrawalInfo) => {
    const note = await withNote(`Review ${w.number}?`, `Confirm ${w.studentName} can have ${formatMoney(w.amount, cur)} back. It then goes to the Super Admin for approval.`, 'Mark reviewed');
    if (note !== null) act(w.id, () => reviewWithdrawal(w.id, note), 'Reviewed: sent for approval');
  };
  const approve = async (w: WalletWithdrawalInfo) => {
    const note = await withNote(`Approve ${w.number}?`, `${formatMoney(w.amount, cur)} to ${w.studentName} by ${PAYOUT[w.payout].toLowerCase()}. The accounts office then pays it out.`, 'Approve');
    if (note !== null) act(w.id, () => approveWithdrawal(w.id, note), 'Approved: the accounts office can pay it out');
  };
  const reject = async (w: WalletWithdrawalInfo) => {
    const reason = await askReason(`Reject ${w.number}?`, 'The money stays in the student’s wallet. They will see your reason.', 'Reject');
    if (reason) act(w.id, () => rejectWithdrawal(w.id, reason), 'Request rejected');
  };

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + BILL_CSS + WALLETS_CSS}</style>
      <AccountsHead icon={<PiggyBank size={24} color="#fff" />} title="Student wallets"
        sub="Money students paid in ahead, and their requests to take it back out."
        actions={data?.can.settings ? <button type="button" className="fe-ghost" onClick={() => setLimitOpen(true)}><SlidersHorizontal size={15} /> Wallet limit</button> : undefined} />

      {unavailable && (
        <div className="fe-note warn" style={{ marginBottom: 14 }}><ToggleRight size={16} />
          <span>{(error as any)?.response?.status === 403 ? errorText(error, 'You can’t open student wallets.')
            : 'Student wallets aren’t available on the server yet. Deploy the latest backend; the “Student wallet” switch then appears under Feature Controls.'}</span></div>
      )}
      {data && !data.enabled && (
        <div className="fe-note warn" style={{ marginBottom: 14 }}><ToggleRight size={16} />
          <span>The wallet is switched off under Feature Controls: students can't add or spend wallet money. Anyone with a balance can still ask for it back, so requests still come here.</span></div>
      )}
      {data?.noBursar && (
        <div className="fe-note" style={{ marginBottom: 14 }}><ShieldCheck size={16} /><span>There is no bursar account, so the Super Admin reviews and approves each request in one step.</span></div>
      )}
      {data && <Totals items={[
        { label: 'Held in wallets', value: formatMoney(data.held, cur), tone: 'good' },
        { label: tx('Students'), value: String(data.students) },
        { label: 'Waiting', value: String(data.open.length), tone: data.open.length ? 'warn' : undefined },
        { label: 'Limit per wallet', value: data.maxBalance ? formatMoney(data.maxBalance, cur) : 'None' },
      ]} />}

      {!unavailable && <>
      <div className="fe-tabs sw-tabs" role="tablist" style={{ marginTop: 14 }}>
        {TABS.map(t => (
          <button key={t.key} type="button" role="tab" aria-selected={active === t.key} className={`fe-tab${active === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            <span className="sw-long">{t.label}</span><span className="sw-short">{t.short}</span>
            {t.key !== 'DONE' && counts[t.key] > 0 && <span className="sw-count">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      <div className="fe-card">
        <div className="bl-bar">
          <div className="fe-search" style={{ flex: '1 1 240px', maxWidth: 420 }}>
            <Search size={15} /><input className="fe-input" placeholder={tx('Search name, Student ID or request number')} value={q} onChange={e => setQ(e.target.value)} aria-label="Search requests" />
          </div>
        </div>
        {isLoading ? <div style={{ padding: 18 }}><div className="fe-skel" style={{ height: 120 }} /></div> : rows.length === 0 ? (
          <div className="fe-empty"><PiggyBank size={34} style={{ color: 'rgba(var(--accent-rgb), 0.45)' }} />
            <h3>{needle ? 'Nothing matches' : active === 'DONE' ? 'Nothing finished yet' : 'Nothing waiting here'}</h3>
            <p>{active === 'REQUESTED' ? 'New withdrawal requests from students show here for the bursar.'
              : active === 'REVIEWED' ? 'Requests the bursar has checked wait here for the Super Admin.'
              : active === 'APPROVED' ? 'Approved requests wait here to be paid out.' : 'Paid, rejected and cancelled requests show here.'}</p></div>
        ) : (
          <ul className="bl-list">
            {rows.map(w => {
              const me = data!.can.id;
              const canReview = w.status === 'REQUESTED' && data!.can.review;
              const canApprove = data!.can.approve && (w.status === 'REVIEWED' || (w.status === 'REQUESTED' && data!.noBursar)) && w.reviewedById !== me;
              const canPay = w.status === 'APPROVED' && w.approvedById !== me;
              const canReject = ['REQUESTED', 'REVIEWED', 'APPROVED'].includes(w.status) && (data!.can.review || data!.can.approve);
              const short = w.walletBalance != null && w.walletBalance < w.amount;
              return (
                <li key={w.id} className="bl-row sw-row">
                  <div className="bl-main">
                    <div className="fe-strong"><Link to={`${studentsBase}?student=${w.studentId}`} className="fe-link" style={{ color: 'inherit' }}>{w.studentName}</Link>
                      <span className="fe-muted fe-small"> · {w.username}{w.programName ? ` · ${w.programName}` : ''}{levelSuffix(w.level ?? null)}</span></div>
                    <div className="fe-small" style={{ marginTop: 2 }}>{w.number} · <b>{PAYOUT[w.payout]}</b>{w.payoutDetails ? `: ${w.payoutDetails}` : ''}</div>
                    <div className="fe-muted fe-small sw-wrap">“{w.reason}” · asked {formatDate(w.requestedAt)}</div>
                    <Trail w={w} />
                    {short && <div className="fe-small" style={{ color: '#f87171', marginTop: 4 }}>The wallet now holds only {formatMoney(w.walletBalance!, cur)}.</div>}
                  </div>
                  <div className="bl-amt">
                    <div className="fe-strong" style={{ fontSize: 16 }}>{formatMoney(w.amount, cur)}</div>
                    {FINAL[w.status] ? <span className={`fe-pill ${FINAL[w.status][0]}`}>{FINAL[w.status][1]}</span>
                      : w.walletBalance != null && <div className="fe-muted fe-small">wallet {formatMoney(w.walletBalance, cur)}</div>}
                  </div>
                  {(canReview || canApprove || canPay || canReject) && (
                    <div className="sw-acts">
                      {canReview && <button type="button" className="fe-btn sm" disabled={busy === w.id} onClick={() => review(w)}>{busy === w.id ? <Loader2 size={13} className="fe-spin" /> : <ClipboardCheck size={14} />} Review</button>}
                      {canApprove && <button type="button" className="fe-btn sm" disabled={busy === w.id} onClick={() => approve(w)}>{busy === w.id ? <Loader2 size={13} className="fe-spin" /> : <CheckCircle2 size={14} />} Approve</button>}
                      {canPay && <button type="button" className="fe-btn sm" disabled={busy === w.id} onClick={() => setPaying(w)}><Banknote size={14} /> Pay out</button>}
                      {canReject && <button type="button" className="fe-ghost sm danger" disabled={busy === w.id} onClick={() => reject(w)}><Ban size={13} /> Reject</button>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </>}

      {paying && <PayOutModal w={paying} currency={cur} onClose={() => setPaying(null)} onDone={() => { setPaying(null); refresh(); }} />}
      {limitOpen && data && <LimitModal data={data} onClose={() => setLimitOpen(false)} onSaved={next => { qc.setQueryData(['wallet-overview'], next); setLimitOpen(false); }} />}
    </div>
  );
}

/** Who did each step, and when. */
function Trail({ w }: { w: WalletWithdrawalInfo }) {
  const parts = [
    w.reviewedAt && `Reviewed by ${w.reviewedBy} (${formatDate(w.reviewedAt)})${w.reviewNote ? `: ${w.reviewNote}` : ''}`,
    w.approvedAt && `Approved by ${w.approvedBy} (${formatDate(w.approvedAt)})${w.approvalNote ? `: ${w.approvalNote}` : ''}`,
    w.paidAt && `Paid by ${w.paidBy} (${formatDate(w.paidAt)}) · ${w.paidMethod} · voucher ${w.voucher}`,
    w.rejectedAt && `Rejected by ${w.rejectedBy} (${formatDate(w.rejectedAt)}): ${w.rejectReason}`,
    w.cancelledAt && `Cancelled by the student (${formatDate(w.cancelledAt)})`,
  ].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return <ul className="sw-trail">{parts.map(p => <li key={p}>{p}</li>)}</ul>;
}

function PayOutModal({ w, currency, onClose, onDone }: { w: WalletWithdrawalInfo; currency: string; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>(w.payout === 'CASH' ? 'CASH' : w.payout === 'BANK' ? 'BANK_TRANSFER' : 'OTHER');
  const [paidTo, setPaidTo] = useState(w.payoutDetails ? `${w.studentName}, ${w.payoutDetails}` : w.studentName ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { const r = await payOutWithdrawal(w.id, { method, paidTo: paidTo.trim() || undefined }); toast.success(`Paid out · voucher ${r.voucher}`); onDone(); }
    catch (e) { toast.error(errorText(e, 'Could not pay it out')); setBusy(false); }
  };
  return (
    <FeeModal title={`Pay out ${w.number}`} subtitle={`${formatMoney(w.amount, currency)} to ${w.studentName}. It comes out of their wallet as a refund voucher${method === 'CASH' ? ' and goes into your cash-up' : ''}.`}
      onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={busy}>{busy && <Loader2 size={15} className="fe-spin" />} Paid {formatMoney(w.amount, currency)}</button>
        </div>
      </>}>
      <div className="fe-note" style={{ marginBottom: 14 }}><Banknote size={16} />
        <span>The student asked for <b>{PAYOUT[w.payout]}</b>{w.payoutDetails ? `: ${w.payoutDetails}` : ''}. Hand over or send the money first, then record it here.</span></div>
      <div className="fe-field">
        <label className="fe-label" htmlFor="wd-method">Paid by</label>
        <select id="wd-method" className="fe-select" style={{ width: '100%' }} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
          <option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Mobile Money / other</option>
        </select>
      </div>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="wd-to">Paid to</label>
        <input id="wd-to" className="fe-input" style={{ width: '100%' }} maxLength={200} value={paidTo} onChange={e => setPaidTo(e.target.value)}
          placeholder="Who received it, and the number or account" />
      </div>
    </FeeModal>
  );
}

function LimitModal({ data, onClose, onSaved }: { data: WalletOverview; onClose: () => void; onSaved: (next: WalletOverview) => void }) {
  const [text, setText] = useState(data.maxBalance ? String(data.maxBalance) : '');
  const [busy, setBusy] = useState(false);
  const v = text ? parseMoney(text) : 0;
  const bad = !!text && !(v >= 0);
  const save = async () => {
    if (bad) return;
    setBusy(true);
    try { const next = await saveWalletSettings(v > 0 ? v : null); toast.success('Saved'); onSaved(next); }
    catch (e) { toast.error(errorText(e, 'Could not save')); setBusy(false); }
  };
  return (
    <FeeModal title="Wallet limit" subtitle="The most one student's wallet may hold. Leave it empty for no limit." onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={busy || bad}>{busy && <Loader2 size={15} className="fe-spin" />} Save</button>
        </div>
      </>}>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="wl-max">Limit per wallet</label>
        <div className="fe-money"><span>{data.currency}</span>
          <input id="wl-max" className="fe-input" inputMode="decimal" placeholder="No limit" value={text} onChange={e => setText(moneyInput(e.target.value))} /></div>
        <div className="fe-hint">Wallets already above it keep their money; they just can't take more.</div>
      </div>
    </FeeModal>
  );
}

const WALLETS_CSS = `
.sw-tabs { overflow-x: auto; scrollbar-width: none; max-width: 100%; }
.sw-tabs::-webkit-scrollbar { display: none; }
.sw-tabs .fe-tab { white-space: nowrap; }
.sw-short { display: none; }
.sw-count { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: #f59e0b; color: #1f2433; font-size: 11px; font-weight: 800; display: inline-grid; place-items: center; }
.sw-row { align-items: flex-start; flex-wrap: wrap; }
.sw-wrap { overflow-wrap: anywhere; }
.sw-trail { list-style: none; margin: 6px 0 0; padding: 0 0 0 10px; border-left: 2px solid rgba(var(--accent-rgb), 0.35); display: grid; gap: 2px; font-size: 12px; color: rgba(255,255,255,0.55); overflow-wrap: anywhere; }
.sw-acts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; flex: 1 0 100%; }
.fe-ghost.danger { color: #f87171; }
@media (min-width: 900px) { .sw-acts { flex: 0 0 auto; align-self: center; } .sw-row { flex-wrap: nowrap; } }
@media (max-width: 560px) {
  .sw-long { display: none; }
  .sw-short { display: inline; }
  .sw-acts > button { flex: 1 1 0; min-width: 0; justify-content: center; }
}
`;
