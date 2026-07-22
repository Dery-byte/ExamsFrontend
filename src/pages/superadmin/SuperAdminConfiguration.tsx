import { useState, useEffect } from 'react';
import { saGetSystemSettings, saUpdateSystemSettings, saGetPrograms, saToggleProgram } from '../../api/endpoints';
import { Settings2, Loader2, Check, ShieldCheck, BookMarked, Power, PowerOff, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Program { id: number; name: string; code: string; departmentName: string; enabled: boolean; }

const card = () => ({
  background: 'rgba(255,255,255,0.03)',
  border: `1px solid rgba(139,92,246,0.15)`,
  borderRadius: 16,
  padding: '24px',
  backdropFilter: 'blur(12px)',
  cursor: 'default',
  transition: 'all 0.25s',
});

export default function SuperAdminConfiguration() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    // Load settings
    saGetSystemSettings()
      .then((res: Record<string, string>) => setSettings(res))
      .catch(() => console.error('Failed to load settings'));

    // Load programs for visibility management
    loadPrograms();
  }, []);

  const loadPrograms = () => {
    setProgramsLoading(true);
    saGetPrograms()
      .then((data: Program[]) => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load programs'))
      .finally(() => setProgramsLoading(false));
  };

  const handleToggleCarryOver = async () => {
    const currentVal = settings['ALLOW_CARRYOVER_REGISTRATION'] === 'true';
    const newVal = !currentVal;
    
    setSettingsLoading(true);
    try {
      await saUpdateSystemSettings({ ALLOW_CARRYOVER_REGISTRATION: newVal.toString() });
      setSettings(prev => ({ ...prev, ALLOW_CARRYOVER_REGISTRATION: newVal.toString() }));
    } catch (e) {
      console.error('Failed to update setting');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleToggleProgram = async (p: Program) => {
    setTogglingId(p.id);
    try {
      const updated = await saToggleProgram(p.id);
      setPrograms(prev => prev.map(x => x.id === p.id ? { ...x, enabled: updated.enabled } : x));
      toast.success(`"${p.name}" has been ${updated.enabled ? 'enabled' : 'disabled'}.`);
    } catch {
      toast.error('Failed to update program visibility');
    } finally {
      setTogglingId(null);
    }
  };

  const enabledCount  = programs.filter(p => p.enabled).length;
  const disabledCount = programs.filter(p => !p.enabled).length;

  return (
    <div style={{ color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}>
            <Settings2 size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: 'linear-gradient(135deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              System Configuration
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Global platform settings and toggleable features</p>
          </div>
        </div>
      </div>

      {/* ── Course Registration ─────────────────────────────────────────── */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>Course Registration</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14, marginBottom: 40 }}>
        <div style={{ ...card(), display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899', flexShrink: 0 }}>
              <ShieldCheck size={22} />
             </div>
             <div>
               <div style={{ fontWeight: 600, fontSize: 15, color: '#fff', marginBottom: 4 }}>Allow Carry-over Registration</div>
               <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>If enabled, students can register for courses from previous levels and semesters. If disabled, they are strictly restricted to their current level/semester.</div>
             </div>
          </div>
          <button
            onClick={handleToggleCarryOver}
            disabled={settingsLoading}
            style={{
              background: settings['ALLOW_CARRYOVER_REGISTRATION'] === 'true' ? '#10b981' : 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: 20, width: 50, height: 26, position: 'relative', cursor: settingsLoading ? 'not-allowed' : 'pointer', transition: 'all 0.3s', flexShrink: 0, marginLeft: 16
            }}
          >
            {settingsLoading && <Loader2 size={14} className="spin" style={{ position: 'absolute', top: 6, left: 18, color: '#fff' }} />}
            <div style={{
              width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3,
              left: settings['ALLOW_CARRYOVER_REGISTRATION'] === 'true' ? 27 : 3, transition: 'all 0.3s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
               {settings['ALLOW_CARRYOVER_REGISTRATION'] === 'true' && !settingsLoading && <Check size={12} color="#10b981" />}
            </div>
          </button>
        </div>
      </div>

      {/* ── Program Visibility ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Program Visibility</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            Disabled programs are hidden from students, lecturers, and admins system-wide
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Summary chips */}
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
            {enabledCount} Active
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
            {disabledCount} Disabled
          </span>
          <button onClick={loadPrograms} title="Refresh" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {programsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : programs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px dashed rgba(139,92,246,0.2)' }}>
          <BookMarked size={36} style={{ color: 'rgba(139,92,246,0.3)', marginBottom: 10 }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>No programs found. Create programs first.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {programs.map(p => (
            <div key={p.id}
              style={{
                background: p.enabled ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.04)',
                border: `1px solid ${p.enabled ? 'rgba(139,92,246,0.15)' : 'rgba(239,68,68,0.25)'}`,
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                transition: 'all 0.2s',
                opacity: p.enabled ? 1 : 0.8,
              }}
            >
              {/* Icon + Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: p.enabled ? 'rgba(14,165,233,0.12)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${p.enabled ? 'rgba(14,165,233,0.25)' : 'rgba(239,68,68,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: p.enabled ? '#38bdf8' : '#f87171',
                }}>
                  <BookMarked size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    <span style={{ fontWeight: 700, color: p.enabled ? '#38bdf8' : '#f87171' }}>{p.code}</span>
                    {' · '}{p.departmentName}
                  </div>
                </div>
              </div>

              {/* Status + Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: 20,
                  background: p.enabled ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${p.enabled ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: p.enabled ? '#34d399' : '#f87171',
                }}>
                  {p.enabled ? 'Active' : 'Off'}
                </span>
                {/* Toggle switch */}
                <button
                  onClick={() => handleToggleProgram(p)}
                  disabled={togglingId === p.id}
                  title={p.enabled ? 'Disable this program' : 'Enable this program'}
                  style={{
                    width: 48, height: 26, borderRadius: 13, border: 'none', cursor: togglingId === p.id ? 'not-allowed' : 'pointer',
                    background: p.enabled ? '#10b981' : 'rgba(255,255,255,0.12)',
                    position: 'relative', transition: 'all 0.3s',
                    opacity: togglingId === p.id ? 0.6 : 1,
                    flexShrink: 0,
                  }}
                >
                  {togglingId === p.id ? (
                    <Loader2 size={13} className="spin" style={{ position: 'absolute', top: 6, left: 17, color: '#fff' }} />
                  ) : (
                    <div style={{
                      width: 20, height: 20, background: '#fff', borderRadius: '50%',
                      position: 'absolute', top: 3,
                      left: p.enabled ? 25 : 3,
                      transition: 'left 0.3s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {p.enabled
                        ? <Power size={10} color="#10b981" />
                        : <PowerOff size={10} color="#9ca3af" />
                      }
                    </div>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}
