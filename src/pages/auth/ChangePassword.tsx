import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, LogOut } from 'lucide-react';
import { changeMyPassword } from '../../api/endpoints';
import { homeFor, useAuth } from '../../contexts/AuthContext';

/** Shown after sign-in while an account still has the password staff gave it. */
export default function ChangePassword() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 6) { setError('Your new password must be at least 6 characters.'); return; }
    if (next !== confirm) { setError('The two new passwords don’t match.'); return; }
    if (next === current) { setError('Choose a password different from the one you were given.'); return; }
    setSaving(true);
    try {
      await changeMyPassword(next, current);
      updateUser({ mustChangePassword: false });
      toast.success('Password changed');
      navigate(user ? homeFor(user.role) : '/login', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not change your password. Try again.');
    } finally { setSaving(false); }
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, auto: string) => (
    <div className="cp-field">
      <label htmlFor={id}>{label}</label>
      <div className="cp-input">
        <Lock size={15} />
        <input id={id} type={show ? 'text' : 'password'} value={value} autoComplete={auto} required
          onChange={e => set(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="cp-wrap">
      <form className="cp-card" onSubmit={submit}>
        <div className="cp-icon"><ShieldCheck size={26} /></div>
        <h1>Choose your own password</h1>
        <p className="cp-sub">
          {user?.firstname ? `Welcome, ${user.firstname}. ` : ''}Your account was set up with a password someone else chose.
          Pick a new one to continue.
        </p>

        {field('cp-current', 'Password you were given', current, setCurrent, 'current-password')}
        {field('cp-new', 'New password', next, setNext, 'new-password')}
        {field('cp-confirm', 'Confirm new password', confirm, setConfirm, 'new-password')}

        <button type="button" className="cp-show" onClick={() => setShow(s => !s)}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Hide passwords' : 'Show passwords'}
        </button>

        {error && <div className="cp-error" role="alert">{error}</div>}

        <button type="submit" className="cp-submit" disabled={saving}>
          {saving && <Loader2 size={16} className="cp-spin" />} Save and continue
        </button>
        <button type="button" className="cp-logout" onClick={logout}><LogOut size={14} /> Sign out</button>
      </form>
      <style>{`
        .cp-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; background: #f4f5fb; }
        .cp-card { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 28px 24px; box-shadow: 0 12px 40px rgba(15,23,42,0.08); }
        .cp-icon { width: 52px; height: 52px; border-radius: 14px; background: #eef0ff; color: #5156be; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .cp-card h1 { font-size: 20px; margin: 0 0 6px; color: #1e293b; }
        .cp-sub { font-size: 13.5px; color: #64748b; margin: 0 0 18px; line-height: 1.5; }
        .cp-field { margin-bottom: 12px; }
        .cp-field label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 5px; }
        .cp-input { display: flex; align-items: center; gap: 8px; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0 12px; color: #94a3b8; }
        .cp-input:focus-within { border-color: #5156be; }
        .cp-input input { flex: 1; border: none; outline: none; height: 42px; font-size: 14px; color: #1e293b; background: transparent; }
        .cp-show { display: inline-flex; align-items: center; gap: 5px; border: none; background: none; color: #5156be; font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 2px 0 10px; }
        .cp-error { background: #fef2f2; color: #b91c1c; border-radius: 8px; padding: 9px 12px; font-size: 13px; margin-bottom: 12px; }
        .cp-submit { width: 100%; height: 44px; border: none; border-radius: 10px; background: #5156be; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .cp-submit:disabled { opacity: 0.7; cursor: default; }
        .cp-logout { width: 100%; margin-top: 10px; height: 38px; border: none; background: none; color: #64748b; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .cp-spin { animation: cp-spin 1s linear infinite; }
        @keyframes cp-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
