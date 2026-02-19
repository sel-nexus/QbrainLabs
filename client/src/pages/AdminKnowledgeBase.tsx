import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Brain, Upload, FileText, Database, Trash2, RefreshCw,
    CheckCircle, AlertCircle, Clock, Link2, Globe, Github,
    Layers, BookOpen, ArrowRight, Plus, X, Eye,
    Play, Zap, Settings
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/config';

const API = API_BASE_URL;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RAGDoc {
    id: string; title: string; category: string; source: string;
    version: number; retrieval_count: number; is_active: boolean; created_at: string;
}

interface KnowledgeArticle {
    id: string; title: string; content?: string; summary?: string;
    source_type: string; source_filename?: string; source_url?: string;
    validation_status: string; validation_score?: number; validation_notes?: string;
    imported_at: string; linked_usecases_count: number;
}

interface RAGStatus {
    is_active: boolean; mode: string; vector_store_enabled: boolean;
    embeddings_enabled: boolean; reference_data_count: number;
}

interface DataConnector {
    id: string; name: string; connector_type: string; description?: string;
    config: Record<string, unknown>; status: string; last_synced?: string;
    last_error?: string; docs_synced: number; is_active: boolean; created_at: string;
}

type Tab = 'documents' | 'articles' | 'sources';
type ConnectorType = 'web_crawler' | 'github' | 'sharepoint' | 'confluence' | 'rest_api' | 'ontology';
type ArticleFilter = 'all' | 'validated' | 'pending' | 'rejected';

// ── Static Metadata ────────────────────────────────────────────────────────────

const CONNECTOR_META: Record<ConnectorType, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
    web_crawler:  { label: 'Web Crawler',      desc: 'Scrape public URLs recursively',    icon: <Globe size={22} />,     color: '#3b82f6' },
    github:       { label: 'GitHub',           desc: 'Ingest repo docs & markdown files', icon: <Github size={22} />,    color: '#111827' },
    sharepoint:   { label: 'SharePoint',       desc: 'Microsoft 365 document libraries',  icon: <FileText size={22} />,  color: '#e11d48' },
    confluence:   { label: 'Confluence',       desc: 'Atlassian wiki spaces',             icon: <Link2 size={22} />,     color: '#0ea5e9' },
    rest_api:     { label: 'REST / SQL API',   desc: 'Generic HTTP data feeds',           icon: <Database size={22} />,  color: '#10b981' },
    ontology:     { label: 'Ontology Builder', desc: 'Define custom knowledge graph',     icon: <Layers size={22} />,    color: '#8b5cf6' },
};

const CONNECTOR_DEFAULTS: Record<ConnectorType, Record<string, unknown>> = {
    web_crawler:  { url: '', depth: 2, include_links: true },
    github:       { repo: '', token: '', branch: 'main', path_filter: '' },
    sharepoint:   { site_url: '', tenant_id: '', client_id: '', client_secret: '', folder_path: '' },
    confluence:   { site_url: '', email: '', api_token: '', space_key: '' },
    rest_api:     { url: '', method: 'GET', headers: '{}', params: '{}', body: '', title_field: 'title', content_field: 'content', response_path: 'results' },
    ontology:     { entities: '[]', relationships: '[]' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
        validated:   { bg: '#dcfce7', color: '#16a34a', label: 'Validated' },
        pending:     { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
        rejected:    { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
        unvalidated: { bg: '#f3f4f6', color: '#6b7280', label: 'Unvalidated' },
    };
    const s = map[status?.toLowerCase()] ?? map.unvalidated;
    return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: s.bg, color: s.color, fontWeight: 600 }}>{s.label}</span>;
}

function connectorStatusBadge(status: string) {
    const map: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
        active:   { bg: '#dcfce7', color: '#16a34a', icon: <CheckCircle size={10} /> },
        syncing:  { bg: '#dbeafe', color: '#2563eb', icon: <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} /> },
        error:    { bg: '#fee2e2', color: '#dc2626', icon: <AlertCircle size={10} /> },
        inactive: { bg: '#f3f4f6', color: '#6b7280', icon: <Clock size={10} /> },
    };
    const s = map[status?.toLowerCase()] ?? map.inactive;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 12, background: s.bg, color: s.color, fontWeight: 600 }}>
            {s.icon} {status || 'inactive'}
        </span>
    );
}

function fmtDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Connector Config Form ─────────────────────────────────────────────────────

function ConnectorConfigForm({
    type, config, onChange,
}: { type: ConnectorType; config: Record<string, unknown>; onChange: (key: string, val: unknown) => void }) {
    const inp = (key: string, label: string, placeholder = '', isPassword = false) => (
        <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text-primary, #374151)', display: 'block', marginBottom: 3 }}>{label}</label>
            <input
                type={isPassword ? 'password' : 'text'}
                placeholder={placeholder}
                value={String(config[key] ?? '')}
                onChange={e => onChange(key, e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--theme-border-color, #d1d5db)', fontSize: 13, background: 'var(--theme-card-bg, #fff)', color: 'var(--theme-text-primary, #111827)', boxSizing: 'border-box' }}
            />
        </div>
    );
    const textarea = (key: string, label: string, placeholder = '') => (
        <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text-primary, #374151)', display: 'block', marginBottom: 3 }}>{label}</label>
            <textarea
                rows={3}
                placeholder={placeholder}
                value={String(config[key] ?? '')}
                onChange={e => onChange(key, e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--theme-border-color, #d1d5db)', fontSize: 12, fontFamily: 'monospace', background: 'var(--theme-card-bg, #fff)', color: 'var(--theme-text-primary, #111827)', resize: 'vertical', boxSizing: 'border-box' }}
            />
        </div>
    );

    if (type === 'web_crawler') return (<>
        {inp('url', 'Start URL', 'https://docs.example.com')}
        <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text-primary, #374151)', display: 'block', marginBottom: 3 }}>Crawl Depth</label>
            <input type="number" min={1} max={5} value={Number(config.depth ?? 2)}
                onChange={e => onChange('depth', Number(e.target.value))}
                style={{ width: 80, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--theme-border-color, #d1d5db)', fontSize: 13, background: 'var(--theme-card-bg, #fff)', color: 'var(--theme-text-primary, #111827)' }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--theme-text-primary, #374151)', cursor: 'pointer' }}>
            <input type="checkbox" checked={Boolean(config.include_links)} onChange={e => onChange('include_links', e.target.checked)} />
            Follow internal links
        </label>
    </>);

    if (type === 'github') return (<>
        {inp('repo', 'Repository (owner/repo)', 'myorg/my-docs')}
        {inp('token', 'GitHub Token (for private repos)', 'ghp_...', true)}
        {inp('branch', 'Branch', 'main')}
        {inp('path_filter', 'Path Filter (optional)', 'docs/')}
    </>);

    if (type === 'sharepoint') return (<>
        {inp('site_url', 'SharePoint Site URL', 'https://company.sharepoint.com/sites/MyTeam')}
        {inp('tenant_id', 'Azure Tenant ID', '')}
        {inp('client_id', 'App Client ID', '')}
        {inp('client_secret', 'App Client Secret', '', true)}
        {inp('folder_path', 'Document Library Path', 'Shared Documents/AI')}
    </>);

    if (type === 'confluence') return (<>
        {inp('site_url', 'Confluence Site URL', 'https://mycompany.atlassian.net/wiki')}
        {inp('email', 'Atlassian Email', 'user@company.com')}
        {inp('api_token', 'API Token', '', true)}
        {inp('space_key', 'Space Key', 'AI')}
    </>);

    if (type === 'rest_api') return (<>
        {inp('url', 'Endpoint URL', 'https://api.example.com/articles')}
        <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text-primary, #374151)', display: 'block', marginBottom: 3 }}>HTTP Method</label>
            <select value={String(config.method ?? 'GET')} onChange={e => onChange('method', e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--theme-border-color, #d1d5db)', fontSize: 13, background: 'var(--theme-card-bg, #fff)', color: 'var(--theme-text-primary, #111827)' }}>
                <option>GET</option><option>POST</option>
            </select>
        </div>
        {textarea('headers', 'Headers (JSON)', '{"Authorization": "Bearer token"}')}
        {inp('response_path', 'Response Path (dot-notation)', 'data.results')}
        {inp('title_field', 'Title Field', 'title')}
        {inp('content_field', 'Content Field', 'content')}
    </>);

    if (type === 'ontology') return (<>
        <p style={{ fontSize: 12, color: 'var(--theme-text-muted, #6b7280)', marginTop: 0 }}>
            Define your knowledge graph schema as JSON arrays of entities and relationships.
        </p>
        {textarea('entities', 'Entities (JSON array)', '[{"name":"AI Model","properties":["accuracy","latency"]}]')}
        {textarea('relationships', 'Relationships (JSON array)', '[{"from":"AI Model","to":"Dataset","type":"trained_on"}]')}
    </>);

    return null;
}

// ── Add / Edit Connector Modal ────────────────────────────────────────────────

function ConnectorModal({
    existing, onClose, onSaved, token,
}: {
    existing?: DataConnector | null;
    onClose: () => void;
    onSaved: () => void;
    token: string | null;
}) {
    const [step, setStep]               = useState<1 | 2>(existing ? 2 : 1);
    const [selectedType, setSelectedType] = useState<ConnectorType | null>((existing?.connector_type as ConnectorType) ?? null);
    const [name, setName]               = useState(existing?.name ?? '');
    const [description, setDescription] = useState(existing?.description ?? '');
    const [config, setConfig]           = useState<Record<string, unknown>>(
        existing ? { ...existing.config } : {}
    );
    const [saving, setSaving]           = useState(false);

    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const pickType = (t: ConnectorType) => {
        setSelectedType(t);
        if (!existing) setConfig({ ...CONNECTOR_DEFAULTS[t] });
        setStep(2);
    };

    const handleConfigChange = (key: string, val: unknown) => {
        setConfig(prev => ({ ...prev, [key]: val }));
    };

    const save = async () => {
        if (!name.trim() || !selectedType) { toast.error('Name and type are required'); return; }
        setSaving(true);
        try {
            const url  = existing ? `${API}/api/admin/data-sources/${existing.id}` : `${API}/api/admin/data-sources`;
            const method = existing ? 'PUT' : 'POST';
            const body = JSON.stringify({ name: name.trim(), connector_type: selectedType, description, config });
            const res  = await fetch(url, { method, headers: h, body });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail ?? 'Save failed');
            }
            toast.success(existing ? 'Connector updated' : 'Connector created');
            onSaved();
            onClose();
        } catch (e: unknown) {
            toast.error((e as Error).message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--theme-card-bg, #fff)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', padding: 28, position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted, #9ca3af)' }}>
                    <X size={18} />
                </button>

                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--theme-text-primary, #111827)', marginTop: 0, marginBottom: 20 }}>
                    {existing ? 'Edit Connector' : step === 1 ? 'Choose Connector Type' : `Configure ${selectedType ? CONNECTOR_META[selectedType].label : ''}`}
                </h2>

                {/* Step 1: pick type */}
                {step === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {(Object.entries(CONNECTOR_META) as [ConnectorType, typeof CONNECTOR_META[ConnectorType]][]).map(([type, meta]) => (
                            <button
                                key={type}
                                onClick={() => pickType(type)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                                    borderRadius: 10, border: '1.5px solid var(--theme-border-color, #e5e7eb)',
                                    background: 'var(--theme-card-bg, #fff)', cursor: 'pointer', textAlign: 'left',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = meta.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${meta.color}20`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-border-color, #e5e7eb)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                            >
                                <span style={{ color: meta.color }}>{meta.icon}</span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text-primary, #111827)' }}>{meta.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--theme-text-muted, #9ca3af)', marginTop: 1 }}>{meta.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2: configure */}
                {step === 2 && selectedType && (
                    <>
                        {!existing && (
                            <button onClick={() => setStep(1)} style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
                                ← Change type
                            </button>
                        )}

                        <div style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text-primary, #374151)', display: 'block', marginBottom: 3 }}>Connector Name *</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="My Web Crawler"
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--theme-border-color, #d1d5db)', fontSize: 13, background: 'var(--theme-card-bg, #fff)', color: 'var(--theme-text-primary, #111827)', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text-primary, #374151)', display: 'block', marginBottom: 3 }}>Description (optional)</label>
                            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description"
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--theme-border-color, #d1d5db)', fontSize: 13, background: 'var(--theme-card-bg, #fff)', color: 'var(--theme-text-primary, #111827)', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ borderTop: '1px solid var(--theme-border-color, #e5e7eb)', paddingTop: 16, marginBottom: 20 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text-muted, #6b7280)', marginTop: 0, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {CONNECTOR_META[selectedType].label} Configuration
                            </p>
                            <ConnectorConfigForm type={selectedType} config={config} onChange={handleConfigChange} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--theme-border-color, #e5e7eb)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--theme-text-muted, #6b7280)' }}>
                                Cancel
                            </button>
                            <button onClick={save} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Saving…' : existing ? 'Save Changes' : 'Create Connector'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── View Article Modal ────────────────────────────────────────────────────────

function ViewArticleModal({
    article, onClose, onRevalidate,
}: {
    article: KnowledgeArticle;
    onClose: () => void;
    onRevalidate: (id: string) => void;
}) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--theme-card-bg, #fff)', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '88vh', overflow: 'auto', padding: 28, position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted, #9ca3af)' }}>
                    <X size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <BookOpen size={18} color="#8b5cf6" />
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--theme-text-primary, #111827)', margin: 0, flex: 1 }}>{article.title}</h2>
                    {statusBadge(article.validation_status)}
                </div>

                <div style={{ fontSize: 12, color: 'var(--theme-text-muted, #9ca3af)', marginBottom: 16 }}>
                    {article.source_type} · {article.source_filename || article.source_url || '—'} · Imported {fmtDate(article.imported_at)}
                    {article.validation_score != null && ` · Score: ${Math.round(article.validation_score)}%`}
                    {article.linked_usecases_count > 0 && ` · ${article.linked_usecases_count} linked use cases`}
                </div>

                {article.summary && (
                    <div style={{ background: 'var(--theme-hover-bg, #f9fafb)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text-muted, #6b7280)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Summary</div>
                        <p style={{ fontSize: 13, color: 'var(--theme-text-primary, #374151)', margin: 0 }}>{article.summary}</p>
                    </div>
                )}

                {article.validation_notes && (
                    <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Validation Notes</div>
                        <p style={{ fontSize: 12, color: '#78350f', margin: 0 }}>{article.validation_notes}</p>
                    </div>
                )}

                {article.content && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text-muted, #6b7280)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Content</div>
                        <div style={{ maxHeight: 320, overflow: 'auto', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--theme-border-color, #e5e7eb)', fontSize: 13, color: 'var(--theme-text-primary, #374151)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {article.content}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                    <button
                        onClick={() => { onRevalidate(article.id); onClose(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--theme-text-primary, #374151)', fontWeight: 600 }}
                    >
                        <Zap size={14} /> Re-validate
                    </button>
                    <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Import URL Modal ──────────────────────────────────────────────────────────

function ImportURLModal({
    onClose, onImported, token,
}: { onClose: () => void; onImported: () => void; token: string | null }) {
    const [url, setUrl]       = useState('');
    const [title, setTitle]   = useState('');
    const [importing, setImporting] = useState(false);

    const submit = async () => {
        if (!url.trim()) { toast.error('URL is required'); return; }
        setImporting(true);
        try {
            const res = await fetch(`${API}/api/knowledge/import-url`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim(), title: title.trim() || undefined }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                // API can return err.detail (FastAPI) or err.error.message (our error handler)
                const detail = err.detail ?? err.error?.message;
                const msg = typeof detail === 'string'
                    ? detail
                    : Array.isArray(detail)
                        ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join('; ')
                        : detail?.message ?? 'Import failed';
                throw new Error(msg || 'Import failed');
            }
            const data = await res.json();
            toast.success(`"${data.title}" imported (${data.validation_status})`);
            onImported();
            onClose();
        } catch (e: unknown) {
            toast.error((e as Error).message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--theme-card-bg, #fff)', borderRadius: 14, width: '100%', maxWidth: 480, padding: 28, position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted, #9ca3af)' }}>
                    <X size={18} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <Globe size={18} color="#3b82f6" />
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--theme-text-primary, #111827)', margin: 0 }}>Import from URL</h2>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text-primary, #374151)', display: 'block', marginBottom: 4 }}>URL *</label>
                    <input
                        type="url" value={url} onChange={e => setUrl(e.target.value)}
                        placeholder="https://docs.example.com/article"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--theme-border-color, #d1d5db)', fontSize: 13, background: 'var(--theme-card-bg, #fff)', color: 'var(--theme-text-primary, #111827)', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text-primary, #374151)', display: 'block', marginBottom: 4 }}>Title (optional — auto-detected if blank)</label>
                    <input
                        value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="My Article Title"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--theme-border-color, #d1d5db)', fontSize: 13, background: 'var(--theme-card-bg, #fff)', color: 'var(--theme-text-primary, #111827)', boxSizing: 'border-box' }}
                    />
                </div>

                <p style={{ fontSize: 12, color: 'var(--theme-text-muted, #9ca3af)', marginBottom: 20 }}>
                    The page content will be fetched, ingested into the RAG knowledge base, validated with AI, and linked to relevant use cases automatically.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--theme-border-color, #e5e7eb)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--theme-text-muted, #6b7280)' }}>
                        Cancel
                    </button>
                    <button onClick={submit} disabled={importing}
                        style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 13, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.7 : 1 }}>
                        {importing ? 'Importing…' : 'Import'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminKnowledgeBase() {
    const { token } = useAuth();
    const h = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const [tab, setTab]             = useState<Tab>('documents');
    const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
    const [docs, setDocs]           = useState<RAGDoc[]>([]);
    const [articles, setArticles]   = useState<KnowledgeArticle[]>([]);
    const [connectors, setConnectors] = useState<DataConnector[]>([]);
    const [loadingDocs, setLoadingDocs]       = useState(false);
    const [loadingArticles, setLoadingArticles] = useState(false);
    const [loadingConnectors, setLoadingConnectors] = useState(false);

    // Upload state
    const [isDragging, setIsDragging]         = useState(false);
    const [uploading, setUploading]           = useState(false);
    const [uploadCategory, setUploadCategory] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Articles state
    const [articleFilter, setArticleFilter]   = useState<ArticleFilter>('all');
    const [viewArticle, setViewArticle]       = useState<KnowledgeArticle | null>(null);
    const [showURLModal, setShowURLModal]     = useState(false);
    const [revalidatingId, setRevalidatingId] = useState<string | null>(null);
    const artFileInputRef = useRef<HTMLInputElement>(null);

    // Sources state
    const [showConnectorModal, setShowConnectorModal] = useState(false);
    const [editConnector, setEditConnector]   = useState<DataConnector | null>(null);
    const [syncingId, setSyncingId]           = useState<string | null>(null);
    const [testingId, setTestingId]           = useState<string | null>(null);

    // Migration state
    const [kbTotal, setKbTotal]             = useState<number | null>(null);
    const [migrating, setMigrating]         = useState(false);
    const [migrationDone, setMigrationDone] = useState(
        () => localStorage.getItem('kb_migration_done') === 'true'
    );
    const [showMigrateConfirm, setShowMigrateConfirm] = useState(false);

    // ── Load ───────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchStatus();
        fetchKbPending();
    }, []);

    useEffect(() => {
        if (tab === 'documents') fetchDocs();
        if (tab === 'articles')  fetchArticles(articleFilter);
        if (tab === 'sources')   fetchConnectors();
    }, [tab]);

    useEffect(() => {
        if (tab === 'articles') fetchArticles(articleFilter);
    }, [articleFilter]);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API}/api/knowledge-base/status`, { headers: h() });
            if (res.ok) setRagStatus(await res.json());
        } catch { /* non-critical */ }
    };

    const fetchKbPending = async () => {
        try {
            const res = await fetch(`${API}/api/admin/knowledge-base/pending-migration`, { headers: h() });
            if (res.ok) { const d = await res.json(); setKbTotal(d.kb_total ?? 0); }
        } catch { /* non-critical */ }
    };

    const fetchDocs = async () => {
        setLoadingDocs(true);
        try {
            const res = await fetch(`${API}/api/knowledge-base/documents`, { headers: h() });
            if (!res.ok) throw new Error();
            const d = await res.json();
            setDocs(d.documents ?? []);
        } catch { toast.error('Failed to load RAG documents'); }
        finally { setLoadingDocs(false); }
    };

    const fetchArticles = async (filter: ArticleFilter = 'all') => {
        setLoadingArticles(true);
        try {
            const qs = filter !== 'all' ? `?validation_status=${filter}` : '';
            const res = await fetch(`${API}/api/knowledge/articles${qs}`, { headers: h() });
            if (!res.ok) throw new Error();
            setArticles(await res.json());
        } catch { toast.error('Failed to load knowledge articles'); }
        finally { setLoadingArticles(false); }
    };

    const fetchConnectors = async () => {
        setLoadingConnectors(true);
        try {
            const res = await fetch(`${API}/api/admin/data-sources`, { headers: h() });
            if (!res.ok) throw new Error();
            setConnectors(await res.json());
        } catch { toast.error('Failed to load data connectors'); }
        finally { setLoadingConnectors(false); }
    };

    // ── Upload ─────────────────────────────────────────────────────────────

    const handleUpload = useCallback(async (file: File) => {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        if (uploadCategory) fd.append('category', uploadCategory);
        try {
            const res = await fetch(`${API}/api/knowledge-base/documents/upload`, { method: 'POST', headers: h(), body: fd });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail ?? 'Upload failed'); }
            toast.success(`"${file.name}" ingested into RAG`);
            setUploadCategory('');
            fetchDocs();
        } catch (e: unknown) { toast.error((e as Error).message || 'Upload failed'); }
        finally { setUploading(false); }
    }, [token, uploadCategory]);

    const handleArticleFile = useCallback(async (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch(`${API}/api/knowledge/import`, { method: 'POST', headers: h(), body: fd });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail ?? 'Import failed'); }
            const data = await res.json();
            toast.success(`"${data.title}" imported`);
            fetchArticles(articleFilter);
        } catch (e: unknown) { toast.error((e as Error).message || 'Import failed'); }
    }, [token, articleFilter]);

    const revalidateArticle = async (id: string) => {
        setRevalidatingId(id);
        try {
            const res = await fetch(`${API}/api/knowledge/articles/${id}/revalidate`, { method: 'POST', headers: h() });
            if (!res.ok) throw new Error();
            const d = await res.json();
            toast.success(`Re-validated: ${d.validation_status} (${Math.round(d.validation_score ?? 0)}%)`);
            fetchArticles(articleFilter);
        } catch { toast.error('Re-validation failed'); }
        finally { setRevalidatingId(null); }
    };

    const deleteDoc = async (id: string) => {
        try {
            const res = await fetch(`${API}/api/knowledge-base/documents/${id}`, { method: 'DELETE', headers: h() });
            if (!res.ok) throw new Error();
            toast.success('Document removed');
            fetchDocs();
        } catch { toast.error('Failed to remove document'); }
    };

    const deleteArticle = async (id: string) => {
        try {
            const res = await fetch(`${API}/api/knowledge/articles/${id}`, { method: 'DELETE', headers: h() });
            if (!res.ok) throw new Error();
            toast.success('Article deleted');
            fetchArticles(articleFilter);
        } catch { toast.error('Failed to delete article'); }
    };

    // ── Connector actions ──────────────────────────────────────────────────

    const testConnector = async (id: string) => {
        setTestingId(id);
        try {
            const res = await fetch(`${API}/api/admin/data-sources/${id}/test`, { method: 'POST', headers: h() });
            const d = await res.json();
            if (d.success) toast.success(d.message || 'Connection successful');
            else toast.error(d.message || 'Connection failed');
        } catch { toast.error('Test failed'); }
        finally { setTestingId(null); }
    };

    const syncConnector = async (id: string) => {
        setSyncingId(id);
        try {
            const res = await fetch(`${API}/api/admin/data-sources/${id}/sync`, { method: 'POST', headers: h() });
            if (!res.ok) throw new Error();
            toast.success('Sync started — running in background');
            setConnectors(prev => prev.map(c => c.id === id ? { ...c, status: 'syncing' } : c));
        } catch { toast.error('Failed to start sync'); }
        finally { setSyncingId(null); }
    };

    const deleteConnector = async (id: string) => {
        try {
            const res = await fetch(`${API}/api/admin/data-sources/${id}`, { method: 'DELETE', headers: h() });
            if (!res.ok) throw new Error();
            toast.success('Connector deleted');
            setConnectors(prev => prev.filter(c => c.id !== id));
        } catch { toast.error('Failed to delete connector'); }
    };

    // ── Migration ──────────────────────────────────────────────────────────

    const runMigration = async () => {
        setShowMigrateConfirm(false);
        setMigrating(true);
        try {
            const res = await fetch(`${API}/api/admin/knowledge-base/migrate-usecases`, { method: 'POST', headers: h() });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message ?? err.detail ?? `Server error ${res.status}`);
            }
            const result = await res.json();
            toast.success(result.message ?? `Migrated ${result.migrated} use cases`);
            localStorage.setItem('kb_migration_done', 'true');
            setMigrationDone(true);
            setKbTotal(0);
        } catch (e: unknown) {
            toast.error((e as Error).message || 'Migration failed');
        } finally { setMigrating(false); }
    };

    // ── Article stats ──────────────────────────────────────────────────────

    const artStats = {
        total:     articles.length,
        validated: articles.filter(a => a.validation_status === 'validated').length,
        pending:   articles.filter(a => a.validation_status === 'pending').length,
        linked:    articles.filter(a => a.linked_usecases_count > 0).length,
    };

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <AdminLayout>
            <style>{`
                .kb-card { background: var(--theme-card-bg,#fff); border: 1px solid var(--theme-border-color,#e5e7eb); border-radius: 10px; padding: 16px; }
                .kb-tab { padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: background 0.15s, color 0.15s; }
                .kb-tab.active { background: #6366f1; color: #fff; }
                .kb-tab:not(.active) { background: transparent; color: var(--theme-text-muted,#6b7280); }
                .kb-tab:not(.active):hover { background: var(--theme-border-color,#e5e7eb); color: var(--theme-text-primary,#111827); }
                .kb-drop-zone { border: 2px dashed var(--theme-border-color,#d1d5db); border-radius: 12px; padding: 36px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
                .kb-drop-zone.dragging { border-color: #6366f1; background: rgba(99,102,241,0.04); }
                .kb-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--theme-border-color,#e5e7eb); font-size: 13px; }
                .kb-row:last-child { border-bottom: none; }
                .kb-row:hover { background: var(--theme-hover-bg,#f9fafb); }
                .art-filter-btn { padding: 5px 14px; border-radius: 20px; border: 1px solid var(--theme-border-color,#e5e7eb); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
                .art-filter-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }
                .art-filter-btn:not(.active) { background: transparent; color: var(--theme-text-muted,#6b7280); }
                .connector-card { background: var(--theme-card-bg,#fff); border: 1px solid var(--theme-border-color,#e5e7eb); border-radius: 12px; padding: 18px; transition: box-shadow 0.15s; }
                .connector-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
                .icon-btn { background: none; border: 1px solid var(--theme-border-color,#e5e7eb); border-radius: 6px; cursor: pointer; padding: 5px 8px; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; transition: all 0.15s; }
                .icon-btn:hover { background: var(--theme-hover-bg,#f3f4f6); }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <Brain size={22} color="#6366f1" />
                            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--theme-text-primary,#111827)', margin: 0 }}>AI Knowledge Base</h1>
                            {ragStatus && (
                                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 12, fontWeight: 600, background: ragStatus.is_active ? '#dcfce7' : '#fef3c7', color: ragStatus.is_active ? '#16a34a' : '#d97706' }}>
                                    {ragStatus.is_active ? 'RAG Active' : 'Mock Mode'}
                                </span>
                            )}
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--theme-text-muted,#6b7280)', margin: 0 }}>
                            Upload documents, connect data sources, and manage the RAG knowledge graph and ontology.
                        </p>
                    </div>
                    <button
                        onClick={() => { fetchStatus(); if (tab === 'documents') fetchDocs(); if (tab === 'articles') fetchArticles(articleFilter); if (tab === 'sources') fetchConnectors(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--theme-border-color,#e5e7eb)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--theme-text-muted,#6b7280)' }}
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                {/* ── RAG Stats ── */}
                {ragStatus && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                        {[
                            { label: 'Vector Store', value: ragStatus.vector_store_enabled ? 'Enabled' : 'Disabled', icon: <Database size={16} color="#6366f1" />, ok: ragStatus.vector_store_enabled },
                            { label: 'Embeddings',   value: ragStatus.embeddings_enabled ? 'Enabled' : 'Disabled',   icon: <Layers size={16} color="#8b5cf6" />,   ok: ragStatus.embeddings_enabled },
                            { label: 'Reference Docs', value: ragStatus.reference_data_count,                         icon: <BookOpen size={16} color="#10b981" />, ok: true },
                            { label: 'Mode',         value: ragStatus.mode === 'real' ? 'Live AI' : 'Mock',          icon: <Brain size={16} color="#f59e0b" />,   ok: ragStatus.mode === 'real' },
                        ].map(t => (
                            <div key={t.label} className="kb-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ padding: 8, borderRadius: 8, background: 'var(--theme-hover-bg,#f3f4f6)' }}>{t.icon}</div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--theme-text-muted,#9ca3af)', marginBottom: 1 }}>{t.label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: t.ok ? 'var(--theme-text-primary,#111827)' : '#f59e0b' }}>{t.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Migration banner ── */}
                {!migrationDone && kbTotal !== null && kbTotal > 0 && (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 20px', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <ArrowRight size={18} color="#3b82f6" />
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>{kbTotal} use cases found in AI Knowledge Base</div>
                                    <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>Migrate them to AI Use Cases with LLM enhancement and auto-classification.</div>
                                </div>
                            </div>
                            {!showMigrateConfirm && !migrating && (
                                <button onClick={() => setShowMigrateConfirm(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                                    <ArrowRight size={14} /> Migrate Now
                                </button>
                            )}
                            {migrating && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#3b82f6', fontWeight: 600 }}><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Migrating…</span>}
                        </div>
                        {showMigrateConfirm && !migrating && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <span style={{ fontSize: 13, color: '#1d4ed8' }}>This will enhance and import all {kbTotal} use cases. This may take a minute. Confirm?</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setShowMigrateConfirm(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#fff', color: '#3b82f6', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={runMigration} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Yes, Migrate</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {migrationDone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 20px', marginBottom: 24 }}>
                        <CheckCircle size={16} color="#16a34a" />
                        <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>Migration complete — use cases are now in the AI Use Cases section.</span>
                    </div>
                )}

                {/* ── Tabs ── */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    {(['documents', 'articles', 'sources'] as Tab[]).map(t => (
                        <button key={t} className={`kb-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                            {t === 'documents' ? 'RAG Documents' : t === 'articles' ? 'Knowledge Articles' : 'Data Sources'}
                        </button>
                    ))}
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    TAB: Documents
                ═══════════════════════════════════════════════════════════ */}
                {tab === 'documents' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div
                            className={`kb-drop-zone${isDragging ? ' dragging' : ''}`}
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt,.md,.csv,.xlsx,.json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                            {uploading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                    <RefreshCw size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                                    <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>Ingesting into RAG…</span>
                                </div>
                            ) : (
                                <>
                                    <Upload size={28} color="var(--theme-text-muted,#9ca3af)" style={{ marginBottom: 8 }} />
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text-primary,#374151)', marginBottom: 4 }}>Drop a document or click to upload</div>
                                    <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#9ca3af)' }}>PDF · DOCX · PPTX · TXT · MD · CSV · XLSX · JSON</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }} onClick={e => e.stopPropagation()}>
                                        <input placeholder="Category (optional)" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                                            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--theme-border-color,#e5e7eb)', fontSize: 12, width: 180, background: 'var(--theme-card-bg,#fff)', color: 'var(--theme-text-primary,#111827)' }} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="kb-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--theme-border-color,#e5e7eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text-primary,#111827)' }}>RAG Document Library ({docs.length})</span>
                                <button onClick={fetchDocs} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted,#9ca3af)' }}><RefreshCw size={14} /></button>
                            </div>
                            {loadingDocs ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--theme-text-muted,#9ca3af)', fontSize: 13 }}>Loading…</div>
                            ) : docs.length === 0 ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--theme-text-muted,#9ca3af)', fontSize: 13 }}>No documents yet. Upload one above.</div>
                            ) : docs.map(doc => (
                                <div key={doc.id} className="kb-row">
                                    <FileText size={15} color="#6366f1" style={{ flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--theme-text-primary,#111827)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                                        <div style={{ fontSize: 11, color: 'var(--theme-text-muted,#9ca3af)', marginTop: 1 }}>{doc.category} · v{doc.version} · {doc.retrieval_count} retrievals · {fmtDate(doc.created_at)}</div>
                                    </div>
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: doc.is_active ? '#dcfce7' : '#fee2e2', color: doc.is_active ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{doc.is_active ? 'Active' : 'Inactive'}</span>
                                    <button onClick={() => deleteDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }} title="Remove from RAG"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    TAB: Knowledge Articles
                ═══════════════════════════════════════════════════════════ */}
                {tab === 'articles' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Stats row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                            {[
                                { label: 'Total Articles', value: artStats.total, color: '#6366f1' },
                                { label: 'Validated',      value: artStats.validated, color: '#16a34a' },
                                { label: 'Pending',        value: artStats.pending, color: '#d97706' },
                                { label: 'Linked to Use Cases', value: artStats.linked, color: '#3b82f6' },
                            ].map(s => (
                                <div key={s.label} className="kb-card" style={{ textAlign: 'center', padding: '14px 10px' }}>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: 11, color: 'var(--theme-text-muted,#9ca3af)', marginTop: 2 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Filter + actions bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {(['all', 'validated', 'pending', 'rejected'] as ArticleFilter[]).map(f => (
                                    <button key={f} className={`art-filter-btn${articleFilter === f ? ' active' : ''}`} onClick={() => setArticleFilter(f)}>
                                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input ref={artFileInputRef} type="file" accept=".pdf,.docx,.txt,.md" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleArticleFile(f); e.target.value = ''; }} />
                                <button onClick={() => artFileInputRef.current?.click()}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--theme-border-color,#e5e7eb)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--theme-text-primary,#374151)', fontWeight: 600 }}>
                                    <Upload size={14} /> Import File
                                </button>
                                <button onClick={() => setShowURLModal(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                    <Globe size={14} /> Import from URL
                                </button>
                            </div>
                        </div>

                        {/* Articles list */}
                        <div className="kb-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--theme-border-color,#e5e7eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text-primary,#111827)' }}>Knowledge Articles ({articles.length})</span>
                                <button onClick={() => fetchArticles(articleFilter)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted,#9ca3af)' }}><RefreshCw size={14} /></button>
                            </div>
                            {loadingArticles ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--theme-text-muted,#9ca3af)', fontSize: 13 }}>Loading…</div>
                            ) : articles.length === 0 ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--theme-text-muted,#9ca3af)', fontSize: 13 }}>
                                    No articles found. Import a document or URL to get started.
                                </div>
                            ) : articles.map(art => (
                                <div key={art.id} className="kb-row">
                                    <BookOpen size={15} color="#8b5cf6" style={{ flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--theme-text-primary,#111827)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{art.title}</div>
                                        <div style={{ fontSize: 11, color: 'var(--theme-text-muted,#9ca3af)', marginTop: 1 }}>
                                            {art.source_type} · {art.source_filename || art.source_url || '—'} · {fmtDate(art.imported_at)}
                                            {art.linked_usecases_count > 0 && ` · ${art.linked_usecases_count} linked use cases`}
                                        </div>
                                    </div>
                                    {statusBadge(art.validation_status)}
                                    {art.validation_score != null && (
                                        <span style={{ fontSize: 11, color: 'var(--theme-text-muted,#9ca3af)', minWidth: 32, textAlign: 'right' }}>{Math.round(art.validation_score)}%</span>
                                    )}
                                    <button onClick={() => setViewArticle(art)} className="icon-btn" title="View article"><Eye size={13} /></button>
                                    <button
                                        onClick={() => revalidateArticle(art.id)}
                                        disabled={revalidatingId === art.id}
                                        className="icon-btn" title="Re-validate with AI"
                                        style={{ color: '#8b5cf6' }}
                                    >
                                        {revalidatingId === art.id
                                            ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                            : <Zap size={13} />}
                                    </button>
                                    <button onClick={() => deleteArticle(art.id)} className="icon-btn" title="Delete" style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    TAB: Data Sources
                ═══════════════════════════════════════════════════════════ */}
                {tab === 'sources' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* Section header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: 13, color: 'var(--theme-text-muted,#6b7280)', margin: 0 }}>
                                    Connect external sources to automatically sync content into the RAG knowledge base.
                                </p>
                            </div>
                            <button
                                onClick={() => { setEditConnector(null); setShowConnectorModal(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                <Plus size={14} /> Add Connector
                            </button>
                        </div>

                        {/* Connector type reference cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                            {(Object.entries(CONNECTOR_META) as [ConnectorType, typeof CONNECTOR_META[ConnectorType]][]).map(([type, meta]) => {
                                const count = connectors.filter(c => c.connector_type === type).length;
                                return (
                                    <div key={type} style={{ background: 'var(--theme-card-bg,#fff)', border: '1px solid var(--theme-border-color,#e5e7eb)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
                                        <span style={{ color: meta.color }}>{meta.icon}</span>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text-primary,#374151)' }}>{meta.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--theme-text-muted,#9ca3af)' }}>{meta.desc}</div>
                                        {count > 0 && <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 12, background: '#ede9fe', color: '#7c3aed', fontWeight: 600 }}>{count} configured</span>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Configured connectors list */}
                        <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--theme-text-primary,#111827)', marginTop: 0, marginBottom: 12 }}>
                                Configured Connectors ({connectors.length})
                            </h3>
                            {loadingConnectors ? (
                                <div style={{ textAlign: 'center', padding: 32, color: 'var(--theme-text-muted,#9ca3af)', fontSize: 13 }}>Loading connectors…</div>
                            ) : connectors.length === 0 ? (
                                <div className="kb-card" style={{ textAlign: 'center', padding: 36, color: 'var(--theme-text-muted,#9ca3af)', fontSize: 13 }}>
                                    No connectors configured yet. Click <strong>Add Connector</strong> above to get started.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {connectors.map(conn => {
                                        const meta = CONNECTOR_META[conn.connector_type as ConnectorType];
                                        return (
                                            <div key={conn.id} className="connector-card">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                                    <span style={{ color: meta?.color ?? '#6b7280', flexShrink: 0 }}>{meta?.icon ?? <Database size={22} />}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--theme-text-primary,#111827)' }}>{conn.name}</span>
                                                            {connectorStatusBadge(conn.status)}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#9ca3af)' }}>
                                                            {meta?.label ?? conn.connector_type}
                                                            {conn.description && ` · ${conn.description}`}
                                                            {' · '}{conn.docs_synced} docs synced
                                                            {conn.last_synced && ` · Last sync: ${fmtDateTime(conn.last_synced)}`}
                                                        </div>
                                                        {conn.last_error && (
                                                            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <AlertCircle size={11} /> {conn.last_error.slice(0, 120)}{conn.last_error.length > 120 ? '…' : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={() => testConnector(conn.id)}
                                                            disabled={testingId === conn.id}
                                                            className="icon-btn"
                                                            style={{ color: '#10b981' }}
                                                            title="Test connection"
                                                        >
                                                            {testingId === conn.id
                                                                ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                                                : <Play size={13} />}
                                                            Test
                                                        </button>
                                                        <button
                                                            onClick={() => syncConnector(conn.id)}
                                                            disabled={syncingId === conn.id || conn.status === 'syncing'}
                                                            className="icon-btn"
                                                            style={{ color: '#3b82f6' }}
                                                            title="Start sync"
                                                        >
                                                            <RefreshCw size={13} style={conn.status === 'syncing' ? { animation: 'spin 1s linear infinite' } : undefined} />
                                                            {conn.status === 'syncing' ? 'Syncing…' : 'Sync'}
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditConnector(conn); setShowConnectorModal(true); }}
                                                            className="icon-btn"
                                                            title="Edit connector"
                                                        >
                                                            <Settings size={13} /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deleteConnector(conn.id)}
                                                            className="icon-btn"
                                                            style={{ color: '#ef4444' }}
                                                            title="Delete connector"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            {showConnectorModal && (
                <ConnectorModal
                    existing={editConnector}
                    onClose={() => { setShowConnectorModal(false); setEditConnector(null); }}
                    onSaved={fetchConnectors}
                    token={token}
                />
            )}
            {viewArticle && (
                <ViewArticleModal
                    article={viewArticle}
                    onClose={() => setViewArticle(null)}
                    onRevalidate={revalidateArticle}
                />
            )}
            {showURLModal && (
                <ImportURLModal
                    onClose={() => setShowURLModal(false)}
                    onImported={() => fetchArticles(articleFilter)}
                    token={token}
                />
            )}
        </AdminLayout>
    );
}
