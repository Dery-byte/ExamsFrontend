import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  Building2, BookMarked, Users, GraduationCap, ChevronRight, Wallet, FileBarChart, UserCheck, DatabaseZap,
  UserCog, Library, CalendarRange, AlertCircle, RefreshCw,
} from 'lucide-react';
import { saGetOverview, type SaOverview } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useInstitution } from '../../hooks/useInstitution';
import { useAssessments } from '../../hooks/useFeatureFlags';
import AvatarPhoto from '../../components/common/AvatarPhoto';
import { tx, isSchoolMode } from '../../utils/terms';
import { useThemeColors, supportColors, readableOn, hexAlpha } from '../../utils/theme';

type SeriesKey = 'submissions' | 'checkIns' | 'payments';

const fmt = (n: number | undefined) => (n == null ? '—' : n.toLocaleString());
const weekLabel = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function SuperAdminWelcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { institution } = useInstitution();
  const quizzesOn = useAssessments();
  const colors = useThemeColors();
  const { data, isLoading, isError, refetch, isFetching } = useQuery<SaOverview>({
    queryKey: ['sa-overview'], queryFn: saGetOverview, staleTime: 2 * 60_000,
  });
  const c = data?.counts;
  // Supporting colours chosen away from the developer's brand and accent: [tile, tile, line, line, card]
  const [s1, s2, s3, s4, s5] = useMemo(() => supportColors([colors.brand, colors.accent], 5), [colors.brand, colors.accent]);
  const tileVars = (bg: string) => ({ '--tile-bg': bg, '--tile-fg': readableOn(bg), '--tile-shadow': hexAlpha(bg, 0.5) }) as CSSProperties;

  const tiles = [
    { cls: 't-brand', style: undefined, label: tx('Departments'), value: c?.departments, icon: <Building2 size={28} />, to: '/super-admin/departments' },
    { cls: 't-accent', style: undefined, label: tx('Programs'), value: c?.programs, icon: <BookMarked size={28} />, to: '/super-admin/programs' },
    { cls: '', style: tileVars(s1), label: 'Teaching staff', value: c ? c.hods + c.lecturers : undefined, icon: <Users size={28} />, to: '/super-admin/lecturers' },
    { cls: '', style: tileVars(s2), label: tx('Students'), value: c?.students, icon: <GraduationCap size={28} />, to: '/super-admin/students' },
  ];

  const series: { key: SeriesKey; label: string; color: string }[] = [
    ...(quizzesOn ? [{ key: 'submissions' as const, label: 'Quiz submissions', color: colors.brand }] : []),
    { key: 'checkIns', label: 'Class check-ins', color: s3 },
    { key: 'payments', label: 'Fee payments', color: s4 },
  ];
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());
  const toggle = (k: SeriesKey) => setHidden(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const chartData = useMemo(() => (data?.weeks ?? []).map(w => ({ ...w, label: weekLabel(w.weekStart) })), [data]);
  const visible = series.filter(s => !hidden.has(s.key));
  const thisWeek = data?.weeks[data.weeks.length - 1];

  const actions = [
    { label: tx('Create Department'), sub: isSchoolMode() ? 'Add a section, e.g. Primary School' : 'Add a faculty or school', icon: <Building2 size={18} />, to: '/super-admin/departments' },
    { label: tx('Register HOD'), sub: tx('Create Head of Department account'), icon: <UserCog size={18} />, to: '/super-admin/hods' },
    { label: tx('Set Semester'), sub: tx('Update student level & semester'), icon: <GraduationCap size={18} />, to: '/super-admin/student-semester' },
    { label: 'Sessions & grading', sub: 'Academic year, terms and grade scale', icon: <CalendarRange size={18} />, to: '/super-admin/academic-settings' },
  ];

  const shortcuts = [
    { title: 'Fees & Payments', org: 'Finance', text: 'Set fees per term, follow collections and payments as they come in.', icon: <Wallet size={22} />, tone: 'brand', to: '/super-admin/fees', tag: 'Finance' },
    { title: 'Reports', org: 'Academic performance', text: 'Institution-wide reports you can filter, print and export to Excel.', icon: <FileBarChart size={22} />, tone: 'accent', to: '/super-admin/reports', tag: 'Reports' },
    { title: 'Class Attendance', org: 'Academic registry', text: 'Sessions, check-ins, classrooms and attendance rules for every course.', icon: <UserCheck size={22} />, tone: s1, to: '/super-admin/attendance', tag: 'Registry' },
    { title: tx('Courses'), org: 'Academic registry', text: `${fmt(c?.courses)} ${tx('courses').toLowerCase()} across all ${tx('departments').toLowerCase()}.`, icon: <Library size={22} />, tone: s2, to: '/super-admin/courses', tag: 'Registry' },
    { title: 'Data Tools', org: 'User management', text: 'Import students and staff from Excel, reset passwords in bulk.', icon: <DatabaseZap size={22} />, tone: s5, to: '/super-admin/data-tools', tag: 'Users' },
  ];

  const name = [user?.firstname, user?.lastname].filter(Boolean).join(' ') || 'Super Admin';

  return (
    <div className="ov">
      {isError && (
        <div className="ov-alert" role="alert">
          <AlertCircle size={18} />
          <span>Couldn't load the overview numbers.</span>
          <button type="button" className="sa-btn sm soft" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'ov-spin' : undefined} /> Try again
          </button>
        </div>
      )}

      <section className="sa-tiles" aria-label="Key numbers">
        {tiles.map(t => (
          <button key={t.label} type="button" className={`sa-tile ${t.cls}`} style={t.style} onClick={() => navigate(t.to)}>
            <span className="sa-tile-ico">{t.icon}</span>
            <span className="sa-tile-body">
              <span className="sa-tile-label" style={{ display: 'block' }}>{t.label}</span>
              <span className="sa-tile-value" style={{ display: 'block' }}>
                {isLoading ? <span className="sa-tile-skel" /> : fmt(t.value)}
              </span>
            </span>
          </button>
        ))}
      </section>

      <div className="ov-row">
        {/* Profile + quick actions */}
        <section className="sa-card ov-me">
          <div className="ov-me-top">
            <div className="ov-ring">
              <svg viewBox="0 0 120 120" aria-hidden>
                <circle cx="60" cy="60" r="55" fill="none" stroke="var(--brand-soft)" strokeWidth="6" />
                <circle cx="60" cy="60" r="55" fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 55 * 0.72} ${2 * Math.PI * 55}`} transform="rotate(-210 60 60)" />
              </svg>
              <span className="ov-ring-photo"><AvatarPhoto src={user?.profilePicture}>{name.charAt(0).toUpperCase()}</AvatarPhoto></span>
            </div>
            <h2 className="ov-me-name">{name}</h2>
            <p className="ov-me-role">Super Administrator</p>
            <p className="ov-me-inst" title={institution.name}>{institution.name}</p>
          </div>
          <div className="ov-mini">
            <div><b>{isLoading ? '…' : fmt(c?.hods)}</b><span>{tx('HODs')}</span></div>
            <div><b>{isLoading ? '…' : fmt(c?.lecturers)}</b><span>Lecturers</span></div>
            <div><b>{isLoading ? '…' : fmt(c?.courses)}</b><span>{tx('Courses')}</span></div>
          </div>
          <div className="ov-actions">
            <h3>Quick actions</h3>
            {actions.map(a => (
              <button key={a.label} type="button" className="ov-action" onClick={() => navigate(a.to)}>
                <span className="ov-action-ico">{a.icon}</span>
                <span className="ov-action-text"><b>{a.label}</b><small>{a.sub}</small></span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </section>

        {/* Activity chart */}
        <section className="sa-card ov-chart">
          <div className="ov-chart-head">
            <div>
              <h2 className="sa-card-title">Activity</h2>
              <p className="sa-card-sub">Last 10 weeks, Monday to Sunday</p>
            </div>
            <div className="ov-toggles">
              {series.map(s => (
                <label key={s.key} className="ov-toggle">
                  <span>{s.label}</span>
                  <button type="button" role="switch" aria-checked={!hidden.has(s.key)} aria-label={`Show ${s.label}`}
                    className={`sa-switch${hidden.has(s.key) ? '' : ' on'}`} onClick={() => toggle(s.key)}
                    style={{ ['--sw' as string]: s.color }} />
                </label>
              ))}
            </div>
          </div>

          {thisWeek && (
            <div className="ov-week">
              {series.map(s => (
                <div key={s.key} className="ov-week-item">
                  <span className="ov-dot" style={{ background: s.color }} />
                  <b>{fmt(thisWeek[s.key])}</b>
                  <small>{s.label} this week</small>
                </div>
              ))}
            </div>
          )}

          <div className="ov-chart-box">
            {isLoading ? <div className="ov-chart-skel" /> : chartData.length === 0 ? (
              <div className="ov-empty">No activity to show yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#eceef4" vertical horizontal={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#8a8fa3' }} dy={8} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#8a8fa3' }} width={48} />
                  <Tooltip content={<ChartTip series={series} />} cursor={{ stroke: '#c9cdda', strokeDasharray: '4 4' }} />
                  {visible.map(s => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={3.5}
                      dot={false} activeDot={{ r: 7, strokeWidth: 3, stroke: '#fff', fill: s.color }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="ov-legend">
            {series.map(s => (
              <span key={s.key} className={hidden.has(s.key) ? 'off' : undefined}>
                <span className="ov-dot" style={{ background: s.color }} />{s.label}
              </span>
            ))}
          </div>
        </section>
      </div>

      <h2 className="ov-h2">Shortcuts</h2>
      <section className="ov-cards">
        {shortcuts.map(s => (
          <button key={s.title} type="button" className="sa-card ov-short" onClick={() => navigate(s.to)}>
            <span className="ov-short-top">
              <span style={{ minWidth: 0 }}>
                <small>{s.org}</small>
                <b>{s.title}</b>
              </span>
              <span className={`ov-short-ico${s.tone.startsWith('#') ? '' : ` tone-${s.tone}`}`} style={s.tone.startsWith('#') ? { background: s.tone, color: readableOn(s.tone) } : undefined}>{s.icon}</span>
            </span>
            <span className="ov-short-text">{s.text}</span>
            <span className="ov-short-foot">
              <span className="ov-tag">{s.tag}</span>
              <span className="ov-open">Open <ChevronRight size={15} /></span>
            </span>
          </button>
        ))}
      </section>

      <style>{OVERVIEW_CSS}</style>
    </div>
  );
}

function ChartTip({ active, payload, label, series }: {
  active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string;
  series: { key: SeriesKey; label: string; color: string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ov-tip">
      <div className="ov-tip-date">Week of {label}</div>
      <div className="ov-tip-vals">
        {payload.map(p => {
          const s = series.find(x => x.key === p.dataKey);
          if (!s) return null;
          return (
            <div key={s.key}>
              <div className="ov-tip-num"><span className="ov-tip-pill" style={{ background: s.color }} />{p.value.toLocaleString()}</div>
              <div className="ov-tip-lbl">{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const OVERVIEW_CSS = `
.ov { font-family: var(--sa-font); }
.ov-alert { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fef2f2; color: #b91c1c; border-radius: 16px; padding: 12px 16px; margin-bottom: 18px; font-size: 13.5px; font-weight: 500; }
.ov-alert span { flex: 1; min-width: 160px; }
.ov-spin { animation: ov-spin 1s linear infinite; }
@keyframes ov-spin { to { transform: rotate(360deg); } }

.ov-row { display: grid; grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); gap: 24px; margin-bottom: 32px; align-items: start; }

.ov-me { overflow: hidden; }
.ov-me-top { padding: 30px 24px 18px; text-align: center; }
.ov-ring { position: relative; width: 132px; height: 132px; margin: 0 auto 16px; }
.ov-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.ov-ring-photo { position: absolute; inset: 14px; border-radius: 50%; overflow: hidden; background: var(--brand-soft); color: var(--brand-text); display: flex; align-items: center; justify-content: center; font-size: 38px; font-weight: 700; }
.ov-me-name { margin: 0; font-size: 19px; font-weight: 600; color: var(--sx-ink); overflow-wrap: anywhere; }
.ov-me-role { margin: 4px 0 0; font-size: 13.5px; color: var(--sx-muted); }
.ov-me-inst { margin: 2px 0 0; font-size: 12px; color: var(--sx-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ov-mini { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 20px 22px; }
.ov-mini > div { border: 1px solid var(--sx-line-2); border-radius: 16px; padding: 12px 6px; text-align: center; min-width: 0; }
.ov-mini b { display: block; font-size: 19px; font-weight: 600; color: var(--sx-ink); font-variant-numeric: tabular-nums; }
.ov-mini span { display: block; font-size: 11.5px; color: var(--sx-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ov-actions { border-top: 1px solid var(--sx-line); padding: 18px 16px 14px; }
.ov-actions h3 { margin: 0 8px 10px; font-size: 16px; font-weight: 600; color: var(--sx-ink); }
.ov-action { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 8px; border: none; background: none; border-radius: 14px; cursor: pointer; text-align: left; color: var(--sx-faint); font-family: inherit; }
.ov-action:hover { background: var(--brand-soft); color: var(--brand-text); }
.ov-action-ico { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #fff; color: var(--brand-text); box-shadow: 0 4px 14px rgba(28,32,72,.08); }
.ov-action-text { flex: 1; min-width: 0; }
.ov-action-text b { display: block; font-size: 13.5px; font-weight: 600; color: var(--sx-ink); }
.ov-action-text small { display: block; font-size: 11.5px; color: var(--sx-muted); margin-top: 2px; line-height: 1.35; }

.ov-chart { padding: 24px 24px 18px; min-width: 0; }
.ov-chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ov-toggles { display: flex; gap: 22px; flex-wrap: wrap; }
.ov-toggle { display: inline-flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--sx-ink-2); cursor: pointer; }
.ov-toggle .sa-switch.on { background: color-mix(in srgb, var(--sw) 30%, white); }
.ov-toggle .sa-switch.on::after { background: var(--sw); }
.ov-week { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 20px 0 8px; }
.ov-week-item { background: var(--sx-fill); border-radius: 16px; padding: 12px 16px; display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: center; }
.ov-week-item b { font-size: 22px; font-weight: 600; color: var(--sx-ink); font-variant-numeric: tabular-nums; }
.ov-week-item small { grid-column: 1 / -1; font-size: 12px; color: var(--sx-muted); margin-top: 2px; }
.ov-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.ov-chart-box { height: 310px; margin-top: 10px; }
.ov-chart-skel { height: 100%; border-radius: 16px; background: linear-gradient(90deg, var(--sx-fill) 0%, var(--sx-fill-2) 50%, var(--sx-fill) 100%); background-size: 200% 100%; animation: ov-shimmer 1.4s linear infinite; }
@keyframes ov-shimmer { to { background-position: -200% 0; } }
.ov-empty { height: 100%; display: flex; align-items: center; justify-content: center; color: var(--sx-muted); font-size: 14px; }
.ov-legend { display: flex; justify-content: center; gap: 26px; flex-wrap: wrap; margin-top: 14px; font-size: 13px; color: var(--sx-ink-2); }
.ov-legend > span { display: inline-flex; align-items: center; gap: 9px; }
.ov-legend > span.off { opacity: .4; text-decoration: line-through; }

.ov-tip { background: #fff; border-radius: 16px; box-shadow: 0 12px 32px rgba(28,32,72,.16); padding: 12px 16px; font-family: var(--sa-font); min-width: 160px; }
.ov-tip-date { text-align: center; font-size: 12px; color: var(--sx-ink-2); margin-bottom: 8px; }
.ov-tip-vals { display: flex; gap: 22px; }
.ov-tip-num { display: flex; align-items: center; gap: 8px; font-size: 19px; font-weight: 600; color: var(--sx-ink); }
.ov-tip-pill { width: 20px; height: 10px; border-radius: 6px; }
.ov-tip-lbl { font-size: 12px; color: var(--sx-muted); margin-top: 2px; white-space: nowrap; }

.ov-h2 { margin: 0 0 16px; font-size: 20px; font-weight: 600; color: var(--sx-ink); }
.ov-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
.ov-short { display: flex; flex-direction: column; gap: 16px; padding: 24px; text-align: left; cursor: pointer; font-family: inherit; transition: transform .18s, box-shadow .18s; }
.ov-short:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(28,32,72,.1); }
.ov-short:focus-visible { outline: 3px solid var(--brand-border); outline-offset: 2px; }
.ov-short-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.ov-short-top small { display: block; font-size: 13px; color: var(--sx-muted); }
.ov-short-top b { display: block; font-size: 17px; font-weight: 600; color: var(--sx-ink); margin-top: 6px; }
.ov-short-ico { width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.tone-brand { background: var(--brand); color: var(--brand-contrast); }
.tone-accent { background: var(--accent); color: var(--accent-contrast); }
.ov-short-text { font-size: 13px; line-height: 1.6; color: var(--sx-ink-2); flex: 1; }
.ov-short-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ov-tag { display: inline-flex; align-items: center; height: 36px; padding: 0 18px; border-radius: 999px; background: var(--brand-soft); color: var(--brand-text); font-size: 13px; font-weight: 500; }
.ov-open { display: inline-flex; align-items: center; gap: 4px; font-size: 13.5px; font-weight: 600; color: var(--sx-ink); }

@media (max-width: 1199px) {
  .ov-row { grid-template-columns: 1fr; }
  .ov-me { display: grid; grid-template-columns: minmax(220px, 300px) 1fr; }
  .ov-me-top { grid-row: span 2; border-right: 1px solid var(--sx-line); display: flex; flex-direction: column; justify-content: center; }
  .ov-mini { padding: 22px 20px 6px; }
  .ov-actions { border-top: none; padding-top: 8px; }
}
@media (max-width: 767px) {
  .ov-me { display: block; }
  .ov-me-top { border-right: none; }
  .ov-mini { padding: 0 16px 18px; }
  .ov-actions { display: block; border-top: 1px solid var(--sx-line); }
  .ov-chart { padding: 18px 16px 14px; }
  .ov-chart-box { height: 250px; }
  .ov-toggles { gap: 14px; }
  .ov-cards { gap: 16px; grid-template-columns: 1fr; }
  .ov-short { padding: 18px; }
  .ov-row { gap: 16px; margin-bottom: 24px; }
}
@media (max-width: 480px) {
  .ov-week { grid-template-columns: 1fr 1fr; }
  .ov-week-item { padding: 10px 12px; }
  .ov-week-item b { font-size: 18px; }
  .ov-legend { gap: 14px; font-size: 12px; }
  .ov-ring { width: 112px; height: 112px; }
  .ov-mini b { font-size: 17px; }
}
`;
