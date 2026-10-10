import { useState } from 'react';
import { useInstitution } from '../../hooks/useInstitution';
import { institutionLogoUrl } from '../../api/endpoints';

/**
 * The institution's logo, or its initial on a brand-coloured tile until a logo is uploaded.
 * Used in every layout's sidebar and top bar so a new institution never sees another's name.
 */
export default function InstitutionMark({ size = 36, radius = 10 }: { size?: number; radius?: number }) {
  const { institution } = useInstitution();
  const [broken, setBroken] = useState(false);
  const box = { width: size, height: size, borderRadius: radius, flexShrink: 0 } as const;

  if (institution.hasLogo && !broken) {
    return (
      <img
        src={institutionLogoUrl(institution.logoVersion)}
        alt={`${institution.shortName} logo`}
        onError={() => setBroken(true)}
        style={{ ...box, objectFit: 'contain', background: '#fff', padding: Math.round(size * 0.08) }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        ...box, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--brand)', color: 'var(--brand-contrast)', fontWeight: 800, fontSize: Math.round(size * 0.48),
      }}
    >
      {(institution.shortName || institution.name || '?').charAt(0).toUpperCase()}
    </span>
  );
}
