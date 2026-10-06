import { useState, useEffect, type ReactNode } from 'react';
import { saGetSystemSettings, saUpdateSystemSettings, saGetPrograms, saToggleProgram } from '../../api/endpoints';
import { Settings2, Loader2, Check, ShieldCheck, BookMarked, Power, PowerOff, RefreshCw, ClipboardList, PenLine, GraduationCap, Timer, Wallet, CreditCard, Layers, ArrowRight, ListChecks, FileCheck2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ReportEmailToggle from '../../components/ui/ReportEmailToggle';
import ResultsHoldSettings from './fees/ResultsHoldSettings';
import { isSchoolMode, tx } from '../../utils/terms';

/** Per-role switches for the Marks Sheet navigation entry (default on when never set). */
const MARKS_SHEET_TOGGLES = [
  { key: 'MARKS_SHEET_VISIBLE_ADMIN',    label: tx('Admins (HODs)'), sub: 'Show "Marks Sheets" in the Admin navigation.',         icon: <ClipboardList size={20} />, color: '#8b5cf6' },
  { key: 'MARKS_SHEET_VISIBLE_LECTURER', label: tx('Lecturers'),     sub: tx('Show "Marks Sheet" (marks entry) in the Lecturer navigation.'), icon: <PenLine size={20} />,       color: '#0ea5e9' },
  { key: 'MARKS_SHEET_VISIBLE_STUDENT',  label: tx('Students'),      sub: tx('Show "Report Cards" (published marks) in the Student navigation.'), icon: <GraduationCap size={20} />, color: '#10b981' },
];

/** Fees switches; `def` is the value used when the setting has never been saved. */
const FEE_TOGGLES = [
  { key: 'FEES_VISIBLE_STUDENT', def: false, label: tx('Show fees to students'), sub: tx('Adds "School Fees" to the student navigation and a fee card to their dashboard, with the breakdown when you have set one.'), icon: <Wallet size={20} />, color: '#10b981' },
  { key: 'FEES_ONLINE_PAYMENT', def: true, label: 'Online payment (Paystack)', sub: 'Students pay by card or Mobile Money. When off, they pay at the accounts office and you record the payment.', icon: <CreditCard size={20} />, color: '#0ea5e9' },
  { key: 'FEES_PART_PAYMENT', def: true, label: 'Allow part payments', sub: 'Students can pay in instalments. When off, each payment must clear the full balance.', icon: <Layers size={20} />, color: '#f59e0b' },
  { key: 'FEES_ITEM_PAYMENT', def: true, label: 'Pay by item', sub: 'Where a fee has a breakdown, students can pay for chosen items (e.g. Tuition, then SRC dues), even when part payments are off.', icon: <ListChecks size={20} />, color: '#8b5cf6' },
];

interface Program { id: number; name: string; code: string; departmentName: string; enabled: boolean; }

/** On/off switch; the hit area grows on touch screens without changing its look. */
function Switch({ on, busy, onClick, label, disabled }: { on: boolean; busy?: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" className={`sc-switch${on ? ' on' : ''}`} onClick={onClick} disabled={busy || disabled}
      role="switch" aria-checked={on} aria-label={label} aria-busy={busy || undefined}>
      <span className="sc-knob">{busy ? <Loader2 size={12} className="sc-spin" color="#64748b" /> : on && <Check size={12} color="#10b981" />}</span>
    </button>
  );
}

/** One setting: icon, title and explanation, with its switch. */
function SettingRow({ icon, color, title, sub, children }: { icon: ReactNode; color: string; title: ReactNode; sub: ReactNode; children: ReactNode }) {
  return (
    <div className="sc-card sc-row">
      <div className="sc-ico" style={{ background: `${color}1a`, border: `1px solid ${color}33`, color }}>{icon}</div>
      <div className="sc-text">
        <div className="sc-title">{title}</div>
        <div className="sc-sub">{sub}</div>
      </div>
      <div className="sc-ctl">{children}</div>
    </div>
  );
}

function SectionHead({ title, sub, aside }: { title: ReactNode; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="sc-sec-head">
      <div style={{ minWidth: 0 }}>
        <h2 className="sc-h2">{title}</h2>
        {sub && <p className="sc-sec-sub">{sub}</p>}
      </div>
      {aside && <div className="sc-sec-aside">{aside}</div>}
    </div>
  );
}

export default function SuperAdminConfiguration() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsState, setSettingsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const qc = useQueryClient();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadSettings = () => {
    setSettingsState('loading');
    saGetSystemSettings()
      .then((res: Record<string, string>) => { setSettings(res ?? {}); setSettingsState('ready'); })
      .catch(() => setSettingsState('error'));
  };

  useEffect(() => {
    loadSettings();
    // Load programs for visibility management
    loadPrograms();
  }, []);

  const loadPrograms = () => {
    setProgramsLoading(true);
    saGetPrograms()
      .then((data: Program[]) => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => toast.error(tx('Failed to load programs')))
      .finally(() => setProgramsLoading(false));
  };

  const handleToggleCarryOver = async () => {
    const currentVal = settings['ALLOW_CARRYOVER_REGISTRATION'] === 'true';
    const newVal = !currentVal;

    setSettingsLoading(true);
    try {
      await saUpdateSystemSettings({ ALLOW_CARRYOVER_REGISTRATION: newVal.toString() });
      setSettings(prev => ({ ...prev, ALLOW_CARRYOVER_REGISTRATION: newVal.toString() }));
      toast.success(newVal ? tx('Carry-over registration allowed') : tx('Carry-over registration switched off'));
    } catch (e) {
      toast.error('Failed to update setting');
    } finally {
      setSettingsLoading(false);
    }
  };

  const isOn = (key: string) => settings[key] !== 'false';

  const handleToggleMarksSheet = async (key: string, label: string) => {
    const next = !isOn(key);
    setSavingKey(key);
    try {
      await saUpdateSystemSettings({ [key]: next.toString() });
      setSettings(prev => ({ ...prev, [key]: next.toString() }));
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success(`Marks Sheet ${next ? 'shown to' : 'hidden from'} ${label}`);
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  const isSet = (key: string, def: boolean) => settings[key] == null ? def : settings[key] === 'true';

  const handleToggleFee = async (t: typeof FEE_TOGGLES[number]) => {
    const next = !isSet(t.key, t.def);
    setSavingKey(t.key);
    try {
      await saUpdateSystemSettings({ [t.key]: next.toString() });
      setSettings(prev => ({ ...prev, [t.key]: next.toString() }));
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
      qc.invalidateQueries({ queryKey: ['fee-overview'] });
      toast.success(`${t.label}: ${next ? 'on' : 'off'}`);
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleExamClock = async () => {
    const key = 'EXAM_CLOCK_RUNS_WHILE_AWAY';
    const next = !isOn(key);
    setSavingKey(key);
    try {
      await saUpdateSystemSettings({ [key]: next.toString() });
      setSettings(prev => ({ ...prev, [key]: next.toString() }));
      toast.success(next ? tx('Exam clock now keeps running while a student is away') : tx('Exam clock now pauses while a student is away'));
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleVerifyLink = async () => {
    const key = 'LOGIN_VERIFY_LINK_VISIBLE';
    const next = !isOn(key);
    setSavingKey(key);
    try {
      await saUpdateSystemSettings({ [key]: next.toString() });
      setSettings(prev => ({ ...prev, [key]: next.toString() }));
      toast.success(next ? 'Verification link shown on the sign-in page' : 'Verification link hidden from the sign-in page');
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleProgram = async (p: Program) => {
    setTogglingId(p.id);
    try {
      const updated = await saToggleProgram(p.id);
      setPrograms(prev => prev.map(x => x.id === p.id ? { ...x, enabled: updated.enabled } : x));
      toast.success(`"${p.name}" has been ${updated.enabled ? 'enabled' : 'disabled'}.`);
    } catch {
      toast.error(tx('Failed to update program visibility'));
    } finally {
      setTogglingId(null);
    }
  };

  const enabledCount  = programs.filter(p => p.enabled).length;
  const disabledCount = programs.filter(p => !p.enabled).length;
  // Until the saved values arrive the switches would show their defaults, so they stay locked
  const locked = settingsState !== 'ready';

  return (
    <div className="sc">
      {/* Header */}
      <div className="sc-head">
        <div className="sc-logo"><Settings2 size={24} color="#fff" /></div>
        <div style={{ minWidth: 0 }}>
          <h1 className="sc-h1">System Configuration</h1>
          <p className="sc-lead">Global platform settings and toggleable features</p>
        </div>
      </div>

      {settingsState === 'error' && (
        <div className="sc-alert" role="alert">
          <AlertTriangle size={16} />
          <span>Couldn't load the current settings, so the switches below are locked.</span>
          <button type="button" className="sc-alert-btn" onClick={loadSettings}><RefreshCw size={13} /> Try again</button>
        </div>
      )}

      {/* ── Course Registration (carry-overs: university only) ───────────── */}
      {!isSchoolMode() && <section className="sc-sec">
        <SectionHead title={tx("Course Registration")} />
        <SettingRow icon={<ShieldCheck size={22} />} color="#ec4899" title="Allow Carry-over Registration"
          sub={tx("If enabled, students can register for courses from previous levels and semesters. If disabled, they are strictly restricted to their current level/semester.")}>
          <Switch on={settings['ALLOW_CARRYOVER_REGISTRATION'] === 'true'} busy={settingsLoading} disabled={locked}
            onClick={handleToggleCarryOver} label="Allow carry-over registration" />
        </SettingRow>
      </section>}

      {/* ── Exams ───────────────────────────────────────────────────────── */}
      <section className="sc-sec">
        <SectionHead title="Exams" />
        <SettingRow icon={<Timer size={22} />} color="#38bdf8" title={tx("Exam clock keeps running while a student is away")}
          sub={tx("On: if a student closes the browser, loses power or drops offline, the time away still counts — they return to the time actually left (and the attempt is submitted if it has run out). Off: the clock resumes from their last save, up to 15 seconds before they left.")}>
          <Switch on={isOn('EXAM_CLOCK_RUNS_WHILE_AWAY')} busy={savingKey === 'EXAM_CLOCK_RUNS_WHILE_AWAY'} disabled={locked}
            onClick={handleToggleExamClock} label={tx("Exam clock keeps running while a student is away")} />
        </SettingRow>
      </section>

      {/* ── Result Slips ────────────────────────────────────────────────── */}
      <section className="sc-sec">
        <SectionHead title="Result Slips" />
        <ReportEmailToggle dark />
      </section>

      {/* ── Sign-in Page ────────────────────────────────────────────────── */}
      <section className="sc-sec">
        <SectionHead title="Sign-in Page" />
        <SettingRow icon={<FileCheck2 size={22} />} color="#34d399" title={tx("Show \"Verify a transcript or report card\" link")}
          sub={tx("Shows the link under the sign-in form. Hiding it does not switch verification off: codes printed on transcripts and report cards still open the verification page. The link is also hidden while document verification is switched off in Features.")}>
          <Switch on={isOn('LOGIN_VERIFY_LINK_VISIBLE')} busy={savingKey === 'LOGIN_VERIFY_LINK_VISIBLE'} disabled={locked}
            onClick={handleToggleVerifyLink} label={tx("Show the verification link on the sign-in page")} />
        </SettingRow>
      </section>

      {/* ── Fees & Payments ─────────────────────────────────────────────── */}
      <section className="sc-sec">
        <SectionHead title="Fees & Payments"
          sub={tx('Set the amounts per programme and level on the Fees page, then choose what students see here.')}
          aside={<Link to="/super-admin/fees" className="sc-link">Manage fees <ArrowRight size={14} /></Link>} />
        <div className="sc-grid">
          {FEE_TOGGLES.map(t => (
            <SettingRow key={t.key} icon={t.icon} color={t.color} title={t.label} sub={t.sub}>
              <Switch on={isSet(t.key, t.def)} busy={savingKey === t.key} disabled={locked} onClick={() => handleToggleFee(t)} label={t.label} />
            </SettingRow>
          ))}
        </div>
      </section>

      {/* ── Results hold for unpaid fees ─────────────────────────────────── */}
      <ResultsHoldSettings />

      {/* ── Marks Sheet Visibility ──────────────────────────────────────── */}
      <section className="sc-sec">
        <SectionHead title="Marks Sheet Visibility"
          sub="Choose which roles see the Marks Sheet in their navigation. When off, the page is hidden and its link is blocked." />
        <div className="sc-grid">
          {MARKS_SHEET_TOGGLES.map(t => (
            <SettingRow key={t.key} icon={t.icon} color={t.color} title={t.label} sub={t.sub}>
              <Switch on={isOn(t.key)} busy={savingKey === t.key} disabled={locked}
                onClick={() => handleToggleMarksSheet(t.key, t.label)} label={`Show Marks Sheet to ${t.label}`} />
            </SettingRow>
          ))}
        </div>
      </section>

      {/* ── Program Visibility ──────────────────────────────────────────── */}
      <section className="sc-sec" style={{ marginBottom: 0 }}>
        <SectionHead title={tx("Program Visibility")}
          sub={tx("Disabled programs are hidden from students, lecturers, and admins system-wide")}
          aside={<>
            <span className="sc-chip ok">{enabledCount} Active</span>
            <span className="sc-chip off">{disabledCount} Disabled</span>
            <button type="button" className="sc-icon-btn" onClick={loadPrograms} disabled={programsLoading} title="Refresh" aria-label={tx("Refresh programs")}>
              <RefreshCw size={14} className={programsLoading ? 'sc-spin' : undefined} />
            </button>
          </>} />

        {programsLoading && programs.length === 0 ? (
          <div className="sc-prog-grid">
            {[1,2,3,4].map(i => <div key={i} className="sc-skel" style={{ height: 72 }} />)}
          </div>
        ) : programs.length === 0 ? (
          <div className="sc-empty">
            <BookMarked size={36} style={{ color: 'rgba(139,92,246,0.3)', marginBottom: 10 }} />
            <p>{tx("No programs found.")} <Link to="/super-admin/programs" className="sc-link" style={{ display: 'inline' }}>{tx("Create programs first.")}</Link></p>
          </div>
        ) : (
          <div className="sc-prog-grid">
            {programs.map(p => (
              <div key={p.id} className={`sc-prog${p.enabled ? '' : ' off'}`}>
                <div className="sc-prog-ico"><BookMarked size={16} /></div>
                <div className="sc-text">
                  <div className="sc-prog-name" title={p.name}>{p.name}</div>
                  <div className="sc-prog-meta">
                    <span className="sc-prog-code">{p.code}</span>
                    {p.departmentName ? ` · ${p.departmentName}` : ''}
                  </div>
                </div>
                <div className="sc-ctl" style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`sc-badge${p.enabled ? '' : ' off'}`}>{p.enabled ? 'Active' : 'Off'}</span>
                  <button type="button" className={`sc-switch${p.enabled ? ' on' : ''}`} onClick={() => handleToggleProgram(p)} disabled={togglingId === p.id}
                    role="switch" aria-checked={p.enabled} aria-label={`${p.enabled ? tx('Disable this program') : tx('Enable this program')}: ${p.name}`}
                    title={p.enabled ? tx('Disable this program') : tx('Enable this program')}>
                    <span className="sc-knob">
                      {togglingId === p.id ? <Loader2 size={12} className="sc-spin" color="#64748b" />
                        : p.enabled ? <Power size={10} color="#10b981" /> : <PowerOff size={10} color="#9ca3af" />}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{CONFIG_CSS}</style>
    </div>
  );
}

const CONFIG_CSS = `
.sc { color: #fff; padding-bottom: 32px; container: sc / inline-size; }
.sc-head { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
.sc-logo { width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0; background: linear-gradient(135deg,#7c3aed,#4f46e5); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(124,58,237,0.4); }
.sc-h1 { margin: 0; font-size: 26px; font-weight: 800; background: linear-gradient(135deg,#a78bfa,#818cf8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.sc-lead { margin: 0; font-size: 13px; color: rgba(255,255,255,0.45); }

.sc-alert { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 12px 14px; margin-bottom: 24px; border-radius: 12px; background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.3); color: #fcd34d; font-size: 13px; }
.sc-alert > span { flex: 1 1 220px; }
.sc-alert-btn { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid rgba(251,191,36,0.4); background: rgba(251,191,36,0.12); color: #fde68a; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }

.sc-sec { margin-bottom: 36px; }
.sc-sec-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px 16px; flex-wrap: wrap; margin-bottom: 14px; }
.sc-h2 { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 1px; }
.sc-sec-sub { margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5; }
.sc-sec-aside { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sc-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #a78bfa; text-decoration: none; }
.sc-link:hover { text-decoration: underline; text-underline-offset: 3px; }

.sc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 14px; }
.sc-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(139,92,246,0.15); border-radius: 16px; }
.sc-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px 16px; padding: 18px 22px; height: 100%; box-sizing: border-box; }
.sc-ico { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.sc-text { min-width: 0; }
.sc-title { font-weight: 600; font-size: 15px; color: #fff; margin-bottom: 4px; overflow-wrap: anywhere; }
.sc-sub { font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.45; }
.sc-ctl { flex-shrink: 0; }

.sc-switch { position: relative; width: 50px; height: 26px; padding: 0; border: none; border-radius: 20px; background: rgba(255,255,255,0.12); cursor: pointer; transition: background .25s; flex-shrink: 0; display: block; }
.sc-switch.on { background: #10b981; }
.sc-switch::after { content: ''; position: absolute; inset: -9px -6px; }
.sc-switch:disabled { cursor: not-allowed; opacity: .55; }
.sc-switch[aria-busy="true"] { opacity: 1; }
.sc-switch:focus-visible { outline: 2px solid #a78bfa; outline-offset: 3px; }
.sc-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; transition: transform .25s; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.sc-switch.on .sc-knob { transform: translateX(24px); }

.sc-chip { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.sc-chip.ok { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #34d399; }
.sc-chip.off { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #f87171; }
.sc-icon-btn { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.sc-icon-btn:hover:not(:disabled) { color: #fff; background: rgba(255,255,255,0.1); }
.sc-icon-btn:disabled { cursor: default; }

.sc-prog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: 12px; }
.sc-prog { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(139,92,246,0.15); transition: border-color .2s, background .2s; }
.sc-prog.off { background: rgba(239,68,68,0.04); border-color: rgba(239,68,68,0.25); }
.sc-prog-ico { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(14,165,233,0.12); border: 1px solid rgba(14,165,233,0.25); color: #38bdf8; }
.sc-prog.off .sc-prog-ico { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); color: #f87171; }
.sc-prog-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-prog-meta { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-prog-code { font-weight: 700; color: #38bdf8; }
.sc-prog.off .sc-prog-code { color: #f87171; }
.sc-badge { font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; padding: 2px 8px; border-radius: 20px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #34d399; }
.sc-badge.off { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); color: #f87171; }
.sc-empty { text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px dashed rgba(139,92,246,0.2); }
.sc-empty p { color: rgba(255,255,255,0.45); margin: 0; font-size: 13px; }
.sc-skel { border-radius: 12px; background: rgba(255,255,255,0.04); animation: sc-pulse 1.5s infinite; }
.sc-spin { animation: sc-spin 1s linear infinite; }
@keyframes sc-spin { to { transform: rotate(360deg); } }
@keyframes sc-pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

@container sc (max-width: 560px) {
  .sc-head { margin-bottom: 20px; gap: 12px; }
  .sc-logo { width: 42px; height: 42px; border-radius: 12px; }
  .sc-h1 { font-size: 21px; }
  .sc-sec { margin-bottom: 28px; }
  .sc-h2 { font-size: 14px; }
  .sc-row { grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: 12px; padding: 16px; }
  .sc-ico { width: 38px; height: 38px; border-radius: 10px; }
  .sc-ico svg { width: 18px; height: 18px; }
  .sc-title { font-size: 14px; }
  .sc-row .sc-ctl { padding-top: 2px; }
  .sc-prog { padding: 12px 14px; gap: 10px; }
  .sc-prog .sc-badge { display: none; }
}
@container sc (max-width: 360px) {
  .sc-row { grid-template-columns: minmax(0, 1fr) auto; }
  .sc-row .sc-ico { display: none; }
  .sc-prog-ico { display: none; }
  .sc-prog { grid-template-columns: minmax(0, 1fr) auto; }
}
@media (pointer: coarse) {
  .sc-icon-btn { width: 40px; height: 40px; }
  .sc-alert-btn { height: 40px; }
}
@media (prefers-reduced-motion: reduce) {
  .sc-switch, .sc-knob { transition: none; }
}
`;
