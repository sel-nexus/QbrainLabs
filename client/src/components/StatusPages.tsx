import { Link } from 'react-router-dom';
import { AlertTriangle, Compass, Lock, RefreshCw } from 'lucide-react';

function StatusCard({ icon, title, message, children }: { icon: React.ReactNode; title: string; message: string; children?: React.ReactNode }) {
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4" role="alert">
            <div className="max-w-md w-full text-center theme-bg-secondary theme-border border rounded-2xl p-8">
                <div className="flex justify-center mb-4 text-brand-violet" aria-hidden="true">{icon}</div>
                <h1 className="text-2xl font-bold theme-text-primary mb-2">{title}</h1>
                <p className="contrast-muted mb-6">{message}</p>
                <div className="flex flex-wrap gap-3 justify-center">{children}</div>
            </div>
        </div>
    );
}

const linkClass = 'px-4 py-2 rounded-lg border theme-border theme-text-primary hover:opacity-80';
const primaryClass = 'px-4 py-2 rounded-lg bg-brand-violet text-white hover:opacity-90';

export function NotFoundPage() {
    return (
        <StatusCard icon={<Compass className="w-12 h-12" />} title="Page not found" message="The link may be out of date, or the page has moved.">
            <Link to="/" className={primaryClass}>Go home</Link>
            <Link to="/join" className={linkClass}>Join a workshop</Link>
        </StatusCard>
    );
}

export function AccessDeniedPage({ backTo = '/facilitator/dashboard' }: { backTo?: string }) {
    return (
        <StatusCard icon={<Lock className="w-12 h-12" />} title="You don't have access to this page" message="Ask an administrator if you think you should.">
            <Link to={backTo} className={primaryClass}>Back to dashboard</Link>
        </StatusCard>
    );
}

/** Inline error state for a screen whose data failed to load. */
export function LoadErrorPanel({ message, onRetry }: { message?: string; onRetry: () => void }) {
    return (
        <StatusCard
            icon={<AlertTriangle className="w-12 h-12" />}
            title="Couldn't load this page"
            message={message || 'Check your connection and try again.'}
        >
            <button type="button" onClick={onRetry} className={`${primaryClass} flex items-center gap-2`}>
                <RefreshCw className="w-4 h-4" aria-hidden="true" /> Retry
            </button>
        </StatusCard>
    );
}
