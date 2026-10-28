import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { History, Loader2, Package, PackageCheck, PackagePlus, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import FeeModal from '../superadmin/fees/FeeModal';
import { BILL_CSS, useBursar } from './BillsPage';
import { AccountsHead, errorText, Section, Totals } from './accountsUi';
import {
  adjustStock, getPriceList, getStockHistory, getStores, getToHandOver, handOverItems, receiveStock, setItemStocked,
  type HandOverLine, type StoreItem,
} from '../../api/endpoints';
import { formatDate, formatMoney, moneyInput, parseMoney } from '../../utils/money';
import { tx } from '../../utils/terms';
import { useAuth } from '../../contexts/AuthContext';

const KIND: Record<string, string> = { RECEIVED: 'Received', ISSUED: 'Handed over', RETURNED: 'Returned', ADJUSTED: 'Count corrected' };

/**
 * The stores: what the school holds of uniform, books and other price-list goods, deliveries and
 * stock-takes (bursar), and items billed but not yet handed over. Stock only leaves when handed over.
 */
export default function StoresPage() {
  const qc = useQueryClient();
  const bursar = useBursar();
  const { user } = useAuth() as any;
  const base = user?.role === 'ACCOUNTANT' ? '/accounts/students' : '/super-admin/student-accounts';
  const [tab, setTab] = useState<'store' | 'out'>('store');
  const [open, setOpen] = useState<{ kind: 'receive' | 'count' | 'history' | 'setup'; item?: StoreItem } | null>(null);
  const [handing, setHanding] = useState<HandOverLine | null>(null);
  const [q, setQ] = useState('');
  const stores = useQuery({ queryKey: ['stores'], queryFn: getStores });
  const out = useQuery({ queryKey: ['to-hand-over'], queryFn: () => getToHandOver(), enabled: tab === 'out' });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['stores'] }); qc.invalidateQueries({ queryKey: ['to-hand-over'] }); qc.invalidateQueries({ queryKey: ['price-list'] }); qc.invalidateQueries({ queryKey: ['student-statement'] }); };
  const cur = stores.data?.currency ?? 'GHS';
  const needle = q.trim().toLowerCase();
  const lines = (out.data?.lines ?? []).filter(l => !needle || `${l.studentName} ${l.username} ${l.name}`.toLowerCase().includes(needle));

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + BILL_CSS}</style>
      <AccountsHead icon={<Package size={24} color="#fff" />} title="Stores"
        sub={tx('Uniform, books and other items the school keeps: what is in the store, deliveries, and what students are still to collect.')}
        actions={bursar ? <button type="button" className="fe-btn" onClick={() => setOpen({ kind: 'setup' })}><Plus size={15} /> Keep stock of an item</button> : undefined} />
      {stores.data && <Totals items={[
        { label: 'Items kept', value: String(stores.data.items.length) },
        { label: 'To reorder', value: String(stores.data.low), tone: stores.data.low ? 'warn' : undefined },
        { label: 'Value at cost', value: formatMoney(stores.data.value, cur) },
        { label: 'Hand over', value: stores.data.issueBeforePayment ? 'Before payment' : 'After payment' },
      ]} />}
      <div className="fe-tabs" role="tablist" style={{ marginTop: 14 }}>
        <button type="button" role="tab" aria-selected={tab === 'store'} className={`fe-tab${tab === 'store' ? ' active' : ''}`} onClick={() => setTab('store')}><Package size={15} /> In the store</button>
        <button type="button" role="tab" aria-selected={tab === 'out'} className={`fe-tab${tab === 'out' ? ' active' : ''}`} onClick={() => setTab('out')}><PackageCheck size={15} /> To hand over</button>
      </div>

      {tab === 'store' ? (
        <Section title="In the store" count={stores.data?.items.length ?? 0}
          empty={stores.isLoading ? 'Loading…' : bursar ? 'No item is kept yet. Use “Keep stock of an item” to start counting uniform, books and so on.' : 'No item is kept in the store yet.'}>
          {(stores.data?.items ?? []).map(i => (
            <li key={i.id} className="bl-row">
              <div className="bl-main"><div className="fe-strong">{i.name}{i.low && <span className="fe-pill PENDING" style={{ marginLeft: 8 }}>Reorder</span>}</div>
                <div className="fe-muted fe-small">Sells at {formatMoney(i.price, cur)}{i.unitCost != null ? ` · costs ${formatMoney(i.unitCost, cur)}` : ''}{i.reorderLevel != null ? ` · reorder at ${i.reorderLevel}` : ''}{i.toHandOver ? ` · ${i.toHandOver} to hand over` : ''}</div></div>
              <div className="bl-amt"><div className="fe-strong" style={{ fontSize: 16, color: i.onHand === 0 ? '#f87171' : undefined }}>{i.onHand}</div><div className="fe-muted fe-small">in the store</div></div>
              <div className="fe-row-actions" style={{ flexWrap: 'wrap' }}>
                {bursar && <button type="button" className="fe-ghost sm" onClick={() => setOpen({ kind: 'receive', item: i })}><PackagePlus size={13} /> Receive</button>}
                {bursar && <button type="button" className="fe-ghost sm" onClick={() => setOpen({ kind: 'count', item: i })}><SlidersHorizontal size={13} /> Count</button>}
                <button type="button" className="fe-icon-btn" onClick={() => setOpen({ kind: 'history', item: i })} aria-label={`History of ${i.name}`}><History size={14} /></button>
              </div>
            </li>
          ))}
        </Section>
      ) : (
        <div className="fe-card" style={{ marginBottom: 14 }}>
          <div className="bl-bar">
            <div className="fe-search" style={{ flex: '1 1 240px', maxWidth: 420 }}><Search size={15} /><input className="fe-input" placeholder={tx('Search name, Student ID or item')} value={q} onChange={e => setQ(e.target.value)} aria-label="Search" /></div>
          </div>
          {out.isLoading ? <div style={{ padding: 18 }}><div className="fe-skel" style={{ height: 80 }} /></div> : lines.length === 0
            ? <p className="fe-muted fe-small" style={{ padding: '14px 16px', margin: 0 }}>{needle ? 'Nothing matches.' : 'Everything billed has been handed over.'}</p> : (
            <ul className="bl-list">
              {lines.map(l => (
                <li key={l.lineId} className="bl-row">
                  <div className="bl-main"><div className="fe-strong"><Link to={`${base}?student=${l.studentId}`} className="fe-link" style={{ color: 'inherit' }}>{l.studentName}</Link>
                    <span className="fe-muted fe-small"> · {l.username}</span></div>
                    <div className="fe-muted fe-small">{l.name}: {l.issued} of {l.quantity} handed over · {l.billTitle} · {formatDate(l.billedAt)}
                      {(l.billBalance ?? 0) > 0 && <span style={{ color: '#fbbf24' }}> · {formatMoney(l.billBalance, cur)} unpaid</span>}</div></div>
                  <button type="button" className="fe-ghost sm" onClick={() => setHanding(l)} disabled={!l.canHandOver} title={l.canHandOver ? undefined : 'Handed over once the bill is paid'}>
                    <PackageCheck size={13} /> Hand over</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open?.kind === 'setup' && <SetupModal onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} />}
      {open?.kind === 'receive' && open.item && <ReceiveModal item={open.item} currency={cur} onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} />}
      {open?.kind === 'count' && open.item && <CountModal item={open.item} onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} />}
      {open?.kind === 'history' && open.item && <HistoryModal item={open.item} currency={cur} onClose={() => setOpen(null)} />}
      {handing && <HandOverModal line={handing} onClose={() => setHanding(null)} onDone={() => { setHanding(null); refresh(); }} />}
    </div>
  );
}

function Foot({ busy, ok, label, onClose, onSave }: { busy: boolean; ok: boolean; label: string; onClose: () => void; onSave: () => void }) {
  return (<>
    <span />
    <div className="fe-foot-actions">
      <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
      <button type="button" className="fe-btn" onClick={onSave} disabled={!ok || busy}>{busy && <Loader2 size={15} className="fe-spin" />} {label}</button>
    </div>
  </>);
}

function useSave(onDone: () => void, done: string) {
  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try { await work(); toast.success(done); onDone(); } catch (e) { toast.error(errorText(e, 'That did not work')); } finally { setBusy(false); }
  };
  return { busy, run };
}

function SetupModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data } = useQuery({ queryKey: ['price-list'], queryFn: getPriceList });
  const [id, setId] = useState<number | ''>('');
  const [reorder, setReorder] = useState('');
  const { busy, run } = useSave(onDone, 'The store now counts this item');
  const choices = (data?.items ?? []).filter(i => i.active && !i.stocked);
  return (
    <FeeModal title="Keep stock of an item" subtitle="Count it in the store from now on; then receive the stock you hold." onClose={onClose} busy={busy} narrow
      footer={<Foot busy={busy} ok={id !== ''} label="Start counting" onClose={onClose} onSave={() => run(() => setItemStocked(Number(id), true, reorder ? Number(reorder) : null))} />}>
      <div className="fe-field">
        <label className="fe-label" htmlFor="st-item">Item from the price list</label>
        <select id="st-item" className="fe-select" style={{ width: '100%' }} value={id} onChange={e => setId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">{choices.length ? 'Choose…' : 'Every item is already counted (add items on Bills › Price list)'}</option>
          {choices.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="st-reorder">Warn me when it drops to <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
        <input id="st-reorder" className="fe-input" inputMode="numeric" style={{ width: '100%' }} placeholder="e.g. 10" value={reorder} onChange={e => setReorder(e.target.value.replace(/\D/g, '').slice(0, 6))} />
      </div>
    </FeeModal>
  );
}

function ReceiveModal({ item, currency, onClose, onDone }: { item: StoreItem; currency: string; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState(item.unitCost != null ? String(item.unitCost) : '');
  const [ref, setRef] = useState('');
  const { busy, run } = useSave(onDone, 'Stock received');
  const n = Number(qty);
  return (
    <FeeModal title={`Receive ${item.name}`} subtitle={`The store holds ${item.onHand} now.`} onClose={onClose} busy={busy} narrow
      footer={<Foot busy={busy} ok={n >= 1} label={n >= 1 ? `Add ${n}` : 'Add'} onClose={onClose}
        onSave={() => run(() => receiveStock(item.id, { quantity: n, unitCost: cost ? parseMoney(cost) : undefined, reference: ref.trim() || undefined }))} />}>
      <div className="fe-grid2">
        <div className="fe-field">
          <label className="fe-label" htmlFor="rc-qty">How many</label>
          <input id="rc-qty" className="fe-input" inputMode="numeric" style={{ width: '100%' }} value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="rc-cost">Cost each <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
          <div className="fe-money"><span>{currency}</span><input id="rc-cost" className="fe-input" inputMode="decimal" value={cost} onChange={e => setCost(moneyInput(e.target.value))} /></div>
        </div>
      </div>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="rc-ref">Supplier and delivery note <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
        <input id="rc-ref" className="fe-input" style={{ width: '100%' }} maxLength={160} placeholder="e.g. Kente Uniforms, DN 0042" value={ref} onChange={e => setRef(e.target.value)} />
      </div>
    </FeeModal>
  );
}

function CountModal({ item, onClose, onDone }: { item: StoreItem; onClose: () => void; onDone: () => void }) {
  const [count, setCount] = useState(String(item.onHand));
  const [reason, setReason] = useState('');
  const { busy, run } = useSave(onDone, 'Count corrected');
  const n = Number(count), diff = n - item.onHand;
  return (
    <FeeModal title={`Count ${item.name}`} subtitle={`After a stock-take: the store's records say ${item.onHand}.`} onClose={onClose} busy={busy} narrow
      footer={<Foot busy={busy} ok={count !== '' && diff !== 0 && reason.trim().length > 0} label="Correct the count" onClose={onClose}
        onSave={() => run(() => adjustStock(item.id, n, reason.trim()))} />}>
      <div className="fe-field">
        <label className="fe-label" htmlFor="ct-n">Counted</label>
        <input id="ct-n" className="fe-input" inputMode="numeric" style={{ width: '100%' }} value={count} onChange={e => setCount(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        {count !== '' && diff !== 0 && <div className="fe-hint" style={{ color: diff < 0 ? '#f87171' : '#fbbf24' }}>{diff < 0 ? `${-diff} missing` : `${diff} more than recorded`}</div>}
      </div>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="ct-why">Reason</label>
        <input id="ct-why" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. Two damaged by rain" value={reason} onChange={e => setReason(e.target.value)} />
      </div>
    </FeeModal>
  );
}

function HistoryModal({ item, currency, onClose }: { item: StoreItem; currency: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['stock-history', item.id], queryFn: () => getStockHistory(item.id) });
  return (
    <FeeModal title={item.name} subtitle={`In the store: ${item.onHand}`} onClose={onClose}
      footer={<><span /><button type="button" className="fe-btn" onClick={onClose}>Done</button></>}>
      {isLoading ? <div className="fe-skel" style={{ height: 120 }} /> : !data?.length ? <p className="fe-muted fe-small">Nothing recorded yet.</p> : (
        <ul className="bl-list">
          {data.map(m => (
            <li key={m.id} className="bl-row">
              <div className="bl-main"><div className="fe-strong">{KIND[m.kind]} <span className="fe-muted fe-small">· {formatDate(m.at, true)} · {m.by}</span></div>
                <div className="fe-muted fe-small">{[m.studentName, m.reference, m.unitCost != null ? `${formatMoney(m.unitCost, currency)} each` : null, m.note].filter(Boolean).join(' · ') || '—'}</div></div>
              <div className="bl-amt"><div className="fe-strong" style={{ color: m.quantity < 0 ? '#f87171' : '#34d399' }}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</div><div className="fe-muted fe-small">then {m.balanceAfter}</div></div>
            </li>
          ))}
        </ul>
      )}
    </FeeModal>
  );
}

export function HandOverModal({ line, onClose, onDone }: { line: HandOverLine | { lineId: number; name: string; quantity: number; issued: number; studentName: string }; onClose: () => void; onDone: () => void }) {
  const left = line.quantity - line.issued;
  const [qty, setQty] = useState(String(left));
  const { busy, run } = useSave(onDone, 'Handed over');
  const n = Number(qty);
  return (
    <FeeModal title={`Hand over ${line.name}`} subtitle={`To ${line.studentName}: ${line.issued} of ${line.quantity} handed over so far.`} onClose={onClose} busy={busy} narrow
      footer={<Foot busy={busy} ok={n >= 1 && n <= left} label={`Hand over ${n >= 1 ? n : ''}`} onClose={onClose} onSave={() => run(() => handOverItems(line.lineId, n))} />}>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="ho-qty">How many now</label>
        <input id="ho-qty" className="fe-input" inputMode="numeric" style={{ width: '100%' }} value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, '').slice(0, 5))} />
        {n > left && <div className="fe-hint" style={{ color: '#f87171' }}>Only {left} left on this bill.</div>}
      </div>
    </FeeModal>
  );
}
