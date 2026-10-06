import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface PrioritizationScaleProps {
    criterion: string;
    useCases: any[];
    scores: Record<string, Record<string, number>>; // useCaseId -> { criterionName -> score }
    onScoreChange?: (useCaseId: string, score: number) => void;
    participants?: any[]; // For facilitator view: [{id, name, color, scores: {useCaseId -> score}}]
    readOnly?: boolean;
}


export function PrioritizationScale({
    criterion,
    useCases,
    scores,
    onScoreChange,
    participants,
    readOnly = false
}: PrioritizationScaleProps) {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const [mobileScoreTarget, setMobileScoreTarget] = useState<any | null>(null);


    const allScores: number[] = [];
    Object.values(scores).forEach(s => {
        Object.values(s).forEach(v => {
            if (v !== undefined && v !== -1) allScores.push(v);
        });
    });
    participants?.forEach(p => {
        Object.values(p.scores || {}).forEach((v: any) => {
            if (v !== undefined && v !== -1) allScores.push(v);
        });
    });

    const hasLegacyData = allScores.length > 0 && allScores.every(s => s <= 10);

    const scale = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    const handleDragOver = (e: React.DragEvent) => {
        if (readOnly) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, score: number) => {
        if (readOnly || !onScoreChange) return;
        e.preventDefault();
        const useCaseId = e.dataTransfer.getData('text/plain');
        if (useCaseId) {
            onScoreChange(useCaseId, score);
        }
    };

    const getUseCasesInBox = (boxScore: number) => {
        if (boxScore === -1) {
            return useCases.filter(uc => scores[uc.id]?.[criterion] === -1);
        }

        return useCases.filter(uc => {
            let s = scores[uc.id]?.[criterion];
            if (s === undefined || s <= 0) return false;

            if (hasLegacyData || (s <= 10 && allScores.some(val => val > 10))) {
                s = s * 10;
            }

            return s <= boxScore && s > (boxScore - 10);
        });
    };

    const handleMobileScoreSelect = (score: number) => {
        if (!mobileScoreTarget || !onScoreChange) return;
        onScoreChange(mobileScoreTarget.id, score);
        setMobileScoreTarget(null);
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between px-2">
                <span className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">{t('participantMatrix.lowCriterion', { criterion })}</span>
                <span className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">{t('participantMatrix.highCriterion', { criterion })}</span>
            </div>

            {/* Desktop: 10-column grid */}
            <div className="hidden md:grid grid-cols-10 gap-2 h-[450px]">
                {scale.map((num) => (
                    <div
                        key={num}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, num)}
                        className={`flex flex-col rounded-xl border-2 border-dashed transition-all p-2 relative ${theme === 'light'
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-surface-800/30 border-white/5'
                            } hover:border-brand-violet/30`}
                    >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-violet text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                            {num}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pt-4 scrollbar-hide">
                            {getUseCasesInBox(num).map((uc) => (
                                <div
                                    key={uc.id}
                                    title={`${uc.title} (Score: ${scores[uc.id]?.[criterion]})`}
                                    className={`p-2 rounded-lg border text-xs shadow-sm ${theme === 'light'
                                        ? 'bg-white border-gray-200 text-gray-900'
                                        : 'bg-surface-700 border-white/10 text-white'
                                        }`}
                                >
                                    <div className="font-semibold line-clamp-2">{uc.title}</div>
                                </div>
                            ))}

                            {participants && (
                                <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t theme-border">
                                    {participants.map(p => {
                                        let pScore = p.scores?.[criterion];
                                        if (pScore === undefined || pScore <= 0) return null;

                                        if (hasLegacyData || (pScore <= 10 && allScores.some(val => val > 10))) {
                                            pScore = pScore * 10;
                                        }

                                        const isInBox = pScore <= num && pScore > (num - 10);

                                        if (isInBox) {
                                            return (
                                                <div
                                                    key={`${p.id}-${p.useCaseId}`}
                                                    className="w-3 h-3 rounded-full border border-white shadow-sm"
                                                    style={{ backgroundColor: p.color || '#8b5cf6' }}
                                                    title={t('participantMatrix.participantScore', { name: p.name, score: pScore, title: p.useCaseTitle || t('participantMatrix.useCase') })}
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Mobile: 5-column compact grid (visual overview only) */}
            <div className="md:hidden grid grid-cols-5 gap-1.5">
                {scale.map((num) => {
                    const itemsInBox = getUseCasesInBox(num);
                    return (
                        <div
                            key={num}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, num)}
                            className={`rounded-lg border-2 border-dashed transition-all p-1.5 relative min-h-[60px] ${theme === 'light'
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-surface-800/30 border-white/5'
                                } ${itemsInBox.length > 0 ? 'border-brand-violet/30 bg-brand-violet/5' : ''}`}
                        >
                            <div className="text-center mb-1">
                                <span className="bg-brand-violet text-white text-[9px] font-bold px-1.5 py-px rounded-full">
                                    {num}
                                </span>
                            </div>
                            <div className="space-y-1">
                                {itemsInBox.map((uc) => (
                                    <div
                                        key={uc.id}
                                        className={`px-1.5 py-1 rounded text-[10px] font-medium truncate ${theme === 'light'
                                            ? 'bg-white border border-gray-200 text-gray-900'
                                            : 'bg-surface-700 border border-white/10 text-white'
                                            }`}
                                    >
                                        {uc.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* "Does Not Know" Section */}
            <div className="pt-4 border-t theme-border">
                <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, -1)}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 border-dashed transition-all ${theme === 'light'
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-surface-800/30 border-white/5'
                        } hover:border-semantic-warning/30`}
                >
                    <div className="flex flex-col min-w-[100px] sm:min-w-[120px]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase theme-text-secondary">{t('participantMatrix.unsure')}</span>
                        <span className="text-xs sm:text-sm font-bold text-semantic-warning">{t('participantMatrix.doesNotKnow')}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 flex-1 items-center">
                        {getUseCasesInBox(-1).length === 0 && (
                            <span className="text-[10px] sm:text-xs theme-text-muted italic">
                                <span className="hidden sm:inline">{t('participantMatrix.dragUnsure')}</span>
                                <span className="sm:hidden">{t('participantMatrix.tapUnsure')}</span>
                            </span>
                        )}
                        {getUseCasesInBox(-1).map((uc) => (
                            <div
                                key={uc.id}
                                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs shadow-sm flex items-center gap-2 ${theme === 'light'
                                    ? 'bg-white border-gray-200 text-gray-900'
                                    : 'bg-surface-700 border-white/10 text-white'
                                    }`}
                            >
                                <span className="font-semibold">{uc.title}</span>
                            </div>
                        ))}
                    </div>

                    {participants && (
                        <div className="flex items-center gap-1 sm:border-l theme-border sm:pl-4">
                            {participants.map(p => {
                                const pScore = p.scores?.[criterion];
                                if (pScore === -1) {
                                    return (
                                        <div
                                            key={p.id}
                                            className="w-3 h-3 rounded-full border border-white"
                                            style={{ backgroundColor: p.color || '#8b5cf6' }}
                                            title={p.name}
                                        />
                                    );
                                }
                                return null;
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Score Selector Modal */}
            {mobileScoreTarget && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
                    onClick={() => setMobileScoreTarget(null)}
                >
                    <div
                        className={`w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border overflow-hidden ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-4 pt-4 pb-2">
                            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
                            <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                {t('participantMatrix.rate', { title: mobileScoreTarget.title })}
                            </h3>
                            {mobileScoreTarget.description && (
                                <p className={`text-xs mt-1 line-clamp-2 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {mobileScoreTarget.description}
                                </p>
                            )}
                            <p className={`text-[10px] mt-2 uppercase tracking-wider font-semibold ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {criterion}
                            </p>
                        </div>

                        <div className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-[10px] font-semibold theme-text-secondary uppercase">{t('participantMatrix.low')}</span>
                                <span className="text-[10px] font-semibold theme-text-secondary uppercase">{t('participantMatrix.high')}</span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {scale.map((num) => {
                                    const currentScore = scores[mobileScoreTarget.id]?.[criterion];
                                    const isActive = currentScore !== undefined && currentScore > (num - 10) && currentScore <= num;
                                    return (
                                        <button
                                            key={num}
                                            onClick={() => handleMobileScoreSelect(num)}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                                ? 'bg-brand-violet text-white shadow-lg scale-105 ring-2 ring-brand-violet/40'
                                                : theme === 'light'
                                                    ? 'bg-gray-100 text-gray-700 hover:bg-brand-violet/10 hover:text-brand-violet active:scale-95'
                                                    : 'bg-surface-700 text-gray-300 hover:bg-brand-violet/20 hover:text-white active:scale-95'
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={`px-4 py-3 flex gap-2 border-t ${theme === 'light' ? 'border-gray-100' : 'border-white/5'}`}>
                            <button
                                onClick={() => handleMobileScoreSelect(-1)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${theme === 'light'
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95'
                                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-95'
                                    }`}
                            >
                                {t('participantMatrix.unsureDontKnow')}
                            </button>
                            <button
                                onClick={() => setMobileScoreTarget(null)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${theme === 'light'
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    : 'bg-surface-700 text-gray-400 hover:bg-surface-600'
                                    }`}
                            >
                                {t('participantMatrix.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export type { PrioritizationScaleProps };
