import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateMyProfile, changeMyPassword } from '../../api/endpoints';
import {
  User, Mail, Phone, Shield, ShieldCheck, Key, Lock,
  Edit, RefreshCw, AlertCircle, BadgeCheck, Camera,
  Briefcase, ChevronRight, CheckCircle, XCircle,
  X, Eye, EyeOff, Loader2, Check,
} from 'lucide-react';

const ROLE_META: Record<string, { label: string; color: string; bg: string; grad: string; icon: React.ReactNode }> = {
  ADMIN:    { label: 'Administrator',   color: '#5156be', bg: '#eef2ff', grad: 'linear-gradient(135deg,#5156be,#7c3aed)', icon: <Shield size={18}/> },
  LECTURER: { label: 'Academic Faculty', color: '#0891b2', bg: '#ecfeff', grad: 'linear-gradient(135deg,#0891b2,#06b6d4)', icon: <Briefcase size={18}/> },
  NORMAL:   { label: 'Student',          color: '#059669', bg: '#ecfdf5', grad: 'linear-gradient(135deg,#059669,#10b981)', icon: <User size={18}/> },
};

/* ── tiny reusable modal wrapper ─────────────────────────────────────────── */
function Modal({ title, icon, onClose, children }: {
  title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="pf-modal-overlay">
      <div className="pf-modal" onClick={e => e.stopPropagation()}>
        <div className="pf-modal-header">
          <div className="pf-modal-title-row">
            <div className="pf-modal-icon">{icon}</div>
            <h4 className="pf-modal-title">{title}</h4>
          </div>
          <button className="pf-modal-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="pf-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ── field component ──────────────────────────────────────────────────────── */
function Field({
  label, id, type = 'text', value, onChange, disabled = false,
  placeholder, suffix, hint,
}: {
  label: string; id: string; type?: string; value: string;
  onChange?: (v: string) => void; disabled?: boolean;
  placeholder?: string; suffix?: React.ReactNode; hint?: string;
}) {
  return (
    <div className="pf-field">
      <label className="pf-field-label" htmlFor={id}>{label}</label>
      <div className="pf-field-wrap">
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={e => onChange?.(e.target.value)}
          className={`pf-field-input${disabled ? ' pf-field-disabled' : ''}`}
        />
        {suffix && <div className="pf-field-suffix">{suffix}</div>}
      </div>
      {hint && <p className="pf-field-hint">{hint}</p>}
    </div>
  );
}

/* ── password field with show/hide ───────────────────────────────────────── */
function PasswordField({
  label, id, value, onChange, placeholder,
}: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pf-field">
      <label className="pf-field-label" htmlFor={id}>{label}</label>
      <div className="pf-field-wrap">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="pf-field-input"
        />
        <button type="button" className="pf-field-eye" onClick={() => setShow(s => !s)}>
          {show ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>
    </div>
  );
}

/* ── strength bar ─────────────────────────────────────────────────────────── */
function StrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#10b981'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <div className="pf-strength">
      <div className="pf-strength-bars">
        {[1,2,3,4].map(i => (
          <div key={i} className="pf-strength-bar" style={{ background: i <= score ? colors[score] : '#e2e8f0' }}/>
        ))}
      </div>
      <span className="pf-strength-label" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */
export default function Profile() {
  const { user, updateUser, logout } = useAuth();

  /* modal state */
  const [editOpen,   setEditOpen]   = useState(false);
  const [pwOpen,     setPwOpen]     = useState(false);

  /* edit-profile form */
  const [editForm,   setEditForm]   = useState({ firstname: '', lastname: '', email: '', phone: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError,  setEditError]  = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  /* change-password form */
  const [pwForm,    setPwForm]    = useState({ newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  if (!user) return null;

  const initials     = `${user.firstname?.[0]??''}${user.lastname?.[0]??''}`.toUpperCase() || user.username[0].toUpperCase();
  const rawRole      = user.authorities?.[0]?.authority?.replace('ROLE_','') ?? user.role ?? 'NORMAL';
  const meta         = ROLE_META[rawRole] ?? ROLE_META['NORMAL'];
  const displayName  = user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : user.username;

  const statusItems = [
    { label: 'Account Active',       ok: !!user.enabled },
    { label: 'Credentials Valid',    ok: !!user.credentialsNonExpired },
    { label: 'Account Unlocked',     ok: !!user.accountNonLocked },
    { label: 'Account Current',      ok: !!user.accountNonExpired },
  ];

  /* ── open edit modal, pre-fill form ───────────────────────────────────── */
  const openEdit = () => {
    setEditForm({
      firstname: user.firstname ?? '',
      lastname:  user.lastname  ?? '',
      email:     user.email     ?? '',
      phone:     user.phone     ?? '',
    });
    setEditError('');
    setEditSuccess(false);
    setEditOpen(true);
  };

  /* ── submit profile update ────────────────────────────────────────────── */
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.firstname.trim() || !editForm.lastname.trim()) {
      setEditError('First name and last name are required.');
      return;
    }
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      setEditError('Please enter a valid email address.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      await updateMyProfile(user.id, rawRole, {
        firstname: editForm.firstname.trim(),
        lastname:  editForm.lastname.trim(),
        email:     editForm.email.trim()   || undefined,
        phone:     editForm.phone.trim()   || undefined,
      });
      // update local context / localStorage
      updateUser({
        firstname: editForm.firstname.trim(),
        lastname:  editForm.lastname.trim(),
        email:     editForm.email.trim()   || user.email,
        phone:     editForm.phone.trim()   || user.phone,
      });
      setEditSuccess(true);
      setTimeout(() => { setEditOpen(false); setEditSuccess(false); }, 1500);
    } catch (err: any) {
      setEditError(
        err?.response?.data?.message ??
        err?.message ??
        'Failed to update profile. Please try again.'
      );
    } finally {
      setEditLoading(false);
    }
  };

  /* ── open password modal ──────────────────────────────────────────────── */
  const openPw = () => {
    setPwForm({ newPassword: '', confirmPassword: '' });
    setPwError('');
    setPwSuccess(false);
    setPwOpen(true);
  };

  /* ── submit password change ───────────────────────────────────────────── */
  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      await changeMyPassword(pwForm.newPassword);
      setPwSuccess(true);
      setTimeout(() => { setPwOpen(false); setPwSuccess(false); logout(); }, 1600);
    } catch (err: any) {
      setPwError(
        err?.response?.data?.message ??
        err?.message ??
        'Failed to change password. Please try again.'
      );
    } finally {
      setPwLoading(false);
    }
  };

  /* ── JSX ──────────────────────────────────────────────────────────────── */
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
              <button id="btn-edit-profile" className="pf-btn-primary" style={{ background: meta.grad }} onClick={openEdit}>
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
                  { icon: <User size={16}/>,      label: 'Full Name',      value: displayName },
                  { icon: <BadgeCheck size={16}/>, label: 'Username',       value: `@${user.username}` },
                  { icon: <Mail size={16}/>,       label: 'Email Address',  value: user.email  || 'Not provided' },
                  { icon: <Phone size={16}/>,      label: 'Phone Number',   value: user.phone  || 'Not provided' },
                  { icon: <Shield size={16}/>,     label: 'Role',           value: meta.label },
                  { icon: <Key size={16}/>,        label: 'Account ID',     value: `#${user.id || 'N/A'}` },
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
                  <h6 className="pf-card-title">Security &amp; Account Status</h6>
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
              <button id="btn-change-password" className="pf-action-btn pf-action-primary" style={{ background: meta.grad }} onClick={openPw}>
                <Key size={16}/><span>Change Password</span>
              </button>
              <button className="pf-action-btn pf-action-danger">
                <AlertCircle size={16}/><span>Deactivate Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ EDIT PROFILE MODAL ══════════════ */}
      {editOpen && (
        <Modal
          title="Edit Profile"
          icon={<Edit size={18} color={meta.color}/>}
          onClose={() => !editLoading && setEditOpen(false)}
        >
          <form onSubmit={handleEditSubmit} noValidate>
            {/* read-only username note */}
            <div className="pf-modal-notice">
              <BadgeCheck size={14}/>
              <span>Username <strong>@{user.username}</strong> cannot be changed.</span>
            </div>

            <div className="pf-form-row">
              <Field
                id="edit-firstname"
                label="First Name"
                value={editForm.firstname}
                onChange={v => setEditForm(f => ({ ...f, firstname: v }))}
                placeholder="Enter first name"
              />
              <Field
                id="edit-lastname"
                label="Last Name"
                value={editForm.lastname}
                onChange={v => setEditForm(f => ({ ...f, lastname: v }))}
                placeholder="Enter last name"
              />
            </div>

            <Field
              id="edit-email"
              label="Email Address"
              type="email"
              value={editForm.email}
              onChange={v => setEditForm(f => ({ ...f, email: v }))}
              placeholder="Enter email address"
            />

            <Field
              id="edit-phone"
              label="Phone Number"
              type="tel"
              value={editForm.phone}
              onChange={v => setEditForm(f => ({ ...f, phone: v }))}
              placeholder="e.g. 0241234567"
            />

            {editError && (
              <div className="pf-form-error">
                <AlertCircle size={14}/><span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="pf-form-success">
                <Check size={14}/><span>Profile updated successfully!</span>
              </div>
            )}

            <div className="pf-modal-actions">
              <button type="button" className="pf-btn-cancel" onClick={() => setEditOpen(false)} disabled={editLoading}>
                Cancel
              </button>
              <button
                type="submit"
                className="pf-btn-save"
                style={{ background: meta.grad }}
                disabled={editLoading || editSuccess}
              >
                {editLoading
                  ? <><Loader2 size={15} className="pf-spin"/><span>Saving…</span></>
                  : editSuccess
                    ? <><Check size={15}/><span>Saved!</span></>
                    : <><Check size={15}/><span>Save Changes</span></>
                }
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══════════════ CHANGE PASSWORD MODAL ══════════════ */}
      {pwOpen && (
        <Modal
          title="Change Password"
          icon={<Key size={18} color="#dc2626"/>}
          onClose={() => !pwLoading && setPwOpen(false)}
        >
          <form onSubmit={handlePwSubmit} noValidate>
            <div className="pf-modal-notice pf-modal-notice-warn">
              <Lock size={14}/>
              <span>Choose a strong password with at least 8 characters.</span>
            </div>

            <PasswordField
              id="pw-new"
              label="New Password"
              value={pwForm.newPassword}
              onChange={v => setPwForm(f => ({ ...f, newPassword: v }))}
              placeholder="Enter new password"
            />
            <StrengthBar password={pwForm.newPassword}/>

            <PasswordField
              id="pw-confirm"
              label="Confirm New Password"
              value={pwForm.confirmPassword}
              onChange={v => setPwForm(f => ({ ...f, confirmPassword: v }))}
              placeholder="Re-enter new password"
            />

            {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <p className="pf-match-err">Passwords do not match</p>
            )}

            {pwError && (
              <div className="pf-form-error">
                <AlertCircle size={14}/><span>{pwError}</span>
              </div>
            )}

            {pwSuccess && (
              <div className="pf-form-success">
                <Check size={14}/><span>Password changed successfully!</span>
              </div>
            )}

            <div className="pf-modal-actions">
              <button type="button" className="pf-btn-cancel" onClick={() => setPwOpen(false)} disabled={pwLoading}>
                Cancel
              </button>
              <button
                type="submit"
                className="pf-btn-save pf-btn-danger"
                disabled={pwLoading || pwSuccess}
              >
                {pwLoading
                  ? <><Loader2 size={15} className="pf-spin"/><span>Updating…</span></>
                  : pwSuccess
                    ? <><Check size={15}/><span>Updated!</span></>
                    : <><Key size={15}/><span>Update Password</span></>
                }
              </button>
            </div>
          </form>
        </Modal>
      )}

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
        .pf-pill-ok  { background:#ecfdf5; color:#10b981; }
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

        /* ── Modal ── */
        .pf-modal-overlay {
          position:fixed; inset:0; background:rgba(15,23,42,0.55); backdrop-filter:blur(6px);
          display:flex; align-items:center; justify-content:center; z-index:9999;
          animation:pf-fade-in .18s ease;
        }
        .pf-modal {
          background:#fff; border-radius:24px; width:100%; max-width:480px;
          box-shadow:0 24px 60px -8px rgba(0,0,0,0.28);
          animation:pf-slide-up .22s cubic-bezier(.34,1.56,.64,1);
          max-height:90vh; overflow-y:auto;
        }
        .pf-modal-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:22px 24px 18px; border-bottom:1px solid #f1f5f9;
          position:sticky; top:0; background:#fff; z-index:1; border-radius:24px 24px 0 0;
        }
        .pf-modal-title-row { display:flex; align-items:center; gap:12px; }
        .pf-modal-icon { width:38px; height:38px; border-radius:10px; background:#f8fafc; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; }
        .pf-modal-title { font-size:17px; font-weight:800; color:#1e293b; margin:0; }
        .pf-modal-close { width:32px; height:32px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; color:#64748b; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.2s; }
        .pf-modal-close:hover { background:#fee2e2; color:#dc2626; border-color:#fecaca; }
        .pf-modal-body { padding:22px 24px 26px; }

        /* Modal notice bar */
        .pf-modal-notice {
          display:flex; align-items:center; gap:9px; padding:11px 14px; border-radius:10px;
          background:#f0f2ff; border:1px solid #c7d2fe; color:#4338ca;
          font-size:12px; font-weight:600; margin-bottom:20px;
        }
        .pf-modal-notice-warn { background:#fffbeb; border-color:#fde68a; color:#92400e; }

        /* Form fields */
        .pf-form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .pf-field { margin-bottom:16px; }
        .pf-field-label { display:block; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
        .pf-field-wrap { position:relative; }
        .pf-field-input {
          width:100%; padding:11px 14px; border-radius:10px; border:1.5px solid #e2e8f0;
          font-size:14px; font-weight:500; color:#1e293b; background:#f8fafc;
          font-family:'Inter',sans-serif; transition:.2s; outline:none; box-sizing:border-box;
        }
        .pf-field-input:focus { border-color:#5156be; background:#fff; box-shadow:0 0 0 3px rgba(81,86,190,0.12); }
        .pf-field-disabled { background:#f1f5f9; color:#94a3b8; cursor:not-allowed; }
        .pf-field-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; cursor:pointer; display:flex; align-items:center; padding:4px; }
        .pf-field-eye:hover { color:#5156be; }
        .pf-field-hint { font-size:11px; color:#94a3b8; margin:4px 0 0; }

        /* Password strength */
        .pf-strength { display:flex; align-items:center; gap:10px; margin:-8px 0 14px; }
        .pf-strength-bars { display:flex; gap:4px; flex:1; }
        .pf-strength-bar { height:4px; flex:1; border-radius:4px; transition:.3s; }
        .pf-strength-label { font-size:11px; font-weight:700; min-width:40px; }
        .pf-match-err { font-size:11px; color:#dc2626; font-weight:600; margin:-10px 0 14px; }

        /* Feedback banners */
        .pf-form-error { display:flex; align-items:center; gap:9px; padding:11px 14px; border-radius:10px; background:#fef2f2; border:1px solid #fecaca; color:#dc2626; font-size:13px; font-weight:600; margin-bottom:16px; }
        .pf-form-success { display:flex; align-items:center; gap:9px; padding:11px 14px; border-radius:10px; background:#ecfdf5; border:1px solid #bbf7d0; color:#059669; font-size:13px; font-weight:600; margin-bottom:16px; }

        /* Modal action buttons */
        .pf-modal-actions { display:flex; gap:10px; margin-top:8px; }
        .pf-btn-cancel { flex:1; padding:12px; border-radius:10px; border:1.5px solid #e2e8f0; background:#f8fafc; color:#64748b; font-size:14px; font-weight:700; cursor:pointer; transition:.2s; font-family:'Inter',sans-serif; }
        .pf-btn-cancel:hover:not(:disabled) { background:#f1f5f9; border-color:#cbd5e1; }
        .pf-btn-save { flex:2; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:10px; border:none; color:#fff; font-size:14px; font-weight:700; cursor:pointer; transition:.25s; font-family:'Inter',sans-serif; box-shadow:0 4px 14px -4px rgba(81,86,190,.45); }
        .pf-btn-save:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); }
        .pf-btn-save:disabled { opacity:.65; cursor:not-allowed; transform:none; filter:none; }
        .pf-btn-danger { background:linear-gradient(135deg,#dc2626,#ef4444) !important; box-shadow:0 4px 14px -4px rgba(220,38,38,.45) !important; }

        /* Spinner */
        .pf-spin { animation:pf-rotate 0.8s linear infinite; }
        @keyframes pf-rotate { to { transform:rotate(360deg); } }
        @keyframes pf-fade-in { from { opacity:0; } to { opacity:1; } }
        @keyframes pf-slide-up { from { opacity:0; transform:translateY(24px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }

        /* Responsive */
        @media (max-width:1024px) { .pf-grid { grid-template-columns:280px 1fr; } }
        @media (max-width:768px) {
          .pf-page { padding:16px; }
          .pf-grid { grid-template-columns:1fr; }
          .pf-info-grid { grid-template-columns:1fr; }
          .pf-actions-row { flex-direction:column; }
          .pf-stats-row { flex-direction:column; }
          .pf-stat-divider { width:auto; height:1px; }
          .pf-modal { max-width:calc(100vw - 32px); border-radius:20px; }
          .pf-form-row { grid-template-columns:1fr; }
        }
        @media (max-width:480px) {
          .pf-card-head { flex-direction:column; align-items:flex-start; gap:10px; }
          .pf-profile-body { padding:0 18px 22px; }
        }
      `}</style>
    </div>
  );
}
