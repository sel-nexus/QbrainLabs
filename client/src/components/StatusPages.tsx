import { Link } from 'react-router-dom';
import { AlertTriangle, Compass, Lock, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    return (
        <StatusCard icon={<Compass className="w-12 h-12" />} title={t('status.notFound.title')} message={t('status.notFound.message')}>
            <Link to="/" className={primaryClass}>{t('status.goHome')}</Link>
            <Link to="/join" className={linkClass}>{t('status.joinWorkshop')}</Link>
        </StatusCard>
    );
}

export function AccessDeniedPage({ backTo = '/facilitator/dashboard' }: { backTo?: string }) {
    const { t } = useTranslation();
    return (
        <StatusCard icon={<Lock className="w-12 h-12" />} title={t('status.denied.title')} message={t('status.denied.message')}>
            <Link to={backTo} className={primaryClass}>{t('status.backToDashboard')}</Link>
        </StatusCard>
    );
}

/** Inline error state for a screen whose data failed to load. */
export function LoadErrorPanel({ message, onRetry }: { message?: string; onRetry: () => void }) {
    const { t } = useTranslation();
    return (
        <StatusCard
            icon={<AlertTriangle className="w-12 h-12" />}
            title={t('status.loadError.title')}
            message={message || t('status.loadError.message')}
        >
            <button type="button" onClick={onRetry} className={`${primaryClass} flex items-center gap-2`}>
                <RefreshCw className="w-4 h-4" aria-hidden="true" /> {t('status.retry')}
            </button>
        </StatusCard>
    );
}
