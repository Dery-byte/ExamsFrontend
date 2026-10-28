import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { BellRing, Info, Loader2, Mail, MessageSquare, Search, Send } from 'lucide-react';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import { BILL_CSS, useBursar } from './BillsPage';
import { AccountsHead, errorText, Section, Totals } from './accountsUi';
import {
  getPriceList, getReminders, previewReminders, sendReminders, setAutoReminders, type ReminderInput, type ReminderPreview,
} from '../../api/endpoints';
import { formatDate, formatMoney, moneyInput, parseMoney } from '../../utils/money';
import { levelName, tx, showLevelPicker } from '../../utils/terms';

/**
 * Reminders to students who owe (earlier years, fees so far, bills, less credit): in the portal, by
 * email and (when set up) by SMS. Nobody is reminded twice within the chosen days. Optional automatic
 * reminders every N days. Bursar only; others see the history.
 */
export default function RemindersPage() {
  const qc = useQueryClient();
  const bursar = useBursar();
  const { data } = useQuery({ queryKey: ['reminders'], queryFn: getReminders });
  const { data: list } = useQuery({ queryKey: ['price-list'], queryFn: getPriceList, enabled: bursar });
  const [programId, setProgramId] = useState<number | ''>('');
  const [level, setLevel] = useState<number | ''>('');
  const [minOwed, setMinOwed] = useState('');
  const [skipDays, setSkipDays] = useState('7');
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<ReminderPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const cur = data?.currency ?? 'GHS';
  const program = list?.classes.find(c => c.id === programId);

  useEffect(() => { if (data && !message) setMessage(data.defaultMessage); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPreview(null); }, [programId, level, minOwed, skipDays, email, sms, message]);

  const req = (): ReminderInput => ({
    programId: programId === '' ? undefined : programId, level: level === '' ? undefined : level,
    minOwed: minOwed ? parseMoney(minOwed) : undefined, skipDays: Number(skipDays || 0), email, sms, message: message.trim() || undefined,
  });
  const check = async () => {
    setBusy(true);
    try { setPreview(await previewReminders(req())); } catch (e) { toast.error(errorText(e, 'Could not check')); } finally { setBusy(false); }
  };
  const send = async () => {
    if (!preview) return;
    const ok = await Swal.fire({ title: `Remind ${preview.students} ${tx('student')}(s)?`, text: `They owe ${formatMoney(preview.total, cur)} in all.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Send' });
    if (!ok.isConfirmed) return;
    setBusy(true);
    try {
      const r = await sendReminders(req());
      toast.success(`Reminded ${r.students}: ${r.emails} email(s)${r.sms ? `, ${r.sms} SMS` : ''}`);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ['reminders'] });
    } catch (e) { toast.error(errorText(e, 'Could not send')); } finally { setBusy(false); }
  };
  const auto = async (days: number) => {
    try { await setAutoReminders(days); toast.success(days ? `Automatic reminders every ${days} days` : 'Automatic reminders off'); qc.invalidateQueries({ queryKey: ['reminders'] }); }
    catch (e) { toast.error(errorText(e, 'Could not save')); }
  };

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + BILL_CSS}</style>
      <AccountsHead icon={<BellRing size={24} color="#fff" />} title="Fee reminders" sub={tx('Remind students who owe, in the portal, by email and by SMS.')} />

      {bursar && (
        <div className="fe-card" style={{ padding: 16, marginBottom: 14 }}>
          <div className="fe-grid2">
            <div className="fe-field">
              <label className="fe-label" htmlFor="rm-prog">{tx('Programme')}</label>
              <select id="rm-prog" className="fe-select" style={{ width: '100%' }} value={programId} onChange={e => { setProgramId(e.target.value ? Number(e.target.value) : ''); setLevel(''); }}>
                <option value="">{tx('Every programme')}</option>
                {(list?.classes ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {showLevelPicker(program?.levels.length ?? 0) && <div className="fe-field">
              <label className="fe-label" htmlFor="rm-level">{tx('Level')}</label>
              <select id="rm-level" className="fe-select" style={{ width: '100%' }} value={level} disabled={!program} onChange={e => setLevel(e.target.value ? Number(e.target.value) : '')}>
                <option value="">{tx('Every level')}</option>
                {program?.levels.map(l => <option key={l.level} value={l.level}>{levelName(l.level)}</option>)}
              </select>
            </div>}
          </div>
          <div className="fe-grid2">
            <div className="fe-field">
              <label className="fe-label" htmlFor="rm-min">Owing at least <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
              <div className="fe-money"><span>{cur}</span><input id="rm-min" className="fe-input" inputMode="decimal" placeholder="1.00" value={minOwed} onChange={e => setMinOwed(moneyInput(e.target.value))} /></div>
            </div>
            <div className="fe-field">
              <label className="fe-label" htmlFor="rm-skip">Not if reminded in the last</label>
              <select id="rm-skip" className="fe-select" style={{ width: '100%' }} value={skipDays} onChange={e => setSkipDays(e.target.value)}>
                {['0', '3', '7', '14', '30'].map(d => <option key={d} value={d}>{d === '0' ? 'Remind everyone' : `${d} days`}</option>)}
              </select>
            </div>
          </div>
          <div className="fe-field">
            <span className="fe-label">Also send by</span>
            <div className="fe-checks">
              <label className={`fe-check${email ? ' on' : ''}`}><input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} /><Mail size={13} /> Email</label>
              <label className={`fe-check${sms ? ' on' : ''}`} title={data?.smsReady ? undefined : 'SMS is not set up on the server'}>
                <input type="checkbox" checked={sms} disabled={!data?.smsReady} onChange={e => setSms(e.target.checked)} /><MessageSquare size={13} /> SMS{!data?.smsReady && ' (not set up)'}</label>
            </div>
            <div className="fe-hint">Every reminder also appears in the {tx('student')}'s notifications.</div>
          </div>
          <div className="fe-field">
            <label className="fe-label" htmlFor="rm-msg">Message</label>
            <textarea id="rm-msg" className="fe-textarea" rows={3} maxLength={400} style={{ width: '100%' }} value={message} onChange={e => setMessage(e.target.value)} />
            <div className="fe-hint">{'{name}'} first name · {'{amount}'} what they owe · {'{studentId}'} {tx('Student ID')} · {'{school}'} school name. {sms && `${message.length} characters (an SMS page is 160).`}</div>
          </div>
          {preview && (
            <div className="fe-note info" style={{ marginBottom: 12 }}>
              <Info size={15} />
              <span><b>{preview.students}</b> {tx('student')}(s) owe <b>{formatMoney(preview.total, cur)}</b>: {preview.withEmail} with email{sms ? `, ${preview.withPhone} with a phone` : ''}.
                {preview.skipped > 0 && <> {preview.skipped} reminded recently are left out.</>}
                {preview.example && <><br />e.g. “{preview.example}”</>}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="fe-ghost" onClick={check} disabled={busy}>{busy && !preview ? <Loader2 size={15} className="fe-spin" /> : <Search size={15} />} Check who</button>
            <button type="button" className="fe-btn" onClick={send} disabled={busy || !preview || preview.students === 0}>{busy && preview ? <Loader2 size={15} className="fe-spin" /> : <Send size={15} />} Send{preview ? ` to ${preview.students}` : ''}</button>
          </div>
        </div>
      )}

      {data && (
        <div className="fe-card" style={{ padding: 16, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div className="fe-strong">Automatic reminders</div>
            <div className="fe-muted fe-small">{data.autoEveryDays ? `Everyone who owes is reminded every ${data.autoEveryDays} days at 8:00, in the portal and by email.` : 'Off. Turn on to remind everyone who owes on a schedule (portal and email).'}</div>
          </div>
          {bursar && (
            <select className="fe-select" value={data.autoEveryDays} onChange={e => auto(Number(e.target.value))} aria-label="Automatic reminders">
              {[0, 7, 14, 30].map(d => <option key={d} value={d}>{d ? `Every ${d} days` : 'Off'}</option>)}
            </select>
          )}
        </div>
      )}

      {data && <Totals items={[{ label: 'Sends', value: String(data.history.length) },
        { label: 'Last sent', value: data.history[0] ? formatDate(data.history[0].sentAt) : '—' }]} />}
      <div style={{ marginTop: 14 }}>
        <Section title="Sent" empty="No reminders sent yet." count={data?.history.length ?? 0}>
          {(data?.history ?? []).map(h => (
            <li key={h.batch} className="bl-row">
              <div className="bl-main"><div className="fe-strong">{h.students} {tx('student')}(s) <span className="fe-muted fe-small">· {formatDate(h.sentAt, true)}</span></div>
                <div className="fe-muted fe-small">{h.automatic ? 'Automatic' : `By ${h.sentBy}`} · portal{h.email ? ', email' : ''}{h.sms ? ', SMS' : ''}</div></div>
              <div className="bl-amt fe-strong">{formatMoney(h.total, cur)}</div>
            </li>
          ))}
        </Section>
      </div>
    </div>
  );
}
