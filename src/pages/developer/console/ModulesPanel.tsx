import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { getModules, setModules } from '../../../api/endpoints';
import { PanelHeader, PanelLoading, PanelError, apiMessage } from './ui';

/** Which parts of the system this institution uses. Only the developer switches them. */
export default function ModulesPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['dev-modules'], queryFn: getModules });
  const [saving, setSaving] = useState(false);
  const on = q.data?.assessments ?? true;

  const toggle = async () => {
    if (on && !window.confirm('Switch Assessments off? Quizzes, questions, results, the question bank, the exam timetable, '
      + 're-marks and quiz reports disappear for every user until you switch it back on. Nothing is deleted.')) return;
    setSaving(true);
    try {
      const r = await setModules({ assessments: !on });
      qc.setQueryData(['dev-modules'], r);
      qc.invalidateQueries({ queryKey: ['dev-audit'] });   // the change is audited
      toast.success(r.assessments ? 'Assessments are on for everyone' : 'Assessments are off for everyone');
    } catch (err) { toast.error(apiMessage(err, 'Could not change the module')); }
    finally { setSaving(false); }
  };

  return (
    <section>
      <PanelHeader
        title="Modules"
        description="Switch off the parts this institution doesn't use. Switched-off parts disappear for the Super Admin, HODs, lecturers and students alike; their data is kept."
      />
      <div className="dd-card dd-access">
        {q.isLoading ? <PanelLoading label="Loading modules" />
          : q.isError ? <PanelError message="Could not load the modules." onRetry={() => q.refetch()} />
          : (
            <>
              <span className={`dd-access-icon${on ? ' is-on' : ''}`} aria-hidden><ClipboardCheck size={18} /></span>
              <div className="dd-access-text">
                <strong id="dd-mod-assessments">Assessments (quizzes)</strong>
                <span>{on
                  ? 'On: quizzes, questions, results, quiz review, the question bank, the exam timetable, re-marks, quiz analytics and quiz reports work as usual.'
                  : 'Off: none of it appears for anyone, and the server refuses every quiz request. Switch it on again to bring everything back as it was.'}</span>
              </div>
              <button type="button" role="switch" aria-checked={on} aria-labelledby="dd-mod-assessments"
                className={`dd-switch${on ? ' is-on' : ''}`} onClick={toggle} disabled={saving}>
                <span className="dd-switch-knob">{saving && <Loader2 size={11} className="dd-spin" />}</span>
              </button>
            </>
          )}
      </div>
    </section>
  );
}
