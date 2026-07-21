import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import client from '../../api/client';
import { toast } from 'react-hot-toast';
import {
  BookOpen, Users, ChevronDown, ChevronUp, Eye, CheckCircle,
  Globe, RotateCcw, UserPlus, PlusCircle, Trash2, X, Award,
  ClipboardCheck, AlertCircle, Loader2, CheckSquare, TrendingUp
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   STATUS HELPERS
═══════════════════════════════════════════════════════════════════ */
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dotColor: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f3f4f6', color: '#374151', dotColor: '#9ca3af' },
  ACTIVE:    { label: 'Active',    bg: '#dbeafe', color: '#1d4ed8', dotColor: '#3b82f6' },
  SUBMITTED: { label: 'Submitted', bg: '#fef3c7', color: '#92400e', dotColor: '#f59e0b' },
  APPROVED:  { label: 'Approved',  bg: '#d1fae5', color: '#065f46', dotColor: '#10b981' },
  PUBLISHED: { label: 'Published', bg: '#ede9fe', color: '#5b21b6', dotColor: '#7c3aed' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: cfg.bg, color: cfg.color, letterSpacing: 0.3,
      whiteSpace: 'nowrap'
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dotColor, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MARKS VIEWER MODAL
═══════════════════════════════════════════════════════════════════ */
interface MarksViewerProps {
  sheet: any;
  onClose: () => void;
  onApprove: () => void;
  onRevert: () => void;
  onPublish: () => void;
  actionLoading: string | null;
}

function MarksViewerModal({ sheet, onClose, onApprove, onRevert, onPublish, actionLoading }: MarksViewerProps) {
  const [sheetData, setSheetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const marksBase = client.defaults.baseURL!.replace('/v1/auth', '');
    client.get(`${marksBase}/marks/sheet/${sheet.id}`)
      .then(res => { setSheetData(res.data); setLoading(false); })
      .catch(() => { setError('Failed to load marks data.'); setLoading(false); });
  }, [sheet.id]);

  // Build column list from sections and student data
  const sections: any[] = sheetData?.sections || [];
  const studentMarks: any[] = sheetData?.studentMarks || [];

  // Gather all unique courses from student data
  const courseList: { code: string; title: string; id: number }[] = [];
  const seenCourses = new Set<number>();
  studentMarks.forEach(sm => {
    (sm.courseMarks || []).forEach((cm: any) => {
      if (!seenCourses.has(cm.courseId)) {
        seenCourses.add(cm.courseId);
        courseList.push({ id: cm.courseId, code: cm.courseCode, title: cm.courseTitle });
      }
    });
  });

  // Status-based action availability
  const canApprove  = sheet.status === 'SUBMITTED';
  const canPublish  = sheet.status === 'APPROVED';
  const canRevert   = sheet.status === 'SUBMITTED' || sheet.status === 'APPROVED';

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        flexShrink: 0, flexWrap: 'wrap', rowGap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <ClipboardCheck size={20} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
              Marks Review — {sheet.courseName || 'Sheet'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
              Level {sheet.level} &bull; Sem {sheet.semester} &bull; {sheet.programName}
            </div>
          </div>
        </div>

        {/* Status + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatusBadge status={sheet.status} />

          {canRevert && (
            <button
              onClick={onRevert}
              disabled={!!actionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', border: '1.5px solid rgba(245,158,11,0.5)',
                borderRadius: 8, background: 'rgba(245,158,11,0.15)',
                color: '#fbbf24', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                opacity: actionLoading ? 0.6 : 1
              }}
            >
              {actionLoading === 'revert' ? <Loader2 size={12} style={{ animation: 'rSpin 1s linear infinite' }} /> : <RotateCcw size={12} />}
              Revert
            </button>
          )}

          {canApprove && (
            <button
              onClick={onApprove}
              disabled={!!actionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', border: 'none',
                borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                opacity: actionLoading ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
              }}
            >
              {actionLoading === 'approve' ? <Loader2 size={12} style={{ animation: 'rSpin 1s linear infinite' }} /> : <CheckSquare size={12} />}
              Approve
            </button>
          )}

          {canPublish && (
            <button
              onClick={onPublish}
              disabled={!!actionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', border: 'none',
                borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                opacity: actionLoading ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(124,58,237,0.35)'
              }}
            >
              {actionLoading === 'publish' ? <Loader2 size={12} style={{ animation: 'rSpin 1s linear infinite' }} /> : <Globe size={12} />}
              Publish
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, border: 'none', borderRadius: 8,
              background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
            <Loader2 size={40} color="#5b21b6" style={{ animation: 'rSpin 1s linear infinite' }} />
            <p style={{ color: '#64748b', fontSize: 14 }}>Loading marks data…</p>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <AlertCircle size={40} color="#ef4444" />
            <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
          </div>
        ) : studentMarks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <Users size={48} color="#cbd5e1" />
            <p style={{ color: '#94a3b8', fontSize: 14 }}>No student marks recorded yet.</p>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { icon: <Users size={18} color="#3b82f6" />, label: 'Students', value: studentMarks.length, bg: '#eff6ff' },
                { icon: <BookOpen size={18} color="#7c3aed" />, label: 'Courses', value: courseList.length, bg: '#f5f3ff' },
                { icon: <Award size={18} color="#10b981" />, label: 'Sections', value: sections.length, bg: '#f0fdf4' },
                { icon: <TrendingUp size={18} color="#f59e0b" />, label: 'Status', value: STATUS_CONFIG[sheet.status]?.label || sheet.status, bg: '#fffbeb' },
              ].map((card, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {card.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{card.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', lineHeight: 1.2, marginTop: 2 }}>{card.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Marks Grid — responsive horizontal scroll */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: courseList.length > 2 ? 700 : 400 }}>
                  <thead>
                    {/* Course headers (spanning sections) */}
                    <tr style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
                      <th style={{ padding: '14px 18px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', minWidth: 180, position: 'sticky', left: 0, background: '#1e1b4b', zIndex: 2 }}>
                        Student
                      </th>
                      {courseList.map(course => (
                        <th key={course.id} colSpan={sections.length + 1} style={{ padding: '14px 10px', textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: 800, borderLeft: '1px solid rgba(255,255,255,0.1)', minWidth: (sections.length + 1) * 90 }}>
                          <div>{course.code}</div>
                          <div style={{ fontWeight: 400, fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{course.title}</div>
                        </th>
                      ))}
                    </tr>
                    {/* Section sub-headers */}
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 700, position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 2 }}>
                        Name
                      </th>
                      {courseList.map(course => (
                        <React.Fragment key={course.id}>
                          {sections.map(sec => (
                            <th key={sec.id} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, color: '#5156be', fontWeight: 700, borderLeft: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                              {sec.sectionName}<br />
                              <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}>/{sec.maxScore}</span>
                            </th>
                          ))}
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, color: '#374151', fontWeight: 800, borderLeft: '1px solid #cbd5e1', background: '#f8fafc', whiteSpace: 'nowrap' }}>
                            Total
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentMarks.map((sm: any, idx: number) => {
                      const courseMarkMap: Record<number, any> = {};
                      (sm.courseMarks || []).forEach((cm: any) => { courseMarkMap[cm.courseId] = cm; });
                      return (
                        <tr key={sm.studentId} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                          {/* Student name – sticky */}
                          <td style={{ padding: '12px 18px', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#fafbfc', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {(sm.studentName || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap' }}>{sm.studentName || '—'}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{sm.username || ''}</div>
                              </div>
                            </div>
                          </td>
                          {/* Per-course section marks */}
                          {courseList.map(course => {
                            const cm = courseMarkMap[course.id];
                            const sectionMarkMap: Record<number, any> = {};
                            (cm?.sectionMarks || []).forEach((s: any) => { sectionMarkMap[s.sectionId] = s; });
                            return (
                              <React.Fragment key={course.id}>
                                {sections.map(sec => {
                                  const sm2 = sectionMarkMap[sec.id];
                                  const score = sm2?.scoreObtained ?? null;
                                  const hasScore = score !== null && score !== undefined && score !== '';
                                  return (
                                    <td key={sec.id} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                                      <span style={{
                                        display: 'inline-block', minWidth: 40, padding: '4px 8px',
                                        background: hasScore ? '#eff6ff' : '#f9fafb',
                                        color: hasScore ? '#1d4ed8' : '#cbd5e1',
                                        borderRadius: 6, fontWeight: 700, fontSize: 13
                                      }}>
                                        {hasScore ? Number(score).toFixed(1) : '—'}
                                      </span>
                                    </td>
                                  );
                                })}
                                <td style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #cbd5e1', background: idx % 2 === 0 ? '#f8fafc' : '#f1f5f9' }}>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '4px 10px', borderRadius: 8,
                                    background: cm?.totalScore != null ? '#ede9fe' : '#f3f4f6',
                                    color: cm?.totalScore != null ? '#5b21b6' : '#9ca3af',
                                    fontWeight: 800, fontSize: 14
                                  }}>
                                    {cm?.totalScore != null ? Number(cm.totalScore).toFixed(1) : '—'}
                                  </span>
                                  {cm?.grade && (
                                    <div style={{ marginTop: 3, fontSize: 10, fontWeight: 700, color: '#10b981' }}>{cm.grade}</div>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom legend */}
            <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: '#94a3b8' }}>
              <span>— = No marks entered yet</span>
              <span>&bull; Scores shown to 1 decimal place</span>
              {sheet.status === 'SUBMITTED' && (
                <span style={{ color: '#92400e', fontWeight: 600 }}>⚠ Sheet awaiting your approval</span>
              )}
              {sheet.status === 'APPROVED' && (
                <span style={{ color: '#065f46', fontWeight: 600 }}>✓ Approved — ready to publish</span>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes rSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHEET CARD (one per sheet in the list)
═══════════════════════════════════════════════════════════════════ */
interface SheetCardProps {
  sheet: any;
  onAction: (action: string, sheetId: number) => void;
  actionLoading: string | null;
  onViewMarks: (sheet: any) => void;
  onEdit: (sheet: any) => void;
  onDelete: (sheetId: number) => void;
}

function SheetCard({ sheet, onAction, actionLoading, onViewMarks, onEdit, onDelete }: SheetCardProps) {
  const isLoading = (act: string) => actionLoading === `${act}-${sheet.id}`;

  const canApprove  = sheet.status === 'SUBMITTED';
  const canPublish  = sheet.status === 'APPROVED';
  const canRevert   = sheet.status === 'SUBMITTED' || sheet.status === 'APPROVED' || sheet.status === 'PUBLISHED';

  return (
    <div style={{
      background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      border: '1px solid #e2e8f0', overflow: 'hidden',
      transition: 'box-shadow 0.2s', cursor: 'default'
    }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)')}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)')}
    >
      {/* Top color stripe by status */}
      <div style={{
        height: 4,
        background: sheet.status === 'PUBLISHED' ? 'linear-gradient(90deg,#7c3aed,#5b21b6)'
          : sheet.status === 'APPROVED'  ? 'linear-gradient(90deg,#10b981,#059669)'
          : sheet.status === 'SUBMITTED' ? 'linear-gradient(90deg,#f59e0b,#d97706)'
          : sheet.status === 'ACTIVE'    ? 'linear-gradient(90deg,#3b82f6,#1d4ed8)'
          : '#e2e8f0'
      }} />

      <div style={{ padding: '20px 24px' }}>
        {/* Row 1: title + status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b', lineHeight: 1.3, marginBottom: 4 }}>
              {sheet.courseName || 'Unnamed Sheet'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {sheet.programName} &bull; Level {sheet.level} &bull; Semester {sheet.semester}
            </div>
          </div>
          <StatusBadge status={sheet.status} />
        </div>

        {/* Row 2: meta chips */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
            <Users size={14} color="#5156be" />
            <strong style={{ color: '#1e293b' }}>{sheet.enrolledStudentCount ?? 0}</strong> students
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
            <Award size={14} color="#5156be" />
            <span>Teacher: <strong style={{ color: '#1e293b' }}>{sheet.classTeacherName || 'Not Assigned'}</strong></span>
          </div>
        </div>

        {/* Row 3: workflow pipeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {['ACTIVE', 'SUBMITTED', 'APPROVED', 'PUBLISHED'].map((s, i) => {
            const statuses = ['ACTIVE', 'SUBMITTED', 'APPROVED', 'PUBLISHED'];
            const currentIdx = statuses.indexOf(sheet.status);
            const stepIdx = i;
            const done    = currentIdx > stepIdx;
            const active  = currentIdx === stepIdx;
            const cfg = STATUS_CONFIG[s];
            return (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 64 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? '#10b981' : active ? cfg.bg : '#f1f5f9',
                    border: `2px solid ${done ? '#10b981' : active ? cfg.dotColor : '#e2e8f0'}`,
                    transition: 'all 0.2s'
                  }}>
                    {done
                      ? <CheckCircle size={14} color="#fff" />
                      : <span style={{ fontSize: 11, fontWeight: 800, color: active ? cfg.color : '#94a3b8' }}>{i + 1}</span>
                    }
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: active ? cfg.color : done ? '#10b981' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                    {cfg.label}
                  </span>
                </div>
                {i < 3 && (
                  <div style={{ flex: 1, height: 2, minWidth: 12, background: done ? '#10b981' : '#e2e8f0', transition: 'background 0.3s', marginBottom: 18 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Row 4: action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* View Marks — always available once SUBMITTED or beyond */}
          {['SUBMITTED', 'APPROVED', 'PUBLISHED', 'ACTIVE'].includes(sheet.status) && (
            <button
              onClick={() => onViewMarks(sheet)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                border: '1.5px solid #5156be', borderRadius: 8,
                background: '#fff', color: '#5156be', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ede9fe'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
            >
              <Eye size={13} /> View Marks
            </button>
          )}

          {/* Approve — only for SUBMITTED */}
          {canApprove && (
            <button
              onClick={() => onAction('approve', sheet.id)}
              disabled={!!actionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                border: 'none', borderRadius: 8,
                background: isLoading('approve') ? '#d1fae5' : 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff', fontWeight: 700, fontSize: 12, cursor: actionLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)', opacity: actionLoading && !isLoading('approve') ? 0.5 : 1
              }}
            >
              {isLoading('approve') ? <Loader2 size={12} style={{ animation: 'rSpin 1s linear infinite' }} /> : <CheckSquare size={13} />}
              Approve
            </button>
          )}

          {/* Publish — only APPROVED (gated) */}
          {canPublish && (
            <button
              onClick={() => onAction('publish', sheet.id)}
              disabled={!!actionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                border: 'none', borderRadius: 8,
                background: isLoading('publish') ? '#ede9fe' : 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                color: '#fff', fontWeight: 700, fontSize: 12, cursor: actionLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(124,58,237,0.3)', opacity: actionLoading && !isLoading('publish') ? 0.5 : 1
              }}
            >
              {isLoading('publish') ? <Loader2 size={12} style={{ animation: 'rSpin 1s linear infinite' }} /> : <Globe size={13} />}
              Publish
            </button>
          )}

          {/* Disabled Publish hint when not yet approved */}
          {sheet.status === 'SUBMITTED' && (
            <button disabled title="Approve the sheet first before publishing" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
              border: '1.5px solid #e2e8f0', borderRadius: 8,
              background: '#f8fafc', color: '#94a3b8', fontWeight: 700, fontSize: 12, cursor: 'not-allowed'
            }}>
              <Globe size={13} /> Publish
            </button>
          )}

          {/* Revert */}
          {canRevert && (
            <button
              onClick={() => {
                if (window.confirm('Revert this sheet to the lecturer for corrections?')) onAction('revert', sheet.id);
              }}
              disabled={!!actionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                border: '1.5px solid #fcd34d', borderRadius: 8,
                background: '#fffbeb', color: '#92400e', fontWeight: 700, fontSize: 12,
                cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1
              }}
            >
              {isLoading('revert') ? <Loader2 size={12} style={{ animation: 'rSpin 1s linear infinite' }} /> : <RotateCcw size={12} />}
              Revert
            </button>
          )}

          {/* Enroll students */}
          <button
            onClick={() => onAction('enroll', sheet.id)}
            disabled={!!actionLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
              border: '1.5px solid #e2e8f0', borderRadius: 8,
              background: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: 12,
              cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1
            }}
          >
            {isLoading('enroll') ? <Loader2 size={12} style={{ animation: 'rSpin 1s linear infinite' }} /> : <UserPlus size={13} />}
            Enroll
          </button>

          {/* Edit / Delete */}
          {['DRAFT', 'ACTIVE'].includes(sheet.status) && (
              <>
                  <button
                      onClick={() => onEdit(sheet)}
                      style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                          border: '1.5px solid #e0f2fe', borderRadius: 8,
                          background: '#f0f9ff', color: '#0369a1', fontWeight: 600, fontSize: 12,
                          cursor: 'pointer'
                      }}
                  >
                      <PlusCircle size={13} /> Edit
                  </button>
                  <button
                      onClick={() => onDelete(sheet.id)}
                      style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                          border: '1.5px solid #fee2e2', borderRadius: 8,
                          background: '#fef2f2', color: '#b91c1c', fontWeight: 600, fontSize: 12,
                          cursor: 'pointer'
                      }}
                  >
                      <Trash2 size={13} /> Delete
                  </button>
              </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
const MarksSheetManager = () => {
  const [programs, setPrograms] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [programId, setProgramId] = useState('');
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [defaultClassTeacherId, setDefaultClassTeacherId] = useState('');
  const [restrictLecturer, setRestrictLecturer] = useState(true);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sections, setSections] = useState<any[]>([{ sectionName: 'Exam', maxScore: 60, deletable: false }, { sectionName: 'CA', maxScore: 40, deletable: true }]);
  const [sheets, setSheets] = useState([]);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSheetId, setEditingSheetId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewingSheet, setViewingSheet] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  const marksBase = client.defaults.baseURL!.replace('/v1/auth', '');

  useEffect(() => {
    client.get('/programs/my-department').then(res => setPrograms(res.data)).catch(() => {});
    client.get('/lecturers/by-department').then(res => setLecturers(res.data)).catch(() => {});
    fetchSheets();
  }, []);

  const fetchSheets = () => {
    client.get(`${marksBase}/marks/sheet/all`).then(res => setSheets(res.data)).catch(() => {});
  };

  useEffect(() => {
    if (programId && level && semester) {
      client.get(`/admin/courses-for-sheet?programId=${programId}&level=${level}&semester=${semester}`)
        .then(res => { setAvailableCourses(res.data); setSelectedCourseId(''); })
        .catch(() => setAvailableCourses([]));
    } else {
      setAvailableCourses([]);
      setSelectedCourseId('');
    }
  }, [programId, level, semester]);

  const handleActivateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) { toast.error('Please select a course.'); return; }
    
    // Validate total is 100
    const totalScore = sections.reduce((sum, sec) => sum + (Number(sec.maxScore) || 0), 0);
    if (totalScore !== 100) {
      toast.error(`Total section marks must equal 100. Current total is ${totalScore}.`);
      return;
    }
    
    setFormLoading(true);
    try {
      const payload = {
        programId: Number(programId), level, semester: Number(semester),
        classTeacherId: classTeacherId ? Number(classTeacherId) : null,
        restrictLecturerToAssignedCourses: restrictLecturer,
        courseId: Number(selectedCourseId), sections
      };

      if (editingSheetId) {
        await client.put(`${marksBase}/marks/sheet/${editingSheetId}`, payload);
        toast.success('Sheet updated!');
      } else {
        await client.post(`${marksBase}/marks/sheet/activate`, payload);
        toast.success('Sheet activated!');
      }
      setShowCreateForm(false);
      setEditingSheetId(null);
      fetchSheets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save sheet.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSheet = (sheet: any) => {
    setEditingSheetId(sheet.id);
    setProgramId(sheet.programId.toString());
    const p = programs.find((p: any) => p.id === sheet.programId) as any;
    setAvailableLevels(p?.configuredLevels || [100, 200, 300, 400] as any);
    setLevel(sheet.level.toString());
    setSemester(sheet.semester.toString());
    setClassTeacherId(sheet.classTeacherId ? sheet.classTeacherId.toString() : '');
    setRestrictLecturer(sheet.restrictLecturerToAssignedCourses);
    
    // We must wait for courses to load to set courseId, but for now we set it hoping it matches later
    // or we fetch the course list first. useEffect will fetch courses and clear selectedCourseId
    // so we need a workaround: we use a timeout or a ref to set the courseId after courses load.
    // Actually, setting it directly and relying on the user to re-select if needed is safer,
    // but better to fetch courses immediately here.
    client.get(`/admin/courses-for-sheet?programId=${sheet.programId}&level=${sheet.level}&semester=${sheet.semester}`)
        .then(res => { 
            setAvailableCourses(res.data); 
            setSelectedCourseId(sheet.courseId ? sheet.courseId.toString() : '');
        });

    setSections(sheet.sections?.length ? sheet.sections : [{ sectionName: 'Exam', maxScore: 60, deletable: false }, { sectionName: 'CA', maxScore: 40, deletable: true }]);
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSheet = async (sheetId: number) => {
    if (!window.confirm("Are you sure you want to delete this sheet? All marks will be lost!")) return;
    try {
        await client.delete(`${marksBase}/marks/sheet/${sheetId}`);
        toast.success('Sheet deleted!');
        fetchSheets();
    } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete sheet.');
    }
  };

  const handleAction = useCallback(async (action: string, sheetId: number) => {
    const key = `${action}-${sheetId}`;
    setActionLoading(key);
    try {
      if (action === 'approve')  await client.post(`${marksBase}/marks/sheet/${sheetId}/approve`);
      if (action === 'publish')  await client.post(`${marksBase}/marks/sheet/${sheetId}/publish`);
      if (action === 'revert')   await client.post(`${marksBase}/marks/sheet/${sheetId}/revert`);
      if (action === 'enroll') {
        const res = await client.post(`${marksBase}/marks/sheet/${sheetId}/enroll-students`);
        toast.success(`Enrolled ${res.data.enrolled} students!`);
        fetchSheets(); return;
      }
      const msgs: Record<string, string> = { approve: 'Sheet approved!', publish: 'Sheet published!', revert: 'Sheet reverted to lecturer.' };
      toast.success(msgs[action] || 'Done!');
      fetchSheets();
      // Update viewingSheet status if open
      if (viewingSheet && viewingSheet.id === sheetId) {
        const statusMap: Record<string, string> = { approve: 'APPROVED', publish: 'PUBLISHED', revert: 'ACTIVE' };
        setViewingSheet((prev: any) => prev ? { ...prev, status: statusMap[action] || prev.status } : prev);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} sheet.`);
    } finally {
      setActionLoading(null);
    }
  }, [marksBase, viewingSheet]);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0',
    fontSize: 14, color: '#1e293b', background: '#fff', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s'
  };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151', fontSize: 13 };

  // Status counts for header
  const statusCounts: Record<string, number> = {};
  sheets.forEach((s: any) => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#5156be,#3d41a8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardCheck size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#0f172a' }}>Marks Sheet Manager</h1>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Review, approve and publish semester mark sheets</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateForm(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px',
            border: 'none', borderRadius: 10,
            background: showCreateForm ? '#f1f5f9' : 'linear-gradient(135deg,#5156be,#3d41a8)',
            color: showCreateForm ? '#475569' : '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: showCreateForm ? 'none' : '0 4px 18px rgba(81,86,190,0.35)',
            transition: 'all 0.2s'
          }}
        >
          {showCreateForm ? <ChevronUp size={18} /> : <PlusCircle size={18} />}
          {showCreateForm ? 'Close Form' : 'Activate New Sheet'}
        </button>
      </div>

      {/* ── Status Overview pills ── */}
      {sheets.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
          {Object.entries(statusCounts).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.dotColor}30` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dotColor }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{count} {cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Form (collapsible) ── */}
      {showCreateForm && (
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 30px rgba(0,0,0,0.1)', marginBottom: 32, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '20px 28px 0', borderBottom: '1px solid #f1f5f9', marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <PlusCircle size={18} color="#5156be" />
              <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: 16 }}>
                {editingSheetId ? 'Edit Semester Sheet' : 'Activate New Semester Sheet'}
              </h3>
            </div>
            {editingSheetId && (
                <button type="button" onClick={() => {
                  setEditingSheetId(null);
                  setShowCreateForm(false);
                  setProgramId(''); setLevel(''); setSemester(''); setSelectedCourseId('');
                  setClassTeacherId(''); setSections([{ sectionName: 'Exam', maxScore: 60, deletable: false }, { sectionName: 'CA', maxScore: 40, deletable: true }]);
                }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel Edit</button>
            )}
          </div>
          <div style={{ padding: '24px 28px' }}>
            <form onSubmit={handleActivateSheet}>
              {/* Row 1: Program / Level / Semester */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Program</label>
                  <select style={inputStyle} value={programId} onChange={e => {
                    setProgramId(e.target.value);
                    const p = programs.find((p: any) => p.id === Number(e.target.value)) as any;
                    setAvailableLevels(p?.configuredLevels || [100, 200, 300, 400] as any);
                    setLevel(''); setSemester('');
                  }} required>
                    <option value="">Select Program</option>
                    {programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Level</label>
                  <select style={inputStyle} value={level} onChange={e => { setLevel(e.target.value); setSemester(''); }} required>
                    <option value="">Select Level</option>
                    {availableLevels.map((lv: number) => <option key={lv} value={lv}>{lv}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Semester</label>
                  <select style={inputStyle} value={semester} onChange={e => setSemester(e.target.value)} required>
                    <option value="">Select Semester</option>
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </select>
                </div>
              </div>

              {/* Course picker */}
              {availableCourses.length > 0 && (
                <div style={{ marginBottom: 20, padding: '18px 20px', background: '#f8faff', borderRadius: 12, border: '1.5px solid #dbeafe' }}>
                  <label style={{ ...labelStyle, color: '#1d4ed8', marginBottom: 12 }}>
                    Select Course for this Sheet
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {availableCourses.map((c: any) => (
                      <label key={c.cid} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 10, border: `1.5px solid ${selectedCourseId == c.cid ? '#3b82f6' : '#e5e7eb'}`,
                        background: selectedCourseId == c.cid ? '#eff6ff' : '#fff',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}>
                        <input type="radio" name="courseSelect" checked={selectedCourseId == c.cid} onChange={() => {
                          setSelectedCourseId(c.cid.toString());
                          if (c.user && c.user.id) {
                            setClassTeacherId(c.user.id.toString());
                            setDefaultClassTeacherId(c.user.id.toString());
                          } else {
                            setClassTeacherId('');
                            setDefaultClassTeacherId('');
                          }
                        }} style={{ width: 16, height: 16, accentColor: '#3b82f6' }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{c.courseCode}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{c.title}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {programId && level && semester && availableCourses.length === 0 && (
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 10, color: '#92400e', fontSize: 13 }}>
                  ⚠️ No courses found for this combination. Please add courses first.
                </div>
              )}

              {/* Class teacher + restrict */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Class Teacher <span style={{ fontWeight: 400, color: '#9ca3af' }}>(Optional)</span></label>
                  <select style={inputStyle} value={classTeacherId} onChange={e => setClassTeacherId(e.target.value)}>
                    <option value="">None</option>
                    {lecturers.map((l: any) => <option key={l.id} value={l.id}>{l.firstname} {l.lastname}</option>)}
                  </select>
                  {selectedCourseId && defaultClassTeacherId && classTeacherId && classTeacherId !== defaultClassTeacherId && (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, color: '#be123c', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                      ⚠️ <strong>Warning:</strong> You have selected a different lecturer than the one assigned to this course. This sheet will be managed by the selected Class Teacher.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 26 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={restrictLecturer} onChange={e => setRestrictLecturer(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>Restrict lecturers to only enter marks for their assigned courses</span>
                  </label>
                </div>
              </div>

              {/* Sections config */}
              <h4 style={{ fontWeight: 700, marginBottom: 14, color: '#1e293b', fontSize: 14 }}>Configure Mark Sections</h4>
              {sections.map((sec, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    style={{ flex: 2, minWidth: 160, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }}
                    placeholder="Section Name (e.g. Section A)"
                    value={sec.sectionName}
                    onChange={e => { const s = [...sections]; s[idx] = { ...s[idx], sectionName: e.target.value }; setSections(s); }}
                    required
                  />
                  <input
                    style={{ flex: 1, minWidth: 100, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }}
                    type="number" placeholder="Max Score"
                    value={sec.maxScore}
                    onChange={e => { const s = [...sections]; s[idx] = { ...s[idx], maxScore: Number(e.target.value) }; setSections(s); }}
                    required min={1}
                  />
                  {sections.length > 1 && sec.deletable !== false && (
                    <button type="button" onClick={() => setSections(sections.filter((_, i) => i !== idx))}
                      style={{ padding: '10px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                  {sec.deletable === false && (
                    <div style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12, fontWeight: 500, fontStyle: 'italic' }}>Required</div>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setSections([...sections, { sectionName: '', maxScore: 0, deletable: true }])}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', color: '#5156be', border: '1.5px dashed #c7d2fe', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 28 }}>
                <PlusCircle size={14} /> Add Section
              </button>

              <button type="submit" disabled={formLoading} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 30px',
                background: 'linear-gradient(135deg,#5156be,#3d41a8)', color: '#fff',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: formLoading ? 'not-allowed' : 'pointer',
                opacity: formLoading ? 0.8 : 1, boxShadow: '0 4px 18px rgba(81,86,190,0.35)'
              }}>
                {formLoading ? <Loader2 size={16} style={{ animation: 'rSpin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                {formLoading ? 'Activating…' : 'Activate Sheet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Sheet Cards ── */}
      {sheets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1.5px dashed #e2e8f0' }}>
          <ClipboardCheck size={52} color="#cbd5e1" />
          <h3 style={{ margin: '16px 0 8px', color: '#94a3b8', fontWeight: 700 }}>No Sheets Yet</h3>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Click "Activate New Sheet" to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 520px), 1fr))', gap: 20 }}>
          {sheets.map((sheet: any) => (
            <SheetCard
              key={sheet.id}
              sheet={sheet}
              onAction={handleAction}
              actionLoading={actionLoading}
              onViewMarks={s => setViewingSheet(s)}
              onEdit={handleEditSheet}
              onDelete={handleDeleteSheet}
            />
          ))}
        </div>
      )}

      {/* ── Marks Viewer Modal ── */}
      {viewingSheet && (
        <MarksViewerModal
          sheet={viewingSheet}
          onClose={() => setViewingSheet(null)}
          onApprove={async () => { await handleAction('approve', viewingSheet.id); }}
          onRevert={async () => { await handleAction('revert', viewingSheet.id); }}
          onPublish={async () => { await handleAction('publish', viewingSheet.id); }}
          actionLoading={actionLoading?.startsWith('approve') ? 'approve' : actionLoading?.startsWith('publish') ? 'publish' : actionLoading?.startsWith('revert') ? 'revert' : null}
        />
      )}

      <style>{`
        @keyframes rSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select:focus, input:focus { border-color: #5156be !important; box-shadow: 0 0 0 3px rgba(81,86,190,0.12); }
      `}</style>
    </div>
  );
};

export default MarksSheetManager;
