/**
 * FacilitatorRequestQueue Component
 * US32: Admin approval queue for facilitator access requests
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Building,
  RefreshCw,
  Filter
} from 'lucide-react';

import { API_BASE_URL } from '../lib/config';
import { apiErrorText } from '../lib/apiErrors';

const API_BASE = API_BASE_URL;

interface FacilitatorRequest {
  id: string;
  request_id: string;
  workshop_id: string;
  workshop_title: string;
  workshop_pin: string | null;
  requester_name: string;
  requester_email: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  rejection_reason: string | null;
  current_facilitator_count: number;
  max_facilitators: number;
}

interface Props {
  onRefresh?: () => void;
}

export function FacilitatorRequestQueue({ onRefresh }: Props) {
  const { token } = useAuth();
  const [requests, setRequests] = useState<FacilitatorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [pendingCount, setPendingCount] = useState(0);

  const fetchRequests = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(
        `${API_BASE}/api/admin/facilitator-requests?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      setRequests(data.requests);
      setPendingCount(data.pending_count);
    } catch (error) {
      toast.error('Failed to load facilitator requests');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitator-requests/${requestId}/approve`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notes: '' }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(apiErrorText(error) || 'Failed to approve');
      }

      toast.success('Facilitator access approved');
      fetchRequests();
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string, reason?: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/facilitator-requests/${requestId}/reject`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: reason || '' }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(apiErrorText(error) || 'Failed to reject');
      }

      toast.success('Facilitator access rejected');
      fetchRequests();
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject request');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium theme-badge-warning">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium theme-badge-success">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium theme-badge-danger">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl shadow-sm border theme-card">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--theme-border-color)' }}>
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-brand-violet" />
          <h2 className="text-lg font-semibold theme-text-primary">
            Facilitator Requests
          </h2>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium theme-badge-warning">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 contrast-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm rounded-lg theme-input"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button
            onClick={fetchRequests}
            className="p-2 theme-hover rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 theme-text-secondary" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-violet mx-auto"></div>
          <p className="mt-3 contrast-muted">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center">
          <Users className="w-12 h-12 contrast-muted mx-auto mb-3" />
          <p className="theme-text-secondary font-medium">No requests found</p>
          <p className="contrast-muted text-sm mt-1">
            {statusFilter === 'pending'
              ? 'No pending facilitator requests'
              : 'No facilitator requests match the filter'}
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--theme-border-color)' }}>
          {requests.map((request) => (
            <div key={request.id} className="p-4 theme-hover">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-brand-violet">
                      {request.request_id}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="theme-text-primary font-medium">
                        {request.requester_name}
                      </p>
                      {request.requester_email ? (
                        <p className="contrast-muted flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {request.requester_email}
                        </p>
                      ) : (
                        <p className="contrast-muted text-xs">(No email provided)</p>
                      )}
                    </div>
                    <div>
                      <p className="theme-text-primary font-medium flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {request.workshop_title}
                      </p>
                      <p className="contrast-muted font-mono text-xs">
                        PIN: {request.workshop_pin}
                      </p>
                      <p className="contrast-muted text-xs">
                        Facilitators: {request.current_facilitator_count}/
                        {request.max_facilitators}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs contrast-muted mt-2">
                    Requested: {formatDate(request.created_at)}
                    {request.reviewed_at && (
                      <span className="ml-3">
                        Reviewed: {formatDate(request.reviewed_at)} by{' '}
                        {request.reviewed_by_name}
                      </span>
                    )}
                  </p>

                  {request.rejection_reason && (
                    <p className="text-xs mt-1" style={{ color: 'var(--theme-danger-text)' }}>
                      Reason: {request.rejection_reason}
                    </p>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(request.request_id)}
                      className="px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1 theme-btn-success"
                      disabled={
                        request.current_facilitator_count >=
                        request.max_facilitators
                      }
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.request_id)}
                      className="px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1 theme-btn-danger"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
