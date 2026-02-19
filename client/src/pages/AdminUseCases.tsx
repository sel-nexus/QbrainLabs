import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '../lib/config';
import { AdminLayout } from '../components/AdminLayout';
import { UseCaseApprovalModal } from '../components/usecases/UseCaseApprovalModal';
import { AdminImportUseCasesModal } from '../components/usecases/AdminImportUseCasesModal';

const API_BASE = API_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkshopInfo {
  id: string;
  title: string;
  status: string;
  current_phase: string;
}

interface UseCase {
  id: string;
  title: string;
  description: string;
  proposed_solution: string | null;
  kpi: string | null;
  target_user: string | null;
  category: string | null;
  status: string;
  created_at: string | null;
  added_by_facilitator: boolean;
  facilitator_group_id: string | null;
  workshops: WorkshopInfo[];
  workshop: WorkshopInfo;
}

// ─── Industry / Domain definitions ───────────────────────────────────────────
// Keyword-based classification since the data model doesn't have an industry field.

const INDUSTRIES = [
  { label: 'All Industries', value: 'All' },
  { label: 'AI for HR',                value: 'HR',        keywords: ['hr', 'human resources', 'recruitment', 'payroll', 'employee', 'talent', 'workforce', 'onboarding'] },
  { label: 'AI for IT',                value: 'IT',        keywords: ['it ', 'information technology', 'software', 'deployment', 'infrastructure', 'helpdesk', 'help desk', 'ticket', 'service desk', 'desktop', 'support automation'] },
  { label: 'AI for Finance',           value: 'Finance',   keywords: ['finance', 'financial', 'invoice', 'billing', 'payment', 'accounting', 'accounts payable', 'accounts receivable', 'spend', 'budget', 'tax', 'audit'] },
  { label: 'AI for Healthcare',        value: 'Health',    keywords: ['health', 'medical', 'clinical', 'patient', 'hospital', 'pharma', 'diagnosis', 'care', 'drug', 'nurse'] },
  { label: 'AI for Legal & Compliance',value: 'Legal',     keywords: ['legal', 'compliance', 'regulatory', 'contract', 'gdpr', 'privacy', 'policy', 'litigation'] },
  { label: 'AI for Customer Service',  value: 'CX',        keywords: ['customer', 'cx ', 'service', 'support', 'response time', 'client', 'satisfaction', 'nps', 'churn'] },
  { label: 'AI for Data & Analytics',  value: 'Data',      keywords: ['data', 'analytics', 'extract', 'etl', 'reporting', 'dashboard', 'insight', 'forecast', 'prediction', 'rag', 'knowledge'] },
  { label: 'AI for Operations',        value: 'Ops',       keywords: ['operation', 'process', 'workflow', 'maintenance', 'grid', 'supply', 'logistics', 'procurement', 'inventory', 'plant', 'manufacturing'] },
  { label: 'AI for Marketing & Sales', value: 'Marketing', keywords: ['marketing', 'sales', 'campaign', 'acquisition', 'lead', 'content', 'seo', 'ad '] },
] as const;

type IndustryValue = typeof INDUSTRIES[number]['value'];

const matchesIndustry = (uc: UseCase, industryValue: IndustryValue): boolean => {
  if (industryValue === 'All') return true;
  const industry = INDUSTRIES.find(i => i.value === industryValue);
  if (!industry || !('keywords' in industry)) return true;
  const haystack = `${uc.title} ${uc.description} ${uc.kpi ?? ''} ${uc.target_user ?? ''}`.toLowerCase();
  return industry.keywords.some(kw => haystack.includes(kw));
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#22c55e',
  PENDING:  '#f59e0b',
  REJECTED: '#ef4444',
};
const statusColor = (s: string) => STATUS_COLORS[s] ?? '#64748b';

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminUseCases() {
  const { token } = useAuth();

  const [useCases, setUseCases]     = useState<UseCase[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [filterWorkshop, setFilterWorkshop]   = useState('All');
  const [filterIndustry, setFilterIndustry]   = useState<IndustryValue>('All');
  const [filterCategory, setFilterCategory]   = useState('All');
  const [filterStatus, setFilterStatus]       = useState('All');
  const [filterSource, setFilterSource]       = useState('All');

  const [selectedUC, setSelectedUC]   = useState<UseCase | null>(null);
  const [reviewingUC, setReviewingUC] = useState<UseCase | null>(null);
  const [showImport, setShowImport]   = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchAllUseCases(); }, [token]);

  const fetchAllUseCases = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api/usecases/all/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch use cases');
      const data: UseCase[] = await res.json();
      setUseCases(data);
    } catch (e) {
      toast.error('Failed to load use cases');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Inline approve / reject ───────────────────────────────────────────────

  const handleQuickStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/usecases/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      setUseCases(prev => prev.map(uc => uc.id === id ? { ...uc, status: newStatus } : uc));
      if (selectedUC?.id === id) setSelectedUC(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Use case ${newStatus.toLowerCase()}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleStatusChange = (id: string, newStatus: string) =>
    setUseCases(prev => prev.map(uc => uc.id === id ? { ...uc, status: newStatus } : uc));

  // ── Derived data ──────────────────────────────────────────────────────────

  const allWorkshops = useMemo(() => {
    const map = new Map<string, string>();
    useCases.forEach(uc => {
      (uc.workshops ?? (uc.workshop ? [uc.workshop] : [])).forEach(ws => {
        if (!map.has(ws.id)) map.set(ws.id, ws.title);
      });
    });
    return Array.from(map.entries());
  }, [useCases]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    useCases.forEach(uc => { if (uc.category) cats.add(uc.category); });
    return Array.from(cats);
  }, [useCases]);

  const filtered = useMemo(() => {
    return useCases.filter(uc => {
      const wss = uc.workshops ?? (uc.workshop ? [uc.workshop] : []);
      if (filterWorkshop !== 'All' && !wss.some(ws => ws.title === filterWorkshop)) return false;
      if (!matchesIndustry(uc, filterIndustry)) return false;
      if (filterCategory !== 'All' && uc.category !== filterCategory) return false;
      if (filterStatus !== 'All' && uc.status !== filterStatus) return false;
      if (filterSource === 'Facilitator' && !uc.added_by_facilitator) return false;
      if (filterSource === 'Participant' && uc.added_by_facilitator) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !uc.title.toLowerCase().includes(q) &&
          !uc.description.toLowerCase().includes(q) &&
          !(uc.kpi ?? '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [useCases, filterWorkshop, filterIndustry, filterCategory, filterStatus, filterSource, searchQuery]);

  const hasActiveFilters = filterWorkshop !== 'All' || filterIndustry !== 'All' ||
    filterCategory !== 'All' || filterStatus !== 'All' || filterSource !== 'All' || searchQuery !== '';

  const clearFilters = () => {
    setFilterWorkshop('All');
    setFilterIndustry('All');
    setFilterCategory('All');
    setFilterStatus('All');
    setFilterSource('All');
    setSearchQuery('');
  };

  const counts = useMemo(() => ({
    total:    useCases.length,
    approved: useCases.filter(uc => uc.status === 'APPROVED').length,
    pending:  useCases.filter(uc => uc.status === 'PENDING').length,
    rejected: useCases.filter(uc => uc.status === 'REJECTED').length,
  }), [useCases]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AdminLayout title="AI Use Cases">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full border-[3px] border-amber-500/20 border-t-amber-500" style={{ width: 44, height: 44 }} />
        </div>
      </AdminLayout>
    );
  }

  // ── Shared element height ────────────────────────────────────────────────
  const H = 38; // px – all filter controls share this height

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="AI Use Cases">
      <style>{`
        .auc-card {
          transition: all 0.2s ease;
          cursor: pointer;
          background: var(--theme-card-bg, white);
          border: 1px solid var(--theme-border-color, #e5e7eb);
          border-radius: 12px;
          padding: 18px 20px;
        }
        .auc-card:hover {
          border-color: #f59e0b !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(245,158,11,0.12);
        }
        .auc-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.03em;
        }
        .auc-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--theme-text-muted, #9ca3af);
        }
        .auc-inset {
          background: var(--theme-bg-secondary, #f9fafb);
          border-radius: 8px;
          padding: 8px 12px;
        }
        .auc-inset-deep {
          background: var(--theme-bg-primary, #f3f4f6);
          border-radius: 8px;
          padding: 10px 13px;
        }
        .auc-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        .auc-modal {
          background: var(--theme-card-bg, white);
          border: 1px solid var(--theme-border-color, #e5e7eb);
          border-radius: 16px;
          width: 90%;
          max-width: 720px;
          max-height: 85vh;
          overflow-y: auto;
          padding: 36px;
        }
        .auc-action-btn {
          background: none;
          border: 1px solid;
          border-radius: 5px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 12px;
          transition: all 0.15s;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .auc-action-btn:hover { opacity: 0.8; }
        .auc-filter-select {
          background: var(--theme-input-bg, #f9fafb);
          border: 1px solid var(--theme-border-color, #e5e7eb);
          color: var(--theme-text-secondary, #374151);
          font-family: inherit;
          font-size: 13px;
          padding: 0 10px;
          border-radius: 8px;
          outline: none;
          cursor: pointer;
          appearance: auto;
        }
        .auc-filter-select:focus { border-color: #f59e0b; }
        .auc-search-input {
          background: var(--theme-input-bg, #f9fafb);
          border: 1px solid var(--theme-border-color, #e5e7eb);
          color: var(--theme-text-primary, #111827);
          font-family: inherit;
          font-size: 13px;
          padding: 0 14px;
          border-radius: 8px;
          outline: none;
        }
        .auc-search-input::placeholder { color: #9ca3af; }
        .auc-search-input:focus { border-color: #f59e0b; }
      `}</style>

      {/* ── 1. Summary Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total',    value: counts.total,    color: '#6366f1', bg: '#eef2ff', border: '#6366f120' },
          { label: 'Approved', value: counts.approved, color: '#22c55e', bg: '#f0fdf4', border: '#22c55e20' },
          { label: 'Pending',  value: counts.pending,  color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b20' },
          { label: 'Rejected', value: counts.rejected, color: '#ef4444', bg: '#fef2f2', border: '#ef444420' },
        ].map(({ label, value, color, bg, border }) => (
          <div
            key={label}
            onClick={() => setFilterStatus(label === 'Total' ? 'All' : label.toUpperCase())}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: '16px 20px',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              outline: filterStatus === (label === 'Total' ? 'All' : label.toUpperCase()) ? `2px solid ${color}` : 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${color}20`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 4, opacity: 0.8 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── 2. Actions row ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={() => setShowImport(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.01em',
            boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>⬆</span>
          Import Use Cases
        </button>
      </div>

      {/* ── 3. Horizontal Filter Bar ── */}
      <div style={{
        background: 'var(--theme-card-bg, white)',
        border: '1px solid var(--theme-border-color, #e5e7eb)',
        borderRadius: 12,
        padding: '10px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>

        {/* Search */}
        <input
          className="auc-search-input"
          placeholder="Search use cases…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '1 1 180px', height: H, minWidth: 0, boxSizing: 'border-box' }}
        />

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--theme-border-color, #e5e7eb)', flexShrink: 0 }} />

        {/* Industry */}
        <select
          className="auc-filter-select"
          value={filterIndustry}
          onChange={e => setFilterIndustry(e.target.value as IndustryValue)}
          style={{ height: H, flex: '0 0 160px', boxSizing: 'border-box' }}
        >
          {INDUSTRIES.map(i => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>

        {/* Workshop */}
        <select
          className="auc-filter-select"
          value={filterWorkshop}
          onChange={e => setFilterWorkshop(e.target.value)}
          style={{ height: H, flex: '0 0 160px', boxSizing: 'border-box' }}
        >
          <option value="All">All Workshops</option>
          {allWorkshops.map(([, title]) => <option key={title} value={title}>{title}</option>)}
        </select>

        {/* AI Technique */}
        <select
          className="auc-filter-select"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{ height: H, flex: '0 0 140px', boxSizing: 'border-box' }}
        >
          <option value="All">All Techniques</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Status */}
        <select
          className="auc-filter-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ height: H, flex: '0 0 130px', boxSizing: 'border-box' }}
        >
          <option value="All">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        {/* Source */}
        <select
          className="auc-filter-select"
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          style={{ height: H, flex: '0 0 120px', boxSizing: 'border-box' }}
        >
          <option value="All">All Sources</option>
          <option value="Participant">Participant</option>
          <option value="Facilitator">Facilitator</option>
        </select>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--theme-border-color, #e5e7eb)', flexShrink: 0 }} />

        {/* Count */}
        <span style={{ fontSize: 12, color: 'var(--theme-text-muted, #9ca3af)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {filtered.length} / {useCases.length}
        </span>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            title="Clear all filters"
            style={{
              flexShrink: 0,
              height: H,
              width: H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: '1px solid #f59e0b',
              borderRadius: 8,
              color: '#f59e0b',
              fontSize: 16,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── 4. Card Grid ── */}
      <div style={{
        background: 'var(--theme-card-bg, white)',
        border: '1px solid var(--theme-border-color, #e5e7eb)',
        borderRadius: 16,
        padding: 24,
        minHeight: 400,
      }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--theme-text-muted, #9ca3af)', marginTop: 80, fontSize: 14 }}>
            No use cases match the current filters.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(uc => {
              const wss = uc.workshops ?? (uc.workshop ? [uc.workshop] : []);
              return (
                <div key={uc.id} className="auc-card" onClick={() => setSelectedUC(uc)}>

                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--theme-text-muted, #9ca3af)', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                      {uc.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(uc.status), flexShrink: 0 }} title={uc.status} />
                  </div>

                  {/* Title */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--theme-text-primary, #111827)', marginBottom: 6, lineHeight: 1.35 }}>
                    {uc.title}
                  </div>

                  {/* Description */}
                  <div style={{
                    fontSize: 12, color: 'var(--theme-text-muted, #6b7280)', lineHeight: 1.6, marginBottom: 12,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {uc.description}
                  </div>

                  {/* KPI */}
                  {uc.kpi && (
                    <div className="auc-inset" style={{ marginBottom: 12 }}>
                      <div className="auc-label" style={{ marginBottom: 2 }}>Key Metric</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1' }}>{uc.kpi}</div>
                    </div>
                  )}

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {wss.slice(0, 2).map(ws => (
                      <span key={ws.id} className="auc-tag" style={{ background: '#eff6ff', color: '#3b82f6' }}>{ws.title}</span>
                    ))}
                    {uc.category && (
                      <span className="auc-tag" style={{ background: '#f3f4f6', color: '#6b7280' }}>{uc.category}</span>
                    )}
                    {uc.added_by_facilitator && (
                      <span className="auc-tag" style={{ background: '#fef3c7', color: '#d97706' }}>Facilitator</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    <span className="auc-tag" style={{ background: 'transparent', border: `1px solid ${statusColor(uc.status)}`, color: statusColor(uc.status) }}>
                      {uc.status.charAt(0) + uc.status.slice(1).toLowerCase()}
                    </span>

                    {uc.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="auc-action-btn"
                          style={{ borderColor: '#22c55e', color: '#22c55e' }}
                          onClick={() => handleQuickStatus(uc.id, 'APPROVED')}
                        >
                          Approve
                        </button>
                        <button
                          className="auc-action-btn"
                          style={{ borderColor: '#ef4444', color: '#ef4444' }}
                          onClick={() => handleQuickStatus(uc.id, 'REJECTED')}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedUC && (
        <div className="auc-modal-overlay" onClick={() => setSelectedUC(null)}>
          <div className="auc-modal" onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div className="auc-label" style={{ marginBottom: 5 }}>
                  {selectedUC.id.slice(0, 8).toUpperCase()}
                  {selectedUC.category ? ` · ${selectedUC.category}` : ''}
                  {selectedUC.added_by_facilitator ? ' · Facilitator' : ' · Participant'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25, color: 'var(--theme-text-primary, #111827)' }}>
                  {selectedUC.title}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor(selectedUC.status) }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: statusColor(selectedUC.status) }}>
                  {selectedUC.status.charAt(0) + selectedUC.status.slice(1).toLowerCase()}
                </span>
                <button
                  style={{ marginLeft: 12, background: 'none', border: 'none', color: 'var(--theme-text-muted, #9ca3af)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
                  onClick={() => setSelectedUC(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--theme-bg-secondary, #f9fafb)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, borderLeft: '3px solid #f59e0b' }}>
              <div className="auc-label" style={{ marginBottom: 4 }}>Business Problem</div>
              <div style={{ fontSize: 14, color: 'var(--theme-text-secondary, #374151)', lineHeight: 1.6 }}>{selectedUC.description}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {([
                ['Proposed Solution', selectedUC.proposed_solution],
                ['Key Metric (KPI)',  selectedUC.kpi],
                ['Target User',       selectedUC.target_user],
                ['AI Technique',      selectedUC.category],
                ['Submitted',         formatDate(selectedUC.created_at)],
                ['Source',            selectedUC.added_by_facilitator ? 'Facilitator' : 'Participant'],
              ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="auc-inset-deep">
                  <div className="auc-label" style={{ marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--theme-text-secondary, #374151)', lineHeight: 1.5 }}>{value}</div>
                </div>
              ))}
            </div>

            {(() => {
              const wss = selectedUC.workshops ?? (selectedUC.workshop ? [selectedUC.workshop] : []);
              return wss.length > 0 ? (
                <div style={{ marginBottom: 20 }}>
                  <div className="auc-label" style={{ marginBottom: 8 }}>Workshops</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {wss.map(ws => (
                      <span key={ws.id} className="auc-tag" style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 10px', fontSize: 12 }}>{ws.title}</span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid var(--theme-border-color, #e5e7eb)' }}>
              {selectedUC.status === 'APPROVED' && (
                <button
                  className="auc-action-btn"
                  style={{ borderColor: '#ef4444', color: '#ef4444' }}
                  onClick={() => handleQuickStatus(selectedUC.id, 'REJECTED')}
                >
                  Revoke Approval
                </button>
              )}
              {selectedUC.status === 'REJECTED' && (
                <button
                  className="auc-action-btn"
                  style={{ borderColor: '#22c55e', color: '#22c55e' }}
                  onClick={() => handleQuickStatus(selectedUC.id, 'APPROVED')}
                >
                  Re-Approve
                </button>
              )}
              {selectedUC.status === 'PENDING' && (
                <>
                  <button
                    className="auc-action-btn"
                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                    onClick={() => handleQuickStatus(selectedUC.id, 'REJECTED')}
                  >
                    Reject
                  </button>
                  <button
                    className="auc-action-btn"
                    style={{ borderColor: '#22c55e', color: '#22c55e' }}
                    onClick={() => handleQuickStatus(selectedUC.id, 'APPROVED')}
                  >
                    Approve
                  </button>
                  <button
                    className="auc-action-btn"
                    style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                    onClick={() => { setReviewingUC(selectedUC); setSelectedUC(null); }}
                  >
                    Full Review
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {reviewingUC && token && (
        <UseCaseApprovalModal
          useCase={reviewingUC}
          allUseCases={useCases}
          token={token}
          onClose={() => setReviewingUC(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      <AdminImportUseCasesModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={fetchAllUseCases}
      />
    </AdminLayout>
  );
}
