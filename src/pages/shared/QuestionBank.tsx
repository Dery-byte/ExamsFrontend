import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Library, Plus, Search, Pencil, Trash2, Loader2, X, Check, BookOpen } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import QuestionImage from '../../components/ui/QuestionImage';
import QuestionImageField from '../../components/ui/QuestionImageField';
import {
  addBankQuestion, deleteBankQuestion, getBankCourses, getBankForCourse, updateBankQuestion, uploadQuestionImage,
} from '../../api/endpoints';
import { tx } from '../../utils/terms';

const TYPE_LABEL: Record<string, string> = { MCQ: 'Multiple choice', TRUE_FALSE: 'True / False', MATCHING: 'Matching', FILL_BLANK: 'Fill in the blank', NUMERIC: 'Numeric', THEORY: 'Theory (written answer)' };
const DIFF_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  EASY: { bg: '#eefbee', fg: '#0b7a0b', label: 'Easy' },
  MEDIUM: { bg: '#fff7e6', fg: '#8a5a00', label: 'Medium' },
  HARD: { bg: '#fdeeee', fg: '#9f1f1f', label: 'Hard' },
};

/** Question text may be HTML from the rich-text editor; show it as plain text. */
function plainText(html: string) {
  return new DOMParser().parseFromString(html ?? '', 'text/html').body.textContent ?? '';
}

type Form = {
  id?: number; topic: string; difficulty: string; questionType: string; content: string; image: string | null;
  options: string[]; correct: string[]; pairs: { prompt: string; answer: string }[]; tolerance: string;
  marks: string; markingGuide: string;
};
const EMPTY: Form = {
  topic: '', difficulty: 'MEDIUM', questionType: 'MCQ', content: '', image: null,
  options: ['', '', '', ''], correct: [], pairs: [{ prompt: '', answer: '' }, { prompt: '', answer: '' }], tolerance: '',
  marks: '', markingGuide: '',
};

/** Per-course question bank: browse, filter, add, edit and delete reusable questions. */
export default function QuestionBank() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState<Form | null>(null);

  const courses = useQuery({ queryKey: ['bank', 'courses'], queryFn: getBankCourses });
  const bank = useQuery({
    queryKey: ['bank', 'course', courseId],
    queryFn: () => getBankForCourse(courseId!),
    enabled: courseId != null,
  });

  useEffect(() => {
    if (courseId == null && courses.data?.length) setCourseId(courses.data[0].courseId);
  }, [courses.data, courseId]);

  const questions: any[] = bank.data?.questions ?? [];
  const filtered = useMemo(() => questions.filter(q => {
    const s = search.toLowerCase();
    return (!s || q.content.toLowerCase().includes(s) || (q.topic ?? '').toLowerCase().includes(s))
      && (!topicFilter || q.topic === topicFilter)
      && (!diffFilter || q.difficulty === diffFilter)
      && (!typeFilter || q.questionType === typeFilter);
  }), [questions, search, topicFilter, diffFilter, typeFilter]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['bank'] });

  const remove = async (q: any) => {
    const ok = await Swal.fire({ title: 'Delete this question?', text: 'Quizzes that already use it keep their copy.', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#e34948' });
    if (!ok.isConfirmed) return;
    try { await deleteBankQuestion(q.id); toast.success('Question deleted'); refresh(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Could not delete'); }
  };

  const openEdit = (q: any) => setEditing({
    id: q.id, topic: q.topic ?? '', difficulty: q.difficulty, questionType: q.questionType, content: q.content, image: q.image,
    options: [q.option1 ?? '', q.option2 ?? '', q.option3 ?? '', q.option4 ?? ''],
    correct: q.correctAnswer ?? [],
    pairs: q.matchingPairs?.length ? q.matchingPairs : EMPTY.pairs,
    tolerance: q.tolerance != null ? String(q.tolerance) : '',
    marks: q.marks != null ? String(q.marks) : '', markingGuide: q.markingGuide ?? '',
  });

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Question Bank" breadcrumbs={['Assessments', 'Question Bank']} />

      {courses.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={26} color="#5156be" className="qb-spin" /></div>
      ) : !courses.data?.length ? (
        <div className="qb-card qb-empty"><BookOpen size={32} /><p>{tx("You don't manage any courses yet, so there is no bank to show.")}</p></div>
      ) : (
        <div className="qb-grid">
          {/* Course list */}
          <nav className="qb-card" aria-label={tx("Courses")} style={{ alignSelf: 'start' }}>
            <div className="qb-side-head">{tx("Courses")}</div>
            {courses.data.map((c: any) => (
              <button key={c.courseId} onClick={() => { setCourseId(c.courseId); setTopicFilter(''); }}
                className={`qb-course ${courseId === c.courseId ? 'is-active' : ''}`} aria-current={courseId === c.courseId}>
                <span style={{ minWidth: 0 }}>
                  <strong>{c.courseCode}</strong>
                  <span className="qb-course-title">{c.title}</span>
                </span>
                <span className="qb-count">{c.questionCount}</span>
              </button>
            ))}
          </nav>

          {/* Questions */}
          <section className="qb-card">
            <div className="qb-toolbar">
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
                <input aria-label="Search questions" className="qb-input" style={{ paddingLeft: 28 }} placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select aria-label="Topic" className="qb-input qb-select" value={topicFilter} onChange={e => setTopicFilter(e.target.value)}>
                <option value="">All topics</option>
                {(bank.data?.topics ?? []).map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select aria-label="Difficulty" className="qb-input qb-select" value={diffFilter} onChange={e => setDiffFilter(e.target.value)}>
                <option value="">All difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
              </select>
              <select aria-label="Type" className="qb-input qb-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All types</option>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button className="qb-btn" onClick={() => setEditing({ ...EMPTY })} disabled={courseId == null}><Plus size={15} /> Add question</button>
            </div>

            <div className="qb-meta">{filtered.length} of {questions.length} question{questions.length !== 1 ? 's' : ''}</div>

            {bank.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={22} color="#5156be" className="qb-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="qb-empty"><Library size={30} />
                <p>{questions.length ? 'No questions match these filters.' : 'This bank is empty. Add questions here, or use "Save to bank" on any quiz\'s questions page.'}</p>
              </div>
            ) : filtered.map(q => {
              const d = DIFF_STYLE[q.difficulty] ?? DIFF_STYLE.MEDIUM;
              return (
                <article key={q.id} className="qb-item">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="qb-tags">
                        <span className="qb-tag">{TYPE_LABEL[q.questionType]}</span>
                        <span className="qb-tag" style={{ background: d.bg, color: d.fg }}>{d.label}</span>
                        {q.topic && <span className="qb-tag">{q.topic}</span>}
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Used {q.timesUsed}×</span>
                      </div>
                      <div className="qb-content">{plainText(q.content)}</div>
                      {q.image && <QuestionImage src={q.image} style={{ maxHeight: 120, marginTop: 6 }} />}
                      {q.questionType === 'THEORY' ? (
                        <div className="qb-theory">
                          <span className="qb-marks">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
                          {q.markingGuide
                            ? <div><strong>Marking guide:</strong> {plainText(q.markingGuide)}</div>
                            : <div style={{ color: '#94a3b8' }}>No marking guide</div>}
                        </div>
                      ) : q.questionType === 'FILL_BLANK' || q.questionType === 'NUMERIC' ? (
                        <ul className="qb-opts">
                          <li style={{ color: '#0b7a0b', fontWeight: 700 }}>
                            <Check size={12} /> {q.questionType === 'NUMERIC'
                              ? `${q.correctAnswer?.[0] ?? ''}${q.tolerance ? ` (± ${q.tolerance})` : ' (exact)'}`
                              : (q.correctAnswer ?? []).join('  /  ')}
                          </li>
                        </ul>
                      ) : q.questionType === 'MATCHING' ? (
                        <ul className="qb-opts">{q.matchingPairs.map((p: any, i: number) => <li key={i}>{p.prompt} → <strong>{p.answer}</strong></li>)}</ul>
                      ) : (
                        <ul className="qb-opts">
                          {[q.option1, q.option2, q.option3, q.option4].filter(Boolean).map((o: string) => {
                            const ok = q.correctAnswer.includes(o);
                            return <li key={o} style={ok ? { color: '#0b7a0b', fontWeight: 700 } : undefined}>{ok && <Check size={12} />} {o}</li>;
                          })}
                        </ul>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="qb-icon" onClick={() => openEdit(q)} aria-label="Edit question"><Pencil size={14} /></button>
                      <button className="qb-icon qb-icon-danger" onClick={() => remove(q)} aria-label="Delete question"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      )}

      {editing && courseId != null && (
        <BankQuestionEditor initial={editing} courseId={courseId} topics={bank.data?.topics ?? []}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      )}

      <style>{`
        .qb-grid { display: grid; grid-template-columns: 260px 1fr; gap: 16px; align-items: start; }
        .qb-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.05); }
        .qb-side-head { padding: 12px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #f1f5f9; }
        .qb-course { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 14px; border: none; border-bottom: 1px solid #f8fafc; background: #fff; text-align: left; cursor: pointer; font-family: inherit; }
        .qb-course strong { display: block; font-size: 13px; color: #1e293b; }
        .qb-course-title { display: block; font-size: 11.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .qb-course.is-active { background: #eef0ff; }
        .qb-count { font-size: 11px; font-weight: 800; color: #4338ca; background: #e0e7ff; border-radius: 10px; padding: 2px 8px; flex-shrink: 0; }
        .qb-toolbar { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #f1f5f9; }
        .qb-input { height: 36px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; padding: 0 10px; background: #f8fafc; color: #1e293b; width: 100%; box-sizing: border-box; font-family: inherit; }
        .qb-select { width: auto; flex: 0 1 150px; }
        .qb-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: none; border-radius: 8px; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .qb-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .qb-meta { padding: 8px 16px; font-size: 12px; color: #94a3b8; }
        .qb-item { padding: 14px 16px; border-top: 1px solid #f4f5f8; }
        .qb-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
        .qb-tag { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #475569; }
        .qb-content { font-size: 14px; color: #1e293b; line-height: 1.5; overflow-wrap: anywhere; }
        .qb-content p { margin: 0; }
        .qb-theory { font-size: 12.5px; color: #475569; margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
        .qb-marks { align-self: flex-start; background: #eef2ff; color: #4338ca; font-weight: 700; font-size: 11.5px; padding: 2px 8px; border-radius: 6px; }
        .qb-opts { margin: 6px 0 0; padding-left: 18px; font-size: 13px; color: #475569; }
        .qb-opts li { margin: 2px 0; }
        .qb-icon { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .qb-icon-danger { border-color: #fee2e2; background: #fff5f5; color: #e34948; }
        .qb-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 44px 20px; color: #94a3b8; text-align: center; font-size: 13px; }
        .qb-empty p { margin: 0; max-width: 380px; }
        .qb-spin { animation: qb-spin 1s linear infinite; }
        @keyframes qb-spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) { .qb-grid { grid-template-columns: 1fr; } .qb-select { flex: 1 1 140px; } }
      `}</style>
    </div>
  );
}

function BankQuestionEditor({ initial, courseId, topics, onClose, onSaved }: {
  initial: Form; courseId: number; topics: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<Form>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(p => ({ ...p, [k]: v }));

  const options = f.questionType === 'TRUE_FALSE' ? ['True', 'False'] : f.options;

  const toggleCorrect = (opt: string) => {
    if (!opt) return;
    if (f.questionType === 'TRUE_FALSE') { set('correct', [opt]); return; }
    set('correct', f.correct.includes(opt) ? f.correct.filter(c => c !== opt) : [...f.correct, opt]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const typed = f.questionType === 'FILL_BLANK' || f.questionType === 'NUMERIC';
      const accepted = f.correct.map(c => c.trim()).filter(Boolean);
      if (typed && !accepted.length) { toast.error(f.questionType === 'NUMERIC' ? 'Enter the correct number' : 'Enter at least one accepted answer'); return; }
      const tolerance = f.questionType === 'NUMERIC' && f.tolerance.trim() !== '' ? Number(f.tolerance) : null;
      if (tolerance !== null && (isNaN(tolerance) || tolerance < 0)) { toast.error('Tolerance must be 0 or more'); return; }
      const theory = f.questionType === 'THEORY';
      const marks = Number(f.marks);
      if (theory && (!f.marks.trim() || isNaN(marks) || marks <= 0)) { toast.error('Give the question its marks (more than 0)'); return; }
      const image = file ? await uploadQuestionImage(file) : f.image;
      const payload = theory ? {
        topic: f.topic, difficulty: f.difficulty, questionType: 'THEORY', content: f.content, image,
        marks, markingGuide: f.markingGuide,
      } : typed ? {
        topic: f.topic, difficulty: f.difficulty, questionType: f.questionType, content: f.content, image,
        correctAnswer: f.questionType === 'NUMERIC' ? [accepted[0]] : accepted, tolerance,
      } : {
        topic: f.topic, difficulty: f.difficulty, questionType: f.questionType, content: f.content, image,
        option1: options[0], option2: options[1], option3: options[2] ?? '', option4: options[3] ?? '',
        correctAnswer: f.correct.filter(c => options.includes(c)),
        matchingPairs: f.pairs,
      };
      if (f.id) await updateBankQuestion(f.id, payload);
      else await addBankQuestion(courseId, payload);
      toast.success(f.id ? 'Question updated' : 'Question added to bank');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not save the question');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="qbe-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={f.id ? 'Edit bank question' : 'Add bank question'} className="qbe-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontSize: 15, color: '#1e293b' }}>{f.id ? 'Edit question' : 'Add question to bank'}</strong>
          <button onClick={onClose} aria-label="Close" className="qb-icon"><X size={15} /></button>
        </div>

        <div className="qbe-row3">
          <div>
            <label className="qbe-label" htmlFor="qbe-type">Type</label>
            <select id="qbe-type" className="qb-input" value={f.questionType} onChange={e => setF(p => ({ ...p, questionType: e.target.value, correct: [] }))}>
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="qbe-label" htmlFor="qbe-diff">Difficulty</label>
            <select id="qbe-diff" className="qb-input" value={f.difficulty} onChange={e => set('difficulty', e.target.value)}>
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <label className="qbe-label" htmlFor="qbe-topic">Topic</label>
            <input id="qbe-topic" className="qb-input" list="qbe-topics" value={f.topic} onChange={e => set('topic', e.target.value)} placeholder="e.g. Loops" />
            <datalist id="qbe-topics">{topics.map(t => <option key={t} value={t} />)}</datalist>
          </div>
        </div>

        <label className="qbe-label" htmlFor="qbe-content">Question</label>
        <textarea id="qbe-content" className="qb-input" rows={3} style={{ height: 'auto', padding: 8, resize: 'vertical' }}
          value={f.content} onChange={e => set('content', e.target.value)} />

        <div style={{ margin: '10px 0' }}>
          <QuestionImageField file={file} onFileChange={setFile} existing={f.image} onRemoveExisting={() => set('image', null)} />
        </div>

        {f.questionType === 'THEORY' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, alignItems: 'start' }}>
              <div>
                <label className="qbe-label" htmlFor="qbe-marks">Marks</label>
                <input id="qbe-marks" className="qb-input" inputMode="decimal" value={f.marks} placeholder="e.g. 10"
                  onChange={e => set('marks', e.target.value)} />
              </div>
              <div>
                <label className="qbe-label" htmlFor="qbe-guide">Marking guide (optional)</label>
                <textarea id="qbe-guide" className="qb-input" rows={4} style={{ height: 'auto', padding: 8, resize: 'vertical' }}
                  value={f.markingGuide} onChange={e => set('markingGuide', e.target.value)}
                  placeholder="Points a full answer covers and how marks are shared; used by markers and the AI evaluator." />
              </div>
            </div>
            <p className="qbe-note">When drawn into a quiz this goes to Section B (written answers) as the next question number, e.g. Q4.</p>
          </>
        ) : f.questionType === 'FILL_BLANK' ? (
          <>
            <div className="qbe-label">Accepted answers (case, extra spaces and a final full stop are ignored)</div>
            {(f.correct.length ? f.correct : ['']).map((a, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input aria-label={`Accepted answer ${i + 1}`} className="qb-input" value={a} placeholder={i === 0 ? 'e.g. photosynthesis' : 'Another spelling (optional)'}
                  onChange={e => set('correct', arr.map((x, j) => j === i ? e.target.value : x))} />
                <button className="qb-icon qb-icon-danger" aria-label="Remove answer" disabled={arr.length <= 1}
                  onClick={() => set('correct', arr.filter((_, j) => j !== i))}><X size={13} /></button>
              </div>
            ))}
            <button className="qbe-link" onClick={() => set('correct', [...(f.correct.length ? f.correct : ['']), ''])}><Plus size={13} /> Add accepted answer</button>
          </>
        ) : f.questionType === 'NUMERIC' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="qbe-label" htmlFor="qbe-num">Correct answer</label>
              <input id="qbe-num" className="qb-input" inputMode="decimal" value={f.correct[0] ?? ''} placeholder="e.g. 36"
                onChange={e => set('correct', [e.target.value])} />
            </div>
            <div>
              <label className="qbe-label" htmlFor="qbe-tol">Tolerance (±)</label>
              <input id="qbe-tol" className="qb-input" inputMode="decimal" value={f.tolerance} placeholder="0 = exact"
                onChange={e => set('tolerance', e.target.value)} />
            </div>
          </div>
        ) : f.questionType === 'MATCHING' ? (
          <>
            <div className="qbe-label">Pairs (left → correct right)</div>
            {f.pairs.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 6, marginBottom: 6 }}>
                <input aria-label={`Prompt ${i + 1}`} className="qb-input" value={p.prompt} placeholder="Prompt"
                  onChange={e => set('pairs', f.pairs.map((x, j) => j === i ? { ...x, prompt: e.target.value } : x))} />
                <input aria-label={`Answer ${i + 1}`} className="qb-input" value={p.answer} placeholder="Answer"
                  onChange={e => set('pairs', f.pairs.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))} />
                <button className="qb-icon qb-icon-danger" aria-label="Remove pair" disabled={f.pairs.length <= 2}
                  onClick={() => set('pairs', f.pairs.filter((_, j) => j !== i))}><X size={13} /></button>
              </div>
            ))}
            <button className="qbe-link" onClick={() => set('pairs', [...f.pairs, { prompt: '', answer: '' }])}><Plus size={13} /> Add pair</button>
          </>
        ) : (
          <>
            <div className="qbe-label">Options — tick the correct answer{f.questionType === 'MCQ' ? '(s)' : ''}</div>
            {options.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <input type={f.questionType === 'TRUE_FALSE' ? 'radio' : 'checkbox'} name="qbe-correct" aria-label={`Option ${i + 1} is correct`}
                  checked={!!o && f.correct.includes(o)} onChange={() => toggleCorrect(o)} disabled={!o}
                  style={{ width: 16, height: 16, accentColor: '#0b7a0b', flexShrink: 0 }} />
                {f.questionType === 'TRUE_FALSE' ? <span style={{ fontSize: 14 }}>{o}</span> : (
                  <input aria-label={`Option ${i + 1}`} className="qb-input" value={o} placeholder={`Option ${i + 1}${i > 1 ? ' (optional)' : ''}`}
                    onChange={e => {
                      const old = f.options[i];
                      const next = f.options.map((x, j) => j === i ? e.target.value : x);
                      setF(p => ({ ...p, options: next, correct: p.correct.map(c => c === old ? e.target.value : c) }));
                    }} />
                )}
              </div>
            ))}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} className="qbe-ghost">Cancel</button>
          <button onClick={save} disabled={saving} className="qb-btn">{saving && <Loader2 size={14} className="qb-spin" />} Save</button>
        </div>
      </div>
      <style>{`
        .qbe-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); z-index: 3000; display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; overflow-y: auto; }
        .qbe-modal { width: 100%; max-width: 620px; background: #fff; border-radius: 14px; padding: 18px; box-shadow: 0 20px 50px rgba(15,23,42,0.25); }
        .qbe-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .qbe-label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin: 4px 0 5px; }
        .qbe-note { font-size: 12px; color: #64748b; margin: 8px 0 0; }
        .qbe-link { display: inline-flex; align-items: center; gap: 4px; border: none; background: none; color: #5156be; font-weight: 700; font-size: 12.5px; cursor: pointer; padding: 4px 0; }
        .qbe-ghost { height: 36px; padding: 0 14px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; font-size: 13px; cursor: pointer; }
        @media (max-width: 560px) { .qbe-row3 { grid-template-columns: 1fr; } }
      `}</style>
    </div>,
    document.body,
  );
}
