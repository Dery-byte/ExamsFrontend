import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { IMAGE_ACCEPT, questionImageUrl, validateImageFile } from '../../utils/questionImage';

interface Props {
  /** Newly chosen file (uploaded when the form is submitted). */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Path of the image already saved on the question (edit mode). */
  existing?: string | null;
  onRemoveExisting?: () => void;
}

/** Optional image picker for the question forms (admin + lecturer). */
export default function QuestionImageField({ file, onFileChange, existing, onRemoveExisting }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview || questionImageUrl(existing);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const err = validateImageFile(f);
    if (err) { toast.error(err); return; }
    onFileChange(f);
  };

  const remove = () => {
    if (file) onFileChange(null);
    else onRemoveExisting?.();
  };

  return (
    <div className="qif">
      <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} onChange={pick} style={{ display: 'none' }} />
      {shown ? (
        <div className="qif-preview">
          <img src={shown} alt="Selected question" />
          <div className="qif-actions">
            <button type="button" className="qif-btn" onClick={() => inputRef.current?.click()}>Replace</button>
            <button type="button" className="qif-btn qif-danger" onClick={remove}><X size={13} />Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" className="qif-drop" onClick={() => inputRef.current?.click()}>
          <ImagePlus size={20} />
          <span>Add an image <em>(optional)</em></span>
          <small>PNG, JPG or JPEG · up to 5MB · shown above the question</small>
        </button>
      )}
      <style>{`
        .qif { margin-bottom: 10px; max-width: 100%; }
        .qif-drop {
          width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 16px 12px; border: 1.5px dashed #cbd5e1; border-radius: 10px;
          background: #f8fafc; color: #475569; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600;
        }
        .qif-drop:hover { border-color: #5156be; color: #5156be; background: #f5f6ff; }
        .qif-drop em { font-weight: 400; color: #94a3b8; }
        .qif-drop small { font-weight: 400; color: #94a3b8; font-size: 11.5px; text-align: center; }
        .qif-preview { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px;
          border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
        .qif-preview img { display: block; max-width: 100%; height: auto; max-height: min(45vh, 320px); object-fit: contain; border-radius: 8px; }
        .qif-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .qif-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; font: inherit; font-size: 12.5px;
          font-weight: 600; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #334155; cursor: pointer; }
        .qif-btn:hover { background: #f1f5f9; }
        .qif-danger { color: #dc2626; border-color: #fecaca; }
        .qif-danger:hover { background: #fef2f2; }
      `}</style>
    </div>
  );
}
