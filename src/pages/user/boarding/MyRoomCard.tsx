import { useQuery } from '@tanstack/react-query';
import { BedDouble, Users } from 'lucide-react';
import { getMyRoom } from '../../../api/boarding';
import { useBoarding } from '../../../hooks/useFeatureFlags';
import AvatarPhoto from '../../../components/common/AvatarPhoto';
import { levelName, isSchoolMode } from '../../../utils/terms';
import '../../shared/boarding/boarding.css';

/** A boarder's room on their dashboard: house, block, floor, room and bed, roommates and housemaster. Day students see nothing. */
export default function MyRoomCard() {
  const { mode } = useBoarding();
  const q = useQuery({ queryKey: ['boarding', 'me'], queryFn: getMyRoom, enabled: mode !== 'DAY', staleTime: 60_000 });
  const d = q.data;
  if (mode === 'DAY' || !d || d.residency !== 'BOARDING') return null;
  const p = d.place;

  const steps = p ? [
    { k: d.word, v: p.hostel },
    ...(p.block ? [{ k: 'Block', v: p.block }] : []),
    ...(p.floorLabel ? [{ k: 'Floor', v: p.floorLabel }] : []),
    { k: 'Room', v: p.room.replace(/^Room /, ''), key: !p.bed },
    ...(p.bed ? [{ k: 'Bed', v: String(p.bed), key: true }] : []),
  ] : [];

  return (
    <section className="bd-myroom" style={{ marginBottom: 16 }} aria-label="My room">
      <div className="bd-myroom-head">
        <span className="bd-myroom-icon"><BedDouble size={20} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="bd-name" style={{ fontSize: 15 }}>My room</div>
          <div className="bd-sub" style={{ marginTop: 0 }}>{p ? p.short : 'You are a boarder'}</div>
        </div>
      </div>
      {!p ? (
        <div className="bd-alert is-info" style={{ margin: 0 }}>
          <BedDouble size={16} /><span>You haven't been given a room yet. Your {d.word.toLowerCase()} staff will let you know where you sleep.</span>
        </div>
      ) : (
        <>
          <dl className="bd-myroom-steps">
            {steps.map(s => (
              <div key={s.k} className={`bd-step${s.key ? ' is-key' : ''}`}><dt>{s.k}</dt><dd>{s.v}</dd></div>
            ))}
          </dl>
          {d.roomLabel && <div className="bd-sub" style={{ marginBottom: 10 }}>{d.roomLabel}</div>}
          {d.roommates && (
            <>
              <div className="bd-section-title" style={{ marginTop: 4 }}><Users size={12} style={{ verticalAlign: -1 }} /> Roommates ({d.roommates.length}) · {d.capacity} beds in the room</div>
              {d.roommates.length === 0 ? <div className="bd-sub">Nobody else yet.</div> : (
                <div className="bd-list">
                  {d.roommates.map((m, i) => (
                    <div key={i} className="bd-row" style={{ flexWrap: 'nowrap' }}>
                      <span className="bd-avatar is-sm" aria-hidden><AvatarPhoto src={m.photo}>{m.name.charAt(0).toUpperCase()}</AvatarPhoto></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="bd-name" style={{ fontSize: 13.5 }}>{m.name}</div>
                        <div className="bd-meta">{m.level != null && !isSchoolMode() && <span>{levelName(m.level)}</span>}{m.bed && <span>Bed {m.bed}</span>}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {(d.staff?.length ?? 0) > 0 && (
            <div className="bd-sub" style={{ marginTop: 12 }}>
              {d.staff!.map(s => `${s.title ?? 'House staff'}: ${s.name}`).join(' · ')}
            </div>
          )}
        </>
      )}
    </section>
  );
}
