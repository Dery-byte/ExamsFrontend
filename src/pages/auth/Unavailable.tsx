import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Lock, LogOut, LogIn, RefreshCw } from 'lucide-react';
import { getSubscriptionNotice } from '../../api/endpoints';
import { useAuth, homeFor } from '../../contexts/AuthContext';
import { useInstitution } from '../../hooks/useInstitution';
import { noticeText, PayActions } from '../../components/common/SubscriptionNotice';

/**
 * Where someone lands when the portal is suspended for them. Everyone sees a neutral message;
 * those the developer chose to tell (Super Admins, Admins if chosen) also see why and whom to contact.
 */
export default function Unavailable() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { institution } = useInstitution();
  const q = useQuery({ queryKey: ['subscription-notice', user?.username], queryFn: getSubscriptionNotice, enabled: !!user, retry: false });

  // Access is back (renewed, or the suspension was lifted): carry on
  useEffect(() => {
    if (user && q.data && q.data.access !== 'BLOCKED') navigate(homeFor(user.role), { replace: true });
  }, [user, q.data, navigate]);

  const details = q.data?.state && q.data.state !== 'ACTIVE' ? noticeText(q.data) : null;

  return (
    <div className="ua-page">
      <main className="ua-card">
        <span className="ua-ico" aria-hidden><Lock size={26} /></span>
        <h1>{details ? details.title : 'Portal unavailable'}</h1>
        <p className="ua-lead">
          {details ? details.body
            : `${institution.name ? institution.name + "'s portal" : 'This portal'} is unavailable at the moment. Please contact your institution's administrator.`}
        </p>
        {details && q.data?.contact && <p className="ua-contact">To renew or ask about this: {q.data.contact}</p>}
        {details && q.data && <PayActions notice={q.data} className="ua-pay" />}
        <p className="ua-note">Students already in an exam can still finish and submit it.</p>
        <div className="ua-actions">
          {user ? (
            <>
              {/* "I've paid, check now" above already asks the vendor portal; this only re-reads the notice */}
              {!q.data?.canCheckPayment && (
                <button type="button" className="ua-btn ua-btn-ghost" onClick={() => q.refetch()} disabled={q.isFetching}>
                  <RefreshCw size={16} className={q.isFetching ? 'ua-spin' : ''} /> Check again
                </button>
              )}
              <button type="button" className="ua-btn" onClick={logout}><LogOut size={16} /> Sign out</button>
            </>
          ) : (
            <button type="button" className="ua-btn" onClick={() => navigate('/login')}><LogIn size={16} /> Go to sign-in</button>
          )}
        </div>
      </main>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.ua-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px;
  background: var(--brand-soft, #f1f1fa); font-family: Inter, system-ui, sans-serif; }
.ua-card { width: min(520px, 100%); background: #fff; border-radius: 18px; padding: 32px 28px; text-align: center;
  box-shadow: 0 20px 50px rgba(15,23,42,.12); border: 1px solid rgba(15,23,42,.06); }
.ua-ico { display: inline-flex; width: 56px; height: 56px; border-radius: 16px; align-items: center; justify-content: center;
  background: #fef2f2; color: #dc2626; margin-bottom: 14px; }
.ua-card h1 { margin: 0 0 10px; font-size: 22px; color: #0f172a; }
.ua-lead { margin: 0; color: #334155; font-size: 15px; line-height: 1.6; }
.ua-contact { margin: 14px 0 0; padding: 10px 12px; border-radius: 10px; background: #f8fafc; color: #0f172a; font-weight: 600; font-size: 14px; overflow-wrap: anywhere; }
.ua-note { margin: 14px 0 0; color: #64748b; font-size: 13px; }
.ua-pay { justify-content: center; margin-top: 16px; }
.ua-pay .sn-inv { text-align: center; }
.ua-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 22px; }
.ua-btn { display: inline-flex; align-items: center; gap: 8px; min-height: 42px; padding: 0 18px; border-radius: 10px; border: none;
  background: var(--brand, #5156be); color: var(--brand-contrast, #fff); font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; }
.ua-btn:disabled { opacity: .6; cursor: default; }
.ua-btn-ghost { background: transparent; color: var(--brand-text, #5156be); border: 1px solid var(--brand-border, #c9cbee); }
.ua-spin { animation: ua-spin 1s linear infinite; }
@keyframes ua-spin { to { transform: rotate(360deg); } }
@media (max-width: 420px) { .ua-card { padding: 26px 18px; } .ua-actions .ua-btn { flex: 1; justify-content: center; } }
`;
