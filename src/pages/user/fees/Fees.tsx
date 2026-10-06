import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CreditCard, FileText, Info, Landmark, Loader2,
  Lock, Printer, Receipt, RefreshCw, ShieldCheck, Smartphone, Wallet, X, XCircle,
} from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import { useInstitution } from '../../../hooks/useInstitution';
import {
  confirmFeePayment, getMyFees, institutionLogoUrl, startFeePayment, type FeePaymentInfo, type MyFees,
} from '../../../api/endpoints';
import { formatDate, formatMoney, moneyInput, parseMoney, paymentMethodLabel, roundMoney } from '../../../utils/money';
import { levelName, tx } from '../../../utils/terms';
import { STUDENT_FEE_CSS } from './studentFeeStyles';

type Banner =
  | { kind: 'checking' }
  | { kind: 'ok'; payment: FeePaymentInfo }
  | { kind: 'wait'; reference: string }
  | { kind: 'bad'; message: string }
  | { kind: 'cancelled' };

const STATUS_LABEL: Record<string, string> = { SUCCESS: 'Paid', PENDING: 'Processing', FAILED: 'Failed', ABANDONED: 'Not completed' };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Student: this session's fee, its breakdown, what's been paid, and paying online with Paystack. */
export default function Fees() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  // Paystack sends the student back with ?reference=… (or ?cancelled=… from its Cancel button)
  const [returnRef] = useState(() => params.get('reference') || params.get('trxref'));
  const [cancelledRef] = useState(() => params.get('cancelled'));
  const [banner, setBanner] = useState<Banner | null>(cancelledRef ? { kind: 'cancelled' } : null);
  /** Open pay dialog; items = breakdown items chosen from the list (empty = let the student choose). */
  const [paying, setPaying] = useState<{ items: string[] } | null>(null);
  const [receipt, setReceipt] = useState<FeePaymentInfo | null>(null);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['my-fees'], queryFn: getMyFees, retry: false });
  const hidden = (error as any)?.response?.status === 403;

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
        <FeesBody data={data} onPay={items => setPaying({ items })} onReceipt={setReceipt} />
      )}

      {paying && data && <PayModal data={data} initialItems={paying.items} onClose={() => setPaying(null)} />}
      {receipt && data && <ReceiptModal payment={receipt} data={data} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function FeesBody({ data, onPay, onReceipt }: { data: MyFees; onPay: (items: string[]) => void; onReceipt: (p: FeePaymentInfo) => void }) {
  const { fee, currency, student, session } = data;
  const classLabel = [student.programName, student.level != null ? levelName(student.level) : null].filter(Boolean).join(' · ');

  if (data.status === 'NO_CLASS') {
    return <div className="sf-card"><Empty icon={<Info size={28} />} title={tx('Your programme and level are not set')}
      text={tx('Fees depend on your programme and level. Please ask your HOD or the school office to update your record.')} /></div>;
  }

  const pct = fee && fee.amount > 0 ? Math.min(100, (data.paid / fee.amount) * 100) : 0;
  const overdue = fee?.dueDate && data.balance > 0 && new Date(fee.dueDate + 'T23:59:59') < new Date();

  return (
    <div className="sf-grid">
      <div className="sf-col">
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
              <div className="sf-balance-label">{data.status === 'PAID' ? 'Balance' : 'Balance to pay'}</div>
              <div className="sf-balance">{formatMoney(data.balance, currency)}</div>
              <div className="sf-hero-stats">
                <div className="sf-hero-stat"><span>Total fee</span><strong>{formatMoney(fee.amount, currency)}</strong></div>
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
                    <button type="button" className="sf-pay-btn" onClick={() => onPay([])}><Wallet size={18} /> Pay now <ArrowRight size={16} /></button>
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

            <section className="sf-card">
              <div className="sf-card-head">
                <h3><FileText size={17} color="#7a6fbe" /> {fee.itemised ? 'Fee breakdown' : 'Fee'}</h3>
                <span style={{ fontSize: 12, color: '#74788d', fontWeight: 600 }}>{session.name}</span>
              </div>
              {fee.itemised && data.items.length > 0 ? (
                <ItemList data={data} onPay={onPay} />
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
      </div>

      <div className="sf-col">
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
                      <div className="sf-method-ico" style={{ background: '#eef2ff', color: '#4f46e5' }}><CreditCard size={19} /></div>
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
          <div className="sf-card-head"><h3><Receipt size={17} color="#7a6fbe" /> Payment history</h3></div>
          {data.payments.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#74788d', fontSize: 13.5 }}>No payments yet.</div>
          ) : (
            <ul className="sf-history">
              {data.payments.map(p => <HistoryRow key={p.id} p={p} onReceipt={onReceipt} />)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Each item of the breakdown with what's paid and left, and a Pay button for items still owed. */
function ItemList({ data, onPay }: { data: MyFees; onPay: (items: string[]) => void }) {
  const { currency } = data;
  const canPayItems = data.onlinePayment && data.itemPayment;
  return (
    <>
      <ul className="sf-items">
        {data.items.map(it => {
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
        <span>{formatMoney(data.fee?.amount, currency)}</span>
      </div>
      {data.paid > 0 && data.status !== 'PAID' && (
        <div className="sf-items-hint">
          <Info size={13} /> Money you paid without choosing an item is counted against the items from the top of this list.
        </div>
      )}
    </>
  );
}

function HistoryRow({ p, onReceipt }: { p: FeePaymentInfo; onReceipt: (p: FeePaymentInfo) => void }) {
  const ok = p.status === 'SUCCESS';
  const tone = ok ? ['#eafaf3', '#0f9d6e'] : p.status === 'PENDING' ? ['#fff7e8', '#c47f0b'] : ['#f1f3f7', '#9aa1ae'];
  const Icon = p.method !== 'PAYSTACK' ? Landmark : p.channel === 'card' ? CreditCard : Smartphone;
  return (
    <li>
      <div className="sf-h-ico" style={{ background: tone[0], color: tone[1] }}><Icon size={18} /></div>
      <div className="sf-h-main">
        <b>{formatMoney(p.amount, p.currency)}</b>
        <small>{paymentMethodLabel(p)} · {formatDate(p.paidAt ?? p.createdAt)} · {p.sessionName}</small>
        {p.items.length > 0 && <small className="sf-h-for">For {p.items.map(i => i.name).join(', ')}</small>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span className={`sf-status ${p.status}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
        {ok && <button type="button" className="sf-link-btn" onClick={() => onReceipt(p)}><Receipt size={13} /> Receipt</button>}
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
          <p>Thank you. Reference <b>{banner.payment.reference}</b>. <button className="sf-link-btn" style={{ padding: 0, color: 'inherit', textDecoration: 'underline' }} onClick={() => onReceipt(banner.payment)}>View receipt</button></p></div>
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

function PayModal({ data, initialItems, onClose }: { data: MyFees; initialItems: string[]; onClose: () => void }) {
  const { balance, currency, partPayment, minimumPayment } = data;
  const owedItems = data.items.filter(i => i.balance > 0);
  const itemsAllowed = data.itemPayment && !!data.fee?.itemised && owedItems.length > 0;
  const [mode, setMode] = useState<'full' | 'items' | 'part'>(itemsAllowed && initialItems.length > 0 ? 'items' : 'full');
  const [chosen, setChosen] = useState<string[]>(initialItems.filter(n => owedItems.some(i => i.name === n)));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const itemsTotal = roundMoney(owedItems.filter(i => chosen.includes(i.name)).reduce((sum, i) => sum + i.balance, 0));
  const value = mode === 'full' ? balance : mode === 'items' ? itemsTotal : parseMoney(text);
  const problem = mode === 'full' ? null
    : mode === 'items' ? (chosen.length === 0 ? 'Choose at least one item.' : null)
    : !text ? 'Enter how much you want to pay.'
    : !(value > 0) ? 'Enter a valid amount.'
    : value > balance ? `That's more than your balance of ${formatMoney(balance, currency)}.`
    : value < minimumPayment ? `The smallest payment is ${formatMoney(minimumPayment, currency)}.`
    : null;

  const pay = async () => {
    if (problem || !(value > 0)) return;
    setBusy(true);
    try {
      const { authorizationUrl } = await startFeePayment(
        mode === 'full' ? {} : mode === 'items' ? { items: chosen } : { amount: roundMoney(value) });
      window.location.assign(authorizationUrl);   // Paystack's secure checkout; it sends the student back here
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not start the payment. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="sf-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="sf-modal" role="dialog" aria-modal="true" aria-labelledby="sf-pay-title">
        <div className="sf-modal-head">
          <div><h2 id="sf-pay-title">Pay school fees</h2><p>{data.session.name} · balance {formatMoney(balance, currency)}</p></div>
          <button type="button" className="sf-x" onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="sf-modal-body">
          <label className={`sf-option${mode === 'full' ? ' on' : ''}`}>
            <input type="radio" name="sf-amt" checked={mode === 'full'} onChange={() => setMode('full')} />
            <div style={{ flex: 1 }}><b>Full balance</b><small>Clear everything you owe for this session</small></div>
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(balance, currency)}</b>
          </label>
          {itemsAllowed && (
            <label className={`sf-option${mode === 'items' ? ' on' : ''}`}>
              <input type="radio" name="sf-amt" checked={mode === 'items'} onChange={() => setMode('items')} />
              <div style={{ flex: 1 }}><b>Choose items</b><small>Pay for specific items, e.g. {owedItems.slice(0, 2).map(i => i.name).join(' or ')}</small></div>
            </label>
          )}
          {mode === 'items' && (
            <div className="sf-pick" role="group" aria-label="Items to pay for">
              {owedItems.map(it => {
                const on = chosen.includes(it.name);
                return (
                  <label key={it.name} className={`sf-pick-row${on ? ' on' : ''}`}>
                    <input type="checkbox" checked={on}
                      onChange={() => setChosen(c => on ? c.filter(n => n !== it.name) : [...c, it.name])} />
                    <span className="sf-pick-name">{it.name}{it.paid > 0 && <small> · {formatMoney(it.paid, currency)} already paid</small>}</span>
                    <b>{formatMoney(it.balance, currency)}</b>
                  </label>
                );
              })}
              {owedItems.length > 1 && (
                <button type="button" className="sf-link-btn" style={{ marginTop: 4 }}
                  onClick={() => setChosen(chosen.length === owedItems.length ? [] : owedItems.map(i => i.name))}>
                  {chosen.length === owedItems.length ? 'Clear all' : 'Select all'}
                </button>
              )}
              {problem && <div className="sf-err">{problem}</div>}
            </div>
          )}
          {partPayment && (
            <label className={`sf-option${mode === 'part' ? ' on' : ''}`} style={{ flexWrap: 'wrap' }}>
              <input type="radio" name="sf-amt" checked={mode === 'part'} onChange={() => { setMode('part'); setTimeout(() => inputRef.current?.focus(), 0); }} />
              <div style={{ flex: 1 }}><b>Part payment</b><small>Pay some now and the rest later</small></div>
            </label>
          )}
          {mode === 'part' && (
            <>
              <div className="sf-amount">
                <span>{currency}</span>
                <input ref={inputRef} inputMode="decimal" placeholder="0.00" value={text} aria-label="Amount to pay"
                  className={problem && text ? 'bad' : ''} onChange={e => setText(moneyInput(e.target.value))}
                  onKeyDown={e => { if (e.key === 'Enter') pay(); }} />
              </div>
              {problem && text && <div className="sf-err">{problem}</div>}
            </>
          )}
          <div className="sf-callout info" style={{ marginTop: 14 }}>
            <Lock size={15} />
            <span>You'll go to Paystack's secure page to pay by <b>Mobile Money</b> or <b>card</b>, then come straight back here. Paystack sends its confirmation to <b>{data.student.email}</b>.</span>
          </div>
        </div>
        <div className="sf-modal-foot">
          <button type="button" className="sf-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="sf-btn" onClick={pay} disabled={busy || !!problem || !(value > 0)}>
            {busy ? <><Loader2 size={16} className="sf-spin" /> Opening Paystack…</> : <>Pay {value > 0 ? formatMoney(value, currency) : ''} <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ payment, data, onClose }: { payment: FeePaymentInfo; data: MyFees; onClose: () => void }) {
  const { institution } = useInstitution();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const method = payment.method === 'PAYSTACK' ? `${paymentMethodLabel(payment)} (Paystack)` : paymentMethodLabel(payment);
  const receiptRef = useRef<HTMLDivElement>(null);

  /** Prints only the receipt, from its own frame (printing the page would include the hidden dashboard's height). */
  const print = () => {
    const node = receiptRef.current;
    if (!node) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) { frame.remove(); window.print(); return; }
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${payment.reference}</title>`
      + `<style>${STUDENT_FEE_CSS} body{margin:24px;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact} .sf-receipt{border:none}</style>`
      + `</head><body>${node.outerHTML}</body></html>`);
    doc.close();
    const go = () => { win.focus(); win.print(); setTimeout(() => frame.remove(), 1000); };
    // Wait for the logo, but never more than 2 s
    const pending = Array.from(doc.images).filter(img => !img.complete);
    if (pending.length === 0) go();
    else Promise.race([
      Promise.all(pending.map(img => new Promise(r => { img.onload = img.onerror = r; }))),
      sleep(2000),
    ]).then(go);
  };

  return (
    <div className="sf-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sf-modal wide" role="dialog" aria-modal="true" aria-label="Payment receipt">
        <div className="sf-modal-head">
          <div><h2>Receipt</h2><p>Print it or save it as a PDF.</p></div>
          <button type="button" className="sf-x" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="sf-modal-body">
          <div className="sf-receipt" ref={receiptRef}>
            <div className="sf-receipt-head">
              <div className="sf-receipt-brand">
                {institution.hasLogo && <img src={institutionLogoUrl()} alt="" />}
                <div style={{ minWidth: 0 }}>
                  <h3>{institution.name}</h3>
                  {institution.subtitle && <p>{institution.subtitle}</p>}
                </div>
              </div>
              <div className="sf-receipt-title"><b>Payment receipt</b><span>{payment.reference}</span></div>
            </div>
            <div className="sf-stamp" aria-hidden="true">PAID</div>
            <dl className="sf-receipt-grid">
              <div><dt>{tx('Student')}</dt><dd>{payment.studentName}</dd></div>
              <div><dt>{tx('Student ID')}</dt><dd>{payment.studentId}</dd></div>
              <div><dt>{tx('Programme')}</dt><dd>{payment.programName ?? '—'}</dd></div>
              <div><dt>{tx('Level')}</dt><dd>{payment.level != null ? levelName(payment.level) : '—'}</dd></div>
              <div><dt>Academic session</dt><dd>{payment.sessionName}</dd></div>
              <div><dt>Date paid</dt><dd>{formatDate(payment.paidAt ?? payment.createdAt, true)}</dd></div>
              <div><dt>Payment method</dt><dd>{method}</dd></div>
              <div><dt>Reference</dt><dd style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{payment.reference}</dd></div>
            </dl>
            {payment.items.length > 0 && (
              <table className="sf-lines" style={{ marginBottom: 12 }}>
                <tbody>
                  {payment.items.map(i => (
                    <tr key={i.name}><td><span className="sf-dot" />{i.name}</td><td>{formatMoney(i.amount, payment.currency)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="sf-receipt-amount"><span>Amount paid</span><strong>{formatMoney(payment.amount, payment.currency)}</strong></div>
            <div className="sf-receipt-foot">
              Fees for {payment.sessionName}: {data.fee && data.session.name === payment.sessionName
                ? <>total {formatMoney(data.fee.amount, data.currency)}, paid to date {formatMoney(data.paid, data.currency)}, balance {formatMoney(data.balance, data.currency)}.</>
                : 'see your Fees page for the current balance.'}
              <br />Issued electronically by {institution.name}. Quote the reference above in any enquiry.
            </div>
          </div>
        </div>
        <div className="sf-modal-foot">
          <button type="button" className="sf-btn-ghost" onClick={onClose}>Close</button>
          <button type="button" className="sf-btn" onClick={print}><Printer size={16} /> Print / Save PDF</button>
        </div>
      </div>
    </div>
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
