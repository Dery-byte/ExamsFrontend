import { useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { AlertTriangle, BookMarked, Check, Info, Layers, ListChecks, Loader2, Lock, Percent, Plus, Unlock, Wallet } from 'lucide-react';
import FeeModal from './FeeModal';
import { FEE_ADMIN_CSS } from './feeStyles';
import {
  getResultsHolds, removeResultsHold, saUpdateSystemSettings, saveResultsHold,
  type ResultsHoldMode, type ResultsHoldOverview, type ResultsHoldProgram, type ResultsHoldRule,
} from '../../../api/endpoints';
import { isSchoolMode, tx } from '../../../utils/terms';

const cardsWord = () => (isSchoolMode() ? 'Terminal reports' : 'Report cards');

/** "Full fee · Report cards & transcript" */
function describe(rule: ResultsHoldRule) {
  const what = rule.mode === 'FULL' ? 'Full fee'
    : rule.mode === 'PERCENT' ? `At least ${rule.minPercent}% of the fee`
    : `Items: ${rule.requiredItems.join(', ')}`;
  const docs = [rule.reportCards && cardsWord(), rule.transcript && !isSchoolMode() && 'transcript'].filter(Boolean).join(' & ');
  return { what, docs };
}

/**
 * Super Admin: per programme, hold students' report cards and / or transcript until they have paid
 * the full fee, a minimum share of it, or chosen items. Enforced on the server; staff are never blocked.
 */
export default function ResultsHoldSettings() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['results-holds'], queryFn: getResultsHolds });
  const [editing, setEditing] = useState<ResultsHoldProgram | null>(null);
  const [switching, setSwitching] = useState(false);
  const [lifting, setLifting] = useState<number | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['results-holds'] });
    qc.invalidateQueries({ queryKey: ['fee-overview'] });
  };

  const toggle = async () => {
    if (!data) return;
    const next = !data.enabled;
    setSwitching(true);
    try {
      await saUpdateSystemSettings({ FEES_RESULTS_HOLD: String(next) });
      qc.setQueryData<ResultsHoldOverview>(['results-holds'], d => d && { ...d, enabled: next });
      refresh();
      toast.success(next ? 'Results holds are now enforced' : 'Results holds paused: every student can see their results');
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSwitching(false);
    }
  };

  const lift = async (p: ResultsHoldProgram) => {
    const ok = await Swal.fire({
      title: 'Lift this hold?',
      text: tx(`Students in ${p.name} will see their results whatever they have paid.`),
      icon: 'question', showCancelButton: true, confirmButtonText: 'Lift hold', confirmButtonColor: '#7c3aed',
    });
    if (!ok.isConfirmed) return;
    setLifting(p.id);
    try {
      await removeResultsHold(p.id);
      toast.success(`Hold lifted for ${p.name}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not lift the hold');
    } finally {
      setLifting(null);
    }
  };

  const held = data?.programs.filter(p => p.rule).length ?? 0;

  return (
    <div className="fe" style={{ paddingBottom: 0, marginBottom: 36 }}>
      <style>{FEE_ADMIN_CSS}</style>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
        Results Hold for Unpaid Fees</h2>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
        {tx(`Choose, per programme, what students must pay of this session's fee before they can see and download their ${isSchoolMode() ? 'terminal reports' : 'report cards and transcript'}. HODs and the Super Admin can still open every student's record.`)}
      </p>

      {isLoading ? (
        <div className="fe-skel" style={{ height: 160 }} />
      ) : isError || !data ? (
        <div className="fe-note warn"><AlertTriangle size={15} /><span>Could not load the results holds.</span></div>
      ) : (
        <>
          {/* Master switch */}
          <div className="fe-card fe-switch-row">
            <div className="fe-switch-text">
              <div className="fe-switch-ico">
                <Lock size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>Hold results until fees are paid</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                  {data.enabled
                    ? `On: the rules below apply (${held} programme${held === 1 ? '' : 's'} with a hold).`
                    : 'Off: nobody is held. Your rules are kept, so you can switch this back on any time.'}
                </div>
              </div>
            </div>
            <button onClick={toggle} disabled={switching} role="switch" aria-checked={data.enabled} aria-label="Hold results until fees are paid"
              style={{ background: data.enabled ? '#10b981' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 20, width: 50, height: 26, position: 'relative', cursor: switching ? 'not-allowed' : 'pointer', transition: 'all 0.3s', flexShrink: 0 }}>
              {switching && <Loader2 size={14} className="fe-spin" style={{ position: 'absolute', top: 6, left: 18, color: '#fff' }} />}
              <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: data.enabled ? 27 : 3, transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {data.enabled && !switching && <Check size={12} color="#10b981" />}
              </div>
            </button>
          </div>

          {data.enabled && !data.feesVisibleToStudents && (
            <div className="fe-note warn">
              <AlertTriangle size={15} />
              <span>{tx('"Show fees to students" is off, so held students can\'t see their balance or pay online. They will be told to see the accounts office.')}</span>
            </div>
          )}

          {data.programs.length === 0 ? (
            <div className="fe-card"><div className="fe-empty"><BookMarked size={30} /><h3>{tx('No programmes yet')}</h3><p>{tx('Create programmes first.')}</p></div></div>
          ) : (
            <div className="fe-card" style={{ opacity: data.enabled ? 1 : 0.6 }}>
              <div className="fe-table-wrap">
                <table className="fe-table fe-stack hold">
                  <thead>
                    <tr><th>{tx('Programme')}</th><th>Students must pay</th><th>Held</th><th /></tr>
                  </thead>
                  <tbody>
                    {data.programs.map(p => {
                      const d = p.rule ? describe(p.rule) : null;
                      return (
                        <tr key={p.id}>
                          <td className="fe-c-title">
                            <div className="fe-strong">{p.name} {!p.enabled && <span className="fe-tag off" style={{ marginLeft: 6 }}>Off</span>}</div>
                            <div className="fe-muted fe-small"><span className="fe-code">{p.code}</span>{p.departmentName ? ` · ${p.departmentName}` : ''}
                              {p.levelsWithFee === 0 && <> · <span style={{ color: '#fbbf24' }}>no fee set for {data.session.name}</span></>}</div>
                          </td>
                          <td data-label="Students must pay">{d ? <span className="fe-strong">{d.what}</span> : <span className="fe-unset"><Unlock size={12} /> No hold</span>}</td>
                          <td className="fe-muted" data-label="Held">{d?.docs ?? '—'}</td>
                          <td className="fe-c-actions">
                            <div className="fe-row-actions">
                              <button type="button" className="fe-ghost sm" onClick={() => setEditing(p)}>{p.rule ? 'Edit' : <><Plus size={13} /> Set hold</>}</button>
                              {p.rule && (
                                <button type="button" className="fe-ghost sm" onClick={() => lift(p)} disabled={lifting === p.id}>
                                  {lifting === p.id ? <Loader2 size={13} className="fe-spin" /> : <Unlock size={13} />} Lift
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {editing && data && (
        <HoldEditor program={editing} all={data.programs} sessionName={data.session.name}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      )}
    </div>
  );
}

function HoldEditor({ program, all, sessionName, onClose, onSaved }: {
  program: ResultsHoldProgram; all: ResultsHoldProgram[]; sessionName: string; onClose: () => void; onSaved: () => void;
}) {
  const school = isSchoolMode();
  const rule = program.rule;
  const [mode, setMode] = useState<ResultsHoldMode>(rule?.mode ?? 'FULL');
  const [percent, setPercent] = useState(rule?.minPercent != null ? String(rule.minPercent) : '50');
  const [items, setItems] = useState<string[]>(rule?.requiredItems ?? []);
  const [custom, setCustom] = useState('');
  const [reportCards, setReportCards] = useState(rule?.reportCards ?? true);
  const [transcript, setTranscript] = useState(school ? false : rule?.transcript ?? true);
  const [also, setAlso] = useState<number[]>([]);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  // Items from this programme's fees, plus any chosen earlier that no longer appear there
  const choices = useMemo(() => {
    const out = [...program.items];
    for (const i of items) if (!out.some(o => o.toLowerCase() === i.toLowerCase())) out.push(i);
    return out;
  }, [program.items, items]);
  const others = all.filter(p => p.id !== program.id);
  const has = (name: string) => items.some(i => i.toLowerCase() === name.toLowerCase());
  const toggleItem = (name: string) => setItems(list => has(name) ? list.filter(i => i.toLowerCase() !== name.toLowerCase()) : [...list, name]);

  const pct = Number(percent);
  const error = !reportCards && !transcript ? 'Choose what to hold.'
    : mode === 'PERCENT' && !(Number.isInteger(pct) && pct >= 1 && pct <= 100) ? 'Enter a whole percentage between 1 and 100.'
    : mode === 'ITEMS' && items.length === 0 ? 'Choose at least one item students must pay for.'
    : null;

  const addCustom = () => {
    const name = custom.trim().replace(/\s+/g, ' ');
    if (name && !has(name)) setItems(list => [...list, name]);
    setCustom('');
  };

  const save = async () => {
    setTried(true);
    if (error) return;
    setSaving(true);
    try {
      await saveResultsHold({
        programId: program.id, mode, minPercent: mode === 'PERCENT' ? pct : null,
        requiredItems: mode === 'ITEMS' ? items : [], reportCards, transcript, alsoApplyToPrograms: also,
      });
      toast.success(also.length ? `Hold saved for ${also.length + 1} programmes` : `Hold saved for ${program.name}`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not save the hold');
    } finally {
      setSaving(false);
    }
  };

  const modes: { key: ResultsHoldMode; label: string; sub: string; icon: ReactNode }[] = [
    { key: 'FULL', label: 'Full fee', sub: 'Balance must be zero', icon: <Wallet size={14} /> },
    { key: 'PERCENT', label: 'Part of the fee', sub: 'A minimum percentage', icon: <Percent size={14} /> },
    { key: 'ITEMS', label: 'Chosen items', sub: 'e.g. Tuition, SRC dues', icon: <ListChecks size={14} /> },
  ];

  return (
    <FeeModal
      title={rule ? 'Edit results hold' : 'Set results hold'}
      subtitle={<>{program.name} · fees for {sessionName}</>}
      onClose={onClose}
      busy={saving}
      footer={<>
        <div className="fe-muted" style={{ fontSize: 12.5 }}>{also.length > 0 && <>Also for {also.length} other programme{also.length > 1 ? 's' : ''}</>}</div>
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="fe-spin" /> : <Lock size={15} />} Save hold
          </button>
        </div>
      </>}
    >
      <div className="fe-field">
        <span className="fe-label">Students must pay</span>
        <div className="fe-seg" role="radiogroup" aria-label="What students must pay" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {modes.map(m => (
            <button key={m.key} type="button" role="radio" aria-checked={mode === m.key} className={mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{m.icon} {m.label}</span>
              <small>{m.sub}</small>
            </button>
          ))}
        </div>
      </div>

      {mode === 'PERCENT' && (
        <div className="fe-field">
          <label className="fe-label" htmlFor="rh-pct">Minimum paid</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input id="rh-pct" className="fe-input" inputMode="numeric" style={{ width: 100, borderColor: tried && error && mode === 'PERCENT' ? '#f87171' : undefined }}
              value={percent} onChange={e => setPercent(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} />
            <span className="fe-muted">% of the session's fee</span>
          </div>
          <div className="fe-hint">Each student's own fee counts, so this works even when levels pay different amounts.</div>
        </div>
      )}

      {mode === 'ITEMS' && (
        <div className="fe-field">
          <span className="fe-label">Items that must be paid</span>
          {choices.length > 0 ? (
            <div className="fe-checks">
              {choices.map(name => (
                <label key={name} className={`fe-check${has(name) ? ' on' : ''}`}>
                  <input type="checkbox" checked={has(name)} onChange={() => toggleItem(name)} /> {name}
                </label>
              ))}
            </div>
          ) : (
            <div className="fe-hint" style={{ marginTop: 0 }}>{tx(`No fee for this programme has a breakdown in ${sessionName} yet. Type the item names below.`)}</div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input className="fe-input" style={{ flex: 1, minWidth: 0 }} maxLength={80} placeholder="Another item, e.g. Tuition" value={custom}
              onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
            <button type="button" className="fe-ghost" onClick={addCustom} disabled={!custom.trim()}><Plus size={14} /> Add</button>
          </div>
          <div className="fe-hint" style={{ display: 'flex', gap: 6 }}><Layers size={12} style={{ marginTop: 2, flexShrink: 0 }} />
            {tx('Matched to each level\'s breakdown by name. Items a level doesn\'t have are skipped; a level whose fee has no breakdown must pay its full fee.')}</div>
        </div>
      )}

      <div className="fe-field">
        <span className="fe-label">Hold</span>
        <div className="fe-checks">
          <label className={`fe-check${reportCards ? ' on' : ''}`}>
            <input type="checkbox" checked={reportCards} onChange={() => setReportCards(v => !v)} /> {cardsWord()}
          </label>
          {!school && (
            <label className={`fe-check${transcript ? ' on' : ''}`}>
              <input type="checkbox" checked={transcript} onChange={() => setTranscript(v => !v)} /> Transcript
            </label>
          )}
        </div>
        <div className="fe-hint">Held students can't open or download these. They see what is left to pay instead.</div>
      </div>

      {tried && error && <div className="fe-note warn" role="alert"><AlertTriangle size={15} /><span>{error}</span></div>}

      {others.length > 0 && (
        <div className="fe-field" style={{ marginBottom: 0 }}>
          <span className="fe-label">{tx('Use the same rule for')}</span>
          <div className="fe-checks" style={{ maxHeight: 160, overflowY: 'auto' }}>
            {others.map(p => {
              const on = also.includes(p.id);
              return (
                <label key={p.id} className={`fe-check${on ? ' on' : ''}`} title={p.rule ? 'Replaces its current hold' : undefined}>
                  <input type="checkbox" checked={on} onChange={() => setAlso(a => on ? a.filter(x => x !== p.id) : [...a, p.id])} />
                  {p.name}{p.rule && <span className="fe-muted fe-small">· replaces its hold</span>}
                </label>
              );
            })}
          </div>
          <div className="fe-hint" style={{ display: 'flex', gap: 6 }}><Info size={12} style={{ marginTop: 2 }} /> {tx('Handy when several programmes follow the same policy.')}</div>
        </div>
      )}
    </FeeModal>
  );
}
