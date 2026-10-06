import { useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  AlertCircle, BookMarked, CheckCircle2, Copy, CreditCard, Eye, EyeOff, Layers, Loader2, Pencil, Plus,
  Lock, Receipt, Search, Trash2, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { FEE_ADMIN_CSS } from './feeStyles';
import ScheduleEditor from './ScheduleEditor';
import PaymentsPanel from './PaymentsPanel';
import FeeModal from './FeeModal';
import {
  copyFeeSchedules, deleteFeeSchedule, getFeeOverview,
  type FeeLevelRow, type FeeOverview, type FeeProgramRow,
} from '../../../api/endpoints';
import { formatDate, formatMoney } from '../../../utils/money';
import { levelName, tx } from '../../../utils/terms';

type Tab = 'schedules' | 'payments';

/** Super Admin: fee per programme and level for each session, and every payment made against them. */
export default function FeesPage() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [tab, setTab] = useState<Tab>('schedules');
  const [editing, setEditing] = useState<{ program: FeeProgramRow; row: FeeLevelRow } | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['fee-overview', sessionId ?? 'current'],
    queryFn: () => getFeeOverview(sessionId),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['fee-overview'] });

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS}</style>

      <div className="fe-head">
        <div className="fe-title">
          <div className="fe-logo"><Wallet size={24} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className="fe-h1">Fees &amp; Payments</h1>
            <p className="fe-sub">{tx('Set what each programme and level pays, and follow payments as they come in.')}</p>
          </div>
        </div>
        {data && (
          <div className="fe-actions">
            <select className="fe-select" aria-label="Academic session" value={data.session.id}
              onChange={e => setSessionId(Number(e.target.value))}>
              {data.sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.current ? ' (current)' : ''}</option>)}
            </select>
            {data.sessions.length > 1 && (
              <button type="button" className="fe-ghost" onClick={() => setCopyOpen(true)}><Copy size={15} /> Copy fees</button>
            )}
          </div>
        )}
      </div>

      {isLoading ? <LoadingState /> : isError || !data ? (
        <div className="fe-card"><div className="fe-empty">
          <AlertCircle size={34} style={{ color: '#f87171' }} />
          <h3>Couldn't load fees</h3>
          <p><button className="fe-link" onClick={() => refetch()}>Try again</button></p>
        </div></div>
      ) : (
        <>
          <StatusChips data={data} />
          <Kpis data={data} />

          <div className="fe-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'schedules'} className={`fe-tab${tab === 'schedules' ? ' active' : ''}`} onClick={() => setTab('schedules')}>
              <Layers size={15} /> Fee schedules
            </button>
            <button type="button" role="tab" aria-selected={tab === 'payments'} className={`fe-tab${tab === 'payments' ? ' active' : ''}`} onClick={() => setTab('payments')}>
              <Receipt size={15} /> Payments
            </button>
          </div>

          {tab === 'schedules'
            ? <Schedules data={data} onEdit={(program, row) => setEditing({ program, row })} onChanged={refresh} />
            : <PaymentsPanel overview={data} onChanged={refresh} />}

          {editing && (
            <ScheduleEditor program={editing.program} row={editing.row} session={data.session} currency={data.currency}
              onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
          )}
          {copyOpen && <CopyModal data={data} onClose={() => setCopyOpen(false)} onDone={() => { setCopyOpen(false); refresh(); }} />}
        </>
      )}
    </div>
  );
}

function StatusChips({ data }: { data: FeeOverview }) {
  const { paystack, settings } = data;
  return (
    <div className="fe-chips">
      {settings.visibleToStudents
        ? <span className="fe-chip ok"><Eye size={13} /> {tx('Students can see their fees')}</span>
        : <span className="fe-chip off"><EyeOff size={13} /> {tx('Hidden from students')} · <Link to="/super-admin/configuration">turn on</Link></span>}
      {!paystack.configured
        ? <span className="fe-chip warn" title="Set PAYSTACK_SECRET_KEY on the server"><CreditCard size={13} /> Paystack not connected</span>
        : !settings.onlinePayment
          ? <span className="fe-chip off"><CreditCard size={13} /> Online payment switched off</span>
          : <span className={`fe-chip ${paystack.mode === 'live' ? 'ok' : 'warn'}`}><CreditCard size={13} /> Paystack {paystack.mode === 'live' ? 'live' : 'test mode'} · Card &amp; Mobile Money</span>}
      <span className="fe-chip off">{settings.partPayment ? 'Part payments allowed' : 'Full payment only'}</span>
      <span className="fe-chip off">{settings.itemPayment ? 'Students can pay by item' : 'Paying by item off'}</span>
      {settings.resultsHold && <span className="fe-chip warn"><Lock size={13} /> {tx('Results held for unpaid fees')} · <Link to="/super-admin/configuration">rules</Link></span>}
    </div>
  );
}

function Kpis({ data }: { data: FeeOverview }) {
  const { totals, currency, session } = data;
  const rate = totals.billed ? Math.min(100, (totals.collected / totals.billed) * 100) : 0;
  const setRate = totals.levelsTotal ? (totals.levelsSet / totals.levelsTotal) * 100 : 0;
  return (
    <div className="fe-kpis">
      <Kpi label="Expected this session" icon={<Users size={18} />} color="#a78bfa"
        value={totals.billed == null ? '—' : formatMoney(totals.billed, currency)}
        foot={totals.billed == null ? `Only worked out for the current session` : tx(`${(totals.students ?? 0).toLocaleString()} active students × their fee`)} />
      <Kpi label="Collected" icon={<TrendingUp size={18} />} color="#34d399" value={formatMoney(totals.collected, currency)}
        foot={totals.billed ? <>
          <div className="fe-bar" style={{ marginBottom: 6 }}><span style={{ width: `${rate}%` }} /></div>
          {rate.toFixed(rate < 10 ? 1 : 0)}% of expected
        </> : `In ${session.name}`} />
      <Kpi label="Outstanding" icon={<AlertCircle size={18} />} color="#fbbf24"
        value={totals.outstanding == null ? '—' : formatMoney(totals.outstanding, currency)}
        foot={totals.outstanding == null ? 'Only worked out for the current session' : 'Still to be paid'} />
      <Kpi label="Fees set" icon={<CheckCircle2 size={18} />} color="#38bdf8" value={`${totals.levelsSet} / ${totals.levelsTotal}`}
        foot={<>
          <div className="fe-bar" style={{ marginBottom: 6 }}><span style={{ width: `${setRate}%`, background: 'linear-gradient(90deg,#0ea5e9,#38bdf8)' }} /></div>
          {tx('levels have a fee')}
        </>} />
    </div>
  );
}

function Kpi({ label, value, foot, icon, color }: { label: string; value: string; foot: ReactNode; icon: ReactNode; color: string }) {
  return (
    <div className="fe-kpi">
      <div className="fe-kpi-ico" style={{ background: `${color}1f`, color, border: `1px solid ${color}40` }}>{icon}</div>
      <div className="fe-kpi-label">{label}</div>
      <div className="fe-kpi-value">{value}</div>
      <div className="fe-kpi-foot">{foot}</div>
    </div>
  );
}

function Schedules({ data, onEdit, onChanged }: {
  data: FeeOverview; onEdit: (p: FeeProgramRow, r: FeeLevelRow) => void; onChanged: () => void;
}) {
  const [q, setQ] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { currency, session } = data;

  const programs = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.programs
      .filter(p => !term || p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term) || (p.departmentName ?? '').toLowerCase().includes(term))
      .map(p => missingOnly ? { ...p, levels: p.levels.filter(l => !l.schedule) } : p)
      .filter(p => p.levels.length > 0);
  }, [data.programs, q, missingOnly]);

  const remove = async (p: FeeProgramRow, row: FeeLevelRow) => {
    if (!row.schedule) return;
    const ok = await Swal.fire({
      title: 'Remove this fee?',
      text: `${p.name} · ${levelName(row.level)} will have no fee for ${session.name}.`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Remove', confirmButtonColor: '#e34948',
    });
    if (!ok.isConfirmed) return;
    setDeleting(row.schedule.id);
    try {
      await deleteFeeSchedule(row.schedule.id);
      toast.success('Fee removed');
      onChanged();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not remove the fee');
    } finally { setDeleting(null); }
  };

  if (data.programs.length === 0) {
    return (
      <div className="fe-card"><div className="fe-empty">
        <BookMarked size={34} style={{ color: 'rgba(139,92,246,0.45)' }} />
        <h3>{tx('No programmes yet')}</h3>
        <p>{tx('Fees are set per programme and level.')} <Link to="/super-admin/programs" style={{ color: '#a78bfa' }}>{tx('Create a programme')}</Link> first.</p>
      </div></div>
    );
  }

  return (
    <>
      <div className="fe-toolbar">
        <div className="fe-search">
          <Search size={15} />
          <input className="fe-input" placeholder={tx('Find a programme or department')} value={q} onChange={e => setQ(e.target.value)} aria-label={tx('Find a programme')} />
        </div>
        <label className="fe-toggle"><input type="checkbox" checked={missingOnly} onChange={e => setMissingOnly(e.target.checked)} /> {tx('Only levels without a fee')}</label>
      </div>

      {programs.length === 0 ? (
        <div className="fe-card"><div className="fe-empty">
          {missingOnly && !q ? <>
            <CheckCircle2 size={34} style={{ color: '#34d399' }} />
            <h3>{tx('Every level has a fee')}</h3>
            <p>Nothing is missing for {session.name}.</p>
          </> : <>
            <Search size={30} />
            <h3>No matches</h3>
            <p>{tx('No programme matches')} “{q}”.</p>
          </>}
        </div></div>
      ) : programs.map(p => {
        const all = data.programs.find(x => x.id === p.id)!;
        const set = all.levels.filter(l => l.schedule).length;
        return (
          <section className="fe-card" key={p.id}>
            <div className="fe-card-head">
              <div className="fe-prog">
                <div className="fe-prog-ico"><BookMarked size={16} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="fe-prog-name">{p.name} {!p.enabled && <span className="fe-tag off">Disabled</span>}</div>
                  <div className="fe-prog-meta"><span className="fe-code">{p.code}</span>{p.departmentName ? ` · ${p.departmentName}` : ''}</div>
                </div>
              </div>
              <span className={`fe-tag ${set === all.levels.length ? 'done' : 'part'}`}>{set}/{all.levels.length} {tx('levels set')}</span>
            </div>
            <div className="fe-table-wrap">
              <table className="fe-table fe-stack sched">
                <thead>
                  <tr>
                    <th>{tx('Level')}</th>
                    {session.current && <th className="fe-num">{tx('Students')}</th>}
                    <th className="fe-num">Fee</th>
                    <th>Breakdown</th>
                    <th>Collected</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.levels.map(row => {
                    const s = row.schedule;
                    const pct = row.billed ? Math.min(100, (row.collected / row.billed) * 100) : 0;
                    return (
                      <tr key={row.level}>
                        <td className="fe-strong fe-c-title" style={{ whiteSpace: 'nowrap' }}>{levelName(row.level)}</td>
                        {session.current && <td className="fe-num" data-label={tx('Students')}>{row.students ?? 0}</td>}
                        <td className="fe-num" data-label="Fee">
                          {s ? <>
                            <div className="fe-strong">{formatMoney(s.amount, currency)}</div>
                            {s.dueDate && <div className="fe-muted fe-small">Due {formatDate(s.dueDate)}</div>}
                          </> : <span className="fe-unset">Not set</span>}
                        </td>
                        <td className="fe-c-full" data-label="Breakdown">
                          {!s ? <span className="fe-muted">—</span> : s.itemised ? (
                            <div className="fe-items-preview" title={s.components.map(c => `${c.name}: ${formatMoney(c.amount, currency)}`).join('\n')}>
                              {s.components.slice(0, 3).map(c => <span key={c.name} className="fe-mini">{c.name}</span>)}
                              {s.components.length > 3 && <span className="fe-mini">+{s.components.length - 3} more</span>}
                            </div>
                          ) : <span className="fe-muted">Lump sum</span>}
                        </td>
                        <td className="fe-collected" data-label="Collected">
                          {s ? <>
                            <div style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(row.collected, currency)}</div>
                            {row.billed != null && row.billed > 0 && (
                              <>
                                <div className="fe-bar"><span style={{ width: `${pct}%` }} /></div>
                                <div className="fe-muted fe-small" style={{ marginTop: 3 }}>of {formatMoney(row.billed, currency)}</div>
                              </>
                            )}
                          </> : <span className="fe-muted">—</span>}
                        </td>
                        <td className="fe-c-actions">
                          <div className="fe-row-actions">
                            {s ? <>
                              <button type="button" className="fe-ghost sm" onClick={() => onEdit(all, all.levels.find(l => l.level === row.level)!)}><Pencil size={13} /> Edit</button>
                              <button type="button" className="fe-icon-btn danger" onClick={() => remove(p, row)} disabled={deleting === s.id || row.collected > 0}
                                title={row.collected > 0 ? 'Students have paid towards this fee; edit it instead' : 'Remove fee'} aria-label={`Remove fee for ${levelName(row.level)}`}>
                                {deleting === s.id ? <Loader2 size={14} className="fe-spin" /> : <Trash2 size={14} />}
                              </button>
                            </> : (
                              <button type="button" className="fe-btn sm" onClick={() => onEdit(all, all.levels.find(l => l.level === row.level)!)}><Plus size={13} /> Set fee</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}

function CopyModal({ data, onClose, onDone }: { data: FeeOverview; onClose: () => void; onDone: () => void }) {
  const sources = data.sessions.filter(s => s.id !== data.session.id);
  const [from, setFrom] = useState<number>(sources[0]?.id ?? 0);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await copyFeeSchedules(from, data.session.id, overwrite);
      toast.success(r.copied === 0 ? 'Nothing new to copy' : `Copied ${r.copied} fee${r.copied === 1 ? '' : 's'}${r.skipped ? ` (${r.skipped} kept as they were)` : ''}`);
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not copy the fees');
    } finally { setBusy(false); }
  };

  return (
    <FeeModal title="Copy fees" subtitle={<>Into {data.session.name}</>} onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={run} disabled={busy || !from}>
            {busy ? <Loader2 size={15} className="fe-spin" /> : <Copy size={15} />} Copy fees
          </button>
        </div>
      </>}>
      <div className="fe-field">
        <label className="fe-label" htmlFor="fe-from">Copy every fee from</label>
        <select id="fe-from" className="fe-select" style={{ width: '100%' }} value={from} onChange={e => setFrom(Number(e.target.value))}>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}{s.current ? ' (current)' : ''}</option>)}
        </select>
        <div className="fe-hint">Amounts, breakdowns and notes are copied; due dates are left blank so you can set this session's dates.</div>
      </div>
      <label className={`fe-check${overwrite ? ' on' : ''}`}>
        <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
        {tx('Replace fees already set for')} {data.session.name}
      </label>
      <div className="fe-hint">Fees that students have already paid towards are never replaced.</div>
    </FeeModal>
  );
}

function LoadingState() {
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>{[160, 200, 150].map(w => <div key={w} className="fe-skel" style={{ width: w, height: 26 }} />)}</div>
      <div className="fe-kpis">{[1, 2, 3, 4].map(i => <div key={i} className="fe-skel" style={{ height: 112 }} />)}</div>
      {[1, 2].map(i => <div key={i} className="fe-skel" style={{ height: 220, marginBottom: 16 }} />)}
    </>
  );
}
