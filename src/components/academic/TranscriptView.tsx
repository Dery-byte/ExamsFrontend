import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

const fmtSem = (n: number) => (n === 1 ? 'First Semester' : n === 2 ? 'Second Semester' : `Semester ${n}`);

/** Renders a transcript returned by /api/academic/…/transcript. */
export default function TranscriptView({ t }: { t: any }) {
  const semesters: any[] = t.semesters ?? [];
  const outstanding: any[] = t.outstanding ?? [];

  return (
    <div>
      <div className="tv-tiles">
        <div className="tv-tile">
          <div className="tv-l">CGPA</div>
          <div className="tv-v">{t.cgpa ?? '—'}<span className="tv-max">{t.cgpa != null ? ` / ${t.maxGradePoint}` : ''}</span></div>
        </div>
        <div className="tv-tile"><div className="tv-l">Class (current standing)</div><div className="tv-v" style={{ fontSize: 15 }}>{t.degreeClass ?? '—'}</div></div>
        <div className="tv-tile"><div className="tv-l">Credits earned / attempted</div><div className="tv-v">{t.creditsEarned} <span className="tv-max">/ {t.totalCreditUnits}</span></div></div>
        <div className="tv-tile">
          <div className="tv-l">Outstanding courses</div>
          <div className="tv-v" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {outstanding.length}
            {outstanding.length === 0 ? <CheckCircle2 size={16} color="#0b7a0b" aria-label="None" /> : <AlertTriangle size={16} color="#b42323" aria-label="Carry-overs" />}
          </div>
        </div>
      </div>

      {t.includesApproved && (
        <p className="tv-note">Staff view: includes approved results that aren't published to the student yet.</p>
      )}

      {outstanding.length > 0 && (
        <div className="tv-owing" role="status">
          <strong><AlertTriangle size={14} /> Carry-overs to retake</strong>
          <ul>
            {outstanding.map(o => (
              <li key={o.courseId}><b>{o.courseCode}</b> {o.courseTitle} · {o.creditUnits} CU · last grade {o.lastGrade}{o.lastSession ? ` (${o.lastSession})` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {semesters.length === 0 ? (
        <div className="tv-empty">No results yet.</div>
      ) : semesters.map((s, i) => (
        <section key={i} className="tv-sem">
          <h3>{s.session ?? 'Session'} · Level {s.level} · {fmtSem(s.semester)}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="tv-table">
              <thead><tr><th>Code</th><th>Course</th><th className="r">CU</th><th className="r">Score</th><th className="r">Grade</th><th className="r">GP</th></tr></thead>
              <tbody>
                {s.courses.map((c: any, j: number) => (
                  <tr key={j}>
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>{c.courseCode}</td>
                    <td>
                      {c.courseTitle}
                      {c.attempt > 1 && <span className="tv-resit"><RotateCcw size={10} /> resit</span>}
                    </td>
                    <td className="r">{c.creditUnits}</td>
                    <td className="r">{c.score ?? '—'}</td>
                    <td className="r" style={{ fontWeight: 800, color: c.passed ? '#1e293b' : '#b42323' }}>{c.grade}{!c.passed && ' ✕'}</td>
                    <td className="r">{c.gradePoint}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Semester GPA <b>{s.gpa ?? '—'}</b> · CGPA <b>{s.cgpa ?? '—'}</b></td>
                  <td className="r"><b>{s.creditUnits}</b></td>
                  <td colSpan={3} className="r" style={{ color: '#64748b' }}>{s.creditPoints} credit points</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ))}

      <p className="tv-note">GPA = total (credit units × grade point) ÷ total credit units. Every attempt at a course counts towards the CGPA.</p>

      <style>{`
        .tv-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 14px; }
        .tv-tile { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
        .tv-l { font-size: 12px; font-weight: 600; color: #64748b; }
        .tv-v { font-size: 24px; font-weight: 800; color: #1e293b; margin-top: 2px; font-variant-numeric: tabular-nums; }
        .tv-max { font-size: 13px; color: #94a3b8; font-weight: 600; }
        .tv-note { font-size: 12px; color: #64748b; margin: 8px 0 12px; }
        .tv-owing { background: #fdeeee; border: 1px solid #f7d4d4; border-radius: 10px; padding: 10px 14px; color: #7a1c1c; font-size: 13px; margin-bottom: 14px; }
        .tv-owing strong { display: flex; align-items: center; gap: 6px; }
        .tv-owing ul { margin: 6px 0 0; padding-left: 20px; }
        .tv-sem { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
        .tv-sem h3 { margin: 0; padding: 10px 14px; font-size: 13.5px; font-weight: 800; color: #1e293b; background: #f8fafc; border-bottom: 1px solid #eef0f4; }
        .tv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .tv-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; padding: 8px 12px; border-bottom: 1px solid #eef0f4; }
        .tv-table td { padding: 8px 12px; border-bottom: 1px solid #f4f5f8; color: #334155; }
        .tv-table .r { text-align: right; font-variant-numeric: tabular-nums; }
        .tv-table tfoot td { background: #fafbff; border-bottom: none; font-size: 12.5px; }
        .tv-resit { display: inline-flex; align-items: center; gap: 3px; margin-left: 6px; font-size: 10.5px; font-weight: 700; color: #8a5a00; background: #fff7e6; padding: 1px 6px; border-radius: 5px; }
        .tv-empty { padding: 36px; text-align: center; color: #94a3b8; background: #fff; border: 1.5px dashed #e2e8f0; border-radius: 12px; }
      `}</style>
    </div>
  );
}
