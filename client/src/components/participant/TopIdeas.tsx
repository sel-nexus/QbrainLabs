import { useEffect, useState } from 'react';
import { Loader2, Trophy } from 'lucide-react';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/apiErrors';
import { useTranslation } from 'react-i18next';

interface Result {
    id: string;
    title: string;
    total_score?: number | null;
}

/** Read-only ranking shown to participants once results are revealed. */
export function TopIdeas({ workshopId, limit = 10 }: { workshopId: string; limit?: number }) {
    const { t } = useTranslation();
    const [results, setResults] = useState<Result[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        api.get<Result[]>(`results/${workshopId}`)
            .then(({ data }) => {
                if (cancelled) return;
                const ranked = [...(data || [])].sort((a, b) => (Number(b.total_score) || 0) - (Number(a.total_score) || 0));
                setResults(ranked.slice(0, limit));
            })
            .catch((e) => {
                if (!cancelled) setError(errorMessage(e, t('topIdeas.loadFailed')));
            });
        return () => {
            cancelled = true;
        };
    }, [workshopId, limit, t]);

    if (error) return <p role="alert" className="text-sm text-semantic-danger">{error}</p>;
    if (!results) {
        return (
            <div className="flex items-center gap-2 theme-text-secondary" role="status">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {t('topIdeas.loading')}
            </div>
        );
    }
    if (results.length === 0) return <p className="text-sm theme-text-secondary">{t('topIdeas.empty')}</p>;

    return (
        <ol className="space-y-2" aria-label={t('topIdeas.label')}>
            {results.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 p-3 rounded-lg theme-bg-tertiary">
                    <span className={`w-8 text-right font-bold ${i < 3 ? 'text-brand-violet' : 'theme-text-secondary'}`}>
                        {i === 0 ? <Trophy className="w-5 h-5 inline" aria-label={t('topIdeas.first')} /> : `#${i + 1}`}
                    </span>
                    <span className="flex-1 font-medium theme-text-primary">{r.title}</span>
                    <span className="font-mono text-sm theme-text-secondary">
                        {r.total_score != null ? Number(r.total_score).toFixed(0) : '–'}
                    </span>
                </li>
            ))}
        </ol>
    );
}
