import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { forgotPassword } from '../../api/endpoints';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Mail,
  Phone,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap
} from 'lucide-react';

const PHRASES = [
  'Access your examination portal',
  'Track your academic progress',
  'Secure identity verification'
];

type RecoveryChannel = 'phone' | 'email';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hidePass, setHidePass] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [channel, setChannel] = useState<RecoveryChannel>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [success, setSuccess] = useState(false);
  const [successIdentifier, setSuccessIdentifier] = useState('');

  // Typing effect
  const phIdx = useRef(0);
  const chIdx = useRef(0);
  const dir = useRef<'type' | 'erase'>('type');

  useEffect(() => {
    const tick = () => {
      const phrase = PHRASES[phIdx.current];
      if (dir.current === 'type') {
        chIdx.current++;
        setTyped(phrase.slice(0, chIdx.current));
        if (chIdx.current === phrase.length) { dir.current = 'erase'; return 2300; }
        return 65;
      } else {
        chIdx.current--;
        setTyped(phrase.slice(0, chIdx.current));
        if (chIdx.current === 0) { dir.current = 'type'; phIdx.current = (phIdx.current + 1) % PHRASES.length; return 400; }
        return 38;
      }
    };
    let t: ReturnType<typeof setTimeout>;
    const run = () => { const next = tick(); t = setTimeout(run, next); };
    t = setTimeout(run, 65);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(username, password); }
    catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiErr('');
    setSending(true);
    try {
      const payload = channel === 'phone' ? { phone } : { email };
      await forgotPassword(payload);
      setSuccessIdentifier(channel === 'phone' ? phone : email);
      setSuccess(true);
    } catch (err: any) {
      setApiErr(err?.response?.data?.message ?? 'Failed to send reset code. Please try again.');
    } finally { setSending(false); }
  };

  const openModal = () => {
    setPhone(''); setEmail(''); setApiErr(''); setSuccess(false);
    setSuccessIdentifier(''); setChannel('phone');
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  return (
    <>
      <style>{`
        /* ── Login page ────────────────────────────── */
        .login-wrapper {
          min-height: 100vh;
          background: var(--gray-50);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
        }
        .login-decor-1 {
          position: absolute;
          top: -10%;
          left: -5%;
          width: 40vw;
          height: 40vw;
          min-width: 300px;
          min-height: 300px;
          background: var(--primary-glow);
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.4;
          z-index: 0;
        }
        .login-decor-2 {
          position: absolute;
          bottom: -10%;
          right: -5%;
          width: 30vw;
          height: 30vw;
          min-width: 250px;
          min-height: 250px;
          background: var(--accent-glow);
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.3;
          z-index: 0;
        }
        .login-inner {
          width: 100%;
          max-width: 480px;
          position: relative;
          z-index: 1;
        }
        .login-card {
          padding: 48px;
          border: none;
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(20px);
          border-radius: 32px;
        }
        .login-title {
          font-size: 32px;
          font-weight: 800;
          color: var(--gray-900);
          margin-bottom: 8px;
          letter-spacing: -0.03em;
        }
        .login-subtitle {
          font-size: 16px;
          color: var(--gray-500);
          font-weight: 500;
          height: 1.5em;
        }

        /* ── Recovery Modal ────────────────────────── */
        .modal-glass {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-card {
          width: 100%;
          max-width: 440px;
          padding: 36px;
          background: #fff;
          border: none;
          border-radius: 28px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.18);
          animation: slideUp 0.28s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(24px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }

        /* ── Channel Tabs ──────────────────────────── */
        .channel-tabs {
          display: flex;
          background: var(--gray-100);
          border-radius: 14px;
          padding: 4px;
          gap: 4px;
          margin-bottom: 24px;
        }
        .channel-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 11px 10px;
          border-radius: 11px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          background: transparent;
          color: var(--gray-500);
          transition: all 0.22s ease;
        }
        .channel-tab.active {
          background: #fff;
          color: var(--primary);
          box-shadow: 0 2px 10px rgba(0,0,0,0.09);
        }
        .channel-tab:hover:not(.active) {
          color: var(--gray-700);
        }

        /* ── Responsive ────────────────────────────── */
        @media (max-width: 640px) {
          .login-wrapper { padding: 16px 12px; }
          .login-card { padding: 28px 20px; border-radius: 24px; }
          .login-title { font-size: 26px; }
          .login-subtitle { font-size: 13px; }
          .login-decor-1 { filter: blur(70px); opacity: 0.3; }
          .login-decor-2 { filter: blur(70px); opacity: 0.2; }
          .modal-glass { padding: 12px; align-items: flex-end; }
          .modal-card {
            padding: 28px 20px 32px;
            border-radius: 28px 28px 14px 14px;
            max-width: 100%;
          }
        }
        @media (max-width: 400px) {
          .login-card { padding: 22px 14px; }
          .login-title { font-size: 22px; }
          .channel-tab { font-size: 12px; padding: 10px 6px; }
        }
      `}</style>

      <div className="login-wrapper">
        {/* Decorative blobs */}
        <div className="login-decor-1" />
        <div className="login-decor-2" />

        <div className="login-inner animate-fade-in">
          <div className="card shadow-premium login-card">

            {/* Brand Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
              <div style={{
                width: 64, height: 64,
                background: 'var(--primary)', borderRadius: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', boxShadow: 'var(--shadow-lg)'
              }}>
                <GraduationCap size={32} />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 className="login-title">Welcome back</h1>
              <p className="login-subtitle">
                {typed}<span style={{ color: 'var(--primary)', fontWeight: 700, marginLeft: 2, animation: 'pulse 1s infinite' }}>|</span>
              </p>
            </div>

            {error && (
              <div style={{
                display: 'flex', gap: 12, padding: '14px 16px',
                background: 'var(--danger-bg)', color: 'var(--danger)',
                borderRadius: '14px', marginBottom: 24, fontSize: 14, fontWeight: 600, alignItems: 'center'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Username */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>
                  Username or Email
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input
                    id="login-username"
                    type="text"
                    className="input card"
                    placeholder="student.id"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    style={{ paddingLeft: 48, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)' }}>Security Password</label>
                  <button
                    id="forgot-password-btn"
                    type="button"
                    onClick={openModal}
                    style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
                  >
                    Forgot?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input
                    id="login-password"
                    type={hidePass ? 'password' : 'text'}
                    className="input card"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingLeft: 48, paddingRight: 48, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setHidePass(!hidePass)}
                    style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {hidePass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                id="sign-in-btn"
                type="submit"
                className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
                style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: '16px', marginTop: 4 }}
                disabled={loading}
              >
                {loading ? <Loader2 className="spin-ico" size={20} /> : <><ShieldCheck size={20} style={{ marginRight: 10 }} /> Sign In</>}
              </button>
            </form>

            <div style={{ marginTop: 36, textAlign: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 500 }}>New member? </span>
              <Link to="/signup" style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                Create Student Account
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 22, textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, letterSpacing: '0.05em' }}>
            OTC · © 2026
          </div>
        </div>

        {/* ── Recovery Modal ────────────────────────────────────── */}
        {showModal && (
          <div className="modal-glass" onClick={closeModal}>
            <div className="card shadow-premium animate-fade-in modal-card" onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42,
                    background: 'var(--primary-glow)', borderRadius: '13px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                  }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)', margin: 0, lineHeight: 1.2 }}>
                      Recover Access
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500, margin: '3px 0 0' }}>
                      Choose how to receive your reset link
                    </p>
                  </div>
                </div>
                <button
                  id="close-recovery-modal"
                  onClick={closeModal}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    border: 'none', background: 'var(--gray-100)', cursor: 'pointer', color: 'var(--gray-600)',
                    flexShrink: 0, marginLeft: 8
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {success ? (
                /* ── Success state ── */
                <div style={{ textAlign: 'center', paddingTop: 8 }}>
                  <div style={{
                    width: 60, height: 60,
                    background: 'var(--success-bg)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--success)', margin: '0 auto 20px'
                  }}>
                    <CheckCircle2 size={34} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>
                    {channel === 'phone' ? 'SMS Sent!' : 'Email Sent!'}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.6, marginBottom: 28 }}>
                    A recovery link has been sent to{' '}
                    <strong style={{ color: 'var(--gray-800)' }}>{successIdentifier}</strong>.{' '}
                    {channel === 'phone'
                      ? 'Please check your SMS messages.'
                      : 'Please check your inbox (and spam folder).'}
                  </p>
                  <button
                    id="recovery-done-btn"
                    onClick={closeModal}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', borderRadius: '14px', fontSize: 15 }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* ── Form state ── */
                <>
                  {/* Tab switcher */}
                  <div className="channel-tabs" role="tablist">
                    <button
                      id="tab-phone"
                      role="tab"
                      className={`channel-tab${channel === 'phone' ? ' active' : ''}`}
                      onClick={() => { setChannel('phone'); setApiErr(''); }}
                      type="button"
                    >
                      <Phone size={15} />
                      Via Phone
                    </button>
                    <button
                      id="tab-email"
                      role="tab"
                      className={`channel-tab${channel === 'email' ? ' active' : ''}`}
                      onClick={() => { setChannel('email'); setApiErr(''); }}
                      type="button"
                    >
                      <Mail size={15} />
                      Via Email
                    </button>
                  </div>

                  <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {channel === 'phone' ? (
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
                          Registered Mobile Number
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Phone size={17} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                          <input
                            id="recovery-phone"
                            type="tel"
                            className="input card"
                            placeholder="e.g. 0544 073 427"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            required
                            autoComplete="tel"
                            style={{ paddingLeft: 46, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6, marginLeft: 2 }}>
                          We'll send a recovery link via SMS to this number.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
                          Registered Email Address
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Mail size={17} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                          <input
                            id="recovery-email"
                            type="email"
                            className="input card"
                            placeholder="e.g. student@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            style={{ paddingLeft: 46, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6, marginLeft: 2 }}>
                          We'll email a password reset link to this address.
                        </p>
                      </div>
                    )}

                    {apiErr && (
                      <div style={{
                        display: 'flex', gap: 10, alignItems: 'center',
                        padding: '12px 14px', background: 'var(--danger-bg)',
                        color: 'var(--danger)', borderRadius: '12px', fontSize: 13, fontWeight: 600
                      }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        {apiErr}
                      </div>
                    )}

                    <button
                      id="send-recovery-btn"
                      type="submit"
                      className={`btn btn-primary${sending ? ' btn-loading' : ''}`}
                      style={{ width: '100%', padding: '14px', borderRadius: '14px', fontSize: 15 }}
                      disabled={sending}
                    >
                      {sending
                        ? <Loader2 className="spin-ico" size={18} />
                        : channel === 'phone'
                          ? <><Phone size={16} style={{ marginRight: 8 }} />Send via SMS</>
                          : <><Mail size={16} style={{ marginRight: 8 }} />Send via Email</>
                      }
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
