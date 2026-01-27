/**
 * RegistrationRateLimitStatus Component
 * US32: Admin view of registration rate limits
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  Activity,
  Clock,
  AlertTriangle,
  RefreshCw,
  RotateCcw
} from 'lucide-react';

import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;

interface RateLimitStatus {
  count: number;
  limit: number;
  reset_at: string;
}

interface RateLimits {
  daily: RateLimitStatus;
  weekly: RateLimitStatus;
  monthly: RateLimitStatus;
}

export function RegistrationRateLimitStatus() {
  const { token } = useAuth();
  const [limits, setLimits] = useState<RateLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const fetchLimits = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE}/api/admin/registration-limits`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch rate limits');

      const data = await response.json();
      setLimits(data);
    } catch (error) {
      toast.error('Failed to load rate limit status');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const handleReset = async (period: string) => {
    if (!confirm(`Are you sure you want to reset ${period} rate limits? This is for emergency use only.`)) {
      return;
    }

    try {
      setIsResetting(true);
      const response = await fetch(
        `${API_BASE}/api/admin/registration-limits/reset`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ period }),
        }
      );

      if (!response.ok) throw new Error('Failed to reset rate limits');

      toast.success(`${period} rate limits reset successfully`);
      fetchLimits();
    } catch (error) {
      toast.error('Failed to reset rate limits');
    } finally {
      setIsResetting(false);
    }
  };

  const getPercentage = (count: number, limit: number) => {
    return Math.round((count / limit) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatResetTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMins = Math.round(diffMs / (1000 * 60));
      return `${diffMins} minutes`;
    }
    if (diffHours < 24) {
      return `${diffHours} hours`;
    }
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} days`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!limits) return null;

  const periods = [
    { key: 'daily', label: 'Daily', data: limits.daily },
    { key: 'weekly', label: 'Weekly', data: limits.weekly },
    { key: 'monthly', label: 'Monthly', data: limits.monthly },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-brand-violet" />
          <h2 className="text-lg font-semibold text-gray-900">
            Registration Rate Limits
          </h2>
        </div>
        <button
          onClick={fetchLimits}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {periods.map(({ key, label, data }) => {
          const percentage = getPercentage(data.count, data.limit);
          const isWarning = percentage >= 75;

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {label}
                  </span>
                  {isWarning && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {data.count} / {data.limit}
                  </span>
                  <button
                    onClick={() => handleReset(key)}
                    disabled={isResetting}
                    className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
                    title={`Reset ${label.toLowerCase()} limit`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getProgressColor(percentage)}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{percentage}% used</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Resets in {formatResetTime(data.reset_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning banner if any limit is high */}
      {periods.some(p => getPercentage(p.data.count, p.data.limit) >= 75) && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            <span>Registration rate limits are approaching capacity</span>
          </div>
        </div>
      )}
    </div>
  );
}
