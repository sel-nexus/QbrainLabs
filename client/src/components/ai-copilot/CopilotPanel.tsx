import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { 
    Sparkles, X, RefreshCw, Settings, Users, 
    MessageSquare, FileText, BarChart3, Loader2 
} from 'lucide-react';
import { socket } from '../../lib/socket';
import { getSuggestions, dismissSuggestion } from '../../lib/api/copilot';
import { SuggestionCard } from './SuggestionCard';
import type { Suggestion } from './SuggestionCard';
import { AlertBanner } from './AlertBanner';
import { EngagementMonitor } from './EngagementMonitor';
import { DiscussionPrompts } from './DiscussionPrompts';
import { SummaryGenerator } from './SummaryGenerator';
import { CopilotSettings } from './CopilotSettings';
import { InsightsPanel } from './InsightsPanel';
import { CopilotToggle } from './CopilotToggle';
import { toast } from 'sonner';

interface CopilotPanelProps {
    workshopId: string;
    workshopTitle?: string;
    currentPhase?: string;
    activeUseCaseId?: string;
    activeUseCaseTitle?: string;
    isFacilitator?: boolean;
}

type TabId = 'suggestions' | 'engagement' | 'discussion' | 'summary' | 'settings';

export function CopilotPanel({
    workshopId,
    workshopTitle,
    currentPhase,
    activeUseCaseId,
    activeUseCaseTitle,
    isFacilitator = true,
}: CopilotPanelProps) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('suggestions');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [alerts, setAlerts] = useState<Array<{ id: string; type: string; message: string; severity: 'warning' | 'critical' }>>([]);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<string>('proactive');
    const [insights, setInsights] = useState<Array<{ type: 'positive' | 'negative' | 'neutral' | 'warning'; title: string; value?: string; description: string }>>([]);

    // Only show for facilitators
    if (!isFacilitator) return null;

    // Fetch suggestions
    const fetchSuggestions = async () => {
        if (mode === 'silent') return;
        
        setLoading(true);
        try {
            const data = await getSuggestions(workshopId);
            setSuggestions(data.suggestions);
            setMode(data.mode);
            
            // Extract critical alerts
            const criticalSuggestions = data.suggestions.filter(
                s => s.priority === 'urgent' || s.priority === 'high'
            );
            setAlerts(criticalSuggestions.map(s => ({
                id: s.id || Math.random().toString(),
                type: s.type,
                message: s.message,
                severity: s.priority === 'urgent' ? 'critical' as const : 'warning' as const
            })));
            
            // Generate mock insights based on phase
            generateInsights();
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateInsights = () => {
        // Mock insights - in real implementation, these would come from the API
        const mockInsights = [
            {
                type: 'positive' as const,
                title: 'Active Participation',
                value: '87%',
                description: 'Most participants are actively voting and submitting ideas'
            },
            {
                type: 'neutral' as const,
                title: 'Session Duration',
                value: '45 min',
                description: 'Average session length for similar workshops'
            },
        ];
        
        if (currentPhase === 'SCORING') {
            mockInsights.push({
                type: 'warning' as const,
                title: 'Voting Slowdown',
                description: 'Voting velocity has decreased in the last 5 minutes'
            });
        }
        
        setInsights(mockInsights);
    };

    useEffect(() => {
        if (isOpen && mode !== 'silent') {
            fetchSuggestions();
        }
    }, [isOpen, workshopId, currentPhase]);

    // Socket event listeners for real-time updates
    useEffect(() => {
        socket.emit('join_copilot', { workshop_id: workshopId });

        socket.on('copilot:suggestion', (data) => {
            setSuggestions(prev => [data.suggestion, ...prev]);
            toast.info('New AI suggestion available');
        });

        socket.on('copilot:engagement_alert', (data) => {
            setAlerts(prev => [...prev, {
                id: data.alert.id || Math.random().toString(),
                type: 'engagement',
                message: data.alert.message,
                severity: 'warning'
            }]);
        });

        socket.on('copilot:anomaly_detected', (data) => {
            setAlerts(prev => [...prev, {
                id: data.anomaly.id || Math.random().toString(),
                type: 'anomaly',
                message: data.anomaly.recommendation || 'Anomaly detected',
                severity: data.anomaly.severity === 'critical' ? 'critical' : 'warning'
            }]);
        });

        return () => {
            socket.emit('leave_copilot', { workshop_id: workshopId });
            socket.off('copilot:suggestion');
            socket.off('copilot:engagement_alert');
            socket.off('copilot:anomaly_detected');
        };
    }, [workshopId]);

    const handleAction = async (action: string, suggestionId?: string) => {
        // Handle different actions
        switch (action) {
            case 'send_reminder':
                toast.success('Reminder sent to participants');
                break;
            case 'take_break':
                toast.info('Break time - 5 minutes');
                break;
            case 'pause_discussion':
                toast.info('Pausing for discussion');
                break;
            default:
                console.log('Action:', action);
        }
        
        // Mark as acted upon
        if (suggestionId) {
            try {
                await dismissSuggestion(suggestionId, 'acted_upon');
                setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
            } catch (err) {
                console.error('Failed to dismiss suggestion:', err);
            }
        }
    };

    const handleDismiss = async (suggestionId?: string) => {
        if (suggestionId) {
            try {
                await dismissSuggestion(suggestionId, 'dismiss');
                setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
            } catch (err) {
                console.error('Failed to dismiss suggestion:', err);
            }
        }
    };

    const handleAlertDismiss = (alertId: string) => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'suggestions', label: 'Suggestions', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'engagement', label: 'Engagement', icon: <Users className="w-4 h-4" /> },
        { id: 'discussion', label: 'Discussion', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'summary', label: 'Summary', icon: <FileText className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    ];

    return (
        <>
            <CopilotToggle
                isOpen={isOpen}
                onToggle={() => setIsOpen(!isOpen)}
                hasAlerts={alerts.length > 0}
                alertCount={alerts.length}
            />

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`fixed right-0 top-0 h-full w-96 z-50 shadow-2xl flex flex-col ${
                            theme === 'light'
                                ? 'bg-gray-50 border-l border-gray-200'
                                : 'bg-surface-900 border-l border-white/10'
                        }`}
                    >
                        {/* Header */}
                        <div className={`p-4 border-b ${
                            theme === 'light' ? 'border-gray-200' : 'border-white/10'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className={`font-semibold ${
                                            theme === 'light' ? 'text-gray-900' : 'text-white'
                                        }`}>
                                            AI Copilot
                                        </h2>
                                        <p className={`text-xs ${
                                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                        }`}>
                                            {mode === 'proactive' ? 'Proactive Mode' : 
                                             mode === 'reactive' ? 'Reactive Mode' : 'Silent Mode'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={fetchSuggestions}
                                        disabled={loading}
                                        className={`p-2 rounded-lg transition-colors ${
                                            theme === 'light'
                                                ? 'hover:bg-gray-100 text-gray-500'
                                                : 'hover:bg-white/10 text-gray-400'
                                        }`}
                                    >
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className={`p-2 rounded-lg transition-colors ${
                                            theme === 'light'
                                                ? 'hover:bg-gray-100 text-gray-500'
                                                : 'hover:bg-white/10 text-gray-400'
                                        }`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Phase indicator */}
                            {currentPhase && (
                                <div className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium inline-block ${
                                    theme === 'light'
                                        ? 'bg-brand-violet/10 text-brand-violet'
                                        : 'bg-brand-violet/20 text-brand-violet'
                                }`}>
                                    {currentPhase} Phase
                                </div>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className={`flex border-b overflow-x-auto ${
                            theme === 'light' ? 'border-gray-200' : 'border-white/10'
                        }`}>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 min-w-0 px-3 py-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                                        activeTab === tab.id
                                            ? 'text-brand-violet border-b-2 border-brand-violet'
                                            : theme === 'light'
                                                ? 'text-gray-500 hover:text-gray-700'
                                                : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    {tab.icon}
                                    <span className="truncate">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {activeTab === 'suggestions' && (
                                <div className="space-y-4">
                                    <AlertBanner alerts={alerts} onDismiss={handleAlertDismiss} />
                                    
                                    {loading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        <div className="space-y-3">
                                            {suggestions.map((suggestion, index) => (
                                                <SuggestionCard
                                                    key={suggestion.id || index}
                                                    suggestion={suggestion}
                                                    onAction={handleAction}
                                                    onDismiss={handleDismiss}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Sparkles className={`w-12 h-12 mx-auto mb-3 ${
                                                theme === 'light' ? 'text-gray-300' : 'text-gray-600'
                                            }`} />
                                            <p className={`text-sm ${
                                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                            }`}>
                                                {mode === 'silent' 
                                                    ? 'Copilot is in silent mode'
                                                    : 'No suggestions at this time'}
                                            </p>
                                            {mode !== 'silent' && (
                                                <p className={`text-xs mt-1 ${
                                                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                                                }`}>
                                                    Suggestions will appear as the workshop progresses
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    
                                    <InsightsPanel insights={insights} />
                                </div>
                            )}

                            {activeTab === 'engagement' && (
                                <EngagementMonitor workshopId={workshopId} />
                            )}

                            {activeTab === 'discussion' && activeUseCaseId && (
                                <DiscussionPrompts
                                    useCaseId={activeUseCaseId}
                                    useCaseTitle={activeUseCaseTitle}
                                />
                            )}
                            
                            {activeTab === 'discussion' && !activeUseCaseId && (
                                <div className="text-center py-8">
                                    <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${
                                        theme === 'light' ? 'text-gray-300' : 'text-gray-600'
                                    }`} />
                                    <p className={`text-sm ${
                                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                        Select a use case to view discussion prompts
                                    </p>
                                </div>
                            )}

                            {activeTab === 'summary' && (
                                <SummaryGenerator
                                    workshopId={workshopId}
                                    workshopTitle={workshopTitle}
                                />
                            )}

                            {activeTab === 'settings' && (
                                <CopilotSettings
                                    workshopId={workshopId}
                                    onModeChange={setMode}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
