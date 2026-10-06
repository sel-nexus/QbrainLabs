import { Plus, Scale, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { type Criterion, type CriteriaAxes, distributeEvenly, matrixAxes, totalWeight, validateCriteria } from '../../lib/criteria';

interface CriteriaEditorProps {
    criteria: Criterion[];
    onChange: (criteria: Criterion[]) => void;
    axes: CriteriaAxes;
    onAxesChange: (axes: CriteriaAxes) => void;
    /** Show completeness errors (e.g. after a submit attempt). Weight total is always shown. */
    showErrors?: boolean;
    disabled?: boolean;
}

/**
 * Criteria, weights and matrix axes. Weights can be balanced in one click,
 * adding a criterion rebalances automatically, and the facilitator chooses
 * which criteria go on the matrix axes instead of relying on keyword guesses.
 */
export function CriteriaEditor({ criteria, onChange, axes, onAxesChange, showErrors = false, disabled = false }: CriteriaEditorProps) {
    const errors = validateCriteria(criteria, axes);
    const total = totalWeight(criteria);
    const names = criteria.map((c) => c.name.trim()).filter(Boolean);
    const inferred = matrixAxes(names);

    const update = (index: number, patch: Partial<Criterion>) => {
        const before = criteria[index].name;
        const next = criteria.map((c, i) => (i === index ? { ...c, ...patch } : c));
        onChange(next);
        // Keep an axis pointing at the same criterion when it's renamed.
        if (patch.name !== undefined && (axes.x_axis === before || axes.y_axis === before)) {
            onAxesChange({
                x_axis: axes.x_axis === before ? patch.name : axes.x_axis,
                y_axis: axes.y_axis === before ? patch.name : axes.y_axis,
            });
        }
    };

    const remove = (index: number) => {
        const removed = criteria[index].name;
        onChange(criteria.filter((_, i) => i !== index));
        if (axes.x_axis === removed || axes.y_axis === removed) onAxesChange({ x_axis: null, y_axis: null });
    };

    const add = () => onChange(distributeEvenly([...criteria, { name: '', weight: 0 }]));

    const setAxis = (key: 'x_axis' | 'y_axis', value: string) => {
        onAxesChange({ ...axes, [key]: value || null });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-sm font-medium theme-text-secondary" id="criteria-label">Scoring criteria</span>
                <div className="flex items-center gap-3">
                    <Button type="button" variant="ghost" className="h-8 px-3 text-sm" onClick={() => onChange(distributeEvenly(criteria))} disabled={disabled || !criteria.length}>
                        <Scale className="w-4 h-4 mr-1" aria-hidden="true" /> Distribute evenly
                    </Button>
                    <span className={`text-sm font-mono font-semibold ${total === 100 ? 'text-semantic-success' : 'text-semantic-warning'}`} aria-live="polite">
                        Total: {total}%
                    </span>
                </div>
            </div>

            <div role="group" aria-labelledby="criteria-label" className="space-y-3">
                {criteria.map((c, idx) => (
                    <div key={idx}>
                        <div className="flex gap-3 items-start">
                            <input
                                aria-label={`Criterion ${idx + 1} name`}
                                aria-invalid={showErrors && !!errors[`name-${idx}`]}
                                aria-describedby={showErrors && errors[`name-${idx}`] ? `crit-err-${idx}` : undefined}
                                placeholder="Criterion name, e.g. Business value"
                                className="flex-1 px-4 py-3 rounded-lg border-2 theme-border theme-bg-primary theme-text-primary"
                                value={c.name}
                                maxLength={60}
                                disabled={disabled}
                                onChange={(e) => update(idx, { name: e.target.value })}
                            />
                            <div className="w-24 relative">
                                <input
                                    aria-label={`Criterion ${idx + 1} weight (percent)`}
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={100}
                                    className="w-full px-3 py-3 pr-7 rounded-lg border-2 theme-border theme-bg-primary theme-text-primary text-center"
                                    value={c.weight}
                                    disabled={disabled}
                                    onChange={(e) => update(idx, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm contrast-muted" aria-hidden="true">%</span>
                            </div>
                            {criteria.length > 1 && (
                                <Button type="button" variant="ghost" className="px-3 h-12" onClick={() => remove(idx)} disabled={disabled} aria-label={`Remove criterion ${c.name || idx + 1}`}>
                                    <Trash2 className="w-5 h-5 text-semantic-danger" aria-hidden="true" />
                                </Button>
                            )}
                        </div>
                        {showErrors && errors[`name-${idx}`] && (
                            <p id={`crit-err-${idx}`} className="text-xs text-semantic-danger mt-1" role="alert">{errors[`name-${idx}`]}</p>
                        )}
                    </div>
                ))}
            </div>

            <Button type="button" variant="secondary" onClick={add} className="w-full border-dashed" disabled={disabled || criteria.length >= 10}>
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Add criterion
            </Button>
            {errors.weight && <p className="text-sm text-semantic-warning font-medium" role="status">{errors.weight}</p>}

            {names.length >= 2 && (
                <fieldset className="rounded-lg border theme-border p-4 space-y-3">
                    <legend className="px-1 text-sm font-medium theme-text-secondary">Prioritization matrix axes</legend>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-sm theme-text-secondary space-y-1">
                            <span>Horizontal axis (X)</span>
                            <select
                                className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-primary theme-text-primary"
                                value={axes.x_axis || ''}
                                disabled={disabled}
                                onChange={(e) => setAxis('x_axis', e.target.value)}
                            >
                                <option value="">Automatic ({inferred.xLabel})</option>
                                {names.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                        <label className="text-sm theme-text-secondary space-y-1">
                            <span>Vertical axis (Y)</span>
                            <select
                                className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-primary theme-text-primary"
                                value={axes.y_axis || ''}
                                disabled={disabled}
                                onChange={(e) => setAxis('y_axis', e.target.value)}
                            >
                                <option value="">Automatic ({inferred.yLabel})</option>
                                {names.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                    </div>
                    {errors.axes && <p className="text-xs text-semantic-danger" role="alert">{errors.axes}</p>}
                    {(!!axes.x_axis !== !!axes.y_axis) && (
                        <p className="text-xs contrast-muted">Choose both axes to override the automatic choice.</p>
                    )}
                </fieldset>
            )}
        </div>
    );
}
