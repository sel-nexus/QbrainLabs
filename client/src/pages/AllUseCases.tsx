import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  FileText, Calendar, Tag, ArrowRight, Search,
  ClipboardCheck, Plus, Building2, ChevronDown, Check,
} from 'lucide-react';
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
}

// ─── Custom dropdown (replaces native <select> to avoid global mousedown conflicts) ──

interface DropdownOption { value: string; label: string }

function FilterDropdown({
  icon,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click – use mousedown so it fires before focus events
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <span className="text-gray-400 shrink-0">{icon}</span>
        <span className="flex-1 text-left truncate">{selected.label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg bg-white dark:bg-gray-700 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
              <span className={opt.value === value ? '' : 'ml-5'}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AllUseCases() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token } = useAuth();
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [filteredUseCases, setFilteredUseCases] = useState<UseCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [reviewingUseCase, setReviewingUseCase] = useState<UseCase | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchAllUseCases();
  }, [token]);

  useEffect(() => {
    filterUseCases();
  }, [useCases, searchTerm, selectedWorkshop, selectedStatus]);

  const fetchAllUseCases = async () => {
    if (!token) {
      navigate('/facilitator-login');
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/usecases/all/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401) { navigate('/facilitator-login'); return; }
        throw new Error('Failed to fetch use cases');
      }
      const data = await response.json();
      setUseCases(data);
      setFilteredUseCases(data);
    } catch (error) {
      toast.error(t('common.error'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterUseCases = () => {
    let filtered = [...useCases];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (uc) =>
          uc.title.toLowerCase().includes(term) ||
          uc.description.toLowerCase().includes(term) ||
          (uc.workshops ?? []).some((ws) => ws.title.toLowerCase().includes(term))
      );
    }
    if (selectedWorkshop !== 'all') {
      filtered = filtered.filter((uc) =>
        (uc.workshops ?? []).some((ws) => ws.id === selectedWorkshop)
      );
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((uc) => uc.status === selectedStatus);
    }
    setFilteredUseCases(filtered);
  };

  const getUniqueWorkshops = () => {
    const map = new Map<string, WorkshopInfo>();
    useCases.forEach((uc) => {
      (uc.workshops ?? (uc.workshop ? [uc.workshop] : [])).forEach((ws) => {
        if (!map.has(ws.id)) map.set(ws.id, ws);
      });
    });
    return Array.from(map.values());
  };

  const workshopOptions: DropdownOption[] = [
    { value: 'all', label: t('common.allWorkshops', 'All Workshops') },
    ...getUniqueWorkshops().map((ws) => ({ value: ws.id, label: ws.title })),
  ];

  const statusOptions: DropdownOption[] = [
    { value: 'all', label: t('common.allStatuses', 'All Statuses') },
    { value: 'PENDING', label: t('status.pending', 'Pending') },
    { value: 'APPROVED', label: t('status.approved', 'Approved') },
    { value: 'REJECTED', label: t('status.rejected', 'Rejected') },
  ];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'PENDING':  return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:         return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setUseCases((prev) => prev.map((uc) => (uc.id === id ? { ...uc, status: newStatus } : uc)));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Page header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t('useCases.allUseCases', 'All Use Cases')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t('useCases.browseAll', 'Browse all use cases across workshops')}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-violet text-white rounded-lg hover:bg-brand-violet/90 transition-colors text-sm font-medium shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Use Case
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search – stays as a native input (inputs don't have this issue) */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('common.search', 'Search...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>

              {/* Workshop filter – custom dropdown */}
              <FilterDropdown
                icon={<Tag className="w-4 h-4" />}
                value={selectedWorkshop}
                onChange={setSelectedWorkshop}
                options={workshopOptions}
              />

              {/* Status filter – custom dropdown */}
              <FilterDropdown
                icon={<Tag className="w-4 h-4" />}
                value={selectedStatus}
                onChange={setSelectedStatus}
                options={statusOptions}
              />
            </div>
          </div>

          {/* Count */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('common.showing', 'Showing')}{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{filteredUseCases.length}</span>
              {' '}{t('common.of', 'of')}{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{useCases.length}</span>
              {' '}{t('useCases.useCases', 'use cases')}
            </div>
          </div>

          {/* Use case list */}
          {filteredUseCases.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('useCases.noUseCases', 'No use cases found')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || selectedWorkshop !== 'all' || selectedStatus !== 'all'
                  ? t('useCases.tryDifferentFilters', 'Try adjusting your filters')
                  : t('useCases.noUseCasesYet', 'No use cases have been created yet')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUseCases.map((useCase) => {
                const workshops = useCase.workshops ?? (useCase.workshop ? [useCase.workshop] : []);
                return (
                  <div
                    key={useCase.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setReviewingUseCase(useCase)}
                  >
                    <div className="p-6">
                      {/* Title + badges */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {useCase.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            {useCase.description}
                          </p>
                        </div>
                        <div className="ml-4 flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeClass(useCase.status)}`}>
                            {useCase.status}
                          </span>
                          {useCase.added_by_facilitator && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 whitespace-nowrap">
                              Facilitator
                            </span>
                          )}
                          {useCase.status === 'PENDING' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 whitespace-nowrap flex items-center gap-1">
                              <ClipboardCheck className="w-3 h-3" />
                              Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* KPI / target / category */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {useCase.kpi && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('useCases.kpi', 'KPI')}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{useCase.kpi}</p>
                          </div>
                        )}
                        {useCase.target_user && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('useCases.targetUser', 'Target User')}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{useCase.target_user}</p>
                          </div>
                        )}
                        {useCase.category && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('useCases.category', 'Category')}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{useCase.category}</p>
                          </div>
                        )}
                      </div>

                      {/* Footer: attached workshops + date + view link */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                          {workshops.length === 1 ? (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {workshops[0].title}
                            </span>
                          ) : (
                            workshops.map((ws) => (
                              <span
                                key={ws.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-violet/10 text-brand-violet dark:bg-brand-violet/20 border border-brand-violet/20"
                              >
                                {ws.title}
                              </span>
                            ))
                          )}
                          {useCase.created_at && (
                            <span className="flex items-center text-sm text-gray-500 dark:text-gray-400 ml-2">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(useCase.created_at)}
                            </span>
                          )}
                        </div>

                        {workshops.length === 1 && (
                          <button
                            className="flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
                            onClick={(e) => { e.stopPropagation(); navigate(`/workshop/${workshops[0].id}`); }}
                          >
                            {t('common.viewWorkshop', 'View Workshop')}
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <FacilitatorAddUseCaseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchAllUseCases}
      />

      {reviewingUseCase && token && (
        <UseCaseApprovalModal
          useCase={reviewingUseCase}
          allUseCases={useCases}
          token={token}
          onClose={() => setReviewingUseCase(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
