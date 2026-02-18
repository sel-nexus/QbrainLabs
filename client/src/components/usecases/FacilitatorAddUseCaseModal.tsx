import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../lib/config';

const API_BASE = API_BASE_URL;

interface Workshop {
  id: string;
  title: string;
  status: string;
}

interface FacilitatorAddUseCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  proposed_solution: '',
  kpi: '',
  target_user: '',
  category: 'Generative AI',
};

const CATEGORY_OPTIONS = [
  'Generative AI',
  'Predictive ML',
  'Computer Vision',
  'Robotics',
  'Other',
];

export function FacilitatorAddUseCaseModal({
  isOpen,
  onClose,
  onSuccess,
}: FacilitatorAddUseCaseModalProps) {
  const { token } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopIds, setSelectedWorkshopIds] = useState<Set<string>>(new Set());
  const [loadingWorkshops, setLoadingWorkshops] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (isOpen) {
      fetchWorkshops();
      setFormData({ ...EMPTY_FORM });
      setSelectedWorkshopIds(new Set());
    }
  }, [isOpen]);

  const fetchWorkshops = async () => {
    if (!token) return;
    setLoadingWorkshops(true);
    try {
      const res = await fetch(`${API_BASE}/api/facilitator/workshops`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load workshops');
      const data: Workshop[] = await res.json();
      setWorkshops(data);
    } catch {
      toast.error('Could not load workshops');
    } finally {
      setLoadingWorkshops(false);
    }
  };

  const toggleWorkshop = (id: string) => {
    setSelectedWorkshopIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedWorkshopIds.size === 0) {
      toast.error('Please select at least one workshop');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and Problem Statement are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/usecases/facilitator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          workshop_ids: Array.from(selectedWorkshopIds),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit use case');
      }

      const result = await res.json();
      const workshopCount = result.count ?? selectedWorkshopIds.size;
      toast.success(
        `Use case added to ${workshopCount} workshop${workshopCount !== 1 ? 's' : ''}`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit use case');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="theme-bg-secondary theme-border border rounded-2xl w-full max-w-2xl shadow-xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b theme-border sticky top-0 theme-bg-secondary z-10">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-violet" />
            <h2 className="text-xl font-bold theme-text-primary">Add Use Case</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 theme-text-secondary hover:theme-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-5">
          {/* Workshop multi-select */}
          <div className="space-y-2">
            <label className="text-sm font-medium theme-text-secondary">
              Attach to Workshops{' '}
              <span className="text-brand-violet">*</span>
            </label>
            {loadingWorkshops ? (
              <div className="flex items-center gap-2 py-3 contrast-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading workshops…
              </div>
            ) : workshops.length === 0 ? (
              <p className="text-sm contrast-muted py-2">No workshops available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {workshops.map((ws) => {
                  const selected = selectedWorkshopIds.has(ws.id);
                  return (
                    <button
                      type="button"
                      key={ws.id}
                      onClick={() => toggleWorkshop(ws.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                        selected
                          ? 'border-brand-violet bg-brand-violet/10 theme-text-primary'
                          : 'theme-border theme-bg-tertiary theme-text-secondary hover:border-brand-violet/50'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          selected
                            ? 'bg-brand-violet border-brand-violet'
                            : 'theme-border'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className="truncate">{ws.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedWorkshopIds.size > 0 && (
              <p className="text-xs text-brand-violet">
                {selectedWorkshopIds.size} workshop{selectedWorkshopIds.size !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm theme-text-secondary pl-1">
              Title <span className="text-brand-violet">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Automated Customer Support"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors"
            />
          </div>

          {/* Target User + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm theme-text-secondary pl-1">
                Target User <span className="text-brand-violet">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Support Agents"
                value={formData.target_user}
                onChange={(e) => handleChange('target_user', e.target.value)}
                className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm theme-text-secondary pl-1">AI Technique</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary focus:outline-none focus:border-brand-violet transition-colors"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Problem Statement */}
          <div className="space-y-1.5">
            <label className="text-sm theme-text-secondary pl-1">
              Problem Statement <span className="text-brand-violet">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe the pain point…"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors resize-none"
            />
          </div>

          {/* Proposed Solution */}
          <div className="space-y-1.5">
            <label className="text-sm theme-text-secondary pl-1">Proposed Solution</label>
            <textarea
              rows={3}
              placeholder="How does AI solve it?"
              value={formData.proposed_solution}
              onChange={(e) => handleChange('proposed_solution', e.target.value)}
              className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors resize-none"
            />
          </div>

          {/* KPI */}
          <div className="space-y-1.5">
            <label className="text-sm theme-text-secondary pl-1">
              Expected Benefit (KPI) <span className="text-brand-violet">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Reduce handle time by 20%"
              value={formData.kpi}
              onChange={(e) => handleChange('kpi', e.target.value)}
              className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border theme-border rounded-lg theme-text-secondary hover:theme-text-primary transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedWorkshopIds.size === 0}
              className="flex-1 px-4 py-2.5 bg-brand-violet text-white rounded-lg hover:bg-brand-violet/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to {selectedWorkshopIds.size || ''} Workshop{selectedWorkshopIds.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
