import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Building2
} from 'lucide-react';

import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;

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

export function AdminUsers() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const isLight = theme === 'light';

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
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitators/${facilitatorId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved: false }),
        }
      );

      if (!response.ok) throw new Error('Failed to reject facilitator');

      toast.success('Facilitator rejected');
      fetchFacilitators();
    } catch (error) {
      toast.error('Failed to reject facilitator');
      console.error(error);
    }
    setActionMenuOpen(null);
  };

  const handleDisable = async (facilitatorId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitators/${facilitatorId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'disabled' }),
        }
      );

      if (!response.ok) throw new Error('Failed to disable facilitator');

      toast.success('Facilitator disabled');
      fetchFacilitators();
    } catch (error) {
      toast.error('Failed to disable facilitator');
      console.error(error);
    }
    setActionMenuOpen(null);
  };

  const handleEnable = async (facilitatorId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitators/${facilitatorId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'active' }),
        }
      );

      if (!response.ok) throw new Error('Failed to enable facilitator');

      toast.success('Facilitator enabled');
      fetchFacilitators();
    } catch (error) {
      toast.error('Failed to enable facilitator');
      console.error(error);
    }
    setActionMenuOpen(null);
  };

  return (
    <AdminLayout title="Users">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
          <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{total}</div>
          <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Total Users</div>
        </div>
        <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
          <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
          <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Pending Approval</div>
        </div>
        <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
          <div className="text-2xl font-bold text-green-500">
            {facilitators.filter(f => f.status === 'active').length}
          </div>
          <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Active Users</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:border-amber-500/50 ${isLight ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-800 border-white/10 text-white placeholder-gray-400'}`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-4 py-2 rounded-lg border focus:outline-none focus:border-amber-500/50 ${isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-surface-800 border-white/10 text-white'}`}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className={`text-center py-12 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Loading users...</div>
      ) : facilitators.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>No users found</p>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                <th className={`text-left py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>User</th>
                <th className={`text-left py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Organization</th>
                <th className={`text-left py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Status</th>
                <th className={`text-left py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Workshops</th>
                <th className={`text-right py-4 px-6 text-sm font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {facilitators.map((facilitator) => {
                const status = statusConfig[facilitator.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <tr key={facilitator.id} className={`border-b transition ${isLight ? 'border-gray-100 hover:bg-gray-50' : 'border-white/5 hover:bg-white/5'}`}>
                    <td className="py-4 px-6">
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{facilitator.full_name || 'N/A'}</div>
                      <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{facilitator.email}</div>
                    </td>
                    <td className={`py-4 px-6 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                      {facilitator.organization || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className={`py-4 px-6 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                      {facilitator.workshop_count}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === facilitator.id ? null : facilitator.id)}
                          className={`p-2 rounded-lg transition ${isLight ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {actionMenuOpen === facilitator.id && (
                          <div className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg z-10 py-1 min-w-[150px] ${isLight ? 'bg-white border border-gray-200' : 'bg-surface-700 border border-white/10'}`}>
                            {facilitator.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(facilitator.id)}
                                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 ${isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}
                                >
                                  <UserCheck className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(facilitator.id)}
                                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 ${isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}
                                >
                                  <UserX className="w-4 h-4" />
                                  Reject
                                </button>
                              </>
                            )}
                            {facilitator.status === 'active' && (
                              <button
                                onClick={() => handleDisable(facilitator.id)}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 ${isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}
                              >
                                <UserX className="w-4 h-4" />
                                Disable
                              </button>
                            )}
                            {facilitator.status === 'disabled' && (
                              <button
                                onClick={() => handleEnable(facilitator.id)}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 ${isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}
                              >
                                <UserCheck className="w-4 h-4" />
                                Enable
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
