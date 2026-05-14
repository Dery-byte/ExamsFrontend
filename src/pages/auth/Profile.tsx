import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/PageHeader';
import { User, Mail, Phone, Shield, ShieldCheck, Key, Lock, Unlock, Edit, RefreshCw, AlertCircle, BadgeCheck, Camera, MapPin, Briefcase, Calendar, ChevronRight, Settings } from 'lucide-react';

/* ─── Role metadata ───────────────────────────────────────────────────── */
const ROLE_META: Record<string, {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  description: string;
}> = {
  ADMIN: {
    label: 'Senior Administrator',
    color: '#626ed4',
    bg: 'rgba(98, 110, 212, 0.1)',
    icon: <Shield size={20} />,
    description: 'Master system authority with comprehensive registry management privileges.',
  },
  LECTURER: {
    label: 'Academic Faculty',
    color: '#02a4af',
    bg: 'rgba(2, 164, 175, 0.1)',
    icon: <Briefcase size={20} />,
    description: 'Authorized course curator and candidate assessment lead.',
  },
  NORMAL: {
    label: 'Academic Candidate',
    color: '#34c38f',
    bg: 'rgba(52, 195, 143, 0.1)',
    icon: <User size={20} />,
    description: 'Verified student with access to academic modules and assessments.',
  },
};

/* ─── Reusable info-row ───────────────────────────────────────────────── */
function InfoRow({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px 0', borderBottom: '1px solid #f1f5f7' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#74788d', flexShrink: 0, border: '1px solid #f1f5f7' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#adb5bd', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: danger ? '#ec4561' : '#2a3142', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* ─── Status pill ─────────────────────────────────────────────────────── */
function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`lexa-status-pill ${ok ? 'ok' : 'error'}`}
    >
      <div className="dot"></div>
      {label}
    </span>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */
export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  const initials =
    `${user.firstname?.[0] ?? ''}${user.lastname?.[0] ?? ''}`.toUpperCase() ||
    user.username[0].toUpperCase();

  const rawRole =
    user.authorities?.[0]?.authority?.replace('ROLE_', '') ?? user.role ?? 'NORMAL';
  const meta = ROLE_META[rawRole] ?? ROLE_META['NORMAL'];
  const displayName =
    user.firstname && user.lastname
      ? `${user.firstname} ${user.lastname}`
      : user.username;

  return (
    <div className="animate-fade-in" style={{ padding: '10px 0 60px' }}>
      <PageHeader title="Profile Intelligence" breadcrumbs={['Lexa', 'Account', 'Registry Profile']} />

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 30, alignItems: 'start' }}>
        
        {/* Left Column: User Brief */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          <div className="lexa-card profile-main-card">
            <div className="profile-banner"></div>
            <div className="profile-content">
              <div className="avatar-wrapper">
                <div className="avatar-main" style={{ background: meta.bg, color: meta.color, border: `4px solid #fff` }}>
                  {initials}
                </div>
                <button className="avatar-edit-btn"><Camera size={16} /></button>
              </div>
              
              <div className="user-identity">
                <h4 className="name">{displayName}</h4>
                <p className="username">@{user.username}</p>
                <div className="role-badge" style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon} <span>{meta.label}</span>
                </div>
              </div>

              <div className="user-bio">
                <p>{(user as any).bio || 'No biographical overview provided in the registry. Update profile to add academic background.'}</p>
              </div>

              <div className="profile-actions">
                <button className="btn-lexa btn-lexa-primary pulse-on-hover" style={{ width: '100%', height: 52, borderRadius: 15 }}>
                  <Edit size={18} /> Update Registry Details
                </button>
              </div>
            </div>
          </div>

          <div className="lexa-card quick-metrics-card">
            <h6 className="card-title-premium">Registry Overview</h6>
            <div className="metrics-grid">
              <div className="metric-box">
                <div className="val" style={{ color: '#34c38f' }}>{user.enabled ? 'Active' : 'N/A'}</div>
                <div className="lab">Status</div>
              </div>
              <div className="metric-box">
                <div className="val" style={{ color: 'var(--lexa-primary)' }}>Level 4</div>
                <div className="lab">Authority</div>
              </div>
            </div>
            <div className="security-notice">
              <ShieldCheck size={16} />
              <span>Registry credentials verified by institutional protocol</span>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          
          {/* General Information */}
          <div className="lexa-card info-card-premium">
            <div className="card-header-premium">
              <div className="header-info">
                <div className="header-icon-box">
                  <User size={22} />
                </div>
                <h6 className="title">Personal Identity Portfolio</h6>
              </div>
              <button className="settings-btn"><Settings size={18} /></button>
            </div>
            <div className="card-body-premium">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <InfoRow icon={<Mail size={18}/>} label="Registry Email" value={user.email || 'N/A'} />
                <InfoRow icon={<Phone size={18}/>} label="Contact Line" value={(user as any).phone || 'Not Synchronized'} />
                <InfoRow icon={<BadgeCheck size={18}/>} label="Registry Identity" value={displayName} />
                <InfoRow icon={<Shield size={18}/>} label="Access Classification" value={meta.label} />
              </div>
              <div className="location-info">
                <MapPin size={16} />
                <span>Primary Campus Hub • Main Administrative Block</span>
              </div>
            </div>
          </div>

          {/* Account Health & Security */}
          <div className="lexa-card security-card-premium">
            <div className="card-header-premium">
              <div className="header-info">
                <div className="header-icon-box" style={{ background: 'rgba(236, 69, 97, 0.1)', color: '#ec4561' }}>
                  <Lock size={22} />
                </div>
                <h6 className="title">Security & Protocol Status</h6>
              </div>
              <div className="last-sync">
                <RefreshCw size={12} /> Last sync: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="card-body-premium">
              <div className="status-grid">
                {[
                  { label: 'Registry Visibility', ok: !!user.enabled, good: 'Public', bad: 'Hidden', desc: 'Account discoverability in the institutional directory' },
                  { label: 'Credential Integrity', ok: !!user.credentialsNonExpired, good: 'Verified', bad: 'Expired', desc: 'Validation status of login keys and authentication tokens' },
                  { label: 'Access Control', ok: !!user.accountNonLocked, good: 'Authorized', bad: 'Locked', desc: 'System lock status based on security protocol logs' },
                  { label: 'Lifecycle Status', ok: !!user.accountNonExpired, good: 'Synchronized', bad: 'Stale', desc: 'Active temporal status of the registry profile' },
                ].map((item, idx) => (
                  <div key={idx} className="status-row">
                    <div className="status-info">
                      <div className="status-label">{item.label}</div>
                      <div className="status-desc">{item.desc}</div>
                    </div>
                    <StatusPill ok={item.ok} label={item.ok ? item.good : item.bad} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security Actions */}
          <div className="lexa-card actions-card-premium">
            <div className="actions-grid">
              <button className="btn-lexa btn-lexa-primary" style={{ flex: 1, height: 56, borderRadius: 15 }}>
                <Key size={18} /> Rotate Authentication Keys
              </button>
              <button className="btn-lexa btn-lexa-outline" style={{ flex: 1, height: 56, borderRadius: 15, borderColor: '#ec4561', color: '#ec4561' }}>
                <AlertCircle size={18} /> Deactivate Registry Profile
              </button>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .profile-main-card {
          border: none;
          border-radius: 24px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
        }

        .profile-banner {
          height: 120px;
          background: linear-gradient(135deg, #626ed4 0%, #8e84cc 100%);
          position: relative;
        }

        .profile-content {
          padding: 0 35px 35px;
          text-align: center;
          margin-top: -50px;
        }

        .avatar-wrapper {
          position: relative;
          display: inline-block;
          margin-bottom: 25px;
        }

        .avatar-main {
          width: 100px;
          height: 100px;
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: 900;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .avatar-edit-btn {
          position: absolute;
          bottom: -5px;
          right: -5px;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #fff;
          border: 1px solid #f1f5f7;
          color: var(--lexa-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          transition: 0.3s;
        }

        .avatar-edit-btn:hover {
          background: var(--lexa-primary);
          color: #fff;
        }

        .user-identity .name {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          color: #2a3142;
        }

        .user-identity .username {
          margin: 6px 0 15px;
          font-size: 14px;
          color: #adb5bd;
          font-weight: 700;
        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .user-bio {
          margin: 25px 0 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 15px;
        }

        .user-bio p {
          margin: 0;
          font-size: 14px;
          color: #74788d;
          line-height: 1.7;
          font-weight: 500;
        }

        .quick-metrics-card {
          padding: 30px;
          border: none;
          border-radius: 24px;
        }

        .card-title-premium {
          margin: 0 0 20px 0;
          font-size: 13px;
          font-weight: 800;
          color: #adb5bd;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .metric-box {
          padding: 20px;
          background: #fcfdfe;
          border: 1px solid #f1f5f7;
          border-radius: 18px;
          text-align: center;
        }

        .metric-box .val {
          font-size: 20px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .metric-box .lab {
          font-size: 11px;
          font-weight: 800;
          color: #adb5bd;
          text-transform: uppercase;
        }

        .security-notice {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          color: #adb5bd;
          font-weight: 700;
          padding: 10px;
          background: rgba(52, 195, 143, 0.05);
          border-radius: 10px;
          justify-content: center;
        }

        .info-card-premium, .security-card-premium, .actions-card-premium {
          border: none;
          border-radius: 24px;
        }

        .card-header-premium {
          padding: 30px 35px;
          border-bottom: 1px solid #f1f5f7;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .header-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(98, 110, 212, 0.1);
          color: var(--lexa-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-header-premium .title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #2a3142;
        }

        .card-body-premium {
          padding: 10px 35px 35px;
        }

        .location-info {
          margin-top: 25px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #adb5bd;
          font-weight: 700;
        }

        .settings-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: none;
          background: #f8f9fa;
          color: #adb5bd;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .status-grid {
          display: flex;
          flex-direction: column;
        }

        .status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 25px 0;
          border-bottom: 1px solid #f1f5f7;
        }

        .status-row:last-child {
          border-bottom: none;
        }

        .status-label {
          font-size: 15px;
          font-weight: 800;
          color: #2a3142;
          margin-bottom: 4px;
        }

        .status-desc {
          font-size: 13px;
          color: #adb5bd;
          font-weight: 600;
        }

        .lexa-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .lexa-status-pill.ok {
          background: rgba(52, 195, 143, 0.1);
          color: #34c38f;
        }

        .lexa-status-pill.error {
          background: rgba(236, 69, 97, 0.1);
          color: #ec4561;
        }

        .lexa-status-pill .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .last-sync {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #adb5bd;
          font-weight: 700;
        }

        .actions-card-premium {
          padding: 30px;
        }

        .actions-grid {
          display: flex;
          gap: 20px;
        }

        .pulse-on-hover:hover {
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(98, 110, 212, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(98, 110, 212, 0); }
          100% { box-shadow: 0 0 0 0 rgba(98, 110, 212, 0); }
        }
      `}</style>
    </div>
  );
}
