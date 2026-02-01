import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}: ConfirmationModalProps) {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    iconBg: 'bg-red-100',
                    iconColor: 'text-red-600',
                    buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                };
            case 'warning':
                return {
                    iconBg: 'bg-yellow-100',
                    iconColor: 'text-yellow-600',
                    buttonBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
                };
            case 'info':
            default:
                return {
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                    buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <div className="relative z-50">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-gray-900/75 transition-opacity"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className={`relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg ${isLight ? 'bg-white' : 'bg-surface-800 border border-white/10'}`}>
                        {/* Close button */}
                        <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                            <button
                                type="button"
                                className={`rounded-md ${isLight ? 'bg-white text-gray-400 hover:text-gray-500' : 'bg-transparent text-gray-400 hover:text-gray-300'} focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2`}
                                onClick={onClose}
                            >
                                <span className="sr-only">Close</span>
                                <X className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${styles.iconBg}`}>
                                    <AlertTriangle className={`h-6 w-6 ${styles.iconColor}`} aria-hidden="true" />
                                </div>
                                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                    <h3 className={`text-base font-semibold leading-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                        {title}
                                    </h3>
                                    <div className="mt-2">
                                        <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-300'}`}>
                                            {message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 ${isLight ? 'bg-gray-50' : 'bg-surface-900/50'}`}>
                            <button
                                type="button"
                                className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${styles.buttonBg}`}
                                onClick={() => {
                                    onConfirm();
                                    onClose(); // Optional: close on confirm or let parent handle? Usually parent handles state change which closes it or we close it here.
                                }}
                            >
                                {confirmText}
                            </button>
                            <button
                                type="button"
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
