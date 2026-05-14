import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { forgotPasswordSms } from '../../api/endpoints';
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

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [hidePass,  setHidePass]    = useState(true);
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState('');
  const [typed,     setTyped]       = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [phone,      setPhone]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [apiErr,     setApiErr]     = useState('');
  const [success,    setSuccess]    = useState(false);
  const [successPhone, setSuccessPhone] = useState('');

  // Typing effect
  const phIdx  = useRef(0);
  const chIdx  = useRef(0);
  const dir    = useRef<'type'|'erase'>('type');
  
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
      await forgotPasswordSms(phone);
      setSuccessPhone(phone);
      setSuccess(true);
    } catch (err: any) {
      setApiErr(err?.response?.data?.message ?? 'Failed to send reset code.');
    } finally { setSending(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40vw', height: '40vw', background: 'var(--primary-glow)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.4 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '30vw', height: '30vw', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.3 }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <div className="card shadow-premium" style={{ padding: '48px', border: 'none', background: '#fff', borderRadius: '32px' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, background: 'var(--primary)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: 'var(--shadow-lg)' }}>
              <GraduationCap size={32} />
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8, letterSpacing: '-0.03em' }}>Welcome back</h1>
            <p style={{ fontSize: 16, color: 'var(--gray-500)', fontWeight: 500, height: '1.5em' }}>
              {typed}<span style={{ color: 'var(--primary)', fontWeight: 700, marginLeft: 2, animation: 'pulse 1s infinite' }}>|</span>
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: 12, padding: '16px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '16px', marginBottom: 24, fontSize: 14, fontWeight: 600, alignItems: 'center' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>Username or Email</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input 
                  type="text" 
                  className="input card" 
                  placeholder="student.id" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  style={{ paddingLeft: 48, background: 'var(--gray-50)', border: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)' }}>Security Password</label>
                <button type="button" onClick={() => setShowModal(true)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Forgot?</button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input 
                  type={hidePass ? 'password' : 'text'} 
                  className="input card" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: 48, paddingRight: 48, background: 'var(--gray-50)', border: 'none' }}
                />
                <button type="button" onClick={() => setHidePass(!hidePass)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {hidePass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: '16px', marginTop: 8 }} disabled={loading}>
              {loading ? <Loader2 className="spin-ico" size={20} /> : <><ShieldCheck size={20} style={{ marginRight: 10 }} /> Access Portal</>}
            </button>
          </form>

          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 500 }}>New member? </span>
            <Link to="/signup" style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>Create Student Account</Link>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, letterSpacing: '0.05em' }}>
          SECURED BY ENCRYPT-X SYSTEM · © 2025 EXAMFRONT
        </div>
      </div>

      {/* Recovery Modal */}
      {showModal && (
        <div className="glass" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowModal(false)}>
          <div className="card shadow-premium animate-fade-in" style={{ width: '100%', maxWidth: 400, padding: '32px', background: '#fff', border: 'none' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, background: 'var(--primary-glow)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <ShieldCheck size={20} />
              </div>
              <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            {success ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, background: 'var(--success-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', margin: '0 auto 20px' }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>Verification Sent</h3>
                <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.5, marginBottom: 24 }}>A recovery code has been dispatched to <strong>{successPhone}</strong>. Please check your SMS.</p>
                <button onClick={() => setShowModal(false)} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>Recover Access</h3>
                <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.5, marginBottom: 24 }}>Enter your registered mobile number to receive a secure recovery code.</p>
                
                <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                    <input 
                      type="tel" 
                      className="input card" 
                      placeholder="e.g. 0544 073 427" 
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                      style={{ paddingLeft: 48, background: 'var(--gray-50)', border: 'none' }}
                    />
                  </div>
                  {apiErr && <div style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>{apiErr}</div>}
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={sending}>
                    {sending ? <Loader2 className="spin-ico" size={18} /> : 'Send Recovery Code'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
