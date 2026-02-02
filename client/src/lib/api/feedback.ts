import { api } from '../api';

export const FeedbackType = {
    BUG: 'bug',
    FEATURE_REQUEST: 'feature_request',
    IMPROVEMENT: 'improvement',
    GENERAL: 'general',
} as const;

export type FeedbackType = typeof FeedbackType[keyof typeof FeedbackType];

export interface FeedbackData {
    type: FeedbackType;
    title: string;
    description: string;
    priority?: number;
    page_url?: string;
}

export const feedbackApi = {
    submitFeedback: async (data: FeedbackData) => {
        const response = await api.post('feedback', {
            ...data,
            page_url: window.location.pathname,
        });
        return response.data;
    },
};
