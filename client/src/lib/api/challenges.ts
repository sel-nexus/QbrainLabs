/**
 * Challenge Cards API Functions (US34)
 */

import { api } from '../api';

export interface ChallengeCard {
  id: string;
  workshop_id: string;
  title: string;
  challenge_description: string;
  success_criteria: string[];
  display_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChallengeCardCreate {
  title: string;
  challenge_description: string;
  success_criteria: string[];
  display_order?: number;
}

export interface ChallengeCardUpdate {
  title?: string;
  challenge_description?: string;
  success_criteria?: string[];
  display_order?: number;
}

export interface StepGenerationRequest {
  include_workshop_context?: boolean;
  include_previous_steps?: boolean;
  format?: 'markdown' | 'text' | 'pdf';
}

export interface StepGenerationResponse {
  step_number: number;
  step_name: string;
  content: string;
  generated_at: string;
  format: string;
}

export interface GenerateAllStepsRequest {
  type: 'prompt' | 'summary';
  include_workshop_context?: boolean;
  steps?: number[];
  format?: 'markdown' | 'text' | 'pdf';
}

export interface GenerateAllStepsResponse {
  challenge_id: string;
  generated_steps: StepGenerationResponse[];
  generated_at: string;
}

export const challengesApi = {
  /**
   * List all challenge cards for a workshop
   */
  list: async (workshopId: string): Promise<ChallengeCard[]> => {
    const response = await api.get(`challenges/workshops/${workshopId}/challenges`);
    return response.data;
  },

  /**
   * Get a single challenge card by ID
   */
  get: async (challengeId: string): Promise<ChallengeCard> => {
    const response = await api.get(`challenges/${challengeId}`);
    return response.data;
  },

  /**
   * Create a new challenge card
   */
  create: async (workshopId: string, data: ChallengeCardCreate): Promise<ChallengeCard> => {
    const response = await api.post(`challenges/workshops/${workshopId}/challenges`, data);
    return response.data;
  },

  /**
   * Update a challenge card
   */
  update: async (challengeId: string, data: ChallengeCardUpdate): Promise<ChallengeCard> => {
    const response = await api.put(`challenges/${challengeId}`, data);
    return response.data;
  },

  /**
   * Delete a challenge card
   */
  delete: async (challengeId: string): Promise<void> => {
    await api.delete(`challenges/${challengeId}`);
  },

  /**
   * Reorder a challenge card
   */
  reorder: async (challengeId: string, displayOrder: number): Promise<ChallengeCard> => {
    const response = await api.patch(`challenges/${challengeId}/reorder`, {
      display_order: displayOrder
    });
    return response.data;
  },

  /**
   * Generate a prompt for a specific step
   */
  generateStepPrompt: async (
    challengeId: string,
    stepNumber: number,
    options?: StepGenerationRequest
  ): Promise<StepGenerationResponse> => {
    const response = await api.post(
      `challenges/${challengeId}/steps/${stepNumber}/generate-prompt`,
      options || {}
    );
    return response.data;
  },

  /**
   * Generate a one-slide summary for a specific step
   */
  generateStepSummary: async (
    challengeId: string,
    stepNumber: number,
    options?: StepGenerationRequest
  ): Promise<StepGenerationResponse> => {
    const response = await api.post(
      `challenges/${challengeId}/steps/${stepNumber}/generate-summary`,
      options || {}
    );
    return response.data;
  },

  /**
   * Generate prompts or summaries for multiple steps at once
   */
  generateAllSteps: async (
    challengeId: string,
    options: GenerateAllStepsRequest
  ): Promise<GenerateAllStepsResponse> => {
    const response = await api.post(
      `challenges/${challengeId}/steps/generate-all`,
      options
    );
    return response.data;
  },

  /**
   * Generate prompts for all six steps from a plain challenge description (no stored card needed)
   */
  generateStandalonePrompts: async (
    challengeDescription: string,
    customerName?: string,
    customerAbout?: string,
  ): Promise<StepGenerationResponse[]> => {
    const response = await api.post('challenges/standalone/generate-prompts', {
      challenge_description: challengeDescription,
      customer_name: customerName ?? '',
      customer_about: customerAbout ?? '',
    });
    return response.data.steps as StepGenerationResponse[];
  },

  /**
   * Upload and analyze a file to generate challenge cards
   */
  analyzeFile: async (file: File): Promise<ChallengeCardCreate[]> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('ai/analyze-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};
