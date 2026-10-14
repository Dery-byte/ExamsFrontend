import { useEffect, useState, type ReactNode } from 'react';
import { questionImageUrl } from '../../utils/questionImage';

/**
 * The user's profile photo filling its avatar box (size and shape come from the box), or the
 * fallback (usually an initial) when there is no photo or it fails to load.
 * Photos are stored like question images ("question-images/{id}.webp"), or are a Google picture URL.
 */
export default function AvatarPhoto({ src, alt = '', children }: { src?: string | null; alt?: string; children?: ReactNode }) {
  const url = questionImageUrl(src);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (!url || broken) return <>{children}</>;
  return (
    <img src={url} alt={alt} referrerPolicy="no-referrer" onError={() => setBroken(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block' }} />
  );
}
