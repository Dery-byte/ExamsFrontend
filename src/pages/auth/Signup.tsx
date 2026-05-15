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
  ArrowRight,
  CheckCircle2,
  Loader2,
  GraduationCap,
  ShieldCheck,
  Info,
  ChevronRight
} from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hidePass, setHidePass] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [user, setUser] = useState({
    firstname: '', lastname: '', username: '', email: '', phone: '', password: '',
  });

  const set = (k: keyof typeof user) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setUser(u => ({ ...u, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await registerStudent(user);
      toast.success('Account created successfully!', {
        icon: '🎓',
        style: { borderRadius: '12px', background: '#333', color: '#fff' }
      });
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Registration failed. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        .signup-wrapper {
          min-height: 100vh;
          background: var(--gray-50);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          position: relative;
          overflow: hidden;
        }
        .signup-decor-1 {
          position: absolute;
          top: -10%;
          right: -5%;
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
        .signup-decor-2 {
          position: absolute;
          bottom: -10%;
          left: -5%;
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
        .signup-inner {
          width: 100%;
          max-width: 800px;
          position: relative;
          z-index: 1;
        }
        .signup-card {
          padding: 56px;
          border: none;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.04);
        }
        .signup-title {
          font-size: 32px;
          font-weight: 800;
          color: var(--gray-900);
          margin-bottom: 8px;
          letter-spacing: -0.03em;
        }
        .signup-subtitle {
          font-size: 16px;
          color: var(--gray-500);
          font-weight: 500;
        }
        .form-section-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--gray-900);
        }
        .input-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        @media (max-width: 768px) {
          .signup-wrapper { padding: 40px 16px; }
          .signup-card { padding: 32px 24px; border-radius: 24px; }
          .signup-title { font-size: 28px; }
          .signup-subtitle { font-size: 14px; }
          .input-grid { grid-template-columns: 1fr; gap: 20px; }
          .signup-decor-1 { filter: blur(70px); opacity: 0.3; }
          .signup-decor-2 { filter: blur(70px); opacity: 0.2; }
        }
        
        @media (max-width: 480px) {
          .signup-card { padding: 24px 16px; }
          .signup-title { font-size: 24px; }
          .form-section-title { font-size: 16px; }
        }
      `}</style>

      <div className="signup-wrapper">
        <Toaster position="top-right" />

        {/* Decorative Elements */}
        <div className="signup-decor-1" />
        <div className="signup-decor-2" />

        <div className="signup-inner animate-fade-in">
          <div className="card shadow-premium signup-card">

            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ width: 56, height: 56, background: 'var(--primary)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 24px', boxShadow: 'var(--shadow-lg)' }}>
                <GraduationCap size={28} />
              </div>
              <h1 className="signup-title">Create Account</h1>
              <p className="signup-subtitle">Join the Examfront academic network today.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

              {/* Identity Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <div style={{ width: 32, height: 32, background: 'var(--primary-glow)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <User size={18} />
                  </div>
                  <h3 className="form-section-title">Identity</h3>
                </div>

                <div className="input-grid">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginLeft: 4 }}>First Name</label>
                    <input type="text" className="input card" placeholder="John" value={user.firstname} onChange={set('firstname')} required style={{ background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginLeft: 4 }}>Last Name</label>
                    <input type="text" className="input card" placeholder="Doe" value={user.lastname} onChange={set('lastname')} required style={{ background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginLeft: 4 }}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                    <input type="text" className="input card" placeholder="student.id" value={user.username} onChange={set('username')} required style={{ paddingLeft: 48, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <div style={{ width: 32, height: 32, background: 'var(--accent-glow)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Mail size={18} />
                  </div>
                  <h3 className="form-section-title">Communication</h3>
                </div>

                <div className="input-grid">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginLeft: 4 }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                      <input type="email" className="input card" placeholder="name@email.com" value={user.email} onChange={set('email')} required style={{ paddingLeft: 48, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginLeft: 4 }}>Phone Number</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                      <input type="tel" className="input card" placeholder="0544 000 000" value={user.phone} onChange={set('phone')} required style={{ paddingLeft: 48, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <div style={{ width: 32, height: 32, background: 'var(--success-bg)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                    <ShieldCheck size={18} />
                  </div>
                  <h3 className="form-section-title">Security</h3>
                </div>

                <div className="input-grid">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginLeft: 4 }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                      <input type={hidePass ? 'password' : 'text'} className="input card" placeholder="••••••••" value={user.password} onChange={set('password')} required style={{ paddingLeft: 48, paddingRight: 48, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                      <button type="button" onClick={() => setHidePass(!hidePass)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {hidePass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginLeft: 4 }}>Confirm</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                      <input type={hideConfirm ? 'password' : 'text'} className="input card" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ paddingLeft: 48, paddingRight: 48, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                      <button type="button" onClick={() => setHideConfirm(!hideConfirm)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {hideConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '18px', fontSize: 16, borderRadius: '18px' }} disabled={loading}>
                  {loading ? <Loader2 className="spin-ico" size={20} /> : <><ShieldCheck size={20} style={{ marginRight: 12 }} /> Create Account</>}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 500 }}>Already registered? </span>
                  <Link to="/login" style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>Sign in here</Link>
                </div>
              </div>
            </form>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: 11, fontWeight: 700 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
              OTC
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: 11, fontWeight: 700 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
              @ 2026 All rights reserved
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
