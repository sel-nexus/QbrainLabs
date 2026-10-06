import i18n from 'i18next';

/**
 * Translate outside React components (shared constants, helpers). The English
 * text is the fallback until translations load; keep it identical to
 * public/locales/en/translation.json.
 */
export function tr(key: string, english: string, options?: Record<string, unknown>): string {
    return i18n.isInitialized ? i18n.t(key, { defaultValue: english, ...options }) : english.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(options?.[k] ?? ''));
}
