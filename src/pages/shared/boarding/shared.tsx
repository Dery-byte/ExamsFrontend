import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import AvatarPhoto from '../../../components/common/AvatarPhoto';
import type { EndReason, Gender, HostelGender, Place, Residency } from '../../../api/boarding';
import { levelName, tx, isSchoolMode } from '../../../utils/terms';

/** Staff area the page is shown in: /lect, /admin or /super-admin. */
export function useBoardingBase(): string {
  const p = useLocation().pathname;
  if (p.startsWith('/super-admin')) return '/super-admin';
  if (p.startsWith('/admin')) return '/admin';
  return '/lect';
}

export const errMsg = (e: any, fallback = 'Something went wrong. Please try again.') =>
  tx(e?.response?.data?.message ?? fallback);

export const HOSTEL_GENDER: Record<HostelGender, { label: string; cls: string }> = {
  BOYS: { label: 'Boys', cls: 'is-boys' },
  GIRLS: { label: 'Girls', cls: 'is-girls' },
  MIXED: { label: 'Mixed', cls: 'is-mixed' },
};

export function GenderPill({ gender }: { gender: HostelGender }) {
  const g = HOSTEL_GENDER[gender];
  return <span className={`bd-pill ${g.cls}`}>{g.label}</span>;
}

export const genderLabel = (g: Gender | null | undefined) => (g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : 'Gender not recorded');
export const residencyLabel = (r: Residency | null | undefined) => (r === 'BOARDING' ? 'Boarder' : r === 'DAY' ? 'Day student' : 'Residency not recorded');

export const END_REASON: Record<EndReason, string> = {
  MOVED: 'Moved to another room',
  SWAPPED: 'Swapped rooms',
  BECAME_DAY: 'Became a day student',
  DEACTIVATED: 'Account deactivated',
  VACATED: 'Left the room',
  NEW_YEAR: 'Rooms cleared for the new year',
};

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** "Level 200"; nothing in a school, where a class is one year and its name says it. */
export const levelText = (level: number | null | undefined) => (level == null || isSchoolMode() ? null : levelName(level));

export function Avatar({ name, photo, size }: { name: string; photo?: string | null; size?: 'sm' | 'lg' }) {
  return (
    <span className={`bd-avatar${size ? ` is-${size}` : ''}`} aria-hidden>
      <AvatarPhoto src={photo}>{(name || '?').charAt(0).toUpperCase()}</AvatarPhoto>
    </span>
  );
}

/** "Aggrey House › Block B › Second floor › Room 14 › Bed 3". */
export function PlacePath({ place, small }: { place: Pick<Place, 'path'>; small?: boolean }) {
  return (
    <span className={`bd-path${small ? ' is-small' : ''}`}>
      {place.path.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <ChevronRight size={13} aria-hidden />}
          <span className={i === place.path.length - 1 ? 'is-last' : undefined}>{p}</span>
        </span>
      ))}
    </span>
  );
}

/** Bed numbers still free in a room. */
export function freeBeds(capacity: number, taken: (number | null)[]): number[] {
  const used = new Set(taken.filter((b): b is number => b != null));
  return Array.from({ length: capacity }, (_, i) => i + 1).filter(b => !used.has(b));
}

/** Levels the institution uses, read from "1,2,3" (blank = every level). */
export const levelsText = (levels: string | null | undefined) =>
  levels ? levels.split(',').map(l => levelName(l.trim())).join(', ') : null;
