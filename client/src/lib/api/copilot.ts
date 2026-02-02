/**
 * API client for US16: AI Copilot Assistant
 * @module copilot
 */
import { api } from '../api';

// ============================================================================
// Types
// ============================================================================

export interface SuggestionAction {
    label: string;
    action: string;
}

export interface Suggestion {
    id?: string;
    type: string;
    message: string;
    priority: string;
    actions: SuggestionAction[];
    context?: Record<string, unknown>;
    created_at?: string;
}

export interface SuggestionsResponse {
    suggestions: Suggestion[];
    mode: string;
    workshop_phase?: string;
}

export interface ParticipantAlert {
    type: string;
    message: string;
}

export interface ParticipantEngagementMetrics {
    id: string;
    name: string;
    engagement_score: number;
    vote_count: number;
    submission_count: number;
    last_activity?: string;
    alerts: ParticipantAlert[];
}

export interface GroupEngagementMetrics {
    avg_engagement: number;
    at_risk_count: number;
    total_participants: number;
}

export interface EngagementResponse {
    participants: ParticipantEngagementMetrics[];
    group_metrics: GroupEngagementMetrics;
}

export interface CriterionVariance {
    mean: number;
    std_dev: number;
}

export interface VarianceAnalysisResponse {
    use_case_id: string;
    vote_count: number;
    mean?: number;
    std_dev: number;
    is_significant: boolean;
    is_bimodal?: boolean;
    distribution: Record<string, number>;
    by_criterion?: Record<string, CriterionVariance>;
    recommendation?: {
        action: string;
        message: string;
    };
}

export interface DiscussionPrompt {
    category: string;
    question: string;
    follow_up?: string;
}

export interface DiscussionPromptsResponse {
    prompts: DiscussionPrompt[];
    use_case_id: string;
    use_case_title?: string;
}

export interface TopRecommendation {
    title: string;
    score?: number;
    rationale?: string;
}

export interface ParticipantStats {
    total: number;
    avg_engagement: number;
    at_risk: number;
}

export interface SummaryContent {
    format: string;
    generated_at: string;
    is_mock: boolean;
    executive_summary: string;
    key_findings: string[];
    top_recommendations: TopRecommendation[];
    next_steps: string[];
    participant_stats: ParticipantStats;
}

export interface GenerateSummaryResponse {
    summary: SummaryContent;
    download_url?: string;
}

export interface Anomaly {
    type: string;
    severity: string;
    details: Record<string, unknown>;
    recommendation?: string;
}

export interface DetectAnomaliesResponse {
    anomalies: Anomaly[];
    data_type: string;
    workshop_id: string;
}

export interface QualityScore {
    completeness: number;
    clarity: number;
    technical_depth: number;
    overall: number;
}

export interface EnhanceContentResponse {
    enhanced: Record<string, unknown>;
    quality_score: QualityScore;
    improvements_made: string[];
}

export interface CopilotSettingsData {
    workshop_id: string;
    mode: string;
    engagement_alerts_enabled: boolean;
    voting_anomaly_alerts_enabled: boolean;
    content_suggestions_enabled: boolean;
    discussion_prompts_enabled: boolean;
    inactivity_threshold_minutes: number;
    variance_alert_threshold: number;
    rapid_voting_threshold_seconds: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get contextual AI suggestions for the workshop
 */
export async function getSuggestions(
    workshopId: string,
    contextType: 'proactive' | 'reactive' = 'proactive'
): Promise<SuggestionsResponse> {
    const response = await api.post('copilot/suggestions', {
        workshop_id: workshopId,
        context_type: contextType,
    });
    return response.data;
}

/**
 * Dismiss or mark a suggestion as acted upon
 */
export async function dismissSuggestion(
    suggestionId: string,
    action: 'dismiss' | 'acted_upon' = 'dismiss'
): Promise<{ success: boolean; status: string }> {
    const response = await api.post('copilot/suggestions/dismiss', {
        suggestion_id: suggestionId,
        action,
    });
    return response.data;
}

/**
 * Get participant engagement metrics
 */
export async function getEngagement(workshopId: string): Promise<EngagementResponse> {
    const response = await api.get(`copilot/engagement/${workshopId}`);
    return response.data;
}

/**
 * Analyze voting variance for a use case
 */
export async function analyzeVariance(
    useCaseId: string,
    workshopId: string
): Promise<VarianceAnalysisResponse> {
    const response = await api.post('copilot/analyze-variance', {
        use_case_id: useCaseId,
        workshop_id: workshopId,
    });
    return response.data;
}

/**
 * Get AI-generated discussion prompts for a use case
 */
export async function getDiscussionPrompts(
    useCaseId: string,
    workshopId?: string
): Promise<DiscussionPromptsResponse> {
    const params = workshopId ? `?workshop_id=${workshopId}` : '';
    const response = await api.get(`copilot/discussion-prompts/${useCaseId}${params}`);
    return response.data;
}

/**
 * Enhance use case content with AI suggestions
 */
export async function enhanceContent(
    content: { title?: string; description?: string; kpi?: string },
    context?: { industry?: string; workshop_goals?: string }
): Promise<EnhanceContentResponse> {
    const response = await api.post('copilot/enhance-content', {
        content,
        context,
    });
    return response.data;
}

/**
 * Generate workshop summary
 */
export async function generateSummary(
    workshopId: string,
    format: 'executive' | 'detailed' | 'email' | 'slides' = 'executive',
    sections?: string[]
): Promise<GenerateSummaryResponse> {
    const response = await api.post('copilot/generate-summary', {
        workshop_id: workshopId,
        format,
        sections,
    });
    return response.data;
}

/**
 * Detect anomalies in workshop data
 */
export async function detectAnomalies(
    workshopId: string,
    dataType: 'votes' | 'content' | 'behavior' | 'all' = 'all'
): Promise<DetectAnomaliesResponse> {
    const response = await api.post('copilot/detect-anomalies', {
        workshop_id: workshopId,
        data_type: dataType,
    });
    return response.data;
}

/**
 * Get copilot settings for a workshop
 */
export async function getSettings(workshopId: string): Promise<CopilotSettingsData> {
    const response = await api.get(`copilot/settings/${workshopId}`);
    return response.data;
}

/**
 * Update copilot settings for a workshop
 */
export async function updateSettings(
    workshopId: string,
    settings: Partial<{
        mode: 'proactive' | 'reactive' | 'silent';
        engagement_alerts_enabled: boolean;
        voting_anomaly_alerts_enabled: boolean;
        content_suggestions_enabled: boolean;
        discussion_prompts_enabled: boolean;
        inactivity_threshold_minutes: number;
        variance_alert_threshold: number;
        rapid_voting_threshold_seconds: number;
    }>
): Promise<CopilotSettingsData> {
    const response = await api.put(`copilot/settings/${workshopId}`, {
        workshop_id: workshopId,
        ...settings,
    });
    return response.data;
}
