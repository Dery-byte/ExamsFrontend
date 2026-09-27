import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import {
  getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead,
  type AppNotification,
} from '../api/endpoints';
import { useAuth } from '../contexts/AuthContext';

/** Home route per role — used to open announcements from the bell. */
export const ROLE_BASE: Record<string, string> = {
  SUPER_ADMIN: '/super-admin', ADMIN: '/admin', LECTURER: '/lect', NORMAL: '/user-dashboard',
};

function timeAgo(iso: string) {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

/** Header bell: unread badge (polled every minute) and a dropdown of recent notifications. */
export default function NotificationBell({ dark = false }: { dark?: boolean }) {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 60_000,
  });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => getNotifications(30),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });

  const openItem = async (n: AppNotification) => {
    if (!n.read) { try { await markNotificationRead(n.id); } catch { /* non-critical */ } refresh(); }
    setOpen(false);
    const base = ROLE_BASE[user?.role] ?? '';
    navigate(n.link ?? `${base}/announcements`);
  };

  const readAll = async () => {
    try { await markAllNotificationsRead(); } finally { refresh(); }
  };

  const c = dark
    ? { icon: '#a78bfa', btnBg: 'rgba(139,92,246,0.08)', btnBorder: 'rgba(139,92,246,0.2)' }
    : { icon: '#555b6d', btnBg: 'transparent', btnBorder: 'transparent' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        style={{
          position: 'relative', width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: c.btnBg, border: `1px solid ${c.btnBorder}`, color: c.icon,
        }}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 3, right: 3, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9,
            background: '#e34948', color: '#fff', fontSize: 10, fontWeight: 800, lineHeight: '17px', textAlign: 'center',
          }}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="notif-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #eef0f4' }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={readAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#5156be', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 size={20} className="notif-spin" color="#5156be" /></div>
            ) : items.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>You're all caught up.</div>
            ) : items.map(n => (
              <button key={n.id} onClick={() => openItem(n)} className="notif-item" style={{ background: n.read ? '#fff' : '#f5f6ff' }}>
                {!n.read && <span aria-label="Unread" style={{ position: 'absolute', left: 6, top: 18, width: 7, height: 7, borderRadius: '50%', background: '#5156be' }} />}
                <div style={{ fontSize: 13, fontWeight: n.read ? 600 : 800, color: '#1e293b' }}>{n.title}</div>
                {n.message && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>}
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .notif-panel {
          position: absolute; right: 0; top: calc(100% + 8px); width: 340px; max-width: calc(100vw - 32px);
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 12px 32px rgba(15,23,42,0.18);
          z-index: 2000; overflow: hidden; text-align: left;
        }
        .notif-item {
          position: relative; display: block; width: 100%; text-align: left; padding: 11px 14px 11px 20px;
          border: none; border-bottom: 1px solid #f1f5f9; cursor: pointer; font-family: inherit;
        }
        .notif-item:hover { background: #eef0ff !important; }
        .notif-spin { animation: notif-spin 1s linear infinite; }
        @keyframes notif-spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) { .notif-panel { position: fixed; left: 16px; right: 16px; top: 64px; width: auto; } }
      `}</style>
    </div>
  );
}
