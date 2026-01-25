import { api } from '../api';

export interface AnalyticsOverview {
    performance: {
        total_workshops: number;
        active_workshops: number;
        completed_workshops: number;
        avg_engagement: number;
        total_participants: number;
    };
    categories: Array<{
        category: string;
        count: number;
        percentage: number;
        avg_score: number;
    }>;
    recent_trend: Array<{
        date: string;
        value: number;
    }>;
}

export interface BenchmarkData {
    industry: string;
    metrics: Array<{
        metric_name: string;
        your_value: number;
        industry_avg: number;
        percentile: number;
    }>;
}

export const analyticsApi = {
    getOverview: async (periodStart?: string, periodEnd?: string) => {
        const params = new URLSearchParams();
        if (periodStart) params.append('period_start', periodStart);
        if (periodEnd) params.append('period_end', periodEnd);

        const response = await api.get<AnalyticsOverview>(`/analytics/overview?${params.toString()}`);
        return response.data;
    },

    getBenchmarks: async (industry?: string) => {
        const params = new URLSearchParams();
        if (industry) params.append('industry', industry);

        const response = await api.get<BenchmarkData>(`/analytics/benchmarks?${params.toString()}`);
        return response.data;
    },

    generateReport: async (title: string, type: string) => {
        const response = await api.post('/analytics/reports/generate', {
            title,
            report_type: type,
        });
        return response.data;
    }
};
