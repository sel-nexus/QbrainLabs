import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Settings, Loader2 } from 'lucide-react';
import { getSettings, updateSettings } from '../../lib/api/copilot';
import type { CopilotSettingsData } from '../../lib/api/copilot';
import { toast } from 'sonner';

interface CopilotSettingsProps {
    workshopId: string;
    onModeChange?: (mode: string) => void;
    className?: string;
}

export function CopilotSettings({ workshopId, onModeChange, className = '' }: CopilotSettingsProps) {
    const { theme } = useTheme();
    const [settings, setSettings] = useState<CopilotSettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getSettings(workshopId);
                setSettings(data);
            } catch (err) {
                console.error('Failed to fetch settings:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [workshopId]);

    const handleModeChange = async (mode: 'proactive' | 'reactive' | 'silent') => {
        if (!settings) return;
        
        setSaving(true);
        try {
            const updated = await updateSettings(workshopId, { mode });
            setSettings(updated);
            onModeChange?.(mode);
            toast.success(`Copilot mode changed to ${mode}`);
        } catch (err) {
            console.error('Failed to update mode:', err);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (field: keyof CopilotSettingsData, value: boolean) => {
        if (!settings) return;
        
        setSaving(true);
        try {
            const updated = await updateSettings(workshopId, { [field]: value });
            setSettings(updated);
        } catch (err) {
            console.error('Failed to update setting:', err);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center p-6 ${className}`}>
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!settings) return null;

    const modes = [
        { id: 'proactive', label: 'Proactive', description: 'AI suggests automatically' },
        { id: 'reactive', label: 'Reactive', description: 'AI responds when asked' },
        { id: 'silent', label: 'Silent', description: 'AI monitors only' },
    ];

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Mode Selection */}
            <div>
                <label className={`text-xs font-medium uppercase tracking-wider block mb-3 ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                    Copilot Mode
                </label>
                <div className="space-y-2">
                    {modes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => handleModeChange(mode.id as 'proactive' | 'reactive' | 'silent')}
                            disabled={saving}
                            className={`w-full p-3 rounded-lg border text-left transition-colors ${
                                settings.mode === mode.id
                                    ? 'border-brand-violet bg-brand-violet/10'
                                    : theme === 'light'
                                        ? 'border-gray-200 bg-white hover:border-gray-300'
                                        : 'border-white/10 bg-surface-800 hover:border-white/20'
                            }`}
                        >
                            <div className={`text-sm font-medium ${
                                theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}>
                                {mode.label}
                            </div>
                            <p className={`text-xs mt-0.5 ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                                {mode.description}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Feature Toggles */}
            <div>
                <label className={`text-xs font-medium uppercase tracking-wider block mb-3 ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                    Features
                </label>
                <div className="space-y-3">
                    <ToggleItem
                        theme={theme}
                        label="Engagement Alerts"
                        description="Alert when participants are inactive"
                        checked={settings.engagement_alerts_enabled}
                        onChange={(v) => handleToggle('engagement_alerts_enabled', v)}
                        disabled={saving}
                    />
                    <ToggleItem
                        theme={theme}
                        label="Voting Anomaly Alerts"
                        description="Detect unusual voting patterns"
                        checked={settings.voting_anomaly_alerts_enabled}
                        onChange={(v) => handleToggle('voting_anomaly_alerts_enabled', v)}
                        disabled={saving}
                    />
                    <ToggleItem
                        theme={theme}
                        label="Content Suggestions"
                        description="Suggest use case improvements"
                        checked={settings.content_suggestions_enabled}
                        onChange={(v) => handleToggle('content_suggestions_enabled', v)}
                        disabled={saving}
                    />
                    <ToggleItem
                        theme={theme}
                        label="Discussion Prompts"
                        description="Generate discussion questions"
                        checked={settings.discussion_prompts_enabled}
                        onChange={(v) => handleToggle('discussion_prompts_enabled', v)}
                        disabled={saving}
                    />
                </div>
            </div>

            {/* Thresholds */}
            <div>
                <label className={`text-xs font-medium uppercase tracking-wider block mb-3 ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                    Thresholds
                </label>
                <div className={`space-y-3 p-3 rounded-lg ${
                    theme === 'light' ? 'bg-gray-50' : 'bg-surface-700'
                }`}>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${
                            theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        }`}>
                            Inactivity alert after
                        </span>
                        <span className={`text-sm font-medium ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                        }`}>
                            {settings.inactivity_threshold_minutes} min
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${
                            theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        }`}>
                            Variance alert threshold
                        </span>
                        <span className={`text-sm font-medium ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                        }`}>
                            σ = {settings.variance_alert_threshold}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${
                            theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        }`}>
                            Rapid voting threshold
                        </span>
                        <span className={`text-sm font-medium ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                        }`}>
                            {settings.rapid_voting_threshold_seconds} sec
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ToggleItemProps {
    theme: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}

function ToggleItem({ theme, label, description, checked, onChange, disabled }: ToggleItemProps) {
    return (
        <div className={`flex items-center justify-between p-3 rounded-lg ${
            theme === 'light' ? 'bg-white border border-gray-200' : 'bg-surface-800 border border-white/10'
        }`}>
            <div>
                <div className={`text-sm font-medium ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                    {label}
                </div>
                <p className={`text-xs ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                    {description}
                </p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                disabled={disabled}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                    checked ? 'bg-brand-violet' : theme === 'light' ? 'bg-gray-300' : 'bg-gray-600'
                } ${disabled ? 'opacity-50' : ''}`}
            >
                <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        checked ? 'left-5' : 'left-1'
                    }`}
                />
            </button>
        </div>
    );
}
