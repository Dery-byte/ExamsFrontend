import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ban, Gift, Info, Loader2, PackageCheck, PiggyBank, Plus, Receipt, RotateCcw, Search, Undo2, UserRound, Wallet } from 'lucide-react';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import FeeModal from '../superadmin/fees/FeeModal';
import { RecordPaymentModal } from '../superadmin/fees/PaymentsPanel';
import ReceiptModal from '../user/fees/ReceiptModal';
import NewBillModal from './NewBillModal';
import ConcessionModal from './ConcessionModal';
import { describe } from './ConcessionsPage';
import { HandOverModal } from './StoresPage';
import { BILL_CSS, useBursar } from './BillsPage';
import { AccountsHead, askReason, errorText, Pill, Section } from './accountsUi';
import {
  cancelStudentBill, getStudentStatement, getStudentWallet, recordWalletDeposit, refundStudent, restoreArrears, revokeConcession, searchFeeStudents,
  setOpeningBalance, staffSpendFromWallet, takeBackItems, voidRefund, writeOffArrears, type FeePaymentInfo, type FeeStudentMatch, type MyWallet,
  type PaymentMethod, type WalletTarget,
} from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatMoney, moneyInput, parseMoney, paymentMethodLabel } from '../../utils/money';
import { levelName, periodsPerLevel, tx, levelSuffix } from '../../utils/terms';

/**
 * One student's whole account: arrears, this session's fees (with concessions), bills, credit, every
 * payment and refund. Record a payment or bill them from here; the bursar also grants concessions,
 * writes off arrears, sets an opening balance and refunds credit.
 */
export default function StudentAccountPage() {
  const qc = useQueryClient();
  const bursar = useBursar();
  const [params, setParams] = useSearchParams();
  const id = Number(params.get('student')) || null;
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState<'pay' | 'bill' | 'concession' | 'refund' | 'opening' | 'deposit' | null>(null);
  /** Paying from the wallet: the fee or bill chosen from its row, or null for "choose in the dialog". */
  const [walletPay, setWalletPay] = useState<{ target: WalletTarget | null } | null>(null);
  const { user } = useAuth() as any;
  const walletsPage = user?.role === 'ACCOUNTANT' ? '/accounts/wallets' : '/super-admin/wallets';
  const [receipt, setReceipt] = useState<FeePaymentInfo | null>(null);
  const [handing, setHanding] = useState<{ lineId: number; name: string; quantity: number; issued: number; studentName: string } | null>(null);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const { data: matches = [], isFetching: searching } = useQuery({
    queryKey: ['fee-student-search', term], queryFn: () => searchFeeStudents(term), enabled: term.length >= 2,
  });
  const { data, isLoading } = useQuery({ queryKey: ['student-statement', id], queryFn: () => getStudentStatement(id!), enabled: id != null });
  const { data: wallet } = useQuery({ queryKey: ['student-wallet', id], queryFn: () => getStudentWallet(id!), enabled: id != null });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['student-statement', id] }); qc.invalidateQueries({ queryKey: ['fee-student-search'] });
    qc.invalidateQueries({ queryKey: ['student-wallet', id] }); qc.invalidateQueries({ queryKey: ['wallet-overview'] });
  };
  const choose = (s: FeeStudentMatch) => { setParams({ student: String(s.id) }); setQ(''); };
  const currency = data?.currency ?? 'GHS';
  const act = async (work: () => Promise<unknown>, done: string) => {
    try { await work(); toast.success(done); refresh(); } catch (e) { toast.error(errorText(e, 'That did not work')); }
  };
  const ask = async (title: string, text: string, confirm: string, work: (reason: string) => Promise<unknown>, done: string) => {
    const reason = await askReason(title, text, confirm);
    if (reason) act(() => work(reason), done);
  };

  const credit = data?.accountCredit ?? 0;
  // The developer decides whether the Super Admin / bursar may pay from a student's wallet; the server says if this person may
  const walletPays = !!wallet?.canSpend && wallet.enabled && wallet.available > 0 && wallet.targets.length > 0;
  const walletTarget = (kind: 'FEE' | 'BILL', id: number) => walletPays ? wallet!.targets.find(t => t.kind === kind && t.id === id) : undefined;
  // Why paying from the wallet isn't offered, for the Super Admin and bursars (cashiers never can, so nothing to explain)
  const walletPayHint = !wallet || walletPays || wallet.balance <= 0 ? null
    : !wallet.canSpend ? (bursar ? 'Currently you are not allowed to pay from students’ wallets.' : null)   // bursar: the Super Admin too
    : !wallet.enabled ? 'Paying from the wallet needs the wallet switched on under Feature Controls.'
    : wallet.available <= 0 ? 'All the wallet money is held for a withdrawal request.'
    : wallet.targets.length === 0 ? 'Nothing is owed, so there is nothing to pay from the wallet.' : null;
  const owesSomething = !!data && ((data.dues?.length ?? 0) > 0 || (data.bills ?? []).some(b => b.status !== 'CANCELLED' && b.status !== 'DECLINED')
    || (data.arrears ?? []).some(a => a.status !== 'WRITTEN_OFF'));
  // The record-payment dialog's view of this student
  const match: FeeStudentMatch | undefined = data && {
    id: data.student.id, name: data.student.name, studentId: data.student.studentId, email: data.student.email,
    programName: data.student.programName, level: data.student.level, fee: data.fee?.amount ?? null, items: [],
    balance: owesSomething ? data.toPay ?? 0 : null, dues: data.dues, residency: data.residency, credit,
    bills: (data.bills ?? []).filter(b => b.balance > 0),
  };
  const picked = data && { id: data.student.id, name: data.student.name, studentId: data.student.studentId,
    items: [...new Set((data.dues ?? []).flatMap(d => d.fee.components.map(c => c.name)))] };

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + BILL_CSS}</style>
      <AccountsHead icon={<UserRound size={24} color="#fff" />} title={tx('Student accounts')}
        sub={tx('Everything a student owes and has paid: earlier years, fees by semester, bills and credit.')}
        actions={data ? <>
          <button type="button" className="fe-ghost" onClick={() => setOpen('bill')}><Plus size={15} /> Bill</button>
          {bursar && <button type="button" className="fe-ghost" onClick={() => setOpen('concession')}><Gift size={15} /> Concession</button>}
          {bursar && credit > 0 && <button type="button" className="fe-ghost" onClick={() => setOpen('refund')}><Undo2 size={15} /> Refund</button>}
          {wallet?.enabled && <button type="button" className="fe-ghost" onClick={() => setOpen('deposit')}><PiggyBank size={15} /> Wallet deposit</button>}
          {walletPays && <button type="button" className="fe-ghost" onClick={() => setWalletPay({ target: null })}><PiggyBank size={15} /> Pay from wallet</button>}
          <button type="button" className="fe-btn" onClick={() => setOpen('pay')} disabled={match?.balance == null}><Wallet size={15} /> Record payment</button>
        </> : undefined} />

      <div className="fe-field" style={{ position: 'relative' }}>
        <div className="fe-search">
          <Search size={15} />
          <input className="fe-input" placeholder={tx('Find a student: name, Student ID or email')} value={q} onChange={e => setQ(e.target.value)} autoComplete="off" aria-label="Find a student" />
        </div>
        {term.length >= 2 && q && (
          <div className="fe-results" role="listbox">
            {searching && matches.length === 0 ? <div className="fe-muted fe-small" style={{ padding: 12 }}><Loader2 size={13} className="fe-spin" /> Searching…</div>
              : matches.length === 0 ? <div className="fe-muted fe-small" style={{ padding: 12 }}>{tx('No students match')} “{term}”.</div>
              : matches.map(s => (
                <button type="button" key={s.id} className="fe-result" role="option" aria-selected={s.id === id} onClick={() => choose(s)}>
                  <span style={{ minWidth: 0 }}>
                    <span className="fe-strong" style={{ display: 'block' }}>{s.name}</span>
                    <span className="fe-muted fe-small">{s.studentId}{s.programName ? ` · ${s.programName}` : ''}{levelSuffix(s.level)}</span>
                  </span>
                  <span className="fe-small" style={{ whiteSpace: 'nowrap', color: s.balance ? '#fbbf24' : 'rgba(255,255,255,0.45)' }}>{s.balance != null ? `Owes ${formatMoney(s.balance, currency)}` : '—'}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {id == null ? (
        <div className="fe-card"><div className="fe-empty"><UserRound size={34} style={{ color: 'rgba(var(--accent-rgb), 0.45)' }} />
          <h3>{tx('Find a student')}</h3><p>{tx('Search above to open their account.')}</p></div></div>
      ) : isLoading || !data ? (
        <div className="fe-card" style={{ padding: 18 }}><div className="fe-skel" style={{ height: 160 }} /></div>
      ) : (
        <>
          <div className="fe-card" style={{ padding: '14px 16px', marginBottom: 14 }}>
            <div className="fe-strong" style={{ fontSize: 16 }}>{data.student.name}</div>
            <div className="fe-muted fe-small">{data.student.studentId}{data.student.programName ? ` · ${data.student.programName}` : ''}{levelSuffix(data.student.level)}
              {data.residency ? ` · ${data.residency === 'BOARDING' ? 'Boarder' : 'Day student'}` : ''} · {data.session.name}</div>
            <div className="bl-kpis" style={{ marginTop: 12, marginBottom: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              {(data.arrearsBalance ?? 0) > 0 && <div><span>Earlier years</span><b style={{ color: '#f87171' }}>{formatMoney(data.arrearsBalance ?? 0, currency)}</b></div>}
              <div><span>Fees owed</span><b>{formatMoney(data.totalBalance ?? 0, currency)}</b></div>
              <div><span>Bills owed</span><b>{formatMoney(data.billsBalance ?? 0, currency)}</b></div>
              <div><span>Credit</span><b style={{ color: '#34d399' }}>{formatMoney(credit, currency)}</b></div>
              <div><span>To pay</span><b style={{ color: (data.toPay ?? 0) > 0 ? '#fbbf24' : '#34d399' }}>{formatMoney(data.toPay ?? 0, currency)}</b></div>
            </div>
          </div>

          {wallet && (wallet.enabled || wallet.balance > 0 || wallet.history.length > 0) && <WalletSection wallet={wallet} walletsPage={walletsPage} onReceipt={setReceipt}
            onPay={walletPays ? () => setWalletPay({ target: null }) : undefined} payHint={walletPayHint} />}

          {((data.arrears?.length ?? 0) > 0 || bursar) && (
            <Section title="Earlier years (arrears)" empty="No arrears." count={data.arrears?.length ?? 0}
              action={bursar ? <button type="button" className="fe-ghost sm" onClick={() => setOpen('opening')}><Plus size={13} /> Opening balance</button> : undefined}>
              {(data.arrears ?? []).map(a => (
                <li key={a.id} className="bl-row" style={a.status === 'WRITTEN_OFF' ? { opacity: 0.6 } : undefined}>
                  <div className="bl-main"><div className="fe-strong">{a.label}</div>
                    <div className="fe-muted fe-small">{formatMoney(a.amount, currency)}{a.paid > 0 ? ` · ${formatMoney(a.paid, currency)} paid` : ''}{a.note ? ` · ${a.note}` : ''}{a.status === 'WRITTEN_OFF' ? ` · written off by ${a.statusBy}: ${a.statusNote}` : ''}</div></div>
                  <div className="bl-amt"><Pill status={a.status} />{a.balance > 0 && <div className="fe-muted fe-small" style={{ marginTop: 4 }}>owes {formatMoney(a.balance, currency)}</div>}</div>
                  {bursar && (a.status === 'WRITTEN_OFF'
                    ? <button type="button" className="fe-icon-btn" onClick={() => act(() => restoreArrears(a.id), 'Restored')} aria-label="Restore"><RotateCcw size={14} /></button>
                    : a.balance > 0 && <button type="button" className="fe-ghost sm" onClick={() => ask(`Write off ${formatMoney(a.balance, currency)}?`, 'It stops being owed. It is recorded and can be restored.', 'Write off', r => writeOffArrears(a.id, r), 'Written off')}>Write off</button>)}
                </li>
              ))}
            </Section>
          )}

          <Section title="School fees" empty={data.status === 'NO_CLASS' ? tx('No programme or level recorded.') : 'No fee owed for their class this session.'} count={(data.dues?.length ?? 0) + (data.upcoming?.length ?? 0)}>
            {(data.dues ?? []).map(d => (
              <li key={d.fee.id} className="bl-row">
                <div className="bl-main"><div className="fe-strong">{tx(d.fee.periodName ?? 'Fee')}</div>
                  <div className="fe-muted fe-small">{formatMoney(d.fee.amount, currency)}{(d.discount ?? 0) > 0 ? ` (after ${formatMoney(d.discount, currency)} off: ${d.concessions?.join(', ')})` : ''}{d.paid > 0 ? ` · ${formatMoney(d.paid, currency)} paid` : ''}{d.fee.dueDate ? ` · due ${formatDate(d.fee.dueDate)}` : ''}</div></div>
                <div className="bl-amt"><Pill status={d.status} />
                  {d.balance > 0 && <div className="fe-muted fe-small" style={{ marginTop: 4 }}>owes {formatMoney(d.balance, currency)}</div>}</div>
                {walletTarget('FEE', d.fee.id) && <FromWallet onClick={() => setWalletPay({ target: walletTarget('FEE', d.fee.id)! })} label={tx(d.fee.periodName ?? 'Fee')} />}
              </li>
            ))}
            {(data.upcoming ?? []).map(u => (
              <li key={u.id} className="bl-row" style={{ opacity: 0.55 }}>
                <div className="bl-main"><div className="fe-strong">{tx(u.periodName ?? 'Fee')}</div><div className="fe-muted fe-small">{formatMoney(u.amount, currency)}</div></div>
                <div className="bl-amt"><span className="fe-pill ABANDONED">Coming up</span></div>
              </li>
            ))}
          </Section>

          {(data.concessions?.length ?? 0) > 0 && (
            <Section title="Concessions" empty="" count={data.concessions!.length}>
              {data.concessions!.map(c => (
                <li key={c.id} className="bl-row" style={c.active ? undefined : { opacity: 0.55 }}>
                  <div className="bl-main"><div className="fe-strong">{c.title} <span className="fe-muted fe-small">· {c.kindLabel} · {c.sessionName}</span></div>
                    <div className="fe-muted fe-small">{describe(c, currency)} · {c.active ? c.note : `revoked by ${c.revokedBy}: ${c.revokeReason}`}</div></div>
                  <div className="bl-amt"><span className={`fe-pill ${c.active ? 'SUCCESS' : 'VOIDED'}`}>{c.active ? 'Active' : 'Revoked'}</span></div>
                  {bursar && c.active && <button type="button" className="fe-icon-btn danger" onClick={() => ask(`Revoke “${c.title}”?`, 'Their fee goes back up.', 'Revoke', r => revokeConcession(c.id, r), 'Concession revoked')} aria-label={`Revoke ${c.title}`}><Ban size={14} /></button>}
                </li>
              ))}
            </Section>
          )}

          <Section title="Bills" empty="No bills." count={data.bills?.length ?? 0}>
            {(data.bills ?? []).map(b => (
              <li key={b.id} className="bl-row" style={b.status === 'CANCELLED' || b.status === 'DECLINED' ? { opacity: 0.6 } : undefined}>
                <div className="bl-main"><div className="fe-strong">{b.title}{b.optional ? ' (optional)' : ''}</div>
                  <div className="fe-muted fe-small">{b.lines.length === 1 && b.lines[0].name === b.title && b.lines[0].quantity === 1 ? '' : `${b.lines.map(l => l.quantity > 1 ? `${l.name} × ${l.quantity}` : l.name).join(', ')} · `}{formatMoney(b.amount, currency)} · {formatDate(b.createdAt)}{b.statusNote ? ` · ${b.statusNote}` : ''}</div>
                  {b.status !== 'CANCELLED' && b.status !== 'DECLINED' && b.lines.filter(l => l.stocked && l.lineId).map(l => (
                    <div key={l.lineId} className="fe-small" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                      <span className={(l.issued ?? 0) >= l.quantity ? 'fe-muted' : ''} style={(l.issued ?? 0) < l.quantity ? { color: '#fbbf24' } : undefined}>
                        <PackageCheck size={12} style={{ verticalAlign: -1 }} /> {l.name}: {l.issued ?? 0} of {l.quantity} handed over</span>
                      {(l.issued ?? 0) < l.quantity && <button type="button" className="fe-ghost sm" onClick={() => setHanding({ lineId: l.lineId!, name: l.name, quantity: l.quantity, issued: l.issued ?? 0, studentName: data.student.name })}>Hand over</button>}
                      {(l.issued ?? 0) > 0 && <button type="button" className="fe-ghost sm" onClick={() => ask(`Take back ${l.issued} ${l.name}?`, 'They go back into the store.', 'Take back', r => takeBackItems(l.lineId!, l.issued ?? 0, r), 'Back in the store')}>Take back</button>}
                    </div>
                  ))}</div>
                <div className="bl-amt"><Pill status={b.status} />
                  {b.balance > 0 && <div className="fe-muted fe-small" style={{ marginTop: 4 }}>owes {formatMoney(b.balance, currency)}</div>}</div>
                {walletTarget('BILL', b.id) && <FromWallet onClick={() => setWalletPay({ target: walletTarget('BILL', b.id)! })} label={b.title} />}
                {bursar && b.status !== 'CANCELLED' && b.status !== 'DECLINED' && (
                  <button type="button" className="fe-icon-btn danger" onClick={() => ask(`Cancel “${b.title}”?`, 'Anything already paid on it becomes credit for their other debts.', 'Cancel bill', r => cancelStudentBill(b.id, r), 'Bill cancelled')} aria-label={`Cancel ${b.title}`}><Ban size={14} /></button>
                )}
              </li>
            ))}
          </Section>

          <Section title="Payments" empty="No payments yet." count={data.payments.length}>
            {data.payments.map(p => (
              <li key={p.id} className="bl-row" style={p.status === 'VOIDED' ? { opacity: 0.6 } : undefined}>
                <div className="bl-main"><div className="fe-strong">{formatMoney(p.amount, p.currency)} <span className="fe-muted fe-small">{paymentMethodLabel(p)} · {formatDate(p.paidAt ?? p.createdAt)}</span></div>
                  <div className="fe-muted fe-small">{p.receiptNo ?? p.reference}{(p.allocations?.length ?? 0) > 0 ? ` · ${p.allocations!.map(a => tx(a.label)).join(', ')}` : ''}{p.recordedBy ? ` · by ${p.recordedBy}` : ''}</div></div>
                <div className="bl-amt"><Pill status={p.status} /></div>
                {(p.status === 'SUCCESS' || p.status === 'VOIDED') && <button type="button" className="fe-ghost sm" onClick={() => setReceipt(p)}><Receipt size={13} /> Receipt</button>}
              </li>
            ))}
          </Section>

          {(data.refunds?.length ?? 0) > 0 && (
            <Section title="Refunds" empty="" count={data.refunds!.length}>
              {data.refunds!.map(r => (
                <li key={r.id} className="bl-row" style={r.status === 'VOIDED' ? { opacity: 0.6 } : undefined}>
                  <div className="bl-main"><div className="fe-strong">{formatMoney(r.amount, r.currency)} <span className="fe-muted fe-small">{r.number} · {r.methodName} · {formatDate(r.paidAt)}</span></div>
                    <div className="fe-muted fe-small">{r.reason}{r.paidTo ? ` · ${r.paidTo}` : ''} · by {r.paidBy}{r.status === 'VOIDED' ? ` · cancelled${r.voidReason ? `: ${r.voidReason}` : ''}` : ''}</div></div>
                  <div className="bl-amt"><Pill status={r.status} /></div>
                  {bursar && r.status === 'DONE' && <button type="button" className="fe-icon-btn danger" onClick={() => ask('Cancel this refund?', 'The money becomes credit on the account again.', 'Cancel refund', x => voidRefund(r.id, x), 'Refund cancelled')} aria-label="Cancel refund"><Ban size={14} /></button>}
                </li>
              ))}
            </Section>
          )}
        </>
      )}

      {open === 'pay' && match && <RecordPaymentModal currency={currency} initial={match} onClose={() => setOpen(null)} onSaved={p => { setOpen(null); refresh(); setReceipt(p); }} />}
      {open === 'bill' && picked && <NewBillModal bursar={bursar} student={picked}
        onClose={() => setOpen(null)} onIssued={() => { setOpen(null); refresh(); qc.invalidateQueries({ queryKey: ['bill-batches'] }); }} />}
      {open === 'concession' && picked && <ConcessionModal student={picked} currency={currency} terms={periodsPerLevel()}
        onClose={() => setOpen(null)} onSaved={() => { setOpen(null); refresh(); qc.invalidateQueries({ queryKey: ['concessions'] }); }} />}
      {open === 'refund' && data && <RefundModal studentId={data.student.id} name={data.student.name} credit={credit} currency={currency}
        onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} />}
      {open === 'opening' && data && <OpeningModal studentId={data.student.id} currency={currency}
        onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); qc.invalidateQueries({ queryKey: ['year-end'] }); }} />}
      {walletPay && wallet && <WalletPayModal wallet={wallet} initial={walletPay.target}
        onClose={() => setWalletPay(null)} onDone={() => { setWalletPay(null); refresh(); }} />}
      {open === 'deposit' && wallet && <WalletDepositModal wallet={wallet}
        onClose={() => setOpen(null)} onDone={p => { setOpen(null); refresh(); setReceipt(p); }} />}
      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
      {handing && <HandOverModal line={handing} onClose={() => setHanding(null)} onDone={() => { setHanding(null); refresh(); qc.invalidateQueries({ queryKey: ['stores'] }); }} />}
    </div>
  );
}

const WD_TEXT: Record<string, string> = {
  REQUESTED: 'Waiting for the bursar', REVIEWED: 'Waiting for approval', APPROVED: 'Approved, to pay out', PAID: 'Paid out',
  REJECTED: 'Rejected', CANCELLED: 'Cancelled', REVERSED: 'Voucher cancelled',
};

/** The student's wallet: what it holds, a withdrawal in progress, and the latest money in and out. */
function WalletSection({ wallet, walletsPage, onReceipt, onPay, payHint }: {
  wallet: MyWallet; walletsPage: string; onReceipt: (p: FeePaymentInfo) => void; onPay?: () => void; payHint?: string | null;
}) {
  const cur = wallet.currency;
  const pending = wallet.withdrawals.find(w => ['REQUESTED', 'REVIEWED', 'APPROVED'].includes(w.status));
  const recent = wallet.history.slice(0, 6);
  return (
    <Section title={`Wallet${wallet.enabled ? '' : ' (switched off)'}`} empty="Nothing paid into the wallet yet." count={recent.length + (pending ? 1 : 0) + (payHint ? 1 : 0)}
      action={<span className="fe-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span><b style={{ color: '#34d399' }}>{formatMoney(wallet.balance, cur)}</b>
          {wallet.held > 0 && <span className="fe-muted"> · {formatMoney(wallet.held, cur)} held</span>}</span>
        {onPay && <button type="button" className="fe-ghost sm" onClick={onPay}><PiggyBank size={13} /> Pay from wallet</button>}</span>}>
      {payHint && (
        <li className="bl-row" role="note">
          <div className="bl-main fe-muted fe-small" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} /><span>{payHint}</span></div>
        </li>
      )}
      {pending && (
        <li className="bl-row">
          <div className="bl-main"><div className="fe-strong">Withdrawal {pending.number}</div>
            <div className="fe-muted fe-small">{WD_TEXT[pending.status]} · asked {formatDate(pending.requestedAt)}</div></div>
          <div className="bl-amt"><div className="fe-strong" style={{ color: '#fbbf24' }}>{formatMoney(pending.amount, cur)}</div>
            <Link to={walletsPage} className="fe-link fe-small">Open requests</Link></div>
        </li>
      )}
      {recent.map((e, i) => (
        <li key={`${e.type}-${e.reference}-${i}`} className="bl-row" style={e.status === 'VOIDED' ? { opacity: 0.6 } : undefined}>
          <div className="bl-main"><div className="fe-strong">{e.type === 'DEPOSIT' ? 'Deposit' : e.type === 'SPEND' ? 'Paid from wallet' : 'Withdrawn'}
            <span className="fe-muted fe-small"> · {formatDate(e.at)}</span></div>
            <div className="fe-muted fe-small" style={{ overflowWrap: 'anywhere' }}>{e.reference}{e.type === 'SPEND' ? ` · ${tx(e.label)}` : ''}
              {e.by ? ` · paid by ${e.by}${e.note ? `: ${e.note}` : ''}` : ''}
              {e.payment?.recordedBy ? ` · by ${e.payment.recordedBy}` : ''}{e.status === 'VOIDED' ? ' · cancelled' : e.status === 'REVERSED' ? ' · voucher cancelled' : ''}</div></div>
          <div className="bl-amt"><div className="fe-strong" style={{ color: e.type === 'DEPOSIT' ? '#34d399' : undefined }}>{e.type === 'DEPOSIT' ? '+' : '−'}{formatMoney(e.amount, cur)}</div></div>
          {e.payment && (e.status === 'SUCCESS' || e.status === 'VOIDED') && <button type="button" className="fe-ghost sm" onClick={() => onReceipt(e.payment!)}><Receipt size={13} /> Receipt</button>}
        </li>
      ))}
    </Section>
  );
}

/** Row button: pay this fee or bill from the student's wallet. */
function FromWallet({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" className="fe-ghost sm" onClick={onClick} aria-label={`Pay ${label} from the wallet`}><PiggyBank size={13} /> From wallet</button>;
}

/**
 * The Super Admin or bursar pays a fee, a bill or everything owed from the student's wallet (when the
 * developer allows it). Full balance or a part, and a reason, which the student sees.
 */
function WalletPayModal({ wallet, initial, onClose, onDone }: { wallet: MyWallet; initial: WalletTarget | null; onClose: () => void; onDone: () => void }) {
  const cur = wallet.currency;
  const [pick, setPick] = useState<WalletTarget>(initial ?? wallet.targets[0]);
  const [mode, setMode] = useState<'max' | 'part'>('max');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const most = Math.round(Math.min(pick.balance, wallet.available) * 100) / 100;
  const covers = wallet.available >= pick.balance;
  const v = mode === 'max' ? most : parseMoney(amount);
  const problem = mode === 'max'
    ? (!covers && !wallet.partPayment ? `Part payments are switched off, and the wallet's ${formatMoney(wallet.available, cur)} doesn't cover the ${formatMoney(pick.balance, cur)} owed.` : null)
    : !amount ? null : !(v > 0) ? 'Enter a valid amount.'
    : v > wallet.available ? `Only ${formatMoney(wallet.available, cur)} is free in the wallet.`
    : v > pick.balance ? `That's more than the ${formatMoney(pick.balance, cur)} owed.` : null;
  const ok = v > 0 && !problem && note.trim().length > 0;
  const choose = (t: WalletTarget) => { setPick(t); setMode('max'); setAmount(''); };

  const save = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      await staffSpendFromWallet(wallet.student.id, {
        ...(pick.kind === 'FEE' ? { scheduleId: pick.id! } : pick.kind === 'BILL' ? { billId: pick.id! } : {}),
        amount: Math.round(v * 100) / 100, note: note.trim(),
      });
      toast.success(`Paid ${formatMoney(v, cur)} from ${wallet.student.name}'s wallet`);
      onDone();
    } catch (e) { toast.error(errorText(e, 'Could not pay from the wallet')); setBusy(false); }
  };

  return (
    <FeeModal title={`Pay from ${wallet.student.name}'s wallet`} subtitle={`${formatMoney(wallet.available, cur)} free to use${wallet.held > 0 ? ` (${formatMoney(wallet.held, cur)} held for a withdrawal)` : ''}. The student is told.`}
      onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={!ok || busy}>{busy && <Loader2 size={15} className="fe-spin" />} Pay {v > 0 ? formatMoney(v, cur) : ''}</button>
        </div>
      </>}>
      <style>{WALLET_PAY_CSS}</style>
      <div className="fe-field">
        <span className="fe-label" id="wp-what">What to pay</span>
        <div className="wp-targets" role="radiogroup" aria-labelledby="wp-what">
          {wallet.targets.map(t => {
            const on = t.kind === pick.kind && t.id === pick.id;
            return (
              <label key={`${t.kind}-${t.id}`} className={`fe-check wp-target${on ? ' on' : ''}`}>
                <input type="radio" name="wp-target" checked={on} onChange={() => choose(t)} />
                <span className="wp-target-name">{t.kind === 'ALL' ? 'Everything owed, oldest first' : tx(t.label)}
                  <small className="fe-muted">{t.kind === 'ALL' ? 'Earlier years, then fees by term, then bills' : t.kind === 'BILL' ? 'Bill' : 'School fees'}</small></span>
                <b className="wp-target-amt">{formatMoney(t.balance, cur)}</b>
              </label>
            );
          })}
        </div>
      </div>
      {wallet.partPayment && (
        <div className="fe-field">
          <div className="fe-seg" role="radiogroup" aria-label="How much">
            <button type="button" role="radio" aria-checked={mode === 'max'} className={mode === 'max' ? 'active' : ''} onClick={() => setMode('max')}>
              {covers ? 'Full balance' : 'All the wallet can'}<small>{formatMoney(most, cur)}</small></button>
            <button type="button" role="radio" aria-checked={mode === 'part'} className={mode === 'part' ? 'active' : ''} onClick={() => setMode('part')}>
              Other amount<small>up to {formatMoney(most, cur)}</small></button>
          </div>
        </div>
      )}
      {mode === 'part' && (
        <div className="fe-field">
          <label className="fe-label" htmlFor="wp-amt">Amount</label>
          <div className="fe-money"><span>{cur}</span><input id="wp-amt" className="fe-input" inputMode="decimal" placeholder="0.00" autoFocus value={amount} onChange={e => setAmount(moneyInput(e.target.value))} /></div>
        </div>
      )}
      {problem && <div className="fe-hint" style={{ color: '#f87171', marginTop: -6, marginBottom: 12 }}>{problem}</div>}
      {mode === 'max' && !problem && !covers && <div className="fe-hint" style={{ marginTop: -6, marginBottom: 12 }}>{formatMoney(Math.round((pick.balance - most) * 100) / 100, cur)} will still be owed.</div>}
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="wp-note">Reason <span className="fe-muted" style={{ fontWeight: 500 }}>(the student sees it)</span></label>
        <input id="wp-note" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. Student asked at the counter to pay the uniform bill" value={note} onChange={e => setNote(e.target.value)} />
      </div>
    </FeeModal>
  );
}

const WALLET_PAY_CSS = `
.wp-targets { display: grid; gap: 6px; max-height: min(280px, 40vh); overflow-y: auto; overscroll-behavior: contain; }
.wp-target { display: flex; width: 100%; box-sizing: border-box; gap: 10px; align-items: center; }
.wp-target-name { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow-wrap: anywhere; }
.wp-target-name small { font-size: 11.5px; }
.wp-target-amt { white-space: nowrap; font-variant-numeric: tabular-nums; }
@media (pointer: coarse) { .wp-target { min-height: 44px; } .wp-target input { width: 18px; height: 18px; } }
`;

function WalletDepositModal({ wallet, onClose, onDone }: { wallet: MyWallet; onClose: () => void; onDone: (p: FeePaymentInfo) => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const cur = wallet.currency;
  const v = parseMoney(amount);
  const room = wallet.maxBalance ? Math.max(0, wallet.maxBalance - wallet.balance) : null;
  const tooMuch = room != null && v > room;
  const save = async () => {
    if (!(v > 0) || tooMuch) return;
    setBusy(true);
    try { const p = await recordWalletDeposit(wallet.student.id, { amount: v, method, note: note.trim() || undefined }); toast.success(`Deposit ${p.receiptNo} recorded`); onDone(p); }
    catch (e) { toast.error(errorText(e, 'Could not record the deposit')); setBusy(false); }
  };
  return (
    <FeeModal title={`Wallet deposit · ${wallet.student.name}`} subtitle={`Money paid in ahead. It stays in their wallet (now ${formatMoney(wallet.balance, cur)}) until they use it.`}
      onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={!(v > 0) || tooMuch || busy}>{busy && <Loader2 size={15} className="fe-spin" />} Record {v > 0 ? formatMoney(v, cur) : ''}</button>
        </div>
      </>}>
      <div className="fe-grid2">
        <div className="fe-field">
          <label className="fe-label" htmlFor="wdp-amt">Amount</label>
          <div className="fe-money"><span>{cur}</span><input id="wdp-amt" className="fe-input" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(moneyInput(e.target.value))} /></div>
          {tooMuch && <div className="fe-hint" style={{ color: '#f87171' }}>The wallet limit allows {formatMoney(room!, cur)} more.</div>}
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="wdp-method">Paid by</label>
          <select id="wdp-method" className="fe-select" style={{ width: '100%' }} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
            <option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer / deposit</option><option value="OTHER">Other (e.g. Mobile Money)</option>
          </select>
        </div>
      </div>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="wdp-note">Note <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
        <input id="wdp-note" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. Paid by Mr. Owusu (father)" value={note} onChange={e => setNote(e.target.value)} />
      </div>
    </FeeModal>
  );
}

function RefundModal({ studentId, name, credit, currency, onClose, onDone }: { studentId: number; name: string; credit: number; currency: string; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(credit));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [paidTo, setPaidTo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const v = parseMoney(amount);
  const ok = v > 0 && v <= credit && reason.trim().length > 0;
  const save = async () => {
    if (!ok) return;
    setBusy(true);
    try { const r = await refundStudent({ studentId, amount: v, method, paidTo: paidTo.trim() || undefined, reason: reason.trim() }); toast.success(`Refund ${r.number} recorded`); onDone(); }
    catch (e) { toast.error(errorText(e, 'Could not refund')); }
    finally { setBusy(false); }
  };
  return (
    <FeeModal title={`Refund ${name}`} subtitle={`Pays back credit: ${formatMoney(credit, currency)} available.`} onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={!ok || busy}>{busy && <Loader2 size={15} className="fe-spin" />} Refund {v > 0 ? formatMoney(v, currency) : ''}</button>
        </div>
      </>}>
      <div className="fe-grid2">
        <div className="fe-field">
          <label className="fe-label" htmlFor="rf-amt">Amount</label>
          <div className="fe-money"><span>{currency}</span><input id="rf-amt" className="fe-input" inputMode="decimal" value={amount} onChange={e => setAmount(moneyInput(e.target.value))} /></div>
          {v > credit && <div className="fe-hint" style={{ color: '#f87171' }}>More than the credit.</div>}
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="rf-method">Paid back by</label>
          <select id="rf-method" className="fe-select" style={{ width: '100%' }} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
            <option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="PAYSTACK">Paystack refund</option><option value="OTHER">Other (e.g. Mobile Money)</option>
          </select>
        </div>
      </div>
      <div className="fe-field">
        <label className="fe-label" htmlFor="rf-to">Paid to <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
        <input id="rf-to" className="fe-input" style={{ width: '100%' }} maxLength={200} placeholder="e.g. Mr. Owusu (father), MoMo 024 000 0000" value={paidTo} onChange={e => setPaidTo(e.target.value)} />
      </div>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="rf-why">Reason</label>
        <input id="rf-why" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. Overpaid; leaving the school" value={reason} onChange={e => setReason(e.target.value)} />
      </div>
    </FeeModal>
  );
}

function OpeningModal({ studentId, currency, onClose, onDone }: { studentId: number; currency: string; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const v = parseMoney(amount);
  const save = async () => {
    if (!(v > 0)) return;
    setBusy(true);
    try { await setOpeningBalance(studentId, v, note.trim() || undefined); toast.success('Opening balance saved'); onDone(); }
    catch (e) { toast.error(errorText(e, 'Could not save')); }
    finally { setBusy(false); }
  };
  return (
    <FeeModal title="Opening balance" subtitle="What the student owed before the school used this system. Replaces an earlier one they haven't paid on." onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={!(v > 0) || busy}>{busy && <Loader2 size={15} className="fe-spin" />} Save</button>
        </div>
      </>}>
      <div className="fe-field">
        <label className="fe-label" htmlFor="ob-amt">Amount owed</label>
        <div className="fe-money"><span>{currency}</span><input id="ob-amt" className="fe-input" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(moneyInput(e.target.value))} /></div>
      </div>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="ob-note">Note <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
        <input id="ob-note" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. From the 2024 ledger, page 12" value={note} onChange={e => setNote(e.target.value)} />
      </div>
    </FeeModal>
  );
}
