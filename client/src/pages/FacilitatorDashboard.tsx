import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ActionTile } from '../components/ui/ActionTile';
import { InitiateSurveyModal } from '../components/survey/InitiateSurveyModal';
import { SurveyMonitorPanel } from '../components/survey/SurveyMonitorPanel';
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  Play,
  PauseCircle,
  ArrowRight,
  AlertCircle,
  Mail,
  Rocket,
  Lightbulb
} from 'lucide-react';

import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;

interface Workshop {
  id: string;
  title: string;
  pin: string | null;
  status: string;
  current_phase: string;
  participant_count: number;
  use_case_count: number;
  created_at: string;
  completed_at?: string | null;
  can_edit: boolean;
  can_delete: boolean;
}

export function FacilitatorDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  const statusConfig: Record<string, { label: string; color: string; barColor: string; icon: React.ElementType }> = {
    DRAFT: { label: t('dashboard.status.draft'), color: 'theme-badge-neutral', barColor: 'theme-bg-tertiary', icon: Clock },
    OPEN: { label: t('dashboard.status.open'), color: 'theme-badge-success', barColor: 'theme-badge-success', icon: CheckCircle2 },
    IN_PROGRESS: { label: t('dashboard.status.in_progress'), color: 'theme-badge-info', barColor: 'theme-badge-info', icon: Play },
    COMPLETED: { label: t('dashboard.status.completed'), color: 'theme-badge-info', barColor: 'theme-badge-info', icon: CheckCircle2 },
    PAUSED: { label: t('dashboard.status.paused'), color: 'theme-badge-warning', barColor: 'theme-badge-warning', icon: PauseCircle },
  };

  const handleUseCasesClick = () => {
    navigate('/facilitator/usecases');
  };

  const fetchWorkshops = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/facilitator/workshops`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch workshops');

      const data = await response.json();
      setWorkshops(data);
    } catch (error) {
      toast.error(t('common.error'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getActiveWorkshops = () => workshops.filter(w =>
    w.status === 'OPEN' || w.status === 'IN_PROGRESS'
  );

  const getCompletedWorkshops = () => workshops.filter(w =>
    w.status === 'COMPLETED'
  );

  const getTotalParticipants = () =>
    workshops.reduce((sum, w) => sum + w.participant_count, 0);

  const getTotalUseCases = () =>
    workshops.reduce((sum, w) => sum + w.use_case_count, 0);

  // US32: Check if user is pending approval
  const isPending = user?.status === 'pending';

  // US32: Pending facilitator dashboard
  if (isPending) {
    return (
      <div className="min-h-screen theme-bg-secondary">
        {/* Header */}
        <div className="theme-card border-b" style={{ borderColor: 'var(--theme-border-color)' }}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold theme-text-primary flex items-center gap-3">
                  <LayoutDashboard className="w-7 h-7 text-brand-violet" />
                  Facilitator Dashboard
                </h1>
                <p className="theme-text-secondary mt-1">
                  Welcome, {user?.full_name || user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Pending Approval Banner */}
          <div className="rounded-xl p-6 mb-8 theme-badge-warning border">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full theme-icon-warning">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--theme-warning-text)' }}>
                  ⏳ Account Pending Approval
                </h2>
                <p className="mb-4 theme-text-secondary">
                  Your facilitator account is pending admin approval. You will be notified via email once your account has been activated.
                </p>
                <div className="rounded-lg p-3 inline-block theme-bg-tertiary">
                  <span className="font-medium" style={{ color: 'var(--theme-warning-text)' }}>Status:</span>
                  <span className="ml-2 theme-text-primary">Pending Review</span>
                </div>
                <button
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors theme-badge-warning hover:opacity-80"
                  onClick={() => window.location.href = 'mailto:admin@qbrainlabs.com?subject=Facilitator%20Approval%20Request'}
                >
                  <Mail className="w-4 h-4" />
                  Contact Administrator
                </button>
              </div>
            </div>
          </div>

          {/* Empty Workshops Section */}
          <div>
            <h2 className="text-xl font-semibold theme-text-primary mb-4">My Workshops (0)</h2>
            <div className="rounded-xl p-8 text-center shadow-sm border theme-card">
              <LayoutDashboard className="w-12 h-12 contrast-muted mx-auto mb-3" />
              <p className="theme-text-secondary font-medium">No workshops available</p>
              <p className="contrast-muted text-sm mt-1">
                Workshops will appear here once your account is approved and you are assigned to workshops.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-secondary">
      {/* Header */}
      <div className="theme-card border-b" style={{ borderColor: 'var(--theme-border-color)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold theme-text-primary flex items-center gap-3">
                <LayoutDashboard className="w-7 h-7 text-brand-violet" />
                Facilitator Dashboard
              </h1>
              <p className="theme-text-secondary mt-1">
                Welcome back, {user?.full_name || user?.email}
              </p>
            </div>
            {/* Any approved facilitator can create workshops (pending accounts see the approval screen) */}
            {!isPending && (
              <button
                onClick={() => navigate('/facilitator/create')}
                className="px-4 py-2 bg-brand-violet text-white rounded-lg hover:bg-brand-violet/90 transition-colors flex items-center gap-2"
              >
                Create Workshop
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <ActionTile
            icon={<FileText className="w-7 h-7" />}
            title="Use Cases"
            description="Browse workshop use cases"
            badge={getTotalUseCases()}
            badgeVariant="info"
            onClick={handleUseCasesClick}
          />
          <ActionTile
            icon={<Users className="w-7 h-7" />}
            title="Knowledge Base"
            description="Browse AI knowledge base"
            badgeVariant="default"
            onClick={() => navigate('/facilitator/knowledge-base')}
          />
          <ActionTile
            icon={<Rocket className="w-7 h-7" />}
            title="Launch Survey"
            description="Send a survey to your workshops"
            badgeVariant="default"
            onClick={() => setShowSurveyModal(true)}
          />
          <ActionTile
            icon={<Lightbulb className="w-7 h-7" />}
            title="Challenge Planner"
            description="Plan your six-stage business challenge"
            badgeVariant="default"
            onClick={() => navigate('/facilitator/challenge-planner')}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl p-5 shadow-sm border theme-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-violet/10 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-brand-violet" />
              </div>
              <div>
                <p className="text-3xl font-bold theme-text-primary">{workshops.length}</p>
                <p className="text-sm contrast-muted">Total Workshops</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-5 shadow-sm border theme-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg theme-icon-success">
                <Play className="w-6 h-6" />
              </div>
              <div>
                <p className="text-3xl font-bold theme-text-primary">{getActiveWorkshops().length}</p>
                <p className="text-sm contrast-muted">Active Workshops</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-5 shadow-sm border theme-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg theme-icon-info">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-3xl font-bold theme-text-primary">{getTotalParticipants()}</p>
                <p className="text-sm contrast-muted">Total Participants</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-5 shadow-sm border theme-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-brand-violet/10">
                <FileText className="w-6 h-6 text-brand-violet" />
              </div>
              <div>
                <p className="text-3xl font-bold theme-text-primary">{getTotalUseCases()}</p>
                <p className="text-sm contrast-muted">Total Use Cases</p>
              </div>
            </div>
          </div>
        </div>

        {/* Survey Results Monitor */}
        {!isLoading && workshops.length > 0 && token && (
          <SurveyMonitorPanel workshops={workshops} token={token} />
        )}

        {/* My Workshops */}
        <div className="mb-8" id="my-workshops">
          <h2 className="text-xl font-semibold theme-text-primary mb-4">My Workshops</h2>

          {isLoading ? (
            <div className="rounded-xl p-8 text-center shadow-sm border theme-card">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet mx-auto"></div>
              <p className="mt-4 contrast-muted">Loading workshops...</p>
            </div>
          ) : workshops.length === 0 ? (
            <div className="rounded-xl p-8 text-center shadow-sm border theme-card">
              <LayoutDashboard className="w-12 h-12 contrast-muted mx-auto mb-3" />
              <p className="theme-text-secondary font-medium">No workshops assigned</p>
              <p className="contrast-muted text-sm mt-1">
                Create a workshop to get started, or ask a colleague to add you to theirs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workshops.map((workshop) => {
                const StatusIcon = statusConfig[workshop.status]?.icon || Clock;
                const statusStyle = statusConfig[workshop.status] || statusConfig.DRAFT;

                return (
                  <div
                    key={workshop.id}
                    className="rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow theme-card"
                  >
                    {/* Status Bar */}
                    <div className={`px-4 py-2 flex items-center justify-between ${statusStyle.barColor}`}>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusStyle.label}
                      </span>
                      {workshop.pin && (
                        <span className="text-sm font-mono theme-text-secondary">
                          PIN: {workshop.pin}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-semibold text-lg theme-text-primary mb-2 line-clamp-2">
                        {workshop.title}
                      </h3>

                      <div className="flex items-center gap-4 text-sm contrast-muted mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {workshop.participant_count} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {workshop.use_case_count} use cases
                        </span>
                      </div>

                      <p className="text-xs contrast-muted mb-4">
                        Created {formatDate(workshop.created_at)}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/workshop/${workshop.id}`)}
                          className="flex-1 px-4 py-2 bg-brand-violet text-white rounded-lg hover:bg-brand-violet/90 transition-colors flex items-center justify-center gap-2"
                        >
                          Enter Workshop
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats - Completed Workshops */}
        {getCompletedWorkshops().length > 0 && (
          <div>
            <h2 className="text-xl font-semibold theme-text-primary mb-4">Completed Workshops</h2>
            <div className="rounded-xl shadow-sm border overflow-hidden theme-card">
              <table className="w-full">
                <thead className="theme-bg-tertiary border-b" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                      Workshop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                      Use Cases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium contrast-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--theme-border-color)' }}>
                  {getCompletedWorkshops().map((workshop) => (
                    <tr key={workshop.id} className="theme-hover">
                      <td className="px-6 py-4">
                        <p className="font-medium theme-text-primary">{workshop.title}</p>
                        {workshop.pin && (
                          <p className="text-sm contrast-muted font-mono">PIN: {workshop.pin}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 theme-text-secondary">
                        {workshop.participant_count}
                      </td>
                      <td className="px-6 py-4 theme-text-secondary">
                        {workshop.use_case_count}
                      </td>
                      <td className="px-6 py-4 text-sm contrast-muted">
                        {formatDate(workshop.completed_at || workshop.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/workshop/${workshop.id}`)}
                          className="text-brand-violet hover:text-brand-violet/80 font-medium text-sm"
                        >
                          View Results
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Launch Survey Modal */}
      {showSurveyModal && token && (
        <InitiateSurveyModal
          workshops={workshops}
          token={token}
          onClose={() => setShowSurveyModal(false)}
          onSuccess={(workshopIds) => {
            setShowSurveyModal(false);
            // Navigate to the first selected workshop's survey tab
            if (workshopIds.length === 1) {
              navigate(`/workshop/${workshopIds[0]}?tab=surveys`);
            }
          }}
        />
      )}
    </div>
  );
}
