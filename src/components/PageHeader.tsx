import { Settings, ChevronRight } from 'lucide-react';

export default function PageHeader({ title, breadcrumbs }: { title: string; breadcrumbs: string[] }) {
  return (
    <div className="ph animate-fade-in-down">
      <div style={{ minWidth: 0 }}>
        <h4 className="ph-title">{title}</h4>
        <nav className="ph-crumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((b, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={i === breadcrumbs.length - 1 ? 'ph-current' : undefined}>{b}</span>
              {i < breadcrumbs.length - 1 && <ChevronRight size={12} style={{ color: '#adb5bd' }} />}
            </span>
          ))}
        </nav>
      </div>
      <div className="ph-portal">
        <button className="btn-lexa btn-lexa-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, boxShadow: '0 4px 12px rgba(122, 111, 190, 0.2)' }}>
          <Settings size={16} /> <span style={{ fontWeight: 700 }}>Portal</span>
        </button>
      </div>
      <style>{`
        .ph { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 5px; }
        .ph-title { margin: 0; font-size: 20px; font-weight: 800; color: #2a3142; letter-spacing: -0.02em; overflow-wrap: anywhere; }
        .ph-crumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 6px; font-size: 12px; color: #74788d; font-weight: 600; }
        .ph-current { color: var(--primary); font-weight: 800; }
        @media (max-width: 767px) {
          .ph { margin-bottom: 18px; }
          .ph-title { font-size: 18px; }
          .ph-portal { display: none; }
        }
      `}</style>
    </div>
  );
}
