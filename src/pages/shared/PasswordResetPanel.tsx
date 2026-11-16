import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { KeyRound, Search, Download, Loader2, CheckCircle2, XCircle, Mail, Copy, MessageCircle, RefreshCw } from 'lucide-react';
import { getDepartments, getResetCandidates, resetPasswords, type ResetWho } from '../../api/endpoints';
import { downloadWorkbook } from '../../utils/spreadsheet';
import { defaultLevels, isSchoolMode, oneYear, tx } from '../../utils/terms';

/** The page sends the selection in batches: hashing passwords is deliberately slow. */
const BATCH = 100;

interface Account {
  id: number; name: string; username: string; email?: string; phone?: string;
  programId?: number; program?: string; level?: number; department?: string; temporaryPassword: boolean;
}
interface Credential extends Account { password: string; emailed: boolean }
interface Skipped { id: number; name: string; username?: string; reason: string }

const loginUrl = () => `${window.location.origin}/login`;

/** The message to hand someone their new login details (WhatsApp, SMS or copy). */
const loginMessage = (c: Credential) =>
  `Hello ${c.name.split(' ')[0]}, your login details:\nLogin ID: ${c.username}\nTemporary password: ${c.password}\n`
  + `Sign in at ${loginUrl()}\nYou will be asked to choose your own password when you sign in.`;

/** wa.me needs the international number: a local Ghana number 0XXXXXXXXX becomes 233XXXXXXXXX. */
function whatsappNumber(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith('0')) return '233' + digits.slice(1);
  return digits.length >= 9 ? digits : null;
}

/** Super Admin / HOD: give chosen students or lecturers new temporary passwords and download them. */
export default function PasswordResetPanel({ programs, isSuper }: { programs: any[]; isSuper: boolean }) {
  const [who, setWho] = useState<ResetWho>('students');
  const [programId, setProgramId] = useState<number | ''>('');
  const [level, setLevel] = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyTemporary, setOnlyTemporary] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notify, setNotify] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ credentials: Credential[]; skipped: Skipped[]; emailed: number; unfinished: number } | null>(null);

  const students = who === 'students';
  const program = programs.find(p => p.id === programId);
  const levels: number[] = program?.configuredLevels ?? defaultLevels();
  const peopleWord = students ? tx('students') : tx('lecturers');

  useEffect(() => {
    if (isSuper) getDepartments().then((d: any) => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isSuper]);

  const load = async () => {
    setLoading(true);
    try {
      const list: Account[] = await getResetCandidates(who, students ? { programId, level } : { departmentId });
      setAccounts(Array.isArray(list) ? list : []);
      // Keep only selections that are still in the list
      setSelected(prev => new Set(list.filter(a => prev.has(a.id)).map(a => a.id)));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not load the accounts');
      setAccounts([]);
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [who, programId, level, departmentId]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter(a => (!onlyTemporary || a.temporaryPassword)
      && (!q || [a.name, a.username, a.email, a.phone].some(v => v?.toLowerCase().includes(q))));
  }, [accounts, query, onlyTemporary]);

  const allShownSelected = shown.length > 0 && shown.every(a => selected.has(a.id));
  const toggleAllShown = () => setSelected(prev => {
    const next = new Set(prev);
    if (allShownSelected) shown.forEach(a => next.delete(a.id)); else shown.forEach(a => next.add(a.id));
    return next;
  });
  const toggle = (id: number) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const download = (creds: Credential[], skipped: Skipped[]) => {
    if (!creds.length) return;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    downloadWorkbook(`${who}-new-login-details-${stamp}`, [
      {
        name: 'Login details',
        rows: creds.map(c => ({
          Name: c.name,
          [students ? tx('Student ID') : 'Staff ID']: c.username,
          'Temporary password': c.password,
          ...(students
            ? { [tx('Program')]: c.program ?? '', ...(isSchoolMode() ? {} : { [tx('Level')]: c.level ?? '' }) }
            : { [tx('Department')]: c.department ?? '' }),
          Phone: c.phone ?? '',
          Email: c.email ?? '',
          Emailed: c.emailed ? 'Yes' : 'No',
          'Sign-in page': loginUrl(),
        })),
      },
      ...(skipped.length ? [{ name: 'Not reset', rows: skipped.map(s => ({ Name: s.name, 'Login ID': s.username ?? '', Reason: s.reason })) }] : []),
    ]);
  };

  const run = async () => {
    const ids = accounts.filter(a => selected.has(a.id)).map(a => a.id);
    if (!ids.length) return;
    const ok = await Swal.fire({
      title: `Reset ${ids.length} password${ids.length === 1 ? '' : 's'}?`,
      html: `Each chosen ${students ? tx('student') : tx('lecturer')} gets a new temporary password. Their current password stops working straight away, `
        + 'anyone signed in is signed out, and they must choose their own password at their next sign-in.'
        + `<br/><br/>You will download the new login details as an Excel file${notify ? ', and each person with an email address is emailed theirs' : ''}.`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Reset passwords', confirmButtonColor: 'var(--brand)',
    });
    if (!ok.isConfirmed) return;

    const creds: Credential[] = [];
    const skipped: Skipped[] = [];
    let emailed = 0, done = 0;
    setResult(null);
    setProgress({ done: 0, total: ids.length });
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const res = await resetPasswords(ids.slice(i, i + BATCH), notify);
        creds.push(...(res.credentials ?? []));
        skipped.push(...(res.skipped ?? []));
        emailed += res.emailed ?? 0;
        done = Math.min(ids.length, i + BATCH);
        setProgress({ done, total: ids.length });
      }
    } catch (e: any) {
      toast.error((e?.response?.data?.message ?? 'The reset stopped part-way')
        + (creds.length ? `. ${creds.length} password(s) were already reset; download them below.` : ''), { duration: 8000 });
    } finally {
      setProgress(null);
    }
    setResult({ credentials: creds, skipped, emailed, unfinished: ids.length - done });
    setSelected(new Set());
    if (creds.length) {
      download(creds, skipped);
      toast.success(`${creds.length} new password(s) ready. The Excel file is downloading.`);
    }
    load();
  };

  const copy = async (c: Credential) => {
    try { await navigator.clipboard.writeText(loginMessage(c)); toast.success(`Copied ${c.name}'s login details`); }
    catch { toast.error('Copy is not available in this browser'); }
  };

  return (
    <>
      <section className="dt-card">
        <div className="dt-row">
          <div className="dt-field" style={{ flex: '0 1 auto' }}>Whose passwords?
            <div className="pr-seg" role="radiogroup">
              {(['students', 'lecturers'] as ResetWho[]).map(w => (
                <button key={w} type="button" role="radio" aria-checked={who === w} className={who === w ? 'is-on' : ''}
                  onClick={() => { setWho(w); setResult(null); }}>
                  {w === 'students' ? tx('Students') : tx('Lecturers')}
                </button>
              ))}
            </div>
          </div>
          {students ? (
            <>
              <label className="dt-field">{tx('Program')}
                <select className="dt-input" value={programId} onChange={e => { setProgramId(e.target.value ? Number(e.target.value) : ''); setLevel(''); }}>
                  <option value="">{tx('All programs')}</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              {!oneYear(program) && (
                <label className="dt-field" style={{ flex: '0 1 150px' }}>{tx('Level')}
                  <select className="dt-input" value={level} onChange={e => setLevel(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">{tx('All levels')}</option>
                    {levels.map(l => <option key={l} value={l}>{tx('Level ')}{l}</option>)}
                  </select>
                </label>
              )}
            </>
          ) : isSuper ? (
            <label className="dt-field">{tx('Department')}
              <select className="dt-input" value={departmentId} onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">{tx('All departments')}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          ) : null}
        </div>
        <div className="dt-row" style={{ marginTop: 10 }}>
          <label className="dt-field pr-search">Search
            <span className="pr-search-box">
              <Search size={15} />
              <input className="dt-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, login ID, email or phone" />
            </span>
          </label>
          <label className="pr-check">
            <input type="checkbox" checked={onlyTemporary} onChange={e => setOnlyTemporary(e.target.checked)} />
            Only those who haven't set their own password yet
          </label>
        </div>
        <p className="dt-note">
          Tick the people who need new login details, then reset. Use this when import emails didn't arrive (for example a wrong email address)
          or someone has forgotten their password. {!isSuper && tx('You can only reset passwords in your own department.')}
        </p>
      </section>

      {progress && (
        <section className="dt-card pr-progress" aria-live="polite">
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ flex: 1 }}>
            <b>Resetting passwords… {progress.done} of {progress.total}</b>
            <div className="pr-bar"><span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} /></div>
            <span className="dt-note" style={{ margin: 0 }}>Please keep this page open until it finishes.</span>
          </div>
        </section>
      )}

      {result && <ResultCard result={result} who={who} onDownload={() => download(result.credentials, result.skipped)} onCopy={copy} onClose={() => setResult(null)} />}

      <section className="dt-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="pr-listhead">
          <label className="pr-check" style={{ margin: 0 }}>
            <input type="checkbox" checked={allShownSelected} disabled={!shown.length} onChange={toggleAllShown} aria-label="Select everyone shown" />
            <b>{allShownSelected ? 'Unselect' : 'Select'} all {shown.length} shown</b>
          </label>
          <span className="pr-count">{selected.size} selected · {accounts.length} {peopleWord}</span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {selected.size > 0 && <button className="dt-ghost pr-sm" onClick={() => setSelected(new Set())}>Clear</button>}
            <button className="dt-ghost pr-sm" onClick={load} disabled={loading} aria-label="Reload"><RefreshCw size={14} /></button>
          </div>
        </div>

        <div className="pr-grid pr-gridhead" aria-hidden>
          <span /><span>Name</span><span>{students ? tx('Program / Level') : tx('Department')}</span><span>Contact</span><span>Password</span>
        </div>
        <div className="pr-list">
          {loading ? (
            <div className="pr-empty"><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : shown.length === 0 ? (
            <div className="pr-empty">{accounts.length ? 'Nobody matches the search.' : `No active ${peopleWord} found for this choice.`}</div>
          ) : shown.map(a => (
            <label key={a.id} className={`pr-grid pr-item ${selected.has(a.id) ? 'is-sel' : ''}`}>
              <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Select ${a.name}`} />
              <span className="pr-who"><b>{a.name}</b><code>{a.username}</code></span>
              <span className="pr-meta">{students
                ? [a.program, !isSchoolMode() && a.level ? tx(`Level ${a.level}`) : null].filter(Boolean).join(' · ') || '—'
                : a.department || '—'}</span>
              <span className="pr-meta pr-contact">
                {a.email ? <span title={a.email}>{a.email}</span> : <span className="pr-muted">No email</span>}
                {a.phone ? <span>{a.phone}</span> : null}
              </span>
              <span>{a.temporaryPassword
                ? <span className="pr-badge pr-badge-warn">Not set own yet</span>
                : <span className="pr-badge">Own password</span>}</span>
            </label>
          ))}
        </div>
      </section>

      {selected.size > 0 && !progress && (
        <div className="pr-actionbar">
          <label className="pr-check" style={{ margin: 0 }}>
            <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
            <span><Mail size={13} style={{ verticalAlign: -2 }} /> Also email each person their new password</span>
          </label>
          <button className="dt-btn" onClick={run}><KeyRound size={15} /> Reset {selected.size} password{selected.size === 1 ? '' : 's'}</button>
        </div>
      )}

      <style>{`
        .pr-seg { display: inline-flex; border: 1.5px solid #e2e8f0; border-radius: 9px; overflow: hidden; height: 38px; }
        .pr-seg button { border: none; background: #fff; padding: 0 14px; font-weight: 700; font-size: 13px; color: #64748b; cursor: pointer; }
        .pr-seg button.is-on { background: var(--brand); color: var(--brand-contrast); }
        .pr-search { flex: 1 1 260px; }
        .pr-search-box { position: relative; display: flex; align-items: center; }
        .pr-search-box svg { position: absolute; left: 10px; color: #94a3b8; pointer-events: none; }
        .pr-search-box input { width: 100%; padding-left: 32px; box-sizing: border-box; }
        .pr-check { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; min-height: 38px; }
        .pr-check input { width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--brand); }
        .pr-listhead { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 10px 14px; border-bottom: 1px solid #eef0f4; background: #f8fafc; }
        .pr-count { font-size: 12.5px; color: #64748b; }
        .pr-sm { height: 32px; padding: 0 10px; }
        .pr-grid { display: grid; grid-template-columns: 28px minmax(180px, 1.4fr) minmax(130px, 1fr) minmax(170px, 1.3fr) 130px; gap: 4px 12px; align-items: center; padding: 10px 14px; }
        .pr-gridhead { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; font-weight: 700; border-bottom: 1px solid #eef0f4; padding-top: 8px; padding-bottom: 8px; }
        .pr-list { max-height: 62vh; overflow-y: auto; }
        .pr-item { border-bottom: 1px solid #f4f5f8; cursor: pointer; font-size: 13px; }
        .pr-item:hover { background: #fafbff; }
        .pr-item.is-sel { background: #f2f5ff; }
        .pr-item input { width: 18px; height: 18px; accent-color: var(--brand); }
        .pr-who { display: flex; flex-direction: column; min-width: 0; }
        .pr-who b { color: #1e293b; overflow-wrap: anywhere; }
        .pr-who code, .pr-cred code { font-size: 12px; color: #475569; overflow-wrap: anywhere; }
        .pr-meta { color: #475569; min-width: 0; overflow-wrap: anywhere; }
        .pr-contact { display: flex; flex-direction: column; }
        .pr-contact span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pr-muted { color: #94a3b8; }
        .pr-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #eef2f7; color: #475569; white-space: nowrap; }
        .pr-badge-warn { background: #fff4e0; color: #8a5300; }
        .pr-badge-ok { background: #e7f6ec; color: #0b7a0b; }
        .pr-empty { padding: 28px 14px; text-align: center; color: #64748b; display: flex; justify-content: center; }
        .pr-actionbar { position: sticky; bottom: 12px; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
          background: #fff; border: 1.5px solid var(--brand); border-radius: 14px; padding: 10px 14px; box-shadow: 0 10px 30px rgba(15,23,42,.12); }
        .pr-progress { display: flex; gap: 12px; align-items: flex-start; }
        .pr-bar { height: 8px; background: #eef0f4; border-radius: 999px; overflow: hidden; margin: 8px 0 6px; }
        .pr-bar span { display: block; height: 100%; background: var(--brand); transition: width .3s; }
        .pr-result { border-color: #bfe5c9; }
        .pr-result-head { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
        .pr-creds { margin-top: 12px; border: 1px solid #eef0f4; border-radius: 10px; max-height: 50vh; overflow-y: auto; }
        .pr-cred { display: grid; grid-template-columns: minmax(170px, 1.4fr) minmax(130px, 1fr) 110px 210px; gap: 6px 12px; align-items: center; padding: 10px 12px; border-bottom: 1px solid #f4f5f8; font-size: 13px; }
        .pr-pw { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 15px; font-weight: 700; color: #1e293b; letter-spacing: .03em; user-select: all; }
        .pr-acts { display: flex; gap: 6px; justify-content: flex-end; }
        .pr-icon { display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 34px; min-width: 34px; padding: 0 10px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #334155; font-size: 12.5px; font-weight: 600; cursor: pointer; text-decoration: none; }
        .pr-icon.wa { border-color: #b7e4c7; color: #128c4a; }

        @media (max-width: 760px) {
          .pr-gridhead { display: none; }
          .pr-grid { grid-template-columns: 28px 1fr; padding: 12px; }
          .pr-item > :not(input) { grid-column: 2; }
          .pr-item input { grid-row: 1 / span 4; align-self: start; margin-top: 2px; }
          .pr-contact span { white-space: normal; }
          .pr-cred { grid-template-columns: 1fr auto; }
          .pr-cred .pr-cred-meta { grid-column: 1 / -1; order: 3; }
          .pr-cred .pr-acts { grid-column: 1 / -1; justify-content: flex-start; order: 4; }
          .pr-actionbar { bottom: 8px; }
          .pr-actionbar .dt-btn { width: 100%; }
          .pr-result-btns { width: 100%; }
          .pr-result-btns > button { flex: 1 1 140px; justify-content: center; }
        }
        @media (max-width: 420px) {
          .pr-seg { width: 100%; }
          .pr-seg button { flex: 1; }
        }
      `}</style>
    </>
  );
}

function ResultCard({ result, who, onDownload, onCopy, onClose }: {
  result: { credentials: Credential[]; skipped: Skipped[]; emailed: number; unfinished: number };
  who: ResetWho; onDownload: () => void; onCopy: (c: Credential) => void; onClose: () => void;
}) {
  const { credentials, skipped, emailed, unfinished } = result;
  return (
    <section className="dt-card pr-result">
      <div className="pr-result-head">
        <div>
          <span className="dt-ok" style={{ fontSize: 14 }}><CheckCircle2 size={16} /> {credentials.length} new password{credentials.length === 1 ? '' : 's'} issued</span>
          <p className="dt-note" style={{ marginTop: 4 }}>
            The Excel file downloaded automatically. Keep it safe: these passwords can't be shown again once you leave this page.
            {emailed > 0 && ` ${emailed} were also emailed; a wrong address won't get it, so use the file or WhatsApp for anyone who says nothing arrived.`}
          </p>
        </div>
        <div className="pr-result-btns" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {credentials.length > 0 && <button className="dt-btn" onClick={onDownload}><Download size={15} /> Download again</button>}
          <button className="dt-ghost" onClick={onClose}>Done</button>
        </div>
      </div>

      {unfinished > 0 && (
        <div className="dt-warn"><XCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>{unfinished} selected {who === 'students' ? tx('student(s)') : tx('lecturer(s)')} were not processed because the reset stopped. Select them again and retry.</div>
        </div>
      )}
      {skipped.length > 0 && (
        <div className="dt-warn"><XCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div><b>{skipped.length} not reset:</b>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {skipped.slice(0, 50).map(s => <li key={s.id}>{s.name}{s.username ? ` (${s.username})` : ''}: {s.reason}</li>)}
              {skipped.length > 50 && <li>…and {skipped.length - 50} more (listed in the Excel file).</li>}
            </ul>
          </div>
        </div>
      )}

      {credentials.length > 0 && (
        <div className="pr-creds">
          {credentials.map(c => {
            const wa = whatsappNumber(c.phone);
            return (
              <div key={c.id} className="pr-cred">
                <span className="pr-who"><b>{c.name}</b><code>{c.username}</code></span>
                <span className="pr-pw">{c.password}</span>
                <span className="pr-cred-meta">{c.emailed ? <span className="pr-badge pr-badge-ok">Emailed</span> : <span className="pr-badge">Not emailed</span>}</span>
                <span className="pr-acts">
                  <button type="button" className="pr-icon" onClick={() => onCopy(c)} title="Copy login message"><Copy size={14} /> Copy</button>
                  {wa && (
                    <a className="pr-icon wa" href={`https://wa.me/${wa}?text=${encodeURIComponent(loginMessage(c))}`} target="_blank" rel="noopener noreferrer" title="Send on WhatsApp">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
