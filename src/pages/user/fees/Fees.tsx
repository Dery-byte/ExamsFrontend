import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CreditCard, FileText, History, Info, Landmark, Layers, Loader2,
  Lock, PiggyBank, Receipt, RefreshCw, ShieldCheck, ShoppingBag, Smartphone, Wallet, X, XCircle,
} from 'lucide-react';
import Swal from 'sweetalert2';
import PageHeader from '../../../components/PageHeader';
import {
  confirmFeePayment, declineBill, getMyFees, getMyWallet, spendFromWallet, startFeePayment, type FeeDue, type FeePaymentInfo, type MyFees,
  type MyWallet, type StudentBillInfo,
} from '../../../api/endpoints';
import { formatDate, formatMoney, moneyInput, parseMoney, paymentMethodLabel, roundMoney } from '../../../utils/money';
import { levelName, tx, isSchoolMode } from '../../../utils/terms';
import { STUDENT_FEE_CSS } from './studentFeeStyles';
import FeeDialog from './FeeDialog';
import ReceiptModal from './ReceiptModal';
import ResultsHoldNotice from '../../../components/academic/ResultsHoldNotice';

type Banner =
  | { kind: 'checking' }
  | { kind: 'ok'; payment: FeePaymentInfo }
  | { kind: 'wait'; reference: string }
  | { kind: 'bad'; message: string }
  | { kind: 'cancelled' };

const STATUS_LABEL: Record<string, string> = { SUCCESS: 'Paid', PENDING: 'Processing', FAILED: 'Failed', ABANDONED: 'Not completed' };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Student: this session's fees (the whole-year fee, or each term owed so far, oldest first), the
 * breakdown, their bills (uniform, books …; optional ones can be declined), what's been paid, and
 * paying online with Paystack.
 */
export default function Fees() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  // Paystack sends the student back with ?reference=… (or ?cancelled=… from its Cancel button)
  const [returnRef] = useState(() => params.get('reference') || params.get('trxref'));
  const [cancelledRef] = useState(() => params.get('cancelled'));
  const [banner, setBanner] = useState<Banner | null>(cancelledRef ? { kind: 'cancelled' } : null);
  /** Open pay dialog for one fee (term) or one bill; items = breakdown items chosen from the list (empty = let the student choose). */
  const [paying, setPaying] = useState<{ due?: FeeDue; bill?: StudentBillInfo; items: string[] } | null>(null);
  const [receipt, setReceipt] = useState<FeePaymentInfo | null>(null);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['my-fees'], queryFn: getMyFees, retry: false });
  const hidden = (error as any)?.response?.status === 403;
  // The wallet shows here while it's on, or while the student still has money in it
  const { data: walletData } = useQuery({ queryKey: ['my-wallet'], queryFn: getMyWallet, retry: false, enabled: !!data });
  const wallet = walletData && typeof walletData.balance === 'number' && (walletData.enabled === true || walletData.balance > 0) ? walletData : undefined;

  useEffect(() => {
    if (returnRef || cancelledRef) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkPayment = async (reference: string, alive: () => boolean) => {
    setBanner({ kind: 'checking' });
    // Mobile Money approvals can take a little while; ask a few times before showing "processing"
    for (const wait of [0, 2000, 3000, 4000, 6000, 8000]) {
      if (wait) await sleep(wait);
      if (!alive()) return;
      try {
        const p = await confirmFeePayment(reference);
        if (!alive()) return;
        if (p.status === 'SUCCESS') { setBanner({ kind: 'ok', payment: p }); qc.invalidateQueries({ queryKey: ['my-fees'] }); return; }
        if (p.status === 'FAILED') { setBanner({ kind: 'bad', message: p.message || 'The payment did not go through. You have not been charged.' }); qc.invalidateQueries({ queryKey: ['my-fees'] }); return; }
        if (p.status === 'ABANDONED') { setBanner({ kind: 'cancelled' }); return; }
      } catch (e: any) {
        if (e?.response?.status === 404) { setBanner({ kind: 'bad', message: 'We could not find that payment.' }); return; }
      }
    }
    if (alive()) { setBanner({ kind: 'wait', reference }); qc.invalidateQueries({ queryKey: ['my-fees'] }); }
  };

  useEffect(() => {
    if (!returnRef) return;
    let alive = true;
    checkPayment(returnRef, () => alive);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnRef]);

  return (
    <div className="sf animate-fade-in">
      <style>{STUDENT_FEE_CSS}</style>
      <PageHeader title="School Fees" breadcrumbs={['Portal', 'Fees']} />

      {banner && <ResultBanner banner={banner} currency={data?.currency ?? 'GHS'} onClose={() => setBanner(null)}
        onRecheck={ref => checkPayment(ref, () => true)} onReceipt={setReceipt} />}

      {isLoading ? <Skeleton /> : hidden ? (
        <div className="sf-card"><Empty icon={<Lock size={28} />} title="Fees aren't available yet"
          text="The school hasn't opened fee payment on the portal. Please check with the accounts office." /></div>
      ) : error || !data ? (
        <div className="sf-card"><Empty icon={<AlertTriangle size={28} />} title="We couldn't load your fees"
          text={<>Check your connection and <button className="sf-link-btn" onClick={() => refetch()}>try again</button>.</>} /></div>
      ) : (
        <FeesBody data={data} onPay={(due, items) => setPaying({ due, items })} onPayBill={bill => setPaying({ bill, items: [] })}
          onPayAll={() => setPaying({ items: [] })}
          onDeclined={() => qc.invalidateQueries({ queryKey: ['my-fees'] })} onReceipt={setReceipt}
          onRecheck={ref => checkPayment(ref, () => true)} checking={banner?.kind === 'checking'} wallet={wallet} />
      )}

      {paying && data && <PayModal data={data} due={paying.due} bill={paying.bill} initialItems={paying.items} wallet={wallet} onClose={() => setPaying(null)}
        onPaidFromWallet={() => { setPaying(null); qc.invalidateQueries({ queryKey: ['my-fees'] }); qc.invalidateQueries({ queryKey: ['my-wallet'] }); }} />}
      {receipt && data && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)}
        foot={data.totalBalance != null && receipt.sessionName === data.session.name
          ? <>Fees for {data.session.name} so far: {formatMoney(data.totalFees, data.currency)}, paid {formatMoney(data.totalPaid, data.currency)}, balance {formatMoney(data.totalBalance, data.currency)}.</>
          : undefined} />}
    </div>
  );
}

function FeesBody({ data, onPay, onPayBill, onPayAll, onDeclined, onReceipt, onRecheck, checking, wallet }: {
  data: MyFees; onPay: (due: FeeDue, items: string[]) => void; onPayBill: (b: StudentBillInfo) => void; onPayAll: () => void;
  onDeclined: () => void; onReceipt: (p: FeePaymentInfo) => void; onRecheck: (reference: string) => void; checking: boolean; wallet?: MyWallet;
}) {
  const { fee, currency, student, session } = data;
  // The fee shown on top: the oldest one with a balance (what the next payment goes to)
  const current: FeeDue | null = fee ? { fee, paid: data.paid, balance: data.balance, credit: data.credit, status: data.status, items: data.items } : null;
  const dues = data.dues ?? [];
  const perTerm = dues.length > 1 || (data.upcoming?.length ?? 0) > 0 || (fee?.term ?? null) != null;
  const owedElsewhere = roundMoney((data.totalBalance ?? data.balance) - data.balance);
  const classLabel = [student.programName, student.level != null && !isSchoolMode() ? levelName(student.level) : null].filter(Boolean).join(' · ');

  if (data.status === 'NO_CLASS') {
    return <div className="sf-card"><Empty icon={<Info size={28} />} title={(isSchoolMode() ? 'Your class is not set' : 'Your programme and level are not set')}
      text={tx('Fees depend on your programme and level. Please ask your HOD or the school office to update your record.')} /></div>;
  }

  const pct = fee && fee.amount > 0 ? Math.min(100, (data.paid / fee.amount) * 100) : 0;
  const overdue = fee?.dueDate && data.balance > 0 && new Date(fee.dueDate + 'T23:59:59') < new Date();

  return (
    <div className="sf-grid">
      <div className="sf-col">
        {data.resultsHold && <ResultsHoldNotice hold={data.resultsHold} compact />}
        {(data.arrearsBalance ?? 0) > 0 && (
          <section className="sf-card">
            <div className="sf-card-head"><h3><History size={17} color="#c0392b" /> From earlier years</h3>
              <span style={{ fontSize: 12, color: '#74788d', fontWeight: 600 }}>Paid first</span></div>
            <ul className="sf-items">
              {(data.arrears ?? []).filter(a => a.balance > 0).map(a => (
                <li key={a.id}>
                  <div className="sf-item-main"><b>{a.label}</b>
                    <small>{formatMoney(a.amount, currency)}{a.paid > 0 ? ` · ${formatMoney(a.paid, currency)} paid` : ''}</small></div>
                  <div className="sf-item-side"><div className="sf-item-left"><b>{formatMoney(a.balance, currency)}</b><small>to pay</small></div></div>
                </li>
              ))}
            </ul>
            <div className="sf-items-total"><span>Owed in all</span><span>{formatMoney(data.toPay ?? 0, currency)}</span></div>
            {data.onlinePayment && (data.toPay ?? 0) > 0 && (
              <div style={{ padding: '0 20px 16px' }}>
                <button type="button" className="sf-btn" onClick={onPayAll}><Wallet size={16} /> Pay what I owe <ArrowRight size={16} /></button>
              </div>
            )}
          </section>
        )}
        {!fee ? (
          <div className="sf-card"><Empty icon={<Wallet size={28} />} title="No fee set yet"
            text={tx(`The school hasn't set the fee for ${classLabel || 'your class'} for ${session.name} yet. Check back later.`)} /></div>
        ) : (
          <>
            <section className="sf-hero" aria-label="Fee summary">
              <div className="sf-hero-top">
                <div>
                  <div className="sf-hero-class">{classLabel}</div>
                  <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{student.name} · {student.studentId}</div>
                </div>
                <span className="sf-session"><CalendarClock size={13} /> {session.name}</span>
              </div>
              <div className="sf-balance-label">{perTerm ? `${tx(fee.periodName ?? '')} · ` : ''}{data.status === 'PAID' ? 'Balance' : 'Balance to pay'}</div>
              <div className="sf-balance">{formatMoney(data.balance, currency)}</div>
              {(owedElsewhere > 0 || (data.billsBalance ?? 0) > 0 || (data.arrearsBalance ?? 0) > 0) && <div style={{ fontSize: 13, opacity: 0.85, marginTop: -4, marginBottom: 10 }}>
                Owed in all{(data.arrearsBalance ?? 0) > 0 ? ', with earlier years' + ((data.billsBalance ?? 0) > 0 ? ' and bills' : '') : (data.billsBalance ?? 0) > 0 ? ', with bills' : ' this year'}: <b>{formatMoney(data.toPay ?? data.totalBalance, currency)}</b></div>}
              <div className="sf-hero-stats">
                <div className="sf-hero-stat"><span>{perTerm ? `${tx(fee.periodName ?? 'Fee')} fee` : 'Total fee'}</span><strong>{formatMoney(fee.amount, currency)}</strong></div>
                <div className="sf-hero-stat"><span>Paid</span><strong>{formatMoney(data.paid, currency)}</strong></div>
                <div className="sf-hero-stat"><span>Due</span><strong>{fee.dueDate ? formatDate(fee.dueDate) : '—'}</strong></div>
              </div>
              <div className="sf-progress">
                <div className="sf-progress-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Fees paid">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="sf-progress-meta"><span>{Math.round(pct)}% paid</span>{data.credit > 0 && <span>Credit {formatMoney(data.credit, currency)}</span>}</div>
              </div>
              <div className="sf-hero-actions">
                {data.status === 'PAID' ? (
                  <span className="sf-paid-badge"><CheckCircle2 size={18} /> Fully paid — thank you</span>
                ) : data.onlinePayment ? (
                  <>
                    <button type="button" className="sf-pay-btn" onClick={() => current && onPay(current, [])}><Wallet size={18} /> Pay now <ArrowRight size={16} /></button>
                    <span className="sf-hero-note">Card or Mobile Money</span>
                  </>
                ) : (
                  <span className="sf-hero-note"><Landmark size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Pay at the accounts office. Online payment isn't open right now.</span>
                )}
              </div>
            </section>

            {overdue && (
              <div className="sf-callout warn"><AlertTriangle size={16} />
                <span>Your fees were due on <b>{formatDate(fee.dueDate)}</b>. Please pay the balance as soon as you can.</span></div>
            )}
            {fee.note && <div className="sf-callout info"><Info size={16} /><span>{fee.note}</span></div>}

            {perTerm && (
              <section className="sf-card">
                <div className="sf-card-head">
                  <h3><Layers size={17} color="var(--brand-text)" /> {tx('This year, semester by semester')}</h3>
                  <span style={{ fontSize: 12, color: '#74788d', fontWeight: 600 }}>{session.name}</span>
                </div>
                <ul className="sf-items">
                  {dues.map(d => (
                    <li key={d.fee.id}>
                      <div className="sf-item-main">
                        <b>{tx(d.fee.periodName ?? 'Fee')}</b>
                        <small>{formatMoney(d.fee.amount, currency)}{(d.discount ?? 0) > 0 ? ` (${formatMoney(d.discount, currency)} off: ${d.concessions?.join(', ')})` : ''}{d.paid > 0 ? ` · ${formatMoney(Math.min(d.paid, d.fee.amount), currency)} paid` : ''}{d.fee.dueDate ? ` · due ${formatDate(d.fee.dueDate)}` : ''}</small>
                      </div>
                      <div className="sf-item-side">
                        {d.balance <= 0 ? <span className="sf-status SUCCESS"><CheckCircle2 size={12} style={{ marginRight: 4 }} />Paid</span> : (
                          <>
                            <div className="sf-item-left"><b>{formatMoney(d.balance, currency)}</b><small>to pay</small></div>
                            {data.onlinePayment && <button type="button" className="sf-item-pay" onClick={() => onPay(d, [])} aria-label={`Pay ${d.fee.periodName}`}>Pay</button>}
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                  {(data.upcoming ?? []).map(u => (
                    <li key={u.id} style={{ opacity: 0.6 }}>
                      <div className="sf-item-main"><b>{tx(u.periodName ?? 'Fee')}</b><small>{formatMoney(u.amount, currency)}</small></div>
                      <div className="sf-item-side"><span className="sf-status PENDING">Coming up</span></div>
                    </li>
                  ))}
                </ul>
                {(data.totalBalance ?? 0) > 0 && (
                  <div className="sf-items-total"><span>Owed so far</span><span>{formatMoney(data.totalBalance, currency)}</span></div>
                )}
              </section>
            )}

            <section className="sf-card">
              <div className="sf-card-head">
                <h3><FileText size={17} color="var(--brand-text)" /> {fee.itemised ? 'Fee breakdown' : 'Fee'}</h3>
                <span style={{ fontSize: 12, color: '#74788d', fontWeight: 600 }}>{perTerm ? `${tx(fee.periodName ?? '')} · ` : ''}{session.name}</span>
              </div>
              {fee.itemised && data.items.length > 0 && current ? (
                <ItemList data={data} due={current} onPay={items => onPay(current, items)} />
              ) : (
                <div className="sf-card-body" style={{ paddingTop: 6, paddingBottom: 10 }}>
                  <table className="sf-lines">
                    <tbody>
                      <tr><td><span className="sf-dot" />{tx('Fees for')} {classLabel}</td><td>{formatMoney(fee.amount, currency)}</td></tr>
                      <tr className="total"><td>Total</td><td>{formatMoney(fee.amount, currency)}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
        {(data.bills?.length ?? 0) > 0 && <BillList data={data} onPay={onPayBill} onDeclined={onDeclined} />}
      </div>

      <div className="sf-col">
        {wallet && <WalletCard wallet={wallet} owed={(data.toPay ?? 0) > 0} />}
        {fee && data.status !== 'PAID' && (
          <section className="sf-card">
            <div className="sf-card-head"><h3><ShieldCheck size={17} color="#0f9d6e" /> Ways to pay</h3></div>
            <div className="sf-card-body">
              {data.onlinePayment ? (
                <>
                  <div className="sf-methods">
                    <div className="sf-method">
                      <div className="sf-method-ico" style={{ background: '#fff4e0', color: '#d98a00' }}><Smartphone size={19} /></div>
                      <div><b>Mobile Money</b><small>MTN MoMo · Telecel Cash · AirtelTigo Money</small></div>
                    </div>
                    <div className="sf-method">
                      <div className="sf-method-ico" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><CreditCard size={19} /></div>
                      <div><b>Card</b><small>Visa · Mastercard · Verve</small></div>
                    </div>
                  </div>
                  <div className="sf-secure"><Lock size={13} /> Payments are processed securely by Paystack. Your card or wallet details never reach the school.</div>
                </>
              ) : (
                <div className="sf-callout info"><Landmark size={16} /><span>Online payment isn't open right now. Pay at the accounts office; your payment will show here once it's recorded.</span></div>
              )}
            </div>
          </section>
        )}

        <section className="sf-card">
          <div className="sf-card-head"><h3><Receipt size={17} color="var(--brand-text)" /> Payment history</h3></div>
          {data.payments.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#74788d', fontSize: 13.5 }}>No payments yet.</div>
          ) : (
            <ul className="sf-history">
              {data.payments.map(p => <HistoryRow key={p.id} p={p} onReceipt={onReceipt} onRecheck={onRecheck} checking={checking} />)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** The student's wallet in short: what's free to use, and the way to the wallet page. */
function WalletCard({ wallet, owed }: { wallet: MyWallet; owed: boolean }) {
  return (
    <section className="sf-card">
      <div className="sf-dash" style={{ padding: '16px 20px' }}>
        <div className="sf-dash-ico" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><PiggyBank size={24} /></div>
        <div className="sf-dash-main">
          <small>My wallet · free to use</small>
          <b>{formatMoney(wallet.available, wallet.currency)}</b>
          <span style={{ display: 'block', fontSize: 12.5, color: '#74788d', marginTop: 2 }}>
            {!wallet.enabled ? 'The wallet is switched off; you can still withdraw your balance.'
              : wallet.available > 0 && owed ? 'Use it on any fee or bill.' : 'Pay in ahead and use it when fees are due.'}
          </span>
        </div>
        <Link to="/user-dashboard/wallet" className="sf-btn-ghost" style={{ textDecoration: 'none', flex: '0 0 auto' }}>Open <ArrowRight size={15} /></Link>
      </div>
    </section>
  );
}

/** The student's bills: what each is for, what's left, Pay, and Decline for an optional one nothing is paid on. */
function BillList({ data, onPay, onDeclined }: { data: MyFees; onPay: (b: StudentBillInfo) => void; onDeclined: () => void }) {
  const { currency } = data;
  const [busy, setBusy] = useState<number | null>(null);
  const decline = async (b: StudentBillInfo) => {
    const res = await Swal.fire({
      title: 'Decline this bill?', text: `${b.title} (${formatMoney(b.amount, currency)}) will be taken off your account.`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Decline', cancelButtonText: 'Keep it',
    });
    if (!res.isConfirmed) return;
    setBusy(b.id);
    try {
      await declineBill(b.id);
      toast.success('Bill declined');
      onDeclined();
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not decline the bill'));
    } finally { setBusy(null); }
  };
  return (
    <section className="sf-card">
      <div className="sf-card-head"><h3><ShoppingBag size={17} color="var(--brand-text)" /> Bills</h3></div>
      <ul className="sf-items">
        {data.bills!.map(b => {
          const what = b.lines.map(l => l.quantity > 1 ? `${l.name} × ${l.quantity}` : l.name).join(', ');
          return (
            <li key={b.id} style={b.status === 'DECLINED' ? { opacity: 0.6 } : undefined}>
              <div className="sf-item-main">
                <b>{b.title}{b.optional && <span className="sf-status PENDING" style={{ marginLeft: 6 }}>Optional</span>}</b>
                <small>{formatMoney(b.amount, currency)}{what && what !== b.title ? ` · ${what}` : ''}{b.paid > 0 && b.balance > 0 ? ` · ${formatMoney(b.paid, currency)} paid` : ''}{b.dueDate && b.balance > 0 ? ` · due ${formatDate(b.dueDate)}` : ''}</small>
                {b.note && <small>{b.note}</small>}
              </div>
              <div className="sf-item-side">
                {b.status === 'DECLINED' ? <span className="sf-status ABANDONED">Declined</span>
                  : b.balance <= 0 ? <span className="sf-status SUCCESS"><CheckCircle2 size={12} style={{ marginRight: 4 }} />Paid</span> : (
                  <>
                    <div className="sf-item-left"><b>{formatMoney(b.balance, currency)}</b><small>to pay</small></div>
                    {b.optional && b.paid === 0 && (
                      <button type="button" className="sf-link-btn" onClick={() => decline(b)} disabled={busy === b.id}>
                        {busy === b.id ? <Loader2 size={13} className="sf-spin" /> : 'Decline'}
                      </button>
                    )}
                    {data.onlinePayment && <button type="button" className="sf-item-pay" onClick={() => onPay(b)} aria-label={`Pay ${b.title}`}>Pay</button>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {(data.billsBalance ?? 0) > 0 && <div className="sf-items-total"><span>Bills to pay</span><span>{formatMoney(data.billsBalance, currency)}</span></div>}
      {(data.accountCredit ?? 0) > 0 && (
        <div className="sf-items-hint"><Info size={13} /> You have {formatMoney(data.accountCredit, currency)} in credit; {tx('it goes to your next bill or semester.')}</div>
      )}
    </section>
  );
}

/** Each item of the breakdown with what's paid and left, and a Pay button for items still owed. */
function ItemList({ data, due, onPay }: { data: MyFees; due: FeeDue; onPay: (items: string[]) => void }) {
  const { currency } = data;
  const canPayItems = data.onlinePayment && data.itemPayment;
  return (
    <>
      <ul className="sf-items">
        {due.items.map(it => {
          const done = it.balance <= 0;
          const pct = it.amount > 0 ? Math.min(100, (it.paid / it.amount) * 100) : 0;
          return (
            <li key={it.name}>
              <div className="sf-item-main">
                <b>{it.name}</b>
                <small>{formatMoney(it.amount, currency)}{it.paid > 0 && !done ? ` · ${formatMoney(it.paid, currency)} paid` : ''}</small>
                {!done && it.paid > 0 && <div className="sf-item-bar"><span style={{ width: `${pct}%` }} /></div>}
              </div>
              <div className="sf-item-side">
                {done ? (
                  <span className="sf-status SUCCESS"><CheckCircle2 size={12} style={{ marginRight: 4 }} />Paid</span>
                ) : (
                  <>
                    <div className="sf-item-left"><b>{formatMoney(it.balance, currency)}</b><small>to pay</small></div>
                    {canPayItems && (
                      <button type="button" className="sf-item-pay" onClick={() => onPay([it.name])} aria-label={`Pay ${it.name}`}>Pay</button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="sf-items-total">
        <span>Total</span>
        <span>{formatMoney(due.fee.amount, currency)}</span>
      </div>
      {due.paid > 0 && due.status !== 'PAID' && (
        <div className="sf-items-hint">
          <Info size={13} /> Money you paid without choosing an item is counted against the items from the top of this list.
        </div>
      )}
    </>
  );
}

function HistoryRow({ p, onReceipt, onRecheck, checking }: {
  p: FeePaymentInfo; onReceipt: (p: FeePaymentInfo) => void; onRecheck: (reference: string) => void; checking: boolean;
}) {
  const ok = p.status === 'SUCCESS';
  const tone = ok ? ['#eafaf3', '#0f9d6e'] : p.status === 'PENDING' ? ['#fff7e8', '#c47f0b'] : ['#f1f3f7', '#9aa1ae'];
  const Icon = p.method !== 'PAYSTACK' ? Landmark : p.channel === 'card' ? CreditCard : Smartphone;
  return (
    <li>
      <div className="sf-h-ico" style={{ background: tone[0], color: tone[1] }}><Icon size={18} /></div>
      <div className="sf-h-main">
        <b>{formatMoney(p.amount, p.currency)}</b>
        <small>{paymentMethodLabel(p)} · {formatDate(p.paidAt ?? p.createdAt)} · {p.periodName && p.periodName !== 'Whole year' ? `${tx(p.periodName)}, ` : ''}{p.sessionName}</small>
        {p.receiptNo && <small className="sf-h-for">Receipt {p.receiptNo}</small>}
        {p.items.length > 0 ? <small className="sf-h-for">For {p.items.map(i => i.name).join(', ')}</small>
          : (p.allocations?.length ?? 0) > 1 || p.allocations?.some(a => a.kind !== 'FEE') ? <small className="sf-h-for">For {p.allocations!.map(a => tx(a.label)).join(', ')}</small> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span className={`sf-status ${p.status}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
        {ok && <button type="button" className="sf-link-btn" onClick={() => onReceipt(p)}><Receipt size={13} /> Receipt</button>}
        {/* A checkout left before Paystack confirmed it: ask again instead of waiting for the background check */}
        {p.status === 'PENDING' && p.method === 'PAYSTACK' && (
          <button type="button" className="sf-link-btn" onClick={() => onRecheck(p.reference)} disabled={checking}>
            <RefreshCw size={13} className={checking ? 'sf-spin' : undefined} /> Check status
          </button>
        )}
      </div>
    </li>
  );
}

function ResultBanner({ banner, currency, onClose, onRecheck, onReceipt }: {
  banner: Banner; currency: string; onClose: () => void; onRecheck: (ref: string) => void; onReceipt: (p: FeePaymentInfo) => void;
}) {
  switch (banner.kind) {
    case 'checking':
      return <div className="sf-banner wait" role="status"><div className="sf-banner-ico"><Loader2 size={18} className="sf-spin" /></div>
        <div><h4>Confirming your payment…</h4><p>This usually takes a few seconds. Please don't pay again.</p></div></div>;
    case 'ok':
      return <div className="sf-banner ok" role="status"><div className="sf-banner-ico"><CheckCircle2 size={20} /></div>
        <div><h4>Payment received — {formatMoney(banner.payment.amount, banner.payment.currency || currency)}{banner.payment.items.length > 0 ? ` for ${banner.payment.items.map(i => i.name).join(', ')}` : ''}</h4>
          <p>Thank you. Receipt <b>{banner.payment.receiptNo ?? banner.payment.reference}</b>. <button className="sf-link-btn" style={{ padding: 0, color: 'inherit', textDecoration: 'underline' }} onClick={() => onReceipt(banner.payment)}>View receipt</button></p></div>
        <button className="sf-banner-close" onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>;
    case 'wait':
      return <div className="sf-banner warn" role="status"><div className="sf-banner-ico"><RefreshCw size={18} /></div>
        <div><h4>Payment still processing</h4>
          <p>We haven't had confirmation yet. If you approved a Mobile Money prompt, it can take a minute; it will show here once it clears. Please don't pay again.
            {' '}<button className="sf-link-btn" style={{ padding: 0, color: 'inherit', textDecoration: 'underline' }} onClick={() => onRecheck(banner.reference)}>Check again</button></p></div>
        <button className="sf-banner-close" onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>;
    case 'bad':
      return <div className="sf-banner bad" role="alert"><div className="sf-banner-ico"><XCircle size={20} /></div>
        <div><h4>Payment not completed</h4><p>{banner.message}</p></div>
        <button className="sf-banner-close" onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>;
    case 'cancelled':
      return <div className="sf-banner warn" role="status"><div className="sf-banner-ico"><Info size={18} /></div>
        <div><h4>Payment cancelled</h4><p>No money was taken. You can pay again whenever you're ready.</p></div>
        <button className="sf-banner-close" onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>;
  }
}

type PayMode = 'full' | 'items' | 'part';

/** Pays one fee (term), one bill, or (neither) everything owed, oldest first. */
function PayModal({ data, due, bill, initialItems, wallet, onClose, onPaidFromWallet }: {
  data: MyFees; due?: FeeDue; bill?: StudentBillInfo; initialItems: string[]; wallet?: MyWallet; onClose: () => void; onPaidFromWallet: () => void;
}) {
  const { currency, partPayment, minimumPayment } = data;
  const balance = bill ? bill.balance : due ? due.balance : data.toPay ?? 0;
  const owedItems = due ? due.items.filter(i => i.balance > 0) : [];
  const itemsAllowed = data.itemPayment && !!due?.fee.itemised && owedItems.length > 0;
  const forWhat = bill ? bill.title : !due ? 'everything you owe, oldest first'
    : due.fee.term != null ? `${tx(due.fee.periodName ?? '')} · ${data.session.name}` : data.session.name;
  const [mode, setMode] = useState<PayMode>(itemsAllowed && initialItems.length > 0 ? 'items' : 'full');
  const [chosen, setChosen] = useState<string[]>(initialItems.filter(n => owedItems.some(i => i.name === n)));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tabs: { key: PayMode; label: string; short: string }[] = [
    { key: 'full', label: 'Full balance', short: 'Full' },
    ...(itemsAllowed ? [{ key: 'items' as const, label: 'By item', short: 'By item' }] : []),
    ...(partPayment ? [{ key: 'part' as const, label: 'Other amount', short: 'Other' }] : []),
  ];

  const itemsTotal = roundMoney(owedItems.filter(i => chosen.includes(i.name)).reduce((sum, i) => sum + i.balance, 0));
  const value = mode === 'full' ? balance : mode === 'items' ? itemsTotal : parseMoney(text);
  const problem = mode === 'full' ? null
    : mode === 'items' ? (chosen.length === 0 ? 'Tick at least one item.' : null)
    : !text ? 'Enter how much you want to pay.'
    : !(value > 0) ? 'Enter a valid amount.'
    : value > balance ? `That's more than your balance of ${formatMoney(balance, currency)}.`
    : value < minimumPayment ? `The smallest payment is ${formatMoney(minimumPayment, currency)}.`
    : null;
  const allChosen = chosen.length === owedItems.length;

  const choose = (m: PayMode) => {
    setMode(m);
    if (m === 'part') setTimeout(() => inputRef.current?.focus(), 0);
  };

  // The wallet pays the fee or bill as a whole (not chosen items); the rest can still be paid online
  const fromWallet = wallet?.enabled && mode !== 'items' && !problem && value > 0 ? roundMoney(Math.min(value, wallet.available)) : 0;
  const walletOk = fromWallet > 0 && (fromWallet === roundMoney(value) || partPayment);
  const payFromWallet = async () => {
    if (!walletOk) return;
    setBusy(true);
    try {
      await spendFromWallet({ ...(bill ? { billId: bill.id } : due ? { scheduleId: due.fee.id } : {}), amount: fromWallet });
      toast.success(`Paid ${formatMoney(fromWallet, currency)} from your wallet`);
      onPaidFromWallet();
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not pay from your wallet'));
      setBusy(false);
    }
  };

  const pay = async () => {
    if (problem || !(value > 0)) return;
    setBusy(true);
    try {
      const { authorizationUrl } = await startFeePayment(
        { ...(bill ? { billId: bill.id } : due ? { scheduleId: due.fee.id } : {}), ...(mode === 'full' ? {} : mode === 'items' ? { items: chosen } : { amount: roundMoney(value) }) });
      window.location.assign(authorizationUrl);   // Paystack's secure checkout; it sends the student back here
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not start the payment. Please try again.'));
      setBusy(false);
    }
  };

  return (
    <FeeDialog
      title={bill ? 'Pay bill' : due ? 'Pay school fees' : 'Pay what you owe'}
      subtitle={<>{forWhat} · Balance <b style={{ color: '#2a3142' }}>{formatMoney(balance, currency)}</b></>}
      onClose={onClose}
      busy={busy}
      footer={<>
        <button type="button" className="sf-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="sf-btn sf-btn-pay" onClick={pay} disabled={busy || !!problem || !(value > 0)}>
          {busy ? <><Loader2 size={16} className="sf-spin" /> Opening Paystack…</>
            : <>Pay {value > 0 ? formatMoney(value, currency) : ''} <ArrowRight size={16} /></>}
        </button>
      </>}
    >
      {tabs.length > 1 && (
        <div className="sf-tabs" role="tablist" aria-label="How much to pay" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map(t => (
            <button key={t.key} type="button" role="tab" aria-selected={mode === t.key}
              className={mode === t.key ? 'on' : ''} onClick={() => choose(t.key)}>
              <span className="sf-tab-long">{t.label}</span><span className="sf-tab-short">{t.short}</span>
            </button>
          ))}
        </div>
      )}

      {mode === 'full' && (
        <div className="sf-due">
          <span>You'll pay</span>
          <strong>{formatMoney(balance, currency)}</strong>
          <small>This clears everything you owe for {forWhat}.</small>
        </div>
      )}

      {mode === 'items' && (
        <div className="sf-pick" role="group" aria-label="Items to pay for">
          <div className="sf-pick-head">
            <span>{chosen.length} of {owedItems.length} selected</span>
            {owedItems.length > 1 && (
              <button type="button" className="sf-link-btn" onClick={() => setChosen(allChosen ? [] : owedItems.map(i => i.name))}>
                {allChosen ? 'Clear' : 'Select all'}
              </button>
            )}
          </div>
          <div className="sf-pick-list">
            {owedItems.map(it => {
              const on = chosen.includes(it.name);
              return (
                <label key={it.name} className={`sf-pick-row${on ? ' on' : ''}`}>
                  <input type="checkbox" checked={on}
                    onChange={() => setChosen(c => on ? c.filter(n => n !== it.name) : [...c, it.name])} />
                  <span className="sf-pick-name">
                    <span>{it.name}</span>
                    {it.paid > 0 && <small>{formatMoney(it.paid, currency)} of {formatMoney(it.amount, currency)} paid</small>}
                  </span>
                  <b>{formatMoney(it.balance, currency)}</b>
                </label>
              );
            })}
          </div>
          <div className="sf-pick-total">
            <span>Total</span>
            <b>{formatMoney(itemsTotal, currency)}</b>
          </div>
        </div>
      )}

      {mode === 'part' && (
        <div className="sf-part">
          <label htmlFor="sf-part-amt">Amount to pay now</label>
          <div className="sf-amount">
            <span>{currency}</span>
            <input id="sf-part-amt" ref={inputRef} inputMode="decimal" placeholder="0.00" value={text}
              className={problem && text ? 'bad' : ''} onChange={e => setText(moneyInput(e.target.value))}
              onKeyDown={e => { if (e.key === 'Enter') pay(); }} />
          </div>
          {problem && text
            ? <div className="sf-err">{problem}</div>
            : <div className="sf-hint">Between {formatMoney(minimumPayment, currency)} and {formatMoney(balance, currency)}. Pay the rest later.</div>}
        </div>
      )}

      {walletOk && (
        <div className="sf-callout info" style={{ marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <PiggyBank size={16} />
          <span style={{ flex: '1 1 180px' }}>Your wallet has <b>{formatMoney(wallet!.available, currency)}</b> free.
            {fromWallet < roundMoney(value) ? ` It can pay ${formatMoney(fromWallet, currency)} of this.` : ''}</span>
          <button type="button" className="sf-btn-ghost" style={{ height: 38, flex: '1 0 auto' }} onClick={payFromWallet} disabled={busy}>
            Pay {formatMoney(fromWallet, currency)} from wallet</button>
        </div>
      )}

      {data.onlinePayment && <div className="sf-secure-line">
        <Lock size={13} />
        <span>Secured by Paystack · <b>Mobile Money</b> or <b>card</b>. Confirmation goes to {data.student.email}.</span>
      </div>}
    </FeeDialog>
  );
}

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: ReactNode }) {
  return (
    <div className="sf-empty">
      <div className="sf-empty-ico">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="sf-grid" aria-busy="true">
      <div className="sf-col"><div className="sf-skel" style={{ height: 300 }} /><div className="sf-skel" style={{ height: 200 }} /></div>
      <div className="sf-col"><div className="sf-skel" style={{ height: 180 }} /><div className="sf-skel" style={{ height: 220 }} /></div>
    </div>
  );
}
