import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { AlertCircle, Ban, Loader2, Pencil, Plus, RotateCcw, Search, ShoppingBag, Tag } from 'lucide-react';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import FeeModal from '../superadmin/fees/FeeModal';
import NewBillModal from './NewBillModal';
import {
  cancelBillBatch, cancelStudentBill, getBillBatch, getBillBatches, getPriceList, savePriceItem, setPriceItemActive,
  type BillBatchInfo, type PriceCategory, type PriceItem,
} from '../../api/endpoints';
import { formatDate, formatMoney, moneyInput, parseMoney } from '../../utils/money';
import { levelName, tx, levelSuffix } from '../../utils/terms';
import { useAuth } from '../../contexts/AuthContext';

export const CATEGORY_LABEL: Record<PriceCategory, string> = {
  UNIFORM: 'Uniform', BOOKS: 'Books', LEVY: 'Levy / dues', EXAM: 'Exams', TRIP: 'Trip', FEEDING: 'Feeding', FINE: 'Fine', OTHER: 'Other',
};
const STATUS: Record<string, string> = { PAID: 'SUCCESS', PART_PAID: 'PENDING', UNPAID: 'FAILED', CANCELLED: 'VOIDED', DECLINED: 'ABANDONED' };
const STATUS_TEXT: Record<string, string> = { PAID: 'Paid', PART_PAID: 'Part paid', UNPAID: 'Unpaid', CANCELLED: 'Cancelled', DECLINED: 'Declined' };

export const useBursar = () => {
  const { user } = useAuth() as any;
  return user?.role !== 'ACCOUNTANT' || user?.financeDuty === 'BURSAR';
};

/**
 * Bills apart from school fees: everything billed (to a class, a house, boarders, one student …) with
 * what has come in, and the bursar's price list. Cashiers bill one student at a time from the list.
 */
export default function BillsPage() {
  const qc = useQueryClient();
  const bursar = useBursar();
  const [tab, setTab] = useState<'bills' | 'prices'>('bills');
  const [allSessions, setAllSessions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState<PriceItem | 'new' | null>(null);

  const bills = useQuery({ queryKey: ['bill-batches', allSessions], queryFn: () => getBillBatches(allSessions ? 0 : undefined) });
  const prices = useQuery({ queryKey: ['price-list'], queryFn: getPriceList, staleTime: 60_000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['bill-batches'] });
  const currency = bills.data?.currency ?? prices.data?.currency ?? 'GHS';

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + BILL_CSS}</style>
      <div className="fe-head">
        <div className="fe-title">
          <div className="fe-logo"><ShoppingBag size={24} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className="fe-h1">Bills</h1>
            <p className="fe-sub">{bursar ? 'Uniform, books, levies, trips and anything else students pay for apart from fees.'
              : 'Bill a student for something on the price list. Only the bursar bills groups or cancels bills.'}</p>
          </div>
        </div>
        <div className="fe-actions">
          {tab === 'prices' && bursar && <button type="button" className="fe-ghost" onClick={() => setEditing('new')}><Plus size={15} /> Add item</button>}
          <button type="button" className="fe-btn" onClick={() => setCreating(true)}><Plus size={15} /> New bill</button>
        </div>
      </div>

      <div className="fe-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'bills'} className={`fe-tab${tab === 'bills' ? ' active' : ''}`} onClick={() => setTab('bills')}>
          <ShoppingBag size={15} /> Bills issued
        </button>
        <button type="button" role="tab" aria-selected={tab === 'prices'} className={`fe-tab${tab === 'prices' ? ' active' : ''}`} onClick={() => setTab('prices')}>
          <Tag size={15} /> Price list
        </button>
      </div>

      {tab === 'bills' ? (
        <div className="fe-card">
          <div className="bl-bar">
            <span className="fe-muted fe-small">{allSessions ? 'Every session' : bills.data ? bills.data.session.name : ''}</span>
            <label className="fe-check" style={{ margin: 0 }}>
              <input type="checkbox" checked={allSessions} onChange={e => setAllSessions(e.target.checked)} /> Earlier sessions too
            </label>
          </div>
          {bills.isLoading ? <Skel /> : bills.isError ? <Failed retry={() => bills.refetch()} /> : !bills.data!.batches.length ? (
            <div className="fe-empty"><ShoppingBag size={34} style={{ color: 'rgba(var(--accent-rgb), 0.45)' }} />
              <h3>No bills yet</h3><p>Use <b>New bill</b> to charge a student, a class or everyone.</p></div>
          ) : (
            <ul className="bl-list">
              {bills.data!.batches.map(b => <BatchRow key={b.id} b={b} currency={currency} onOpen={() => setOpenId(b.id)} />)}
            </ul>
          )}
        </div>
      ) : (
        <div className="fe-card">
          {prices.isLoading ? <Skel /> : prices.isError ? <Failed retry={() => prices.refetch()} /> : !prices.data!.items.length ? (
            <div className="fe-empty"><Tag size={34} style={{ color: 'rgba(var(--accent-rgb), 0.45)' }} />
              <h3>The price list is empty</h3><p>{bursar ? 'Add what the school sells or charges for, with its price.' : 'Ask the bursar to add items.'}</p></div>
          ) : (
            <ul className="bl-list">
              {prices.data!.items.map(i => (
                <li key={i.id} className="bl-row" style={i.active ? undefined : { opacity: 0.55 }}>
                  <div className="bl-main">
                    <div className="fe-strong">{i.name}</div>
                    <div className="fe-muted fe-small">{CATEGORY_LABEL[i.category]}{i.description ? ` · ${i.description}` : ''}{!i.active ? ' · retired' : ''}</div>
                  </div>
                  <div className="bl-amt fe-strong">{formatMoney(i.price, currency)}</div>
                  {bursar && (
                    <div className="fe-row-actions">
                      {i.active && <button type="button" className="fe-icon-btn" onClick={() => setEditing(i)} aria-label={`Edit ${i.name}`}><Pencil size={14} /></button>}
                      <button type="button" className="fe-ghost sm" onClick={() => setPriceItemActive(i.id, !i.active)
                        .then(() => qc.invalidateQueries({ queryKey: ['price-list'] }))
                        .catch((e: any) => toast.error(tx(e?.response?.data?.message ?? 'Could not change the item')))}>
                        {i.active ? <><Ban size={13} /> Retire</> : <><RotateCcw size={13} /> Restore</>}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {creating && <NewBillModal bursar={bursar} onClose={() => setCreating(false)} onIssued={b => { setCreating(false); refresh(); if (b.batchId) setOpenId(b.batchId); }} />}
      {openId != null && <BatchModal id={openId} bursar={bursar} onClose={() => setOpenId(null)} onChanged={refresh} />}
      {editing && prices.data && <PriceItemModal item={editing === 'new' ? null : editing} categories={prices.data.categories} currency={currency}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['price-list'] }); }} />}
    </div>
  );
}

function BatchRow({ b, currency, onOpen }: { b: BillBatchInfo; currency: string; onOpen: () => void }) {
  const pct = b.billed > 0 ? Math.min(100, (b.paid / b.billed) * 100) : 0;
  return (
    <li>
      <button type="button" className="bl-row bl-click" onClick={onOpen}>
        <div className="bl-main">
          <div className="fe-strong">{b.title}{b.optional && <span className="fe-pill PENDING" style={{ marginLeft: 8 }}>Optional</span>}{b.cancelledAt && <span className="fe-pill VOIDED" style={{ marginLeft: 8 }}>Cancelled</span>}</div>
          <div className="fe-muted fe-small">{b.audience} · {formatMoney(b.amountEach, currency)} each · {formatDate(b.issuedAt)}{b.issuedBy ? ` by ${b.issuedBy}` : ''}</div>
          {b.open > 0 && <div className="fe-bar" style={{ marginTop: 8, maxWidth: 320 }}><span style={{ width: `${pct}%` }} /></div>}
        </div>
        <div className="bl-amt">
          <div className="fe-strong">{formatMoney(b.paid, currency)} <span className="fe-muted fe-small">of {formatMoney(b.billed, currency)}</span></div>
          <div className="fe-muted fe-small">{b.open} student{b.open === 1 ? '' : 's'}{b.declined ? ` · ${b.declined} declined` : ''}{b.cancelled ? ` · ${b.cancelled} cancelled` : ''}</div>
        </div>
      </button>
    </li>
  );
}

/** One bill: its lines, every student on it and what each has paid; the bursar cancels it (all or one student). */
function BatchModal({ id, bursar, onClose, onChanged }: { id: number; bursar: boolean; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['bill-batch', id], queryFn: () => getBillBatch(id) });
  const changed = () => { qc.invalidateQueries({ queryKey: ['bill-batch', id] }); onChanged(); };
  const ask = (title: string, html: string) => Swal.fire({
    title, html, input: 'text', inputPlaceholder: 'Reason', inputValidator: v => (!v?.trim() ? 'Give a reason' : undefined),
    icon: 'warning', showCancelButton: true, confirmButtonText: 'Cancel bill', cancelButtonText: 'Keep it', confirmButtonColor: '#e34948',
  });
  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await work(); toast.success(done); changed(); }
    catch (e: any) { toast.error(tx(e?.response?.data?.message ?? 'Could not cancel')); }
    finally { setBusy(false); }
  };
  const cancelAll = async () => {
    const r = await ask('Cancel this bill for everyone?', 'Open bills are cancelled. Anything already paid on them becomes credit for each student’s other debts.');
    if (r.isConfirmed) run(() => cancelBillBatch(id, String(r.value).trim()), 'Bill cancelled');
  };
  const cancelOne = async (billId: number, name: string) => {
    const r = await ask(`Cancel ${name}'s bill?`, 'Anything already paid on it becomes credit for their other debts.');
    if (r.isConfirmed) run(() => cancelStudentBill(billId, String(r.value).trim()), 'Bill cancelled');
  };
  const needle = q.trim().toLowerCase();
  const rows = (data?.roster ?? []).filter(s => !needle || s.name.toLowerCase().includes(needle) || s.username.toLowerCase().includes(needle));

  return (
    <FeeModal title={data?.title ?? 'Bill'} subtitle={data ? `${data.audience} · ${formatMoney(data.amountEach, data.currency)} each` : undefined} onClose={onClose} busy={busy}
      footer={<>
        {bursar && data && data.open > 0 ? <button type="button" className="fe-ghost" style={{ color: '#f87171' }} onClick={cancelAll} disabled={busy}><Ban size={14} /> Cancel for everyone</button> : <span />}
        <button type="button" className="fe-btn" onClick={onClose} disabled={busy}>Done</button>
      </>}>
      {isLoading || !data ? <Skel /> : (
        <>
          <div className="bl-kpis">
            <div><span>Billed</span><b>{formatMoney(data.billed, data.currency)}</b></div>
            <div><span>Paid</span><b style={{ color: '#34d399' }}>{formatMoney(data.paid, data.currency)}</b></div>
            <div><span>Outstanding</span><b style={{ color: '#fbbf24' }}>{formatMoney(data.outstanding, data.currency)}</b></div>
          </div>
          <ul className="bl-list bl-lines">
            {data.lines.map((l, i) => (
              <li key={i}><span>{l.name}{l.quantity > 1 ? ` × ${l.quantity}` : ''}</span><b>{formatMoney(l.amount, data.currency)}</b></li>
            ))}
          </ul>
          {(data.note || data.dueDate) && <p className="fe-muted fe-small" style={{ marginTop: 0 }}>{data.dueDate ? `Due ${formatDate(data.dueDate)}. ` : ''}{data.note}</p>}
          {data.roster.length > 6 && (
            <div className="fe-search" style={{ marginBottom: 10 }}>
              <Search size={15} /><input className="fe-input" placeholder={tx('Search name or Student ID')} value={q} onChange={e => setQ(e.target.value)} />
            </div>
          )}
          <ul className="bl-list">
            {rows.map(s => (
              <li key={s.billId} className="bl-row">
                <div className="bl-main">
                  <div className="fe-strong">{s.name}</div>
                  <div className="fe-muted fe-small">{s.username}{s.programName ? ` · ${s.programName}` : ''}{levelSuffix(s.level)}{s.statusNote ? ` · ${s.statusNote}` : ''}</div>
                </div>
                <div className="bl-amt">
                  <span className={`fe-pill ${STATUS[s.status]}`}>{STATUS_TEXT[s.status]}</span>
                  {s.balance > 0 && <div className="fe-muted fe-small" style={{ marginTop: 4 }}>owes {formatMoney(s.balance, data.currency)}</div>}
                </div>
                {bursar && s.status !== 'CANCELLED' && s.status !== 'DECLINED' && (
                  <button type="button" className="fe-icon-btn danger" onClick={() => cancelOne(s.billId, s.name)} disabled={busy} aria-label={`Cancel ${s.name}'s bill`}><Ban size={14} /></button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </FeeModal>
  );
}

function PriceItemModal({ item, categories, currency, onClose, onSaved }: {
  item: PriceItem | null; categories: PriceCategory[]; currency: string; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<PriceCategory>(item?.category ?? 'UNIFORM');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [busy, setBusy] = useState(false);
  const ok = name.trim() && parseMoney(price) > 0;
  const save = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      await savePriceItem(item?.id ?? null, { name: name.trim(), category, price: parseMoney(price), description: description.trim() || null });
      toast.success(item ? 'Item saved' : 'Item added');
      onSaved();
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not save the item'));
    } finally { setBusy(false); }
  };
  return (
    <FeeModal title={item ? 'Edit item' : 'Add to the price list'} subtitle="A new price applies to bills issued from now on." onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={!ok || busy}>{busy && <Loader2 size={15} className="fe-spin" />} Save</button>
        </div>
      </>}>
      <div className="fe-field">
        <label className="fe-label" htmlFor="pi-name">Name</label>
        <input id="pi-name" className="fe-input" style={{ width: '100%' }} maxLength={80} placeholder="e.g. School sweater" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="fe-grid2">
        <div className="fe-field">
          <label className="fe-label" htmlFor="pi-cat">Kind</label>
          <select id="pi-cat" className="fe-select" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value as PriceCategory)}>
            {categories.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="pi-price">Price</label>
          <div className="fe-money"><span>{currency}</span>
            <input id="pi-price" className="fe-input" inputMode="decimal" placeholder="0.00" value={price} onChange={e => setPrice(moneyInput(e.target.value))} /></div>
        </div>
      </div>
      <div className="fe-field" style={{ marginBottom: 0 }}>
        <label className="fe-label" htmlFor="pi-desc">Description <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
        <input id="pi-desc" className="fe-input" style={{ width: '100%' }} maxLength={200} placeholder="e.g. Sizes S to XL" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
    </FeeModal>
  );
}

const Skel = () => <div style={{ padding: 18, display: 'grid', gap: 10 }}>{[1, 2, 3].map(i => <div key={i} className="fe-skel" style={{ height: 52 }} />)}</div>;
const Failed = ({ retry }: { retry: () => void }) => (
  <div className="fe-empty"><AlertCircle size={34} style={{ color: '#f87171' }} /><h3>Couldn't load this</h3><p><button className="fe-link" onClick={retry}>Try again</button></p></div>
);

/** Rows shared by the bills, price list and student account pages. */
export const BILL_CSS = `
.bl-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.bl-list { list-style: none; margin: 0; padding: 0; }
.bl-row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); width: 100%; background: none; border-left: 0; border-right: 0; border-top: 0; color: inherit; font: inherit; text-align: left; }
.bl-list > li:last-child > .bl-row, .bl-list > .bl-row:last-child { border-bottom: 0; }
.bl-click { cursor: pointer; }
.bl-click:hover { background: rgba(255,255,255,0.03); }
.bl-main { flex: 1 1 auto; min-width: 0; }
.bl-amt { text-align: right; flex: 0 0 auto; }
.bl-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
.bl-kpis > div { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 12px; min-width: 0; }
.bl-kpis span { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: rgba(255,255,255,0.45); }
.bl-kpis b { display: block; font-size: 15px; margin-top: 2px; white-space: nowrap; }
.bl-lines { margin-bottom: 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
.bl-lines li { display: flex; justify-content: space-between; gap: 12px; padding: 9px 12px; font-size: 13.5px; }
.bl-lines li + li { border-top: 1px solid rgba(255,255,255,0.06); }
@media (max-width: 560px) {
  .bl-row { flex-wrap: wrap; padding: 12px 14px; }
  .bl-main { flex: 1 1 140px; }
  .bl-row { gap: 8px; }
  .bl-kpis { grid-template-columns: 1fr !important; gap: 6px; }
  .bl-kpis > div { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 12px; }
  .bl-kpis b { margin-top: 0; }
}
`;
