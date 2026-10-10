import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Wrench, Loader2, Save, AlertTriangle, Info, Power } from 'lucide-react';
import { getMaintenance, saveMaintenance, type MaintenanceState } from '../../../api/endpoints';
import { PanelHeader, PanelLoading, PanelError, apiMessage, relativeTime, fullDate, useNow } from './ui';

const DEFAULT_MESSAGE = 'The portal is being updated. Please try again shortly.';

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time; the server stores the same shape. */
const toInput = (v: string | null) => (v ? v.slice(0, 16) : '');

/** Pause sign-ins and new exams during an upgrade, with a notice everyone sees. */
export default function MaintenancePanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['dev-maintenance'], queryFn: getMaintenance });
  const [message, setMessage] = useState('');
  const [until, setUntil] = useState('');
  const [allowAdmins, setAllowAdmins] = useState(true);
  const [saving, setSaving] = useState<'toggle' | 'save' | null>(null);
  const now = useNow();

  useEffect(() => {
    if (!q.data) return;
    setMessage(q.data.message === DEFAULT_MESSAGE ? '' : q.data.message);
    setUntil(toInput(q.data.until));
    setAllowAdmins(q.data.allowAdmins);
  }, [q.data]);

  const header = (
    <PanelHeader
      title="Maintenance mode"
      description="Use it before an upgrade. Sign-ins and new quiz attempts are paused; students already in an exam keep going and can submit. Developers can always sign in."
    />
  );
  if (q.isLoading) return <section>{header}<PanelLoading label="Loading maintenance mode" /></section>;
  if (q.isError || !q.data) return <section>{header}<PanelError message="Could not load maintenance mode." onRetry={() => q.refetch()} /></section>;

  const on = q.data.enabled;
  const body = (extra: Partial<MaintenanceState>) => ({ message: message.trim(), until: until || '', allowAdmins, ...extra });
  const dirty = (message.trim() || DEFAULT_MESSAGE) !== q.data.message || until !== toInput(q.data.until) || allowAdmins !== q.data.allowAdmins;

  const apply = async (kind: 'toggle' | 'save', extra: Partial<MaintenanceState>, ok: string) => {
    setSaving(kind);
    try {
      const updated = await saveMaintenance(body(extra));
      qc.setQueryData(['dev-maintenance'], updated);
      qc.invalidateQueries({ queryKey: ['institution'] });
      toast.success(ok);
    } catch (err) { toast.error(apiMessage(err, 'Could not update maintenance mode')); }
    finally { setSaving(null); }
  };

  const toggle = () => {
    if (!on && !window.confirm('Turn on maintenance mode? Nobody except developers' + (allowAdmins ? ' and Super Admins' : '') + ' will be able to sign in, and no new quiz attempts can start.')) return;
    apply('toggle', { enabled: !on }, on ? 'Maintenance mode is off. Everyone can sign in again.' : 'Maintenance mode is on.');
  };

  const preview = message.trim() || DEFAULT_MESSAGE;
  const untilDate = until ? new Date(until) : null;

  return (
    <section>
      {header}

      <div className={`dd-card dd-access dm-status${on ? ' is-on' : ''}`}>
        <span className={`dd-access-icon${on ? ' dm-warn' : ''}`} aria-hidden><Wrench size={18} /></span>
        <div className="dd-access-text">
          <strong>{on ? 'Maintenance mode is on' : 'Maintenance mode is off'}</strong>
          <span>
            {on
              ? <>Since <time title={q.data.since ? fullDate(q.data.since) : ''}>{q.data.since ? relativeTime(q.data.since, now) : 'just now'}</time>. Only developers{q.data.allowAdmins ? ' and Super Admins' : ''} can sign in.</>
              : 'Everyone can sign in and start quizzes as normal.'}
          </span>
        </div>
        <button type="button" className={`dd-btn ${on ? '' : 'dd-btn-primary'}`} onClick={toggle} disabled={!!saving}>
          {saving === 'toggle' ? <Loader2 size={15} className="dd-spin" /> : <Power size={15} />} {on ? 'Turn off' : 'Turn on'}
        </button>
      </div>

      <div className="dd-two">
        <div className="dd-card">
          <div className="dd-card-head"><h2 className="dd-card-title">Notice</h2></div>
          <label className="dm-label" htmlFor="dm-msg">Message shown to everyone</label>
          <textarea id="dm-msg" className="dm-input" rows={3} maxLength={300} placeholder={DEFAULT_MESSAGE}
            value={message} onChange={e => setMessage(e.target.value)} />
          <span className="dd-muted-sm">{message.length}/300</span>

          <label className="dm-label" htmlFor="dm-until">Expected back by (optional)</label>
          <input id="dm-until" type="datetime-local" className="dd-select dm-date" value={until} onChange={e => setUntil(e.target.value)} />
          <p className="dd-note"><Info size={14} /> Only shown to users. Maintenance stays on until you turn it off.</p>

          <label className="dd-check dm-check">
            <input type="checkbox" checked={allowAdmins} onChange={e => setAllowAdmins(e.target.checked)} />
            <span>Super Admins can still sign in (to check the system before it reopens)</span>
          </label>

          <div className="dm-actions">
            <button type="button" className="dd-btn dd-btn-primary" onClick={() => apply('save', {}, 'Notice saved.')} disabled={!dirty || !!saving}>
              {saving === 'save' ? <Loader2 size={15} className="dd-spin" /> : <Save size={15} />} Save notice
            </button>
          </div>
        </div>

        <div className="dd-card">
          <div className="dd-card-head"><h2 className="dd-card-title">What people see</h2></div>
          <div className="dm-banner" aria-hidden>
            <Wrench size={16} />
            <div>
              <strong>Maintenance in progress.</strong> {preview}
              {untilDate && !isNaN(untilDate.getTime()) && <> Expected back by {untilDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.</>}
              <span>Signing in is paused. An exam you have already started can still be finished and submitted.</span>
            </div>
          </div>
          <ul className="dm-effects">
            <li><AlertTriangle size={14} /> {allowAdmins ? 'Only Super Admins can use the sign-in page' : 'Nobody can use the sign-in page'} (developers use their own sign-in).</li>
            <li><AlertTriangle size={14} /> Students can't start a new quiz attempt.</li>
            <li><Info size={14} /> People already signed in keep working and see the notice above.</li>
            <li><Info size={14} /> Exams already in progress can be finished and submitted.</li>
          </ul>
        </div>
      </div>
      <style>{CSS}</style>
    </section>
  );
}

const CSS = `
.dm-status { flex-wrap: wrap; }
.dm-status.is-on { border-color: var(--dd-warn-line); background: var(--dd-warn-soft); }
.dd-access-icon.dm-warn { background: var(--dd-warn-soft); color: var(--dd-warn); border-color: var(--dd-warn-line); }
.dm-label { display: block; margin: 14px 0 6px; font-size: 13px; font-weight: 700; color: var(--dd-text); }
.dm-label:first-of-type { margin-top: 0; }
.dm-input { width: 100%; padding: 10px 12px; border-radius: 9px; border: 1px solid var(--dd-border-strong); background: var(--dd-surface);
  color: var(--dd-text); font: inherit; font-size: 13.5px; resize: vertical; min-height: 80px; }
.dm-input:focus { outline: none; border-color: var(--dd-accent); box-shadow: 0 0 0 3px var(--dd-accent-soft); }
.dm-date { cursor: text; padding: 0 10px; max-width: 100%; }
.dm-check { margin-top: 14px; }
.dm-actions { display: flex; justify-content: flex-end; margin-top: 16px; }
.dm-banner { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: #fffbeb;
  border: 1px solid #f59e0b; color: #78350f; font-size: 13px; line-height: 1.5; }
.dm-banner > svg { flex: none; margin-top: 2px; color: #b45309; }
.dm-banner span { display: block; color: #92400e; font-size: 12.5px; margin-top: 2px; }
.dm-effects { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; font-size: 13px; color: var(--dd-text-2); }
.dm-effects li { display: flex; gap: 8px; align-items: flex-start; }
.dm-effects svg { flex: none; margin-top: 3px; color: var(--dd-muted); }
`;
