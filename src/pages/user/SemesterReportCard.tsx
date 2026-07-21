import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import { toast } from 'react-hot-toast';
import {
  BookOpen, ChevronRight, Loader2, Download, ArrowLeft,
  Award, GraduationCap, User, FileText, Calendar, TrendingUp,
  CheckCircle, AlertCircle, Clock
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const gradeColor = (g: string | null) => {
  if (!g) return '#64748b';
  if (['A', 'A+', 'A-'].includes(g)) return '#059669';
  if (['B', 'B+', 'B-'].includes(g)) return '#2563eb';
  if (['C', 'C+', 'C-'].includes(g)) return '#d97706';
  if (g === 'F') return '#dc2626';
  return '#64748b';
};

const gradeBg = (g: string | null) => {
  if (!g) return '#f1f5f9';
  if (['A', 'A+', 'A-'].includes(g)) return '#d1fae5';
  if (['B', 'B+', 'B-'].includes(g)) return '#dbeafe';
  if (['C', 'C+', 'C-'].includes(g)) return '#fef3c7';
  if (g === 'F') return '#fee2e2';
  return '#f1f5f9';
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const SemesterReportCard = () => {
  const [allReports, setAllReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingSingle, setDownloadingSingle] = useState<number | null>(null);

  const base = client.defaults.baseURL!.replace('/v1/auth', '');

  useEffect(() => {
    client.get(`${base}/marks/sheet/my-marks/all`)
      .then(res => setAllReports(res.data))
      .catch(() => toast.error('Failed to load your reports.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${base}/marks/sheet/report-card/all/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CumulativeReportCard_${allReports[0]?.username || 'student'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Cumulative Report Card downloaded!');
    } catch (err) {
      toast.error('Failed to download cumulative report card.');
      console.error(err);
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadSingle = async (level: string, semester: number) => {
    const loaderId = semester + parseInt(level) * 1000;
    setDownloadingSingle(loaderId);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${base}/marks/sheet/report-card/level/${level}/semester/${semester}/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SemesterReportCard_Level${level}_Sem${semester}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Semester Report Card downloaded!');
    } catch (err) {
      toast.error('Failed to download semester report card.');
      console.error(err);
    } finally {
      setDownloadingSingle(null);
    }
  };

  /* Loading state */
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Loader2 size={40} color="#5156be" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Loading your academic progress…</p>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  /* No marks state */
  if (allReports.length === 0) {
    return (
      <div style={{ padding: '24px', maxWidth: 700, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '60px 32px', background: '#fff', borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <Clock size={52} color="#cbd5e1" />
          <h3 style={{ margin: '16px 0 8px', color: '#94a3b8', fontWeight: 800 }}>No Academic Records Found</h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Your semester results will appear here once published by your administrator.
          </p>
        </div>
      </div>
    );
  }

  const studentInfo = allReports[0];

  return (
    <div style={{ padding: '16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0f172a' }}>My Academic Progress</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Cumulative performance across all levels and semesters
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          disabled={downloadingAll}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 24px', border: 'none', borderRadius: 10,
            background: downloadingAll ? '#e8ecf8' : 'linear-gradient(135deg,#5156be,#3d41a8)',
            color: downloadingAll ? '#5156be' : '#fff',
            fontWeight: 700, fontSize: 14, cursor: downloadingAll ? 'not-allowed' : 'pointer',
            boxShadow: downloadingAll ? 'none' : '0 4px 18px rgba(81,86,190,0.35)',
            transition: 'all 0.2s'
          }}
        >
          {downloadingAll
            ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
            : <Download size={17} />}
          {downloadingAll ? 'Generating Cumulative PDF…' : 'Download All Progress'}
        </button>
      </div>

      {/* ── Global Header (UCC Logo etc) ── */}
      <div style={{
        background: '#fff', borderRadius: 20,
        boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
        overflow: 'hidden', border: '1px solid #e2e8f0',
        marginBottom: 32
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)',
          padding: '32px 40px 28px', position: 'relative', overflow: 'hidden'
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', top: 20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
              {/* UCC Logo placeholder */}
              <div style={{
                width: 64, height: 64, borderRadius: 16, flexShrink: 0,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(255,255,255,0.25)',
                fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: -1
              }}>
                UCC
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>
                  University of Cape Coast
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  School of Physical Sciences • Dept. of CS &amp; IT
                </div>
                <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Official Cumulative Academic Report
                  </span>
                </div>
              </div>
            </div>

            {/* Ref box */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Generated</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Student Info Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          borderBottom: '1px solid #f1f5f9',
          background: '#fff'
        }}>
          {[
            { icon: <User size={15} color="#5156be" />, label: 'Student Name', value: studentInfo.studentName || '—' },
            { icon: <FileText size={15} color="#5156be" />, label: 'Student ID', value: studentInfo.username || '—' },
            { icon: <GraduationCap size={15} color="#5156be" />, label: 'Programme', value: studentInfo.programName || '—' },
            { icon: <TrendingUp size={15} color="#5156be" />, label: 'Semesters Completed', value: allReports.length },
          ].map((item, i, arr) => (
            <div
              key={i}
              style={{
                padding: '20px 24px',
                borderRight: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {item.icon}
                <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {item.label}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Loop Through Reports ── */}
      {allReports.map((report, idx) => {
        const sections: any[] = report.sections || [];
        const courseMarks: any[] = report.courseMarks || [];

        let totalEarned = 0, totalMax = 0;
        courseMarks.forEach((cm: any) => {
          if (cm.totalScore != null) totalEarned += Number(cm.totalScore);
          sections.forEach((sec: any) => {
            totalMax += Number(sec.maxScore);
          });
        });
        const overallPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
        const passCount = courseMarks.filter((cm: any) => cm.grade && cm.grade !== 'F').length;

        return (
          <div key={`${report.level}-${report.semester}`} style={{
            background: '#fff', borderRadius: 16,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            overflow: 'hidden', border: '1px solid #e2e8f0',
            marginBottom: 24
          }}>
            {/* Header for this semester */}
            <div style={{
              background: '#f8fafc', padding: '16px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <BookOpen size={20} color="#7c3aed" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                    Level {report.level}
                  </h3>
                  <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    Semester {report.semester}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownloadSingle(report.level, report.semester)}
                disabled={downloadingSingle === (report.semester + parseInt(report.level) * 1000)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                  background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {downloadingSingle === (report.semester + parseInt(report.level) * 1000) ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
                Download Semester
              </button>
            </div>

            {/* Course Results Table */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course Title</th>
                      {sections.map((sec: any) => (
                        <th key={sec.id} style={{ padding: '12px 10px', textAlign: 'center', color: '#475569', fontSize: 11, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
                          <div>{sec.sectionName}</div>
                          <div style={{ fontWeight: 400, fontSize: 10, color: '#94a3b8', marginTop: 2 }}>/{sec.maxScore}</div>
                        </th>
                      ))}
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#475569', fontSize: 11, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>Total</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#475569', fontSize: 11, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseMarks.length === 0 ? (
                      <tr>
                        <td colSpan={4 + sections.length} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                          No marks recorded yet
                        </td>
                      </tr>
                    ) : courseMarks.map((cm: any, idx: number) => {
                      const sectionMarkMap: Record<number, any> = {};
                      (cm.sectionMarks || []).forEach((sm: any) => { sectionMarkMap[sm.sectionId] = sm; });
                      return (
                        <tr key={cm.courseId} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: '#5156be' }}>{cm.courseCode}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{cm.courseTitle}</td>
                          {sections.map((sec: any) => {
                            const sm = sectionMarkMap[sec.id];
                            const score = sm?.scoreObtained;
                            return (
                              <td key={sec.id} style={{ padding: '12px 10px', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                                <span style={{ color: score != null ? '#1e293b' : '#cbd5e1', fontWeight: 600, fontSize: 13 }}>
                                  {score != null ? Number(score).toFixed(1) : '—'}
                                </span>
                              </td>
                            );
                          })}
                          <td style={{ padding: '12px 10px', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                            <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 14 }}>
                              {cm.totalScore != null ? Number(cm.totalScore).toFixed(1) : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                            {cm.grade ? (
                              <span style={{
                                display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                                background: gradeBg(cm.grade), color: gradeColor(cm.grade),
                                fontWeight: 800, fontSize: 13
                              }}>
                                {cm.grade}
                              </span>
                            ) : <span style={{ color: '#cbd5e1', fontWeight: 700 }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Overall Progress for this semester */}
              {courseMarks.length > 0 && (
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Semester Average</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{overallPct}%</span>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${overallPct}%`, height: '100%', borderRadius: 4,
                        background: overallPct >= 70 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{passCount}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Passed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{courseMarks.length - passCount}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Failed</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Footer ── */}
      <div style={{
        marginTop: 20, padding: '16px 24px', background: '#f8fafc', borderRadius: 16,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
      }}>
        <CheckCircle size={15} color="#059669" />
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
          Official Academic Record — University of Cape Coast Examination Portal
        </span>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SemesterReportCard;
