import { useState } from 'react';
import { questionImageUrl } from '../../utils/questionImage';

/**
 * Read-only image shown with a question (above the question text).
 * Fluid: never wider than its container, height scales with the aspect ratio,
 * and very tall images are capped so they do not push the question off-screen.
 */
export default function QuestionImage({ src, style }: { src?: string | null; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  const url = questionImageUrl(src);
  if (!url || failed) return null;
  return (
    <div className="qimg-wrap" style={style}>
      <img
        className="qimg"
        src={url}
        alt="Question illustration"
        loading="lazy"
        decoding="async"
        draggable={false}
        onContextMenu={e => e.preventDefault()}
        onError={() => setFailed(true)}
      />
      <style>{`
        .qimg-wrap { display: flex; justify-content: center; margin: 0 0 12px; max-width: 100%; }
        .qimg {
          display: block;
          max-width: 100%;
          height: auto;
          max-height: min(60vh, 460px);
          object-fit: contain;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          -webkit-user-drag: none;
          user-select: none;
        }
        @media print { .qimg { max-height: 300px; } }
      `}</style>
    </div>
  );
}
