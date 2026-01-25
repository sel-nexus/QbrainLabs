import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'small' | 'medium' | 'large';
}

export function Modal({ isOpen, onClose, title, children, size = 'medium' }: ModalProps) {
    const sizeClasses = {
        small: 'max-w-md',
        medium: 'max-w-2xl',
        large: 'max-w-5xl'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal Content - Uses dynamic theme colors */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className={`theme-bg-secondary theme-border border rounded-2xl p-6 w-full ${sizeClasses[size]} shadow-xl relative max-h-[90vh] overflow-y-auto`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                {title && <h2 className="text-xl font-bold theme-text-primary">{title}</h2>}
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 contrast-muted hover:theme-text-primary transition-colors absolute top-4 right-4"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="theme-text-primary">
                                {children}
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
