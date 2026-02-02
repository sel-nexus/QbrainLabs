import { api } from '../api';

export interface PointsResponse {
    total_points: number;
    session_points: number;
    breakdown: Array<{
        action: string;
        points: number;
        earned_at: string;
        metadata?: any;
    }>;
}

export interface BadgeResponse {
    id: string;
    name: string;
    icon: string;
    description?: string;
    rarity: string;
    criteria?: any;
    created_at: string;
}

export interface EarnedBadgeResponse {
    id: string;
    badge: BadgeResponse;
    earned_at: string;
    workshop_id: string;
}

export interface LeaderboardEntry {
    rank: number;
    participant_id: string;
    display_name: string;
    points: number;
    badges_count: number;
    team_name?: string;
}

export interface LeaderboardResponse {
    rankings: LeaderboardEntry[];
}

export interface PointEarnedResponse {
    new_total: number;
    points_earned: number;
    achievements_unlocked: string[];
}

/**
 * Award points to a participant for an action
 */
export async function awardPoints(
    participantId: string,
    workshopId: string,
    action: string,
    metadata?: any
): Promise<PointEarnedResponse> {
    const { data } = await api.post('gamification/points', {
        participant_id: participantId,
        workshop_id: workshopId,
        action,
        metadata
    });
    return data;
}

/**
 * Get points for a participant
 */
export async function getParticipantPoints(participantId: string): Promise<PointsResponse> {
    const { data } = await api.get(`gamification/points/${participantId}`);
    return data;
}

/**
 * Get all available badges
 */
export async function getAllBadges(): Promise<BadgeResponse[]> {
    const { data } = await api.get('gamification/badges');
    return data;
}

/**
 * Get badges earned by a participant
 */
export async function getEarnedBadges(participantId: string): Promise<EarnedBadgeResponse[]> {
    const { data } = await api.get(`gamification/badges/${participantId}`);
    return data;
}

/**
 * Get leaderboard for a workshop (accepts PIN or workshop ID)
 */
export async function getWorkshopLeaderboard(identifier: string): Promise<LeaderboardResponse> {
    const { data } = await api.get(`gamification/workshops/${identifier}/leaderboard`);
    return data;
}
