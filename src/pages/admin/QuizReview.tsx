import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  loadQuizzes, getReportByQuizId, getTheoryQuestions,
  addSectionBMarks, getMyCoursesWithQuizzes, getQuizAttempts, getStudentResultsDetails, getTakenQuizIds
} from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import QuestionImage from '../../components/ui/QuestionImage';
import ReportEmailToggle from '../../components/ui/ReportEmailToggle';
import QuizEmailReportToggle from '../../components/ui/QuizEmailReportToggle';
import QuizAttemptsModal, { AttemptRow } from '../../components/ui/QuizAttemptsModal';
import MarkingStatus from '../../components/examops/MarkingStatus';
import QuizReportLinks from '../../components/examops/QuizReportLinks';
import {
  ChevronDown, ChevronRight, X, Loader2, FileText,
  MessageSquare, Star, Users, BookOpen, CheckCircle, Award, Eye,
  CheckSquare, AlertTriangle, RotateCcw, ListChecks, PenLine, Search
} from 'lucide-react';
import { tx } from '../../utils/terms';

const RESPONSIVE_CSS = `
@keyframes rSpin { to { transform: rotate(360deg); } }

/* Layout & Containers */
.page-container { padding: 32px 40px; font-family: 'Inter', sans-serif; background: #f4f5f7; min-height: 100vh; box-sizing: border-box; }
.qr-modal-overlay { position: fixed; inset: 0; background: rgba(10,15,30,0.7); backdrop-filter: blur(8px); z-index: 99999; display: flex; align-items: flex-start; justify-content: center; padding: 20px; overflow-y: auto; box-sizing: border-box; }
.qr-modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 860px; box-shadow: 0 30px 80px rgba(0,0,0,0.3); margin-top: 20px; margin-bottom: 20px; position: relative; }

/* Modal Header */
.qr-modal-header { background: linear-gradient(135deg,#1e293b,#334155); padding: 20px 28px; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center; }
.qr-modal-header-right { display: flex; align-items: center; gap: 16px; }

/* Modal Body/Footer */
.qr-modal-scores { padding: 16px 28px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 24px; flex-wrap: wrap; }
.qr-modal-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; }
.qr-modal-q-header { background: linear-gradient(135deg,#f8faff,#f1f5f9); padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.qr-modal-q-marks-box { text-align: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; flex-shrink: 0; }
.qr-modal-reviewed-marks { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.qr-modal-footer { padding: 16px 28px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 16px 16px; display: flex; justify-content: space-between; align-items: center; }
.qr-modal-footer-left { display: flex; align-items: center; gap: 20px; }
.qr-modal-footer-right { display: flex; gap: 12px; }

/* Collapsible Objectives / Theory sections */
.qr-sec { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.qr-sec-head { width: 100%; display: flex; align-items: center; gap: 14px; padding: 16px 20px; border: none; background: #fff; cursor: pointer; text-align: left; font: inherit; color: inherit; transition: background 0.2s; }
.qr-sec-head:hover { background: #f8fafc; }
.qr-sec-head:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; }
.qr-sec-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.qr-sec-text { flex: 1; min-width: 0; }
.qr-sec-title { font-size: 15px; font-weight: 800; color: #1e293b; }
.qr-sec-sub { font-size: 12px; color: #64748b; margin-top: 2px; overflow-wrap: anywhere; }
.qr-sec-chevron { flex-shrink: 0; color: #64748b; transition: transform 0.2s; }
.qr-sec.open .qr-sec-chevron { transform: rotate(180deg); }
.qr-sec.open .qr-sec-head { border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.qr-sec-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; background: #f8fafc; }

/* Objective question cards */
.qr-obj-card { border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; padding: 16px 20px; }
.qr-obj-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.qr-obj-q { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.6; overflow-wrap: anywhere; }
.qr-obj-q img { max-width: 100%; height: auto; }
.qr-obj-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.qr-obj-opt { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 13px; color: #475569; min-width: 0; }
.qr-obj-opt-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.qr-obj-opt-text p { margin: 0; }
.qr-obj-letter { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; }
.qr-obj-tag { font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; white-space: nowrap; }
.qr-obj-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.qr-obj-pairs { display: flex; flex-direction: column; gap: 8px; }
.qr-obj-pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr); gap: 10px; align-items: center; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 13px; }
.qr-obj-pair > div { min-width: 0; overflow-wrap: anywhere; }
.qr-obj-pair-cap { display: none; }
.qr-obj-pair-head { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr); gap: 10px; padding: 0 16px; }

/* Filter bar — laid out from its own width (the sidebar changes how much room it has), one column by default */
.qr-filters-wrap { container-type: inline-size; }
.qr-filters { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; align-items: end; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
@container (min-width: 440px) {
  .qr-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 14px; }
  .qr-filters .qr-search, .qr-filters .qr-clear { grid-column: 1 / -1; }
}
@container (min-width: 700px) {
  /* search + Clear on the first row, the four dropdowns on the second */
  .qr-filters { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 16px; }
  .qr-filters .qr-search { grid-column: 1 / span 3; grid-row: 1; }
  .qr-filters .qr-clear { grid-column: 4; grid-row: 1; }
}
@container (min-width: 1040px) {
  .qr-filters { grid-template-columns: minmax(200px, 2fr) repeat(4, minmax(140px, 1fr)) auto; }
  .qr-filters .qr-search, .qr-filters .qr-clear { grid-column: auto; grid-row: auto; }
}
.qr-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.qr-field-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
.qr-input { width: 100%; height: 40px; padding: 0 12px; border: 1.5px solid #e2e8f0; border-radius: 9px; background: #fff; font: inherit; font-size: 13px; color: #1e293b; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
.qr-input:focus { border-color: var(--brand); }
select.qr-input { cursor: pointer; text-overflow: ellipsis; }
.qr-search { position: relative; }
.qr-search .qr-input { padding-left: 34px; padding-right: 34px; }
.qr-search-icon { position: absolute; left: 11px; bottom: 12px; color: #94a3b8; pointer-events: none; }
.qr-search-clear { position: absolute; right: 6px; bottom: 6px; width: 28px; height: 28px; border: none; border-radius: 6px; background: transparent; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.qr-search-clear:hover { background: #f1f5f9; color: #475569; }
.qr-clear { height: 40px; padding: 0 16px; border: 1.5px solid #e2e8f0; border-radius: 9px; background: #fff; color: #64748b; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; }
.qr-clear:disabled { opacity: 0.45; cursor: default; }
.qr-clear:not(:disabled):hover { border-color: #fca5a5; color: #dc2626; background: #fef2f2; }
.qr-filter-meta { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px 12px; margin: 12px 4px 16px; font-size: 12px; color: #64748b; }
.qr-filter-meta strong { color: #1e293b; }
@media (max-width: 768px) {
  .qr-input { font-size: 16px; height: 44px; }   /* 16px stops iOS zooming into the field */
  .qr-search-icon { bottom: 14px; }
  .qr-search-clear { bottom: 8px; }
  .qr-clear { height: 44px; }
}

/* Quiz Row */
.quiz-row-container { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: box-shadow 0.2s; }
.quiz-row-header { padding: 18px 24px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: background 0.2s; }
.quiz-row-stats { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
.quiz-row-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.quiz-row-info { font-size: 12px; color: #94a3b8; display: flex; flex-wrap: wrap; gap: 16px; }

/* Responsive Table */
.resp-table-wrapper { width: 100%; overflow-x: auto; border-top: 1px solid #f1f5f9; }
.resp-table { width: 100%; border-collapse: collapse; min-width: 600px; }
.resp-table th { padding: 12px 20px; text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.resp-table td { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; }
.resp-table tr { transition: background 0.2s; }
.resp-table tbody tr:hover { background: #fafafe; }

@media (max-width: 768px) {
  .page-container { padding: 16px 12px !important; }
  /* Modals keep their desktop arrangement, just tighter */
  .qr-modal-overlay { padding: 10px; }
  .qr-modal-content { margin-top: 0; margin-bottom: 0; }
  .qr-modal-header, .qr-modal-scores, .qr-modal-body, .qr-modal-footer { padding: 14px 16px !important; }
  .qr-modal-header { align-items: flex-start; gap: 12px; }
  .qr-modal-header > :first-child { flex: 1 1 auto; min-width: 0; }
  .qr-modal-header-right { gap: 10px; flex-shrink: 0; }
  .qr-modal-scores { gap: 8px 18px; }
  .qr-modal-body { gap: 16px; }
  .qr-modal-q-header { padding: 12px 14px; gap: 10px; }
  .qr-modal-q-header > :first-child { min-width: 0; }
  .qr-modal-q-marks-box { padding: 6px 10px; }
  .qr-modal-footer { flex-wrap: wrap; gap: 12px; }
  .qr-modal-footer-left { flex-wrap: wrap; gap: 8px 16px; min-width: 0; }
  .qr-modal-footer-right { margin-left: auto; gap: 8px; }
  .qr-sec-head { padding: 14px 16px; gap: 12px; }
  .qr-sec-icon { width: 36px; height: 36px; }
  .qr-sec-body { padding: 14px 12px; gap: 12px; }
  .qr-obj-card { padding: 14px; }
  .qr-obj-grid { grid-template-columns: minmax(0, 1fr); }
  .qr-obj-pair-head { display: none; }
  .qr-obj-pair { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .qr-obj-pair-cap { display: inline; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-right: 6px; }
}
/* Quiz rows and their student tables stack by the list's own width (the sidebar eats into it on tablets/laptops) */
.qr-list { container-type: inline-size; display: flex; flex-direction: column; gap: 16px; }
@container (max-width: 760px) {
  .quiz-row-header { flex-direction: column; align-items: flex-start; padding: 16px; }
  .quiz-row-stats { width: 100%; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; }

  .resp-table { min-width: 100%; }
  .resp-table thead { display: none; }
  .resp-table, .resp-table tbody, .resp-table tr, .resp-table td { display: block; width: 100%; box-sizing: border-box; }
  .resp-table tbody { padding: 12px; }
  .resp-table tr { margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .resp-table td { text-align: right; padding: 12px 16px !important; border-bottom: 1px solid #f8fafc; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .resp-table td:last-child { border-bottom: none; }
  .resp-table td::before { content: attr(data-label); font-weight: 700; font-size: 11px; text-transform: uppercase; color: #94a3b8; flex-shrink: 0; }
  .resp-td-content { display: flex; justify-content: flex-end; align-items: center; text-align: right; word-break: break-word; }
}
@media (max-width: 420px) {
  .qr-modal-overlay { padding: 6px; }
  .qr-modal-header, .qr-modal-scores, .qr-modal-body, .qr-modal-footer { padding: 12px !important; }
  .qr-modal-header-stat > :first-child { font-size: 18px !important; }
  .qr-modal-header-stat > :last-child { font-size: 9px !important; }
  .qr-modal-footer-right > button { padding: 9px 14px !important; }
  .qr-sec-head { padding: 12px; gap: 10px; }
  .qr-sec-icon { width: 32px; height: 32px; border-radius: 8px; }
  .qr-sec-title { font-size: 14px; }
  .qr-sec-body { padding: 12px 8px; }
  .qr-obj-card { padding: 12px; }
  .qr-obj-top { flex-direction: column-reverse; gap: 8px; }
  .qr-obj-opt { padding: 9px 10px; }
}
`;

/* ── helpers ───────────────────────────────────────────────────────────── */
const getStudentAnswers = (userId: number, quizId: number) =>
  client.get(`/answers/by-user-quiz/${userId}/${quizId}`).then(r => r.data).catch(() => []);

const saveReviewedMarks = (payload: object) =>
  client.put('/save-review', payload).then(r => r.data);

/* Strip tags for comparing option text with the answer key — never for display */
const stripHtml = (s: string) => (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

const OBJ_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  CORRECT: { bg: '#ecfdf5', color: '#16a34a', label: 'Correct' },
  WRONG:   { bg: '#fef2f2', color: '#dc2626', label: 'Incorrect' },
  PARTIAL: { bg: '#fffbeb', color: '#d97706', label: 'Partial' },
  SKIPPED: { bg: '#f1f5f9', color: '#64748b', label: 'Skipped' },
};

const TYPE_LABEL: Record<string, string> = {
  MCQ: 'Multiple Choice', TRUE_FALSE: 'True / False', MATCHING: 'Matching', FILL_BLANK: 'Fill in the Blank', NUMERIC: 'Numeric',
};

/* ── Collapsible section (Objectives / Theory) ─────────────────────────── */
function ReviewSection({ title, summary, icon, color, open, onToggle, children }: {
  title: string; summary: string; icon: ReactNode; color: string;
  open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <div className={`qr-sec${open ? ' open' : ''}`}>
      <button type="button" className="qr-sec-head" onClick={onToggle} aria-expanded={open}>
        <span className="qr-sec-icon" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>{icon}</span>
        <span className="qr-sec-text">
          <span className="qr-sec-title" style={{ display: 'block' }}>{title}</span>
          <span className="qr-sec-sub" style={{ display: 'block' }}>{summary}</span>
        </span>
        <ChevronDown size={20} className="qr-sec-chevron" aria-hidden="true" />
      </button>
      {open && <div className="qr-sec-body">{children}</div>}
    </div>
  );
}

/* ── One objective question, read-only ─────────────────────────────────── */
function ObjectiveQuestion({ q, index }: { q: any; index: number }) {
  const status = OBJ_STATUS[(q.status || 'SKIPPED').toUpperCase()] ?? OBJ_STATUS.SKIPPED;
  const selected: string[] = q.selectedAnswers || [];
  const key: string[] = q.correct_answer || [];

  let answer: ReactNode;
  if (q.questionType === 'MATCHING') {
    const pairs: any[] = q.matchingPairs || [];
    answer = (
      <div className="qr-obj-pairs">
        <div className="qr-obj-pair-head qr-obj-label">
          <span>Prompt</span><span>Student's match</span><span>Correct match</span>
        </div>
        {pairs.map((p, i) => (
          <div key={i} className="qr-obj-pair" style={{ borderColor: p.correct ? '#bbf7d0' : '#fecaca', background: p.correct ? '#f0fdf4' : '#fef2f2' }}>
            <div style={{ fontWeight: 600, color: '#1e293b' }}><span className="qr-obj-pair-cap">Prompt</span>{p.prompt}</div>
            <div style={{ fontWeight: 700, color: p.correct ? '#16a34a' : '#dc2626' }}>
              <span className="qr-obj-pair-cap">Student</span>{p.studentAnswer || <em style={{ fontWeight: 500 }}>(no match)</em>} {p.correct ? '✓' : '✗'}
            </div>
            <div style={{ fontWeight: 600, color: '#166534' }}><span className="qr-obj-pair-cap">Correct</span>{p.correctAnswer}</div>
          </div>
        ))}
      </div>
    );
  } else if (q.questionType === 'FILL_BLANK' || q.questionType === 'NUMERIC') {
    const right = q.status === 'CORRECT';
    answer = (
      <div className="qr-obj-grid">
        <div className="qr-obj-opt" style={{ display: 'block', borderColor: right ? '#16a34a' : '#ef4444', background: right ? '#f0fdf4' : '#fef2f2' }}>
          <div className="qr-obj-label">{tx("Student's answer")}</div>
          <div style={{ fontWeight: 700, color: '#1e293b', overflowWrap: 'anywhere' }}>{selected[0] || <em style={{ fontWeight: 500, color: '#94a3b8' }}>(no answer)</em>}</div>
        </div>
        <div className="qr-obj-opt" style={{ display: 'block', borderColor: '#16a34a', background: '#f0fdf4' }}>
          <div className="qr-obj-label">Accepted answer</div>
          <div style={{ fontWeight: 700, color: '#1e293b', overflowWrap: 'anywhere' }}>
            {key.join(' / ') || '—'}
            {q.questionType === 'NUMERIC' && q.tolerance ? ` (± ${q.tolerance})` : ''}
          </div>
        </div>
      </div>
    );
  } else {
    const opts = ['option1', 'option2', 'option3', 'option4'].filter(k => q[k]);
    answer = (
      <div className="qr-obj-grid">
        {opts.map((k, j) => {
          const plain = stripHtml(q[k]);
          const isCorrect = key.some(a => stripHtml(a) === plain);
          const isSelected = selected.some(a => stripHtml(a) === plain);
          const tone = isCorrect ? '#16a34a' : isSelected ? '#dc2626' : null;
          return (
            <div key={k} className="qr-obj-opt" style={{
              borderColor: tone ?? '#e2e8f0',
              background: isCorrect ? '#f0fdf4' : isSelected ? '#fef2f2' : '#fff',
              color: tone ?? '#475569', fontWeight: tone ? 700 : 500,
            }}>
              <span className="qr-obj-letter" style={{ background: tone ?? '#f1f5f9', color: tone ? '#fff' : '#94a3b8' }}>{'ABCD'[j]}</span>
              <span className="qr-obj-opt-text" dangerouslySetInnerHTML={{ __html: q[k] }} />
              {isSelected && (
                <span className="qr-obj-tag" style={{ color: tone!, background: isCorrect ? '#dcfce7' : '#fee2e2' }}>
                  Picked {isCorrect ? '✓' : '✗'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="qr-obj-card">
      <div className="qr-obj-top">
        <div className="qr-obj-q">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--brand)', color: 'var(--brand-contrast)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>Q{index + 1}</span>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{TYPE_LABEL[q.questionType] ?? 'Objective'}</span>
          </div>
          <QuestionImage src={q.image} />
          <div dangerouslySetInnerHTML={{ __html: q.content }} />
        </div>
        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: status.bg, color: status.color, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0, alignSelf: 'flex-start' }}>
          {status.label}
        </span>
      </div>
      {answer}
    </div>
  );
}

/* ── Review Modal ──────────────────────────────────────────────────────── */
function ReviewModal({ student, quiz, onClose }: { student: any; quiz: any; onClose: () => void }) {
  const qId = quiz.qId;
  const userId = student.user?.id;
  // Sections follow the quiz type; an unknown type shows both.
  const showObj = quiz.quizType !== 'THEORY';
  const showTheory = quiz.quizType !== 'OBJ';
  const [objOpen, setObjOpen] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);

  const { data: theoryQs = [], isLoading: loadingTQ } = useQuery({
    queryKey: ['theoryQs', qId],
    queryFn: () => getTheoryQuestions(qId),
    enabled: showTheory,
  });

  const { data: objResult, isLoading: loadingObj, isError: objError } = useQuery({
    queryKey: ['stuObjResult', userId, qId],
    queryFn: () => getStudentResultsDetails(qId, userId),
    enabled: showObj && !!userId,
    retry: false,
  });
  // Only the questions this student was actually given (a random draw may leave some out)
  const objQs: any[] = (objResult?.results ?? []).filter((q: any) => q.served !== false);
  const objCorrect = objQs.filter(q => q.status === 'CORRECT').length;

  const { data: answers = [], isLoading: loadingAns } = useQuery({
    queryKey: ['stuAnswers', userId, qId],
    queryFn: () => getStudentAnswers(userId, qId),
    enabled: showTheory && !!userId,
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
          if (ans.lecturerComment) {
            initComments[key] = ans.lecturerComment;
            initShowComments[key] = true;
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
    <div className="qr-modal-overlay">
      <div className="qr-modal-content">

        {/* Header */}
        <div className="qr-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <FileText size={18} color="#60a5fa" />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Quiz Review</span>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 13, overflowWrap: 'anywhere' }}>
              {quiz.title} &nbsp;·&nbsp; {student.user?.firstName} {student.user?.lastName}
            </p>
          </div>
          <div className="qr-modal-header-right">
            <div className="qr-modal-header-stat" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>{totalReviewed}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Reviewed Marks</div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scores Summary */}
        <div className="qr-modal-scores">
          {[
            { label: 'Sec A (OBJ)', value: student.marks ?? '—', color: 'var(--brand-text)' },
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
        <div className="qr-modal-body">
          {showObj && (
            <ReviewSection
              title="Objectives"
              summary={loadingObj ? 'Loading answers…' : objError ? 'Could not load objective answers'
                : `${objCorrect} of ${objQs.length} correct · Section A: ${student.marks ?? '—'} marks`}
              icon={<ListChecks size={20} />}
              color="var(--brand-text)"
              open={objOpen}
              onToggle={() => setObjOpen(o => !o)}
            >
              {loadingObj ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <Loader2 size={28} style={{ animation: 'rSpin 1s linear infinite', color: 'var(--brand-text)' }} />
                  <p style={{ color: '#64748b', marginTop: 10, fontSize: 13 }}>Loading objective answers...</p>
                </div>
              ) : objError ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#dc2626', fontSize: 13 }}>
                  <AlertTriangle size={28} style={{ marginBottom: 8 }} />
                  <p style={{ margin: 0 }}>Could not load the objective answers. Please try again.</p>
                </div>
              ) : objQs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                  <ListChecks size={32} style={{ marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: 13 }}>{tx("No objective answers recorded for this student.")}</p>
                </div>
              ) : objQs.map((q, i) => <ObjectiveQuestion key={q.quesId ?? i} q={q} index={i} />)}
            </ReviewSection>
          )}

          {showTheory && (
            <ReviewSection
              title="Theory"
              summary={(loadingTQ || loadingAns) ? 'Loading answers…'
                : `${answeredTheoryQs.length} answered · ${totalReviewed} reviewed marks`}
              icon={<PenLine size={20} />}
              color="#2ab57d"
              open={theoryOpen}
              onToggle={() => setTheoryOpen(o => !o)}
            >
              {(loadingTQ || loadingAns) ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                  <Loader2 size={32} style={{ animation: 'rSpin 1s linear infinite', color: 'var(--brand-text)' }} />
                  <p style={{ color: '#64748b', marginTop: 12 }}>Loading questions & answers...</p>
                </div>
              ) : answeredTheoryQs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
                  <BookOpen size={40} style={{ marginBottom: 12 }} />
                  <p>{tx("No theory questions answered by this student.")}</p>
                </div>
              ) : answeredTheoryQs.map((tq: any, idx: number) => {
                const ans = getAnswer(tq.quesNo);
                const key = tq.quesNo || `q${idx}`;
                return (
                  <div key={tq.tqId || idx} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    {/* Question header */}
                    <div className="qr-modal-q-header">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ background: 'var(--brand)', color: 'var(--brand-contrast)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{tq.quesNo}</span>
                          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Theory Question</span>
                        </div>
                        <QuestionImage src={tq.image} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: tq.question }} />
                        {tq.evaluationCriteria && (
                          <div style={{ marginTop: 8, padding: '8px 12px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534' }}>
                            <strong>Rubric:</strong> {tq.evaluationCriteria}
                          </div>
                        )}
                      </div>
                      <div className="qr-modal-q-marks-box">
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{tq.marks}</div>
                        <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Max Pts</div>
                      </div>
                    </div>

                    {/* Student Answer */}
                    <div style={{ padding: '16px 20px', background: '#fff' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{tx("Student Response")}</div>
                      <div style={{ padding: '12px 16px', background: ans ? '#fafafa' : '#fff7ed', border: `1px solid ${ans ? '#e2e8f0' : '#fed7aa'}`, borderRadius: 8, minHeight: 80, fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'auto' }}>
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
                        style={{ background: 'none', border: 'none', color: 'var(--accent-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
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
                            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--accent-border)', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', background: '#fdf8ff', color: 'var(--accent-deep)', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Reviewed Marks */}
                    <div style={{ padding: '0 20px 20px', background: '#fff' }}>
                      <div className="qr-modal-reviewed-marks">
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
            </ReviewSection>
          )}
        </div>

        {/* Footer */}
        <div className="qr-modal-footer">
          <div className="qr-modal-footer-left">
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
          <div className="qr-modal-footer-right">
            <button onClick={onClose} style={{ padding: '10px 22px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || Object.keys(errors).length > 0} style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,var(--brand),var(--brand-hover))', color: 'var(--brand-contrast)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: (saving || Object.keys(errors).length > 0) ? 0.7 : 1 }}>
              {saving ? <Loader2 size={14} style={{ animation: 'rSpin 1s linear infinite' }} /> : <CheckCircle size={14} />}
              {saving ? 'Saving...' : 'Save Review'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Bulk Confirm Modal ────────────────────────────────────────────────── */
function BulkConfirmModal({
  quizTitle, count, loading, onConfirm, onCancel
}: {
  quizTitle: string; count: number; loading: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.75)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 30px 80px rgba(0,0,0,0.28)', overflow: 'hidden', animation: 'bulkFadeIn 0.18s ease' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={22} color="#f59e0b" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Bulk Review Confirmation</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 }}>Please review before proceeding</div>
          </div>
          <button onClick={onCancel} disabled={loading} style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 15, color: '#1e293b', fontWeight: 600, lineHeight: 1.65 }}>
            You are about to mark{' '}
            <strong style={{ color: 'var(--brand-text)' }}>{count} unreviewed submission{count !== 1 ? 's' : ''}</strong>{' '}
            as <strong style={{ color: '#16a34a' }}>Reviewed</strong> for:
          </p>
          <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#334155', fontWeight: 700, marginBottom: 18 }}>
            📋 {quizTitle}
          </div>
          <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e', lineHeight: 1.65 }}>
            <strong>⚠ Note:</strong> Existing Section&nbsp;B marks are preserved. Only students not yet reviewed will be affected.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{ padding: '10px 22px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.75 : 1, boxShadow: '0 4px 12px rgba(22,163,74,0.35)' }}
          >
            {loading
              ? <Loader2 size={14} style={{ animation: 'rSpin 1s linear infinite' }} />
              : <CheckSquare size={14} />}
            {loading ? 'Processing…' : `Yes, Mark All (${count})`}
          </button>
        </div>
      </div>
      <style>{`@keyframes bulkFadeIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }`}</style>
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

  // Only quizzes students have taken are listed; if the list can't be loaded, fall back to showing every quiz.
  const { data: takenIds, isLoading: loadingTaken, isError: takenError } = useQuery({
    queryKey: ['taken-quiz-ids'],
    queryFn: getTakenQuizIds,
    retry: false,
  });
  const taken = new Set((takenIds ?? []).map(Number));

  const takenQuizzes: any[] = [...(Array.isArray(rawQuizzes) ? rawQuizzes : (rawQuizzes as any)?.quizzes || [])]
    .filter((q: any) => takenError || taken.has(Number(q.qId)))
    .sort((a: any, b: any) => b.qId - a.qId);

  /* ── Filters ── */
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [review, setReview] = useState('');
  const filtersOn = !!(search.trim() || course || type || status || review);
  const clearFilters = () => { setSearch(''); setCourse(''); setType(''); setStatus(''); setReview(''); };

  const courseOptions = useMemo(
    () => [...new Set(takenQuizzes.map(q => q.category?.title).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    [rawQuizzes, takenIds] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Same queries (and cache) as each row's results table, so the review filter adds no extra requests.
  const reportQueries = useQueries({
    queries: takenQuizzes.map(q => ({ queryKey: ['quiz-reports', q.qId], queryFn: () => getReportByQuizId(q.qId) })),
  });
  const pendingOf = new Map<number, number | undefined>();
  takenQuizzes.forEach((q, i) => {
    const rows = reportQueries[i]?.data as any[] | undefined;
    pendingOf.set(q.qId, rows ? rows.filter(r => !r.isReviewed).length : undefined);
  });

  const term = search.trim().toLowerCase();
  const quizzes = takenQuizzes.filter(q => {
    if (term && !String(q.title ?? '').toLowerCase().includes(term)) return false;
    if (course && q.category?.title !== course) return false;
    if (type && q.quizType !== type) return false;
    if (status && q.status !== status) return false;
    if (review) {
      const pending = pendingOf.get(q.qId);
      if (pending === undefined) return false;                       // still loading this quiz's results
      if (review === 'pending' ? pending === 0 : pending > 0) return false;
    }
    return true;
  });

  return (
    <div className="page-container">
      <Toaster position="top-right" />

      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--brand),var(--brand-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>Quiz Review Panel</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{tx("Review student submissions and assign marks")}</p>
          </div>
        </div>
      </div>

      {adminMode && <div style={{ marginBottom: 24 }}><ReportEmailToggle /></div>}

      {/* Filters */}
      {!(isLoading || loadingTaken) && takenQuizzes.length > 0 && (
        <div className="qr-filters-wrap">
          <div className="qr-filters" role="search">
            <div className="qr-field qr-search">
              <label className="qr-field-label" htmlFor="qr-f-search">{tx("Quiz name")}</label>
              <Search size={15} className="qr-search-icon" aria-hidden="true" />
              <input id="qr-f-search" className="qr-input" type="search" placeholder={tx("Search quiz name…")}
                value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
              {search && (
                <button type="button" className="qr-search-clear" onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>
              )}
            </div>
            <div className="qr-field">
              <label className="qr-field-label" htmlFor="qr-f-course">{tx("Course")}</label>
              <select id="qr-f-course" className="qr-input" value={course} onChange={e => setCourse(e.target.value)}>
                <option value="">{tx("All courses")}</option>
                {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="qr-field">
              <label className="qr-field-label" htmlFor="qr-f-type">Type</label>
              <select id="qr-f-type" className="qr-input" value={type} onChange={e => setType(e.target.value)}>
                <option value="">All types</option>
                <option value="OBJ">Objective</option>
                <option value="THEORY">Theory</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div className="qr-field">
              <label className="qr-field-label" htmlFor="qr-f-status">Status</label>
              <select id="qr-f-status" className="qr-input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">Open &amp; closed</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="qr-field">
              <label className="qr-field-label" htmlFor="qr-f-review">Review</label>
              <select id="qr-f-review" className="qr-input" value={review} onChange={e => setReview(e.target.value)}>
                <option value="">Any review status</option>
                <option value="pending">Pending review</option>
                <option value="done">All reviewed</option>
              </select>
            </div>
            <button type="button" className="qr-clear" onClick={clearFilters} disabled={!filtersOn}>
              <X size={14} /> Clear
            </button>
          </div>
          <div className="qr-filter-meta" aria-live="polite">
            <span>Showing <strong>{quizzes.length}</strong> of <strong>{takenQuizzes.length}</strong> {tx(takenQuizzes.length === 1 ? 'quiz' : 'quizzes')}</span>
            {filtersOn && <span>Filters applied</span>}
          </div>
        </div>
      )}

      {/* Quiz List */}
      {(isLoading || loadingTaken) ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Loader2 size={40} style={{ animation: 'rSpin 1s linear infinite', color: 'var(--brand-text)' }} />
          <p style={{ color: '#64748b', marginTop: 16 }}>Loading quizzes...</p>
        </div>
      ) : takenQuizzes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <BookOpen size={56} color="#cbd5e1" />
          <p style={{ color: '#94a3b8', marginTop: 16 }}>{tx("No quizzes have been taken by students yet.")}</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 16px' }}>
          <Search size={44} color="#cbd5e1" />
          <p style={{ color: '#94a3b8', margin: '14px 0 16px' }}>{tx("No quizzes match these filters.")}</p>
          <button type="button" className="qr-clear" onClick={clearFilters} style={{ margin: '0 auto' }}>
            <X size={14} /> Clear filters
          </button>
        </div>
      ) : (
        <div className="qr-list">
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
      <style>{RESPONSIVE_CSS}</style>
    </div>
  );
}

/* ── Quiz Row ──────────────────────────────────────────────────────────── */
function QuizRow({ quiz, expanded, onToggle, onReview }: { quiz: any; expanded: boolean; onToggle: () => void; onReview: (s: any) => void }) {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['quiz-reports', quiz.qId],
    queryFn: () => getReportByQuizId(quiz.qId),
  });
  const queryClient = useQueryClient();
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Every attempt of every student for this quiz (one request), grouped by student.
  const { data: attemptRows = [] } = useQuery<any[]>({
    queryKey: ['quiz-attempts', quiz.qId],
    queryFn: () => getQuizAttempts(quiz.qId),
    enabled: expanded,
    retry: false,
  });
  const attemptsByStudent = new Map<number, AttemptRow[]>();
  (attemptRows as AttemptRow[]).forEach(a => attemptsByStudent.set(a.userId, [...(attemptsByStudent.get(a.userId) ?? []), a]));
  const [attemptsTarget, setAttemptsTarget] = useState<{ id: number; name: string } | null>(null);

  const totalTaken = reports.length;
  const totalReviewed = reports.filter((r: any) => r.isReviewed).length;
  const notReviewed = totalTaken - totalReviewed;

  /* ── Bulk Review Handler ── */
  const handleBulkReview = async () => {
    const unreviewed = (reports as any[]).filter((r: any) => !r.isReviewed);
    if (unreviewed.length === 0) return;
    setBulkLoading(true);
    let failed = 0;
    await Promise.all(
      unreviewed.map((r: any) =>
        saveReviewedMarks({
          userId: r.user?.id,
          quizId: quiz.qId,
          marksB: r.marksB || 0,
          isReviewed: true,
          comments: {},
          reviewedMarks: {},
        }).catch(() => { failed++; })
      )
    );
    setBulkLoading(false);
    setBulkConfirmOpen(false);
    queryClient.invalidateQueries({ queryKey: ['quiz-reports', quiz.qId] });
    if (failed > 0) {
      toast.error(`${failed} submission(s) could not be marked.`);
    } else {
      toast.success(`All ${unreviewed.length} submission(s) marked as Reviewed!`);
    }
  };

  const typeColor: Record<string, string> = { OBJ: 'var(--brand)', THEORY: '#fd625e', BOTH: '#f59e0b' };
  const color = typeColor[quiz.quizType] || 'var(--brand-text)';

  return (
    <div className="quiz-row-container">
      {/* Quiz Header Row */}
      <div
        onClick={onToggle}
        className="quiz-row-header"
        style={{ background: expanded ? '#fafafe' : '#fff' }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `color-mix(in srgb, ${color} 9.4%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={20} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="quiz-row-meta">
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quiz.title}</span>
            <span style={{ background: `color-mix(in srgb, ${color} 9.4%, transparent)`, color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', flexShrink: 0 }}>{quiz.quizType}</span>
            <span style={{ background: quiz.status === 'OPEN' ? '#ecfdf5' : '#f1f5f9', color: quiz.status === 'OPEN' ? '#16a34a' : '#94a3b8', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{quiz.status}</span>
          </div>
          <div className="quiz-row-info">
            <span>{quiz.category?.title || 'Uncategorized'}</span>
            <span>Max: {quiz.maxMarks ?? '—'} marks</span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>Taken: {totalTaken}</span>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>Reviewed: {totalReviewed}</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>Not Reviewed: {notReviewed}</span>
          </div>
        </div>
        <QuizEmailReportToggle quizId={quiz.qId} initial={!!quiz.emailReportOnReview} />
        <div className="quiz-row-stats">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{quiz.numberOfQuestions || 0}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Questions</div>
          </div>
          <div style={{ width: 1, height: 36, background: '#e2e8f0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-text)' }}>
            <Users size={16} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{tx("Students")}</span>
          </div>
          {expanded ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronRight size={18} color="#94a3b8" />}
        </div>
      </div>

      {/* Expanded: Student List */}
      {expanded && (
        <div className="resp-table-wrapper">
          <QuizReportLinks quizId={quiz.qId} />
          {(quiz.quizType === 'THEORY' || quiz.quizType === 'BOTH') && <MarkingStatus quizId={quiz.qId} />}
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Loader2 size={24} style={{ animation: 'rSpin 1s linear infinite', color: 'var(--brand-text)' }} />
              <p style={{ color: '#64748b', marginTop: 8, fontSize: 13 }}>{tx("Loading student submissions...")}</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Users size={32} color="#cbd5e1" />
              <p style={{ color: '#94a3b8', marginTop: 8, fontSize: 13 }}>{tx("No students have taken this quiz yet.")}</p>
            </div>
          ) : (
            <>
              {/* ── Bulk Review Toolbar ── */}
              <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: notReviewed > 0 ? '#92400e' : '#16a34a' }}>
                  {notReviewed > 0
                    ? `⏳ ${notReviewed} submission${notReviewed !== 1 ? 's' : ''} pending review`
                    : '✓ All submissions have been reviewed'}
                </span>
                {notReviewed > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setBulkConfirmOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(22,163,74,0.3)', transition: 'opacity 0.2s' }}
                  >
                    <CheckSquare size={13} /> Mark All as Reviewed
                  </button>
                )}
              </div>

              <table className="resp-table">
                <thead>
                  <tr>
                    {['Student', 'Submission', 'Sec A', 'Sec B', 'Grade', 'Attempts', 'Action'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: any, i: number) => {
                    const name = `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || r.user?.username || 'Unknown';
                    const date = r.submissionDate ? new Date(r.submissionDate).toLocaleDateString() : '—';
                    return (
                      <tr key={r.id || i}>
                        <td data-label="Student">
                          <div className="resp-td-content" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eff6ff', color: 'var(--brand-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{name}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.user?.email || r.user?.username || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Submission">
                          <div className="resp-td-content" style={{ fontSize: 13, color: '#64748b' }}>{date}</div>
                        </td>
                        <td data-label="Sec A">
                          <div className="resp-td-content">
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--brand-text)' }}>{r.marks ?? '—'}</span>
                          </div>
                        </td>
                        <td data-label="Sec B">
                          <div className="resp-td-content">
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#2ab57d' }}>{r.marksB ?? '—'}</span>
                          </div>
                        </td>
                        <td data-label="Grade">
                          <div className="resp-td-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span style={{ background: r.grade ? '#ecfdf5' : '#f1f5f9', color: r.grade ? '#16a34a' : '#94a3b8', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>
                              {r.grade || 'N/A'}
                            </span>
                            {r.isReviewed && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#16a34a', fontWeight: 700 }}>
                                <CheckCircle size={10} /> REVIEWED
                              </div>
                            )}
                          </div>
                        </td>
                        <td data-label="Attempts">
                          <div className="resp-td-content">
                            {(() => {
                              const mine = attemptsByStudent.get(r.user?.id) ?? [];
                              const used = mine.filter(a => a.status !== 'VOIDED').length;
                              const max = quiz.maxAttempts ?? 1;
                              return (
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>
                                  {mine.length === 0 ? '—' : `${used} / ${max}`}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td data-label="Action">
                          <div className="resp-td-content" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setAttemptsTarget({ id: r.user?.id, name })}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid var(--brand-border)', borderRadius: 8, background: '#fff', color: 'var(--brand-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              <RotateCcw size={13} /> Attempts
                            </button>
                            <button
                              onClick={() => onReview(r)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,var(--brand),var(--brand-hover))', color: 'var(--brand-contrast)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              <Award size={13} /> Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {attemptsTarget && (
        <QuizAttemptsModal
          quiz={quiz}
          student={attemptsTarget}
          attempts={attemptsByStudent.get(attemptsTarget.id) ?? []}
          reviewed={!!(reports as any[]).find((r: any) => r.user?.id === attemptsTarget.id)?.isReviewed}
          onClose={() => setAttemptsTarget(null)}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ['quiz-attempts', quiz.qId] })}
        />
      )}

      {/* Bulk Confirm Modal */}
      {bulkConfirmOpen && (
        <BulkConfirmModal
          quizTitle={quiz.title}
          count={notReviewed}
          loading={bulkLoading}
          onConfirm={handleBulkReview}
          onCancel={() => setBulkConfirmOpen(false)}
        />
      )}
    </div>
  );
}
