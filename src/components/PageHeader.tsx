import { Settings, ChevronRight } from 'lucide-react';

export default function PageHeader({ title, breadcrumbs }: { title: string; breadcrumbs: string[] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 5 }} className="animate-fade-in-down">
      <div>
        <h4 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#2a3142', letterSpacing: '-0.02em' }}>{title}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#74788d', fontWeight: 600 }}>
          {breadcrumbs.map((b, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ 
                color: i === breadcrumbs.length - 1 ? 'var(--primary)' : 'inherit',
                fontWeight: i === breadcrumbs.length - 1 ? 800 : 600
              }}>{b}</span>
              {i < breadcrumbs.length - 1 && <ChevronRight size={12} style={{ color: '#adb5bd' }} />}
            </span>
          ))}
        </div>
      </div>
      <div className="desktop-only">
        <button className="btn-lexa btn-lexa-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, boxShadow: '0 4px 12px rgba(122, 111, 190, 0.2)' }}>
          <Settings size={16} /> <span style={{ fontWeight: 700 }}>Portal</span>
        </button>
      </div>
    </div>
  );
}
