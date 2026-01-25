import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Download,
  Clock,
  CheckCircle2,
  Play,
  PauseCircle,
  ArrowRight,
  AlertCircle,
  Mail
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Workshop {
  id: string;
  title: string;
  pin: string | null;
  status: string;
  current_phase: string;
  participant_count: number;
  use_case_count: number;
  created_at: string;
  can_edit: boolean;
  can_delete: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
  OPEN: { label: 'Open', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Play },
  COMPLETED: { label: 'Completed', color: 'bg-purple-100 text-purple-700', icon: CheckCircle2 },
  PAUSED: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700', icon: PauseCircle },
};

export function FacilitatorDashboard() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      toast.error('Failed to load workshops');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold theme-text-primary flex items-center gap-3">
                  <LayoutDashboard className="w-7 h-7 text-brand-violet" />
                  Facilitator Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Welcome, {user?.full_name || user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Pending Approval Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-amber-800 mb-2">
                  ⏳ Account Pending Approval
                </h2>
                <p className="text-amber-700 mb-4">
                  Your facilitator account is pending admin approval. You will be notified via email once your account has been activated.
                </p>
                <div className="bg-white/50 rounded-lg p-3 inline-block">
                  <span className="text-amber-600 font-medium">Status:</span>
                  <span className="ml-2 text-amber-800">Pending Review</span>
                </div>
                <button
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
                  onClick={() => window.location.href = 'mailto:admin@hotspotmatrix.com?subject=Facilitator%20Approval%20Request'}
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
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <LayoutDashboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No workshops available</p>
              <p className="text-gray-500 text-sm mt-1">
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
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold theme-text-primary flex items-center gap-3">
                <LayoutDashboard className="w-7 h-7 text-brand-violet" />
                Facilitator Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.full_name || user?.email}
              </p>
            </div>
            {user?.is_admin && (
              <button
                onClick={() => navigate('/create')}
                className="px-4 py-2 bg-brand-violet text-white rounded-lg hover:bg-brand-violet/90 transition-colors flex items-center gap-2"
              >
                Create Workshop
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-violet/10 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-brand-violet" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{workshops.length}</p>
                <p className="text-sm text-gray-500">Total Workshops</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{getActiveWorkshops().length}</p>
                <p className="text-sm text-gray-500">Active Workshops</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{getTotalParticipants()}</p>
                <p className="text-sm text-gray-500">Total Participants</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{getTotalUseCases()}</p>
                <p className="text-sm text-gray-500">Total Use Cases</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Workshops */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold theme-text-primary mb-4">My Workshops</h2>
          
          {isLoading ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading workshops...</p>
            </div>
          ) : workshops.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <LayoutDashboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No workshops assigned</p>
              <p className="text-gray-500 text-sm mt-1">
                {user?.is_admin 
                  ? 'Create a workshop to get started'
                  : 'Contact an administrator to get assigned to workshops'}
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
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Status Bar */}
                    <div className={`px-4 py-2 flex items-center justify-between ${
                      workshop.status === 'IN_PROGRESS' ? 'bg-blue-50' :
                      workshop.status === 'OPEN' ? 'bg-green-50' :
                      workshop.status === 'COMPLETED' ? 'bg-purple-50' :
                      'bg-gray-50'
                    }`}>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusStyle.label}
                      </span>
                      {workshop.pin && (
                        <span className="text-sm font-mono text-gray-600">
                          PIN: {workshop.pin}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                        {workshop.title}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {workshop.participant_count} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {workshop.use_case_count} use cases
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 mb-4">
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
                        <button
                          onClick={() => navigate(`/workshop/${workshop.id}?tab=analytics`)}
                          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          title="View Analytics"
                        >
                          <BarChart3 className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => navigate(`/workshop/${workshop.id}?tab=export`)}
                          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Export Data"
                        >
                          <Download className="w-5 h-5 text-gray-600" />
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Workshop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Use Cases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getCompletedWorkshops().map((workshop) => (
                    <tr key={workshop.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{workshop.title}</p>
                        {workshop.pin && (
                          <p className="text-sm text-gray-500 font-mono">PIN: {workshop.pin}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {workshop.participant_count}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {workshop.use_case_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(workshop.created_at)}
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
    </div>
  );
}
