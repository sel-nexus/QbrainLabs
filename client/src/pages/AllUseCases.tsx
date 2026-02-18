import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { FileText, Calendar, Tag, ArrowRight, Search, Filter, ClipboardCheck } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';
import { UseCaseApprovalModal } from '../components/usecases/UseCaseApprovalModal';

const API_BASE = API_BASE_URL;

interface Workshop {
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
  workshop: Workshop;
}

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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/facilitator-login');
          return;
        }
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
          uc.workshop.title.toLowerCase().includes(term)
      );
    }

    if (selectedWorkshop !== 'all') {
      filtered = filtered.filter((uc) => uc.workshop.id === selectedWorkshop);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((uc) => uc.status === selectedStatus);
    }

    setFilteredUseCases(filtered);
  };

  const getUniqueWorkshops = () => {
    // Extract unique workshops from use cases
    // For facilitators, this will only include workshops they own or are assigned to
    // since the API filters use cases based on facilitator permissions
    const workshopsMap = new Map<string, Workshop>();
    useCases.forEach((uc) => {
      if (!workshopsMap.has(uc.workshop.id)) {
        workshopsMap.set(uc.workshop.id, uc.workshop);
      }
    });
    return Array.from(workshopsMap.values());
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleUseCaseClick = (useCase: UseCase) => {
    setReviewingUseCase(useCase);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setUseCases(prev =>
      prev.map(uc => uc.id === id ? { ...uc, status: newStatus } : uc)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const uniqueWorkshops = getUniqueWorkshops();

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('useCases.allUseCases', 'All Use Cases')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('useCases.browseAll', 'Browse all use cases across workshops')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('common.search', 'Search...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={selectedWorkshop}
                onChange={(e) => setSelectedWorkshop(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white appearance-none"
              >
                <option value="all">{t('common.allWorkshops', 'All Workshops')}</option>
                {uniqueWorkshops.map((workshop) => (
                  <option key={workshop.id} value={workshop.id}>
                    {workshop.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white appearance-none"
              >
                <option value="all">{t('common.allStatuses', 'All Statuses')}</option>
                <option value="PENDING">{t('status.pending', 'Pending')}</option>
                <option value="APPROVED">{t('status.approved', 'Approved')}</option>
                <option value="REJECTED">{t('status.rejected', 'Rejected')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('common.showing', 'Showing')} <span className="font-semibold text-gray-900 dark:text-white">{filteredUseCases.length}</span> {t('common.of', 'of')} <span className="font-semibold text-gray-900 dark:text-white">{useCases.length}</span> {t('useCases.useCases', 'use cases')}
          </div>
        </div>

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
            {filteredUseCases.map((useCase) => (
              <div
                key={useCase.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleUseCaseClick(useCase)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {useCase.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {useCase.description}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2 shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeClass(
                          useCase.status
                        )}`}
                      >
                        {useCase.status}
                      </span>
                      {useCase.status === 'PENDING' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 whitespace-nowrap flex items-center gap-1">
                          <ClipboardCheck className="w-3 h-3" />
                          Review
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {useCase.kpi && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('useCases.kpi', 'KPI')}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {useCase.kpi}
                        </p>
                      </div>
                    )}
                    {useCase.target_user && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('useCases.targetUser', 'Target User')}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {useCase.target_user}
                        </p>
                      </div>
                    )}
                    {useCase.category && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('useCases.category', 'Category')}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {useCase.category}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {useCase.workshop.title}
                        </span>
                      </div>
                      {useCase.created_at && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(useCase.created_at)}
                        </div>
                      )}
                    </div>
                    <button
                      className="flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
                      onClick={e => { e.stopPropagation(); navigate(`/workshop/${useCase.workshop.id}`); }}
                    >
                      {t('common.viewWorkshop', 'View Workshop')}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

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
