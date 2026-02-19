import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';
import { UseCaseApprovalModal } from '../components/usecases/UseCaseApprovalModal';
import { FacilitatorAddUseCaseModal } from '../components/usecases/FacilitatorAddUseCaseModal';

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
  shortlisted?: boolean;
}

// ─── Priority Dimensions ──────────────────────────────────────────────────────

const PRIORITY_DIMENSIONS = [
  { id: 'strategic_alignment', label: 'Strategic Alignment', weight: 30 },
  { id: 'time_to_value',       label: 'Time to Value',       weight: 25 },
  { id: 'data_readiness',      label: 'Data Readiness',      weight: 20 },
  { id: 'impl_ease',           label: 'Implementation Ease', weight: 15 },
  { id: 'competitive',         label: 'Competitive Pressure', weight: 10 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Status colours are universal semantic colours — same in light & dark
const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#22c55e',
  PENDING:  '#f59e0b',
  REJECTED: '#ef4444',
};
const statusColor = (s: string) => STATUS_COLORS[s] ?? '#64748b';

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AllUseCases() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token } = useAuth();

  const [useCases, setUseCases]         = useState<UseCase[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterWorkshop, setFilterWorkshop] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus]     = useState('All');

  const [view, setView]               = useState<'browse' | 'shortlist' | 'prioritize'>('browse');
  const [selectedUC, setSelectedUC]   = useState<UseCase | null>(null);
  const [reviewingUC, setReviewingUC] = useState<UseCase | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [weights, setWeights] = useState(
    PRIORITY_DIMENSIONS.reduce<Record<string, number>>((a, d) => ({ ...a, [d.id]: d.weight }), {})
  );
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});

  // ── Fetch ────────────────────────────────────────────────────────────────────

  useEffect(() => { fetchAllUseCases(); }, [token]);

  const fetchAllUseCases = async () => {
    if (!token) { navigate('/facilitator-login'); return; }
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api/usecases/all/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) { navigate('/facilitator-login'); return; }
        throw new Error('Failed to fetch use cases');
      }
      const data: UseCase[] = await res.json();
      setUseCases(data.map(uc => ({ ...uc, shortlisted: false })));
    } catch (e) {
      toast.error(t('common.error'));
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

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
      if (filterCategory !== 'All' && uc.category !== filterCategory) return false;
      if (filterStatus !== 'All' && uc.status !== filterStatus) return false;
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
  }, [useCases, filterWorkshop, filterCategory, filterStatus, searchQuery]);

  const shortlisted = useMemo(() => useCases.filter(uc => uc.shortlisted), [useCases]);

  const prioritized = useMemo(() => {
    return shortlisted.map(uc => {
      const ucScores = scores[uc.id] ?? {};
      const total = Object.entries(weights).reduce((sum, [dim, w]) => {
        return sum + ((ucScores[dim] ?? 3) / 5) * w;
      }, 0);
      return { ...uc, priorityScore: Math.round(total) };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [shortlisted, weights, scores]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const toggleShortlist = (id: string) =>
    setUseCases(prev => prev.map(uc => uc.id === id ? { ...uc, shortlisted: !uc.shortlisted } : uc));

  const handleStatusChange = (id: string, newStatus: string) =>
    setUseCases(prev => prev.map(uc => uc.id === id ? { ...uc, status: newStatus } : uc));

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center theme-bg-primary" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="animate-spin rounded-full border-[3px] border-brand-violet/20 border-t-brand-violet" style={{ width: 44, height: 44 }} />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/*
        All colours reference CSS custom properties from index.css so they
        respond correctly to light / dark / contrast theme switches.
        Status dot colours (#22c55e / #f59e0b / #ef4444) are universal
        semantic colours and intentionally kept as fixed hex values.
      */}
      <style>{`
        .uc-portal * { box-sizing: border-box; }
        .uc-portal ::-webkit-scrollbar { width: 4px; }
        .uc-portal ::-webkit-scrollbar-track { background: var(--theme-bg-primary); }
        .uc-portal ::-webkit-scrollbar-thumb { background: var(--theme-border-color); border-radius: 4px; }

        .uc-card {
          transition: all 0.2s ease;
          cursor: pointer;
          background: var(--theme-card-bg);
          border: 1px solid var(--theme-border-color);
          border-radius: 12px;
          padding: 18px 20px;
        }
        .uc-card:hover {
          border-color: var(--theme-accent) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px color-mix(in srgb, var(--theme-accent) 15%, transparent);
        }

        .uc-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.03em;
        }
        .uc-tag-workshop {
          background: var(--theme-info-bg);
          color: var(--theme-info-text);
        }
        .uc-tag-category {
          background: var(--theme-bg-tertiary);
          color: var(--theme-text-secondary);
        }
        .uc-tag-facilitator {
          background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
          color: var(--theme-accent);
        }

        .uc-nav-btn {
          background: none;
          border: none;
          color: var(--theme-text-muted);
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 6px;
          transition: all 0.15s;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .uc-nav-btn.active {
          color: var(--theme-text-primary);
          background: var(--theme-bg-tertiary);
        }
        .uc-nav-btn:hover { color: var(--theme-text-primary); }

        .uc-filter-select {
          background: var(--theme-input-bg);
          border: 1px solid var(--theme-border-color);
          color: var(--theme-text-secondary);
          font-family: inherit;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 6px;
          outline: none;
          cursor: pointer;
          width: 100%;
        }
        .uc-filter-select:focus { border-color: var(--theme-accent); }

        .uc-status-btn {
          background: none;
          border: 1px solid;
          border-radius: 5px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 10px;
          transition: all 0.15s;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .uc-search {
          background: var(--theme-input-bg);
          border: 1px solid var(--theme-border-color);
          color: var(--theme-text-primary);
          font-family: inherit;
          font-size: 13px;
          padding: 8px 14px;
          border-radius: 8px;
          outline: none;
          width: 100%;
        }
        .uc-search::placeholder { color: var(--theme-placeholder); }
        .uc-search:focus { border-color: var(--theme-accent); }

        .uc-range {
          -webkit-appearance: none;
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: var(--theme-border-color);
          outline: none;
        }
        .uc-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--theme-accent);
          cursor: pointer;
        }

        .uc-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        .uc-modal {
          background: var(--theme-card-bg);
          border: 1px solid var(--theme-border-color);
          border-radius: 16px;
          width: 90%;
          max-width: 720px;
          max-height: 85vh;
          overflow-y: auto;
          padding: 36px;
        }

        .uc-score-input {
          background: var(--theme-input-bg);
          border: 1px solid var(--theme-border-color);
          color: var(--theme-text-primary);
          font-family: inherit;
          font-size: 13px;
          padding: 6px 10px;
          border-radius: 6px;
          width: 60px;
          text-align: center;
          outline: none;
        }

        .uc-priority-bar {
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(90deg, var(--theme-accent), var(--theme-accent-hover));
          transition: width 0.5s ease;
        }

        /* KPI / inset section boxes */
        .uc-inset {
          background: var(--theme-bg-secondary);
          border-radius: 8px;
          padding: 8px 12px;
        }
        .uc-inset-deep {
          background: var(--theme-bg-primary);
          border-radius: 8px;
          padding: 10px 13px;
        }

        /* Section divider labels */
        .uc-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--theme-text-muted);
        }
      `}</style>

      <div
        className="uc-portal"
        style={{
          background: 'var(--theme-bg-primary)',
          color: 'var(--theme-text-primary)',
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
        }}
      >

        {/* ── Inner nav bar ── */}
        <div style={{
          borderBottom: '1px solid var(--theme-border-color)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          flexShrink: 0,
          background: 'var(--theme-bg-secondary)',
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              ['browse',    `Browse (${filtered.length})`],
              ['shortlist', `Shortlist (${shortlisted.length})`],
              ['prioritize','Prioritize'],
            ] as const).map(([v, label]) => (
              <button key={v} className={`uc-nav-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-violet text-white text-sm font-semibold rounded-lg hover:bg-brand-violet/90 transition-colors"
          >
            <Plus size={14} /> Add Use Case
          </button>
        </div>

        {/* ══════════════════ BROWSE VIEW ══════════════════ */}
        {view === 'browse' && (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* Sidebar */}
            <div style={{
              width: 220,
              borderRight: '1px solid var(--theme-border-color)',
              padding: '20px 16px',
              flexShrink: 0,
              overflowY: 'auto',
              background: 'var(--theme-bg-secondary)',
            }}>
              <div className="uc-label" style={{ marginBottom: 14 }}>Filters</div>

              <input
                className="uc-search"
                placeholder="Search use cases…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ marginBottom: 18 }}
              />

              {[
                { label: 'Workshop',     value: filterWorkshop, set: setFilterWorkshop, opts: allWorkshops.map(([, t]) => t) },
                { label: 'AI Technique', value: filterCategory, set: setFilterCategory, opts: allCategories },
              ].map(({ label, value, set, opts }) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div className="uc-label" style={{ marginBottom: 6 }}>{label}</div>
                  <select className="uc-filter-select" value={value} onChange={e => set(e.target.value)}>
                    <option>All</option>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}

              <div style={{ marginBottom: 16 }}>
                <div className="uc-label" style={{ marginBottom: 6 }}>Status</div>
                <select className="uc-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="All">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--theme-border-color)' }}>
                <div className="uc-label" style={{ marginBottom: 10 }}>Status Legend</div>
                {[['APPROVED', '#22c55e'], ['PENDING', '#f59e0b'], ['REJECTED', '#ef4444']].map(([s, c]) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--theme-bg-primary)' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--theme-text-muted)', marginTop: 80, fontSize: 14 }}>
                  No use cases match the current filters.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {filtered.map(uc => {
                    const wss = uc.workshops ?? (uc.workshop ? [uc.workshop] : []);
                    return (
                      <div key={uc.id} className="uc-card" onClick={() => setSelectedUC(uc)}>

                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: 'var(--theme-text-muted)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono, monospace)' }}>
                            {uc.id.slice(0, 8).toUpperCase()}
                          </div>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(uc.status), flexShrink: 0 }} title={uc.status} />
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--theme-text-primary)', marginBottom: 6, lineHeight: 1.35, fontFamily: 'var(--font-heading, sans-serif)' }}>
                          {uc.title}
                        </div>

                        {/* Description */}
                        <div style={{
                          fontSize: 12, color: 'var(--theme-text-muted)', lineHeight: 1.6, marginBottom: 12,
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {uc.description}
                        </div>

                        {/* KPI metric box */}
                        {uc.kpi && (
                          <div className="uc-inset" style={{ marginBottom: 12 }}>
                            <div className="uc-label" style={{ marginBottom: 2 }}>Key Metric</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-info-text)' }}>{uc.kpi}</div>
                          </div>
                        )}

                        {/* Tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                          {wss.slice(0, 2).map(ws => (
                            <span key={ws.id} className="uc-tag uc-tag-workshop">{ws.title}</span>
                          ))}
                          {uc.category && (
                            <span className="uc-tag uc-tag-category">{uc.category}</span>
                          )}
                          {uc.added_by_facilitator && (
                            <span className="uc-tag uc-tag-facilitator">Facilitator</span>
                          )}
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="uc-tag" style={{ background: 'transparent', border: `1px solid ${statusColor(uc.status)}`, color: statusColor(uc.status) }}>
                            {uc.status.charAt(0) + uc.status.slice(1).toLowerCase()}
                          </span>

                          <div onClick={e => e.stopPropagation()}>
                            <button
                              className="uc-status-btn"
                              style={{
                                borderColor: uc.shortlisted ? '#22c55e' : 'var(--theme-border-color)',
                                color:       uc.shortlisted ? '#22c55e' : 'var(--theme-text-muted)',
                                background:  uc.shortlisted ? 'var(--theme-success-bg)' : 'transparent',
                              }}
                              onClick={() => toggleShortlist(uc.id)}
                            >
                              {uc.shortlisted ? '✓ Listed' : '+ List'}
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

        {/* ══════════════════ SHORTLIST VIEW ══════════════════ */}
        {view === 'shortlist' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', background: 'var(--theme-bg-primary)' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, fontFamily: 'var(--font-heading, sans-serif)', color: 'var(--theme-text-primary)' }}>
                  Shortlisted Use Cases
                </div>
                <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>
                  {shortlisted.length} use cases selected for deeper evaluation
                </div>
              </div>

              {shortlisted.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--theme-text-muted)', marginTop: 60, fontSize: 14 }}>
                  No use cases shortlisted yet. Go to Browse and click "+ List" to add them here.
                </div>
              ) : (
                <>
                  {shortlisted.map((uc, i) => {
                    const wss = uc.workshops ?? (uc.workshop ? [uc.workshop] : []);
                    return (
                      <div key={uc.id} style={{
                        background: 'var(--theme-card-bg)',
                        border: '1px solid var(--theme-border-color)',
                        borderRadius: 12,
                        padding: '18px 22px',
                        marginBottom: 10,
                        display: 'flex',
                        gap: 18,
                        alignItems: 'flex-start',
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--theme-border-color)', minWidth: 36, fontFamily: 'var(--font-heading, sans-serif)' }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3, color: 'var(--theme-text-primary)', fontFamily: 'var(--font-heading, sans-serif)' }}>
                            {uc.title}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                            {uc.description}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
                            {uc.kpi && <span style={{ color: 'var(--theme-info-text)' }}>{uc.kpi}</span>}
                            {wss[0] && <><span style={{ color: 'var(--theme-border-color)' }}>•</span><span style={{ color: 'var(--theme-text-muted)' }}>{wss[0].title}</span></>}
                            {uc.category && <><span style={{ color: 'var(--theme-border-color)' }}>•</span><span style={{ color: 'var(--theme-text-secondary)' }}>{uc.category}</span></>}
                          </div>
                        </div>
                        <button
                          className="uc-status-btn"
                          style={{ borderColor: 'var(--theme-danger-border)', color: 'var(--theme-danger-text)' }}
                          onClick={() => toggleShortlist(uc.id)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}

                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="px-6 py-2.5 bg-brand-violet text-white text-sm font-semibold rounded-lg hover:bg-brand-violet/90 transition-colors"
                      onClick={() => setView('prioritize')}
                    >
                      → Prioritize These
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════ PRIORITIZE VIEW ══════════════════ */}
        {view === 'prioritize' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', background: 'var(--theme-bg-primary)' }}>
            <div style={{ maxWidth: 920, margin: '0 auto' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, fontFamily: 'var(--font-heading, sans-serif)', color: 'var(--theme-text-primary)' }}>
                  Prioritization Engine
                </div>
                <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>
                  Adjust dimension weights, score each use case, get a ranked output
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                {/* Weight sliders */}
                <div style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border-color)', borderRadius: 12, padding: 24 }}>
                  <div className="uc-label" style={{ marginBottom: 20 }}>Dimension Weights</div>
                  {PRIORITY_DIMENSIONS.map(dim => (
                    <div key={dim.id} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--theme-text-secondary)' }}>{dim.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-accent)' }}>{weights[dim.id]}%</span>
                      </div>
                      <input
                        type="range" className="uc-range" min={0} max={60} step={5}
                        value={weights[dim.id]}
                        onChange={e => setWeights(w => ({ ...w, [dim.id]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--theme-text-muted)', marginTop: 8 }}>
                    Total weight: {Object.values(weights).reduce((a, b) => a + b, 0)}%
                  </div>
                </div>

                {/* Score inputs */}
                <div style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border-color)', borderRadius: 12, padding: 24, overflowY: 'auto', maxHeight: 480 }}>
                  <div className="uc-label" style={{ marginBottom: 20 }}>Score Use Cases (1–5)</div>
                  {shortlisted.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>Shortlist use cases first.</div>
                  )}
                  {shortlisted.map(uc => (
                    <div key={uc.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--theme-border-color)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--theme-text-primary)' }}>{uc.title}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {PRIORITY_DIMENSIONS.map(dim => (
                          <div key={dim.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--theme-text-muted)', flex: 1 }}>{dim.label}</span>
                            <input
                              type="number" className="uc-score-input" min={1} max={5}
                              value={(scores[uc.id] ?? {})[dim.id] ?? 3}
                              onChange={e => setScores(s => ({ ...s, [uc.id]: { ...(s[uc.id] ?? {}), [dim.id]: Number(e.target.value) } }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranked output */}
              {prioritized.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div className="uc-label" style={{ marginBottom: 16 }}>Ranked Output</div>
                  {prioritized.map((uc, i) => (
                    <div key={uc.id} style={{
                      background: 'var(--theme-card-bg)',
                      border: `1px solid ${i === 0 ? 'var(--theme-accent)' : 'var(--theme-border-color)'}`,
                      borderRadius: 12,
                      padding: '14px 18px',
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                    }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: i === 0 ? 'var(--theme-accent)' : 'var(--theme-border-color)', minWidth: 48, fontFamily: 'var(--font-heading, sans-serif)' }}>
                        #{i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--theme-text-primary)', fontFamily: 'var(--font-heading, sans-serif)' }}>
                          {uc.title}
                        </div>
                        <div style={{ width: '100%', background: 'var(--theme-bg-tertiary)', borderRadius: 3, height: 6 }}>
                          <div className="uc-priority-bar" style={{ width: `${uc.priorityScore}%` }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 60 }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--theme-info-text)' }}>{uc.priorityScore}</div>
                        <div style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>/ 100</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════ DETAIL MODAL ══════════════════ */}
      {selectedUC && (
        <div className="uc-modal-overlay" onClick={() => setSelectedUC(null)}>
          <div className="uc-modal" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div className="uc-label" style={{ marginBottom: 5 }}>
                  {selectedUC.id.slice(0, 8).toUpperCase()}
                  {selectedUC.category ? ` · ${selectedUC.category}` : ''}
                  {selectedUC.added_by_facilitator ? ' · Facilitator' : ''}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25, color: 'var(--theme-text-primary)', fontFamily: 'var(--font-heading, sans-serif)' }}>
                  {selectedUC.title}
                </div>
              </div>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--theme-text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
                onClick={() => setSelectedUC(null)}
              >
                ✕
              </button>
            </div>

            {/* Problem statement */}
            <div style={{ background: 'var(--theme-bg-primary)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, borderLeft: '3px solid var(--theme-accent)' }}>
              <div className="uc-label" style={{ marginBottom: 4 }}>Business Problem</div>
              <div style={{ fontSize: 14, color: 'var(--theme-text-secondary)', lineHeight: 1.6 }}>{selectedUC.description}</div>
            </div>

            {/* Grid of fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {([
                ['Proposed Solution', selectedUC.proposed_solution],
                ['Key Metric (KPI)',  selectedUC.kpi],
                ['Target User',       selectedUC.target_user],
                ['AI Technique',      selectedUC.category],
                ['Status',            selectedUC.status],
                ['Submitted',         formatDate(selectedUC.created_at)],
              ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="uc-inset-deep">
                  <div className="uc-label" style={{ marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--theme-text-secondary)', lineHeight: 1.5 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Workshops */}
            {(() => {
              const wss = selectedUC.workshops ?? (selectedUC.workshop ? [selectedUC.workshop] : []);
              return wss.length > 0 ? (
                <div style={{ marginBottom: 20 }}>
                  <div className="uc-label" style={{ marginBottom: 8 }}>Workshops</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {wss.map(ws => (
                      <span key={ws.id} className="uc-tag uc-tag-workshop" style={{ padding: '4px 10px', fontSize: 12 }}>{ws.title}</span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid var(--theme-border-color)' }}>
              <button
                className="uc-status-btn"
                style={{
                  borderColor: selectedUC.shortlisted ? '#22c55e' : 'var(--theme-border-color)',
                  color:       selectedUC.shortlisted ? '#22c55e' : 'var(--theme-text-muted)',
                  background:  selectedUC.shortlisted ? 'var(--theme-success-bg)' : 'transparent',
                }}
                onClick={() => { toggleShortlist(selectedUC.id); setSelectedUC(null); }}
              >
                {selectedUC.shortlisted ? '✓ Remove from Shortlist' : '+ Add to Shortlist'}
              </button>
              {selectedUC.status === 'PENDING' && token && (
                <button
                  className="uc-status-btn"
                  style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }}
                  onClick={() => { setReviewingUC(selectedUC); setSelectedUC(null); }}
                >
                  Review / Approve
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Existing modals ── */}
      <FacilitatorAddUseCaseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchAllUseCases}
      />

      {reviewingUC && token && (
        <UseCaseApprovalModal
          useCase={reviewingUC}
          allUseCases={useCases}
          token={token}
          onClose={() => setReviewingUC(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
