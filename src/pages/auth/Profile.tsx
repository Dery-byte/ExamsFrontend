import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  User, Mail, Phone, Shield, ShieldCheck, Key, Lock,
  Edit, RefreshCw, AlertCircle, BadgeCheck, Camera,
  Briefcase, ChevronRight, CheckCircle, XCircle
} from 'lucide-react';

const ROLE_META: Record<string, { label: string; color: string; bg: string; grad: string; icon: React.ReactNode }> = {
  ADMIN: { label: 'Administrator', color: '#5156be', bg: '#eef2ff', grad: 'linear-gradient(135deg,#5156be,#7c3aed)', icon: <Shield size={18}/> },
  LECTURER: { label: 'Academic Faculty', color: '#0891b2', bg: '#ecfeff', grad: 'linear-gradient(135deg,#0891b2,#06b6d4)', icon: <Briefcase size={18}/> },
  NORMAL: { label: 'Student', color: '#059669', bg: '#ecfdf5', grad: 'linear-gradient(135deg,#059669,#10b981)', icon: <User size={18}/> },
};

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = `${user.firstname?.[0]??''}${user.lastname?.[0]??''}`.toUpperCase() || user.username[0].toUpperCase();
  const rawRole = user.authorities?.[0]?.authority?.replace('ROLE_','') ?? user.role ?? 'NORMAL';
  const meta = ROLE_META[rawRole] ?? ROLE_META['NORMAL'];
  const displayName = user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : user.username;

  const statusItems = [
    { label: 'Account Active', ok: !!user.enabled },
    { label: 'Credentials Valid', ok: !!user.credentialsNonExpired },
    { label: 'Account Unlocked', ok: !!user.accountNonLocked },
    { label: 'Account Current', ok: !!user.accountNonExpired },
  ];

  return (
    <div className="pf-page">
      {/* Breadcrumb */}
      <div className="pf-breadcrumb">
        <span>Portal</span><ChevronRight size={12}/><span>Account</span><ChevronRight size={12}/><span className="active">Profile</span>
      </div>

      <div className="pf-grid">
        {/* ── LEFT COLUMN ── */}
        <aside className="pf-left">
          {/* Profile Card */}
          <div className="pf-card pf-profile-card">
            <div className="pf-banner" style={{ background: meta.grad }} />
            <div className="pf-profile-body">
              <div className="pf-avatar-wrap">
                <div className="pf-avatar" style={{ background: meta.bg, color: meta.color }}>
                  {initials}
                </div>
                <button className="pf-avatar-btn"><Camera size={14}/></button>
              </div>
              <h3 className="pf-name">{displayName}</h3>
              <p className="pf-username">@{user.username}</p>
              <div className="pf-role-badge" style={{ background: meta.bg, color: meta.color }}>
                {meta.icon}<span>{meta.label}</span>
              </div>
              <p className="pf-bio">
                {(user as any).bio || 'No bio provided. Update your profile to add your academic background.'}
              </p>
              <button className="pf-btn-primary" style={{ background: meta.grad }}>
                <Edit size={16}/><span>Edit Profile</span>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="pf-card pf-stats-card">
            <p className="pf-card-label">Account Overview</p>
            <div className="pf-stats-row">
              <div className="pf-stat">
                <span className="pf-stat-val" style={{ color: '#10b981' }}>{user.enabled ? 'Active' : 'Inactive'}</span>
                <span className="pf-stat-lab">Status</span>
              </div>
              <div className="pf-stat-divider"/>
              <div className="pf-stat">
                <span className="pf-stat-val" style={{ color: meta.color }}>{meta.label}</span>
                <span className="pf-stat-lab">Role</span>
              </div>
            </div>
            <div className="pf-verified-note">
              <ShieldCheck size={14}/><span>Credentials verified by institutional protocol</span>
            </div>
          </div>
        </aside>

        {/* ── RIGHT COLUMN ── */}
        <div className="pf-right">
          {/* Personal Info */}
          <div className="pf-card">
            <div className="pf-card-head">
              <div className="pf-card-head-left">
                <div className="pf-head-icon" style={{ background: meta.bg, color: meta.color }}><User size={18}/></div>
                <div>
                  <h6 className="pf-card-title">Personal Information</h6>
                  <p className="pf-card-sub">Your registered identity details</p>
                </div>
              </div>
              <div className="pf-sync-tag"><RefreshCw size={11}/> Synced</div>
            </div>
            <div className="pf-card-body">
              <div className="pf-info-grid">
                {[
                  { icon: <User size={16}/>, label: 'Full Name', value: displayName },
                  { icon: <BadgeCheck size={16}/>, label: 'Username', value: `@${user.username}` },
                  { icon: <Mail size={16}/>, label: 'Email Address', value: user.email || 'Not provided' },
                  { icon: <Phone size={16}/>, label: 'Phone Number', value: (user as any).phone || 'Not provided' },
                  { icon: <Shield size={16}/>, label: 'Role', value: meta.label },
                  { icon: <Key size={16}/>, label: 'Account ID', value: `#${user.id || 'N/A'}` },
                ].map((item, i) => (
                  <div key={i} className="pf-info-item">
                    <div className="pf-info-icon">{item.icon}</div>
                    <div>
                      <p className="pf-info-label">{item.label}</p>
                      <p className="pf-info-value">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security Status */}
          <div className="pf-card">
            <div className="pf-card-head">
              <div className="pf-card-head-left">
                <div className="pf-head-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><Lock size={18}/></div>
                <div>
                  <h6 className="pf-card-title">Security & Account Status</h6>
                  <p className="pf-card-sub">Live account health indicators</p>
                </div>
              </div>
            </div>
            <div className="pf-card-body">
              <div className="pf-status-list">
                {statusItems.map((s, i) => (
                  <div key={i} className="pf-status-row">
                    <span className="pf-status-label">{s.label}</span>
                    <span className={`pf-pill ${s.ok ? 'pf-pill-ok' : 'pf-pill-err'}`}>
                      {s.ok ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                      {s.ok ? 'OK' : 'Issue'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pf-card pf-actions-card">
            <h6 className="pf-actions-title">Account Actions</h6>
            <div className="pf-actions-row">
              <button className="pf-action-btn pf-action-primary" style={{ background: meta.grad }}>
                <Key size={16}/><span>Change Password</span>
              </button>
              <button className="pf-action-btn pf-action-danger">
                <AlertCircle size={16}/><span>Deactivate Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .pf-page { font-family:'Inter',sans-serif; padding:24px; background:#f0f2f8; min-height:100vh; color:#1e293b; }

        .pf-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:#94a3b8; font-weight:500; margin-bottom:24px; }
        .pf-breadcrumb .active { color:#5156be; font-weight:700; }

        .pf-grid { display:grid; grid-template-columns:320px 1fr; gap:20px; align-items:start; }

        /* Cards */
        .pf-card { background:#fff; border-radius:18px; border:1px solid #e8edf2; box-shadow:0 4px 24px -4px rgba(0,0,0,0.06); overflow:hidden; margin-bottom:20px; }
        .pf-card:last-child { margin-bottom:0; }

        /* Profile Card */
        .pf-banner { height:100px; }
        .pf-profile-body { padding:0 28px 28px; text-align:center; margin-top:-44px; }
        .pf-avatar-wrap { position:relative; display:inline-block; margin-bottom:16px; }
        .pf-avatar { width:88px; height:88px; border-radius:22px; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:900; border:4px solid #fff; box-shadow:0 8px 24px -4px rgba(0,0,0,0.12); }
        .pf-avatar-btn { position:absolute; bottom:-4px; right:-4px; width:28px; height:28px; border-radius:8px; background:#fff; border:1px solid #e2e8f0; color:#64748b; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.2s; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
        .pf-avatar-btn:hover { background:#5156be; color:#fff; border-color:#5156be; }
        .pf-name { font-size:20px; font-weight:800; color:#1e293b; margin:0 0 4px; }
        .pf-username { font-size:13px; color:#94a3b8; font-weight:600; margin:0 0 14px; }
        .pf-role-badge { display:inline-flex; align-items:center; gap:7px; padding:7px 16px; border-radius:10px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; margin-bottom:16px; }
        .pf-bio { font-size:13px; color:#94a3b8; line-height:1.65; margin:0 0 20px; padding:14px; background:#f8fafc; border-radius:12px; font-weight:500; }
        .pf-btn-primary { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:13px; border-radius:12px; border:none; color:#fff; font-size:14px; font-weight:700; cursor:pointer; transition:.3s; font-family:'Inter',sans-serif; box-shadow:0 4px 16px -4px rgba(81,86,190,.5); }
        .pf-btn-primary:hover { transform:translateY(-1px); filter:brightness(1.08); }

        /* Stats */
        .pf-stats-card { padding:24px; }
        .pf-card-label { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin:0 0 16px; }
        .pf-stats-row { display:flex; align-items:center; gap:0; margin-bottom:18px; background:#f8fafc; border-radius:12px; overflow:hidden; }
        .pf-stat { flex:1; text-align:center; padding:16px 12px; }
        .pf-stat-divider { width:1px; background:#e2e8f0; align-self:stretch; }
        .pf-stat-val { display:block; font-size:15px; font-weight:800; color:#1e293b; margin-bottom:3px; }
        .pf-stat-lab { display:block; font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; }
        .pf-verified-note { display:flex; align-items:center; gap:8px; font-size:11px; color:#10b981; font-weight:700; padding:10px 14px; background:#ecfdf5; border-radius:10px; justify-content:center; }

        /* Card Header */
        .pf-card-head { display:flex; align-items:center; justify-content:space-between; padding:22px 24px; border-bottom:1px solid #f1f5f9; }
        .pf-card-head-left { display:flex; align-items:center; gap:14px; }
        .pf-head-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pf-card-title { font-size:15px; font-weight:800; color:#1e293b; margin:0 0 2px; }
        .pf-card-sub { font-size:12px; color:#94a3b8; margin:0; font-weight:500; }
        .pf-sync-tag { display:flex; align-items:center; gap:5px; font-size:11px; color:#10b981; font-weight:700; background:#ecfdf5; padding:5px 10px; border-radius:8px; }
        .pf-card-body { padding:20px 24px 24px; }

        /* Info Grid */
        .pf-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
        .pf-info-item { display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:12px; background:#f8fafc; border:1px solid #f1f5f9; transition:.2s; }
        .pf-info-item:hover { background:#f5f7ff; border-color:#c7d2fe; }
        .pf-info-icon { width:34px; height:34px; border-radius:9px; background:#fff; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; color:#64748b; flex-shrink:0; }
        .pf-info-label { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; margin:0 0 3px; }
        .pf-info-value { font-size:13px; font-weight:700; color:#1e293b; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Status */
        .pf-status-list { display:flex; flex-direction:column; gap:4px; }
        .pf-status-row { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-radius:12px; background:#f8fafc; border:1px solid #f1f5f9; }
        .pf-status-label { font-size:14px; font-weight:700; color:#1e293b; }
        .pf-pill { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:8px; font-size:11px; font-weight:800; text-transform:uppercase; }
        .pf-pill-ok { background:#ecfdf5; color:#10b981; }
        .pf-pill-err { background:#fef2f2; color:#dc2626; }

        /* Actions */
        .pf-actions-card { padding:22px 24px; }
        .pf-actions-title { font-size:14px; font-weight:800; color:#1e293b; margin:0 0 16px; }
        .pf-actions-row { display:flex; gap:12px; }
        .pf-action-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:13px 16px; border-radius:12px; border:none; font-size:13px; font-weight:700; cursor:pointer; transition:.25s; font-family:'Inter',sans-serif; }
        .pf-action-primary { color:#fff; box-shadow:0 4px 14px -4px rgba(81,86,190,.45); }
        .pf-action-primary:hover { filter:brightness(1.08); transform:translateY(-1px); }
        .pf-action-danger { background:#fef2f2; color:#dc2626; border:1.5px solid #fecaca; }
        .pf-action-danger:hover { background:#dc2626; color:#fff; }

        /* Responsive */
        @media (max-width:1024px) {
          .pf-grid { grid-template-columns:280px 1fr; }
        }
        @media (max-width:768px) {
          .pf-page { padding:16px; }
          .pf-grid { grid-template-columns:1fr; }
          .pf-info-grid { grid-template-columns:1fr; }
          .pf-actions-row { flex-direction:column; }
          .pf-stats-row { flex-direction:column; }
          .pf-stat-divider { width:auto; height:1px; }
        }
        @media (max-width:480px) {
          .pf-card-head { flex-direction:column; align-items:flex-start; gap:10px; }
          .pf-profile-body { padding:0 18px 22px; }
        }
      `}</style>
    </div>
  );
}
