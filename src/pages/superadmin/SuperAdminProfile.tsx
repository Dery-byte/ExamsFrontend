import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, Loader2, Phone, Mail, ShieldCheck, Check, KeyRound, AtSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useInstitution } from '../../hooks/useInstitution';
import { updateMyProfile, changeMyPassword } from '../../api/endpoints';
import { removeProfilePhoto, uploadProfilePhoto } from '../../api/profilePhoto';
import { IMAGE_ACCEPT, validateImageFile } from '../../utils/questionImage';
import AvatarPhoto from '../../components/common/AvatarPhoto';

/**
 * The Super Admin's own profile: details edited in place (Save / Cancel at the top), password
 * change below, and a profile card with the photo on the right (on top on phones).
 */
export default function SuperAdminProfile() {
  const { user, updateUser, logout } = useAuth();
  const { institution } = useInstitution();
  const blank = { firstname: user?.firstname ?? '', lastname: user?.lastname ?? '', email: user?.email ?? '', phone: user?.phone ?? '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pw, setPw] = useState({ next: '', again: '' });
  const [show, setShow] = useState({ next: false, again: false });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Follow the account if it changes elsewhere (e.g. saved from another tab)
  useEffect(() => { setForm(blank); }, [user?.firstname, user?.lastname, user?.email, user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;
  const dirty = (Object.keys(blank) as (keyof typeof blank)[]).some(k => form[k].trim() !== blank[k]);
  const name = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); };

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.firstname.trim() || !form.lastname.trim()) { setError('First name and last name are required.'); return; }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Enter a valid email address.'); return; }
    setSaving(true); setError('');
    try {
      const data = {
        firstname: form.firstname.trim(), lastname: form.lastname.trim(),
        email: form.email.trim() || undefined, phone: form.phone.trim() || undefined,
      };
      await updateMyProfile(user.id, 'SUPER_ADMIN', data);
      updateUser({ ...data, email: data.email ?? user.email, phone: data.phone ?? user.phone });
      toast.success('Profile saved');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save your profile. Please try again.');
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pw.next.length < 6) { setPwError('Use at least 6 characters (8 or more is better).'); return; }
    if (pw.next !== pw.again) { setPwError('The two passwords do not match.'); return; }
    setPwBusy(true); setPwError('');
    try {
      await changeMyPassword(pw.next);
      toast.success('Password changed. Please sign in again.');
      setTimeout(() => logout(), 1200);
    } catch (err: any) {
      setPwError(err?.response?.data?.message ?? 'Could not change the password. Please try again.');
      setPwBusy(false);
    }
  };

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) { toast.error(problem); return; }
    setPhotoBusy(true);
    try {
      const r = await uploadProfilePhoto(file);
      updateUser({ profilePicture: r.profilePicture ?? undefined });
      toast.success('Profile photo updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not upload the photo. Please try again.');
    } finally { setPhotoBusy(false); }
  };
  const removePhoto = async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    setPhotoBusy(true);
    try {
      await removeProfilePhoto();
      updateUser({ profilePicture: undefined });
      toast.success('Profile photo removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not remove the photo.');
    } finally { setPhotoBusy(false); }
  };

  return (
    <div className="sp">
      <nav className="sp-crumbs" aria-label="Breadcrumb">
        <Link to="/super-admin">Dashboard</Link><span>/</span><span>Edit Profile</span>
      </nav>

      <div className="sp-grid">
        <form className="sa-card sp-main" onSubmit={save} noValidate>
          <div className="sp-head">
            <h2>Edit Profile</h2>
            <div className="sp-head-actions">
              <button type="button" className="sa-btn soft" onClick={() => { setForm(blank); setError(''); }} disabled={!dirty || saving}>Cancel</button>
              <button type="submit" className="sa-btn" disabled={!dirty || saving}>
                {saving ? <><Loader2 size={16} className="sp-spin" /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </div>
          {error && <p className="sp-error" role="alert">{error}</p>}

          <Section title="General">
            <UField label="First Name" value={form.firstname} onChange={set('firstname')} autoComplete="given-name" required />
            <UField label="Last Name" value={form.lastname} onChange={set('lastname')} autoComplete="family-name" required />
            <UField label="Username" value={user.username} readOnly hint="Usernames can't be changed." />
          </Section>

          <Section title="Contact">
            <UField label="Mobile Phone" icon={<Phone size={18} />} value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" placeholder="e.g. 0241234567" />
            <UField label="Email" icon={<Mail size={18} />} value={form.email} onChange={set('email')} type="email" autoComplete="email" placeholder="name@example.com" wide />
          </Section>

          <Section title="Password">
            <UField label="New Password" type={show.next ? 'text' : 'password'} value={pw.next} autoComplete="new-password" placeholder="At least 6 characters"
              onChange={e => { setPw(p => ({ ...p, next: e.target.value })); setPwError(''); }}
              trailing={<button type="button" className="sp-show" onClick={() => setShow(s => ({ ...s, next: !s.next }))}>{show.next ? 'HIDE' : 'SHOW'}</button>} />
            <UField label="Re-type Password" type={show.again ? 'text' : 'password'} value={pw.again} autoComplete="new-password" placeholder="Same again"
              onChange={e => { setPw(p => ({ ...p, again: e.target.value })); setPwError(''); }}
              trailing={<button type="button" className="sp-show" onClick={() => setShow(s => ({ ...s, again: !s.again }))}>{show.again ? 'HIDE' : 'SHOW'}</button>} />
            <div className="sp-pw-act">
              <button type="button" className="sa-btn sm" onClick={changePassword} disabled={pwBusy || !pw.next}>
                {pwBusy ? <Loader2 size={15} className="sp-spin" /> : <KeyRound size={15} />} Update password
              </button>
              <small>You'll be signed out and asked to sign in with the new password.</small>
            </div>
            {pwError && <p className="sp-error wide" role="alert">{pwError}</p>}
          </Section>
        </form>

        <aside className="sa-card sp-card">
          <div className="sp-ring">
            <svg viewBox="0 0 120 120" aria-hidden>
              <circle cx="60" cy="60" r="56" fill="none" stroke="var(--brand-soft)" strokeWidth="5" />
              <circle cx="60" cy="60" r="56" fill="none" stroke="var(--brand)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 56 * 0.72} ${2 * Math.PI * 56}`} transform="rotate(-210 60 60)" />
            </svg>
            <span className="sp-photo">
              <AvatarPhoto src={user.profilePicture} alt={`${name}'s profile photo`}>{name.charAt(0).toUpperCase()}</AvatarPhoto>
              {photoBusy && <span className="sp-photo-busy"><Loader2 size={22} className="sp-spin" /></span>}
            </span>
            <input ref={photoInput} type="file" accept={IMAGE_ACCEPT} onChange={pickPhoto} hidden />
            <button type="button" className="sp-cam" onClick={() => photoInput.current?.click()} disabled={photoBusy}
              aria-label={user.profilePicture ? 'Change profile photo' : 'Add a profile photo'}>
              <Camera size={16} />
            </button>
          </div>
          {user.profilePicture && <button type="button" className="sp-link" onClick={removePhoto} disabled={photoBusy}>Remove photo</button>}
          <h3 className="sp-name">{name}</h3>
          <p className="sp-role">Super Administrator</p>

          <div className="sp-boxes">
            <div><b className={user.enabled === false ? 'bad' : 'ok'}>{user.enabled === false ? 'Disabled' : 'Active'}</b><span>Status</span></div>
            <div><b>#{user.id}</b><span>Account ID</span></div>
          </div>

          <ul className="sp-contacts">
            <li><span className="sp-ci"><Phone size={17} /></span><span>{user.phone || 'No phone yet'}</span></li>
            <li><span className="sp-ci"><Mail size={17} /></span><span>{user.email || 'No email yet'}</span></li>
            <li><span className="sp-ci"><AtSign size={17} /></span><span>{user.username}</span></li>
            <li><span className="sp-ci"><ShieldCheck size={17} /></span><span title={institution.name}>{institution.name}</span></li>
          </ul>
        </aside>
      </div>
      <style>{PROFILE_CSS}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="sp-sec">
      <legend><span>{title}</span></legend>
      <div className="sp-fields">{children}</div>
    </fieldset>
  );
}

function UField({ label, icon, hint, trailing, wide, ...input }: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string; icon?: React.ReactNode; hint?: string; trailing?: React.ReactNode; wide?: boolean;
}) {
  return (
    <label className={`sp-field${wide ? ' wide' : ''}${input.readOnly ? ' ro' : ''}`}>
      <span className="sp-label">{label}</span>
      <span className="sp-line">
        {icon && <span className="sp-ico">{icon}</span>}
        <input {...input} />
        {input.readOnly && <Check size={15} className="sp-ro" aria-hidden />}
        {trailing}
      </span>
      {hint && <span className="sp-hint">{hint}</span>}
    </label>
  );
}

const PROFILE_CSS = `
.sp { font-family: var(--sa-font); }
.sp-crumbs { display: flex; gap: 8px; align-items: center; font-size: 14px; margin: 0 0 20px; color: var(--sx-faint); }
.sp-crumbs a { color: var(--brand-text); font-weight: 600; text-decoration: none; }
.sp-crumbs a:hover { text-decoration: underline; }
.sp-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 28px; align-items: start; }
.sp-main { padding: 24px 28px 30px; }
.sp-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.sp-head h2 { margin: 0; font-size: 21px; font-weight: 600; color: var(--sx-ink); }
.sp-head-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.sp-error { margin: 14px 0 0; padding: 10px 14px; border-radius: 12px; background: #fef2f2; color: #b91c1c; font-size: 13px; font-weight: 500; }
.sp-error.wide { grid-column: 1 / -1; margin-top: 0; }
.sp-sec { border: none; padding: 0; margin: 30px 0 0; min-width: 0; }
.sp-sec legend { width: 100%; padding: 0; margin-bottom: 18px; display: flex; align-items: center; gap: 16px; font-size: 13.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--sx-ink); }
.sp-sec legend::after { content: ''; flex: 1; height: 1px; background: var(--sx-line-2); }
.sp-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 26px 28px; }
.sp-field { display: block; min-width: 0; }
.sp-field.wide { grid-column: span 2; }
.sp-label { display: block; font-size: 13px; color: var(--sx-ink-2); margin-bottom: 6px; }
.sp-line { display: flex; align-items: center; gap: 12px; border-bottom: 1.5px solid var(--sx-line-2); transition: border-color .15s; }
.sp-line:focus-within { border-color: var(--brand); }
.sp-line input { flex: 1; min-width: 0; border: none; background: transparent; padding: 12px 0; font: 500 15px var(--sa-font); color: var(--sx-ink); outline: none; }
.sp-line input::placeholder { color: var(--sx-faint); font-weight: 400; }
.sp-field.ro input { color: var(--sx-muted); }
.sp-ro { color: var(--sx-faint); flex-shrink: 0; }
.sp-ico { color: var(--brand-text); display: inline-flex; flex-shrink: 0; }
.sp-hint { display: block; font-size: 11.5px; color: var(--sx-faint); margin-top: 5px; }
.sp-show { border: none; background: none; padding: 6px 0 6px 6px; cursor: pointer; font: 700 12.5px var(--sa-font); letter-spacing: .04em; color: var(--brand-text); }
.sp-pw-act { display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; }
.sp-pw-act .sa-btn { align-self: flex-start; }
.sp-pw-act small { font-size: 11.5px; color: var(--sx-muted); line-height: 1.4; }
.sp-spin { animation: sp-spin 1s linear infinite; }
@keyframes sp-spin { to { transform: rotate(360deg); } }

.sp-card { padding: 30px 22px 22px; text-align: center; }
.sp-ring { position: relative; width: 138px; height: 138px; margin: 0 auto 16px; }
.sp-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.sp-photo { position: absolute; inset: 13px; border-radius: 50%; overflow: hidden; background: var(--brand-soft); color: var(--brand-text); display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 700; }
.sp-photo-busy { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.7); color: var(--brand-text); }
.sp-cam { position: absolute; right: 6px; bottom: 8px; width: 38px; height: 38px; border-radius: 50%; border: 3px solid #fff; background: var(--brand); color: var(--brand-contrast); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.sp-cam:disabled { opacity: .6; cursor: wait; }
.sp-link { border: none; background: none; cursor: pointer; color: var(--sx-muted); font: 500 12px var(--sa-font); text-decoration: underline; margin-bottom: 6px; }
.sp-name { margin: 4px 0 0; font-size: 19px; font-weight: 600; color: var(--sx-ink); overflow-wrap: anywhere; }
.sp-role { margin: 4px 0 0; font-size: 13.5px; color: var(--sx-muted); }
.sp-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 22px 0; }
.sp-boxes > div { border: 1px solid var(--sx-line-2); border-radius: 16px; padding: 12px 8px; min-width: 0; }
.sp-boxes b { display: block; font-size: 17px; font-weight: 600; color: var(--sx-ink); overflow: hidden; text-overflow: ellipsis; }
.sp-boxes b.ok { color: #047857; }
.sp-boxes b.bad { color: #dc2626; }
.sp-boxes span { display: block; font-size: 12px; color: var(--sx-muted); margin-top: 2px; }
.sp-contacts { list-style: none; margin: 0; padding: 18px 0 0; border-top: 1px solid var(--sx-line); display: grid; gap: 14px; text-align: left; }
.sp-contacts li { display: flex; align-items: center; gap: 14px; font-size: 13.5px; color: var(--sx-ink); min-width: 0; }
.sp-contacts li > span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp-ci { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--sx-line-2); color: var(--brand-text); }

@media (max-width: 1279px) { .sp-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sp-field.wide { grid-column: span 2; } }
@media (max-width: 1023px) {
  .sp-grid { grid-template-columns: 1fr; }
  .sp-card { order: -1; display: grid; grid-template-columns: auto 1fr; column-gap: 24px; text-align: left; align-items: center; }
  .sp-ring { grid-row: span 4; margin: 0; }
  .sp-boxes { margin: 14px 0 0; }
  .sp-contacts { grid-column: 1 / -1; margin-top: 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sp-link { justify-self: start; }
}
@media (max-width: 640px) {
  .sp-main { padding: 20px 18px 24px; }
  .sp-fields { grid-template-columns: 1fr; gap: 20px; }
  .sp-field.wide { grid-column: auto; }
  .sp-head-actions { width: 100%; }
  .sp-head-actions .sa-btn { flex: 1; height: 44px; padding: 0 16px; }
  .sp-card { display: block; text-align: center; padding: 24px 18px 18px; }
  .sp-ring { margin: 0 auto 14px; width: 124px; height: 124px; }
  .sp-contacts { grid-template-columns: 1fr; }
  .sp-sec { margin-top: 26px; }
}
`;
