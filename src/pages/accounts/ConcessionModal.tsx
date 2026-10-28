import { useState } from 'react';
import toast from 'react-hot-toast';
import { Info, Loader2 } from 'lucide-react';
import FeeModal from '../superadmin/fees/FeeModal';
import { StudentPicker, type Picked } from './NewBillModal';
import { grantConcession, type ConcessionInfo, type ConcessionKind } from '../../api/endpoints';
import { moneyInput, parseMoney } from '../../utils/money';
import { periodName, tx } from '../../utils/terms';
import { errorText } from './accountsUi';

const KINDS: { value: ConcessionKind; label: string }[] = [
  { value: 'SCHOLARSHIP', label: 'Scholarship (school-funded)' }, { value: 'BURSARY', label: 'Bursary / hardship' },
  { value: 'SIBLING', label: 'Sibling discount' }, { value: 'STAFF_CHILD', label: 'Staff child discount' },
  { value: 'WAIVER', label: 'Waiver' }, { value: 'OTHER', label: 'Other' },
];

/**
 * The bursar grants a concession on a student's school fees for the current session: a percentage
 * (of the whole fee or some items) or an amount off each fee; every term or one term. A reason is required.
 */
export default function ConcessionModal({ student, currency, terms, onClose, onSaved }: {
  student?: Picked; currency: string; terms: number; onClose: () => void; onSaved: (c: ConcessionInfo) => void;
}) {
  const [who, setWho] = useState<Picked[]>(student ? [student] : []);
  const [kind, setKind] = useState<ConcessionKind>('SCHOLARSHIP');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [value, setValue] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [term, setTerm] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const v = parseMoney(value);
  const itemChoices = who[0]?.items ?? [];
  const ok = who.length === 1 && v > 0 && (mode === 'AMOUNT' || v <= 100) && note.trim().length > 0;

  const save = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      const c = await grantConcession({ studentId: who[0].id, kind, title: title.trim() || undefined, mode, value: v,
        items: items.length ? items : undefined, term: term === '' ? null : term, note: note.trim() });
      toast.success(`${c.title} granted to ${c.studentName}`);
      onSaved(c);
    } catch (e) {
      toast.error(errorText(e, 'Could not grant the concession'));
    } finally { setBusy(false); }
  };

  return (
    <FeeModal title="Grant a concession" subtitle="Takes money off a student's school fees for this session." onClose={onClose} busy={busy}
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={!ok || busy}>{busy && <Loader2 size={15} className="fe-spin" />} Grant</button>
        </div>
      </>}>
      <StudentPicker picked={who} setPicked={p => { setWho(p); setItems([]); }} single locked={!!student} />
      <div className="fe-grid2">
        <div className="fe-field">
          <label className="fe-label" htmlFor="cn-kind">Kind</label>
          <select id="cn-kind" className="fe-select" style={{ width: '100%' }} value={kind} onChange={e => setKind(e.target.value as ConcessionKind)}>
            {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="cn-title">Name <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
          <input id="cn-title" className="fe-input" style={{ width: '100%' }} maxLength={120} placeholder="e.g. Old Students' scholarship" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
      </div>
      <div className="fe-grid2">
        <div className="fe-field">
          <span className="fe-label">How much</span>
          <div className="fe-seg">
            <button type="button" className={mode === 'PERCENT' ? 'active' : ''} onClick={() => setMode('PERCENT')}>Percentage<small>of the fee</small></button>
            <button type="button" className={mode === 'AMOUNT' ? 'active' : ''} onClick={() => setMode('AMOUNT')}>Amount<small>off each fee</small></button>
          </div>
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="cn-value">{mode === 'PERCENT' ? 'Percent' : 'Amount'}</label>
          <div className="fe-money"><span>{mode === 'PERCENT' ? '%' : currency}</span>
            <input id="cn-value" className="fe-input" inputMode="decimal" placeholder={mode === 'PERCENT' ? '50' : '0.00'} value={value} onChange={e => setValue(moneyInput(e.target.value))} /></div>
          {mode === 'PERCENT' && v > 100 && <div className="fe-hint" style={{ color: '#f87171' }}>100% at most.</div>}
        </div>
      </div>
      {itemChoices.length > 0 && (
        <div className="fe-field">
          <span className="fe-label">On <span className="fe-muted" style={{ fontWeight: 500 }}>(none ticked = the whole fee)</span></span>
          <div className="fe-checks">
            {itemChoices.map(n => {
              const on = items.includes(n);
              return <label key={n} className={`fe-check${on ? ' on' : ''}`}><input type="checkbox" checked={on} onChange={() => setItems(on ? items.filter(x => x !== n) : [...items, n])} />{n}</label>;
            })}
          </div>
        </div>
      )}
      {terms > 1 && (
        <div className="fe-field">
          <label className="fe-label" htmlFor="cn-term">{tx('Semester')}</label>
          <select id="cn-term" className="fe-select" style={{ width: '100%' }} value={term} onChange={e => setTerm(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{tx('Every semester this session')}</option>
            {Array.from({ length: terms }, (_, i) => i + 1).map(t => <option key={t} value={t}>{periodName(t)} only</option>)}
          </select>
        </div>
      )}
      <div className="fe-field">
        <label className="fe-label" htmlFor="cn-note">Reason</label>
        <input id="cn-note" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. Scholarship letter ref. OSA/2026/14, or whose child" value={note} onChange={e => setNote(e.target.value)} />
      </div>
      <div className="fe-note info" style={{ marginBottom: 0 }}>
        <Info size={15} />
        <span>A concession is money the school will not collect. If a sponsor will pay the school, record their payment against the student instead. Anything the student already paid beyond the new amount becomes credit.</span>
      </div>
    </FeeModal>
  );
}
