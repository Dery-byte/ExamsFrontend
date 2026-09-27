import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Library, Loader2, X, Shuffle, Upload } from 'lucide-react';
import { drawBankIntoQuiz, getBankForCourse, importQuizIntoBank } from '../../api/endpoints';

type Mode = 'draw' | 'import';

/**
 * Question-bank actions for one quiz:
 *  - draw: add random questions from the course's bank (filtered by topic / difficulty / type);
 *  - import: save this quiz's questions into the course's bank.
 */
export default function QuizBankDialog({ quizId, courseId, mode, onClose, onDone }: {
  quizId: number; courseId: number | null; mode: Mode; onClose: () => void; onDone: () => void;
}) {
  const [topics, setTopics] = useState<string[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [count, setCount] = useState(10);
  const [importTopic, setImportTopic] = useState('');
  const [importDifficulty, setImportDifficulty] = useState('MEDIUM');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== 'draw' || !courseId) return;
    getBankForCourse(courseId)
      .then((d: any) => { setTopics(d.topics ?? []); setAvailable((d.questions ?? []).length); })
      .catch(() => setAvailable(0));
  }, [mode, courseId]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const run = async () => {
    setBusy(true);
    try {
      if (mode === 'draw') {
        const res = await drawBankIntoQuiz(quizId, { topic, difficulty, questionType, count });
        toast.success(`Added ${res.added} question(s) — quiz now has ${res.totalInQuiz}`);
      } else {
        const res = await importQuizIntoBank(quizId, { topic: importTopic, difficulty: importDifficulty });
        toast.success(`Saved ${res.added} question(s) to the bank${res.skipped ? ` (${res.skipped} already there)` : ''}`);
      }
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="qbd-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={mode === 'draw' ? 'Add questions from bank' : 'Save questions to bank'} className="qbd-modal">
        <div className="qbd-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'draw' ? <Shuffle size={18} color="#5156be" /> : <Upload size={18} color="#5156be" />}
            <strong style={{ fontSize: 15, color: '#1e293b' }}>{mode === 'draw' ? 'Add questions from the bank' : 'Save these questions to the bank'}</strong>
          </div>
          <button onClick={onClose} aria-label="Close" className="qbd-x"><X size={16} /></button>
        </div>

        {!courseId ? (
          <p style={{ color: '#64748b', fontSize: 13 }}>This quiz isn't linked to a course, so it has no question bank.</p>
        ) : mode === 'draw' ? (
          <>
            <p className="qbd-note">
              <Library size={13} /> {available == null ? 'Loading bank…' : `${available} question(s) in this course's bank.`} Questions already in the quiz are skipped.
            </p>
            <label className="qbd-label" htmlFor="qbd-topic">Topic</label>
            <select id="qbd-topic" className="qbd-input" value={topic} onChange={e => setTopic(e.target.value)}>
              <option value="">Any topic</option>
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="qbd-label" htmlFor="qbd-diff">Difficulty</label>
                <select id="qbd-diff" className="qbd-input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="">Any</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                </select>
              </div>
              <div>
                <label className="qbd-label" htmlFor="qbd-type">Type</label>
                <select id="qbd-type" className="qbd-input" value={questionType} onChange={e => setQuestionType(e.target.value)}>
                  <option value="">Any</option><option value="MCQ">Multiple choice</option><option value="TRUE_FALSE">True / False</option><option value="MATCHING">Matching</option>
                </select>
              </div>
            </div>
            <label className="qbd-label" htmlFor="qbd-count">How many (picked at random)</label>
            <input id="qbd-count" type="number" min={1} max={200} className="qbd-input" value={count}
              onChange={e => setCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} />
          </>
        ) : (
          <>
            <p className="qbd-note"><Library size={13} /> Every objective question in this quiz is copied into the course's bank. Duplicates are skipped.</p>
            <label className="qbd-label" htmlFor="qbd-itopic">Topic tag (optional)</label>
            <input id="qbd-itopic" className="qbd-input" value={importTopic} onChange={e => setImportTopic(e.target.value)} placeholder="Defaults to the quiz title" />
            <label className="qbd-label" htmlFor="qbd-idiff">Difficulty</label>
            <select id="qbd-idiff" className="qbd-input" value={importDifficulty} onChange={e => setImportDifficulty(e.target.value)}>
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button onClick={onClose} className="qbd-btn-ghost">Cancel</button>
          <button onClick={run} disabled={busy || !courseId} className="qbd-btn">
            {busy && <Loader2 size={14} className="qbd-spin" />} {mode === 'draw' ? 'Add to quiz' : 'Save to bank'}
          </button>
        </div>
      </div>
      <style>{`
        .qbd-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .qbd-modal { width: 100%; max-width: 440px; background: #fff; border-radius: 14px; padding: 18px; box-shadow: 0 20px 50px rgba(15,23,42,0.25); }
        .qbd-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .qbd-x { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e9ecef; background: #f8f9fa; color: #74788d; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .qbd-note { display: flex; gap: 6px; align-items: flex-start; font-size: 12.5px; color: #475569; background: #f8fafc; border: 1px solid #eef0f4; border-radius: 8px; padding: 8px 10px; margin: 0 0 12px; line-height: 1.45; }
        .qbd-label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 5px; }
        .qbd-input { width: 100%; box-sizing: border-box; height: 38px; padding: 0 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; margin-bottom: 12px; background: #fff; color: #1e293b; }
        .qbd-btn { display: flex; align-items: center; gap: 6px; height: 38px; padding: 0 16px; border: none; border-radius: 8px; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; }
        .qbd-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .qbd-btn-ghost { height: 38px; padding: 0 14px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; font-size: 13px; cursor: pointer; }
        .qbd-spin { animation: qbd-spin 1s linear infinite; }
        @keyframes qbd-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body,
  );
}
