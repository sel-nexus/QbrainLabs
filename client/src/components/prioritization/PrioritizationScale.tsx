import { useTheme } from '../../context/ThemeContext';

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

    // Unified 1-100 scaling across all categories
    const isScale100 = true;

    // Check if we have legacy 1-10 data that needs visual help
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

    // For 100-point UI: [10, 20, ..., 100] (as buckets)
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

    // Filter use cases that belong to this score or bucket
    const getUseCasesInBox = (boxScore: number) => {
        if (boxScore === -1) {
            return useCases.filter(uc => scores[uc.id]?.[criterion] === -1);
        }

        return useCases.filter(uc => {
            let s = scores[uc.id]?.[criterion];
            if (s === undefined || s <= 0) return false;

            // Robust rescaling for legacy 1-10 data
            // If the workshop is detected as legacy (only scores <= 10 everywhere)
            // or if THIS specific score is <= 10 while others are > 10,
            // we treat it as a 10-point score that needs x10 rescaling for the 1-100 grid.
            if (hasLegacyData || (s <= 10 && allScores.some(val => val > 10))) {
                s = s * 10;
            }

            return s <= boxScore && s > (boxScore - 10);
        });
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between px-2">
                <span className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Low {criterion}</span>
                <span className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">High {criterion}</span>
            </div>

            <div className="grid grid-cols-10 gap-2 h-[450px]">
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
                            {isScale100 ? `≤${num}` : num}
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

                            {/* Participant Dots for Facilitator */}
                            {participants && (
                                <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t theme-border">
                                    {participants.map(p => {
                                        let pScore = p.scores?.[criterion];
                                        if (pScore === undefined || pScore <= 0) return null;

                                        // Apply same rescaling logic to participant dots
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
                                                    title={`${p.name} - ${pScore} on ${p.useCaseTitle || 'Use Case'}`}
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

            {/* "Does Not Know" Section */}
            <div className="pt-4 border-t theme-border">
                <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, -1)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all ${theme === 'light'
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-surface-800/30 border-white/5'
                        } hover:border-semantic-warning/30`}
                >
                    <div className="flex flex-col min-w-[120px]">
                        <span className="text-xs font-bold uppercase theme-text-secondary">Unsure</span>
                        <span className="text-sm font-bold text-semantic-warning">Does Not Know</span>
                    </div>

                    <div className="flex flex-wrap gap-2 flex-1 items-center">
                        {getUseCasesInBox(-1).length === 0 && (
                            <span className="text-xs theme-text-muted italic">Drag here if you are unsure about the priority</span>
                        )}
                        {getUseCasesInBox(-1).map((uc) => (
                            <div
                                key={uc.id}
                                className={`px-3 py-1.5 rounded-lg border text-xs shadow-sm flex items-center gap-2 ${theme === 'light'
                                    ? 'bg-white border-gray-200 text-gray-900'
                                    : 'bg-surface-700 border-white/10 text-white'
                                    }`}
                            >
                                <span className="font-semibold">{uc.title}</span>
                            </div>
                        ))}
                    </div>

                    {/* Participant Dots for Facilitator in DNK area */}
                    {participants && (
                        <div className="flex items-center gap-1 border-l theme-border pl-4">
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
        </div>
    );
}
