import { api } from '../api';

export interface Poll {
    id: string;
    question_text: string;
    poll_type: string;
    options: string[] | any;
    status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
    stats?: {
        total_responses: number;
        results: any;
    };
    user_response?: any;
}

export interface Question {
    id: string;
    workshop_id: string;
    participant_id: string;
    display_name: string;
    content: string;
    is_answered: boolean;
    is_pinned: boolean;
    is_anonymous: boolean;
    created_at: string;
    upvote_count: number;
    user_has_upvoted: boolean;
}

export const PollService = {
    // Polls
    createPoll: (workshopId: string, data: any) =>
        api.post(`/polls/workshop/${workshopId}`, data).then(res => res.data),

    getPolls: (workshopId: string, participantId?: string) =>
        api.get(`/polls/workshop/${workshopId}`, { params: { participant_id: participantId } }).then(res => res.data),

    vote: (pollId: string, participantId: string, responseData: any) =>
        api.post(`/polls/${pollId}/vote`, { response_data: responseData }, { params: { participant_id: participantId } }),

    updateStatus: (pollId: string, status: string) =>
        api.put(`/polls/${pollId}/status`, { status }).then(res => res.data),

    // Reactions
    sendReaction: (workshopId: string, participantId: string, type: string) =>
        api.post(`/polls/workshop/${workshopId}/reactions`, { reaction_type: type }, { params: { participant_id: participantId } }),

    getReactionSummary: (workshopId: string) =>
        api.get(`/polls/workshop/${workshopId}/reactions/summary`).then(res => res.data),

    // Q&A
    submitQuestion: (workshopId: string, participantId: string, content: string, isAnonymous: boolean) =>
        api.post(`/polls/workshop/${workshopId}/questions`, { content, is_anonymous: isAnonymous }, { params: { participant_id: participantId } }).then(res => res.data),

    getQuestions: (workshopId: string, participantId?: string) =>
        api.get(`/polls/workshop/${workshopId}/questions`, { params: { participant_id: participantId } }).then(res => res.data),

    upvoteQuestion: (questionId: string, participantId: string) =>
        api.post(`/polls/questions/${questionId}/upvote`, {}, { params: { participant_id: participantId } }).then(res => res.data),

    updateQuestion: (questionId: string, data: any) =>
        api.put(`/polls/questions/${questionId}`, data).then(res => res.data)
};
