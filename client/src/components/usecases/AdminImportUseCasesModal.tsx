import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../lib/config';

const API_BASE = API_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnhancedFields {
  title: string;
  description: string;
  proposed_solution: string;
  kpi: string;
  target_user: string;
  category: string;
}

interface PreviewItem {
  temp_id: string;
  original: { title: string; description: string };
  enhanced: EnhancedFields;
  auto_industry: string;
  auto_category: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
  similarity_score: number;
}

// Editable row state
interface ReviewRow extends EnhancedFields {
  temp_id: string;
  auto_industry: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
  similarity_score: number;
  selected: boolean;
}

type Step = 'upload' | 'processing' | 'review' | 'done';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCEPTED = '.xlsx,.csv,.json,.docx,.pdf,.txt,.md,.jsx,.jpg,.jpeg,.png';

const TEMPLATE_HEADERS = ['Title', 'Problem Statement', 'Proposed Solution', 'KPI', 'Target User', 'AI Technique'];

// Human-friendly label for an uploaded file's format
function formatLabel(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    xlsx: 'Excel', csv: 'CSV', json: 'JSON', docx: 'Word', pdf: 'PDF',
    txt: 'Text', md: 'Markdown', jsx: 'JSX', jpg: 'Image', jpeg: 'Image', png: 'Image',
  };
  return map[ext] ?? ext.toUpperCase();
}

function downloadTemplate() {
  // Build a minimal CSV as a download (no xlsx dependency on frontend)
  const csv = TEMPLATE_HEADERS.join(',') + '\n' +
    '"Example: Claims Review","Process scans and extract data from insurance claims","Use OCR + LLM pipeline to parse PDFs","Reduce handle time by 40%","Claims Processor","Generative AI"\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'use_cases_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminImportUseCasesModal({ isOpen, onClose, onSuccess }: Props) {
  const { token } = useAuth();

  const [step, setStep]           = useState<Step>('upload');
  const [file, setFile]           = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows]           = useState<ReviewRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [isSubmitting, setIsSubmitting]   = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Reset when closed ─────────────────────────────────────────────────────

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setRows([]);
    setIsDragging(false);
    setIsSubmitting(false);
    onClose();
  };

  // ── File handling ─────────────────────────────────────────────────────────

  const ALLOWED_EXTS = ['xlsx', 'csv', 'json', 'docx', 'pdf', 'txt', 'md', 'jsx', 'jpg', 'jpeg', 'png'];

  const acceptFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTS.includes(ext ?? '')) {
      toast.error(`Unsupported file type. Allowed: ${ALLOWED_EXTS.map(e => '.' + e).join(', ')}`);
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }, []);

  // ── Step 1 → 2: Upload & Process ─────────────────────────────────────────

  const processFile = async () => {
    if (!file || !token) return;
    setStep('processing');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/admin/usecases/import/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.detail ?? 'Processing failed');
      }

      const items: PreviewItem[] = await res.json();

      setRows(items.map(item => ({
        temp_id:          item.temp_id,
        title:            item.enhanced.title,
        description:      item.enhanced.description,
        proposed_solution: item.enhanced.proposed_solution,
        kpi:              item.enhanced.kpi,
        target_user:      item.enhanced.target_user,
        category:         item.enhanced.category || item.auto_category,
        auto_industry:    item.auto_industry,
        is_duplicate:     item.is_duplicate,
        duplicate_of:     item.duplicate_of,
        similarity_score: item.similarity_score,
        selected:         !item.is_duplicate,   // Pre-deselect duplicates
      })));

      setStep('review');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to process file');
      setStep('upload');
    }
  };

  // ── Step 3 → 4: Confirm import ────────────────────────────────────────────

  const confirmImport = async () => {
    const selected = rows.filter(r => r.selected);
    if (!selected.length) { toast.error('Select at least one use case'); return; }
    if (!token) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/usecases/import/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          use_cases: selected.map(r => ({
            title:             r.title,
            description:       r.description,
            proposed_solution: r.proposed_solution,
            kpi:               r.kpi,
            target_user:       r.target_user,
            category:          r.category,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.detail ?? 'Import failed');
      }
      const result = await res.json();
      setImportedCount(result.imported ?? selected.length);
      setStep('done');
      onSuccess();
      toast.success(`${result.imported} use cases imported successfully`);
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to import use cases');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Row editing ───────────────────────────────────────────────────────────

  const updateRow = (id: string, field: keyof ReviewRow, value: string | boolean) =>
    setRows(prev => prev.map(r => r.temp_id === id ? { ...r, [field]: value } : r));

  const selectedCount = rows.filter(r => r.selected).length;

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .aim-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 300;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .aim-modal {
          background: var(--theme-card-bg, white);
          border: 1px solid var(--theme-border-color, #e5e7eb);
          border-radius: 18px;
          width: 95%;
          max-width: 960px;
          max-height: 90vh;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .aim-header {
          padding: 22px 28px 18px;
          border-bottom: 1px solid var(--theme-border-color, #e5e7eb);
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
        }
        .aim-body { flex: 1; overflow-y: auto; padding: 28px; }
        .aim-footer {
          padding: 16px 28px;
          border-top: 1px solid var(--theme-border-color, #e5e7eb);
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
        }
        .aim-step-bar {
          display: flex; gap: 8px; align-items: center;
          padding: 0 28px 16px;
          flex-shrink: 0;
        }
        .aim-step-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #e5e7eb; transition: background 0.2s;
        }
        .aim-step-dot.active { background: #f59e0b; }
        .aim-step-dot.done   { background: #22c55e; }

        .aim-dropzone {
          border: 2px dashed var(--theme-border-color, #e5e7eb);
          border-radius: 12px;
          padding: 48px 32px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .aim-dropzone:hover, .aim-dropzone.drag-over {
          border-color: #f59e0b;
          background: #fffbeb;
        }

        .aim-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .aim-table th {
          text-align: left;
          padding: 8px 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9ca3af;
          border-bottom: 2px solid var(--theme-border-color, #e5e7eb);
          white-space: nowrap;
        }
        .aim-table td {
          padding: 8px 10px;
          border-bottom: 1px solid var(--theme-border-color, #f3f4f6);
          vertical-align: top;
          color: var(--theme-text-primary, #111827);
        }
        .aim-table tr.dup-row td { background: #fffbeb; }
        .aim-table tr.deselected td { opacity: 0.45; }

        .aim-input {
          width: 100%;
          background: var(--theme-input-bg, #f9fafb);
          border: 1px solid var(--theme-border-color, #e5e7eb);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          font-family: inherit;
          color: var(--theme-text-primary, #111827);
          outline: none;
          box-sizing: border-box;
        }
        .aim-input:focus { border-color: #f59e0b; }

        .aim-btn {
          padding: 9px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: opacity 0.15s;
        }
        .aim-btn:hover { opacity: 0.88; }
        .aim-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .aim-btn-primary   { background: #f59e0b; color: white; }
        .aim-btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .aim-btn-success   { background: #22c55e; color: white; }
      `}</style>

      <div className="aim-overlay" onClick={handleClose}>
        <div className="aim-modal" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="aim-header">
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--theme-text-primary, #111827)' }}>
                Import AI Use Cases
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                Upload an Excel, Word, or PDF file — AI will enhance and classify each use case
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Step indicator */}
          <div className="aim-step-bar">
            {(['upload', 'processing', 'review', 'done'] as Step[]).map((s, i) => {
              const steps = ['upload', 'processing', 'review', 'done'];
              const idx = steps.indexOf(step);
              const cls = i < idx ? 'done' : i === idx ? 'active' : '';
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={`aim-step-dot ${cls}`} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: i === idx ? '#f59e0b' : '#9ca3af' }}>
                    {['Upload', 'Processing', 'Review', 'Done'][i]}
                  </span>
                  {i < 3 && <div style={{ width: 24, height: 1, background: '#e5e7eb' }} />}
                </div>
              );
            })}
          </div>

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <>
              <div className="aim-body">
                {/* Dropzone */}
                <div
                  className={`aim-dropzone${isDragging ? ' drag-over' : ''}`}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                  {file ? (
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                        {file.name}
                        <span style={{ marginLeft: 8, fontSize: 11, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 4, padding: '2px 7px', verticalAlign: 'middle' }}>
                          {formatLabel(file.name)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{(file.size / 1024).toFixed(1)} KB — click to change</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--theme-text-primary, #374151)', marginBottom: 6 }}>
                        Drop a file here, or click to browse
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        Excel · CSV · JSON · Word · PDF · Text · Markdown · JSX · Images (JPG / PNG)
                      </div>
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED}
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f); }}
                  />
                </div>

                {/* Format guide */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>
                    Supported Formats
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>

                    {/* Tabular */}
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>📊 Tabular (structured)</div>
                      <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6, marginBottom: 8 }}>
                        <strong>.xlsx</strong> · <strong>.csv</strong> · <strong>.json</strong><br />
                        One row/item per use case. Columns:<br />
                        <code style={{ fontSize: 10, background: '#dcfce7', padding: '1px 4px', borderRadius: 3 }}>
                          Title | Problem Statement | KPI | AI Technique …
                        </code>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); downloadTemplate(); }}
                        style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', background: 'none', border: '1px solid #86efac', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                      >
                        ⬇ Download CSV Template
                      </button>
                    </div>

                    {/* Narrative docs */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', marginBottom: 6 }}>📄 Documents (narrative)</div>
                      <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6 }}>
                        <strong>.docx</strong> · <strong>.pdf</strong> · <strong>.txt</strong> · <strong>.md</strong> · <strong>.jsx</strong><br />
                        Any document describing AI challenges. The AI will read the text, extract use cases, and structure them automatically.
                      </div>
                    </div>

                    {/* Images */}
                    <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#9333ea', marginBottom: 6 }}>🖼 Images (AI Vision)</div>
                      <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6 }}>
                        <strong>.jpg</strong> · <strong>.jpeg</strong> · <strong>.png</strong><br />
                        Screenshots, whiteboards, slides, or any image containing use case content. Claude Vision will extract and structure the text.
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              <div className="aim-footer">
                <button className="aim-btn aim-btn-secondary" onClick={handleClose}>Cancel</button>
                <button
                  className="aim-btn aim-btn-primary"
                  disabled={!file}
                  onClick={processFile}
                >
                  Process with AI →
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Processing ── */}
          {step === 'processing' && (
            <div className="aim-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #f3f4f6', borderTopColor: '#f59e0b', animation: 'spin 0.9s linear infinite', marginBottom: 24 }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--theme-text-primary, #111827)', marginBottom: 8 }}>
                Reviewing with AI…
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', maxWidth: 380 }}>
                {file && ['jpg','jpeg','png'].includes(file.name.split('.').pop()?.toLowerCase() ?? '')
                  ? 'Running AI Vision to extract content from the image, then enhancing use cases…'
                  : file && ['json','csv','xlsx'].includes(file.name.split('.').pop()?.toLowerCase() ?? '')
                    ? 'Parsing structured data, enhancing with AI, and checking for duplicates…'
                    : 'Reading document, extracting use cases with AI, and checking for duplicates…'
                }
                {' '}This may take 15–30 seconds.
              </div>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 'review' && (
            <>
              <div className="aim-body" style={{ padding: '16px 28px' }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>
                    {rows.length} use cases extracted · {selectedCount} selected
                  </span>
                  <button
                    className="aim-btn aim-btn-secondary"
                    style={{ padding: '5px 12px', fontSize: 11 }}
                    onClick={() => setRows(r => r.map(x => ({ ...x, selected: true })))}
                  >
                    Select All
                  </button>
                  <button
                    className="aim-btn aim-btn-secondary"
                    style={{ padding: '5px 12px', fontSize: 11 }}
                    onClick={() => setRows(r => r.map(x => ({ ...x, selected: !x.is_duplicate })))}
                  >
                    Deselect Duplicates
                  </button>
                  {rows.some(r => r.is_duplicate) && (
                    <span style={{ fontSize: 11, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '3px 8px', color: '#92400e' }}>
                      ⚠ {rows.filter(r => r.is_duplicate).length} possible duplicate(s)
                    </span>
                  )}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--theme-border-color, #e5e7eb)' }}>
                  <table className="aim-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}></th>
                        <th style={{ minWidth: 200 }}>Title</th>
                        <th style={{ minWidth: 200 }}>Description</th>
                        <th style={{ minWidth: 160 }}>KPI</th>
                        <th style={{ width: 140 }}>Industry</th>
                        <th style={{ width: 130 }}>AI Technique</th>
                        <th style={{ width: 90 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr
                          key={row.temp_id}
                          className={`${row.is_duplicate ? 'dup-row' : ''}${!row.selected ? ' deselected' : ''}`}
                        >
                          {/* Checkbox */}
                          <td>
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={e => updateRow(row.temp_id, 'selected', e.target.checked)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#f59e0b' }}
                            />
                          </td>

                          {/* Title */}
                          <td>
                            <input
                              className="aim-input"
                              value={row.title}
                              onChange={e => updateRow(row.temp_id, 'title', e.target.value)}
                            />
                          </td>

                          {/* Description */}
                          <td>
                            <textarea
                              className="aim-input"
                              value={row.description}
                              rows={3}
                              style={{ resize: 'vertical', minHeight: 60 }}
                              onChange={e => updateRow(row.temp_id, 'description', e.target.value)}
                            />
                          </td>

                          {/* KPI */}
                          <td>
                            <input
                              className="aim-input"
                              value={row.kpi}
                              onChange={e => updateRow(row.temp_id, 'kpi', e.target.value)}
                            />
                          </td>

                          {/* Industry (read-only, auto-classified) */}
                          <td>
                            <span style={{ fontSize: 11, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 5, padding: '3px 7px', display: 'inline-block', lineHeight: 1.4 }}>
                              {row.auto_industry}
                            </span>
                          </td>

                          {/* Category */}
                          <td>
                            <input
                              className="aim-input"
                              value={row.category}
                              onChange={e => updateRow(row.temp_id, 'category', e.target.value)}
                            />
                          </td>

                          {/* Duplicate flag */}
                          <td>
                            {row.is_duplicate ? (
                              <span
                                title={`${Math.round(row.similarity_score * 100)}% similar to: ${row.duplicate_of}`}
                                style={{ fontSize: 10, background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 5, padding: '3px 7px', cursor: 'help', display: 'inline-block' }}
                              >
                                ⚠ Duplicate
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 5, padding: '3px 7px', display: 'inline-block' }}>
                                ✓ New
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="aim-footer">
                <button className="aim-btn aim-btn-secondary" onClick={() => setStep('upload')}>← Back</button>
                <button
                  className="aim-btn aim-btn-success"
                  disabled={selectedCount === 0 || isSubmitting}
                  onClick={confirmImport}
                >
                  {isSubmitting ? 'Importing…' : `Import ${selectedCount} Use Case${selectedCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <>
              <div className="aim-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--theme-text-primary, #111827)', marginBottom: 8 }}>
                  Import Complete
                </div>
                <div style={{ fontSize: 14, color: '#9ca3af' }}>
                  <strong style={{ color: '#22c55e' }}>{importedCount}</strong> use cases have been imported and auto-approved.
                  They are now visible in the AI Use Cases grid.
                </div>
              </div>
              <div className="aim-footer" style={{ justifyContent: 'flex-end' }}>
                <button className="aim-btn aim-btn-primary" onClick={handleClose}>Close</button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
