import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, BarChart3, Loader2, Table2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getAnalyticsOverview, saGetDepartments } from '../../api/endpoints';
import { tx } from '../../utils/terms';

/* Chart tokens — single-series charts use categorical slot 1; text never wears the series color. */
const SERIES = '#2a78d6';
const GRID = '#eef0f4';
const AXIS = '#64748b';
const INK = '#1e293b';
const MUTED = '#94a3b8';
const SURFACE = '#ffffff';

const pct = (v: number | null | undefined) => (v == null ? '—' : `${v}%`);
const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString());

/* ── Small building blocks ──────────────────────────────────────────── */

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="an-tile">
      <div className="an-tile-label">{label}</div>
      <div className="an-tile-value">{value}</div>
      {sub && <div className="an-tile-sub">{sub}</div>}
    </div>
  );
}

/** Card holding a chart, with a toggle to the same data as a table (accessibility / exact values). */
function ChartCard({ title, subtitle, chart, table, empty }: {
  title: string; subtitle?: string; chart: ReactNode; table: ReactNode; empty?: boolean;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="an-card">
      <header className="an-card-head">
        <div>
          <h2 className="an-card-title">{title}</h2>
          {subtitle && <p className="an-card-sub">{subtitle}</p>}
        </div>
        {!empty && (
          <button type="button" className="an-toggle" onClick={() => setAsTable(t => !t)} aria-pressed={asTable}>
            {asTable ? <BarChart3 size={13} /> : <Table2 size={13} />} {asTable ? 'Chart' : 'Table'}
          </button>
        )}
      </header>
      {empty ? <div className="an-empty">No data yet</div> : asTable ? <div className="an-scroll">{table}</div> : chart}
    </section>
  );
}

function ChartTooltip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-tip">
      <div style={{ fontWeight: 700, color: INK, marginBottom: 2 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color ?? SERIES }} />
          {p.name}: <strong style={{ color: INK }}>{format ? format(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

/** Inline meter for table cells: blue bar + the exact value as text. */
function Meter({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 6, background: '#eef0f4', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: SERIES, borderRadius: 3 }} />
      </div>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: INK, width: 46, textAlign: 'right' }}>{pct(value)}</span>
    </div>
  );
}

const axisProps = { tick: { fill: AXIS, fontSize: 12 }, tickLine: false, axisLine: { stroke: GRID } };

/* ── Page ───────────────────────────────────────────────────────────── */

export default function Analytics() {
  const { user } = useAuth() as any;
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptId, setDeptId] = useState<number | ''>('');

  useEffect(() => {
    if (isSuper) saGetDepartments().then((d: any) => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isSuper]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', deptId],
    queryFn: () => getAnalyticsOverview(deptId),
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={28} color="#5156be" className="an-spin" /><style>{`.an-spin{animation:an-spin 1s linear infinite}@keyframes an-spin{to{transform:rotate(360deg)}}`}</style></div>;
  }
  if (isError || !data) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: MUTED }}>
        <AlertTriangle size={28} color="#e34948" style={{ marginBottom: 8 }} />
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Could not load analytics.</div>
        <button type="button" onClick={() => refetch()} style={{ height: 38, padding: '0 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
      </div>
    );
  }

  const t = data.totals;
  const passMark: number = data.passMark;
  const trend: any[] = data.monthlyTrend ?? [];
  const grades: any[] = data.gradeDistribution ?? [];
  const programs: any[] = data.programPerformance ?? [];
  const courses: any[] = data.coursePerformance ?? [];
  const lecturers: any[] = data.lecturerPerformance ?? [];
  const atRisk: any[] = data.atRiskStudents ?? [];
  const sheets: any[] = data.sheetStatus ?? [];
  const hasGrades = grades.some(g => g.count > 0);
  const hasTrend = trend.some(m => m.attempts > 0);

  return (
    <div className="an" style={{ paddingBottom: 40 }}>
      <PageHeader title="Analytics" breadcrumbs={[isSuper ? 'Super Admin' : 'Admin', 'Analytics']} />

      {/* Filter row */}
      <div className="an-filterbar">
        <span className="an-scope">
          Showing <strong style={{ color: INK }}>{data.scope?.departmentName}</strong> · pass mark {passMark}%
        </span>
        {isSuper && (
          <select aria-label="Department" className="an-select" value={deptId} onChange={e => setDeptId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">All departments</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {/* Headline numbers */}
      <div className="an-tiles">
        <StatTile label={tx("Students")} value={num(t.students)} />
        <StatTile label={tx("Lecturers")} value={num(t.lecturers)} />
        <StatTile label={tx("Courses")} value={num(t.courses)} />
        <StatTile label="Quizzes" value={num(t.quizzes)} sub={`${num(t.liveQuizzes)} live`} />
        <StatTile label="Quiz attempts" value={num(t.attempts)} />
        <StatTile label="Average score" value={t.attempts ? pct(t.averageScore) : '—'} />
        <StatTile label="Pass rate" value={t.attempts ? pct(t.passRate) : '—'} sub={`score ≥ ${passMark}%`} />
      </div>

      {/* Marks sheet pipeline */}
      <section className="an-card" style={{ marginBottom: 16 }}>
        <header className="an-card-head"><h2 className="an-card-title">Marks sheets by stage</h2></header>
        <div className="an-pipeline">
          {sheets.map((s, i) => (
            <div key={s.label} className="an-stage">
              <div className="an-stage-count">{s.count}</div>
              <div className="an-stage-label">{s.label.charAt(0) + s.label.slice(1).toLowerCase()}</div>
              {i < sheets.length - 1 && <span className="an-stage-arrow" aria-hidden>→</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="an-grid">
        <ChartCard
          title="Quiz attempts per month" subtitle="Last 6 months" empty={!hasTrend}
          chart={
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(42,120,214,0.08)' }} content={<ChartTooltip />} />
                <Bar dataKey="attempts" name="Attempts" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          }
          table={<SimpleTable head={['Month', 'Attempts', 'Average', 'Pass rate']} rows={trend.map(m => [m.month, num(m.attempts), pct(m.averageScore), pct(m.passRate)])} />}
        />

        <ChartCard
          title="Pass rate per month" subtitle={`Share of attempts scoring ≥ ${passMark}%`} empty={!hasTrend}
          chart={
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis domain={[0, 100]} unit="%" {...axisProps} axisLine={false} />
                <ReferenceLine y={passMark} stroke={MUTED} strokeDasharray="4 4" />
                <Tooltip cursor={{ stroke: MUTED, strokeWidth: 1 }} content={<ChartTooltip format={pct} />} />
                <Line type="monotone" dataKey="passRate" name="Pass rate" stroke={SERIES} strokeWidth={2} connectNulls
                  dot={{ r: 4, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }} activeDot={{ r: 6, stroke: SURFACE, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          }
          table={<SimpleTable head={['Month', 'Pass rate']} rows={trend.map(m => [m.month, pct(m.passRate)])} />}
        />

        <ChartCard
          title="Official grade distribution" subtitle="Approved and published marks sheets" empty={!hasGrades}
          chart={
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={grades} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(42,120,214,0.08)' }} content={<ChartTooltip />} />
                <Bar dataKey="count" name="Students" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          }
          table={<SimpleTable head={['Grade', 'Count']} rows={grades.map(g => [g.label, num(g.count)])} />}
        />

        <ChartCard
          title={tx("Pass rate by program")} subtitle={tx("Quiz attempts by students in each program")} empty={programs.length === 0}
          chart={
            <ResponsiveContainer width="100%" height={Math.max(160, programs.length * 36 + 40)}>
              <BarChart data={programs} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" domain={[0, 100]} unit="%" {...axisProps} />
                <YAxis type="category" dataKey="code" width={70} {...axisProps} axisLine={false} />
                <ReferenceLine x={passMark} stroke={MUTED} strokeDasharray="4 4" />
                <Tooltip cursor={{ fill: 'rgba(42,120,214,0.08)' }}
                  content={({ active, payload }: any) => active && payload?.length ? (
                    <div className="an-tip">
                      <div style={{ fontWeight: 700, color: INK }}>{payload[0].payload.name}</div>
                      <div style={{ color: '#475569' }}>Pass rate: <strong style={{ color: INK }}>{pct(payload[0].value)}</strong></div>
                      <div style={{ color: '#475569' }}>{num(payload[0].payload.students)} {tx("students · ")}{num(payload[0].payload.attempts)} attempts</div>
                    </div>
                  ) : null} />
                <Bar dataKey="passRate" name="Pass rate" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          }
          table={<SimpleTable head={[tx('Program'), tx('Students'), 'Attempts', 'Average', 'Pass rate']}
            rows={programs.map(p => [p.name, num(p.students), num(p.attempts), pct(p.averageScore), pct(p.passRate)])} />}
        />
      </div>

      {/* Ranked tables */}
      <section className="an-card" style={{ marginTop: 16 }}>
        <header className="an-card-head">
          <div>
            <h2 className="an-card-title">{tx("Courses needing attention")}</h2>
            <p className="an-card-sub">Lowest quiz pass rate first</p>
          </div>
        </header>
        {courses.length === 0 ? <div className="an-empty">No quiz attempts yet</div> : (
          <div className="an-scroll">
            <table className="an-table stack">
              <thead><tr><th>{tx("Course")}</th><th>{tx("Lecturer")}</th><th className="r">Attempts</th><th className="r">Average</th><th>Pass rate</th></tr></thead>
              <tbody>
                {courses.slice(0, 15).map(c => (
                  <tr key={c.courseId}>
                    <td className="t"><strong style={{ color: INK }}>{c.courseCode}</strong> <span style={{ color: '#64748b' }}>{c.title}</span></td>
                    <td className="full" data-label={tx('Lecturer')} style={{ color: '#475569' }}>{c.lecturer ?? '—'}</td>
                    <td className="r" data-label="Attempts">{num(c.attempts)}</td>
                    <td className="r" data-label="Average">{pct(c.averageScore)}</td>
                    <td className="full" data-label="Pass rate"><Meter value={c.passRate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="an-grid" style={{ marginTop: 16 }}>
        <section className="an-card">
          <header className="an-card-head">
            <div>
              <h2 className="an-card-title">{tx("Lecturer results")}</h2>
              <p className="an-card-sub">{tx("Quiz outcomes in each lecturer's courses")}</p>
            </div>
          </header>
          {lecturers.length === 0 ? <div className="an-empty">No data yet</div> : (
            <div className="an-scroll">
              <table className="an-table stack">
                <thead><tr><th>{tx("Lecturer")}</th><th className="r">{tx("Courses")}</th><th className="r">Attempts</th><th>Pass rate</th></tr></thead>
                <tbody>
                  {lecturers.map(l => (
                    <tr key={l.lecturerId}>
                      <td className="t" style={{ fontWeight: 600, color: INK }}>{l.name}</td>
                      <td className="r" data-label={tx('Courses')}>{num(l.courses)}</td>
                      <td className="r" data-label="Attempts">{num(l.attempts)}</td>
                      <td className="full" data-label="Pass rate"><Meter value={l.passRate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="an-card">
          <header className="an-card-head">
            <div>
              <h2 className="an-card-title">{tx("At-risk students")}</h2>
              <p className="an-card-sub">{tx("2+ failed courses, or quiz average below ")}{passMark}% over 3+ attempts</p>
            </div>
            {atRisk.length > 0 && <span className="an-risk-count"><AlertTriangle size={13} /> {atRisk.length}</span>}
          </header>
          {atRisk.length === 0 ? <div className="an-empty">{tx("No students flagged")}</div> : (
            <div className="an-scroll" style={{ maxHeight: 420 }}>
              <table className="an-table stack">
                <thead><tr><th>{tx("Student")}</th><th>{tx("Program")}</th><th>Why flagged</th></tr></thead>
                <tbody>
                  {atRisk.map(s => (
                    <tr key={s.studentId}>
                      <td className="t">
                        <div style={{ fontWeight: 600, color: INK }}>{s.name}</div>
                        {s.level && <div style={{ fontSize: 11, color: MUTED }}>{tx("Level ")}{s.level}</div>}
                      </td>
                      <td className="full" data-label={tx('Program')} style={{ color: '#475569' }}>{s.program ?? '—'}</td>
                      <td className="full" data-label="Why flagged">
                        {s.reasons.map((r: string) => (
                          <span key={r} className="an-reason"><AlertTriangle size={11} /> {r}</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .an { container: an / inline-size; }
        .an-scope { font-size: 13px; color: #475569; min-width: 0; }
        .an-scroll { overflow-x: auto; overscroll-behavior-x: contain; }
        .an-filterbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; padding: 10px 14px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; }
        .an-select { height: 36px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; padding: 0 10px; background: #f8fafc; color: ${INK}; min-width: 200px; }
        .an-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .an-tile { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
        .an-tile-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .an-tile-value { font-size: 26px; font-weight: 800; color: ${INK}; margin-top: 4px; font-variant-numeric: tabular-nums; }
        .an-tile-sub { font-size: 11.5px; color: ${MUTED}; margin-top: 2px; }
        .an-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .an-card { container: an-card / inline-size; min-width: 0; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.05); padding-bottom: 8px; }
        .an-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px 16px 8px; }
        .an-card-title { margin: 0; font-size: 14.5px; font-weight: 800; color: ${INK}; }
        .an-card-sub { margin: 2px 0 0; font-size: 12px; color: #64748b; }
        .an-toggle:hover { background: #f8fafc; border-color: #cbd5e1; }
        .an-toggle { display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 10px; border-radius: 7px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; flex-shrink: 0; }
        .an-empty { padding: 36px 16px; text-align: center; color: ${MUTED}; font-size: 13px; }
        .an-tip { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 12px; box-shadow: 0 6px 18px rgba(15,23,42,0.12); }
        .an-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .an-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; padding: 8px 16px; border-bottom: 1px solid #eef0f4; white-space: nowrap; }
        .an-table td { padding: 9px 16px; border-bottom: 1px solid #f4f5f8; color: #334155; }
        .an-table .r { text-align: right; font-variant-numeric: tabular-nums; }
        .an-pipeline { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 16px 10px; }
        .an-stage { position: relative; flex: 1 1 110px; background: #f8fafc; border: 1px solid #eef0f4; border-radius: 10px; padding: 10px 12px; }
        .an-stage-count { font-size: 22px; font-weight: 800; color: ${INK}; font-variant-numeric: tabular-nums; }
        .an-stage-label { font-size: 12px; color: #64748b; font-weight: 600; }
        .an-stage-arrow { position: absolute; right: -8px; top: 50%; transform: translateY(-50%); color: ${MUTED}; font-size: 12px; }
        .an-reason { display: inline-flex; align-items: center; gap: 4px; margin: 2px 6px 2px 0; padding: 2px 8px; border-radius: 6px; background: #fdeeee; color: #9f1f1f; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
        .an-risk-count { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; background: #fdeeee; color: #9f1f1f; font-size: 12px; font-weight: 800; }
        .an-table tbody tr:hover td { background: #fafbff; }
        .an-table tbody tr:last-child td { border-bottom: none; }

        /* Sized by the content area (the desktop sidebar takes its share), not the window */
        @container an (max-width: 900px) { .an-grid { grid-template-columns: 1fr; } }
        @container an (max-width: 600px) {
          .an-stage-arrow { display: none; }
          .an-select { min-width: 0; width: 100%; }
          .an-filterbar { padding: 10px 12px; }
          .an-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .an-tile { padding: 12px 14px; }
          .an-tile-value { font-size: 22px; }
          .an-stage { flex: 1 1 calc(50% - 4px); }
        }
        /* Tables become stacked rows once their card is narrow */
        @container an-card (max-width: 520px) {
          .an-table.stack thead { display: none; }
          .an-table.stack, .an-table.stack tbody { display: block; }
          .an-table.stack tr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 12px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
          .an-table.stack tr:last-child { border-bottom: none; }
          .an-table.stack td { display: block; padding: 0; border: none; min-width: 0; text-align: left; background: none !important; }
          .an-table.stack td.t, .an-table.stack td.full { grid-column: 1 / -1; }
          .an-table.stack td.t { overflow-wrap: anywhere; }
          .an-table.stack td[data-label]::before { content: attr(data-label); display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: ${MUTED}; margin-bottom: 2px; }
          .an-reason { white-space: normal; }
        }
        @media (max-width: 640px) { .an-select { font-size: 16px; } }
        @media (pointer: coarse) { .an-toggle { height: 36px; padding: 0 12px; } .an-select { height: 44px; } }
      `}</style>
    </div>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="an-table stack">
      <thead><tr>{head.map((h, i) => <th key={h} className={i ? 'r' : ''}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'r' : 't'} data-label={j ? head[j] : undefined}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}
