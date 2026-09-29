import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, KeyRound, Loader2, TerminalSquare, ArrowLeft } from 'lucide-react';
import { requestDeveloperCode, verifyDeveloperCode } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';

/** Developer sign-in: email → 6-digit code sent to that email → dashboard. */
export default function DeveloperLogin() {
  const { user, isLoggedIn, loginWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  if (isLoggedIn && user?.role === 'DEVELOPER') return <Navigate to="/developer/dashboard" replace />;

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(''); setInfo('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setBusy(true);
    try {
      const res = await requestDeveloperCode(email.trim());
      setInfo(res.message);
      setStep('code');
      setCode('');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not send the code. Try again in a moment.');
    } finally { setBusy(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from the email.'); return; }
    setBusy(true);
    try {
      const { token } = await verifyDeveloperCode(email.trim(), code.trim());
      await loginWithToken(token);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'That code is wrong or has expired.');
      setBusy(false);
    }
  };

  return (
    <div className="dl-wrap">
      <div className="dl-card">
        <div className="dl-icon"><TerminalSquare size={24} /></div>
        <h1>Developer sign-in</h1>

        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <label htmlFor="dl-email">Email</label>
            <div className="dl-input">
              <Mail size={16} />
              <input id="dl-email" type="email" autoComplete="email" autoFocus value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            {error && <div className="dl-error" role="alert">{error}</div>}
            <button type="submit" className="dl-btn" disabled={busy}>
              {busy && <Loader2 size={16} className="dl-spin" />} Send token to email
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <p className="dl-info">{info} <br />Sent to <strong>{email.trim()}</strong>.</p>
            <label htmlFor="dl-code">6-digit code</label>
            <div className="dl-input">
              <KeyRound size={16} />
              <input id="dl-code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456"
                style={{ letterSpacing: 6, fontFamily: 'monospace', fontSize: 18 }} />
            </div>
            {error && <div className="dl-error" role="alert">{error}</div>}
            <button type="submit" className="dl-btn" disabled={busy}>
              {busy && <Loader2 size={16} className="dl-spin" />} Verify and sign in
            </button>
            <div className="dl-links">
              <button type="button" onClick={() => { setStep('email'); setError(''); }}><ArrowLeft size={13} /> Change email</button>
              <button type="button" onClick={() => sendCode()} disabled={busy}>Send a new code</button>
            </div>
          </form>
        )}
      </div>
      <style>{`
        .dl-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; background: #0f172a; }
        .dl-card { width: 100%; max-width: 400px; background: #fff; border-radius: 16px; padding: 28px 24px; }
        .dl-icon { width: 48px; height: 48px; border-radius: 12px; background: #0f172a; color: #38bdf8; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .dl-card h1 { font-size: 20px; margin: 0 0 16px; color: #0f172a; }
        .dl-card label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; }
        .dl-input { display: flex; align-items: center; gap: 8px; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0 12px; color: #94a3b8; margin-bottom: 12px; }
        .dl-input:focus-within { border-color: #0ea5e9; }
        .dl-input input { flex: 1; min-width: 0; border: none; outline: none; height: 44px; font-size: 15px; color: #0f172a; background: transparent; }
        .dl-btn { width: 100%; height: 44px; border: none; border-radius: 10px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .dl-btn:disabled { opacity: 0.7; cursor: default; }
        .dl-info { font-size: 13px; color: #475569; background: #f0f9ff; border-radius: 8px; padding: 10px 12px; margin: 0 0 14px; line-height: 1.5; }
        .dl-error { background: #fef2f2; color: #b91c1c; border-radius: 8px; padding: 9px 12px; font-size: 13px; margin-bottom: 12px; }
        .dl-links { display: flex; justify-content: space-between; margin-top: 12px; }
        .dl-links button { border: none; background: none; color: #0369a1; font-size: 12.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
        .dl-spin { animation: dl-spin 1s linear infinite; }
        @keyframes dl-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
