import { useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BedDouble, BookOpen, ClipboardCheck, Home, Landmark, Loader2, Info, ShieldCheck, Users } from 'lucide-react';
import { getModules, setModules, type DeveloperModules } from '../../../api/endpoints';
import { PanelHeader, PanelLoading, PanelError, Meter, apiMessage } from './ui';

type Residency = DeveloperModules['residency'];

const RESIDENCY: { value: Residency; label: string; icon: ReactNode; description: string; confirm: string }[] = [
  {
    value: 'DAY', label: 'Day only', icon: <Home size={20} />,
    description: 'Students go home every day. Hostels, rooms and the Boarding pages are hidden for everyone.',
    confirm: 'Switch to day only? Boarding disappears for every user and the server refuses boarding requests. '
      + 'Hostels, rooms and who lived where are kept and come back if you switch boarding on again.',
  },
  {
    value: 'BOARDING', label: 'Boarding only', icon: <BedDouble size={20} />,
    description: 'Every student is a boarder. Staff set up hostels, floors and rooms and give each student a room and bed.',
    confirm: 'Switch to boarding only? Every student counts as a boarder from now on, and the Boarding pages appear for the Super Admin and boarding staff.',
  },
  {
    value: 'BOTH', label: 'Day and boarding', icon: <Users size={20} />,
    description: 'Each student is a day student or a boarder, recorded on their profile. Only boarders are given rooms.',
    confirm: 'Switch to day and boarding? Students with no residency recorded keep what they are now '
      + '(day students in a day school, boarders in a boarding school); staff can change any student afterwards.',
  },
];

type WalletKey = 'walletSpendSuperAdmin' | 'walletSpendBursar';
type Saving = 'assessments' | 'residency' | 'materials' | 'materialsLimits' | WalletKey;

const gb = (bytes: number) => bytes / (1024 * 1024 * 1024);
const sizeLabel = (bytes: number) => bytes >= 1024 ** 3 ? `${gb(bytes).toFixed(1)} GB`
  : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(0)} MB` : `${Math.round(bytes / 1024)} KB`;

/** Who besides the student may use a student's wallet money on their fees and bills. */
const WALLET_SPENDERS: { key: WalletKey; who: string; icon: ReactNode; on: string; off: string }[] = [
  {
    key: 'walletSpendSuperAdmin', who: 'Super Admin', icon: <ShieldCheck size={18} />,
    on: 'On: the Super Admin can pay a student’s fees and bills from the student’s wallet, giving a reason each time.',
    off: 'Off: the Super Admin can see wallets but not pay anything from them.',
  },
  {
    key: 'walletSpendBursar', who: 'Bursar', icon: <Landmark size={18} />,
    on: 'On: bursars can pay a student’s fees and bills from the student’s wallet, giving a reason each time.',
    off: 'Off: bursars can see wallets but not pay anything from them.',
  },
];

/** Which parts of the system this institution uses. Only the developer switches them. */
export default function ModulesPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['dev-modules'], queryFn: getModules });
  const [saving, setSaving] = useState<Saving | null>(null);
  const on = q.data?.assessments ?? true;
  const residency: Residency = q.data?.residency ?? 'DAY';
  // A server from before wallet payments sends neither switch, and would refuse to save them
  const walletSupported = typeof q.data?.walletSpendSuperAdmin === 'boolean' && typeof q.data?.walletSpendBursar === 'boolean';

  const toggleSpender = (s: typeof WALLET_SPENDERS[number]) => {
    const now = q.data?.[s.key] === true;
    if (!now && !window.confirm(`Let the ${s.key === 'walletSpendBursar' ? 'bursar' : 'Super Admin'} pay students’ fees and bills from their wallets? `
      + 'Each payment needs a reason, is recorded in the audit log, and the student is told.')) return;
    save(s.key, { [s.key]: !now }, r => `${s.who}: ${r[s.key] ? 'can' : 'can no longer'} pay from student wallets`);
  };

  const save = async (what: Saving, data: Partial<DeveloperModules>, done: (r: DeveloperModules) => string) => {
    setSaving(what);
    try {
      const r = await setModules(data);
      qc.setQueryData(['dev-modules'], r);
      qc.invalidateQueries({ queryKey: ['dev-audit'] });   // the change is audited
      toast.success(done(r));
    } catch (err) { toast.error(apiMessage(err, 'Could not change the module')); }
    finally { setSaving(null); }
  };

  const materialsOn = q.data?.materials === true;
  const materialsSupported = typeof q.data?.materials === 'boolean';
  const [maxMb, setMaxMb] = useState('');
  const [quota, setQuota] = useState('');
  const usedBytes = q.data?.materialsUsedBytes ?? 0;
  const quotaGb = q.data?.materialsQuotaGb ?? 20;
  const usedPercent = quotaGb > 0 ? (gb(usedBytes) / quotaGb) * 100 : 0;

  const toggleMaterials = () => {
    if (!materialsOn && !window.confirm('Switch Course Materials on? The Super Admin can then turn it on or off under Feature Controls '
      + '(and HODs per department), and lecturers can post weekly notes, links and assignments for their students.')) return;
    if (materialsOn && !window.confirm('Switch Course Materials off? Notes, assignments and handed-in work disappear for every user and the server '
      + 'refuses every request (download links too). Nothing is deleted; switching it on brings everything back.')) return;
    save('materials', { materials: !materialsOn }, r => r.materials ? 'Course materials are on' : 'Course materials are off for everyone');
  };

  const saveLimits = (e: FormEvent) => {
    e.preventDefault();
    const data: Partial<DeveloperModules> = {};
    const mb = Number(maxMb), g = Number(quota);
    if (maxMb.trim()) {
      if (!Number.isInteger(mb) || mb < 1 || mb > 100) { toast.error('The largest file must be a whole number from 1 to 100 MB'); return; }
      data.materialsMaxFileMb = mb;
    }
    if (quota.trim()) {
      if (!Number.isInteger(g) || g < 1 || g > 10000) { toast.error('Storage must be a whole number from 1 to 10000 GB'); return; }
      data.materialsQuotaGb = g;
    }
    if (!Object.keys(data).length) { toast('Nothing to change'); return; }
    save('materialsLimits', data, r => `Largest file ${r.materialsMaxFileMb} MB · storage ${r.materialsQuotaGb} GB`);
    setMaxMb(''); setQuota('');
  };

  const toggle = () => {
    if (on && !window.confirm('Switch Assessments off? Quizzes, questions, results, the question bank, the exam timetable, '
      + 're-marks and quiz reports disappear for every user until you switch it back on. Nothing is deleted.')) return;
    save('assessments', { assessments: !on }, r => r.assessments ? 'Assessments are on for everyone' : 'Assessments are off for everyone');
  };

  const chooseResidency = (value: Residency) => {
    if (value === residency || saving) return;
    const opt = RESIDENCY.find(o => o.value === value)!;
    if (!window.confirm(opt.confirm)) return;
    save('residency', { residency: value }, r => `Students: ${RESIDENCY.find(o => o.value === r.residency)?.label.toLowerCase()}`);
  };

  return (
    <section>
      <PanelHeader
        title="Modules"
        description="Switch off the parts this institution doesn't use. Switched-off parts disappear for the Super Admin, HODs, lecturers and students alike; their data is kept."
      />
      {q.isLoading ? <div className="dd-card"><PanelLoading label="Loading modules" /></div>
        : q.isError ? <div className="dd-card"><PanelError message="Could not load the modules." onRetry={() => q.refetch()} /></div>
        : (
          <>
            <div className="dd-card dd-access">
              <span className={`dd-access-icon${on ? ' is-on' : ''}`} aria-hidden><ClipboardCheck size={18} /></span>
              <div className="dd-access-text">
                <strong id="dd-mod-assessments">Assessments (quizzes)</strong>
                <span>{on
                  ? 'On: quizzes, questions, results, quiz review, the question bank, the exam timetable, re-marks, quiz analytics and quiz reports work as usual.'
                  : 'Off: none of it appears for anyone, and the server refuses every quiz request. Switch it on again to bring everything back as it was.'}</span>
              </div>
              <button type="button" role="switch" aria-checked={on} aria-labelledby="dd-mod-assessments"
                className={`dd-switch${on ? ' is-on' : ''}`} onClick={toggle} disabled={saving !== null}>
                <span className="dd-switch-knob">{saving === 'assessments' && <Loader2 size={11} className="dd-spin" />}</span>
              </button>
            </div>

            <h3 className="dd-section-title dd-section-gap" id="dd-mod-materials-h">Course notes and assignments</h3>
            <p className="dd-section-sub">Lecturers post notes, links and assignments week by week; students download them, hand in work online and get marks (with optional AI-suggested marking). Starts off.</p>
            {!materialsSupported && (
              <p className="dd-note" role="status" style={{ marginTop: 0, marginBottom: 12, color: 'var(--dd-warn, #b45309)' }}><Info size={14} />
                The server this console is connected to doesn’t have course materials yet. Deploy the latest backend, then reload this page.</p>
            )}
            <div className="dd-card dd-rows">
              <div className="dd-access">
                <span className={`dd-access-icon${materialsOn ? ' is-on' : ''}`} aria-hidden><BookOpen size={18} /></span>
                <div className="dd-access-text">
                  <strong id="dd-mod-materials">Course materials</strong>
                  <span>{materialsOn
                    ? 'On: the Super Admin decides under Feature Controls (HODs per department), and lecturers choose what their students see.'
                    : 'Off: nobody sees notes, assignments or handed-in work, and the server refuses every request. Files are kept.'}</span>
                </div>
                <button type="button" role="switch" aria-checked={materialsOn} aria-labelledby="dd-mod-materials"
                  className={`dd-switch${materialsOn ? ' is-on' : ''}`} onClick={toggleMaterials} disabled={saving !== null || !materialsSupported}>
                  <span className="dd-switch-knob">{saving === 'materials' && <Loader2 size={11} className="dd-spin" />}</span>
                </button>
              </div>
              {materialsSupported && (
                <div className="dd-access" style={{ display: 'block' }}>
                  <div className="dd-access-text" style={{ marginBottom: 8 }}>
                    <strong>Storage</strong>
                    <span>{sizeLabel(usedBytes)} of {quotaGb} GB used · largest file {q.data?.materialsMaxFileMb ?? 25} MB</span>
                  </div>
                  <Meter percent={usedPercent} tone={usedPercent >= 90 ? 'bad' : usedPercent >= 75 ? 'warn' : 'ok'} />
                  <form onSubmit={saveLimits} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginTop: 12 }}>
                    <label style={{ display: 'grid', gap: 4, fontSize: 13, flex: '1 1 140px' }}>
                      Largest file (MB)
                      <input className="dd-select" type="number" min={1} max={100} inputMode="numeric"
                        placeholder={String(q.data?.materialsMaxFileMb ?? 25)} value={maxMb} onChange={e => setMaxMb(e.target.value)} />
                    </label>
                    <label style={{ display: 'grid', gap: 4, fontSize: 13, flex: '1 1 140px' }}>
                      Total storage (GB)
                      <input className="dd-select" type="number" min={1} max={10000} inputMode="numeric"
                        placeholder={String(quotaGb)} value={quota} onChange={e => setQuota(e.target.value)} />
                    </label>
                    <button type="submit" className="dd-btn dd-btn-primary" disabled={saving !== null}>
                      {saving === 'materialsLimits' && <Loader2 size={13} className="dd-spin" />} Save limits
                    </button>
                  </form>
                  {q.data?.materialsFolder && <p className="dd-muted-sm" style={{ marginTop: 10, overflowWrap: 'anywhere' }}>
                    Files are kept in <code>{q.data.materialsFolder}</code> on the server. Include this folder in backups.</p>}
                </div>
              )}
            </div>
            <p className="dd-note"><Info size={14} /> The web server in front of the backend (e.g. Nginx <code>client_max_body_size</code>) must allow uploads at least this large.</p>

            <h3 className="dd-section-title dd-section-gap" id="dd-mod-residency">Day and boarding</h3>
            <p className="dd-section-sub">How this institution houses its students. Boarding adds hostels (houses / halls), blocks, floors, rooms and beds, and shows where each boarder sleeps.</p>
            <fieldset className="dd-fieldset" disabled={saving !== null}>
              <div className="dd-mgrid dd-mgrid-3" role="radiogroup" aria-labelledby="dd-mod-residency">
                {RESIDENCY.map(o => {
                  const current = o.value === residency;
                  return (
                    <label key={o.value} className={`dd-mcard${current ? ' is-selected is-current' : ''}`}>
                      <input type="radio" name="residency-mode" className="dd-sr" value={o.value}
                        checked={current} onChange={() => chooseResidency(o.value)} />
                      <div className="dd-mcard-head">
                        <span className="dd-mcard-icon">{o.icon}</span>
                        <span className="dd-mcard-title">
                          <strong>{o.label}</strong>
                          {current && <span className="dd-tag dd-tag-ok">Active</span>}
                          {saving === 'residency' && !current && <Loader2 size={13} className="dd-spin" />}
                        </span>
                        <span className="dd-radio" aria-hidden />
                      </div>
                      <p className="dd-mcard-desc">{o.description}</p>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="dd-note"><Info size={14} /> The change applies at once and is recorded in the audit log. Switching never deletes hostels, rooms or room history.</p>

            <h3 className="dd-section-title dd-section-gap" id="dd-mod-wallet">Student wallet: who else can pay from it</h3>
            <p className="dd-section-sub">Students always choose what their own wallet pays. Switch on whoever else may use a student’s wallet money on that student’s fees and bills. Cashiers never can.</p>
            {!walletSupported && (
              <p className="dd-note" role="status" style={{ marginTop: 0, marginBottom: 12, color: 'var(--dd-warn, #b45309)' }}><Info size={14} />
                The server this console is connected to doesn’t have wallet payments yet, so these switches can’t be changed. Deploy the latest backend, then reload this page.</p>
            )}
            <div className="dd-card dd-rows" role="group" aria-labelledby="dd-mod-wallet">
              {WALLET_SPENDERS.map(s => {
                const allowed = q.data?.[s.key] === true;
                return (
                  <div key={s.key} className="dd-access">
                    <span className={`dd-access-icon${allowed ? ' is-on' : ''}`} aria-hidden>{s.icon}</span>
                    <div className="dd-access-text">
                      <strong id={`dd-mod-${s.key}`}>{s.who}</strong>
                      <span>{allowed ? s.on : s.off}</span>
                    </div>
                    <button type="button" role="switch" aria-checked={allowed} aria-labelledby={`dd-mod-${s.key}`}
                      className={`dd-switch${allowed ? ' is-on' : ''}`} onClick={() => toggleSpender(s)} disabled={saving !== null || !walletSupported}>
                      <span className="dd-switch-knob">{saving === s.key && <Loader2 size={11} className="dd-spin" />}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="dd-note"><Info size={14} /> Applies at once and is recorded in the audit log. The wallet itself must also be on under the Super Admin’s Feature Controls.</p>
          </>
        )}
    </section>
  );
}
