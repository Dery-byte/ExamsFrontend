import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { addCategory, getPrograms } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { ArrowLeft, Loader2, GraduationCap, Check, Globe, BookPlus, Circle, CheckCircle2, User } from 'lucide-react';
import { isSchoolMode, periodsPerLevel, tx, defaultLevels, showLevelPicker } from '../../utils/terms';
import './AddCategory.css';

const RECOMMENDED_DESC = 30;

/**
 * New course (subject in a school). One form card in four short sections, a footer bar that stays in
 * view with the progress and the actions, and on wide screens a live preview of the course card with a
 * checklist of what is still missing. Validation and the request are unchanged.
 */
export default function AddCategory() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const isSuper = isSuperAdmin();
  const basePath = isSuper ? '/super-admin' : '/admin';
  const school = isSchoolMode();
  // Global courses (no programs) are open to every student; only the Super Admin can create them.
  const [isGlobal, setIsGlobal] = useState(false);
  // A global course can also be opened to everyone: every student takes its quizzes without registering
  const [openToEveryone, setOpenToEveryone] = useState(false);
  const [category, setCategory] = useState<{ title: string; courseCode: string; level: string; description: string; semester: string; programIds: number[]; creditUnits: string }>(
    { title: '', courseCode: '', level: '', description: '', semester: '', programIds: [], creditUnits: '3' });
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);
  const [programs, setPrograms] = useState<{ id: number; name: string; configuredLevels: number[]; semestersPerLevel: Record<number, number> }[]>([]);

  useEffect(() => {
    getPrograms().then(data => { if (Array.isArray(data)) setPrograms(data); }).catch(() => {});
  }, []);

  // Level/semester options follow the first selected program; global courses use the defaults
  const leadProgram = isGlobal ? undefined : programs.find(p => p.id === category.programIds[0]);
  const availableLevels = leadProgram
    ? (leadProgram.configuredLevels || []).map(l => String(l))
    : defaultLevels().map(String);
  // A school class is one year: its only level is chosen for the user and the picker stays hidden
  const pickLevel = showLevelPicker(availableLevels.length);
  useEffect(() => {
    if (!pickLevel && availableLevels[0] && category.level !== availableLevels[0]) setCategory(c => ({ ...c, level: availableLevels[0] }));
  }, [pickLevel, availableLevels[0], category.level]); // eslint-disable-line react-hooks/exhaustive-deps
  // A level that the newly chosen lead programme doesn't have is cleared
  useEffect(() => {
    if (pickLevel && category.level && !availableLevels.includes(category.level)) setCategory(c => ({ ...c, level: '' }));
  }, [availableLevels.join(','), pickLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  const semesterCount = leadProgram?.semestersPerLevel?.[Number(category.level)] || periodsPerLevel();
  useEffect(() => {
    if (category.semester && Number(category.semester) > semesterCount) setCategory(c => ({ ...c, semester: '' }));
  }, [semesterCount, category.semester]);

  const set = (k: 'title' | 'description' | 'creditUnits') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCategory(c => ({ ...c, [k]: e.target.value }));
  const toggleProgram = (id: number) => setCategory(c => ({
    ...c, programIds: c.programIds.includes(id) ? c.programIds.filter(x => x !== id) : [...c.programIds, id],
  }));

  // What's still missing (also drives the checklist and the footer count)
  const checks = [
    { key: 'title', label: tx('Course title'), ok: !!category.title.trim() },
    { key: 'code', label: tx('Course code'), ok: !!category.courseCode.trim() },
    { key: 'programs', label: isGlobal ? tx('Global course') : tx('At least one programme'), ok: isGlobal || category.programIds.length > 0 },
    ...(pickLevel ? [{ key: 'level', label: tx('Level'), ok: !!category.level }] : []),
    { key: 'semester', label: tx('Semester'), ok: !!category.semester },
    { key: 'description', label: 'Description', ok: !!category.description.trim() },
  ];
  const done = checks.filter(c => c.ok).length;
  const missing = (key: string) => tried && !checks.find(c => c.key === key)?.ok;

  const formSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!category.title.trim() || !category.courseCode.trim()) { toast.error(tx('Enter the course title and code')); return; }
    if (!isGlobal && category.programIds.length === 0) {
      toast.error(isSuper ? tx('Select at least one program, or mark the course as Global') : tx('Please select at least one program'));
      return;
    }
    if (!category.level) { toast.error(tx('Please select an academic level')); return; }
    if (!category.semester) { toast.error(tx('Please select a semester')); return; }
    if (!category.description.trim()) { toast.error('Add a short description'); return; }
    const loadingToast = toast.loading(tx('Registering course...'));
    setLoading(true);
    try {
      await addCategory({
        ...category,
        title: category.title.trim(),
        courseCode: category.courseCode.trim(),
        programIds: isGlobal ? [] : category.programIds,
        openToEveryone: isSuper && isGlobal && openToEveryone,
        creditUnits: category.creditUnits === '' ? null : Number(category.creditUnits),
      });
      toast.success(tx('Course registered successfully'), { id: loadingToast });
      setTimeout(() => navigate(`${basePath}/courses`), 900);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not create the course. Please try again.', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const selectedNames = useMemo(
    () => programs.filter(p => category.programIds.includes(p.id)).map(p => p.name),
    [programs, category.programIds]);
  const progLine = isGlobal ? (openToEveryone ? tx('Open to everyone') : tx('All programmes')) : selectedNames.length ? selectedNames.join(', ') : tx('No programme chosen yet');
  const allSelected = programs.length > 0 && category.programIds.length === programs.length;

  return (
    <div className="ac">
      <PageHeader title={tx('New Course')} breadcrumbs={['Admin', tx('Courses'), tx('New Course')]} />

      <div className="ac-head">
        <Link to={`${basePath}/courses`} className="ac-back"><ArrowLeft size={16} /> {tx('Courses')}</Link>
        <h2>{tx('New course')}</h2>
        <p>{tx('Add a course, choose who takes it and when. You can give it a lecturer and quizzes afterwards.')}</p>
      </div>

      <div className="ac-shell">
        <form className="ac-card" onSubmit={formSubmit} noValidate>

          {/* 1 · Details */}
          <section className="ac-sec">
            <header className="ac-sec-head"><span className="ac-step">1</span><div><h3>{tx('Course details')}</h3><p>{tx('The name and code students and staff will see.')}</p></div></header>
            <div className={`ac-grid ${school ? 'two' : 'three'}`}>
              <div className={`ac-field span-title${missing('title') ? ' bad' : ''}`}>
                <label htmlFor="ac-title">{tx('Course title')} <i>*</i></label>
                <input id="ac-title" className="ac-input" value={category.title} onChange={set('title')} placeholder={school ? 'e.g. Integrated Science' : 'e.g. Software Engineering'} autoComplete="off" />
              </div>
              <div className={`ac-field${missing('code') ? ' bad' : ''}`}>
                <label htmlFor="ac-code">{tx('Course code')} <i>*</i></label>
                <input id="ac-code" className="ac-input ac-mono" value={category.courseCode} maxLength={10} autoCapitalize="characters" autoComplete="off"
                  onChange={e => setCategory(c => ({ ...c, courseCode: e.target.value.toUpperCase() }))} placeholder={school ? 'e.g. SCI' : 'e.g. CSC201'} />
              </div>
              {!school && (
                <div className="ac-field">
                  <label htmlFor="ac-cu">Credit units</label>
                  <input id="ac-cu" className="ac-input" type="number" inputMode="numeric" min={0} max={30} value={category.creditUnits} onChange={set('creditUnits')} />
                </div>
              )}
            </div>
            <p className="ac-help">{tx('Use the official title from the curriculum. The code must be unique.')}</p>
          </section>

          {/* 2 · Who takes it */}
          <section className="ac-sec">
            <header className="ac-sec-head"><span className="ac-step">2</span><div><h3>{tx('Who takes it')}</h3><p>{tx('Students in the programmes you pick can register for this course.')}</p></div></header>

            {isSuper && (
              <div className="ac-seg" role="radiogroup" aria-label="Who takes it">
                <button type="button" role="radio" aria-checked={!isGlobal} className={!isGlobal ? 'on' : undefined} onClick={() => setIsGlobal(false)}>
                  <GraduationCap size={16} /> <span><b>{tx('Selected programmes')}</b><small>{tx('Only the programmes you tick')}</small></span>
                </button>
                <button type="button" role="radio" aria-checked={isGlobal} className={isGlobal ? 'on' : undefined} onClick={() => setIsGlobal(true)}>
                  <Globe size={16} /> <span><b>{tx('Global course')}</b><small>{tx('Every programme')}</small></span>
                </button>
              </div>
            )}

            {isSuper && isGlobal && (
              <label className="ac-switch-row">
                <span className="ac-switch-text">
                  <b>{tx('Open to everyone')}</b>
                  <small>{tx("Every student can take this course's quizzes without registering for it.")}</small>
                </span>
                <input type="checkbox" className="ac-switch" checked={openToEveryone} onChange={e => setOpenToEveryone(e.target.checked)} />
              </label>
            )}

            {!isGlobal && (
              programs.length === 0 ? (
                <p className="ac-empty">{tx('No programmes yet. Add programmes first, or make this a Global course.')}</p>
              ) : (
                <div className={`ac-progs-wrap${missing('programs') ? ' bad' : ''}`}>
                  <div className="ac-progs-bar">
                    <span>{tx('Programmes')} <i>*</i> <em>{category.programIds.length} of {programs.length} selected</em></span>
                    <button type="button" className="ac-link" onClick={() => setCategory(c => ({ ...c, programIds: allSelected ? [] : programs.map(p => p.id) }))}>
                      {allSelected ? 'Clear' : 'Select all'}
                    </button>
                  </div>
                  <div className="ac-progs">
                    {programs.map(p => {
                      const on = category.programIds.includes(p.id);
                      return (
                        <button key={p.id} type="button" className={`ac-prog${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleProgram(p.id)}>
                          <span className="ac-prog-box">{on && <Check size={13} strokeWidth={3} />}</span>
                          <span className="ac-prog-name">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </section>

          {/* 3 · When */}
          <section className="ac-sec">
            <header className="ac-sec-head"><span className="ac-step">3</span><div><h3>{tx('When it is taught')}</h3><p>{pickLevel ? tx('The level and semester students take it in.') : tx('The semester students take it in.')}</p></div></header>
            {pickLevel && (
              <div className={`ac-field${missing('level') ? ' bad' : ''}`}>
                <span className="ac-label">{tx('Level')} <i>*</i></span>
                <div className="ac-pills" role="radiogroup" aria-label={tx('Level')}>
                  {availableLevels.map((lv, i) => (
                    <button key={lv} type="button" role="radio" aria-checked={category.level === lv} className={category.level === lv ? 'on' : undefined}
                      onClick={() => setCategory(c => ({ ...c, level: lv }))}>
                      <b>{tx('Level ')}{lv}</b><small>{school ? '' : `Year ${i + 1}`}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className={`ac-field${missing('semester') ? ' bad' : ''}`}>
              <span className="ac-label">{tx('Semester')} <i>*</i></span>
              <div className="ac-pills" role="radiogroup" aria-label={tx('Semester')}>
                {Array.from({ length: semesterCount }, (_, i) => String(i + 1)).map(val => (
                  <button key={val} type="button" role="radio" aria-checked={category.semester === val} className={category.semester === val ? 'on' : undefined}
                    onClick={() => setCategory(c => ({ ...c, semester: val }))}>
                    <b>{tx(`Semester ${val}`)}</b>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 4 · Description */}
          <section className="ac-sec">
            <header className="ac-sec-head"><span className="ac-step">4</span><div><h3>Description</h3><p>{tx('What the course covers, so students know what to expect.')}</p></div></header>
            <div className={`ac-field${missing('description') ? ' bad' : ''}`}>
              <label htmlFor="ac-desc" className="ac-sr">Description</label>
              <textarea id="ac-desc" className="ac-input ac-area" rows={4} value={category.description} onChange={set('description')}
                placeholder={tx('Topics, prerequisites and what students will be able to do afterwards…')} />
              <div className="ac-count">
                <span>{category.description.trim().length < RECOMMENDED_DESC ? `At least ${RECOMMENDED_DESC} characters recommended` : 'Looks good'}</span>
                <span>{category.description.length}</span>
              </div>
            </div>
          </section>

          {/* Footer: progress + actions, stays in view */}
          <footer className="ac-foot">
            <div className="ac-foot-progress" aria-live="polite">
              <span className="ac-bar"><span style={{ width: `${(done / checks.length) * 100}%` }} /></span>
              <span><b>{done}</b> of {checks.length} done</span>
            </div>
            <div className="ac-foot-actions">
              <button type="button" className="ac-btn ghost" onClick={() => navigate(`${basePath}/courses`)} disabled={loading}>Cancel</button>
              <button type="submit" className="ac-btn primary" disabled={loading}>
                {loading ? <><Loader2 size={16} className="ac-spin" /> Creating…</> : <><BookPlus size={16} /> {tx('Create course')}</>}
              </button>
            </div>
          </footer>
        </form>

        {/* Preview + checklist (wide screens) */}
        <aside className="ac-aside" aria-label="Preview">
          <p className="ac-aside-title">Preview</p>
          <div className="ac-preview">
            <div className="ac-pv-tags">
              <span className="ac-pv-code">{category.courseCode || 'CODE'}</span>
              {pickLevel && category.level && <span className="ac-pv-tag">{tx('Level ')}{category.level}</span>}
              {!school && category.creditUnits !== '' && <span className="ac-pv-tag">{category.creditUnits} {Number(category.creditUnits) === 1 ? 'credit' : 'credits'}</span>}
            </div>
            <h4 className={category.title ? undefined : 'ph'}>{category.title || tx('Course title')}</h4>
            <p className="ac-pv-progs"><GraduationCap size={14} /><span>{progLine}</span></p>
            <p className={`ac-pv-desc${category.description ? '' : ' ph'}`}>{category.description || 'The description appears here.'}</p>
            <div className="ac-pv-foot"><span className="ac-pv-av"><User size={14} /></span><span>{tx('No lecturer yet')}</span></div>
          </div>

          <p className="ac-aside-title">Checklist</p>
          <ul className="ac-checks">
            {checks.map(c => (
              <li key={c.key} className={c.ok ? 'ok' : undefined}>
                {c.ok ? <CheckCircle2 size={16} /> : <Circle size={16} />}<span>{c.label}</span>
              </li>
            ))}
          </ul>
          <p className="ac-aside-note">{tx('After creating it, give the course a lecturer from the Courses page; quizzes can then be added to it.')}</p>
        </aside>
      </div>
    </div>
  );
}
