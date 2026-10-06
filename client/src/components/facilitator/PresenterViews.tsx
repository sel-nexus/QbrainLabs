import { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Maximize2 } from 'lucide-react';
import { ResultsChart } from '../ResultsChart';

function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    else document.documentElement.requestFullscreen?.().catch(() => undefined);
}

/** Full-screen overlay with Esc to close and F for browser fullscreen. */
function PresenterShell({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
    const closeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
                onClose();
            } else if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey) {
                toggleFullscreen();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[70] bg-white text-gray-900 flex flex-col">
            <div className="flex justify-end gap-2 p-4">
                <button type="button" onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Toggle full screen (F)">
                    <Maximize2 className="w-6 h-6" aria-hidden="true" />
                </button>
                <button ref={closeRef} type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Exit presenter mode (Esc)">
                    <X className="w-6 h-6" aria-hidden="true" />
                </button>
            </div>
            <div className="flex-1 overflow-auto px-8 pb-8">{children}</div>
        </div>
    );
}

export function PresenterJoinView({ title, pin, joinUrl, onClose }: { title: string; pin: string; joinUrl: string; onClose: () => void }) {
    const displayUrl = joinUrl.replace(/^https?:\/\//, '');
    return (
        <PresenterShell label="Join this workshop" onClose={onClose}>
            <div className="h-full flex flex-col items-center justify-center gap-8 text-center">
                <h1 className="text-4xl md:text-5xl font-bold">{title}</h1>
                <div className="flex flex-col lg:flex-row items-center gap-12">
                    <div className="bg-white p-6 rounded-2xl shadow-xl border">
                        <QRCodeSVG value={joinUrl} size={Math.min(480, Math.round(window.innerHeight * 0.5))} level="H" />
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="text-2xl text-gray-500">Scan the code, or go to</div>
                            <div className="text-3xl md:text-4xl font-semibold break-all">{displayUrl.split('?')[0]}</div>
                        </div>
                        <div>
                            <div className="text-2xl text-gray-500">and enter PIN</div>
                            <div className="font-mono font-bold tracking-[0.2em] text-[72px] md:text-[96px] leading-none text-brand-violet">{pin}</div>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-gray-400">Press F for full screen · Esc to exit</p>
            </div>
        </PresenterShell>
    );
}

interface RankedResult {
    id: string;
    title: string;
    total_score?: number | null;
    x?: number;
    y?: number;
    [key: string]: unknown;
}

export function PresenterResultsView({
    title, results, xLabel, yLabel, topN = 10, onClose,
}: { title: string; results: RankedResult[]; xLabel: string; yLabel: string; topN?: number; onClose: () => void }) {
    const ranked = [...results].sort((a, b) => (Number(b.total_score) || 0) - (Number(a.total_score) || 0)).slice(0, topN);
    return (
        <PresenterShell label="Workshop results" onClose={onClose}>
            <h1 className="text-3xl md:text-4xl font-bold mb-6">{title} — Results</h1>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
                <div className="rounded-2xl border p-4">
                    <ResultsChart data={results as never} showLabels readOnly xAxisLabel={xLabel} yAxisLabel={yLabel} />
                </div>
                <ol className="space-y-3" aria-label={`Top ${ranked.length} use cases`}>
                    {ranked.map((r, i) => (
                        <li key={r.id} className="flex items-center gap-4 rounded-xl border p-4 text-xl">
                            <span className="font-bold text-brand-violet w-10 text-right">#{i + 1}</span>
                            <span className="flex-1 font-semibold">{r.title}</span>
                            <span className="font-mono text-gray-500">{r.total_score != null ? Number(r.total_score).toFixed(0) : '–'}</span>
                        </li>
                    ))}
                </ol>
            </div>
        </PresenterShell>
    );
}
