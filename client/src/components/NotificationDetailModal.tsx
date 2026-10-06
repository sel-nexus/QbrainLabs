import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';
import { toast } from 'sonner';

interface NotificationDetailModalProps {
    notification: any;
    isOpen: boolean;
    onClose: () => void;
    onApprove?: () => void;
    onDismiss?: () => void;
}

export function NotificationDetailModal({
    notification,
    isOpen,
    onClose,
    onApprove,
    onDismiss
}: NotificationDetailModalProps) {
    const [loading, setLoading] = useState(false);

    if (!isOpen || !notification) return null;

    const handleApprove = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/notifications/${notification.id}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(`Changes approved! ${result.updated_usecases.length} use case(s) updated.`);
                if (onApprove) onApprove();
                onClose();
            } else {
                toast.error('Failed to approve changes');
            }
        } catch (error) {
            console.error('Failed to approve notification:', error);
            toast.error('Failed to approve changes');
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/notifications/${notification.id}/dismiss`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success('Notification dismissed');
                if (onDismiss) onDismiss();
                onClose();
            } else {
                toast.error('Failed to dismiss notification');
            }
        } catch (error) {
            console.error('Failed to dismiss notification:', error);
            toast.error('Failed to dismiss notification');
        } finally {
            setLoading(false);
        }
    };

    const affectedUsecases = notification.data?.affected_usecases || [];
    const articleTitle = notification.data?.article_title || 'Unknown Article';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={onClose}
                ></div>

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-white">
                                {notification.title}
                            </h3>
                            <button aria-label="Close"
                                onClick={onClose}
                                className="text-white hover:text-gray-200 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4">
                        {/* Article Info */}
                        <div className="mb-6">
                            <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Knowledge Article Imported</p>
                                    <p className="text-sm text-gray-600 mt-1">{articleTitle}</p>
                                    <p className="text-sm text-gray-500 mt-2">{notification.message}</p>
                                </div>
                            </div>
                        </div>

                        {/* Affected Use Cases */}
                        {affectedUsecases.length > 0 && (
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                    Affected Use Cases ({affectedUsecases.length})
                                </h4>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {affectedUsecases.map((usecase: any, index: number) => (
                                        <div
                                            key={index}
                                            className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                                        >
                                            {/* Use Case Header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h5 className="font-medium text-gray-900">{usecase.title}</h5>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${usecase.impact_type === 'addition' ? 'bg-green-100 text-green-800' :
                                                            usecase.impact_type === 'refinement' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {usecase.impact_type.charAt(0).toUpperCase() + usecase.impact_type.slice(1)}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            Relevance: {Math.round(usecase.relevance_score)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Suggested Changes */}
                                            {usecase.changes && Object.keys(usecase.changes).length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    <p className="text-sm font-medium text-gray-700">Suggested Changes:</p>
                                                    {usecase.changes.description && (
                                                        <div className="bg-gray-50 p-3 rounded">
                                                            <p className="text-xs font-medium text-gray-600 mb-1">Description:</p>
                                                            <p className="text-sm text-gray-800">{usecase.changes.description}</p>
                                                        </div>
                                                    )}
                                                    {usecase.changes.typical_roi && (
                                                        <div className="bg-gray-50 p-3 rounded">
                                                            <p className="text-xs font-medium text-gray-600 mb-1">ROI:</p>
                                                            <p className="text-sm text-gray-800">{usecase.changes.typical_roi}</p>
                                                        </div>
                                                    )}
                                                    {usecase.changes.technologies && usecase.changes.technologies.length > 0 && (
                                                        <div className="bg-gray-50 p-3 rounded">
                                                            <p className="text-xs font-medium text-gray-600 mb-1">Technologies:</p>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {usecase.changes.technologies.map((tech: string, i: number) => (
                                                                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                                                        {tech}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {notification.is_pending && (
                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
                            <button
                                onClick={handleDismiss}
                                disabled={loading}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                <div className="flex items-center space-x-2">
                                    <XCircle className="w-4 h-4" />
                                    <span>Dismiss</span>
                                </div>
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={loading}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50"
                            >
                                <div className="flex items-center space-x-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>{loading ? 'Approving...' : 'Approve Changes'}</span>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
