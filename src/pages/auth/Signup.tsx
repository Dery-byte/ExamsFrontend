import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerStudent, getPrograms } from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Loader2, GraduationCap, ShieldCheck,
  ChevronRight, CheckCircle2, ArrowRight, BookOpen, Layers
} from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hidePass, setHidePass] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  
  const [programs, setPrograms] = useState<{ id: number; name: string; configuredLevels: number[] }[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | ''>('');
  const [selectedLevel, setSelectedLevel] = useState<number | ''>('');
  
  const [user, setUser] = useState({ firstname: '', lastname: '', username: '', email: '', phone: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    getPrograms().then(data => {
      if (Array.isArray(data)) {
        setPrograms(data);
        if (data.length > 0) {
          setSelectedProgramId(data[0].id);
          if (data[0].configuredLevels?.length > 0) setSelectedLevel(data[0].configuredLevels[0]);
        }
      }
    }).catch(() => {});
  }, []);

  const USERNAME_REGEX = /^[A-Z0-9]+(\/[A-Z0-9]+){2,5}$/;

  const validateUsername = (value: string) => {
    if (!value) { setUsernameError(''); return; }
    if (!USERNAME_REGEX.test(value.toUpperCase())) {
      setUsernameError('Format: DIT/NR/CR/01/25/00205');
    } else {
      setUsernameError('');
    }
  };

  const set = (k: keyof typeof user) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setUser(u => ({ ...u, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!USERNAME_REGEX.test(user.username.toUpperCase())) {
      setUsernameError('Format: DIT/NR/CR/01/25/00205');
      return;
    }
    if (user.password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await registerStudent({ ...user, programId: selectedProgramId || undefined, currentLevel: selectedLevel || undefined });
      toast.success('Account created successfully!', {
        icon: '🎓',
        style: { borderRadius: '12px', background: '#222', color: '#fff', padding: '16px' },
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Registration failed. Please try again.', {
        style: { borderRadius: '12px', background: '#fee2e2', color: '#991b1b', padding: '16px', border: '1px solid #f87171' },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .split-layout {
          display: flex;
          min-height: 100vh;
          background: #fff;
        }

        /* ── Left Panel (Brand) ── */
        .brand-panel {
          flex: 1;
          display: none;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          position: relative;
          overflow: hidden;
          padding: 60px;
          color: #fff;
          flex-direction: column;
          justify-content: space-between;
        }

        .brand-bg-glow {
          position: absolute;
          top: -20%; right: -10%;
          width: 80vh; height: 80vh;
          background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 60%);
          border-radius: 50%;
          z-index: 0;
        }
        
        .brand-bg-mesh {
          position: absolute;
          bottom: -10%; left: -20%;
          width: 60vh; height: 60vh;
          background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 60%);
          border-radius: 50%;
          z-index: 0;
        }

        .brand-content {
          position: relative;
          z-index: 1;
          max-width: 500px;
        }

        .brand-logo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin-bottom: 80px;
        }

        .brand-logo-icon {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #818cf8, #c084fc);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(129,140,248,0.4);
        }

        .brand-headline {
          font-size: 48px;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
        }

        .brand-subheadline {
          font-size: 18px;
          color: rgba(255,255,255,0.7);
          line-height: 1.5;
          margin-bottom: 48px;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .feature-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          color: #a78bfa;
          flex-shrink: 0;
        }

        .feature-text h4 {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 600;
        }

        .feature-text p {
          margin: 0;
          font-size: 14px;
          color: rgba(255,255,255,0.5);
        }

        /* ── Right Panel (Form) ── */
        .form-panel {
          flex: 1;
          max-width: 720px;
          padding: 60px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .form-header {
          margin-bottom: 40px;
        }

        .form-title {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
          letter-spacing: -0.03em;
        }

        .form-subtitle {
          font-size: 16px;
          color: #64748b;
          margin: 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full {
          grid-column: 1 / -1;
        }

        .input-label {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          margin-left: 4px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
          pointer-events: none;
        }

        .input-action {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          transition: 0.2s;
        }

        .input-action:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .auth-input {
          width: 100%;
          padding: 14px 16px 14px 46px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          font-size: 15px;
          color: #0f172a;
          transition: all 0.2s ease;
        }

        .auth-input:focus {
          outline: none;
          background: #fff;
          border-color: #818cf8;
          box-shadow: 0 0 0 4px rgba(129,140,248,0.15);
        }

        .auth-input.error {
          border-color: #f87171;
          background: #fef2f2;
        }

        .auth-input.error:focus {
          box-shadow: 0 0 0 4px rgba(248,113,113,0.15);
        }

        .auth-select {
          padding-right: 16px;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
        }

        .error-message {
          font-size: 12px;
          font-weight: 600;
          color: #ef4444;
          margin-left: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .section-divider {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          margin: 16px 0 8px;
          gap: 16px;
        }

        .section-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .section-badge {
          background: #f1f5f9;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .submit-btn {
          grid-column: 1 / -1;
          margin-top: 24px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          border: none;
          padding: 18px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s;
          box-shadow: 0 10px 25px rgba(99,102,241,0.3);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(99,102,241,0.4);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .login-link {
          grid-column: 1 / -1;
          text-align: center;
          margin-top: 16px;
          font-size: 14px;
          color: #64748b;
        }

        .login-link a {
          color: #6366f1;
          font-weight: 700;
          text-decoration: none;
          margin-left: 6px;
          transition: 0.2s;
        }

        .login-link a:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        /* ── Responsive ── */
        @media (min-width: 1024px) {
          .brand-panel { display: flex; }
        }

        @media (max-width: 1024px) {
          .form-panel {
            max-width: 100%;
            padding: 40px 24px;
          }
        }

        @media (max-width: 640px) {
          .form-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .form-group.full, .form-group {
            grid-column: 1 / -1;
          }
          .form-panel {
            padding: 24px 16px;
          }
          .form-title {
            font-size: 26px;
          }
        }
      `}</style>

      <div className="split-layout">
        <Toaster position="top-right" />

        {/* ── Left Branding Panel ── */}
        <div className="brand-panel">
          <div className="brand-bg-glow" />
          <div className="brand-bg-mesh" />
          
          <div className="brand-content">
            <div className="brand-logo">
              <div className="brand-logo-icon">
                <GraduationCap size={24} color="#fff" />
              </div>
              Examfront
            </div>
            
            <h1 className="brand-headline">Begin your academic journey.</h1>
            <p className="brand-subheadline">
              Join thousands of students on a seamless, secure, and intuitive examination platform.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon"><CheckCircle2 size={18} /></div>
                <div className="feature-text">
                  <h4>Secure Assessments</h4>
                  <p>Enterprise-grade security for all your examinations.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><BookOpen size={18} /></div>
                <div className="feature-text">
                  <h4>Instant Results</h4>
                  <p>Access your grades and feedback immediately after submission.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><Layers size={18} /></div>
                <div className="feature-text">
                  <h4>Structured Learning</h4>
                  <p>Courses perfectly organized by your academic program.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="brand-content" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            © 2026 Examfront Inc. All rights reserved.
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="form-panel">
          <div className="form-header">
            <h2 className="form-title">Create Account</h2>
            <p className="form-subtitle">Fill in your details to register as a student.</p>
          </div>

          <form onSubmit={handleSubmit} className="form-grid">
            
            <div className="section-divider">
              <span className="section-badge">Identity</span>
            </div>

            <div className="form-group">
              <label className="input-label">First Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="John"
                  value={user.firstname}
                  onChange={set('firstname')}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Last Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Doe"
                  value={user.lastname}
                  onChange={set('lastname')}
                  required
                />
              </div>
            </div>

            <div className="form-group full">
              <label className="input-label">Student ID (Username)</label>
              <div className="input-wrapper">
                <ShieldCheck size={18} className="input-icon" style={{ color: usernameError ? '#ef4444' : '#94a3b8' }} />
                <input
                  type="text"
                  className={`auth-input ${usernameError ? 'error' : ''}`}
                  placeholder="e.g. DIT/NR/CR/01/25/00205"
                  value={user.username}
                  onChange={e => { set('username')(e); validateUsername(e.target.value); }}
                  required
                />
              </div>
              {usernameError && <div className="error-message">{usernameError}</div>}
            </div>

            <div className="section-divider">
              <span className="section-badge">Contact</span>
            </div>

            <div className="form-group">
              <label className="input-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="student@university.edu"
                  value={user.email}
                  onChange={set('email')}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Phone Number</label>
              <div className="input-wrapper">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  className="auth-input"
                  placeholder="+1 (555) 000-0000"
                  value={user.phone}
                  onChange={set('phone')}
                  required
                />
              </div>
            </div>

            {programs.length > 0 && (
              <>
                <div className="section-divider">
                  <span className="section-badge">Academic</span>
                </div>

                <div className="form-group full">
                  <label className="input-label">Program of Study</label>
                  <div className="input-wrapper">
                    <GraduationCap size={18} className="input-icon" />
                    <select
                      className="auth-input auth-select"
                      value={selectedProgramId}
                      onChange={e => {
                        const id = Number(e.target.value);
                        setSelectedProgramId(id);
                        const prog = programs.find(p => p.id === id);
                        if (prog?.configuredLevels?.length) setSelectedLevel(prog.configuredLevels[0]);
                      }}
                    >
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group full">
                  <label className="input-label">Current Level / Year</label>
                  <div className="input-wrapper">
                    <Layers size={18} className="input-icon" />
                    <select
                      className="auth-input auth-select"
                      value={selectedLevel}
                      onChange={e => setSelectedLevel(Number(e.target.value))}
                    >
                      {(programs.find(p => p.id === selectedProgramId)?.configuredLevels || []).map(lv => (
                        <option key={lv} value={lv}>Level {lv}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="section-divider">
              <span className="section-badge">Security</span>
            </div>

            <div className="form-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={hidePass ? 'password' : 'text'}
                  className="auth-input"
                  style={{ paddingRight: 40 }}
                  placeholder="••••••••"
                  value={user.password}
                  onChange={set('password')}
                  required
                />
                <button type="button" className="input-action" onClick={() => setHidePass(v => !v)}>
                  {hidePass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={hideConfirm ? 'password' : 'text'}
                  className="auth-input"
                  style={{ paddingRight: 40 }}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="button" className="input-action" onClick={() => setHideConfirm(v => !v)}>
                  {hideConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="spin-ico" size={22} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>Create Account <ArrowRight size={18} /></>
              )}
            </button>

            <div className="login-link">
              Already have an account? 
              <Link to="/login">Sign in</Link>
            </div>
            
          </form>
        </div>
      </div>
    </>
  );
}
