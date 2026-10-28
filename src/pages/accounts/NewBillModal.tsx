import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Info, Loader2, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import FeeModal from '../superadmin/fees/FeeModal';
import {
  getPriceList, issueBill, previewBill, searchFeeStudents,
  type BillInput, type BillPreview, type BillTarget, type FeeStudentMatch, type PriceList,
} from '../../api/endpoints';
import { formatMoney, moneyInput, parseMoney } from '../../utils/money';
import { defaultLevels, isSchoolMode, levelName, tx, levelSuffix, showLevelPicker } from '../../utils/terms';

type Line = { key: number; itemId?: number; name: string; price: string; qty: string };
/** A chosen student; items = the names of their fee's items (for concessions on some items). */
export type Picked = { id: number; name: string; studentId: string; items?: string[] };
let lineKey = 1;

/**
 * Issue a bill: who (students by name, a class, a house, boarders, day students, everyone), what
 * (price-list items or, for the bursar, one-off lines), then a check of who gets it before issuing.
 * A cashier bills one student from the price list. `student`: open with this student chosen.
 */
export default function NewBillModal({ bursar, student, onClose, onIssued }: {
  bursar: boolean; student?: Picked; onClose: () => void; onIssued: (b: BillPreview) => void;
}) {
  const { data: list } = useQuery({ queryKey: ['price-list'], queryFn: getPriceList, staleTime: 60_000 });
  const [target, setTarget] = useState<BillTarget>('STUDENT');
  const [students, setStudents] = useState<Picked[]>(student ? [student] : []);
  const [programId, setProgramId] = useState<number | ''>('');
  const [level, setLevel] = useState<number | ''>('');
  const [hostelId, setHostelId] = useState<number | ''>('');
  const [lines, setLines] = useState<Line[]>([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [optional, setOptional] = useState(false);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<BillPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const currency = list?.currency ?? 'GHS';
  const items = (list?.items ?? []).filter(i => i.active);
  const program = list?.classes.find(c => c.id === programId);

  // Any change means the check must be done again
  useEffect(() => { setPreview(null); }, [target, students, programId, level, hostelId, lines, title, dueDate, optional, note]);

  const lineTotal = (l: Line) => parseMoney(l.price) * (Number(l.qty) || 0);
  const each = lines.reduce((s, l) => s + lineTotal(l), 0);
  const ready = lines.length > 0 && lines.every(l => l.name.trim() && parseMoney(l.price) > 0 && Number(l.qty) >= 1)
    && (target !== 'STUDENT' || students.length > 0) && (target !== 'CLASS' || programId !== '') && (target !== 'HOSTEL' || hostelId !== '');

  const request = (): BillInput => ({
    target, title: title.trim() || undefined, optional, dueDate: dueDate || null, note: note.trim() || null,
    studentIds: target === 'STUDENT' ? students.map(s => s.id) : undefined,
    programId: target === 'CLASS' ? Number(programId) : undefined, level: target === 'CLASS' && level !== '' ? Number(level) : undefined,
    hostelId: target === 'HOSTEL' ? Number(hostelId) : undefined,
    lines: lines.map(l => l.itemId ? { itemId: l.itemId, quantity: Number(l.qty) } : { name: l.name.trim(), unitPrice: parseMoney(l.price), quantity: Number(l.qty) }),
  });

  const go = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      if (!preview) setPreview(await previewBill(request()));
      else {
        const done = await issueBill(request());
        toast.success(`${done.title} billed to ${done.students} student${done.students === 1 ? '' : 's'}`);
        onIssued(done);
      }
    } catch (e: any) {
      toast.error(tx(e?.response?.data?.message ?? 'Could not issue the bill'));
    } finally { setBusy(false); }
  };

  const targets = targetChoices(list, bursar);
  const addItem = (id: number) => {
    const it = items.find(i => i.id === id);
    if (it) setLines(ls => [...ls, { key: lineKey++, itemId: it.id, name: it.name, price: String(it.price), qty: '1' }]);
  };
  const setLine = (key: number, patch: Partial<Line>) => setLines(ls => ls.map(l => l.key === key ? { ...l, ...patch } : l));

  return (
    <FeeModal title="New bill" subtitle="Charge students for uniform, books, levies, trips and anything else apart from fees."
      onClose={onClose} busy={busy}
      footer={<>
        <span className="fe-muted fe-small">{each > 0 ? `${formatMoney(each, currency)} each` : ''}</span>
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={go} disabled={!ready || busy || (preview != null && preview.students === 0)}>
            {busy ? <Loader2 size={15} className="fe-spin" /> : preview ? <CheckCircle2 size={15} /> : <Search size={15} />}
            {preview ? `Issue to ${preview.students} student${preview.students === 1 ? '' : 's'}` : 'Check who gets it'}
          </button>
        </div>
      </>}>
      {targets.length > 1 && (
        <div className="fe-field">
          <label className="fe-label" htmlFor="nb-who">Who to bill</label>
          <select id="nb-who" className="fe-select" style={{ width: '100%' }} value={target} onChange={e => setTarget(e.target.value as BillTarget)}>
            {targets.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}
      {target === 'STUDENT' && <StudentPicker picked={students} setPicked={setStudents} single={!bursar} locked={!!student} />}
      {target === 'CLASS' && list && (
        <div className="fe-grid2">
          <div className="fe-field">
            <label className="fe-label" htmlFor="nb-prog">{tx('Programme')}</label>
            <select id="nb-prog" className="fe-select" style={{ width: '100%' }} value={programId} onChange={e => { setProgramId(e.target.value ? Number(e.target.value) : ''); setLevel(''); }}>
              <option value="">Choose…</option>
              {list.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {showLevelPicker(program?.levels.length ?? 0) && (
          <div className="fe-field">
            <label className="fe-label" htmlFor="nb-level">{tx('Level')}</label>
            <select id="nb-level" className="fe-select" style={{ width: '100%' }} value={level} disabled={!program} onChange={e => setLevel(e.target.value ? Number(e.target.value) : '')}>
              <option value="">{tx('Every level')}</option>
              {program?.levels.map(l => <option key={l.level} value={l.level}>{levelName(l.level)} · {l.students}</option>)}
            </select>
          </div>
          )}
        </div>
      )}
      {target === 'HOSTEL' && list && (
        <div className="fe-field">
          <label className="fe-label" htmlFor="nb-house">{list.houseWord}</label>
          <select id="nb-house" className="fe-select" style={{ width: '100%' }} value={hostelId} onChange={e => setHostelId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Choose…</option>
            {list.hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <div className="fe-hint">Students living in it now.</div>
        </div>
      )}

      <div className="fe-field">
        <span className="fe-label">What for</span>
        {lines.map(l => (
          <div key={l.key} className="nb-line">
            {l.itemId
              ? <span className="nb-line-name fe-strong">{l.name}</span>
              : <input className="fe-input nb-line-name" placeholder="What it is" maxLength={80} value={l.name} onChange={e => setLine(l.key, { name: e.target.value })} aria-label="Line name" />}
            <div className="fe-money nb-line-price">
              <span>{currency}</span>
              <input className="fe-input" inputMode="decimal" value={l.price} disabled={!!l.itemId} onChange={e => setLine(l.key, { price: moneyInput(e.target.value) })} aria-label="Price" />
            </div>
            <input className="fe-input nb-line-qty" inputMode="numeric" value={l.qty} onChange={e => setLine(l.key, { qty: e.target.value.replace(/\D/g, '').slice(0, 4) })} aria-label="Quantity" title="Quantity" />
            <button type="button" className="fe-icon-btn danger" onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))} aria-label={`Remove ${l.name || 'line'}`}><Trash2 size={14} /></button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="fe-select" style={{ flex: '1 1 220px', minWidth: 0, maxWidth: '100%' }} value="" onChange={e => e.target.value && addItem(Number(e.target.value))} aria-label="Add from the price list">
            <option value="">{items.length ? '+ Add from the price list' : 'The price list is empty'}</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name} · {formatMoney(i.price, currency)}</option>)}
          </select>
          {bursar && (
            <button type="button" className="fe-ghost" onClick={() => setLines(ls => [...ls, { key: lineKey++, name: '', price: '', qty: '1' }])}>
              <Plus size={14} /> Other charge
            </button>
          )}
        </div>
      </div>

      <div className="fe-grid2">
        <div className="fe-field">
          <label className="fe-label" htmlFor="nb-title">Title <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
          <input id="nb-title" className="fe-input" style={{ width: '100%' }} maxLength={120} placeholder={lines[0]?.name || `e.g. ${levelName(defaultLevels()[0])} uniform`} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="fe-field">
          <label className="fe-label" htmlFor="nb-due">Due date <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
          <input id="nb-due" type="date" className="fe-input" style={{ width: '100%' }} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>
      <div className="fe-field">
        <label className="fe-label" htmlFor="nb-note">Note to students <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
        <input id="nb-note" className="fe-input" style={{ width: '100%' }} maxLength={300} placeholder="e.g. Collect from the stores after paying" value={note} onChange={e => setNote(e.target.value)} />
      </div>
      <label className={`fe-check${optional ? ' on' : ''}`} style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={optional} onChange={e => setOptional(e.target.checked)} />
        Optional: students may decline it (an excursion, an extra book)
      </label>

      {preview && (
        <div className={`fe-note ${preview.students ? 'info' : 'warn'}`} style={{ marginBottom: 0 }}>
          <Info size={15} />
          <span>
            <b>{preview.title}</b> to {preview.audience}: <b>{preview.students}</b> student{preview.students === 1 ? '' : 's'} × {formatMoney(preview.amountEach, currency)} = <b>{formatMoney(preview.total, currency)}</b>.
            {preview.skipped > 0 && <> {preview.skipped} already {preview.skipped === 1 ? 'has' : 'have'} this bill and {preview.skipped === 1 ? 'is' : 'are'} left out.</>}
            {preview.residencyUnknown > 0 && <> {preview.residencyUnknown} student{preview.residencyUnknown === 1 ? ' has' : 's have'} no residency recorded and {preview.residencyUnknown === 1 ? 'is' : 'are'} left out.</>}
            {(preview.sample?.length ?? 0) > 0 && preview.students > 1 && <> E.g. {preview.sample!.slice(0, 4).join(', ')}{preview.students > 4 ? '…' : ''}</>}
            {' '}Credit students already have goes to it straight away.
          </span>
        </div>
      )}
      <style>{`
        .nb-line { display: grid; grid-template-columns: minmax(0, 1fr) 140px 60px 38px; gap: 8px; align-items: center; margin-bottom: 8px; }
        .nb-line-name { min-width: 0; overflow-wrap: anywhere; }
        .nb-line-qty { width: 100%; text-align: center; }
        @media (max-width: 560px) {
          .nb-line { grid-template-columns: minmax(0, 1fr) 60px 38px; }
          .nb-line-name { grid-column: 1 / -1; }
        }
      `}</style>
    </FeeModal>
  );
}

function targetChoices(list: PriceList | undefined, bursar: boolean): { value: BillTarget; label: string }[] {
  const out: { value: BillTarget; label: string }[] = [{ value: 'STUDENT', label: bursar ? tx('Chosen students') : tx('One student') }];
  if (!bursar || !list) return out;
  out.push({ value: 'CLASS', label: isSchoolMode() ? 'A class' : 'A class (programme and level)' });
  if (list.residencyMode !== 'DAY' && list.hostels.length) out.push({ value: 'HOSTEL', label: `A ${list.houseWord.toLowerCase()}` });
  if (list.residencyMode === 'BOTH') out.push({ value: 'BOARDERS', label: 'All boarders' }, { value: 'DAY', label: 'All day students' });
  out.push({ value: 'EVERYONE', label: tx('Every student') });
  return out;
}

export function StudentPicker({ picked, setPicked, single, locked }: { picked: Picked[]; setPicked: (p: Picked[]) => void; single: boolean; locked: boolean }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const { data: matches = [], isFetching } = useQuery({
    queryKey: ['fee-student-search', term], queryFn: () => searchFeeStudents(term), enabled: term.length >= 2,
  });
  const add = (s: FeeStudentMatch) => {
    const p: Picked = { id: s.id, name: s.name, studentId: s.studentId,
      items: [...new Set((s.dues ?? []).flatMap(d => d.fee.components.map(c => c.name)))] };
    if (!picked.some(x => x.id === s.id)) setPicked(single ? [p] : [...picked, p]);
    setQ('');
  };
  return (
    <div className="fe-field">
      <label className="fe-label" htmlFor="nb-stu">{tx(single ? 'Student' : 'Students')}</label>
      {picked.length > 0 && (
        <div className="fe-chips" style={{ marginBottom: 8 }}>
          {picked.map(p => (
            <span key={p.id} className="fe-chip off">
              <UserRound size={12} /> {p.name} · {p.studentId}
              {!locked && <button type="button" className="fe-link" style={{ padding: 0, display: 'inline-flex' }} onClick={() => setPicked(picked.filter(x => x.id !== p.id))} aria-label={`Remove ${p.name}`}><X size={12} /></button>}
            </span>
          ))}
        </div>
      )}
      {!locked && (!single || picked.length === 0) && (
        <>
          <div className="fe-search">
            <Search size={15} />
            <input id="nb-stu" className="fe-input" placeholder={tx('Name, Student ID or email')} value={q} onChange={e => setQ(e.target.value)} autoComplete="off" />
          </div>
          {term.length >= 2 && q && (
            <div className="fe-results" role="listbox">
              {isFetching && matches.length === 0
                ? <div className="fe-muted fe-small" style={{ padding: 12 }}><Loader2 size={13} className="fe-spin" /> Searching…</div>
                : matches.length === 0 ? <div className="fe-muted fe-small" style={{ padding: 12 }}>{tx('No students match')} “{term}”.</div>
                : matches.map(s => (
                  <button type="button" key={s.id} className="fe-result" role="option" aria-selected={false} onClick={() => add(s)}>
                    <span style={{ minWidth: 0 }}>
                      <span className="fe-strong" style={{ display: 'block' }}>{s.name}</span>
                      <span className="fe-muted fe-small">{s.studentId}{s.programName ? ` · ${s.programName}` : ''}{levelSuffix(s.level)}</span>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
