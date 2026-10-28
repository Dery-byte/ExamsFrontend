import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookOpen, CheckCircle2, HandCoins, Loader2, Printer } from 'lucide-react';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import FeeModal from '../superadmin/fees/FeeModal';
import { BILL_CSS } from './BillsPage';
import { AccountsHead, errorText, Pill, Section, today, Totals } from './accountsUi';
import { confirmCashUp, getCashBook, submitCashUp, type CashUpInfo, type CashUpMine } from '../../api/endpoints';
import { formatMoney, moneyInput, parseMoney } from '../../utils/money';

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');

/**
 * The cash book for a day: money in by method and by cashier, cancelled payments and refunds, and the
 * cash-ups. Everyone hands in what they took (their own cash-up); the bursar confirms others' cash-ups.
 */
export default function CashBookPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [handingIn, setHandingIn] = useState(false);
  const { data, isLoading, isFetching } = useQuery({ queryKey: ['cash-book', date], queryFn: () => getCashBook(date), placeholderData: p => p });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['cash-book'] }); qc.invalidateQueries({ queryKey: ['finance-dashboard'] }); };
  const cur = data?.currency ?? 'GHS';

  const confirm = async (c: CashUpInfo) => {
    try { await confirmCashUp(c.id); toast.success(`${c.cashier}'s cash-up confirmed`); refresh(); }
    catch (e) { toast.error(errorText(e, 'Could not confirm')); }
  };

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + BILL_CSS + '@media print { .fe-actions, .cb-noprint { display: none !important; } }'}</style>
      <AccountsHead icon={<BookOpen size={24} color="#fff" />} title="Cash book" sub="Money in and out for the day, and cash handed in."
        actions={<>
          <input type="date" className="fe-input" value={date} max={today()} onChange={e => e.target.value && setDate(e.target.value)} aria-label="Day" style={{ width: 170 }} />
          <button type="button" className="fe-ghost" onClick={() => window.print()}><Printer size={15} /> Print</button>
        </>} />
      {isLoading || !data ? <div className="fe-card" style={{ padding: 18 }}><div className="fe-skel" style={{ height: 160 }} /></div> : (
        <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .15s' }}>
          <Totals items={[
            { label: 'Received', value: formatMoney(data.totals.received, cur), tone: 'good' },
            { label: 'Payments', value: String(data.totals.payments) },
            { label: 'Refunded', value: formatMoney(data.totals.refunded, cur) },
            { label: 'Net', value: formatMoney(data.totals.net, cur) },
          ]} />

          <HandIn mine={data.mine} currency={cur} onOpen={() => setHandingIn(true)} />

          {data.canConfirm && data.awaitingConfirmation.length > 0 && (
            <Section title="Cash-ups to confirm" empty="" count={data.awaitingConfirmation.length}>
              {data.awaitingConfirmation.map(c => <CashUpRow key={c.id} c={c} cur={cur} onConfirm={() => confirm(c)} />)}
            </Section>
          )}

          <div className="cb-grid">
            <Section title="By method" empty="Nothing received." count={data.byMethod.length}>
              {data.byMethod.map(m => <li key={m.label} className="bl-row"><div className="bl-main">{m.label}</div><div className="bl-amt fe-strong">{formatMoney(m.amount, cur)}</div></li>)}
            </Section>
            <Section title="By cashier" empty="Nothing received." count={data.byCashier.length}>
              {data.byCashier.map(c => (
                <li key={c.label} className="bl-row"><div className="bl-main">{c.label}<div className="fe-muted fe-small">{c.payments} payment(s){c.cash > 0 ? ` · cash ${formatMoney(c.cash, cur)}` : ''}</div></div>
                  <div className="bl-amt fe-strong">{formatMoney(c.amount, cur)}</div></li>
              ))}
            </Section>
          </div>

          {data.today && data.notHandedIn.length > 0 && (
            <Section title="Not handed in yet" empty="" count={data.notHandedIn.length}>
              {data.notHandedIn.map(n => <li key={n.cashierId} className="bl-row"><div className="bl-main">{n.cashier}<div className="fe-muted fe-small">{n.payments} payment(s) since their last cash-up</div></div><div className="bl-amt fe-strong">{formatMoney(n.amount, cur)}</div></li>)}
            </Section>
          )}

          <Section title="Cash-ups" empty="No cash-ups on this day." count={data.cashUps.length}>
            {data.cashUps.map(c => <CashUpRow key={c.id} c={c} cur={cur} />)}
          </Section>

          <Section title="Payments received" empty="No payments on this day." count={data.payments.length}>
            {data.payments.map(p => (
              <li key={p.id} className="bl-row" style={p.status === 'VOIDED' ? { opacity: 0.55 } : undefined}>
                <div className="bl-main"><div className="fe-strong">{p.studentName} <span className="fe-muted fe-small">· {p.studentId}</span></div>
                  <div className="fe-muted fe-small">{time(p.paidAt)} · {p.methodName}{p.recordedBy ? ` · ${p.recordedBy}` : ''} · {p.receiptNo ?? p.reference}{p.cashedUp ? ' · handed in' : ''}</div></div>
                <div className="bl-amt"><div className="fe-strong">{formatMoney(p.amount, cur)}</div>{p.status === 'VOIDED' && <Pill status="VOIDED" />}</div>
              </li>
            ))}
          </Section>

          {(data.voids.length > 0 || data.refunds.length > 0) && (
            <div className="cb-grid">
              <Section title="Cancelled on this day" empty="None." count={data.voids.length}>
                {data.voids.map(p => (
                  <li key={p.id} className="bl-row"><div className="bl-main"><div className="fe-strong">{p.studentName}</div>
                    <div className="fe-muted fe-small">{p.receiptNo} · {p.methodName} · {p.note ?? `by ${p.voidedBy}`}</div></div>
                    <div className="bl-amt fe-strong">{formatMoney(p.amount, cur)}</div></li>
                ))}
              </Section>
              <Section title="Refunds" empty="None." count={data.refunds.length}>
                {data.refunds.map(r => (
                  <li key={r.id} className="bl-row" style={r.status === 'VOIDED' ? { opacity: 0.55 } : undefined}><div className="bl-main"><div className="fe-strong">{r.studentName}</div>
                    <div className="fe-muted fe-small">{r.number} · {r.methodName}{r.paidTo ? ` · ${r.paidTo}` : ''} · {r.reason}</div></div>
                    <div className="bl-amt"><div className="fe-strong">{formatMoney(r.amount, cur)}</div><Pill status={r.status} /></div></li>
                ))}
              </Section>
            </div>
          )}
        </div>
      )}
      {handingIn && data && <CashUpModal mine={data.mine} currency={cur} onClose={() => setHandingIn(false)} onDone={() => { setHandingIn(false); refresh(); }} />}
      <style>{`.cb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 0 14px; }`}</style>
    </div>
  );
}

function HandIn({ mine, currency, onOpen }: { mine: CashUpMine; currency: string; onOpen: () => void }) {
  const has = mine.payments > 0 || mine.refunds > 0;
  return (
    <div className="fe-card cb-noprint" style={{ margin: '14px 0', padding: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div className="fe-strong"><HandCoins size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Your cash to hand in</div>
        <div className="fe-muted fe-small" style={{ marginTop: 4 }}>
          {has ? <><b style={{ color: '#fbbf24' }}>{formatMoney(mine.expectedCash, currency)}</b> cash from {mine.payments} payment(s){mine.nonCash > 0 ? `, plus ${formatMoney(mine.nonCash, currency)} by bank/other (nothing to hand over)` : ''}{mine.refunds ? `, less ${mine.refunds} cash refund(s)` : ''}.</>
            : 'Nothing since your last cash-up.'}
        </div>
      </div>
      {has && <button type="button" className="fe-btn" onClick={onOpen}><HandCoins size={15} /> Hand in</button>}
    </div>
  );
}

function CashUpRow({ c, cur, onConfirm }: { c: CashUpInfo; cur: string; onConfirm?: () => void }) {
  const off = c.difference !== 0;
  return (
    <li className="bl-row">
      <div className="bl-main"><div className="fe-strong">{c.cashier} <span className="fe-muted fe-small">· {time(c.createdAt)} · {c.payments} payment(s)</span></div>
        <div className="fe-muted fe-small">Expected {formatMoney(c.expectedCash, cur)} · counted {formatMoney(c.declaredCash, cur)}
          {off && <b style={{ color: c.difference < 0 ? '#f87171' : '#fbbf24' }}> · {c.difference < 0 ? 'short' : 'over'} {formatMoney(Math.abs(c.difference), cur)}</b>}
          {c.note ? ` · ${c.note}` : ''}{c.confirmedBy ? ` · confirmed by ${c.confirmedBy}` : ''}</div></div>
      <div className="bl-amt"><Pill status={c.status} /></div>
      {onConfirm && <button type="button" className="fe-ghost sm" onClick={onConfirm}><CheckCircle2 size={13} /> Confirm</button>}
    </li>
  );
}

function CashUpModal({ mine, currency, onClose, onDone }: { mine: CashUpMine; currency: string; onClose: () => void; onDone: () => void }) {
  const [counted, setCounted] = useState(String(mine.expectedCash));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const v = parseMoney(counted);
  const diff = Math.round((v - mine.expectedCash) * 100) / 100;
  const ok = counted.trim() !== '' && v >= 0 && (diff === 0 || note.trim().length > 0);
  const save = async () => {
    if (!ok) return;
    setBusy(true);
    try { await submitCashUp(v, note.trim() || undefined); toast.success('Handed in. The bursar will confirm it.'); onDone(); }
    catch (e) { toast.error(errorText(e, 'Could not hand in')); }
    finally { setBusy(false); }
  };
  return (
    <FeeModal title="Hand in your cash" subtitle="Everything you recorded since your last cash-up." onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={!ok || busy}>{busy ? <Loader2 size={15} className="fe-spin" /> : <HandCoins size={15} />} Hand in</button>
        </div>
      </>}>
      <Totals items={[{ label: 'Expected cash', value: formatMoney(mine.expectedCash, currency) }, { label: 'Payments', value: String(mine.payments) },
        { label: 'Bank / other', value: formatMoney(mine.nonCash, currency) }]} />
      <div className="fe-field" style={{ marginTop: 14 }}>
        <label className="fe-label" htmlFor="cu-count">Cash you counted</label>
        <div className="fe-money"><span>{currency}</span><input id="cu-count" className="fe-input" inputMode="decimal" value={counted} onChange={e => setCounted(moneyInput(e.target.value))} /></div>
        {counted.trim() !== '' && diff !== 0 && <div className="fe-hint" style={{ color: diff < 0 ? '#f87171' : '#fbbf24' }}>{diff < 0 ? 'Short' : 'Over'} by {formatMoney(Math.abs(diff), currency)}. Say why below.</div>}
      </div>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="cu-note">Note {diff === 0 && <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span>}</label>
        <input id="cu-note" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. GHS 20 short, a torn note" value={note} onChange={e => setNote(e.target.value)} />
      </div>
    </FeeModal>
  );
}
