import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/config';

interface ChangePasswordDialogProps {
    onClose: () => void;
}

export function ChangePasswordDialog({ onClose }: ChangePasswordDialogProps) {
    const { theme } = useTheme();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const formData = new URLSearchParams({
                current_password: currentPassword,
                new_password: newPassword,
            });

            const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to change password');
            }

            toast.success('Password changed successfully!');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div
                className={`rounded-2xl p-6 max-w-md w-full shadow-2xl border ${theme === 'light'
                    ? 'bg-white border-gray-200'
                    : 'bg-surface-800 border-white/10'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        Change Password
                    </h2>
                    <button
                        onClick={onClose}
                        className={`transition ${theme === 'light'
                            ? 'text-gray-500 hover:text-gray-900'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="current_password"
                            className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                }`}
                        >
                            Current Password
                        </label>
                        <input
                            type="password"
                            id="current_password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'light'
                                ? 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                                : 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                                }`}
                            placeholder="Enter current password"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="new_password"
                            className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                }`}
                        >
                            New Password
                        </label>
                        <input
                            type="password"
                            id="new_password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'light'
                                ? 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                                : 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                                }`}
                            placeholder="Min. 8 characters"
                            minLength={8}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="confirm_password"
                            className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                }`}
                        >
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            id="confirm_password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'light'
                                ? 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                                : 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                                }`}
                            placeholder="Re-enter new password"
                            minLength={8}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-3 px-4 font-semibold rounded-lg transition ${theme === 'light'
                                ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                : 'bg-surface-700 text-white hover:bg-surface-600'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
