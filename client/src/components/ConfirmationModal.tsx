import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../hooks/useDialog';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Receives the typed reason when `reasonLabel` is set. */
    onConfirm: (reason?: string) => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    /** Show an optional free-text reason field (replaces window.prompt). */
    reasonLabel?: string;
}

const VARIANTS = {
    danger: { iconBg: 'bg-red-100', iconColor: 'text-red-600', buttonBg: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', buttonBg: 'bg-yellow-600 hover:bg-yellow-700' },
    info: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600', buttonBg: 'bg-blue-600 hover:bg-blue-700' },
};

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    reasonLabel,
}: ConfirmationModalProps) {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const messageId = useId();
    const reasonId = useId();
    const [reason, setReason] = useState('');
    useDialog(panelRef, isOpen, onClose);

    useEffect(() => {
        if (isOpen) setReason('');
    }, [isOpen]);

    if (!isOpen) return null;
    const styles = VARIANTS[variant];

    return (
        <div className="relative z-[60]">
            <div className="fixed inset-0 bg-gray-900/75" onClick={onClose} aria-hidden="true" />

            <div className="fixed inset-0 z-10 overflow-y-auto pointer-events-none">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div
                        ref={panelRef}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={messageId}
                        tabIndex={-1}
                        className={`pointer-events-auto relative overflow-hidden rounded-lg text-left shadow-xl outline-none sm:my-8 sm:w-full sm:max-w-lg ${isLight ? 'bg-white' : 'bg-surface-800 border border-white/10'}`}
                    >
                        <div className="absolute right-0 top-0 pr-3 pt-3">
                            <button
                                type="button"
                                className={`rounded-md p-1 ${isLight ? 'text-gray-400 hover:text-gray-500' : 'text-gray-400 hover:text-gray-300'}`}
                                onClick={onClose}
                                aria-label="Close dialog"
                            >
                                <X className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${styles.iconBg}`}>
                                    <AlertTriangle className={`h-6 w-6 ${styles.iconColor}`} aria-hidden="true" />
                                </div>
                                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                                    <h3 id={titleId} className={`text-base font-semibold leading-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                        {title}
                                    </h3>
                                    <p id={messageId} className={`mt-2 text-sm whitespace-pre-line ${isLight ? 'text-gray-500' : 'text-gray-300'}`}>
                                        {message}
                                    </p>
                                    {reasonLabel && (
                                        <div className="mt-3 text-left">
                                            <label htmlFor={reasonId} className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                                                {reasonLabel}
                                            </label>
                                            <textarea
                                                id={reasonId}
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                rows={3}
                                                maxLength={500}
                                                autoFocus
                                                className={`w-full rounded-md border px-3 py-2 text-sm ${isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-surface-900 border-white/10 text-white'}`}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={`px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 ${isLight ? 'bg-gray-50' : 'bg-surface-900/50'}`}>
                            <button
                                type="button"
                                className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${styles.buttonBg}`}
                                onClick={() => {
                                    onConfirm(reasonLabel ? reason.trim() : undefined);
                                    onClose();
                                }}
                            >
                                {confirmText}
                            </button>
                            <button
                                type="button"
                                autoFocus={!reasonLabel}
                                className={`mt-3 inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset sm:mt-0 sm:w-auto ${isLight ? 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50' : 'bg-surface-700 text-white ring-white/10 hover:bg-white/5'}`}
                                onClick={onClose}
                            >
                                {cancelText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
