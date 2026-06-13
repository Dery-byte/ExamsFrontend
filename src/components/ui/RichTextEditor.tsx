import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
  id?: string;
}

// ── Toolbar configuration ─────────────────────────────────────────────────────
const TOOLBAR_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ script: 'sub' }, { script: 'super' }],
    ['blockquote', 'code-block'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['clean'],
  ],
};

const TOOLBAR_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'script',
  'blockquote', 'code-block',
  'list', 'bullet',
  'indent',
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text here...',
  minHeight = 140,
  readOnly = false,
  id,
}: RichTextEditorProps) {
  return (
    <div className="rte-wrapper" id={id} style={{ '--rte-min-height': `${minHeight}px` } as React.CSSProperties}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={readOnly ? { toolbar: false } : TOOLBAR_MODULES}
        formats={TOOLBAR_FORMATS}
      />
      <style>{`
        /* ── Quill container ───────────────────────────────────────────── */
        .rte-wrapper .ql-container.ql-snow {
          border: none;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #1e293b;
        }

        .rte-wrapper .ql-editor {
          min-height: var(--rte-min-height, 140px);
          padding: 12px 14px;
          line-height: 1.7;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .rte-wrapper .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: normal;
          font-size: 14px;
          font-weight: 500;
        }

        /* ── Toolbar ────────────────────────────────────────────────────── */
        .rte-wrapper .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1.5px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 10px 10px 0 0;
          padding: 8px 10px;
          flex-wrap: wrap;
          gap: 2px;
        }

        .rte-wrapper .ql-toolbar.ql-snow .ql-formats {
          margin-right: 6px;
        }

        .rte-wrapper .ql-toolbar.ql-snow button,
        .rte-wrapper .ql-toolbar.ql-snow .ql-picker-label {
          border-radius: 6px;
          padding: 3px 5px;
          transition: background 0.15s, color 0.15s;
          color: #64748b;
          height: 26px;
          width: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rte-wrapper .ql-toolbar.ql-snow button:hover,
        .rte-wrapper .ql-toolbar.ql-snow button.ql-active,
        .rte-wrapper .ql-toolbar.ql-snow .ql-picker-label:hover {
          background: #eef2ff;
          color: #5156be !important;
        }

        .rte-wrapper .ql-toolbar.ql-snow button.ql-active .ql-stroke,
        .rte-wrapper .ql-toolbar.ql-snow button:hover .ql-stroke {
          stroke: #5156be !important;
        }

        .rte-wrapper .ql-toolbar.ql-snow button.ql-active .ql-fill,
        .rte-wrapper .ql-toolbar.ql-snow button:hover .ql-fill {
          fill: #5156be !important;
        }

        /* Picker (header dropdown) */
        .rte-wrapper .ql-toolbar.ql-snow .ql-picker {
          color: #64748b;
          height: 26px;
        }

        .rte-wrapper .ql-toolbar.ql-snow .ql-picker-label {
          width: auto;
          padding: 2px 8px;
        }

        .rte-wrapper .ql-toolbar.ql-snow .ql-picker-options {
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          padding: 4px;
          background: #fff;
          z-index: 9999;
        }

        .rte-wrapper .ql-toolbar.ql-snow .ql-picker-item:hover {
          background: #eef2ff;
          color: #5156be;
          border-radius: 5px;
        }

        /* ── Outer wrapper ──────────────────────────────────────────────── */
        .rte-wrapper .ql-snow.ql-container,
        .rte-wrapper .ql-snow.ql-toolbar {
          border: none;
        }

        .rte-wrapper {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .rte-wrapper:hover {
          border-color: #c7d2fe;
        }

        .rte-wrapper:focus-within {
          border-color: #5156be;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(81,86,190,0.1);
        }

        /* ── Read-only mode ─────────────────────────────────────────────── */
        .rte-wrapper .ql-editor[contenteditable="false"] {
          background: #f8fafc;
          cursor: default;
          padding: 10px 14px;
        }

        /* ── Content styles inside editor ──────────────────────────────── */
        .rte-wrapper .ql-editor h1 { font-size: 1.4em; font-weight: 800; color: #1e293b; }
        .rte-wrapper .ql-editor h2 { font-size: 1.2em; font-weight: 700; color: #1e293b; }
        .rte-wrapper .ql-editor h3 { font-size: 1.05em; font-weight: 700; color: #334155; }
        .rte-wrapper .ql-editor blockquote {
          border-left: 3px solid #5156be;
          padding-left: 12px;
          color: #475569;
          margin: 8px 0;
          background: #eef2ff;
          border-radius: 0 6px 6px 0;
          font-style: italic;
        }
        .rte-wrapper .ql-editor pre.ql-syntax {
          background: #1e293b;
          color: #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          font-family: 'JetBrains Mono','Fira Code',monospace;
          font-size: 13px;
        }
        .rte-wrapper .ql-editor ol,
        .rte-wrapper .ql-editor ul {
          padding-left: 20px;
        }
        .rte-wrapper .ql-editor li { margin: 3px 0; }

        /* ── Responsive: collapse toolbar on small screens ──────────────── */
        @media (max-width: 480px) {
          .rte-wrapper .ql-toolbar.ql-snow {
            padding: 6px 8px;
          }
          .rte-wrapper .ql-toolbar.ql-snow .ql-formats {
            margin-right: 3px;
          }
          .rte-wrapper .ql-toolbar.ql-snow button {
            height: 24px;
            width: 24px;
          }
        }
      `}</style>
    </div>
  );
}
