import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { CalendarRange, Download, FileUp, Loader2, Lock, RotateCcw, Search, Unlock, Undo2 } from 'lucide-react';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import { BILL_CSS, useBursar } from './BillsPage';
import { AccountsHead, askReason, errorText, Pill, Section, Totals } from './accountsUi';
import {
  checkOpeningBalances, closeSessionFees, getYearEnd, importOpeningBalances, reopenSessionFees, restoreArrears, writeOffArrears,
  type ArrearsInfo, type OpeningImportResult,
} from '../../api/endpoints';
import { formatDate, formatMoney } from '../../utils/money';
import { tx } from '../../utils/terms';
import { downloadWorkbook, readRows } from '../../utils/spreadsheet';
import { useAuth } from '../../contexts/AuthContext';

/**
 * The year end: close the current session's fees (what each student still owes becomes arrears, paid
 * before anything newer), opening balances from before the system, and every arrears line with
 * write-off / restore. Cashiers can look; the bursar acts.
 */
export default function YearEndPage() {
  const qc = useQueryClient();
  const bursar = useBursar();
  const { user } = useAuth() as any;
  const base = user?.role === 'ACCOUNTANT' ? '/accounts/students' : '/super-admin/student-accounts';
  const { data, isLoading } = useQuery({ queryKey: ['year-end'], queryFn: getYearEnd });
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['year-end'] });
  const cur = data?.currency ?? 'GHS';

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await work(); toast.success(done); refresh(); qc.invalidateQueries({ queryKey: ['student-statement'] }); }
    catch (e) { toast.error(errorText(e, 'That did not work')); }
    finally { setBusy(false); }
  };

  const close = async () => {
    if (!data?.preview) return;
    const r = await Swal.fire({
      title: `Close ${data.preview.sessionName} fees?`,
      html: `${data.preview.debtors} student(s) still owe <b>${formatMoney(data.preview.total, cur)}</b> for this session (${tx('every semester')}). That becomes arrears, paid before anything newer. You can reopen while the session is current and nobody has paid on the arrears.`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Close the fees', cancelButtonText: 'Back',
    });
    if (r.isConfirmed) run(() => closeSessionFees(data.preview!.sessionId), 'Session fees closed');
  };
  const reopen = async (sessionId: number, name: string) => {
    const r = await Swal.fire({ title: `Reopen ${name} fees?`, text: 'The arrears from closing are removed and the fees are owed as before.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Reopen' });
    if (r.isConfirmed) run(() => reopenSessionFees(sessionId), 'Session fees reopened');
  };
  const writeOff = async (a: ArrearsInfo) => {
    const reason = await askReason(`Write off ${formatMoney(a.balance, cur)}?`, `${a.studentName}: ${a.label}. It stops being owed; it is recorded and can be restored.`, 'Write off');
    if (reason) run(() => writeOffArrears(a.id, reason), 'Written off');
  };

  const needle = q.trim().toLowerCase();
  const arrears = (data?.arrears ?? []).filter(a => (showAll || a.balance > 0 || a.status === 'WRITTEN_OFF')
    && (!needle || `${a.studentName} ${a.username} ${a.label}`.toLowerCase().includes(needle)));

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + BILL_CSS}</style>
      <AccountsHead icon={<CalendarRange size={24} color="#fff" />} title="Year end"
        sub={tx('Carry unpaid fees into the next session as arrears, enter opening balances, and manage arrears.')} />
      {isLoading || !data ? <div className="fe-card" style={{ padding: 18 }}><div className="fe-skel" style={{ height: 160 }} /></div> : (
        <>
          <Totals items={[
            { label: 'Arrears still owed', value: formatMoney(data.totals.owed, cur), tone: data.totals.owed > 0 ? 'bad' : undefined },
            { label: 'Paid on arrears', value: formatMoney(data.totals.paid, cur), tone: 'good' },
            { label: 'Written off', value: formatMoney(data.totals.writtenOff, cur) },
          ]} />

          <div className="fe-card" style={{ margin: '14px 0', padding: 16 }}>
            {data.preview ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="fe-strong" style={{ fontSize: 15 }}><Unlock size={15} style={{ verticalAlign: -2, marginRight: 6 }} />{data.preview.sessionName} fees are open</div>
                    <div className="fe-muted fe-small" style={{ marginTop: 4 }}>
                      {data.preview.hasFees
                        ? <>Closing now carries <b style={{ color: '#fbbf24' }}>{formatMoney(data.preview.total, cur)}</b> owed by {data.preview.debtors} {tx('student')}(s), {tx('every semester counted')}.</>
                        : 'No fees are set for this session yet.'}
                    </div>
                  </div>
                  {bursar && data.preview.hasFees && <button type="button" className="fe-btn" onClick={close} disabled={busy}>{busy ? <Loader2 size={15} className="fe-spin" /> : <Lock size={15} />} Close session fees</button>}
                </div>
                <p className="fe-muted fe-small" style={{ margin: '10px 0 0' }}>
                  {tx('Close before promoting students when you can: each student is charged for the class they paid fees for this session, else their class now. If the Super Admin makes the next session current first, these fees are closed automatically at that moment.')}
                </p>
                {data.preview.classes.length > 0 && (
                  <ul className="bl-list bl-lines" style={{ marginTop: 12 }}>
                    {data.preview.classes.map(c => (
                      <li key={c.name}><span>{c.name} <span className="fe-muted fe-small">· {c.debtors} of {c.students} owe</span></span><b>{formatMoney(c.owed, cur)}</b></li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="fe-strong"><Lock size={15} style={{ verticalAlign: -2, marginRight: 6 }} />{data.session.name} fees are closed. What students still owed is now arrears.</div>
            )}
          </div>

          {data.closes.length > 0 && (
            <Section title="Closed sessions" empty="" count={data.closes.length}>
              {data.closes.map(c => (
                <li key={c.sessionId} className="bl-row">
                  <div className="bl-main"><div className="fe-strong">{c.sessionName}</div>
                    <div className="fe-muted fe-small">{c.automatic ? 'Closed automatically when the next session was made current' : `Closed by ${c.closedBy}`} · {formatDate(c.closedAt)}</div></div>
                  <div className="bl-amt"><div className="fe-strong">{formatMoney(c.total, cur)}</div><div className="fe-muted fe-small">{c.students} {tx('student')}(s)</div></div>
                  {bursar && c.current && <button type="button" className="fe-ghost sm" onClick={() => reopen(c.sessionId, c.sessionName)} disabled={busy}><RotateCcw size={13} /> Reopen</button>}
                </li>
              ))}
            </Section>
          )}

          {bursar && <OpeningBalances currency={cur} onDone={refresh} />}

          <Section title="Arrears" count={arrears.length} empty={needle ? 'Nothing matches.' : 'No arrears.'}
            action={<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="fe-check" style={{ margin: 0 }}><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> Paid too</label>
            </div>}>
            <li style={{ padding: '10px 16px' }}>
              <div className="fe-search" style={{ maxWidth: 420 }}><Search size={15} /><input className="fe-input" placeholder={tx('Search name or Student ID')} value={q} onChange={e => setQ(e.target.value)} aria-label="Search arrears" /></div>
            </li>
            {arrears.map(a => (
              <li key={a.id} className="bl-row" style={a.status === 'WRITTEN_OFF' ? { opacity: 0.6 } : undefined}>
                <div className="bl-main">
                  <div className="fe-strong"><Link to={`${base}?student=${a.studentId}`} className="fe-link" style={{ color: 'inherit' }}>{a.studentName}</Link>
                    <span className="fe-muted fe-small"> · {a.username}{a.enabled === false ? ' · left' : ''}</span></div>
                  <div className="fe-muted fe-small">{a.label}{a.programName ? ` · ${a.programName}` : ''} · {formatMoney(a.amount, cur)}{a.paid > 0 ? ` · ${formatMoney(a.paid, cur)} paid` : ''}{a.status === 'WRITTEN_OFF' && a.statusNote ? ` · ${a.statusNote}` : ''}</div>
                </div>
                <div className="bl-amt"><Pill status={a.status} />{a.balance > 0 && <div className="fe-muted fe-small" style={{ marginTop: 4 }}>owes {formatMoney(a.balance, cur)}</div>}</div>
                {bursar && (a.status === 'WRITTEN_OFF'
                  ? <button type="button" className="fe-ghost sm" onClick={() => run(() => restoreArrears(a.id), 'Restored')} disabled={busy}><Undo2 size={13} /> Restore</button>
                  : a.balance > 0 && <button type="button" className="fe-ghost sm" onClick={() => writeOff(a)} disabled={busy}>Write off</button>)}
              </li>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

/** Opening balances from a sheet: check every row first, then import the good ones. */
function OpeningBalances({ currency, onDone }: { currency: string; onDone: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [result, setResult] = useState<OpeningImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const data = await readRows(f);
      setRows(data);
      setResult(await checkOpeningBalances(data));
    } catch (e) { toast.error(errorText(e, 'Could not read that file')); setRows(null); setResult(null); }
    finally { setBusy(false); if (file.current) file.current.value = ''; }
  };
  const apply = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const r = await importOpeningBalances(rows);
      toast.success(`${r.ok} opening balance(s) saved`);
      setRows(null); setResult(null); onDone();
    } catch (e) { toast.error(errorText(e, 'Could not import')); }
    finally { setBusy(false); }
  };

  return (
    <div className="fe-card" style={{ marginBottom: 14 }}>
      <div className="bl-bar"><span className="fe-strong">Opening balances</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="fe-ghost sm" onClick={() => downloadWorkbook('opening-balances.xlsx', [{ name: 'Opening balances', rows: [{ 'Student ID': 'MFS/2024/1200', Amount: 450, Note: 'From the 2024 ledger' }] }])}><Download size={13} /> Template</button>
          <button type="button" className="fe-ghost sm" onClick={() => file.current?.click()} disabled={busy}>{busy ? <Loader2 size={13} className="fe-spin" /> : <FileUp size={13} />} Choose file</button>
          <input ref={file} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => pick(e.target.files?.[0])} />
        </div>
      </div>
      {!result ? (
        <p className="fe-muted fe-small" style={{ padding: '12px 16px', margin: 0 }}>{tx('What students owed before the school used this system: a sheet with Student ID, Amount and an optional Note. A student’s earlier opening balance is replaced unless they are already paying it.')}</p>
      ) : (
        <div style={{ padding: '12px 16px' }}>
          <Totals items={[{ label: 'Ready', value: String(result.ok), tone: 'good' }, { label: 'With problems', value: String(result.errors), tone: result.errors ? 'bad' : undefined },
            { label: 'Total', value: formatMoney(result.total, currency) }]} />
          <ul className="bl-list bl-lines" style={{ marginTop: 10, maxHeight: 320, overflow: 'auto' }}>
            {result.rows.map(r => (
              <li key={r.row}>
                <span style={{ minWidth: 0 }}>Row {r.row}: {r.name ?? r.studentId ?? '—'}{r.message && <span className="fe-small" style={{ color: r.status === 'ERROR' ? '#f87171' : '#fbbf24' }}> · {r.message}</span>}</span>
                <b>{r.amount != null ? formatMoney(r.amount, currency) : ''}</b>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="fe-ghost" onClick={() => { setRows(null); setResult(null); }} disabled={busy}>Cancel</button>
            <button type="button" className="fe-btn" onClick={apply} disabled={busy || result.ok === 0}>{busy && <Loader2 size={15} className="fe-spin" />} Import {result.ok}</button>
          </div>
        </div>
      )}
    </div>
  );
}
