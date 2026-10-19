import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * The class QR code students scan (STUDENT_SCAN): drawn from the text the server gives for the code
 * open right now. Keeps the previous image until the next one is ready, so it never flickers.
 * Its size comes from the className (CSS), so it fits phones and projectors alike.
 */
export default function ClassQr({ text, className = 'at-class-qr', label = 'Class attendance QR code' }: {
  text: string; className?: string; label?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: 720, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(url => { if (live) setSrc(url); })
      .catch(() => {});
    return () => { live = false; };
  }, [text]);
  return src ? <img className={className} src={src} alt={label} /> : <div className={className} aria-busy="true" />;
}

/** Reads a class QR code: AQ1.<session>.<check>.<code>. Null when the text isn't one. */
export function parseClassQr(text: string): { sessionId: number; check: number; code: string } | null {
  const p = text.trim().split('.');
  if (p.length !== 4 || p[0] !== 'AQ1' || !/^\d+$/.test(p[1]) || !/^[12]$/.test(p[2]) || !/^\d{5}$/.test(p[3])) return null;
  return { sessionId: Number(p[1]), check: Number(p[2]), code: p[3] };
}
