// Extract a human-readable message from an API error body.
//
// The backend's error handler always responds with
//   {success: false, error: {code, message, details}}
// (details.errors = pydantic validation errors, details.fields = per-field
// messages). Older code expected FastAPI's default {detail: ...}; both
// shapes are handled so every screen shows the real reason.

type ValidationItem = { field?: string; message?: string; msg?: string };

export function apiErrorText(body: unknown): string {
    if (!body || typeof body !== 'object') return '';
    const b = body as Record<string, unknown>;

    const detail = b.detail;
    if (typeof detail === 'string' && detail) return detail;
    if (Array.isArray(detail) && detail.length) {
        return (detail as ValidationItem[]).map((d) => d.msg || d.message || String(d)).join('; ');
    }

    const error = b.error as { message?: string; details?: { errors?: ValidationItem[]; fields?: Record<string, string> } } | undefined;
    if (error && typeof error === 'object') {
        const fields = error.details?.fields;
        const firstField = fields && Object.values(fields).find((v) => typeof v === 'string' && v);
        const firstValidation = error.details?.errors?.find((e) => e.message || e.msg);
        if (firstValidation && (!error.message || error.message === 'Request validation failed')) {
            const name = (firstValidation.field || '').split('.').pop();
            const text = (firstValidation.message || firstValidation.msg || '').replace(/^Value error, /, '');
            return name && name !== 'body' ? `${name}: ${text}` : text;
        }
        if (error.message) return error.message;
        if (firstField) return firstField;
    }

    return typeof b.message === 'string' ? b.message : '';
}

/** Best message for an axios (or any) error: network/timeout diagnostics, then the server's reason. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
    const e = err as {
        networkError?: { message?: string };
        response?: { data?: unknown };
        message?: string;
    } | null;
    if (!e) return fallback;
    if (e.networkError?.message) return e.networkError.message;
    const fromBody = apiErrorText(e.response?.data);
    if (fromBody) return fromBody;
    if (!e.response && e.message && !/^Request failed with status code/.test(e.message)) return e.message;
    return fallback;
}
