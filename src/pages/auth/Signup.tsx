import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerStudent } from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  GraduationCap,
  ShieldCheck,
  Info,
} from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hidePass, setHidePass] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [user, setUser] = useState({
    firstname: '', lastname: '', username: '', email: '', phone: '', password: '',
  });

  // Accepts 3–6 slash-separated segments of uppercase letters and/or digits
  // e.g. DIT/NR/CR/01/25/00205  |  NRIT/CR/17/25/0004  |  PS/MCS/22/0025
  const USERNAME_REGEX = /^[A-Z0-9]+(\/[A-Z0-9]+){2,5}$/;

  const validateUsername = (value: string) => {
    if (!value) { setUsernameError(''); return; }
    if (!USERNAME_REGEX.test(value.toUpperCase())) {
      setUsernameError('Invalid format. Example: DIT/NR/CR/01/25/00205 or PS/MCS/22/0025');
    } else {
      setUsernameError('');
    }
  };

  const set = (k: keyof typeof user) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setUser(u => ({ ...u, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!USERNAME_REGEX.test(user.username.toUpperCase())) {
      setUsernameError('Invalid format. Example: DIT/NR/CR/01/25/00205 or PS/MCS/22/0025');
      return;
    }
    if (user.password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await registerStudent(user);
      toast.success('Account created successfully!', {
        icon: '🎓',
        duration: 2000,
        style: { borderRadius: '12px', background: '#333', color: '#fff' },
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? 'Registration failed. Please try again.';
      const isConflict = err?.response?.status === 409 || msg.toLowerCase().includes('already exist');
      toast.error(msg, {
        duration: isConflict ? 5000 : 3500,
        style: {
          borderRadius: '14px',
          background: '#1e1e2e',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          maxWidth: '420px',
          padding: '14px 18px',
          border: isConflict ? '1.5px solid rgba(236,69,97,0.4)' : 'none',
        },
        icon: isConflict ? '⚠️' : '❌',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* ── Wrapper ── */
        .su-wrap {
          min-height: 100vh;
          background: var(--gray-50);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          position: relative;
          overflow: hidden;
        }

        /* ── Decorative blobs ── */
        .su-blob-1 {
          position: absolute; top: -10%; right: -5%;
          width: 40vw; height: 40vw;
          min-width: 300px; min-height: 300px;
          background: var(--primary-glow);
          border-radius: 50%; filter: blur(100px);
          opacity: 0.4; z-index: 0;
        }
        .su-blob-2 {
          position: absolute; bottom: -10%; left: -5%;
          width: 30vw; height: 30vw;
          min-width: 250px; min-height: 250px;
          background: var(--accent-glow);
          border-radius: 50%; filter: blur(100px);
          opacity: 0.3; z-index: 0;
        }

        /* ── Card ── */
        .su-inner {
          width: 100%; max-width: 800px;
          position: relative; z-index: 1;
        }
        .su-card {
          padding: 56px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          box-shadow: 0 20px 48px rgba(0,0,0,0.07);
          border: none;
        }

        /* ── Header ── */
        .su-header {
          text-align: center;
          margin-bottom: 48px;
        }
        .su-logo {
          width: 56px; height: 56px;
          background: var(--primary);
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          margin: 0 auto 22px;
          box-shadow: var(--shadow-lg);
        }
        .su-title {
          font-size: 32px; font-weight: 800;
          color: var(--gray-900);
          margin: 0 0 8px;
          letter-spacing: -0.03em;
        }
        .su-subtitle {
          font-size: 16px; font-weight: 500;
          color: var(--gray-500);
          margin: 0;
        }

        /* ── Form layout ── */
        .su-form   { display: flex; flex-direction: column; gap: 40px; }
        .su-section{ display: flex; flex-direction: column; gap: 22px; }
        .su-sec-hd {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 2px;
        }
        .su-sec-icon {
          width: 32px; height: 32px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .su-sec-title {
          font-size: 17px; font-weight: 800;
          color: var(--gray-900); margin: 0;
        }

        /* ── Input grid ── */
        .su-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
        }
        .su-field {
          display: flex; flex-direction: column; gap: 7px;
        }
        .su-label {
          font-size: 13px; font-weight: 700;
          color: var(--gray-600); margin-left: 4px;
        }
        .su-input-wrap { position: relative; }
        .su-ico-l {
          position: absolute; left: 16px; top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400); pointer-events: none;
        }
        .su-ico-r {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--gray-400); padding: 2px; display: flex;
        }
        .su-input {
          width: 100% !important;
          box-sizing: border-box !important;
          background: var(--gray-50) !important;
          border: none !important;
        }
        .su-input.pl { padding-left: 48px !important; }
        .su-input.pr { padding-right: 44px !important; }
        .su-input.err { border: 1.5px solid #ef4444 !important; }

        /* ── Username error banner ── */
        .su-err-box {
          display: flex; align-items: flex-start; gap: 8px;
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.22);
          border-radius: 10px;
          padding: 10px 14px;
          margin-top: 4px;
        }
        .su-err-msg {
          margin: 0; font-size: 12px; font-weight: 600;
          color: #ef4444; line-height: 1.4;
        }
        .su-err-hint {
          margin: 4px 0 0; font-size: 11px;
          color: var(--gray-500);
        }
        .su-chips {
          display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px;
        }
        .su-chip {
          font-family: monospace; font-size: 11px;
          background: rgba(0,0,0,0.055);
          border-radius: 4px; padding: 2px 6px;
          color: var(--gray-700); white-space: nowrap;
        }

        /* ── Actions ── */
        .su-actions { display: flex; flex-direction: column; gap: 18px; margin-top: 8px; }
        .su-submit  {
          width: 100%; padding: 17px;
          font-size: 16px; border-radius: 18px;
        }
        .su-foot-links { text-align: center; font-size: 14px; }

        /* ── Page footer ── */
        .su-footer {
          margin-top: 28px;
          display: flex; justify-content: center;
          gap: 24px; flex-wrap: wrap;
        }
        .su-footer-item {
          display: flex; align-items: center; gap: 8px;
          color: var(--gray-400); font-size: 11px; font-weight: 700;
        }
        .su-dot {
          width: 6px; height: 6px;
          border-radius: 50%; flex-shrink: 0;
        }

        /* ════════════════════════════════════════
           RESPONSIVE BREAKPOINTS
        ════════════════════════════════════════ */

        /* Tablet ≤ 768 px */
        @media (max-width: 768px) {
          .su-wrap       { padding: 40px 16px; }
          .su-card       { padding: 36px 28px; border-radius: 26px; }
          .su-header     { margin-bottom: 36px; }
          .su-title      { font-size: 26px; }
          .su-subtitle   { font-size: 14px; }
          .su-form       { gap: 32px; }
          .su-section    { gap: 18px; }
          .su-grid       { grid-template-columns: 1fr; gap: 16px; }
          .su-sec-title  { font-size: 15px; }
          .su-submit     { padding: 15px; font-size: 15px; }
          .su-blob-1     { filter: blur(70px); opacity: 0.3; }
          .su-blob-2     { filter: blur(70px); opacity: 0.2; }
        }

        /* Large phone ≤ 600 px */
        @media (max-width: 600px) {
          .su-wrap     { padding: 28px 12px; align-items: flex-start; }
          .su-card     { padding: 28px 18px; border-radius: 22px; }
          .su-logo     { width: 48px; height: 48px; border-radius: 14px; }
          .su-title    { font-size: 22px; }
          .su-form     { gap: 28px; }
          .su-section  { gap: 15px; }
          .su-submit   { padding: 14px; font-size: 14px; border-radius: 14px; }
          .su-foot-links { font-size: 13px; }
          .su-err-msg  { font-size: 11px; }
          .su-err-hint { font-size: 10px; }
          .su-chip     { font-size: 10px; }
          .su-footer   { gap: 14px; margin-top: 20px; }
        }

        /* Small phone ≤ 400 px */
        @media (max-width: 400px) {
          .su-card     { padding: 22px 14px; border-radius: 18px; }
          .su-title    { font-size: 20px; }
          .su-subtitle { font-size: 13px; }
          .su-label    { font-size: 12px; }
          .su-sec-title{ font-size: 14px; }
          .su-submit   { padding: 13px; font-size: 13px; }
        }
      `}</style>

      <div className="su-wrap">
        <Toaster position="top-right" />

        <div className="su-blob-1" />
        <div className="su-blob-2" />

        <div className="su-inner animate-fade-in">
          <div className="card shadow-premium su-card">

            {/* ── Header ── */}
            <div className="su-header">
              <div className="su-logo">
                <GraduationCap size={26} />
              </div>
              <h1 className="su-title">Create Account</h1>
              <p className="su-subtitle">Join the Examfront academic network today.</p>
            </div>

            <form onSubmit={handleSubmit} className="su-form">

              {/* ── Identity ── */}
              <div className="su-section">
                <div className="su-sec-hd">
                  <div className="su-sec-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                    <User size={17} />
                  </div>
                  <h3 className="su-sec-title">Identity</h3>
                </div>

                <div className="su-grid">
                  <div className="su-field">
                    <label className="su-label">First Name</label>
                    <input
                      type="text" className="input card su-input"
                      placeholder="John"
                      value={user.firstname} onChange={set('firstname')} required
                    />
                  </div>
                  <div className="su-field">
                    <label className="su-label">Last Name</label>
                    <input
                      type="text" className="input card su-input"
                      placeholder="Doe"
                      value={user.lastname} onChange={set('lastname')} required
                    />
                  </div>
                </div>

                {/* Username / Student ID */}
                <div className="su-field">
                  <label className="su-label">Username / Student ID</label>
                  <div className="su-input-wrap">
                    <User
                      size={17} className="su-ico-l"
                      style={{ color: usernameError ? '#ef4444' : 'var(--gray-400)' }}
                    />
                    <input
                      type="text"
                      className={`input card su-input pl${usernameError ? ' err' : ''}`}
                      placeholder="e.g. DIT/NR/CR/01/25/00205"
                      value={user.username}
                      onChange={e => { set('username')(e); validateUsername(e.target.value); }}
                      required
                    />
                  </div>

                  {usernameError && (
                    <div className="su-err-box">
                      <Info size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p className="su-err-msg">{usernameError}</p>
                        <p className="su-err-hint">Accepted formats:</p>
                        <div className="su-chips">
                          <span className="su-chip">DIT/NR/CR/01/25/00205</span>
                          <span className="su-chip">NRIT/CR/17/25/0004</span>
                          <span className="su-chip">PS/MCS/22/0025</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Communication ── */}
              <div className="su-section">
                <div className="su-sec-hd">
                  <div className="su-sec-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                    <Mail size={17} />
                  </div>
                  <h3 className="su-sec-title">Communication</h3>
                </div>

                <div className="su-grid">
                  <div className="su-field">
                    <label className="su-label">Email Address</label>
                    <div className="su-input-wrap">
                      <Mail size={17} className="su-ico-l" />
                      <input
                        type="email" className="input card su-input pl"
                        placeholder="name@email.com"
                        value={user.email} onChange={set('email')} required
                      />
                    </div>
                  </div>
                  <div className="su-field">
                    <label className="su-label">Phone Number</label>
                    <div className="su-input-wrap">
                      <Phone size={17} className="su-ico-l" />
                      <input
                        type="tel" className="input card su-input pl"
                        placeholder="0544 000 000"
                        value={user.phone} onChange={set('phone')} required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Security ── */}
              <div className="su-section">
                <div className="su-sec-hd">
                  <div className="su-sec-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                    <ShieldCheck size={17} />
                  </div>
                  <h3 className="su-sec-title">Security</h3>
                </div>

                <div className="su-grid">
                  <div className="su-field">
                    <label className="su-label">Password</label>
                    <div className="su-input-wrap">
                      <Lock size={17} className="su-ico-l" />
                      <input
                        type={hidePass ? 'password' : 'text'}
                        className="input card su-input pl pr"
                        placeholder="••••••••"
                        value={user.password} onChange={set('password')} required
                      />
                      <button type="button" className="su-ico-r" onClick={() => setHidePass(v => !v)}>
                        {hidePass ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                  <div className="su-field">
                    <label className="su-label">Confirm Password</label>
                    <div className="su-input-wrap">
                      <Lock size={17} className="su-ico-l" />
                      <input
                        type={hideConfirm ? 'password' : 'text'}
                        className="input card su-input pl pr"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)} required
                      />
                      <button type="button" className="su-ico-r" onClick={() => setHideConfirm(v => !v)}>
                        {hideConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="su-actions">
                <button
                  type="submit"
                  className={`btn btn-primary su-submit${loading ? ' btn-loading' : ''}`}
                  disabled={loading}
                >
                  {loading
                    ? <Loader2 className="spin-ico" size={20} />
                    : <><ShieldCheck size={20} style={{ marginRight: 10 }} />Create Account</>}
                </button>

                <div className="su-foot-links">
                  <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>Already registered? </span>
                  <Link to="/login" style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                    Sign in here
                  </Link>
                </div>
              </div>

            </form>
          </div>

          {/* ── Page footer ── */}
          <div className="su-footer">
            <div className="su-footer-item">
              <div className="su-dot" style={{ background: 'var(--success)' }} />
              OTC
            </div>
            <div className="su-footer-item">
              <div className="su-dot" style={{ background: 'var(--primary)' }} />
              © 2026 All rights reserved
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
