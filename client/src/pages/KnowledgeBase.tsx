import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
    Brain,
    Search,
    Building2,
    Cpu,
    TrendingUp,
    Clock,
    ChevronRight,
    ArrowLeft,
    BookOpen,
    Filter,
    X,
    Globe,
    RefreshCw,
    Bot,
    Plus,
    Upload,
    FileText,
    Database,
    Trash2,
    Layers,
    Eye,
    Zap
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { API_BASE_URL as API_BASE } from '../lib/config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Industry {
    id: string;
    name: string;
    icon: string;
    use_case_count: number;
}

interface KnowledgeBaseOverview {
    total_industries: number;
    total_use_cases: number;
    total_categories: number;
    total_technologies: number;
    industries: Industry[];
}

interface UseCaseTemplate {
    id: string;
    title: string;
    description: string;
    category: string;
    complexity: string;
    data_requirements: string;
    typical_roi: string;
    implementation_time: string;
    technologies: string[];
    kpis: string[];
}

interface SearchResult {
    id: string;
    title: string;
    description: string;
    industry: string;
    industry_name: string;
    category: string;
    complexity: string;
    typical_roi: string;
    relevance_score: number;
}

interface IndustryDetail {
    id: string;
    name: string;
    icon: string;
    use_cases: UseCaseTemplate[];
}

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

type Tab = 'documents' | 'articles' | 'usecases';
type ArticleFilter = 'all' | 'validated' | 'pending' | 'rejected';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(s: string) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
        validated:   { bg: '#dcfce7', color: '#16a34a', label: 'Validated' },
        pending:     { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
        rejected:    { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
        unvalidated: { bg: '#f3f4f6', color: '#6b7280', label: 'Unvalidated' },
    };
    const st = map[s?.toLowerCase()] ?? map.unvalidated;
    return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>;
}

function fmtDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            const res = await fetch(`${API_BASE}/api/knowledge/import-url`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim(), title: title.trim() || undefined }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
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

export function KnowledgeBase() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { user, hasRole } = useAuth();
    const isLight = theme === 'light';
    const isFacilitatorOnly = !!user && !hasRole('admin');

    const authToken = localStorage.getItem('hm_auth_token');
    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${authToken}` }), [authToken]);

    // ── Tab state ────────────────────────────────────────────────────────────
    const [tab, setTab] = useState<Tab>('documents');

    // ── RAG status ───────────────────────────────────────────────────────────
    const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);

    // ── Documents tab ────────────────────────────────────────────────────────
    const [docs, setDocs] = useState<RAGDoc[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadCategory, setUploadCategory] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Articles tab ─────────────────────────────────────────────────────────
    const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
    const [loadingArticles, setLoadingArticles] = useState(false);
    const [articleFilter, setArticleFilter] = useState<ArticleFilter>('all');
    const [viewArticle, setViewArticle] = useState<KnowledgeArticle | null>(null);
    const [showURLModal, setShowURLModal] = useState(false);
    const [revalidatingId, setRevalidatingId] = useState<string | null>(null);
    const artFileInputRef = useRef<HTMLInputElement>(null);

    // ── Use Cases tab ────────────────────────────────────────────────────────
    const [overview, setOverview] = useState<KnowledgeBaseOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedIndustry, setSelectedIndustry] = useState<IndustryDetail | null>(null);
    const [selectedUseCase, setSelectedUseCase] = useState<UseCaseTemplate | null>(null);
    const [currentUser, setCurrentUser] = useState<unknown>(null);

    // ── Research modal ───────────────────────────────────────────────────────
    const [showResearchModal, setShowResearchModal] = useState(false);
    const [researchProvider, setResearchProvider] = useState<'perplexity' | 'google'>('perplexity');
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchResults, setResearchResults] = useState<SearchResult[]>([]);
    const [customScope, setCustomScope] = useState('');

    useEffect(() => {
        if (selectedIndustry) {
            setCustomScope(`Searching for trending AI use cases in ${selectedIndustry.name}...`);
        } else {
            setCustomScope('Searching for general trending AI use cases across all industries...');
        }
    }, [selectedIndustry]);

    // ── Init ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!authToken) {
            toast.error('Please log in to access the Knowledge Base');
            navigate('/facilitator-login');
            return;
        }
        const userStr = localStorage.getItem('hm_user');
        if (userStr) setCurrentUser(JSON.parse(userStr));
        fetchStatus();
        fetchOverview();
    }, [navigate]);

    useEffect(() => {
        if (tab === 'documents') fetchDocs();
        if (tab === 'articles') fetchArticles(articleFilter);
    }, [tab]);

    useEffect(() => {
        if (tab === 'articles') fetchArticles(articleFilter);
    }, [articleFilter]);

    // ── Fetchers ─────────────────────────────────────────────────────────────

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/knowledge-base/status`, { headers: authHeaders() });
            if (res.ok) setRagStatus(await res.json());
        } catch { /* non-critical */ }
    };

    const fetchOverview = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/knowledge-base/overview`, {
                headers: authHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch overview');
            const data = await response.json();
            setOverview(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load Knowledge Base');
        } finally {
            setLoading(false);
        }
    };

    const fetchDocs = async () => {
        setLoadingDocs(true);
        try {
            const res = await fetch(`${API_BASE}/api/knowledge-base/documents`, { headers: authHeaders() });
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
            const res = await fetch(`${API_BASE}/api/knowledge/articles${qs}`, { headers: authHeaders() });
            if (!res.ok) throw new Error();
            setArticles(await res.json());
        } catch { toast.error('Failed to load knowledge articles'); }
        finally { setLoadingArticles(false); }
    };

    // ── Document actions ─────────────────────────────────────────────────────

    const handleUpload = useCallback(async (file: File) => {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        if (uploadCategory) fd.append('category', uploadCategory);
        try {
            const res = await fetch(`${API_BASE}/api/knowledge-base/documents/upload`, { method: 'POST', headers: authHeaders(), body: fd });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const detail = err.detail ?? err.error?.message;
                const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: { msg?: string }) => d.msg || String(d)).join('; ') : 'Upload failed';
                throw new Error(msg || 'Upload failed');
            }
            toast.success(`"${file.name}" ingested into RAG`);
            setUploadCategory('');
            fetchDocs();
        } catch (e: unknown) { toast.error((e as Error).message || 'Upload failed'); }
        finally { setUploading(false); }
    }, [authToken, uploadCategory]);

    const deleteDoc = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/knowledge-base/documents/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (!res.ok) throw new Error();
            toast.success('Document removed');
            fetchDocs();
        } catch { toast.error('Failed to remove document'); }
    };

    // ── Article actions ──────────────────────────────────────────────────────

    const handleArticleFile = useCallback(async (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch(`${API_BASE}/api/knowledge/import`, { method: 'POST', headers: authHeaders(), body: fd });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail ?? 'Import failed'); }
            const data = await res.json();
            toast.success(`"${data.title}" imported`);
            fetchArticles(articleFilter);
        } catch (e: unknown) { toast.error((e as Error).message || 'Import failed'); }
    }, [authToken, articleFilter]);

    const revalidateArticle = async (id: string) => {
        setRevalidatingId(id);
        try {
            const res = await fetch(`${API_BASE}/api/knowledge/articles/${id}/revalidate`, { method: 'POST', headers: authHeaders() });
            if (!res.ok) throw new Error();
            const d = await res.json();
            toast.success(`Re-validated: ${d.validation_status} (${Math.round(d.validation_score ?? 0)}%)`);
            fetchArticles(articleFilter);
        } catch { toast.error('Re-validation failed'); }
        finally { setRevalidatingId(null); }
    };

    const deleteArticle = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/knowledge/articles/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (!res.ok) throw new Error();
            toast.success('Article deleted');
            fetchArticles(articleFilter);
        } catch { toast.error('Failed to delete article'); }
    };

    // ── Use case actions ─────────────────────────────────────────────────────

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;
        setSearching(true);
        try {
            const response = await fetch(
                `${API_BASE}/api/knowledge-base/search?query=${encodeURIComponent(searchQuery)}`,
                { headers: authHeaders() }
            );
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Search failed');
        } finally {
            setSearching(false);
        }
    };

    const fetchIndustry = async (industryId: string) => {
        try {
            const response = await fetch(
                `${API_BASE}/api/knowledge-base/industries/${industryId}`,
                { headers: authHeaders() }
            );
            if (!response.ok) throw new Error('Failed to fetch industry');
            const data = await response.json();
            setSelectedIndustry(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load industry details');
        }
    };

    const handleResearch = async () => {
        setResearchLoading(true);
        setResearchResults([]);
        try {
            const response = await fetch(`${API_BASE}/api/knowledge-base/refresh`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: researchProvider,
                    industry_id: selectedIndustry?.id || null,
                    custom_scope: customScope || null
                })
            });
            if (!response.ok) throw new Error('Research failed');
            const data = await response.json();
            setResearchResults(data);
            if (data.length === 0) toast.info('No new or refinable use cases found');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to research use cases');
        } finally {
            setResearchLoading(false);
        }
    };

    const handleAddResearchItem = async (item: SearchResult) => {
        try {
            const response = await fetch(`${API_BASE}/api/knowledge-base/add`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: item.title,
                    description: item.description,
                    industry_id: item.industry,
                    category: item.category,
                    complexity: item.complexity,
                    typical_roi: item.typical_roi
                })
            });
            if (!response.ok) throw new Error('Failed to add use case');
            toast.success(`Added "${item.title}" to library`);
            setResearchResults(prev => prev.filter(r => r.id !== item.id));
            fetchOverview();
            if (selectedIndustry && selectedIndustry.id === item.industry) {
                fetchIndustry(item.industry);
            }
        } catch (error) {
            console.error('Error adding use case:', error);
            toast.error('Failed to add use case to library');
        }
    };

    const getComplexityColor = (complexity: string) => {
        switch (complexity.toLowerCase()) {
            case 'low': return 'text-green-400 bg-green-500/10';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10';
            case 'high': return 'text-red-400 bg-red-500/10';
            default: return 'text-gray-400 bg-gray-500/10';
        }
    };

    // ── Derived ──────────────────────────────────────────────────────────────

    const artStats = {
        total:     articles.length,
        validated: articles.filter(a => a.validation_status === 'validated').length,
        pending:   articles.filter(a => a.validation_status === 'pending').length,
        linked:    articles.filter(a => a.linked_usecases_count > 0).length,
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
                <div className={`text-xl ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('common.loading', 'Loading Knowledge Base...')}</div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
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
                .icon-btn { background: none; border: 1px solid var(--theme-border-color,#e5e7eb); border-radius: 6px; cursor: pointer; padding: 5px 8px; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; transition: all 0.15s; }
                .icon-btn:hover { background: var(--theme-hover-bg,#f3f4f6); }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="max-w-7xl mx-auto px-6 py-4">
                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.title', 'AI Knowledge Base')}</h1>
                                    {ragStatus && (
                                        <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 12, fontWeight: 600, background: ragStatus.is_active ? '#dcfce7' : '#fef3c7', color: ragStatus.is_active ? '#16a34a' : '#d97706' }}>
                                            {ragStatus.is_active ? 'RAG Active' : 'Mock Mode'}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {t('admin.knowledgeBase.facilitatorDesc', 'Upload documents, manage knowledge articles, and browse AI use cases.')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => { fetchStatus(); if (tab === 'documents') fetchDocs(); if (tab === 'articles') fetchArticles(articleFilter); if (tab === 'usecases') fetchOverview(); }}
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
                        ].map(s => (
                            <div key={s.label} className="kb-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ padding: 8, borderRadius: 8, background: 'var(--theme-hover-bg,#f3f4f6)' }}>{s.icon}</div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--theme-text-muted,#9ca3af)', marginBottom: 1 }}>{s.label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: s.ok ? 'var(--theme-text-primary,#111827)' : '#f59e0b' }}>{s.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Tabs ── */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    {(['documents', 'articles', 'usecases'] as Tab[]).map(t => (
                        <button key={t} className={`kb-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                            {t === 'documents' ? 'RAG Documents' : t === 'articles' ? 'Knowledge Articles' : 'Use Cases'}
                        </button>
                    ))}
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    TAB: RAG Documents
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
                            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt,.md,.csv,.xlsx,.json,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
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
                    TAB: Use Cases (original browse/search)
                ═══════════════════════════════════════════════════════════ */}
                {tab === 'usecases' && (
                    <div>
                        {/* Actions bar */}
                        <div className="flex justify-end mb-4">
                            {!!currentUser && (
                                <Button
                                    onClick={() => setShowResearchModal(true)}
                                    variant="secondary"
                                    className="gap-2 hidden md:flex border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                                >
                                    <Globe className="w-4 h-4" />
                                    {t('admin.knowledgeBase.researchUseCases', 'Research Use Cases')}
                                </Button>
                            )}
                        </div>

                        {/* Search Section */}
                        <div className={`rounded-xl p-6 border mb-8 ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder={t('admin.knowledgeBase.searchPlaceholder', "Search AI use cases across all industries...")}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${isLight ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-700 border-white/10 text-white placeholder-gray-500'}`}
                                    />
                                </div>
                                <Button onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
                                    {searching ? t('common.searching', 'Searching...') : t('common.search', 'Search')}
                                </Button>
                            </div>

                            {searchResults.length > 0 && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                            {t('common.searchResults', 'Search Results')} ({searchResults.length})
                                        </h3>
                                        <button
                                            onClick={() => { setSearchResults([]); setSearchQuery(''); }}
                                            className={`${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {searchResults.map((result) => (
                                            <div
                                                key={result.id}
                                                className={`p-4 rounded-lg border cursor-pointer transition ${isLight ? 'bg-gray-50 border-gray-200 hover:border-purple-400' : 'bg-surface-700 border-white/5 hover:border-purple-500/50'}`}
                                                onClick={() => fetchIndustry(result.industry)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{result.title}</h4>
                                                        <p className={`text-sm mt-1 line-clamp-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{result.description}</p>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <span className="text-xs text-purple-400">{result.industry_name}</span>
                                                            <span className="text-xs text-gray-500">·</span>
                                                            <span className="text-xs text-gray-400">{result.category}</span>
                                                            <span className="text-xs text-gray-500">·</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(result.complexity)}`}>
                                                                {result.complexity}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <div className="text-sm text-green-400">{result.typical_roi}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {Math.round(result.relevance_score * 100)}% match
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stats Overview */}
                        {overview && !selectedIndustry && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                    <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-purple-400" />
                                            </div>
                                        </div>
                                        <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview.total_industries}</div>
                                        <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.industries', 'Industries')}</div>
                                    </div>
                                    <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                <BookOpen className="w-5 h-5 text-blue-400" />
                                            </div>
                                        </div>
                                        <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview.total_use_cases}</div>
                                        <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.useCases', 'Use Cases')}</div>
                                    </div>
                                    <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                                <Filter className="w-5 h-5 text-green-400" />
                                            </div>
                                        </div>
                                        <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview.total_categories}</div>
                                        <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.categories', 'Categories')}</div>
                                    </div>
                                    <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                <Cpu className="w-5 h-5 text-amber-400" />
                                            </div>
                                        </div>
                                        <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview.total_technologies}</div>
                                        <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.technologies', 'Technologies')}</div>
                                    </div>
                                </div>

                                <h2 className={`text-2xl font-bold mb-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.browseByIndustry', 'Browse by Industry')}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {overview.industries.map((industry) => (
                                        <button
                                            key={industry.id}
                                            onClick={() => fetchIndustry(industry.id)}
                                            className={`rounded-xl p-6 border transition text-left group ${isLight ? 'bg-white border-gray-200 hover:border-purple-400' : 'bg-surface-800 border-white/10 hover:border-purple-500/50'}`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                                    <Building2 className="w-6 h-6" />
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition" />
                                            </div>
                                            <h3 className={`text-lg font-semibold mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>{industry.name} ({industry.use_case_count})</h3>
                                            <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.showingKeyAIUseCases', 'Showing Key AI usecases')}</p>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Industry Detail View */}
                        {selectedIndustry && !selectedUseCase && (
                            <div>
                                <button
                                    onClick={() => setSelectedIndustry(null)}
                                    className={`flex items-center gap-2 mb-6 ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('admin.knowledgeBase.backToIndustries', 'Back to Industries')}
                                </button>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedIndustry.name}</h2>
                                        <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>{t('admin.knowledgeBase.showingKeyAIUseCases', 'Showing Key AI usecases')}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {selectedIndustry.use_cases.map((uc) => (
                                        <div
                                            key={uc.id}
                                            onClick={() => setSelectedUseCase(uc)}
                                            className={`rounded-xl p-6 border cursor-pointer transition ${isLight ? 'bg-white border-gray-200 hover:border-purple-400' : 'bg-surface-800 border-white/10 hover:border-purple-500/50'}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>{uc.title}</h3>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(uc.complexity)}`}>
                                                            {uc.complexity}
                                                        </span>
                                                    </div>
                                                    <p className={`mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{uc.description}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {uc.technologies.slice(0, 4).map((tech) => (
                                                            <span key={tech} className={`text-xs px-2 py-1 rounded ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-surface-700 text-gray-300'}`}>
                                                                {tech}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-6">
                                                    <div className="flex items-center gap-2 text-green-400 mb-2">
                                                        <TrendingUp className="w-4 h-4" />
                                                        <span className="text-sm font-medium">{uc.typical_roi}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <Clock className="w-4 h-4" />
                                                        <span className="text-sm">{uc.implementation_time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Use Case Detail View */}
                        {selectedUseCase && (
                            <div>
                                <button
                                    onClick={() => setSelectedUseCase(null)}
                                    className={`flex items-center gap-2 mb-6 ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('admin.knowledgeBase.backTo', { name: selectedIndustry?.name || 'Industry' })}
                                </button>

                                <div className={`rounded-xl p-8 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.title}</h2>
                                                <span className={`text-sm px-3 py-1 rounded ${getComplexityColor(selectedUseCase.complexity)}`}>
                                                    {selectedUseCase.complexity} {t('admin.knowledgeBase.complexity', 'Complexity')}
                                                </span>
                                            </div>
                                            <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>{selectedUseCase.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-400">{selectedUseCase.typical_roi}</div>
                                            <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.typicalRoi', 'Typical ROI')}</div>
                                        </div>
                                    </div>

                                    <p className={`text-lg mb-8 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{selectedUseCase.description}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-surface-700'}`}>
                                            <h4 className={`text-sm font-medium mb-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.dataRequirements', 'Data Requirements')}</h4>
                                            <p className={isLight ? 'text-gray-900' : 'text-white'}>{selectedUseCase.data_requirements}</p>
                                        </div>
                                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-surface-700'}`}>
                                            <h4 className={`text-sm font-medium mb-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.implementationTime', 'Implementation Time')}</h4>
                                            <p className={isLight ? 'text-gray-900' : 'text-white'}>{selectedUseCase.implementation_time}</p>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <h4 className={`text-sm font-medium mb-3 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.technologies', 'Technologies')}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedUseCase.technologies.map((tech) => (
                                                <span key={tech} className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-sm">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className={`text-sm font-medium mb-3 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.kpis', 'Key Performance Indicators')}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedUseCase.kpis.map((kpi) => (
                                                <span key={kpi} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm">
                                                    {kpi}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Research Modal ── */}
            {showResearchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className={`rounded-xl border w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.publicResearchRefresh', 'Public Research Refresh')}</h2>
                                    <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.discoverTrendingDesc', 'Discover trending use cases from the web')}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowResearchModal(false)} className={`${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {!researchResults.length && !researchLoading ? (
                                <div className="space-y-6">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{t('admin.knowledgeBase.researchProvider', 'Research Provider')}</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setResearchProvider('perplexity')}
                                                className={`p-4 rounded-lg border flex items-center gap-3 transition ${researchProvider === 'perplexity'
                                                    ? 'bg-blue-500/10 border-blue-500 text-blue-600'
                                                    : isLight
                                                        ? 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                                        : 'bg-surface-700 border-white/5 text-gray-400 hover:bg-surface-600'
                                                    }`}
                                            >
                                                <Bot className="w-5 h-5" />
                                                <div className="text-left">
                                                    <div className="font-medium">Perplexity AI</div>
                                                    <div className="text-xs opacity-70">Deep research & citations</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setResearchProvider('google')}
                                                className={`p-4 rounded-lg border flex items-center gap-3 transition ${researchProvider === 'google'
                                                    ? 'bg-green-500/10 border-green-500 text-green-600'
                                                    : isLight
                                                        ? 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                                        : 'bg-surface-700 border-white/5 text-gray-400 hover:bg-surface-600'
                                                    }`}
                                            >
                                                <Globe className="w-5 h-5" />
                                                <div className="text-left">
                                                    <div className="font-medium">Google Search</div>
                                                    <div className="text-xs opacity-70">Broad web coverage</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{t('admin.knowledgeBase.scope', 'Scope')}</label>
                                        <textarea
                                            value={customScope}
                                            onChange={(e) => setCustomScope(e.target.value)}
                                            placeholder="Enter custom search scope or use the default..."
                                            maxLength={500}
                                            rows={3}
                                            className={`w-full p-3 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLight ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-700 border-white/5 text-white placeholder-gray-500'}`}
                                        />
                                        <div className={`text-xs mt-1 text-right ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {customScope.length}/500 characters
                                        </div>
                                    </div>

                                    <Button onClick={handleResearch} className="w-full py-6 text-lg" disabled={researchLoading}>
                                        {researchLoading ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                                                {t('admin.knowledgeBase.processing', 'Researching...')}
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="w-5 h-5 mr-2" />
                                                {t('admin.knowledgeBase.startDiscovery', 'Start Discovery')}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {researchLoading && (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-4" />
                                            <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>Analyzing search results...</p>
                                        </div>
                                    )}

                                    {researchResults.map((result) => (
                                        <div key={result.id} className={`rounded-lg p-4 border flex gap-4 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-surface-700 border-white/5'}`}>
                                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex-shrink-0 flex items-center justify-center">
                                                <TrendingUp className="w-5 h-5 text-green-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{result.title}</h4>
                                                            {(result as any).is_new && (
                                                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">NEW</span>
                                                            )}
                                                            {(result as any).is_refinable && (
                                                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-medium">REFINABLE</span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded inline-block">{result.industry_name}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 uppercase">{researchProvider}</span>
                                                </div>
                                                <p className={`text-sm mt-2 mb-3 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{result.description}</p>
                                                {(result as any).is_refinable && (result as any).refinement_suggestions && (
                                                    <div className={`text-xs p-2 rounded mb-2 ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-300'}`}>
                                                        <strong>Refinements:</strong> {(result as any).refinement_suggestions}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <span>ROI: <span className="text-green-400">{result.typical_roi}</span></span>
                                                    <span>·</span>
                                                    <span>{result.category}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddResearchItem(result)}
                                                className={`self-center p-2 rounded-lg transition ${isLight ? 'bg-gray-200 hover:bg-purple-100 hover:text-purple-600 text-gray-500' : 'bg-surface-600 hover:bg-purple-600 hover:text-white text-gray-400'}`}
                                                title={(result as any).is_refinable ? "Update Existing Use Case" : "Add to Library"}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}

                                    {!researchLoading && researchResults.length > 0 && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => { setResearchResults([]); }}
                                            className="w-full mt-4"
                                        >
                                            Disconnect & Clear
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modals ── */}
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
                    token={authToken}
                />
            )}
        </div>
    );
}
