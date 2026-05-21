import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addLecturerCategory } from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import {
  BookOpen, Save, ChevronRight, Loader2, Tag, Hash, AlignLeft,
  GraduationCap, ArrowLeft, Sparkles, CheckCircle
} from 'lucide-react';

const LEVELS = ['Level 100', 'Level 200', 'Level 300', 'Level 400'];

export default function AddCourse() {
  const navigate = useNavigate();
  const [category, setCategory] = useState({ title: '', courseCode: '', level: '', description: '' });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setCategory(c => ({ ...c, [k]: e.target.value }));

  const formSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addLecturerCategory(category);
      toast.success('Course added successfully!');
      setTimeout(() => navigate('/lect/courses'), 1000);
    } catch { toast.error('Failed to add course registry'); }
    finally { setLoading(false); }
  };

  const features = [
    { icon: <CheckCircle size={16} />, text: 'Automatically links to your quiz registry' },
    { icon: <CheckCircle size={16} />, text: 'Track student performance per course' },
    { icon: <CheckCircle size={16} />, text: 'Generate theory & objective assessments' },
    { icon: <CheckCircle size={16} />, text: 'Manage enrollment and progress data' },
  ];

  return (
    <div className="ac-page">
      <Toaster position="top-right" />

      {/* Top Bar */}
      <div className="ac-topbar">
        <button className="ac-back-btn" onClick={() => navigate('/lect/courses')}>
          <ArrowLeft size={16} />
          <span>Back to Courses</span>
        </button>
        <div className="ac-breadcrumb">
          <span>Lecturer Portal</span>
          <ChevronRight size={13} />
          <span>Courses</span>
          <ChevronRight size={13} />
          <span className="active">Add Course</span>
        </div>
      </div>

      <div className="ac-layout">
        {/* Left Hero Panel */}
        <div className="ac-hero">
          <div className="ac-hero-content">
            <div className="ac-hero-icon">
              <BookOpen size={32} />
            </div>
            <h2 className="ac-hero-title">Create a New Course</h2>
            <p className="ac-hero-subtitle">
              Register a new academic course to your curriculum. Once created, you can
              link assessments, manage student enrollment, and track performance.
            </p>
            <div className="ac-features">
              {features.map((f, i) => (
                <div key={i} className="ac-feature-item">
                  <span className="ac-feature-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
            <div className="ac-hero-badge">
              <Sparkles size={14} />
              <span>Powered by Exam Studio</span>
            </div>
          </div>
          {/* Decorative blobs */}
          <div className="ac-blob ac-blob-1" />
          <div className="ac-blob ac-blob-2" />
        </div>

        {/* Right Form Panel */}
        <div className="ac-form-panel">
          <div className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <GraduationCap size={20} />
              </div>
              <div>
                <h5 className="ac-card-title">Course Details</h5>
                <p className="ac-card-subtitle">Fill in the academic details below</p>
              </div>
            </div>

            <form onSubmit={formSubmit} className="ac-form">
              {/* Course Title */}
              <div className="ac-field-group">
                <label className="ac-label">Course Title</label>
                <div className="ac-input-wrap">
                  <span className="ac-input-icon"><Tag size={16} /></span>
                  <input
                    className="ac-input"
                    required
                    value={category.title}
                    onChange={set('title')}
                    placeholder="e.g. Advanced Structural Engineering"
                  />
                </div>
              </div>

              {/* Code + Level row */}
              <div className="ac-row">
                <div className="ac-field-group">
                  <label className="ac-label">Course Code</label>
                  <div className="ac-input-wrap">
                    <span className="ac-input-icon"><Hash size={16} /></span>
                    <input
                      className="ac-input"
                      required
                      value={category.courseCode}
                      onChange={e => setCategory(c => ({ ...c, courseCode: e.target.value.toUpperCase() }))}
                      placeholder="e.g. ASE-402"
                    />
                  </div>
                </div>
                <div className="ac-field-group">
                  <label className="ac-label">Academic Level</label>
                  <div className="ac-input-wrap">
                    <span className="ac-input-icon"><AlignLeft size={16} /></span>
                    <select
                      className="ac-input ac-select"
                      required
                      value={category.level}
                      onChange={set('level')}
                    >
                      <option value="">Select Level</option>
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="ac-field-group">
                <label className="ac-label">Course Description & Objectives</label>
                <textarea
                  className="ac-input ac-textarea"
                  required
                  rows={5}
                  value={category.description}
                  onChange={set('description')}
                  placeholder="Describe the course scope, intended learning outcomes, and core concepts to be evaluated..."
                />
              </div>

              {/* Actions */}
              <div className="ac-actions">
                <button
                  type="button"
                  className="ac-btn-ghost"
                  onClick={() => navigate('/lect/courses')}
                >
                  Cancel
                </button>
                <button type="submit" className="ac-btn-primary" disabled={loading}>
                  {loading ? <Loader2 className="ac-spin" size={18} /> : <Save size={18} />}
                  <span>{loading ? 'Saving...' : 'Add Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .ac-page {
          min-height: 100vh;
          background: #f0f2f8;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* ── Top Bar ── */
        .ac-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 32px;
          background: #fff;
          border-bottom: 1px solid #e8eaf0;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .ac-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ac-back-btn:hover { background: #f8fafc; color: #5156be; border-color: #5156be; }

        .ac-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }
        .ac-breadcrumb .active { color: #5156be; font-weight: 700; }

        /* ── Layout ── */
        .ac-layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          flex: 1;
          min-height: calc(100vh - 57px);
        }

        /* ── Hero Panel ── */
        .ac-hero {
          background: linear-gradient(145deg, #5156be 0%, #3f43a3 40%, #2e3187 100%);
          padding: 60px 48px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
        }
        .ac-hero-content {
          position: relative;
          z-index: 2;
          color: #fff;
        }
        .ac-hero-icon {
          width: 64px;
          height: 64px;
          background: rgba(255,255,255,0.15);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 28px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .ac-hero-title {
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 16px 0;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        .ac-hero-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.75);
          line-height: 1.7;
          margin: 0 0 36px 0;
          font-weight: 400;
        }
        .ac-features {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 40px;
        }
        .ac-feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.85);
          font-weight: 500;
        }
        .ac-feature-icon { color: #a5f3c6; flex-shrink: 0; }
        .ac-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          color: rgba(255,255,255,0.85);
          font-weight: 600;
        }
        .ac-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.25;
        }
        .ac-blob-1 {
          width: 350px; height: 350px;
          background: #818cf8;
          top: -100px; right: -80px;
        }
        .ac-blob-2 {
          width: 250px; height: 250px;
          background: #a5f3c6;
          bottom: -60px; left: -60px;
        }

        /* ── Form Panel ── */
        .ac-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          background: #f0f2f8;
        }
        .ac-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 60px -10px rgba(81, 86, 190, 0.1), 0 4px 16px rgba(0,0,0,0.04);
          width: 100%;
          max-width: 560px;
          overflow: hidden;
        }
        .ac-card-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 28px 32px;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(135deg, #fafbff, #f5f7ff);
        }
        .ac-card-icon {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #5156be, #7c3aed);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 8px 20px -4px rgba(81, 86, 190, 0.4);
          flex-shrink: 0;
        }
        .ac-card-title {
          font-size: 17px;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 3px 0;
        }
        .ac-card-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
          font-weight: 500;
        }

        /* ── Form ── */
        .ac-form {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .ac-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        .ac-field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ac-label {
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .ac-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .ac-input-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          pointer-events: none;
          transition: color 0.2s;
          z-index: 1;
        }
        .ac-input {
          width: 100%;
          padding: 13px 16px 13px 44px;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 11px;
          transition: all 0.2s ease;
          outline: none;
          font-family: 'Inter', sans-serif;
        }
        .ac-input:hover { border-color: #c7d2fe; background: #f5f7ff; }
        .ac-input:focus {
          border-color: #5156be;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(81, 86, 190, 0.12);
        }
        .ac-input-wrap:focus-within .ac-input-icon { color: #5156be; }
        .ac-select { cursor: pointer; }
        .ac-textarea {
          padding: 14px 16px;
          resize: none;
          min-height: 120px;
          line-height: 1.6;
        }

        /* ── Actions ── */
        .ac-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 8px;
          border-top: 1px solid #f1f5f9;
          margin-top: 4px;
        }
        .ac-btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #5156be, #7c3aed);
          color: #fff;
          border: none;
          padding: 13px 28px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 6px 20px -4px rgba(81, 86, 190, 0.5);
          font-family: 'Inter', sans-serif;
        }
        .ac-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px -4px rgba(81, 86, 190, 0.55);
        }
        .ac-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
        .ac-btn-ghost {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          color: #64748b;
          padding: 13px 24px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .ac-btn-ghost:hover { background: #f8fafc; color: #1e293b; border-color: #cbd5e1; }

        .ac-spin {
          animation: acSpin 1s linear infinite;
        }
        @keyframes acSpin { to { transform: rotate(360deg); } }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .ac-layout { grid-template-columns: 1fr; }
          .ac-hero { padding: 48px 32px; min-height: auto; }
          .ac-hero-title { font-size: 1.6rem; }
          .ac-form-panel { padding: 32px 24px; }
        }
        @media (max-width: 640px) {
          .ac-topbar { padding: 12px 16px; }
          .ac-breadcrumb { display: none; }
          .ac-hero { padding: 36px 24px; }
          .ac-hero-title { font-size: 1.4rem; }
          .ac-form-panel { padding: 20px 16px; }
          .ac-form { padding: 20px; gap: 18px; }
          .ac-row { grid-template-columns: 1fr; }
          .ac-actions { flex-direction: column-reverse; }
          .ac-btn-primary, .ac-btn-ghost { width: 100%; justify-content: center; }
          .ac-card-header { padding: 20px; }
        }
      `}</style>
    </div>
  );
}
