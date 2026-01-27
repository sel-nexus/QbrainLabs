import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Settings,
    Save,
    RotateCcw,
    Shield,
    Zap,
    Gauge,
    CheckCircle,
    Clock
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';

import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;
const TOKEN_KEY = 'hm_auth_token';

interface SystemSetting {
    id: string;
    key: string;
    value: any;
    value_type: string;
    default_value: any;
    category: string;
    description: string;
    is_sensitive: boolean;
    validation_rules?: {
        min?: number;
        max?: number;
        min_length?: number;
        max_length?: number;
    };
    updated_at?: string;
}

interface SettingsListResponse {
    settings: SystemSetting[];
    categories: string[];
}

const categoryIcons: Record<string, any> = {
    rate_limiting: Gauge,
    security: Shield,
    limits: Zap,
    features: CheckCircle,
};

const categoryColors: Record<string, string> = {
    rate_limiting: 'text-blue-500',
    security: 'text-red-500',
    limits: 'text-yellow-500',
    features: 'text-green-500',
};

export function AdminSettings() {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editedValues, setEditedValues] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const authToken = localStorage.getItem(TOKEN_KEY);
            const response = await fetch(`${API_BASE}/api/admin/settings`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch settings');

            const data: SettingsListResponse = await response.json();
            setSettings(data.settings);
            setCategories(data.categories);
            if (data.categories.length > 0 && !selectedCategory) {
                setSelectedCategory(data.categories[0]);
            }
        } catch (error: any) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (key: string, value: any) => {
        setEditedValues(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (setting: SystemSetting) => {
        const newValue = editedValues[setting.key] ?? setting.value;

        try {
            setSaving(setting.key);
            const authToken = localStorage.getItem(TOKEN_KEY);
            const response = await fetch(`${API_BASE}/api/admin/settings/${encodeURIComponent(setting.key)}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value: newValue })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to update setting');
            }

            toast.success(`Updated ${setting.key}`);
            await fetchSettings();

            // Clear edited value
            setEditedValues(prev => {
                const newEdited = { ...prev };
                delete newEdited[setting.key];
                return newEdited;
            });
        } catch (error: any) {
            console.error('Error updating setting:', error);
            toast.error(error.message || 'Failed to update setting');
        } finally {
            setSaving(null);
        }
    };

    const handleReset = async (setting: SystemSetting) => {
        if (!confirm(`Reset "${setting.key}" to default value?`)) return;

        try {
            setSaving(setting.key);
            const authToken = localStorage.getItem(TOKEN_KEY);
            const response = await fetch(`${API_BASE}/api/admin/settings/${encodeURIComponent(setting.key)}/reset`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) throw new Error('Failed to reset setting');

            toast.success(`Reset ${setting.key} to default`);
            await fetchSettings();

            // Clear edited value
            setEditedValues(prev => {
                const newEdited = { ...prev };
                delete newEdited[setting.key];
                return newEdited;
            });
        } catch (error: any) {
            console.error('Error resetting setting:', error);
            toast.error('Failed to reset setting');
        } finally {
            setSaving(null);
        }
    };

    const renderSettingInput = (setting: SystemSetting) => {
        const currentValue = editedValues[setting.key] ?? setting.value;

        if (setting.value_type === 'boolean') {
            return (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleValueChange(setting.key, !currentValue)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${currentValue ? 'bg-brand-violet' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${currentValue ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                    <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        {currentValue ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            );
        }

        if (setting.value_type === 'number') {
            return (
                <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => handleValueChange(setting.key, parseFloat(e.target.value))}
                    min={setting.validation_rules?.min}
                    max={setting.validation_rules?.max}
                    className={`px-3 py-2 border rounded-lg w-32 ${isLight
                        ? 'bg-white border-gray-200 text-gray-900'
                        : 'bg-surface-700 border-white/10 text-white'
                        }`}
                />
            );
        }

        return (
            <input
                type="text"
                value={currentValue}
                onChange={(e) => handleValueChange(setting.key, e.target.value)}
                className={`px-3 py-2 border rounded-lg flex-1 max-w-md ${isLight
                    ? 'bg-white border-gray-200 text-gray-900'
                    : 'bg-surface-700 border-white/10 text-white'
                    }`}
            />
        );
    };

    const filteredSettings = selectedCategory
        ? settings.filter(s => s.category === selectedCategory)
        : settings;

    if (loading) {
        return (
            <AdminLayout title="System Settings">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-violet"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="System Settings">
            {/* Description */}
            <p className={`mb-6 -mt-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Configure system-wide settings and limits
            </p>

            {/* Category Tabs */}
            <div className={`flex gap-2 mb-6 border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                {categories.map((category) => {
                    const Icon = categoryIcons[category] || Settings;
                    const color = categoryColors[category] || 'text-gray-500';

                    return (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-3 flex items-center gap-2 border-b-2 transition ${selectedCategory === category
                                ? `border-brand-violet ${isLight ? 'text-brand-violet' : 'text-brand-violet'}`
                                : `border-transparent ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${selectedCategory === category ? color : ''}`} />
                            <span className="font-medium capitalize">
                                {category.replace('_', ' ')}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Settings List */}
            <div className="space-y-4">
                {filteredSettings.map((setting) => {
                    const hasChanged = editedValues.hasOwnProperty(setting.key);
                    const isSaving = saving === setting.key;

                    return (
                        <div
                            key={setting.id}
                            className={`p-6 rounded-xl border ${isLight
                                ? 'bg-white border-gray-200 shadow-sm'
                                : 'bg-surface-800 border-white/10'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                            {setting.key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </h3>
                                        {setting.is_sensitive && (
                                            <Shield className="w-4 h-4 text-amber-500" />
                                        )}
                                    </div>
                                    <p className={`text-sm mb-3 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {setting.description}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        {renderSettingInput(setting)}
                                        {setting.validation_rules && (
                                            <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                                                {setting.validation_rules.min !== undefined && setting.validation_rules.max !== undefined && (
                                                    `(${setting.validation_rules.min} - ${setting.validation_rules.max})`
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`text-xs mt-2 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                                        Default: {JSON.stringify(setting.default_value)}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleSave(setting)}
                                        disabled={!hasChanged || isSaving}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${hasChanged && !isSaving
                                            ? 'bg-brand-violet text-white hover:bg-brand-violet/90'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {isSaving ? (
                                            <Clock className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save
                                    </button>
                                    <button
                                        onClick={() => handleReset(setting)}
                                        disabled={isSaving}
                                        className={`p-2 rounded-lg transition ${isLight
                                            ? 'hover:bg-gray-100 text-gray-600'
                                            : 'hover:bg-white/5 text-gray-400'
                                            }`}
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredSettings.length === 0 && (
                <div className={`text-center py-12 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No settings found in this category</p>
                </div>
            )}
        </AdminLayout>
    );
}
