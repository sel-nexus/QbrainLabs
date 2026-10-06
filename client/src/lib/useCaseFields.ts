// Use case fields: plain-language labels, examples and limits shared by the
// create form, the edit dialog and the server (server/app/schemas/usecase.py).

export interface UseCaseFields {
    title: string;
    description: string;
    proposed_solution: string;
    kpi: string;
    target_user: string;
}

export type FieldKey = 'title' | 'target_user' | 'description' | 'proposed_solution' | 'kpi';

// Limits shared with the server (server/app/schemas/usecase.py).
export const FIELD_LIMITS: Record<FieldKey, number> = {
    title: 200,
    target_user: 300,
    description: 2000,
    proposed_solution: 2000,
    kpi: 300,
};

/** Plain-language labels, help and examples for business participants. */
export const FIELDS: Record<FieldKey, { label: string; required: boolean; placeholder: string; hint?: string; example?: string }> = {
    title: {
        label: 'Give your idea a short name',
        required: true,
        placeholder: 'e.g. Automated Customer Support',
    },
    target_user: {
        label: 'Who has this problem?',
        required: true,
        placeholder: 'e.g. Support agents',
        example: 'Customer support agents in the EMEA contact centre',
    },
    description: {
        label: "What's the problem today?",
        required: true,
        placeholder: 'Describe the pain point...',
        hint: 'Describe what happens now and why it hurts — no technical detail needed.',
        example: 'Agents spend about 6 minutes per ticket searching three systems for order history, so customers wait and repeat themselves.',
    },
    proposed_solution: {
        label: 'How could AI help?',
        required: false,
        placeholder: 'How does AI solve it?',
        hint: "Optional — it's fine to leave this for the IT team.",
        example: 'An assistant that summarises the customer history and suggests a reply while the agent reads the ticket.',
    },
    kpi: {
        label: 'How would we measure success?',
        required: true,
        placeholder: 'e.g. Reduce handle time by 20%',
        example: 'Average handle time drops from 9 to 6 minutes',
    },
};

export const FIELD_ORDER: FieldKey[] = ['title', 'target_user', 'description', 'proposed_solution', 'kpi'];

export function validateUseCase(data: Partial<UseCaseFields>): Partial<Record<FieldKey, string>> {
    const errors: Partial<Record<FieldKey, string>> = {};
    for (const key of FIELD_ORDER) {
        const value = (data[key] || '').trim();
        if (FIELDS[key].required && !value) errors[key] = 'Please fill this in';
        else if (value.length > FIELD_LIMITS[key]) errors[key] = `Keep it under ${FIELD_LIMITS[key]} characters`;
    }
    return errors;
}

