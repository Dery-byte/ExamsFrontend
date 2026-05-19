import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  loadQuizzes, getReportByQuizId, getTheoryQuestions,
  addSectionBMarks, getMyCoursesWithQuizzes
} from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import {
  ChevronDown, ChevronRight, X, Loader2, FileText,
  MessageSquare, Star, Users, BookOpen, CheckCircle, Award, Eye
} from 'lucide-react';

/* ── helpers ───────────────────────────────────────────────────────────── */
const getStudentAnswers = (userId: number, quizId: number) =>
  client.get(`/answers/by-user-quiz/${userId}/${quizId}`).then(r => r.data).catch(() => []);

const getObjAnswers = (userId: number, quizId: number) =>
  client.get(`/getReportByUidAndQid/${userId}/${quizId}`).then(r => r.data).catch(() => []);

const saveReviewedMarks = (payload: object) =>
  client.put('/save-review', payload).then(r => r.data);

/* ── Review Modal ──────────────────────────────────────────────────────── */
function ReviewModal({ student, quiz, onClose }: { student: any; quiz: any; onClose: () => void }) {
  const qId = quiz.qId;
  const userId = student.user?.id;

  const { data: theoryQs = [], isLoading: loadingTQ } = useQuery({
    queryKey: ['theoryQs', qId],
    queryFn: () => getTheoryQuestions(qId),
  });

  const { data: answers = [], isLoading: loadingAns } = useQuery({
    queryKey: ['stuAnswers', userId, qId],
    queryFn: () => getStudentAnswers(userId, qId),
    enabled: !!userId,
  });

  const [comments, setComments] = useState<Record<string, string>>({});
  const [reviewed, setReviewed] = useState<Record<string, number>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [isReviewed, setIsReviewed] = useState(student.isReviewed || false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    if (answers.length > 0) {
      const initComments: Record<string, string> = {};
      const initReviewed: Record<string, number> = {};
      const initShowComments: Record<string, boolean> = {};
      answers.forEach((ans: any) => {
        const key = ans.quesNo || ans.questionNo || ans.quesO;
        if (key) {
          if (ans.feedback) {
            initComments[key] = ans.feedback;
            initShowComments[key] = true; // Auto-show if comment exists
          }
          if (ans.score !== undefined && ans.score !== null) {
            initReviewed[key] = ans.score;
          }
        }
      });
      setComments(prev => ({ ...initComments, ...prev }));
      setReviewed(prev => ({ ...initReviewed, ...prev }));
      setShowComments(prev => ({ ...initShowComments, ...prev }));
    }
  }, [answers]);

  const getAnswer = (quesNo: string) =>
    answers.find((a: any) => a.quesNo === quesNo || a.questionNo === quesNo || a.quesO === quesNo);

  const totalReviewed = Object.values(reviewed).reduce((s, v) => s + (v || 0), 0);

  const handleSave = async () => {
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the errors before saving.');
      return;
    }
    setSaving(true);
    try {
      await saveReviewedMarks({
        userId,
        quizId: qId,
        marksB: totalReviewed,
        isReviewed,
        comments,
        reviewedMarks: reviewed,
      });
      toast.success('Review saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['quiz-reports', qId] });
      onClose();
    } catch {
      toast.error('Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const answeredTheoryQs = theoryQs.filter((tq: any) => getAnswer(tq.quesNo) != null);

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860, boxShadow: '0 30px 80px rgba(0,0,0,0.3)', marginTop: 20, marginBottom: 20 }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '20px 28px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <FileText size={18} color="#60a5fa" />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Quiz Review</span>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              {quiz.title} &nbsp;·&nbsp; {student.user?.firstName} {student.user?.lastName}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>{totalReviewed}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Reviewed Marks</div>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scores Summary */}
        <div style={{ padding: '16px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Sec A (OBJ)', value: student.marks ?? '—', color: '#5156be' },
            { label: 'Sec B (Theory)', value: student.marksB ?? '—', color: '#2ab57d' },
            { label: 'Max Marks', value: quiz.maxMarks ?? '—', color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}:</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{String(value)}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(loadingTQ || loadingAns) ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Loader2 size={32} style={{ animation: 'rSpin 1s linear infinite', color: '#5156be' }} />
              <p style={{ color: '#64748b', marginTop: 12 }}>Loading questions & answers...</p>
            </div>
          ) : answeredTheoryQs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
              <BookOpen size={40} style={{ marginBottom: 12 }} />
              <p>No theory questions answered by this student.</p>
            </div>
          ) : answeredTheoryQs.map((tq: any, idx: number) => {
            const ans = getAnswer(tq.quesNo);
            const key = tq.quesNo || `q${idx}`;
            return (
              <div key={tq.tqId || idx} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {/* Question header */}
                <div style={{ background: 'linear-gradient(135deg,#f8faff,#f1f5f9)', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ background: '#5156be', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{tq.quesNo}</span>
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Theory Question</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: tq.question }} />
                    {tq.evaluationCriteria && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534' }}>
                        <strong>Rubric:</strong> {tq.evaluationCriteria}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{tq.marks}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Max Pts</div>
                  </div>
                </div>

                {/* Student Answer */}
                <div style={{ padding: '16px 20px', background: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Student Response</div>
                  <div style={{ padding: '12px 16px', background: ans ? '#fafafa' : '#fff7ed', border: `1px solid ${ans ? '#e2e8f0' : '#fed7aa'}`, borderRadius: 8, minHeight: 80, fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {ans?.studentAnswer || <span style={{ color: '#f97316', fontStyle: 'italic', fontSize: 13 }}>No response submitted</span>}
                  </div>
                  {ans?.feedback && (
                    <div style={{ marginTop: 8, padding: '6px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, color: '#1d4ed8' }}>
                      <strong>AI Feedback:</strong> {ans.feedback}
                    </div>
                  )}
                </div>

                {/* Lecturer Comment Toggle */}
                <div style={{ padding: '0 20px 16px', background: '#fff' }}>
                  <button
                    onClick={() => setShowComments(prev => ({ ...prev, [key]: !prev[key] }))}
                    style={{ background: 'none', border: 'none', color: '#8b5cf6', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
                  >
                    <MessageSquare size={14} />
                    {showComments[key] ? 'Hide Comment Box' : (comments[key] ? 'Edit Comment' : 'Add Comment')}
                  </button>
                  {showComments[key] && (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        value={comments[key] || ''}
                        onChange={e => setComments(c => ({ ...c, [key]: e.target.value }))}
                        placeholder="Add a comment for this response (optional)..."
                        rows={3}
                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #ddd6fe', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', background: '#fdf8ff', color: '#4c1d95', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>

                {/* Reviewed Marks */}
                <div style={{ padding: '0 20px 20px', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Star size={14} color="#f59e0b" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Reviewed Mark</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>(Original: {ans?.score ?? '—'} / {tq.marks})</span>
                    <input
                      type="number"
                      min={0}
                      max={parseFloat(String(tq.marks).replace(/[^0-9.]/g, '')) || 100}
                      value={reviewed[key] ?? ''}
                      onChange={e => {
                        let val = Number(e.target.value);
                        const maxMark = parseFloat(String(tq.marks).replace(/[^0-9.]/g, '')) || 100;
                        if (val > maxMark) {
                          setErrors(err => ({ ...err, [key]: `Exceeds max ${maxMark} points` }));
                        } else {
                          setErrors(err => { const newE = { ...err }; delete newE[key]; return newE; });
                        }
                        setReviewed(r => ({ ...r, [key]: val }));
                      }}
                      placeholder={String(ans?.score ?? 0)}
                      style={{ width: 80, padding: '7px 12px', border: `2px solid ${errors[key] ? '#ef4444' : '#f59e0b'}`, borderRadius: 8, fontSize: 16, fontWeight: 800, textAlign: 'center', color: errors[key] ? '#ef4444' : '#92400e', outline: 'none', background: errors[key] ? '#fef2f2' : '#fffbeb', boxSizing: 'border-box' }}
                    />
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>/ {tq.marks} pts</span>
                  </div>
                  {errors[key] && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444', fontWeight: 600, display: 'flex', justifyContent: 'flex-end', paddingRight: 60 }}>
                      {errors[key]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0 0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Total reviewed marks: <strong style={{ color: '#1e293b', fontSize: 16 }}>{totalReviewed}</strong>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
              <input
                type="checkbox"
                checked={isReviewed}
                onChange={(e) => setIsReviewed(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#16a34a' }}
              />
              Mark as Reviewed
            </label>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ padding: '10px 22px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || Object.keys(errors).length > 0} style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#5156be,#3d41a8)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: (saving || Object.keys(errors).length > 0) ? 0.7 : 1 }}>
              {saving ? <Loader2 size={14} style={{ animation: 'rSpin 1s linear infinite' }} /> : <CheckCircle size={14} />}
              {saving ? 'Saving...' : 'Save Review'}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes rSpin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function QuizReview({ adminMode = true }: { adminMode?: boolean }) {
  const { user } = useAuth();
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ student: any; quiz: any } | null>(null);

  const { data: rawQuizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes-review', adminMode, user?.id || user?.username],
    queryFn: async () => {
      if (adminMode) {
        return loadQuizzes();
      } else {
        try {
          const courses = await getMyCoursesWithQuizzes();
          console.log("Fetched courses for lecturer via principal:", courses);
          let allQuizzes: any[] = [];
          courses.forEach((course: any) => {
             if (course.quizzes && Array.isArray(course.quizzes)) {
                const mappedQuizzes = course.quizzes.map((q: any) => ({
                   ...q,
                   qId: q.qId || q.qid, // Handle Jackson mapping variations
                   category: q.category || { title: course.title, cid: course.cid } // Fallback to course details
                }));
                allQuizzes = allQuizzes.concat(mappedQuizzes);
             }
          });
          console.log("Flattened mapped quizzes:", allQuizzes);
          return allQuizzes;
        } catch (err) {
          console.error("Error fetching lecturer quizzes:", err);
          return [];
        }
      }
    },
  });

  const quizzes: any[] = [...(Array.isArray(rawQuizzes) ? rawQuizzes : (rawQuizzes as any)?.quizzes || [])].sort((a: any, b: any) => b.qId - a.qId);

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Inter', sans-serif", background: '#f4f5f7', minHeight: '100vh' }}>
      <Toaster position="top-right" />

      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#5156be,#3d41a8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>Quiz Review Panel</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Review student submissions and assign marks</p>
          </div>
        </div>
      </div>

      {/* Quiz List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Loader2 size={40} style={{ animation: 'rSpin 1s linear infinite', color: '#5156be' }} />
          <p style={{ color: '#64748b', marginTop: 16 }}>Loading quizzes...</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <BookOpen size={56} color="#cbd5e1" />
          <p style={{ color: '#94a3b8', marginTop: 16 }}>No quizzes found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {quizzes.map((quiz: any) => (
            <QuizRow
              key={quiz.qId}
              quiz={quiz}
              expanded={expandedQuiz === quiz.qId}
              onToggle={() => setExpandedQuiz(prev => prev === quiz.qId ? null : quiz.qId)}
              onReview={(student) => setReviewTarget({ student, quiz })}
            />
          ))}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          student={reviewTarget.student}
          quiz={reviewTarget.quiz}
          onClose={() => setReviewTarget(null)}
        />
      )}
      <style>{`@keyframes rSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Quiz Row ──────────────────────────────────────────────────────────── */
function QuizRow({ quiz, expanded, onToggle, onReview }: { quiz: any; expanded: boolean; onToggle: () => void; onReview: (s: any) => void }) {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['quiz-reports', quiz.qId],
    queryFn: () => getReportByQuizId(quiz.qId),
  });

  const totalTaken = reports.length;
  const totalReviewed = reports.filter((r: any) => r.isReviewed).length;
  const notReviewed = totalTaken - totalReviewed;

  const typeColor: Record<string, string> = { OBJ: '#5156be', THEORY: '#fd625e', BOTH: '#f59e0b' };
  const color = typeColor[quiz.quizType] || '#5156be';

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s' }}>
      {/* Quiz Header Row */}
      <div
        onClick={onToggle}
        style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', background: expanded ? '#fafafe' : '#fff', transition: 'background 0.2s' }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={20} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quiz.title}</span>
            <span style={{ background: `${color}18`, color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', flexShrink: 0 }}>{quiz.quizType}</span>
            <span style={{ background: quiz.status === 'OPEN' ? '#ecfdf5' : '#f1f5f9', color: quiz.status === 'OPEN' ? '#16a34a' : '#94a3b8', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{quiz.status}</span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 16 }}>
            <span>{quiz.category?.title || 'Uncategorized'}</span>
            <span>Max: {quiz.maxMarks ?? '—'} marks</span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>Taken: {totalTaken}</span>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>Reviewed: {totalReviewed}</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>Not Reviewed: {notReviewed}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{quiz.numberOfQuestions || 0}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Questions</div>
          </div>
          <div style={{ width: 1, height: 36, background: '#e2e8f0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5156be' }}>
            <Users size={16} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Students</span>
          </div>
          {expanded ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronRight size={18} color="#94a3b8" />}
        </div>
      </div>

      {/* Expanded: Student List */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9' }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Loader2 size={24} style={{ animation: 'rSpin 1s linear infinite', color: '#5156be' }} />
              <p style={{ color: '#64748b', marginTop: 8, fontSize: 13 }}>Loading student submissions...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Users size={32} color="#cbd5e1" />
              <p style={{ color: '#94a3b8', marginTop: 8, fontSize: 13 }}>No students have taken this quiz yet.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Student', 'Submission', 'Sec A', 'Sec B', 'Grade', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r: any, i: number) => {
                  const name = `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || r.user?.username || 'Unknown';
                  const date = r.submissionDate ? new Date(r.submissionDate).toLocaleDateString() : '—';
                  return (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#fafafe')}
                      onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eff6ff', color: '#5156be', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.user?.email || r.user?.username || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>{date}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#5156be' }}>{r.marks ?? '—'}</span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#2ab57d' }}>{r.marksB ?? '—'}</span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ background: r.grade ? '#ecfdf5' : '#f1f5f9', color: r.grade ? '#16a34a' : '#94a3b8', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>
                          {r.grade || 'N/A'}
                        </span>
                        {r.isReviewed && (
                          <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#16a34a', fontWeight: 700 }}>
                            <CheckCircle size={10} /> REVIEWED
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => onReview(r)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#5156be,#3d41a8)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          <Award size={13} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
