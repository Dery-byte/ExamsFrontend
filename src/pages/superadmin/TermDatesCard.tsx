import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarDays, Loader2, Save } from 'lucide-react';
import { getTermDates, saveTermDates, errMsg } from '../../api/materials';
import { periodsPerLevel, tx } from '../../utils/terms';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

/**
 * Super Admin, Academic Settings: when each semester (term) of the current session starts and how
 * many weeks it has, so course notes and assignments show real week dates.
 */
export default function TermDatesCard() {
  const qc = useQueryClient();
  const materialsOn = useFeatureFlags().materials === true;   // only course materials use the weeks
  const q = useQuery({ queryKey: ['term-dates'], queryFn: getTermDates, enabled: materialsOn });
  const [rows, setRows] = useState<Record<number, { start: string; weeks: string }>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const count = periodsPerLevel();

  useEffect(() => {
    if (!q.data) return;
    const r: Record<number, { start: string; weeks: string }> = {};
    q.data.terms.forEach(t => { r[t.semester] = { start: t.startDate ?? '', weeks: String(t.weeks ?? 14) }; });
    setRows(r);
  }, [q.data]);

  const save = async (n: number) => {
    const row = rows[n];
    const weeks = Number(row?.weeks);
    if (row?.start && (!Number.isInteger(weeks) || weeks < 1 || weeks > 30)) { toast.error('Choose 1 to 30 weeks'); return; }
    setBusy(n);
    try {
      const d = await saveTermDates(n, row?.start || null, weeks || 14);
      qc.setQueryData(['term-dates'], d);
      toast.success(row?.start ? tx(`Semester ${n} dates saved`) : tx(`Semester ${n} dates cleared`));
    } catch (e) { toast.error(errMsg(e, 'Could not save')); } finally { setBusy(null); }
  };

  const endOf = (start: string, weeks: string) => {
    if (!start || !Number(weeks)) return '—';
    const d = new Date(start + 'T00:00');
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + Number(weeks) * 7 - 1);   // Monday of week 1, then n weeks on
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!materialsOn) return null;
  return (
    <section className="as-card">
      <div className="as-head">
        <CalendarDays size={18} color="var(--brand-text)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div><h2>{tx('Term dates')}{q.data ? ` · ${q.data.sessionName}` : ''}</h2>
          <p>{tx('When each semester starts and how many teaching weeks it has. Course notes and assignments then show real week dates, and lecturers can release a week automatically.')}</p></div>
      </div>
      <div className="as-body">
        {q.isLoading ? <div className="as-loading"><Loader2 size={20} className="as-spin" color="var(--brand-text)" /></div>
          : q.isError ? <p className="as-note as-warn">{errMsg(q.error, "Couldn't load the term dates.")}</p>
          : (
            <div style={{ display: 'grid', gap: 12 }}>
              {Array.from({ length: count }, (_, i) => i + 1).map(n => {
                const row = rows[n] ?? { start: '', weeks: '14' };
                return (
                  <div key={n} className="as-new-session" style={{ paddingTop: n === 1 ? 0 : 12, borderTop: n === 1 ? 'none' : undefined }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', alignSelf: 'center' }}>{tx(`Semester ${n}`)}</div>
                    <div><label className="as-label" htmlFor={`td-start-${n}`}>Week 1 starts</label>
                      <input id={`td-start-${n}`} type="date" className="as-input" value={row.start}
                        onChange={e => setRows(r => ({ ...r, [n]: { ...row, start: e.target.value } }))} /></div>
                    <div><label className="as-label" htmlFor={`td-weeks-${n}`}>Weeks</label>
                      <input id={`td-weeks-${n}`} type="number" min={1} max={30} inputMode="numeric" className="as-input" value={row.weeks}
                        onChange={e => setRows(r => ({ ...r, [n]: { ...row, weeks: e.target.value } }))} /></div>
                    <div><span className="as-label">Ends</span><div style={{ height: 36, display: 'flex', alignItems: 'center', fontSize: 13, color: '#64748b' }}>{endOf(row.start, row.weeks)}</div></div>
                    <button type="button" className="as-btn" onClick={() => save(n)} disabled={busy !== null}>
                      {busy === n ? <Loader2 size={14} className="as-spin" /> : <Save size={14} />} Save
                    </button>
                  </div>
                );
              })}
              <p className="as-note" style={{ margin: 0 }}>{tx('Clear the date and save to remove a semester’s dates. A lecturer can still set their own week 1 for a course.')}</p>
            </div>
          )}
      </div>
    </section>
  );
}
