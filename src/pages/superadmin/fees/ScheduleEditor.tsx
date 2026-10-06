import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown, ChevronUp, Info, Layers, Loader2, Plus, Trash2, Wallet } from 'lucide-react';
import FeeModal from './FeeModal';
import { saveFeeSchedule, type FeeLevelRow, type FeeProgramRow, type SessionRef } from '../../../api/endpoints';
import { formatMoney, moneyInput, parseMoney, roundMoney } from '../../../utils/money';
import { isSchoolMode, levelName } from '../../../utils/terms';

type Item = { key: number; name: string; amount: string };

const UNIVERSITY_ITEMS = ['Tuition', 'Academic facility user fee', 'SRC dues', 'ICT / Internet', 'Library', 'Medical / Health', 'Examination', 'Sports', 'Hall / Residence'];
const SCHOOL_ITEMS = ['School fees', 'PTA levy', 'Sanitation', 'Maintenance', 'ICT', 'Sports', 'Examination', 'Library', 'Feeding'];

let nextKey = 1;
const newItem = (name = '', amount = ''): Item => ({ key: nextKey++, name, amount });

/** Sets what one programme + level pays this session: a lump sum, or a breakdown students can see. */
export default function ScheduleEditor({ program, row, session, currency, onClose, onSaved }: {
  program: FeeProgramRow; row: FeeLevelRow; session: SessionRef; currency: string;
  onClose: () => void; onSaved: () => void;
}) {
  const existing = row.schedule;
  const [itemised, setItemised] = useState(existing?.itemised ?? false);
  const [lump, setLump] = useState(existing && !existing.itemised ? String(existing.amount) : '');
  const [items, setItems] = useState<Item[]>(() =>
    existing?.itemised ? existing.components.map(c => newItem(c.name, String(c.amount))) : []);
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [also, setAlso] = useState<number[]>([]);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestions = (isSchoolMode() ? SCHOOL_ITEMS : UNIVERSITY_ITEMS)
    .filter(s => !items.some(i => i.name.trim().toLowerCase() === s.toLowerCase()));
  const otherLevels = program.levels.filter(l => l.level !== row.level);
  const title = `${program.name} · ${levelName(row.level)}`;

  const total = useMemo(() => itemised
    ? roundMoney(items.reduce((sum, i) => sum + (Number.isFinite(parseMoney(i.amount)) ? parseMoney(i.amount) : 0), 0))
    : (Number.isFinite(parseMoney(lump)) ? parseMoney(lump) : 0), [itemised, items, lump]);

  // Problems, shown once the Super Admin has tried to save
  const itemErrors = useMemo(() => {
    const seen = new Set<string>();
    return items.map(i => {
      const name = i.name.trim().toLowerCase();
      const dup = name !== '' && seen.has(name);
      seen.add(name);
      return { name: name === '' || dup, amount: !(parseMoney(i.amount) > 0), dup };
    });
  }, [items]);
  const error = itemised
    ? items.length === 0 ? 'Add at least one item to the breakdown.'
      : itemErrors.some(e => e.dup) ? 'Two items have the same name.'
      : itemErrors.some(e => e.name) ? 'Every item needs a name.'
      : itemErrors.some(e => e.amount) ? 'Every item needs an amount above zero.'
      : null
    : !(parseMoney(lump) > 0) ? 'Enter the fee amount.' : null;

  const switchMode = (toItemised: boolean) => {
    if (toItemised === itemised) return;
    // Keep what was typed: a lump sum becomes the first item, a breakdown's total becomes the lump sum
    if (toItemised && items.length === 0) {
      const first = (isSchoolMode() ? SCHOOL_ITEMS : UNIVERSITY_ITEMS)[0];
      setItems([newItem(first, parseMoney(lump) > 0 ? lump : '')]);
    }
    if (!toItemised && !(parseMoney(lump) > 0) && total > 0) setLump(String(total));
    setItemised(toItemised);
  };

  const update = (key: number, patch: Partial<Item>) => setItems(list => list.map(i => i.key === key ? { ...i, ...patch } : i));
  const move = (index: number, by: number) => setItems(list => {
    const next = [...list];
    const [it] = next.splice(index, 1);
    next.splice(index + by, 0, it);
    return next;
  });

  const save = async () => {
    setTried(true);
    if (error) return;
    setSaving(true);
    try {
      const saved = await saveFeeSchedule({
        programId: program.id, level: row.level, sessionId: session.id, itemised,
        amount: itemised ? undefined : parseMoney(lump),
        components: itemised ? items.map(i => ({ name: i.name.trim(), amount: parseMoney(i.amount) })) : undefined,
        dueDate: dueDate || null, note: note.trim() || null, alsoApplyToLevels: also,
      });
      toast.success(saved.length > 1 ? `Fee saved for ${saved.length} levels` : `Fee saved for ${levelName(row.level)}`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not save the fee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FeeModal
      title={existing ? 'Edit fee' : 'Set fee'}
      subtitle={<>{title} · {session.name}</>}
      onClose={onClose}
      busy={saving}
      footer={<>
        <div className="fe-muted" style={{ fontSize: 12.5 }}>
          Total <strong style={{ color: '#fff', fontSize: 15, marginLeft: 6 }}>{formatMoney(total, currency)}</strong>
          {also.length > 0 && <span> · also for {also.length} other level{also.length > 1 ? 's' : ''}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="fe-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="fe-spin" /> : <Wallet size={15} />} Save fee
          </button>
        </div>
      </>}
    >
      {row.collected > 0 && (
        <div className="fe-note warn">
          <AlertTriangle size={15} />
          <span>Students have already paid {formatMoney(row.collected, currency)} towards this fee. Changing the amount updates their balances straight away.</span>
        </div>
      )}

      <div className="fe-field">
        <span className="fe-label">How should students see this fee?</span>
        <div className="fe-seg" role="radiogroup" aria-label="Fee type">
          <button type="button" role="radio" aria-checked={!itemised} className={!itemised ? 'active' : ''} onClick={() => switchMode(false)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wallet size={14} /> Lump sum</span>
            <small>One total amount</small>
          </button>
          <button type="button" role="radio" aria-checked={itemised} className={itemised ? 'active' : ''} onClick={() => switchMode(true)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Layers size={14} /> Itemised breakdown</span>
            <small>School fees, sanitation, maintenance …</small>
          </button>
        </div>
      </div>

      {!itemised ? (
        <div className="fe-field">
          <label className="fe-label" htmlFor="fe-lump">Fee for the session</label>
          <div className="fe-money lg">
            <span>{currency}</span>
            <input id="fe-lump" className="fe-input" inputMode="decimal" placeholder="0.00" value={lump}
              onChange={e => setLump(moneyInput(e.target.value))}
              style={tried && error ? { borderColor: '#f87171' } : undefined} />
          </div>
        </div>
      ) : (
        <div className="fe-field">
          <span className="fe-label">Breakdown <span className="fe-muted" style={{ fontWeight: 500 }}>— students see each line on their Fees page</span></span>
          <div className="fe-items">
            {items.map((it, i) => (
              <div className="fe-item" key={it.key}>
                <div className="fe-order">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${it.name || 'item'} up`}><ChevronUp size={14} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${it.name || 'item'} down`}><ChevronDown size={14} /></button>
                </div>
                <input className="fe-input" placeholder="Item, e.g. Sanitation" maxLength={80} value={it.name}
                  onChange={e => update(it.key, { name: e.target.value })} aria-label={`Item ${i + 1} name`}
                  style={tried && itemErrors[i]?.name ? { borderColor: '#f87171' } : undefined} />
                <div className="fe-money">
                  <span>{currency}</span>
                  <input className="fe-input" inputMode="decimal" placeholder="0.00" value={it.amount}
                    onChange={e => update(it.key, { amount: moneyInput(e.target.value) })} aria-label={`Item ${i + 1} amount`}
                    style={tried && itemErrors[i]?.amount ? { borderColor: '#f87171' } : undefined} />
                </div>
                <button type="button" className="fe-icon-btn danger" onClick={() => setItems(list => list.filter(x => x.key !== it.key))}
                  aria-label={`Remove ${it.name || 'item'}`}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="fe-suggest">
            <button type="button" onClick={() => setItems(list => [...list, newItem()])} style={{ borderStyle: 'solid' }}><Plus size={13} /> Add item</button>
            {suggestions.slice(0, 7).map(s => (
              <button type="button" key={s} onClick={() => setItems(list => [...list, newItem(s)])}><Plus size={12} /> {s}</button>
            ))}
          </div>
          <div className="fe-total">
            <span>Total ({items.length} item{items.length === 1 ? '' : 's'})</span>
            <strong>{formatMoney(total, currency)}</strong>
          </div>
        </div>
      )}

      {tried && error && <div className="fe-note warn" role="alert"><AlertTriangle size={15} /><span>{error}</span></div>}

      <div className="fe-grid2">
        <div className="fe-field">
          <label className="fe-label" htmlFor="fe-due">Due date <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
          <input id="fe-due" type="date" className="fe-input" style={{ width: '100%' }} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="fe-note">Note to students <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
          <input id="fe-note" className="fe-input" style={{ width: '100%' }} maxLength={500} placeholder="e.g. Pay at least half before exams"
            value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>

      {otherLevels.length > 0 && (
        <div className="fe-field" style={{ marginBottom: 0 }}>
          <span className="fe-label">Use the same fee for</span>
          <div className="fe-checks">
            {otherLevels.map(l => {
              const on = also.includes(l.level);
              return (
                <label key={l.level} className={`fe-check${on ? ' on' : ''}`}
                  title={l.schedule ? `Replaces the current ${formatMoney(l.schedule.amount, currency)}` : undefined}>
                  <input type="checkbox" checked={on}
                    onChange={() => setAlso(a => on ? a.filter(x => x !== l.level) : [...a, l.level])} />
                  {levelName(l.level)}
                  {l.schedule && <span className="fe-muted fe-small">· replaces {formatMoney(l.schedule.amount, currency)}</span>}
                </label>
              );
            })}
          </div>
          <div className="fe-hint" style={{ display: 'flex', gap: 6 }}><Info size={12} style={{ marginTop: 2 }} /> Handy when several levels pay the same. You can still change each one later.</div>
        </div>
      )}
    </FeeModal>
  );
}
