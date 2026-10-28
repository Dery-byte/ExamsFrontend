import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  AlertTriangle, ArrowDownToLine, ArrowRight, ArrowUpFromLine, Banknote, CheckCircle2, Clock, Info, Landmark, Loader2, Lock,
  PiggyBank, Receipt, RefreshCw, ShieldCheck, Smartphone, Wallet as WalletIcon, X, XCircle,
} from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import {
  cancelWalletWithdrawal, confirmFeePayment, getMyWallet, requestWalletWithdrawal, spendFromWallet, startWalletDeposit,
  type FeePaymentInfo, type MyWallet, type WalletEntry, type WalletPayout, type WalletTarget, type WalletWithdrawalInfo,
} from '../../../api/endpoints';
import { formatDate, formatMoney, moneyInput, parseMoney, roundMoney } from '../../../utils/money';
import { tx } from '../../../utils/terms';
import { STUDENT_FEE_CSS } from '../fees/studentFeeStyles';
import FeeDialog from '../fees/FeeDialog';
import ReceiptModal from '../fees/ReceiptModal';

type Banner =
  | { kind: 'checking' }
  | { kind: 'ok'; payment: FeePaymentInfo }
  | { kind: 'wait'; reference: string }
  | { kind: 'bad'; message: string }
  | { kind: 'cancelled' };

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const PAYOUT_LABEL: Record<WalletPayout, string> = { CASH: 'Cash at the accounts office', MOBILE_MONEY: 'Mobile Money', BANK: 'Bank transfer' };
const STEP_TEXT: Record<string, string> = {
  REQUESTED: 'Waiting for the bursar', REVIEWED: 'Waiting for approval', APPROVED: 'Ready to be paid out', PAID: 'Paid',
  REJECTED: 'Not approved', CANCELLED: 'Cancelled', REVERSED: 'Returned to your wallet',
};
const STATUS_PILL: Record<string, string> = {
  REQUESTED: 'PENDING', REVIEWED: 'PENDING', APPROVED: 'PENDING', PAID: 'SUCCESS', REJECTED: 'FAILED', CANCELLED: 'ABANDONED', REVERSED: 'ABANDONED',
};

/**
 * Student wallet: money paid in ahead (online, or at the accounts office) that stays here until the
 * student uses it on their fees or bills, or asks for it back (bursar → Super Admin → accounts office).
 */
export default function Wallet() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  // Paystack sends the student back with ?reference=… (or ?cancelled=… from its Cancel button)
  const [returnRef] = useState(() => params.get('reference') || params.get('trxref'));
  const [cancelledRef] = useState(() => params.get('cancelled'));
  const [banner, setBanner] = useState<Banner | null>(cancelledRef ? { kind: 'cancelled' } : null);
  const [open, setOpen] = useState<'deposit' | 'pay' | 'withdraw' | null>(null);
  const [receipt, setReceipt] = useState<FeePaymentInfo | null>(null);

  const { data: raw, isLoading, error, refetch } = useQuery({ queryKey: ['my-wallet'], queryFn: getMyWallet, retry: false });
  // Only a real wallet answer counts (a server without the wallet may answer with something else)
  const data = raw && typeof raw.balance === 'number' && Array.isArray(raw.history) ? raw : undefined;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['my-wallet'] }); qc.invalidateQueries({ queryKey: ['my-fees'] }); };

  useEffect(() => {
    if (returnRef || cancelledRef) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkDeposit = async (reference: string, alive: () => boolean) => {
    setBanner({ kind: 'checking' });
    // Mobile Money approvals can take a little while; ask a few times before showing "processing"
    for (const wait of [0, 2000, 3000, 4000, 6000, 8000]) {
      if (wait) await sleep(wait);
      if (!alive()) return;
      try {
        const p = await confirmFeePayment(reference);
        if (!alive()) return;
        if (p.status === 'SUCCESS') { setBanner({ kind: 'ok', payment: p }); refresh(); return; }
        if (p.status === 'FAILED') { setBanner({ kind: 'bad', message: p.message || 'The payment did not go through. You have not been charged.' }); refresh(); return; }
        if (p.status === 'ABANDONED') { setBanner({ kind: 'cancelled' }); return; }
      } catch (e: any) {
        if (e?.response?.status === 404) { setBanner({ kind: 'bad', message: 'We could not find that payment.' }); return; }
      }
    }
    if (alive()) { setBanner({ kind: 'wait', reference }); refresh(); }
  };

  useEffect(() => {
    if (!returnRef) return;
    let alive = true;
    checkDeposit(returnRef, () => alive);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnRef]);

  return (
    <div className="sf sw animate-fade-in">
      <style>{STUDENT_FEE_CSS + WALLET_CSS}</style>
      <PageHeader title="My Wallet" breadcrumbs={['Portal', 'Wallet']} />

      {banner && <DepositBanner banner={banner} onClose={() => setBanner(null)} onRecheck={ref => checkDeposit(ref, () => true)} onReceipt={setReceipt} />}

      {isLoading ? (
        <div className="sf-grid" aria-busy="true">
          <div className="sf-col"><div className="sf-skel" style={{ height: 260 }} /><div className="sf-skel" style={{ height: 200 }} /></div>
          <div className="sf-col"><div className="sf-skel" style={{ height: 220 }} /></div>
        </div>
      ) : error || !data ? (
        <div className="sf-card"><Empty icon={<AlertTriangle size={28} />} title="We couldn't load your wallet"
          text={<>Check your connection and <button className="sf-link-btn" onClick={() => refetch()}>try again</button>.</>} /></div>
      ) : !data.enabled && data.balance <= 0 && data.withdrawals.length === 0 ? (
        <div className="sf-card"><Empty icon={<Lock size={28} />} title="The wallet isn't open"
          text="The school hasn't switched on paying in advance. Please check with the accounts office." /></div>
      ) : (
        <WalletBody data={data} onOpen={setOpen} onReceipt={setReceipt} onChanged={refresh} />
      )}

      {open === 'deposit' && data && <DepositModal data={data} onClose={() => setOpen(null)} />}
      {open === 'pay' && data && <PayModal data={data} onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} />}
      {open === 'withdraw' && data && <WithdrawModal data={data} onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} />}
      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function WalletBody({ data, onOpen, onReceipt, onChanged }: {
  data: MyWallet; onOpen: (m: 'deposit' | 'pay' | 'withdraw') => void; onReceipt: (p: FeePaymentInfo) => void; onChanged: () => void;
}) {
  const { currency } = data;
  const pending = data.withdrawals.find(w => ['REQUESTED', 'REVIEWED', 'APPROVED'].includes(w.status));
  const finished = data.withdrawals.filter(w => w !== pending);
  const canPay = data.enabled && data.feesVisible && data.available > 0 && data.targets.length > 0;
  const canDeposit = data.enabled && data.onlineDeposit;
  const canWithdraw = data.available > 0 && !pending;

  return (
    <div className="sf-grid">
      <div className="sf-col">
        {!data.enabled && (
          <div className="sf-callout warn"><Info size={16} />
            <span>The school has switched the wallet off, so you can't add money or use it on fees right now. Your balance is safe: you can still ask for it back.</span></div>
        )}

        <section className="sf-hero" aria-label="Wallet balance">
          <div className="sf-hero-top">
            <div>
              <div className="sf-hero-class">{data.student.name}</div>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{data.student.studentId}</div>
            </div>
            <span className="sf-session"><PiggyBank size={13} /> Wallet</span>
          </div>
          <div className="sf-balance-label">Wallet balance</div>
          <div className="sf-balance">{formatMoney(data.balance, currency)}</div>
          <div className="sf-hero-stats">
            <div className="sf-hero-stat"><span>Free to use</span><strong>{formatMoney(data.available, currency)}</strong></div>
            <div className="sf-hero-stat"><span>Held</span><strong>{formatMoney(data.held, currency)}</strong></div>
            <div className="sf-hero-stat"><span>Limit</span><strong>{data.maxBalance ? formatMoney(data.maxBalance, currency) : 'None'}</strong></div>
          </div>
          <div className="sf-hero-actions sw-actions">
            {canDeposit && <button type="button" className="sf-pay-btn" onClick={() => onOpen('deposit')}><ArrowDownToLine size={18} /> Add money</button>}
            {canPay && <button type="button" className="sw-hero-ghost" onClick={() => onOpen('pay')}><WalletIcon size={17} /> Pay fees or bills</button>}
            {canWithdraw && <button type="button" className="sw-hero-ghost" onClick={() => onOpen('withdraw')}><ArrowUpFromLine size={17} /> Withdraw</button>}
          </div>
          {data.held > 0 && <div className="sf-hero-note" style={{ marginTop: 12 }}>{formatMoney(data.held, currency)} is held for your withdrawal request and can't be spent.</div>}
        </section>

        {data.enabled && !data.onlineDeposit && (
          <div className="sf-callout info"><Landmark size={16} />
            <span>Online payment isn't open right now. To add money, pay at the accounts office and ask for it to go into your wallet.</span></div>
        )}
        {data.enabled && data.available > 0 && data.feesVisible && data.targets.length === 0 && (
          <div className="sf-callout ok"><CheckCircle2 size={16} /><span>You don't owe anything right now. Your money stays here for your next fees or bills.</span></div>
        )}

        {pending && <PendingWithdrawal w={pending} onChanged={onChanged} />}

        <section className="sf-card">
          <div className="sf-card-head"><h3><Receipt size={17} color="var(--brand-text)" /> Wallet history</h3></div>
          {data.history.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#74788d', fontSize: 13.5 }}>Nothing yet. Money you add and use shows here.</div>
          ) : (
            <ul className="sf-history">{data.history.map((e, i) => <HistoryRow key={`${e.type}-${e.reference}-${i}`} e={e} currency={currency} onReceipt={onReceipt} />)}</ul>
          )}
        </section>
      </div>

      <div className="sf-col">
        <section className="sf-card">
          <div className="sf-card-head"><h3><ShieldCheck size={17} color="#0f9d6e" /> How your wallet works</h3></div>
          <ol className="sw-how">
            <li><b>Add money</b> any time{data.onlineDeposit ? ' by card or Mobile Money, or' : ''} at the accounts office.</li>
            <li><b>It stays yours.</b> Nothing is taken from it until you choose to pay a fee or bill with it.</li>
            <li><b>Want it back?</b> Ask for a withdrawal. The bursar checks it, the Super Admin approves it and the accounts office pays you.</li>
          </ol>
        </section>

        {finished.length > 0 && (
          <section className="sf-card">
            <div className="sf-card-head"><h3><ArrowUpFromLine size={17} color="var(--brand-text)" /> Withdrawals</h3></div>
            <ul className="sf-history">
              {finished.map(w => (
                <li key={w.id}>
                  <div className="sf-h-main">
                    <b>{formatMoney(w.amount, w.currency)}</b>
                    <small>{w.number} · {formatDate(w.requestedAt)}</small>
                    {w.status === 'REJECTED' && w.rejectReason && <small className="sw-wrap">Reason: {w.rejectReason}</small>}
                    {w.status === 'PAID' && <small>{w.paidMethod} · voucher {w.voucher}</small>}
                  </div>
                  <span className={`sf-status ${STATUS_PILL[w.status]}`}>{STEP_TEXT[w.status]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** Where the request is: asked → bursar checked → approved → paid, with who and when. */
function PendingWithdrawal({ w, onChanged }: { w: WalletWithdrawalInfo; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const steps = [
    { label: 'Requested', done: true, at: w.requestedAt, by: null as string | null },
    { label: 'Checked by the bursar', done: !!w.reviewedAt, at: w.reviewedAt, by: w.reviewedBy },
    { label: 'Approved', done: !!w.approvedAt, at: w.approvedAt, by: w.approvedBy },
    { label: 'Paid out', done: false, at: null, by: null },
  ];
  const current = steps.findIndex(s => !s.done);
  const cancel = async () => {
    const r = await Swal.fire({ title: 'Cancel this withdrawal?', text: `${formatMoney(w.amount, w.currency)} will be free to use again.`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Cancel request', cancelButtonText: 'Keep it' });
    if (!r.isConfirmed) return;
    setBusy(true);
    try { await cancelWalletWithdrawal(w.id); toast.success('Withdrawal cancelled'); onChanged(); }
    catch (e: any) { toast.error(tx(e?.response?.data?.message ?? 'Could not cancel')); }
    finally { setBusy(false); }
  };
  return (
    <section className="sf-card">
      <div className="sf-card-head">
        <h3><Clock size={17} color="#c47f0b" /> Withdrawal in progress</h3>
        <span className="sf-status PENDING">{STEP_TEXT[w.status]}</span>
      </div>
      <div className="sf-card-body">
        <div className="sw-wd-top">
          <div><b className="sw-wd-amt">{formatMoney(w.amount, w.currency)}</b>
            <small>{w.number} · {PAYOUT_LABEL[w.payout]}{w.payoutDetails ? ` · ${w.payoutDetails}` : ''}</small></div>
          <button type="button" className="sf-btn-ghost sw-sm" onClick={cancel} disabled={busy}>{busy ? <Loader2 size={14} className="sf-spin" /> : <X size={14} />} Cancel</button>
        </div>
        <ol className="sw-steps" aria-label="Withdrawal progress">
          {steps.map((s, i) => (
            <li key={s.label} className={s.done ? 'done' : i === current ? 'now' : ''} aria-current={i === current ? 'step' : undefined}>
              <span className="sw-dot">{s.done ? <CheckCircle2 size={14} /> : i + 1}</span>
              <span className="sw-step-text"><b>{s.label}</b>{s.at && <small>{formatDate(s.at)}{s.by ? ` · ${s.by}` : ''}</small>}</span>
            </li>
          ))}
        </ol>
        {w.status === 'APPROVED' && w.payout === 'CASH' && (
          <div className="sf-callout ok" style={{ marginTop: 14 }}><Banknote size={16} /><span>Approved. Collect your cash at the accounts office; take your ID card.</span></div>
        )}
      </div>
    </section>
  );
}

function HistoryRow({ e, currency, onReceipt }: { e: WalletEntry; currency: string; onReceipt: (p: FeePaymentInfo) => void }) {
  const tone = e.type === 'DEPOSIT' ? ['#eafaf3', '#0f9d6e'] : e.type === 'SPEND' ? ['var(--brand-soft)', 'var(--brand-text)'] : ['#fff7e8', '#c47f0b'];
  const Icon = e.type === 'DEPOSIT' ? ArrowDownToLine : e.type === 'SPEND' ? WalletIcon : ArrowUpFromLine;
  const sign = e.type === 'DEPOSIT' ? '+' : '−';
  const title = e.type === 'DEPOSIT' ? (e.payment?.method === 'PAYSTACK' ? (e.payment.channel === 'card' ? 'Added by card' : 'Added online') : 'Added at the accounts office')
    : e.type === 'SPEND' ? (e.by ? `Paid by ${e.by}` : 'Paid from wallet') : 'Withdrawn';
  const pending = e.status === 'PENDING';
  return (
    <li>
      <div className="sf-h-ico" style={{ background: tone[0], color: tone[1] }}><Icon size={18} /></div>
      <div className="sf-h-main">
        <b>{title}</b>
        <small>{formatDate(e.at, true)} · {e.reference}</small>
        {e.type === 'SPEND' && <small className="sf-h-for sw-wrap">For {tx(e.label)}</small>}
        {e.type === 'SPEND' && e.note && <small className="sw-wrap">“{e.note}”</small>}
        {e.status === 'REVERSED' && <small>Returned to your wallet</small>}
      </div>
      <div className="sw-h-side">
        <b className={`sw-h-amt ${e.type === 'DEPOSIT' ? 'in' : ''}`}>{pending ? '' : sign}{formatMoney(e.amount, currency)}</b>
        {pending ? <span className="sf-status PENDING">Processing</span>
          : e.payment && e.payment.status === 'SUCCESS' && <button type="button" className="sf-link-btn" onClick={() => onReceipt(e.payment!)}><Receipt size={13} /> Receipt</button>}
      </div>
    </li>
  );
}

function DepositModal({ data, onClose }: { data: MyWallet; onClose: () => void }) {
  const { currency } = data;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const room = data.maxBalance ? roundMoney(Math.max(0, data.maxBalance - data.balance)) : null;
  const value = parseMoney(text);
  const problem = !text ? null : !(value > 0) ? 'Enter a valid amount.'
    : value < data.minimum ? `The smallest amount is ${formatMoney(data.minimum, currency)}.`
    : room != null && value > room ? (room > 0 ? `Your wallet can take up to ${formatMoney(room, currency)} more.` : 'Your wallet is full.')
    : null;
  const quick = [50, 100, 200, 500, 1000].filter(q => room == null || q <= room);

  const go = async () => {
    if (!(value > 0) || problem) return;
    setBusy(true);
    try {
      const { authorizationUrl } = await startWalletDeposit(roundMoney(value));
      window.location.assign(authorizationUrl);   // Paystack's checkout; it sends the student back to this page
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not start the payment. Please try again.'));
      setBusy(false);
    }
  };

  return (
    <FeeDialog title="Add money to your wallet" subtitle={<>Balance now <b style={{ color: '#2a3142' }}>{formatMoney(data.balance, currency)}</b></>}
      onClose={onClose} busy={busy}
      footer={<>
        <button type="button" className="sf-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="sf-btn sf-btn-pay" onClick={go} disabled={busy || !(value > 0) || !!problem}>
          {busy ? <><Loader2 size={16} className="sf-spin" /> Opening Paystack…</> : <>Add {value > 0 ? formatMoney(value, currency) : ''} <ArrowRight size={16} /></>}
        </button>
      </>}>
      <div className="sf-part">
        <label htmlFor="sw-dep-amt">Amount</label>
        <div className="sf-amount">
          <span>{currency}</span>
          <input id="sw-dep-amt" ref={inputRef} inputMode="decimal" placeholder="0.00" value={text} className={problem ? 'bad' : ''}
            onChange={e => setText(moneyInput(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') go(); }} />
        </div>
        {problem ? <div className="sf-err">{problem}</div>
          : <div className="sf-hint">{room != null ? `Up to ${formatMoney(room, currency)} more can go in.` : 'Any amount you like. It stays yours until you use it.'}</div>}
      </div>
      {quick.length > 0 && (
        <div className="sw-chips" role="group" aria-label="Quick amounts">
          {quick.map(q => <button key={q} type="button" className={value === q ? 'on' : ''} onClick={() => { setText(String(q)); inputRef.current?.focus(); }}>{formatMoney(q, currency)}</button>)}
        </div>
      )}
      <div className="sf-secure-line"><Lock size={13} />
        <span>Secured by Paystack · <b>Mobile Money</b> or <b>card</b>. Confirmation goes to {data.student.email}.</span></div>
    </FeeDialog>
  );
}

function PayModal({ data, onClose, onDone }: { data: MyWallet; onClose: () => void; onDone: () => void }) {
  const { currency } = data;
  const [pick, setPick] = useState<WalletTarget>(data.targets[0]);
  const [mode, setMode] = useState<'max' | 'part'>('max');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const most = roundMoney(Math.min(pick.balance, data.available));
  const covers = data.available >= pick.balance;
  const value = mode === 'max' ? most : parseMoney(text);
  const problem = mode === 'max'
    ? (!covers && !data.partPayment ? `Part payments are switched off, and your wallet doesn't cover the ${formatMoney(pick.balance, currency)} owed.` : null)
    : !text ? 'Enter how much to pay.' : !(value > 0) ? 'Enter a valid amount.'
    : value > data.available ? `You have ${formatMoney(data.available, currency)} free to use.`
    : value > pick.balance ? `That's more than the ${formatMoney(pick.balance, currency)} owed.` : null;

  const pay = async () => {
    if (problem || !(value > 0)) return;
    setBusy(true);
    try {
      await spendFromWallet({
        ...(pick.kind === 'FEE' ? { scheduleId: pick.id! } : pick.kind === 'BILL' ? { billId: pick.id! } : {}),
        ...(mode === 'part' ? { amount: roundMoney(value) } : { amount: most }),
      });
      toast.success(`Paid ${formatMoney(value, currency)} from your wallet`);
      onDone();
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not pay from your wallet'));
      setBusy(false);
    }
  };

  return (
    <FeeDialog title="Pay from your wallet" subtitle={<>Free to use <b style={{ color: '#2a3142' }}>{formatMoney(data.available, currency)}</b></>}
      onClose={onClose} busy={busy} wide
      footer={<>
        <button type="button" className="sf-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="sf-btn sf-btn-pay" onClick={pay} disabled={busy || !!problem || !(value > 0)}>
          {busy ? <><Loader2 size={16} className="sf-spin" /> Paying…</> : <>Pay {value > 0 ? formatMoney(value, currency) : ''}</>}
        </button>
      </>}>
      <div className="sf-pick" role="radiogroup" aria-label="What to pay">
        <div className="sf-pick-head"><span>What do you want to pay?</span></div>
        <div className="sf-pick-list">
          {data.targets.map(t => {
            const on = t.kind === pick.kind && t.id === pick.id;
            return (
              <label key={`${t.kind}-${t.id}`} className={`sf-pick-row${on ? ' on' : ''}`}>
                <input type="radio" name="sw-target" checked={on} onChange={() => { setPick(t); setMode('max'); setText(''); }} />
                <span className="sf-pick-name"><span>{tx(t.label)}</span><small>{t.kind === 'ALL' ? 'Earlier years first, then fees by term, then bills' : t.kind === 'BILL' ? 'Bill' : 'School fees'}</small></span>
                <b>{formatMoney(t.balance, currency)}</b>
              </label>
            );
          })}
        </div>
      </div>

      {data.partPayment && (
        <div className="sf-tabs" role="tablist" aria-label="How much" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
          <button type="button" role="tab" aria-selected={mode === 'max'} className={mode === 'max' ? 'on' : ''} onClick={() => setMode('max')}>
            <span className="sf-tab-long">{covers ? 'Full balance' : 'All I can'}</span><span className="sf-tab-short">{covers ? 'Full' : 'Max'}</span></button>
          <button type="button" role="tab" aria-selected={mode === 'part'} className={mode === 'part' ? 'on' : ''} onClick={() => setMode('part')}>
            <span className="sf-tab-long">Other amount</span><span className="sf-tab-short">Other</span></button>
        </div>
      )}

      {mode === 'max' ? (
        <div className="sf-due" style={{ marginTop: data.partPayment ? 0 : 14 }}>
          <span>From your wallet</span>
          <strong>{formatMoney(most, currency)}</strong>
          <small>{covers ? 'This clears it.' : `${formatMoney(roundMoney(pick.balance - most), currency)} will still be owed.`}</small>
        </div>
      ) : (
        <div className="sf-part">
          <label htmlFor="sw-pay-amt">Amount to pay</label>
          <div className="sf-amount"><span>{currency}</span>
            <input id="sw-pay-amt" inputMode="decimal" placeholder="0.00" value={text} className={problem && text ? 'bad' : ''} autoFocus
              onChange={e => setText(moneyInput(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') pay(); }} /></div>
          {problem && text ? <div className="sf-err">{problem}</div> : <div className="sf-hint">Up to {formatMoney(most, currency)}.</div>}
        </div>
      )}
      {mode === 'max' && problem && <div className="sf-err">{problem}</div>}
    </FeeDialog>
  );
}

function WithdrawModal({ data, onClose, onDone }: { data: MyWallet; onClose: () => void; onDone: () => void }) {
  const { currency } = data;
  const [text, setText] = useState(String(data.available));
  const [payout, setPayout] = useState<WalletPayout>('MOBILE_MONEY');
  const [details, setDetails] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const value = parseMoney(text);
  const amountProblem = !text ? 'Enter the amount.' : !(value > 0) ? 'Enter a valid amount.'
    : value > data.available ? `You can withdraw up to ${formatMoney(data.available, currency)}.`
    : value < data.minimum ? `The smallest amount is ${formatMoney(data.minimum, currency)}.` : null;
  const ok = !amountProblem && reason.trim().length > 0 && (payout === 'CASH' || details.trim().length > 0);

  const send = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      await requestWalletWithdrawal({ amount: roundMoney(value), reason: reason.trim(), payout, payoutDetails: payout === 'CASH' ? undefined : details.trim() });
      toast.success('Request sent to the bursar');
      onDone();
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not send the request'));
      setBusy(false);
    }
  };

  return (
    <FeeDialog title="Withdraw from your wallet" subtitle={<>Free to withdraw <b style={{ color: '#2a3142' }}>{formatMoney(data.available, currency)}</b></>}
      onClose={onClose} busy={busy}
      footer={<>
        <button type="button" className="sf-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="sf-btn sf-btn-pay" onClick={send} disabled={busy || !ok}>
          {busy ? <><Loader2 size={16} className="sf-spin" /> Sending…</> : <>Send request</>}
        </button>
      </>}>
      <div className="sf-part">
        <label htmlFor="sw-wd-amt">Amount</label>
        <div className="sf-amount"><span>{currency}</span>
          <input id="sw-wd-amt" inputMode="decimal" placeholder="0.00" value={text} className={amountProblem && text ? 'bad' : ''}
            onChange={e => setText(moneyInput(e.target.value))} /></div>
        {amountProblem && text && <div className="sf-err">{amountProblem}</div>}
      </div>

      <div className="sw-field">
        <span className="sw-label" id="sw-payout-l">How should we pay you?</span>
        <div className="sf-tabs" role="radiogroup" aria-labelledby="sw-payout-l" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
          {(['MOBILE_MONEY', 'BANK', 'CASH'] as const).map(p => (
            <button key={p} type="button" role="radio" aria-checked={payout === p} className={payout === p ? 'on' : ''} onClick={() => setPayout(p)}>
              {p === 'MOBILE_MONEY' ? <><span className="sf-tab-long">Mobile Money</span><span className="sf-tab-short">MoMo</span></> : p === 'BANK' ? 'Bank' : 'Cash'}
            </button>
          ))}
        </div>
      </div>
      {payout !== 'CASH' ? (
        <div className="sw-field">
          <label className="sw-label" htmlFor="sw-wd-to">{payout === 'MOBILE_MONEY' ? 'Mobile Money number and name on it' : 'Bank, account number and account name'}</label>
          <input id="sw-wd-to" className="sw-input" maxLength={200} value={details} onChange={e => setDetails(e.target.value)}
            placeholder={payout === 'MOBILE_MONEY' ? 'e.g. 024 000 0000, Ama Mensah' : 'e.g. GCB, 1234567890, Ama Mensah'} />
        </div>
      ) : (
        <div className="sf-callout info" style={{ marginTop: 14 }}><Smartphone size={16} /><span>Once it's approved, collect the cash at the accounts office with your ID card.</span></div>
      )}
      <div className="sw-field">
        <label className="sw-label" htmlFor="sw-wd-why">Why are you withdrawing?</label>
        <textarea id="sw-wd-why" className="sw-input" rows={2} maxLength={300} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="e.g. Paid in too much; leaving the school" />
      </div>
      <div className="sf-secure-line"><ShieldCheck size={13} />
        <span>The bursar checks it, the Super Admin approves it, then the accounts office pays you. The amount is held meanwhile; you can cancel any time before it's paid.</span></div>
    </FeeDialog>
  );
}

function DepositBanner({ banner, onClose, onRecheck, onReceipt }: {
  banner: Banner; onClose: () => void; onRecheck: (ref: string) => void; onReceipt: (p: FeePaymentInfo) => void;
}) {
  const close = <button className="sf-banner-close" onClick={onClose} aria-label="Dismiss"><X size={16} /></button>;
  switch (banner.kind) {
    case 'checking':
      return <div className="sf-banner wait" role="status"><div className="sf-banner-ico"><Loader2 size={18} className="sf-spin" /></div>
        <div><h4>Confirming your deposit…</h4><p>This usually takes a few seconds. Please don't pay again.</p></div></div>;
    case 'ok':
      return <div className="sf-banner ok" role="status"><div className="sf-banner-ico"><CheckCircle2 size={20} /></div>
        <div><h4>{formatMoney(banner.payment.amount, banner.payment.currency)} added to your wallet</h4>
          <p>Receipt <b>{banner.payment.receiptNo ?? banner.payment.reference}</b>. <button className="sf-link-btn" style={{ padding: 0, color: 'inherit', textDecoration: 'underline' }} onClick={() => onReceipt(banner.payment)}>View receipt</button></p></div>
        {close}</div>;
    case 'wait':
      return <div className="sf-banner warn" role="status"><div className="sf-banner-ico"><RefreshCw size={18} /></div>
        <div><h4>Deposit still processing</h4>
          <p>We haven't had confirmation yet. If you approved a Mobile Money prompt, it can take a minute. Please don't pay again.
            {' '}<button className="sf-link-btn" style={{ padding: 0, color: 'inherit', textDecoration: 'underline' }} onClick={() => onRecheck(banner.reference)}>Check again</button></p></div>
        {close}</div>;
    case 'bad':
      return <div className="sf-banner bad" role="alert"><div className="sf-banner-ico"><XCircle size={20} /></div>
        <div><h4>Deposit not completed</h4><p>{banner.message}</p></div>{close}</div>;
    case 'cancelled':
      return <div className="sf-banner warn" role="status"><div className="sf-banner-ico"><Info size={18} /></div>
        <div><h4>Deposit cancelled</h4><p>No money was taken.</p></div>{close}</div>;
  }
}

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: ReactNode }) {
  return (
    <div className="sf-empty"><div className="sf-empty-ico">{icon}</div><h3>{title}</h3><p>{text}</p></div>
  );
}

const WALLET_CSS = `
.sw-hero-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 18px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.45); background: rgba(255,255,255,0.12); color: inherit; font: inherit; font-weight: 800; font-size: 14px; cursor: pointer; transition: background .15s; }
.sw-hero-ghost:hover { background: rgba(255,255,255,0.22); }
.sw-hero-ghost:focus-visible, .sf-pay-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.sw-how { margin: 0; padding: 14px 20px 16px 40px; display: grid; gap: 10px; font-size: 13.5px; color: #5b6275; line-height: 1.5; }
.sw-how b { color: #2a3142; }
.sw-wrap { white-space: normal !important; overflow-wrap: anywhere; }
.sw-h-side { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.sw-h-amt { font-size: 14px; color: #2a3142; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sw-h-amt.in { color: #0f9d6e; }
.sw-wd-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.sw-wd-amt { display: block; font-size: 22px; font-weight: 800; color: #2a3142; font-variant-numeric: tabular-nums; }
.sw-wd-top small { display: block; font-size: 12.5px; color: #74788d; margin-top: 2px; overflow-wrap: anywhere; }
.sw-sm { height: 36px !important; padding: 0 12px !important; font-size: 13px !important; }
.sw-steps { list-style: none; margin: 18px 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.sw-steps li { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; font-size: 12.5px; color: #9aa1ae; }
.sw-steps li::before { content: ''; position: absolute; top: 13px; right: 50%; width: 100%; height: 2px; background: #e6e8ef; z-index: 0; }
.sw-steps li:first-child::before { display: none; }
.sw-steps li.done::before, .sw-steps li.now::before { background: var(--brand); }
.sw-dot { position: relative; z-index: 1; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: #f1f3f7; color: #9aa1ae; font-weight: 800; font-size: 12px; border: 2px solid #fff; box-shadow: 0 0 0 1px #e6e8ef; }
.sw-steps li.done .sw-dot { background: var(--brand); color: var(--brand-contrast); box-shadow: none; }
.sw-steps li.now .sw-dot { background: #fff7e8; color: #c47f0b; box-shadow: 0 0 0 2px #f1b44c; }
.sw-steps li.done, .sw-steps li.now { color: #2a3142; }
.sw-step-text b { display: block; font-weight: 700; }
.sw-step-text small { display: block; font-size: 11.5px; color: #74788d; margin-top: 2px; overflow-wrap: anywhere; }
.sw-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.sw-chips button { height: 36px; padding: 0 14px; border-radius: 999px; border: 1.5px solid #e2e5ee; background: #fff; color: #2a3142; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; font-variant-numeric: tabular-nums; }
.sw-chips button:hover, .sw-chips button.on { border-color: var(--brand); color: var(--brand-hover); background: var(--brand-soft); }
.sw-field { margin-top: 14px; }
.sw-label { display: block; font-size: 12.5px; font-weight: 700; color: #5b6275; margin-bottom: 6px; }
.sw-input { width: 100%; box-sizing: border-box; min-height: 44px; border: 1.5px solid #e2e5ee; border-radius: 12px; padding: 10px 14px; font: inherit; font-size: 14px; color: #2a3142; background: #fff; resize: vertical; }
.sw-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 4px rgba(var(--brand-rgb), 0.15); }
@media (max-width: 576px) {
  .sw-actions > button { flex: 1 1 100%; width: 100%; }
  /* Steps stack: each line runs down from a step's dot to the next one, coloured once the step is done */
  .sw-steps { grid-template-columns: 1fr; gap: 0; }
  .sw-steps li { flex-direction: row; align-items: flex-start; text-align: left; gap: 12px; padding-bottom: 16px; }
  .sw-steps li::before { top: 28px; right: auto; left: 13px; width: 2px; height: calc(100% - 28px); }
  .sw-steps li:first-child::before { display: block; }
  .sw-steps li:last-child::before { display: none; }
  .sw-steps li.now::before { background: #e6e8ef; }
  .sw-step-text { padding-top: 4px; }
  /* 16px stops iOS Safari zooming into a field when it gets focus */
  .sw-input { font-size: 16px; }
}
`;
