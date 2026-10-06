// Use case fields: plain-language labels, examples and limits shared by the
// create form, the edit dialog and the server (server/app/schemas/usecase.py).
import { tr } from './tr';

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

/** Plain-language labels, help and examples for business participants (translated on access). */
export const FIELDS: Record<FieldKey, { label: string; required: boolean; placeholder: string; hint?: string; example?: string }> = {
    title: {
        get label() { return tr('useCaseForm.fields.title.label', 'Give your idea a short name'); },
        required: true,
        get placeholder() { return tr('useCaseForm.fields.title.placeholder', 'e.g. Automated Customer Support'); },
    },
    target_user: {
        get label() { return tr('useCaseForm.fields.target_user.label', 'Who has this problem?'); },
        required: true,
        get placeholder() { return tr('useCaseForm.fields.target_user.placeholder', 'e.g. Support agents'); },
        get example() { return tr('useCaseForm.fields.target_user.example', 'Customer support agents in the EMEA contact centre'); },
    },
    description: {
        get label() { return tr('useCaseForm.fields.description.label', "What's the problem today?"); },
        required: true,
        get placeholder() { return tr('useCaseForm.fields.description.placeholder', 'Describe the pain point...'); },
        get hint() { return tr('useCaseForm.fields.description.hint', 'Describe what happens now and why it hurts — no technical detail needed.'); },
        get example() { return tr('useCaseForm.fields.description.example', 'Agents spend about 6 minutes per ticket searching three systems for order history, so customers wait and repeat themselves.'); },
    },
    proposed_solution: {
        get label() { return tr('useCaseForm.fields.proposed_solution.label', 'How could AI help?'); },
        required: false,
        get placeholder() { return tr('useCaseForm.fields.proposed_solution.placeholder', 'How does AI solve it?'); },
        get hint() { return tr('useCaseForm.fields.proposed_solution.hint', "Optional — it's fine to leave this for the IT team."); },
        get example() { return tr('useCaseForm.fields.proposed_solution.example', 'An assistant that summarises the customer history and suggests a reply while the agent reads the ticket.'); },
    },
    kpi: {
        get label() { return tr('useCaseForm.fields.kpi.label', 'How would we measure success?'); },
        required: true,
        get placeholder() { return tr('useCaseForm.fields.kpi.placeholder', 'e.g. Reduce handle time by 20%'); },
        get example() { return tr('useCaseForm.fields.kpi.example', 'Average handle time drops from 9 to 6 minutes'); },
    },
};

export const FIELD_ORDER: FieldKey[] = ['title', 'target_user', 'description', 'proposed_solution', 'kpi'];

export function validateUseCase(data: Partial<UseCaseFields>): Partial<Record<FieldKey, string>> {
    const errors: Partial<Record<FieldKey, string>> = {};
    for (const key of FIELD_ORDER) {
        const value = (data[key] || '').trim();
        if (FIELDS[key].required && !value) errors[key] = tr('useCaseForm.errors.required', 'Please fill this in');
        else if (value.length > FIELD_LIMITS[key]) errors[key] = tr('useCaseForm.errors.tooLong', 'Keep it under {{max}} characters', { max: FIELD_LIMITS[key] });
    }
    return errors;
}

