import { useEffect, useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getReportEmailSetting, setReportEmailSetting } from '../../api/endpoints';

/** Admin / Super Admin master switch for emailing result slips. Lecturers still choose per quiz. */
export default function ReportEmailToggle({ dark = false }: { dark?: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReportEmailSetting().then(setEnabled).catch(() => setEnabled(false));
  }, []);

  const toggle = async () => {
    if (enabled === null || saving) return;
    setSaving(true);
    try {
      const next = await setReportEmailSetting(!enabled);
      setEnabled(next);
      toast.success(next ? 'Lecturers can email result slips (per quiz)' : 'Emailing result slips is disabled system-wide');
    } catch {
      toast.error('Could not update the setting');
    } finally {
      setSaving(false);
    }
  };

  const c = dark
    ? { bg: 'rgba(255,255,255,0.03)', border: 'rgba(139,92,246,0.15)', title: '#fff', sub: 'rgba(255,255,255,0.4)', off: 'rgba(255,255,255,0.1)' }
    : { bg: '#fff', border: '#e2e8f0', title: '#1e293b', sub: '#64748b', off: '#cbd5e1' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px',
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 260px' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(81,86,190,0.1)', color: '#5156be',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Mail size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: c.title }}>Allow emailing of result slips</div>
          <div style={{ fontSize: 12, color: c.sub, lineHeight: 1.45 }}>
            Master switch. When on, lecturers can choose per quiz to email students their PDF result slip right after review. When off, no result slips are emailed.
          </div>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={enabled === null || saving}
        role="switch"
        aria-checked={!!enabled}
        aria-label="Allow emailing of result slips"
        style={{ background: enabled ? '#10b981' : c.off, border: 'none', borderRadius: 20, width: 50, height: 26, position: 'relative',
          cursor: enabled === null || saving ? 'not-allowed' : 'pointer', transition: 'all 0.3s', flexShrink: 0 }}
      >
        {(saving || enabled === null) && <Loader2 size={14} style={{ position: 'absolute', top: 6, left: 18, color: '#fff' }} />}
        <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3,
          left: enabled ? 27 : 3, transition: 'all 0.3s' }} />
      </button>
    </div>
  );
}
