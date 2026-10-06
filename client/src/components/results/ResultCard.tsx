import { Calculator } from 'lucide-react';
import { Button } from '../ui/Button';
import {
    CONSENSUS_CLASSES,
    CONSENSUS_LABELS,
    QUADRANT_COLORS,
    QUADRANT_LABELS,
    type RankedResult,
} from '../../lib/results';

interface ResultCardProps {
    result: RankedResult;
    criteriaOrder?: string[];
    onCalculateROI?: () => void;
}

const fmt = (n: number, max: number) => (max <= 10 ? n.toFixed(1) : Math.round(n).toString());

/**
 * One ranked use case: rank (ties marked), score out of 100, consensus badge,
 * quadrant and per-criterion averages on the scale they were scored on.
 */
export function ResultCard({ result: r, criteriaOrder = [], onCalculateROI }: ResultCardProps) {
    const scaleMax = r.scale_max || 100;
    const scored = r.vote_count > 0;
    const criteria = [
        ...criteriaOrder.filter((c) => c in (r.scores || {})),
        ...Object.keys(r.scores || {}).filter((c) => !criteriaOrder.includes(c)),
    ];

    return (
        <article aria-label={`${r.rank ? `Rank ${r.rank}` : 'Unranked'}: ${r.title}`} className="p-4 rounded-xl border theme-border theme-bg-secondary flex flex-col gap-3">
            <div className="flex items-start gap-3">
                <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold ${r.rank === 1 ? 'bg-brand-violet text-white' : 'bg-brand-violet/10 text-brand-violet'}`}>
                    <span className="text-lg leading-none">{r.rank ? `#${r.rank}` : '–'}</span>
                    {r.tied && <span className="text-[9px] font-semibold uppercase leading-none mt-0.5">tie</span>}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold theme-text-primary">{r.title}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {r.quadrant && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: QUADRANT_COLORS[r.quadrant], backgroundColor: `${QUADRANT_COLORS[r.quadrant]}1a` }}>
                                {QUADRANT_LABELS[r.quadrant]}
                            </span>
                        )}
                        {scored && (
                            r.consensus_level ? (
                                <span
                                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CONSENSUS_CLASSES[r.consensus_level]}`}
                                    title={r.agreement != null ? `Agreement ${Math.round(r.agreement)}%` : undefined}
                                >
                                    {CONSENSUS_LABELS[r.consensus_level]}
                                </span>
                            ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-full theme-bg-tertiary contrast-muted">Not enough scores for consensus</span>
                            )
                        )}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-2xl font-mono font-bold text-brand-violet">{scored ? Math.round(r.normalized_score ?? 0) : '–'}</div>
                    <div className="text-[10px] contrast-muted">{scored ? 'score / 100' : 'not scored'}</div>
                </div>
            </div>

            {criteria.length > 0 && (
                <dl className="text-xs space-y-1">
                    {criteria.map((name) => (
                        <div key={name} className="flex justify-between gap-2">
                            <dt className="theme-text-secondary truncate">{name}</dt>
                            <dd className="font-mono theme-text-primary">{fmt(r.scores[name], scaleMax)} <span className="contrast-muted">/ {scaleMax}</span></dd>
                        </div>
                    ))}
                    <div className="flex justify-between gap-2 pt-1 contrast-muted">
                        <dt>Scores received</dt>
                        <dd className="font-mono">{r.vote_count}</dd>
                    </div>
                </dl>
            )}

            {onCalculateROI && (
                <Button variant="secondary" className="w-full h-8 text-xs mt-auto" onClick={onCalculateROI}>
                    <Calculator className="w-3 h-3 mr-1" aria-hidden="true" /> Calculate ROI
                </Button>
            )}
        </article>
    );
}
