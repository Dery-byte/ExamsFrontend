import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordWithToken } from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2, Key } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hidePass, setHidePass] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    if (!token.trim()) {
      setError('Reset token is required.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithToken({ token: token.trim(), newPassword });
      toast.success('Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Reset failed. Check your token.');
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <>
      <style>{`
        /* ── Reset Password Page ────────────────────────────── */
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
        }

        /* ── Responsive ────────────────────────────── */
        @media (max-width: 640px) {
          .login-wrapper { padding: 16px 12px; }
          .login-card { padding: 28px 20px; border-radius: 24px; }
          .login-title { font-size: 26px; }
          .login-subtitle { font-size: 14px; }
          .login-decor-1 { filter: blur(70px); opacity: 0.3; }
          .login-decor-2 { filter: blur(70px); opacity: 0.2; }
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
                <Lock size={32} />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 className="login-title">Reset Password</h1>
              <p className="login-subtitle">
                Enter your new password to secure your account
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
              {/* Reset Token */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>
                  Reset Token
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input
                    type="text"
                    className="input card"
                    placeholder="Enter reset token"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    required
                    readOnly={!!tokenParam}
                    style={{ 
                      paddingLeft: 48, 
                      background: tokenParam ? 'var(--gray-100)' : 'var(--gray-50)', 
                      border: 'none', 
                      width: '100%', 
                      boxSizing: 'border-box',
                      color: tokenParam ? 'var(--gray-500)' : 'inherit',
                      cursor: tokenParam ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
              </div>

              {/* New Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input
                    type={hidePass ? 'password' : 'text'}
                    className="input card"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
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
              
              {/* Confirm New Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input
                    type={hideConfirm ? 'password' : 'text'}
                    className="input card"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    style={{ paddingLeft: 48, paddingRight: 48, background: 'var(--gray-50)', border: 'none', width: '100%', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setHideConfirm(!hideConfirm)}
                    style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {hideConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
                style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: '16px', marginTop: 4 }}
                disabled={loading}
              >
                {loading ? <Loader2 className="spin-ico" size={20} /> : <><Lock size={20} style={{ marginRight: 10 }} /> Reset Password</>}
              </button>
            </form>

            <div style={{ marginTop: 36, textAlign: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 500 }}>Remember your password? </span>
              <Link to="/login" style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                Back to Login
              </Link>
            </div>
          </div>
          
          <div style={{ marginTop: 22, textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, letterSpacing: '0.05em' }}>
            OTC · © 2026
          </div>
        </div>
      </div>
    </>
  );
}
