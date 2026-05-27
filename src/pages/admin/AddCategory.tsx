import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addCategory } from '../../api/endpoints';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import {
  BookPlus, BookOpen, Layers, FileText, ArrowLeft,
  ShieldCheck, Loader2, BadgeCheck, GraduationCap,
  Info, CheckCircle2, Award, Cpu, Sparkles
} from 'lucide-react';

const LEVELS = [
  { label: 'Level 100', sub: '1st Year', color: '#5156be' },
  { label: 'Level 200', sub: '2nd Year', color: '#2ab57d' },
  { label: 'Level 300', sub: '3rd Year', color: '#f59e0b' },
  { label: 'Level 400', sub: '4th Year', color: '#fd625e' },
];

const INFO_ITEMS = [
  { icon: <CheckCircle2 size={15} />, text: 'Course is immediately available for faculty assignment after registration.' },
  { icon: <Award size={15} />, text: 'Course code must be unique within the academic registry.' },
  { icon: <ShieldCheck size={15} />, text: 'All changes are logged and auditable by system administrators.' },
  { icon: <Cpu size={15} />, text: 'Assessments and quizzes can be linked to this course once registered.' },
];

export default function AddCategory() {
  const navigate = useNavigate();
  const [category, setCategory] = useState({ title: '', courseCode: '', level: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setCategory(c => ({ ...c, [k]: e.target.value }));

  const formSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.level) { toast.error('Please select an academic level'); return; }
    const loadingToast = toast.loading('Registering course...');
    setLoading(true);
    try {
      await addCategory(category);
      toast.success('Course registered successfully', { id: loadingToast });
      setTimeout(() => navigate('/admin/courses'), 1200);
    } catch (err: any) {
      toast.error('Registration failed', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const completedFields = [
    category.title,
    category.courseCode,
    category.level,
    category.description,
  ].filter(Boolean).length;

  const progressPct = Math.round((completedFields / 4) * 100);

  return (
    <div className="acp-page">
      <PageHeader title="Course Registration" breadcrumbs={['Admin', 'Courses', 'New Course']} />

      <div className="acp-shell">

        {/* ── LEFT PANEL: FORM ── */}
        <div className="acp-form-panel">

          {/* Card header */}
          <div className="acp-card-hd">
            <div className="acp-card-hd-left">
              <div className="acp-card-hd-icon">
                <GraduationCap size={22} />
              </div>
              <div>
                <h4 className="acp-card-title">New Course Entry</h4>
                <p className="acp-card-sub">Establish a new course in the academic registry</p>
              </div>
            </div>
            <button className="acp-btn-back" onClick={() => navigate('/admin/courses')}>
              <ArrowLeft size={15} />
              <span>Course Catalog</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="acp-progress-wrap">
            <div className="acp-progress-meta">
              <span className="acp-progress-label">Form Completion</span>
              <span className="acp-progress-pct">{progressPct}%</span>
            </div>
            <div className="acp-progress-track">
              <div className="acp-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={formSubmit} className="acp-form">

            {/* Row 1: Title + Code */}
            <div className="acp-row">
              <div className="acp-field acp-field--flex">
                <label className="acp-label">
                  <BookOpen size={13} />
                  Official Course Title
                  <span className="acp-required">*</span>
                </label>
                <div className={`acp-input-wrap ${focused === 'title' ? 'is-focused' : ''} ${category.title ? 'is-filled' : ''}`}>
                  <input
                    className="acp-input"
                    required
                    value={category.title}
                    onChange={set('title')}
                    onFocus={() => setFocused('title')}
                    onBlur={() => setFocused(null)}
                    placeholder="e.g. Software Engineering Fundamentals"
                  />
                  {category.title && <CheckCircle2 className="acp-input-check" size={16} />}
                </div>
                <span className="acp-hint">Use the full, official course title as listed in the curriculum</span>
              </div>

              <div className="acp-field acp-field--fixed">
                <label className="acp-label">
                  <BadgeCheck size={13} />
                  Course Code
                  <span className="acp-required">*</span>
                </label>
                <div className={`acp-input-wrap acp-code-wrap ${focused === 'courseCode' ? 'is-focused' : ''} ${category.courseCode ? 'is-filled' : ''}`}>
                  <input
                    className="acp-input acp-code-input"
                    required
                    value={category.courseCode}
                    onChange={e => setCategory(c => ({ ...c, courseCode: e.target.value.toUpperCase() }))}
                    onFocus={() => setFocused('courseCode')}
                    onBlur={() => setFocused(null)}
                    placeholder="e.g. CS301"
                    maxLength={10}
                  />
                </div>
                <span className="acp-hint">Unique identifier</span>
              </div>
            </div>

            {/* Row 2: Academic Level */}
            <div className="acp-field">
              <label className="acp-label">
                <Layers size={13} />
                Academic Level
                <span className="acp-required">*</span>
              </label>
              <div className="acp-level-grid">
                {LEVELS.map(lv => (
                  <button
                    key={lv.label}
                    type="button"
                    onClick={() => setCategory(c => ({ ...c, level: lv.label }))}
                    className={`acp-level-btn ${category.level === lv.label ? 'is-active' : ''}`}
                    style={category.level === lv.label
                      ? { '--lv-color': lv.color, borderColor: lv.color, background: `${lv.color}12` } as any
                      : { '--lv-color': lv.color } as any
                    }
                  >
                    <span className="acp-level-dot" style={{ background: lv.color }} />
                    <div className="acp-level-info">
                      <span className="acp-level-name">{lv.label}</span>
                      <span className="acp-level-sub">{lv.sub}</span>
                    </div>
                    {category.level === lv.label && (
                      <CheckCircle2 size={16} className="acp-level-check" style={{ color: lv.color }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Description */}
            <div className="acp-field">
              <label className="acp-label">
                <FileText size={13} />
                Course Synopsis &amp; Objectives
                <span className="acp-required">*</span>
              </label>
              <div className={`acp-input-wrap acp-area-wrap ${focused === 'description' ? 'is-focused' : ''} ${category.description ? 'is-filled' : ''}`}>
                <textarea
                  className="acp-input acp-area"
                  required
                  rows={5}
                  value={category.description}
                  onChange={set('description')}
                  onFocus={() => setFocused('description')}
                  onBlur={() => setFocused(null)}
                  placeholder="Summarize course content, prerequisites, and primary learning outcomes..."
                />
                <span className="acp-area-count">{category.description.length} chars</span>
              </div>
              <span className="acp-hint">Minimum 30 characters recommended for a meaningful course description</span>
            </div>

            {/* Footer */}
            <div className="acp-footer">
              <button type="button" className="acp-btn-discard" onClick={() => navigate('/admin/courses')}>
                Discard
              </button>
              <button type="submit" className="acp-btn-submit" disabled={loading}>
                {loading
                  ? <><Loader2 size={17} className="acp-spin" /> Registering…</>
                  : <><BookPlus size={17} /> Register Course</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* ── RIGHT PANEL: SIDEBAR ── */}
        <aside className="acp-sidebar">

          {/* Decorative header */}
          <div className="acp-sb-banner">
            <div className="acp-sb-banner-pattern" />
            <div className="acp-sb-banner-body">
              <div className="acp-sb-icon"><Sparkles size={20} /></div>
              <h5 className="acp-sb-title">Registry Guide</h5>
              <p className="acp-sb-sub">Everything you need to know about course registration</p>
            </div>
          </div>

          {/* Completion status */}
          <div className="acp-sb-completion">
            <div className="acp-sb-completion-ring" style={{ '--pct': progressPct } as any}>
              <svg viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" className="ring-track" />
                <circle cx="28" cy="28" r="24" className="ring-fill"
                  strokeDasharray={`${(progressPct / 100) * 150.8} 150.8`} />
              </svg>
              <span className="acp-sb-pct">{progressPct}<em>%</em></span>
            </div>
            <div>
              <p className="acp-sb-completion-label">Fields Complete</p>
              <p className="acp-sb-completion-sub">{completedFields} of 4 required fields</p>
            </div>
          </div>

          {/* Info items */}
          <div className="acp-sb-info-list">
            <p className="acp-sb-section-title"><Info size={12} /> What happens next?</p>
            {INFO_ITEMS.map((item, i) => (
              <div key={i} className="acp-sb-info-item">
                <div className="acp-sb-info-ico">{item.icon}</div>
                <p className="acp-sb-info-text">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Level legend */}
          <div className="acp-sb-level-legend">
            <p className="acp-sb-section-title"><Layers size={12} /> Level Structure</p>
            {LEVELS.map(lv => (
              <div key={lv.label} className="acp-sb-level-row">
                <span className="acp-sb-level-dot" style={{ background: lv.color }} />
                <span className="acp-sb-level-name">{lv.label}</span>
                <span className="acp-sb-level-sub">— {lv.sub}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        /* ═══════════════════════════════════════
           PAGE WRAPPER
        ═══════════════════════════════════════ */
        .acp-page {
          font-family: 'Inter', sans-serif;
          color: #2a3142;
          padding: 0 0 60px;
          animation: acpFadeIn 0.4s ease-out;
        }
        @keyframes acpFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* ═══════════════════════════════════════
           SHELL (2-col grid on desktop)
        ═══════════════════════════════════════ */
        .acp-shell {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          align-items: start;
        }

        /* ═══════════════════════════════════════
           FORM PANEL CARD
        ═══════════════════════════════════════ */
        .acp-form-panel {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #eff0f2;
          box-shadow: 0 4px 30px rgba(18,38,63,0.07);
          overflow: hidden;
          position: relative;
        }
        .acp-form-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, #5156be 0%, #2ab57d 50%, #f59e0b 100%);
        }

        /* Card header */
        .acp-card-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 32px;
          border-bottom: 1px solid #f1f5f9;
          background: #fafbfc;
          flex-wrap: wrap;
          gap: 14px;
        }
        .acp-card-hd-left { display: flex; align-items: center; gap: 16px; }
        .acp-card-hd-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: linear-gradient(135deg, #5156be, #6c70d4);
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(81,86,190,0.3);
        }
        .acp-card-title { font-size: 17px; font-weight: 800; color: #2a3142; margin: 0 0 3px; letter-spacing: -0.3px; }
        .acp-card-sub { font-size: 12px; color: #adb5bd; font-weight: 500; margin: 0; }

        .acp-btn-back {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 10px;
          border: 1.5px solid #e2e8f0; background: #fff;
          color: #5156be; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          white-space: nowrap;
        }
        .acp-btn-back:hover { background: #f0f1ff; border-color: #c7caf5; }

        /* Progress bar */
        .acp-progress-wrap {
          padding: 16px 32px;
          background: #fafbfc;
          border-bottom: 1px solid #f1f5f9;
        }
        .acp-progress-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .acp-progress-label { font-size: 10px; font-weight: 700; color: #adb5bd; text-transform: uppercase; letter-spacing: 0.8px; }
        .acp-progress-pct { font-size: 12px; font-weight: 800; color: #5156be; }
        .acp-progress-track { height: 6px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
        .acp-progress-fill {
          height: 100%; border-radius: 99px;
          background: linear-gradient(90deg, #5156be, #2ab57d);
          transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
        }

        /* ═══════════════════════════════════════
           FORM BODY
        ═══════════════════════════════════════ */
        .acp-form { display: flex; flex-direction: column; gap: 26px; padding: 32px; }

        .acp-row { display: flex; gap: 18px; }
        .acp-field { display: flex; flex-direction: column; gap: 7px; }
        .acp-field--flex { flex: 1; min-width: 0; }
        .acp-field--fixed { width: 150px; flex-shrink: 0; }

        .acp-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 800; color: #74788d;
          text-transform: uppercase; letter-spacing: 0.9px;
        }
        .acp-required { color: #fd625e; margin-left: 1px; }

        /* Input wrapper */
        .acp-input-wrap {
          display: flex; align-items: center;
          border: 1.5px solid #e2e8f0; border-radius: 12px;
          background: #f8f9ff;
          transition: all 0.2s;
          overflow: hidden;
          position: relative;
        }
        .acp-input-wrap.is-focused { border-color: #5156be; background: #fff; box-shadow: 0 0 0 4px rgba(81,86,190,0.1); }
        .acp-input-wrap.is-filled:not(.is-focused) { border-color: #c7f0e0; background: #fff; }

        .acp-input {
          flex: 1; border: none; outline: none; background: transparent;
          padding: 13px 16px; font-size: 14px; font-weight: 600; color: #2a3142;
          min-width: 0; width: 100%;
        }
        .acp-input::placeholder { color: #c5cad8; font-weight: 500; }

        .acp-input-check {
          color: #2ab57d; margin-right: 14px; flex-shrink: 0;
          animation: checkPop 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes checkPop { from { transform: scale(0); } to { transform: scale(1); } }

        /* Code input */
        .acp-code-wrap { justify-content: center; }
        .acp-code-input { text-align: center; font-weight: 900; font-size: 16px; color: #5156be; letter-spacing: 0.05em; }

        /* Textarea */
        .acp-area-wrap { align-items: flex-start; flex-direction: column; padding-bottom: 6px; }
        .acp-area { resize: vertical; min-height: 120px; line-height: 1.65; }
        .acp-area-count {
          align-self: flex-end; margin-right: 14px;
          font-size: 10px; font-weight: 700; color: #c5cad8;
        }

        .acp-hint { font-size: 11px; color: #c5cad8; font-weight: 500; padding-left: 2px; }

        /* ═══════════════════════════════════════
           LEVEL SELECTOR
        ═══════════════════════════════════════ */
        .acp-level-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .acp-level-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          border: 1.5px solid #e2e8f0; background: #fff;
          cursor: pointer; transition: all 0.2s;
          text-align: left; position: relative;
        }
        .acp-level-btn:hover { background: #f8f9ff; border-color: #c7caf5; transform: translateY(-1px); }
        .acp-level-btn.is-active { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .acp-level-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .acp-level-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .acp-level-name { font-size: 12px; font-weight: 800; color: #2a3142; white-space: nowrap; }
        .acp-level-sub { font-size: 10px; font-weight: 600; color: #adb5bd; text-transform: uppercase; letter-spacing: 0.5px; }
        .acp-level-check { flex-shrink: 0; animation: checkPop 0.2s cubic-bezier(0.34,1.56,0.64,1); }

        /* ═══════════════════════════════════════
           FOOTER ACTIONS
        ═══════════════════════════════════════ */
        .acp-footer {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 12px; padding-top: 24px;
          border-top: 1px solid #f1f5f9;
        }
        .acp-btn-discard {
          padding: 11px 22px; border-radius: 10px;
          border: 1.5px solid #e2e8f0; background: #fff;
          color: #74788d; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .acp-btn-discard:hover { background: #f8f9fa; color: #2a3142; border-color: #d1d5db; }
        .acp-btn-submit {
          display: inline-flex; align-items: center; gap: 9px;
          padding: 11px 28px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #5156be, #6c70d4);
          color: #fff; font-size: 13px; font-weight: 800;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(81,86,190,0.35);
        }
        .acp-btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(81,86,190,0.42); }
        .acp-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .acp-spin { animation: acpSpin 1s linear infinite; }
        @keyframes acpSpin { to { transform: rotate(360deg); } }

        /* ═══════════════════════════════════════
           SIDEBAR
        ═══════════════════════════════════════ */
        .acp-sidebar {
          display: flex; flex-direction: column; gap: 16px;
          position: sticky; top: 80px;
        }

        /* Banner */
        .acp-sb-banner {
          border-radius: 18px; overflow: hidden; position: relative;
          background: linear-gradient(135deg, #3730a3 0%, #5156be 50%, #6c70d4 100%);
        }
        .acp-sb-banner-pattern {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at top right, rgba(255,255,255,0.15), transparent 60%),
                      radial-gradient(ellipse at bottom left, rgba(0,0,0,0.1), transparent 60%);
        }
        .acp-sb-banner-body {
          position: relative; z-index: 1; padding: 28px 24px;
        }
        .acp-sb-icon {
          width: 42px; height: 42px; border-radius: 12px;
          background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);
          display: flex; align-items: center; justify-content: center;
          color: #fff; margin-bottom: 14px;
        }
        .acp-sb-title { font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 6px; }
        .acp-sb-sub { font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500; margin: 0; line-height: 1.5; }

        /* Completion ring */
        .acp-sb-completion {
          background: #fff; border-radius: 16px;
          border: 1px solid #eff0f2;
          box-shadow: 0 2px 12px rgba(18,38,63,0.05);
          padding: 20px 24px;
          display: flex; align-items: center; gap: 18px;
        }
        .acp-sb-completion-ring { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
        .acp-sb-completion-ring svg { width: 56px; height: 56px; transform: rotate(-90deg); }
        .ring-track { fill: none; stroke: #f1f5f9; stroke-width: 4; }
        .ring-fill { fill: none; stroke: #5156be; stroke-width: 4; stroke-linecap: round; transition: stroke-dasharray 0.4s cubic-bezier(0.4,0,0.2,1); }
        .acp-sb-pct {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #2a3142;
        }
        .acp-sb-pct em { font-size: 9px; font-weight: 700; color: #adb5bd; font-style: normal; }
        .acp-sb-completion-label { font-size: 14px; font-weight: 800; color: #2a3142; margin: 0 0 3px; }
        .acp-sb-completion-sub { font-size: 11px; color: #adb5bd; font-weight: 500; margin: 0; }

        /* Info list */
        .acp-sb-info-list {
          background: #fff; border-radius: 16px;
          border: 1px solid #eff0f2;
          box-shadow: 0 2px 12px rgba(18,38,63,0.05);
          padding: 20px 24px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .acp-sb-section-title {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 800; color: #adb5bd;
          text-transform: uppercase; letter-spacing: 0.9px;
          margin: 0 0 4px;
        }
        .acp-sb-info-item { display: flex; align-items: flex-start; gap: 10px; }
        .acp-sb-info-ico {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(81,86,190,0.08); color: #5156be;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .acp-sb-info-text { font-size: 12px; color: #74788d; font-weight: 500; line-height: 1.55; margin: 4px 0 0; }

        /* Level legend */
        .acp-sb-level-legend {
          background: #fff; border-radius: 16px;
          border: 1px solid #eff0f2;
          box-shadow: 0 2px 12px rgba(18,38,63,0.05);
          padding: 20px 24px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .acp-sb-level-row { display: flex; align-items: center; gap: 10px; }
        .acp-sb-level-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .acp-sb-level-name { font-size: 12px; font-weight: 800; color: #2a3142; }
        .acp-sb-level-sub { font-size: 11px; color: #adb5bd; font-weight: 500; }

        /* ═══════════════════════════════════════
           RESPONSIVE
        ═══════════════════════════════════════ */
        @media (max-width: 1024px) {
          .acp-shell { grid-template-columns: 1fr; }
          .acp-sidebar { position: static; display: grid; grid-template-columns: repeat(2, 1fr); }
          .acp-sb-banner { grid-column: 1 / -1; }
        }
        @media (max-width: 768px) {
          .acp-shell { padding: 0 16px; }
          .acp-card-hd { padding: 20px 20px; }
          .acp-progress-wrap { padding: 14px 20px; }
          .acp-form { padding: 20px; gap: 20px; }
          .acp-row { flex-direction: column; }
          .acp-field--fixed { width: 100%; }
          .acp-level-grid { grid-template-columns: repeat(2, 1fr); }
          .acp-footer { flex-direction: column-reverse; }
          .acp-btn-discard, .acp-btn-submit { width: 100%; justify-content: center; text-align: center; }
          .acp-sidebar { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .acp-level-grid { grid-template-columns: 1fr 1fr; }
          .acp-card-hd { flex-direction: column; align-items: flex-start; }
          .acp-btn-back { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
