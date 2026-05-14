import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPasswordWithToken } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPasswordWithToken({ token, newPassword });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Reset failed. Check your token.');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-container">
      <Toaster position="top-right"/>
      <div className="accent-bar"/><div className="bg-glow"/><div className="grid-lines"/>
      <main className="main-content">
        <div className="login-wrap">
          <div className="logo-area"><div className="logo-tile"><span>OTC</span></div></div>
          <div className="page-title-area"><h1 className="page-title">Reset Password</h1></div>
          <div className="login-card">
            <form onSubmit={handleSubmit}>
              <div className="form-fields">
                <div className="field-block">
                  <label className="field-lbl">Reset Token</label>
                  <div className="field-shell no-icon"><input value={token} onChange={e=>setToken(e.target.value)} required type="text" placeholder="Enter your reset token"/></div>
                </div>
                <div className="field-block">
                  <label className="field-lbl">New Password</label>
                  <div className="field-shell no-icon"><input value={newPassword} onChange={e=>setNewPassword(e.target.value)} required type="password" placeholder="••••••••"/></div>
                </div>
              </div>
              <button type="submit" className="go-btn" disabled={loading} style={{marginTop:16}}>
                <span className="shimmer"/><span className="btn-txt">{loading?'Resetting…':'Reset Password'}</span>
              </button>
            </form>
            <div className="signup-row"><Link to="/login" className="signup-btn">Back to Login</Link></div>
          </div>
        </div>
      </main>
    </div>
  );
}
