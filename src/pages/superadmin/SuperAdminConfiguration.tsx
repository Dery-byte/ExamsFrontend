import { useState, useEffect } from 'react';
import { saGetSystemSettings, saUpdateSystemSettings } from '../../api/endpoints';
import { Settings2, Loader2, Check, ShieldCheck } from 'lucide-react';

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

  useEffect(() => {
    // Load Settings
    saGetSystemSettings()
      .then((res: Record<string, string>) => setSettings(res))
      .catch(() => console.error("Failed to load settings"));
  }, []);

  const handleToggleCarryOver = async () => {
    const currentVal = settings['ALLOW_CARRYOVER_REGISTRATION'] === 'true';
    const newVal = !currentVal;
    
    setSettingsLoading(true);
    try {
      await saUpdateSystemSettings({ ALLOW_CARRYOVER_REGISTRATION: newVal.toString() });
      setSettings(prev => ({ ...prev, ALLOW_CARRYOVER_REGISTRATION: newVal.toString() }));
    } catch (e) {
      console.error("Failed to update setting");
    } finally {
      setSettingsLoading(false);
    }
  };

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

      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>Course Registration</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
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

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
