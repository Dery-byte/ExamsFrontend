import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BedDouble, ClipboardCheck, Home, Loader2, Info, Users } from 'lucide-react';
import { getModules, setModules, type DeveloperModules } from '../../../api/endpoints';
import { PanelHeader, PanelLoading, PanelError, apiMessage } from './ui';

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

/** Which parts of the system this institution uses. Only the developer switches them. */
export default function ModulesPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['dev-modules'], queryFn: getModules });
  const [saving, setSaving] = useState<'assessments' | 'residency' | null>(null);
  const on = q.data?.assessments ?? true;
  const residency: Residency = q.data?.residency ?? 'DAY';

  const save = async (what: 'assessments' | 'residency', data: Partial<DeveloperModules>, done: (r: DeveloperModules) => string) => {
    setSaving(what);
    try {
      const r = await setModules(data);
      qc.setQueryData(['dev-modules'], r);
      qc.invalidateQueries({ queryKey: ['dev-audit'] });   // the change is audited
      toast.success(done(r));
    } catch (err) { toast.error(apiMessage(err, 'Could not change the module')); }
    finally { setSaving(null); }
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
          </>
        )}
    </section>
  );
}
