import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerStudent } from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  GraduationCap,
  ShieldCheck,
  Info,
  ChevronRight
} from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hidePass, setHidePass] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [user, setUser] = useState({
    firstname: '', lastname: '', username: '', email: '', phone: '', password: '',
  });

  const set = (k: keyof typeof user) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setUser(u => ({ ...u, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await registerStudent(user);
      toast.success('Account created successfully!', {
        icon: '🎓',
        style: { borderRadius: '12px', background: '#333', color: '#fff' }
      });
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Registration failed. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
      <Toaster position="top-right"/>
      
      {/* Decorative Elements */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40vw', height: '40vw', background: 'var(--primary-glow)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.4 }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '30vw', height: '30vw', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.3 }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 700, position: 'relative', zIndex: 1 }}>
        <div className="card shadow-premium" style={{ padding: '56px', border: 'none', background: '#fff', borderRadius: '32px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ width: 56, height: 56, background: 'var(--primary)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 24px', boxShadow: 'var(--shadow-lg)' }}>
              <GraduationCap size={28} />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8, letterSpacing: '-0.03em' }}>Create Student Account</h1>
            <p style={{ fontSize: 16, color: 'var(--gray-500)', fontWeight: 500 }}>Join the Examfront academic network today.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            
            {/* Identity Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, background: 'var(--primary-glow)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <User size={18} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)' }}>Identity Information</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>First Name</label>
                  <input type="text" className="input card" placeholder="e.g. John" value={user.firstname} onChange={set('firstname')} required style={{ background: 'var(--gray-50)', border: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>Last Name</label>
                  <input type="text" className="input card" placeholder="e.g. Doe" value={user.lastname} onChange={set('lastname')} required style={{ background: 'var(--gray-50)', border: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>Unique Username</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input type="text" className="input card" placeholder="student.id" value={user.username} onChange={set('username')} required style={{ paddingLeft: 48, background: 'var(--gray-50)', border: 'none' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, marginLeft: 4 }}>Used for signing in to the portal.</p>
              </div>
            </div>

            {/* Contact Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, background: 'var(--accent-glow)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Mail size={18} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)' }}>Communication</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>Academic Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                    <input type="email" className="input card" placeholder="name@university.edu" value={user.email} onChange={set('email')} required style={{ paddingLeft: 48, background: 'var(--gray-50)', border: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                    <input type="tel" className="input card" placeholder="0544 073 427" value={user.phone} onChange={set('phone')} required style={{ paddingLeft: 48, background: 'var(--gray-50)', border: 'none' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, background: 'var(--success-bg)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                  <ShieldCheck size={18} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)' }}>Security Credentials</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>Create Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                    <input type={hidePass ? 'password' : 'text'} className="input card" placeholder="••••••••" value={user.password} onChange={set('password')} required style={{ paddingLeft: 48, paddingRight: 48, background: 'var(--gray-50)', border: 'none' }} />
                    <button type="button" onClick={() => setHidePass(!hidePass)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {hidePass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                    <input type={hideConfirm ? 'password' : 'text'} className="input card" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ paddingLeft: 48, paddingRight: 48, background: 'var(--gray-50)', border: 'none' }} />
                    <button type="button" onClick={() => setHideConfirm(!hideConfirm)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {hideConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '18px', fontSize: 16, borderRadius: '18px' }} disabled={loading}>
                {loading ? <Loader2 className="spin-ico" size={20} /> : <><ShieldCheck size={20} style={{ marginRight: 12 }} /> Initialize Account</>}
              </button>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 500 }}>Already registered? </span>
                <Link to="/login" style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>Sign in to Portal</Link>
              </div>
            </div>
          </form>
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: 12, fontWeight: 700 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
            FERPA COMPLIANT
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: 12, fontWeight: 700 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
            ENCRYPTED SESSION
          </div>
        </div>
      </div>
    </div>
  );
}
