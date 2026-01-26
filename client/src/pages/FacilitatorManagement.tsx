import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
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
  Building2,
  ChevronDown,
  X
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || (() => {
  const hostname = window.location.hostname;
  return (hostname !== 'localhost' && hostname !== '127.0.0.1')
    ? `http://${hostname}:8000`
    : 'http://localhost:8000';
})();

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

interface Workshop {
  id: string;
  title: string;
  pin: string | null;
  status: string;
}

interface FacilitatorWorkshops {
  [facilitatorId: string]: Workshop[];
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'theme-badge-warning',
    icon: Clock
  },
  active: {
    label: 'Active',
    color: 'theme-badge-success',
    icon: CheckCircle
  },
  disabled: {
    label: 'Disabled',
    color: 'theme-badge-danger',
    icon: XCircle
  },
  suspended: {
    label: 'Suspended',
    color: 'theme-badge-neutral',
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

  // Workshop assignment state
  const [allWorkshops, setAllWorkshops] = useState<Workshop[]>([]);
  const [facilitatorWorkshops, setFacilitatorWorkshops] = useState<FacilitatorWorkshops>({});
  const [workshopDropdownOpen, setWorkshopDropdownOpen] = useState<string | null>(null);
  const [savingWorkshops, setSavingWorkshops] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all workshops for dropdown
  const fetchAllWorkshops = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/admin/workshops`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch workshops');

      const data = await response.json();
      setAllWorkshops(data.map((w: { id: string; title: string; pin: string | null; status: string }) => ({
        id: w.id,
        title: w.title,
        pin: w.pin,
        status: w.status
      })));
    } catch (error) {
      console.error('Failed to fetch workshops:', error);
    }
  }, [token]);

  // Fetch workshops assigned to a facilitator
  const fetchFacilitatorWorkshops = useCallback(async (facilitatorId: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitators/${facilitatorId}/workshops`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch facilitator workshops');

      const data = await response.json();
      setFacilitatorWorkshops(prev => ({
        ...prev,
        [facilitatorId]: data.assigned_workshops || []
      }));
    } catch (error) {
      console.error('Failed to fetch facilitator workshops:', error);
    }
  }, [token]);

  // Update facilitator workshops
  const updateFacilitatorWorkshops = async (facilitatorId: string, workshopIds: string[]) => {
    if (!token) return;

    setSavingWorkshops(facilitatorId);
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitators/${facilitatorId}/workshops`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workshop_ids: workshopIds }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update workshops');
      }

      const data = await response.json();
      setFacilitatorWorkshops(prev => ({
        ...prev,
        [facilitatorId]: data.assigned_workshops || []
      }));
      toast.success('Workshops updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update workshops');
      console.error(error);
    } finally {
      setSavingWorkshops(null);
    }
  };

  // Toggle workshop selection
  const toggleWorkshop = (facilitatorId: string, workshopId: string) => {
    const currentWorkshops = facilitatorWorkshops[facilitatorId] || [];
    const currentIds = currentWorkshops.map(w => w.id);

    let newIds: string[];
    if (currentIds.includes(workshopId)) {
      newIds = currentIds.filter(id => id !== workshopId);
    } else {
      newIds = [...currentIds, workshopId];
    }

    updateFacilitatorWorkshops(facilitatorId, newIds);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setWorkshopDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    fetchAllWorkshops();
  }, [fetchFacilitators, fetchAllWorkshops]);

  // Fetch workshops for all facilitators when facilitators list changes
  useEffect(() => {
    facilitators.forEach(f => {
      if (!facilitatorWorkshops[f.id]) {
        fetchFacilitatorWorkshops(f.id);
      }
    });
  }, [facilitators, facilitatorWorkshops, fetchFacilitatorWorkshops]);

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
    <AdminLayout title="Facilitator Management">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold theme-text-primary flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-violet" />
            Facilitator Management
          </h1>
          <p className="theme-text-secondary mt-2">
            Manage facilitator accounts, approvals, and permissions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg p-4 shadow-sm border theme-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg theme-icon-info">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold theme-text-primary">{total}</p>
                <p className="text-sm contrast-muted">Total Facilitators</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg p-4 shadow-sm border theme-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg theme-icon-warning">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold theme-text-primary">{pendingCount}</p>
                <p className="text-sm contrast-muted">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg p-4 shadow-sm border theme-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg theme-icon-success">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold theme-text-primary">
                  {facilitators.filter(f => f.status === 'active').length}
                </p>
                <p className="text-sm contrast-muted">Active</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg p-4 shadow-sm border theme-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg theme-icon-danger">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold theme-text-primary">
                  {facilitators.filter(f => f.status === 'disabled').length}
                </p>
                <p className="text-sm contrast-muted">Disabled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg shadow-sm border p-4 mb-6 theme-card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 contrast-muted" />
              <input
                type="text"
                placeholder="Search by name, email, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-transparent theme-input"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 contrast-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-transparent appearance-none theme-input"
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
        <div className="rounded-lg shadow-sm border overflow-hidden theme-card">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet mx-auto"></div>
              <p className="mt-4 contrast-muted">Loading facilitators...</p>
            </div>
          ) : facilitators.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 contrast-muted mx-auto mb-3" />
              <p className="contrast-muted">No facilitators found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="theme-bg-tertiary border-b" style={{ borderColor: 'var(--theme-border-color)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                    Facilitator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                    Workshops
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium contrast-muted uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium contrast-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--theme-border-color)' }}>
                {facilitators.map((facilitator) => {
                  const StatusIcon = statusConfig[facilitator.status]?.icon || Clock;

                  return (
                    <tr key={facilitator.id} className="theme-hover">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-brand-violet/10 flex items-center justify-center">
                            <span className="text-brand-violet font-medium">
                              {facilitator.full_name?.charAt(0) || facilitator.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="font-medium theme-text-primary">
                              {facilitator.full_name || 'No name'}
                            </p>
                            <p className="text-sm contrast-muted">{facilitator.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 theme-text-secondary">
                          <Building2 className="w-4 h-4" />
                          {facilitator.organization || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[facilitator.status]?.color || 'theme-badge-neutral'}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig[facilitator.status]?.label || facilitator.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 relative">
                        <div ref={workshopDropdownOpen === facilitator.id ? dropdownRef : null}>
                          <button
                            onClick={() => setWorkshopDropdownOpen(
                              workshopDropdownOpen === facilitator.id ? null : facilitator.id
                            )}
                            disabled={savingWorkshops === facilitator.id}
                            className="flex items-center gap-2 px-3 py-1.5 border rounded-lg theme-hover transition-colors min-w-[140px] justify-between theme-border"
                          >
                            <span className="text-sm theme-text-secondary">
                              {savingWorkshops === facilitator.id ? (
                                'Saving...'
                              ) : (
                                `${(facilitatorWorkshops[facilitator.id] || []).length} workshop${(facilitatorWorkshops[facilitator.id] || []).length !== 1 ? 's' : ''}`
                              )}
                            </span>
                            <ChevronDown className="w-4 h-4 contrast-muted" />
                          </button>

                          {workshopDropdownOpen === facilitator.id && (
                            <div className="absolute z-20 mt-1 w-72 rounded-lg shadow-lg border max-h-60 overflow-y-auto theme-card">
                              <div className="p-2 border-b" style={{ borderColor: 'var(--theme-border-color)' }}>
                                <p className="text-xs contrast-muted font-medium">
                                  Assign Workshops to {facilitator.full_name || 'Facilitator'}
                                </p>
                              </div>
                              {allWorkshops.length === 0 ? (
                                <div className="p-4 text-center contrast-muted text-sm">
                                  No workshops available
                                </div>
                              ) : (
                                <div className="py-1">
                                  {allWorkshops.map((workshop) => {
                                    const isAssigned = (facilitatorWorkshops[facilitator.id] || [])
                                      .some(w => w.id === workshop.id);
                                    return (
                                      <button
                                        key={workshop.id}
                                        onClick={() => toggleWorkshop(facilitator.id, workshop.id)}
                                        disabled={savingWorkshops === facilitator.id}
                                        className={`w-full px-3 py-2 text-left text-sm theme-hover flex items-center justify-between transition-colors ${isAssigned ? 'bg-brand-violet/5' : ''
                                          }`}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium theme-text-primary truncate">
                                            {workshop.title}
                                          </p>
                                          <p className="text-xs contrast-muted">
                                            PIN: {workshop.pin || 'N/A'} • {workshop.status}
                                          </p>
                                        </div>
                                        {isAssigned && (
                                          <CheckCircle className="w-4 h-4 text-brand-violet flex-shrink-0 ml-2" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Selected workshops tags */}
                              {(facilitatorWorkshops[facilitator.id] || []).length > 0 && (
                                <div className="p-2 border-t theme-bg-tertiary" style={{ borderColor: 'var(--theme-border-color)' }}>
                                  <p className="text-xs contrast-muted mb-1">Selected:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(facilitatorWorkshops[facilitator.id] || []).map(w => (
                                      <span
                                        key={w.id}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-violet/10 text-brand-violet rounded text-xs"
                                      >
                                        {w.title.length > 15 ? w.title.slice(0, 15) + '...' : w.title}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleWorkshop(facilitator.id, w.id);
                                          }}
                                          className="hover:opacity-70"
                                          style={{ color: 'var(--theme-danger-text)' }}
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm contrast-muted">
                        {formatDate(facilitator.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm contrast-muted">
                        {formatDate(facilitator.last_login)}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={() => setActionMenuOpen(
                            actionMenuOpen === facilitator.id ? null : facilitator.id
                          )}
                          className="p-2 theme-hover rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 contrast-muted" />
                        </button>

                        {actionMenuOpen === facilitator.id && (
                          <div className="absolute right-6 top-12 w-48 rounded-lg shadow-lg border py-1 z-10 theme-card">
                            {facilitator.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(facilitator.id)}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 theme-hover"
                                  style={{ color: 'var(--theme-success-text)' }}
                                >
                                  <UserCheck className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(facilitator.id)}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 theme-hover"
                                  style={{ color: 'var(--theme-danger-text)' }}
                                >
                                  <UserX className="w-4 h-4" />
                                  Reject
                                </button>
                              </>
                            )}
                            {facilitator.status === 'active' && (
                              <button
                                onClick={() => handleDisable(facilitator.id)}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 theme-hover"
                                style={{ color: 'var(--theme-danger-text)' }}
                              >
                                <UserX className="w-4 h-4" />
                                Disable Account
                              </button>
                            )}
                            {(facilitator.status === 'disabled' || facilitator.status === 'suspended') && (
                              <button
                                onClick={() => handleEnable(facilitator.id)}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 theme-hover"
                                style={{ color: 'var(--theme-success-text)' }}
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
    </AdminLayout>
  );
}
