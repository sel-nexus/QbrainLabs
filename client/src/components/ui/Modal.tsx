import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import React, { useId, useRef } from 'react';
import { useDialog } from '../../hooks/useDialog';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'small' | 'medium' | 'large';
    /** Close when the backdrop is clicked (default true). Turn off for forms that hold unsaved input. */
    closeOnBackdrop?: boolean;
}

/** The app's one accessible dialog: role="dialog", focus trap/restore, Escape, labelled close button. */
export function Modal({ isOpen, onClose, title, children, size = 'medium', closeOnBackdrop = true }: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useDialog(panelRef, isOpen, onClose);

    const sizeClasses = {
        small: 'max-w-md',
        medium: 'max-w-2xl',
        large: 'max-w-5xl'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeOnBackdrop ? onClose : undefined}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={title ? titleId : undefined}
                        aria-label={title ? undefined : 'Dialog'}
                        tabIndex={-1}
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`theme-bg-secondary theme-border border rounded-2xl p-6 w-full ${sizeClasses[size]} shadow-xl relative max-h-[90vh] overflow-y-auto outline-none`}
                    >
                        <div className="flex justify-between items-center mb-6 pr-8">
                            {title && <h2 id={titleId} className="text-xl font-bold theme-text-primary">{title}</h2>}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close dialog"
                            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 contrast-muted hover:theme-text-primary transition-colors absolute top-3 right-3"
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </button>

                        <div className="theme-text-primary">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
