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

const marksBase = (baseUrl: string) => baseUrl.replace('/v1/auth', '');

/* ═══════════════════════════════════════════════════════════
   SHEET SELECTOR SCREEN
═══════════════════════════════════════════════════════════ */
function SheetSelector({ sheets, onSelect }: { sheets: any[]; onSelect: (s: any) => void }) {
  return (
    <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg,#5156be,#3d41a8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <GraduationCap size={26} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0f172a' }}>My Semester Report Cards</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Select a published semester to view your academic performance
          </p>
        </div>
      </div>

      {sheets.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 32px',
          background: '#fff', borderRadius: 18,
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          border: '1.5px dashed #e2e8f0'
        }}>
          <Clock size={48} color="#cbd5e1" />
          <h3 style={{ margin: '16px 0 8px', color: '#94a3b8', fontWeight: 700 }}>No Published Results Yet</h3>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            Your semester results will appear here once published by your administrator.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sheets.map((s: any) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '20px 24px', background: '#fff',
                border: '1.5px solid #e2e8f0', borderRadius: 14,
                cursor: 'pointer', textAlign: 'left',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.18s', width: '100%'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#5156be';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(81,86,190,0.15)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                (e.currentTarget as HTMLElement).style.transform = 'none';
              }}
            >
              {/* Icon */}
              <div style={{
                width: 50, height: 50, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <BookOpen size={22} color="#7c3aed" />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>
                  {s.programName || 'Programme'}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>📚 Level {s.level}</span>
                  <span>🗓 Semester {s.semester}</span>
                  {s.courseNames && <span style={{ color: '#94a3b8' }}>{s.courseNames}</span>}
                </div>
              </div>

              {/* Published badge + arrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: '#ede9fe', color: '#5b21b6'
                }}>
                  ✓ Published
                </span>
                <ChevronRight size={20} color="#5156be" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REPORT CARD VIEW
═══════════════════════════════════════════════════════════ */
function ReportCardView({
  sheet, studentMark, onBack, sheetId
}: {
  sheet: any; studentMark: any; onBack: () => void; sheetId: number;
}) {
  const [downloading, setDownloading] = useState(false);
  const sections: any[] = sheet?.sections || [];
  const courseMarks: any[] = studentMark?.courseMarks || [];

  // Compute overall stats
  let totalEarned = 0, totalMax = 0;
  courseMarks.forEach((cm: any) => {
    if (cm.totalScore != null) totalEarned += Number(cm.totalScore);
    sections.forEach((sec: any) => {
      totalMax += Number(sec.maxScore);
    });
  });
  const overallPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const passCount = courseMarks.filter((cm: any) => cm.grade && cm.grade !== 'F').length;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const base = client.defaults.baseURL!.replace('/v1/auth', '');
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${base}/marks/sheet/${sheetId}/report-card/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SemesterReportCard_${studentMark.studentName || 'student'}_Level${sheet.level}_Sem${sheet.semester}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report card downloaded!');
    } catch (err) {
      toast.error('Failed to download report card. Please try again.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', border: '1.5px solid #e2e8f0', borderRadius: 10,
            background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#5156be')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <ArrowLeft size={16} /> Back to Reports
        </button>

        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 24px', border: 'none', borderRadius: 10,
            background: downloading ? '#e8ecf8' : 'linear-gradient(135deg,#5156be,#3d41a8)',
            color: downloading ? '#5156be' : '#fff',
            fontWeight: 700, fontSize: 14, cursor: downloading ? 'not-allowed' : 'pointer',
            boxShadow: downloading ? 'none' : '0 4px 18px rgba(81,86,190,0.35)',
            transition: 'all 0.2s'
          }}
        >
          {downloading
            ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
            : <Download size={17} />}
          {downloading ? 'Generating PDF…' : 'Download Report Card'}
        </button>
      </div>

      {/* ── Card Shell ── */}
      <div style={{
        background: '#fff', borderRadius: 20,
        boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
        overflow: 'hidden', border: '1px solid #e2e8f0'
      }}>

        {/* ── Header (styled like PrintQuiz header) ── */}
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
                    Official Semester Academic Report Card
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
            { icon: <User size={15} color="#5156be" />, label: 'Student Name', value: studentMark.studentName || '—' },
            { icon: <FileText size={15} color="#5156be" />, label: 'Student ID', value: studentMark.username || '—' },
            { icon: <GraduationCap size={15} color="#5156be" />, label: 'Programme', value: sheet.programName || '—' },
            { icon: <BookOpen size={15} color="#5156be" />, label: 'Level / Semester', value: `Level ${sheet.level} • Semester ${sheet.semester}` },
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

        {/* ── Performance Summary Cards ── */}
        <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Performance Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#5156be', lineHeight: 1 }}>{courseMarks.length}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Courses Taken</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#059669', lineHeight: 1 }}>{passCount}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Courses Passed</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: courseMarks.length - passCount > 0 ? '#dc2626' : '#94a3b8', lineHeight: 1 }}>
                {courseMarks.length - passCount}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Courses Failed</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: overallPct >= 70 ? '#059669' : overallPct >= 50 ? '#d97706' : '#dc2626', lineHeight: 1 }}>
                {overallPct}%
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Overall Score</div>
            </div>
          </div>
        </div>

        {/* ── Course Results Table ── */}
        <div style={{ padding: '28px 32px' }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Course Performance Results
          </h3>

          {/* Responsive: scroll on mobile, full table on desktop */}
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 90 }}>
                    Code
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Course Title
                  </th>
                  {sections.map((sec: any) => (
                    <th key={sec.id} style={{ padding: '14px 12px', textAlign: 'center', color: '#fff', fontSize: 11, fontWeight: 800, borderLeft: '1px solid rgba(255,255,255,0.1)', minWidth: 90 }}>
                      <div>{sec.sectionName}</div>
                      <div style={{ fontWeight: 400, fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>/{sec.maxScore} pts</div>
                    </th>
                  ))}
                  <th style={{ padding: '14px 12px', textAlign: 'center', color: '#fff', fontSize: 11, fontWeight: 800, borderLeft: '1px solid rgba(255,255,255,0.1)', minWidth: 80 }}>
                    Total
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', color: '#fff', fontSize: 11, fontWeight: 800, borderLeft: '1px solid rgba(255,255,255,0.1)', minWidth: 70 }}>
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody>
                {courseMarks.length === 0 ? (
                  <tr>
                    <td colSpan={3 + sections.length} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No marks recorded yet
                    </td>
                  </tr>
                ) : courseMarks.map((cm: any, idx: number) => {
                  const sectionMarkMap: Record<number, any> = {};
                  (cm.sectionMarks || []).forEach((sm: any) => { sectionMarkMap[sm.sectionId] = sm; });
                  return (
                    <tr key={cm.courseId} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafbfc', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafbfc')}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 800, fontSize: 13, color: '#5156be' }}>
                        {cm.courseCode}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                        {cm.courseTitle}
                      </td>
                      {sections.map((sec: any) => {
                        const sm = sectionMarkMap[sec.id];
                        const score = sm?.scoreObtained;
                        return (
                          <td key={sec.id} style={{ padding: '14px 12px', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                            <span style={{
                              display: 'inline-block', padding: '4px 12px', borderRadius: 8,
                              background: score != null ? '#eff6ff' : '#f9fafb',
                              color: score != null ? '#1d4ed8' : '#cbd5e1',
                              fontWeight: 700, fontSize: 13
                            }}>
                              {score != null ? Number(score).toFixed(1) : '—'}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: '14px 12px', textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>
                        <span style={{
                          display: 'inline-block', padding: '5px 14px', borderRadius: 8,
                          background: '#ede9fe', color: '#5b21b6',
                          fontWeight: 800, fontSize: 15
                        }}>
                          {cm.totalScore != null ? Number(cm.totalScore).toFixed(1) : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>
                        {cm.grade ? (
                          <span style={{
                            display: 'inline-block', padding: '5px 14px', borderRadius: 8,
                            background: gradeBg(cm.grade), color: gradeColor(cm.grade),
                            fontWeight: 900, fontSize: 15
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

          {/* Overall progress bar */}
          {courseMarks.length > 0 && (
            <div style={{ marginTop: 24, padding: '20px 24px', background: '#1e1b4b', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Overall Performance</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{overallPct}%</span>
                </div>
                <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${overallPct}%`, height: '100%', borderRadius: 5,
                    background: overallPct >= 70 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#ef4444',
                    transition: 'width 1s ease'
                  }} />
                </div>
              </div>
              <div style={{
                padding: '8px 20px', borderRadius: 10,
                background: overallPct >= 70 ? 'rgba(16,185,129,0.2)' : overallPct >= 50 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                border: `1px solid ${overallPct >= 70 ? 'rgba(16,185,129,0.4)' : overallPct >= 50 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
                flexShrink: 0
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: overallPct >= 70 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#ef4444'
                }}>
                  {overallPct >= 70 ? 'Excellent' : overallPct >= 50 ? 'Satisfactory' : 'Needs Improvement'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '18px 32px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={15} color="#059669" />
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Official Academic Record — University of Cape Coast Examination Portal</span>
          </div>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
            Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .report-header { padding: 20px !important; }
          .info-grid-cell { border-right: none !important; border-bottom: 1px solid #f1f5f9; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const SemesterReportCard = () => {
  const [sheets, setSheets] = useState<any[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  const [studentMark, setStudentMark] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState(false);

  const base = client.defaults.baseURL!.replace('/v1/auth', '');

  useEffect(() => {
    client.get(`${base}/marks/sheet/all`)
      .then(res => setSheets(res.data.filter((s: any) => s.status === 'PUBLISHED')))
      .catch(() => toast.error('Failed to load your reports.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectSheet = async (sheet: any) => {
    setCardLoading(true);
    try {
      const [marksRes, sheetRes] = await Promise.all([
        client.get(`${base}/marks/sheet/${sheet.id}/my-marks`),
        client.get(`${base}/marks/sheet/${sheet.id}`)
      ]);
      setSelectedSheet(sheetRes.data);
      setStudentMark(marksRes.data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 403) {
        toast.error('This report is not available for your account. Contact your administrator.');
      } else {
        toast.error('Failed to load report card. Please try again.');
      }
    } finally {
      setCardLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedSheet(null);
    setStudentMark(null);
  };

  /* Loading state */
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Loader2 size={40} color="#5156be" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Loading your report cards…</p>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  /* Loading individual report card */
  if (cardLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Loader2 size={40} color="#5156be" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Assembling your report card…</p>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  /* No marks state */
  if (selectedSheet && studentMark && (!studentMark.courseMarks || studentMark.courseMarks.length === 0)) {
    return (
      <div style={{ padding: '24px', maxWidth: 700, margin: '0 auto' }}>
        <button
          onClick={handleBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
            padding: '9px 18px', border: '1.5px solid #e2e8f0', borderRadius: 10,
            background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ textAlign: 'center', padding: '60px 32px', background: '#fff', borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <AlertCircle size={52} color="#f59e0b" />
          <h3 style={{ margin: '16px 0 8px', color: '#1e293b', fontWeight: 800 }}>Marks Pending</h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Hello <strong>{studentMark.studentName}</strong>, your marks for this semester have not been fully entered yet. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  /* Report Card view */
  if (selectedSheet && studentMark) {
    return (
      <ReportCardView
        sheet={selectedSheet}
        studentMark={studentMark}
        onBack={handleBack}
        sheetId={selectedSheet.id}
      />
    );
  }

  /* Sheet selector */
  return <SheetSelector sheets={sheets} onSelect={handleSelectSheet} />;
};

export default SemesterReportCard;
