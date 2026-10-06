import React from 'react';
import { ROICalculator } from './ROICalculator';
import { X } from 'lucide-react';

interface ROICalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    workshopId: string;
    useCaseId: string;
    useCaseTitle: string;
}

export const ROICalculatorModal: React.FC<ROICalculatorModalProps> = ({
    isOpen,
    onClose,
    workshopId,
    useCaseId,
    useCaseTitle
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div>
                        <h2 className="text-lg font-bold text-white">ROI Calculator</h2>
                        <p className="text-sm text-indigo-200 truncate max-w-lg">{useCaseTitle}</p>
                    </div>
                    <button aria-label="Close"
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <ROICalculator
                        workshopId={workshopId}
                        useCaseId={useCaseId}
                        onSaveSuccess={onClose}
                    />
                </div>
            </div>
        </div>
    );
};
