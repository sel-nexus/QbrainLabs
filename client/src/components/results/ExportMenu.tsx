import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/apiErrors';

type Format = 'csv' | 'pdf';

const FORMATS: { id: Format; label: string; hint: string; icon: React.ReactNode }[] = [
    { id: 'pdf', label: 'PDF report', hint: 'Summary, matrix and ranked list', icon: <FileText className="w-4 h-4" aria-hidden="true" /> },
    { id: 'csv', label: 'CSV spreadsheet', hint: 'All scores, ranks and consensus', icon: <FileSpreadsheet className="w-4 h-4" aria-hidden="true" /> },
];

function filenameFrom(disposition: string | undefined, fallback: string) {
    const match = /filename="?([^";]+)"?/i.exec(disposition || '');
    return match ? match[1] : fallback;
}

/** The one place to export results; both formats come from the same server data. */
export function ExportMenu({ workshopId }: { workshopId: string }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<Format | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const download = async (format: Format) => {
        setOpen(false);
        setBusy(format);
        try {
            const response = await api.get(`/export/workshop/${workshopId}/${format}`, { responseType: 'blob' });
            const type = format === 'pdf' ? 'application/pdf' : 'text/csv';
            const url = window.URL.createObjectURL(new Blob([response.data], { type }));
            const link = document.createElement('a');
            link.href = url;
            link.download = filenameFrom(response.headers?.['content-disposition'], `workshop-results.${format}`);
            link.click();
            window.URL.revokeObjectURL(url);
            toast.success(format === 'pdf' ? 'PDF report downloaded' : 'CSV downloaded');
        } catch (error) {
            toast.error(errorMessage(error, 'Export failed. Please try again.'));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <Button variant="secondary" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} disabled={!!busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4 mr-2" aria-hidden="true" />}
                Export
                <ChevronDown className="w-4 h-4 ml-1" aria-hidden="true" />
            </Button>
            {open && (
                <div role="menu" aria-label="Export results" className="absolute right-0 mt-2 w-64 z-30 rounded-xl border theme-border theme-bg-secondary shadow-xl p-1">
                    {FORMATS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            role="menuitem"
                            onClick={() => download(f.id)}
                            className="w-full flex items-start gap-3 text-left px-3 py-2 rounded-lg hover:bg-brand-violet/10"
                        >
                            <span className="mt-0.5 text-brand-violet">{f.icon}</span>
                            <span>
                                <span className="block text-sm font-medium theme-text-primary">{f.label}</span>
                                <span className="block text-xs contrast-muted">{f.hint}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
