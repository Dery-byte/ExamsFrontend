import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useInstitution } from '../../hooks/useInstitution';
import InstitutionMark from '../../components/common/InstitutionMark';

export default function Welcome() {
  const [scrolled, setScrolled] = useState(false);
  const { institution } = useInstitution();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="welcome-sleet">
      {/* Modern Navbar */}
      <nav className={`welcome-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="welcome-nav-container">
          <Link to="/" className="welcome-nav-brand">
            <InstitutionMark size={36} radius={10} />
            <span className="welcome-nav-title">{institution.shortName}</span>
          </Link>

          <div className="welcome-nav-actions">
            <Link to="/login" className="premium-btn premium-btn-secondary" style={{ color: '#0f172a', borderColor: '#e2e8f0' }}>
              Login
            </Link>
            <Link to="/signup" className="premium-btn premium-btn-primary">
              Get Started <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </nav>

      <div className="sleet-content">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><InstitutionMark size={64} radius={20} /></div>
        <h1 className="sleet-title">{institution.name}</h1>
        <p className="sleet-subtitle">
          Secure, intelligent, and seamless academic assessment.
        </p>
      </div>
    </div>
  );
}
