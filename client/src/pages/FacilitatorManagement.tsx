import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  MoreVertical,
  UserCheck,
  UserX,
  Building2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Facilitator {
  id: string;
  email: string;
  full_name: string;
  organization: string | null;
  role: string;
  status: 'pending' | 'active' | 'disabled' | 'suspended';
  created_at: string;
  last_login: string | null;
  workshop_count: number;
}

interface FacilitatorListResponse {
  facilitators: Facilitator[];
  total: number;
  pending_count: number;
}

const statusConfig = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: Clock 
  },
  active: { 
    label: 'Active', 
    color: 'bg-green-100 text-green-800', 
    icon: CheckCircle 
  },
  disabled: { 
    label: 'Disabled', 
    color: 'bg-red-100 text-red-800', 
    icon: XCircle 
  },
  suspended: { 
    label: 'Suspended', 
    color: 'bg-gray-100 text-gray-800', 
    icon: XCircle 
  },
};

export function FacilitatorManagement() {
  const { token } = useAuth();
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const fetchFacilitators = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_filter', statusFilter);

      const response = await fetch(
        `${API_BASE}/api/admin/facilitators?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch facilitators');

      const data: FacilitatorListResponse = await response.json();
      setFacilitators(data.facilitators);
      setTotal(data.total);
      setPendingCount(data.pending_count);
    } catch (error) {
      toast.error('Failed to load facilitators');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [token, searchTerm, statusFilter]);

  useEffect(() => {
    fetchFacilitators();
  }, [fetchFacilitators]);

  const handleApprove = async (facilitatorId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitators/${facilitatorId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved: true }),
        }
      );

      if (!response.ok) throw new Error('Failed to approve facilitator');

      toast.success('Facilitator approved successfully');
      fetchFacilitators();
    } catch (error) {
      toast.error('Failed to approve facilitator');
      console.error(error);
    }
    setActionMenuOpen(null);
  };

  const handleReject = async (facilitatorId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitators/${facilitatorId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved: false, rejection_reason: reason }),
        }
      );

      if (!response.ok) throw new Error('Failed to reject facilitator');

      toast.success('Facilitator registration rejected');
      fetchFacilitators();
    } catch (error) {
      toast.error('Failed to reject facilitator');
      console.error(error);
    }
    setActionMenuOpen(null);
  };

  const handleEnable = async (facilitatorId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitators/${facilitatorId}/enable`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to enable facilitator');

      toast.success('Facilitator enabled successfully');
      fetchFacilitators();
    } catch (error) {
      toast.error('Failed to enable facilitator');
      console.error(error);
    }
    setActionMenuOpen(null);
  };

  const handleDisable = async (facilitatorId: string) => {
    if (!confirm('Are you sure you want to disable this facilitator?')) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitators/${facilitatorId}/disable`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to disable facilitator');

      toast.success('Facilitator disabled successfully');
      fetchFacilitators();
    } catch (error) {
      toast.error('Failed to disable facilitator');
      console.error(error);
    }
    setActionMenuOpen(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen theme-bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold theme-text-primary flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-violet" />
            Facilitator Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage facilitator accounts, approvals, and permissions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-500">Total Facilitators</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-sm text-gray-500">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {facilitators.filter(f => f.status === 'active').length}
                </p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {facilitators.filter(f => f.status === 'disabled').length}
                </p>
                <p className="text-sm text-gray-500">Disabled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-transparent appearance-none bg-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Facilitators Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading facilitators...</p>
            </div>
          ) : facilitators.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No facilitators found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facilitator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workshops
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facilitators.map((facilitator) => {
                  const StatusIcon = statusConfig[facilitator.status]?.icon || Clock;
                  
                  return (
                    <tr key={facilitator.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-brand-violet/10 flex items-center justify-center">
                            <span className="text-brand-violet font-medium">
                              {facilitator.full_name?.charAt(0) || facilitator.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">
                              {facilitator.full_name || 'No name'}
                            </p>
                            <p className="text-sm text-gray-500">{facilitator.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4" />
                          {facilitator.organization || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[facilitator.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig[facilitator.status]?.label || facilitator.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {facilitator.workshop_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(facilitator.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(facilitator.last_login)}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={() => setActionMenuOpen(
                            actionMenuOpen === facilitator.id ? null : facilitator.id
                          )}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                        
                        {actionMenuOpen === facilitator.id && (
                          <div className="absolute right-6 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                            {facilitator.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(facilitator.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(facilitator.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <UserX className="w-4 h-4" />
                                  Reject
                                </button>
                              </>
                            )}
                            {facilitator.status === 'active' && (
                              <button
                                onClick={() => handleDisable(facilitator.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <UserX className="w-4 h-4" />
                                Disable Account
                              </button>
                            )}
                            {(facilitator.status === 'disabled' || facilitator.status === 'suspended') && (
                              <button
                                onClick={() => handleEnable(facilitator.id)}
                                className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                              >
                                <UserCheck className="w-4 h-4" />
                                Enable Account
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
