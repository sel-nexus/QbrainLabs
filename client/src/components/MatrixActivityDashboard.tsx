import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { socket } from '../lib/socket';
import { api } from '../lib/api';
import { Activity, Users, TrendingUp, Clock, MapPin, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { toast } from 'sonner';

interface ParticipantAction {
    id: string;
    participantId: string;
    participantName: string;
    useCaseId: string;
    useCaseTitle: string;
    action: 'drag' | 'drop' | 'position_update';
    position: { x: number; y: number };
    timestamp: Date;
    previousPosition?: { x: number; y: number };
}

interface MatrixActivityDashboardProps {
    workshopId: string;
    isVisible: boolean;
    viewMode?: 'consolidated' | 'all' | 'participant';
    onRefreshMatrix?: (positions: any[], isAllPositions: boolean) => void;
    onPositionUpdate?: (position: any) => void;
}

export function MatrixActivityDashboard({
    workshopId,
    isVisible,
    viewMode: externalViewMode,
    onRefreshMatrix,
    onPositionUpdate
}: MatrixActivityDashboardProps) {
    const { theme } = useTheme();
    const [recentActions, setRecentActions] = useState<ParticipantAction[]>([]);
    const [activeParticipants, setActiveParticipants] = useState<Set<string>>(new Set());
    const [submittedParticipants, setSubmittedParticipants] = useState<Set<string>>(new Set());
    const [participantsList, setParticipantsList] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'consolidated' | 'all' | 'participant'>('consolidated');
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalActions: 0,
        recentActivityCount: 0
    });

    useEffect(() => {
        if (externalViewMode && externalViewMode !== viewMode) {
            setViewMode(externalViewMode);
            handleRefresh(externalViewMode, selectedParticipantId);
        }
    }, [externalViewMode]);

    useEffect(() => {
        if (!isVisible || !workshopId) return;

        // Load initial data and participants list
        loadParticipants();
        handleRefresh('consolidated');

        // Check connection status
        setIsConnected(socket.connected);

        // Handle connection events
        const onConnect = () => {
            console.log('MatrixActivityDashboard: Socket connected, joining workshop room:', workshopId);
            setIsConnected(true);
            socket.emit('join_workshop', { workshop_id: workshopId });
            console.log('MatrixActivityDashboard: Joined workshop room:', workshopId);
        };

        const onDisconnect = () => {
            console.log('MatrixActivityDashboard: Socket disconnected');
            setIsConnected(false);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Ensure we're in the workshop room (if already connected)
        if (socket.connected) {
            console.log('MatrixActivityDashboard: Socket already connected, joining workshop room:', workshopId);
            socket.emit('join_workshop', { workshop_id: workshopId });
        } else {
            console.log('MatrixActivityDashboard: Socket not connected, will join on connect');
        }

        // Listen for matrix position updates from participants
        const handleMatrixUpdate = (data: {
            participant_id: string;
            participant_name: string;
            use_case_id: string;
            use_case_title: string;
            position?: { x: number; y: number };
            scores?: Record<string, number>;
            previous_position?: { x: number; y: number };
        }) => {
            console.log('Matrix position update received:', data);

            const action: ParticipantAction = {
                id: `${Date.now()}-${Math.random()}`,
                participantId: data.participant_id,
                participantName: data.participant_name,
                useCaseId: data.use_case_id,
                useCaseTitle: data.use_case_title,
                action: 'position_update',
                position: data.position || { x: 0, y: 0 },
                timestamp: new Date(),
                previousPosition: data.previous_position
            };

            setRecentActions(prev => [action, ...prev].slice(0, 20)); // Keep last 20 actions

            setSubmittedParticipants(prev => new Set([...prev, data.participant_id]));

            setActiveParticipants(prev => {
                const updated = new Set([...prev, data.participant_id]);

                // Update stats
                setStats(currentStats => ({
                    ...currentStats,
                    totalActions: currentStats.totalActions + 1,
                    recentActivityCount: currentStats.recentActivityCount + 1
                }));

                return updated;
            });

            // Notify parent for real-time update in matrix visualization
            if (onPositionUpdate) {
                // If in consolidated mode, always notify (triggers refresh in parent)
                // If in 'all' mode, always notify (adds/updates dot)
                // If in 'participant' mode, only notify if it matches selected participant
                if (viewMode !== 'participant' || data.participant_id === selectedParticipantId) {
                    onPositionUpdate({
                        ...data,
                        id: `${data.use_case_id}-${data.participant_id}`,
                        x: data.position?.x,
                        y: data.position?.y,
                        scores: data.scores
                    });
                }
            }
        };

        // Listen for participant drag start
        const handleDragStart = (data: {
            participant_id: string;
            participant_name: string;
            use_case_id: string;
            use_case_title: string;
        }) => {
            console.log('Matrix drag start received:', data);
            setActiveParticipants(prev => new Set([...prev, data.participant_id]));
        };

        socket.on('matrix:position_update', handleMatrixUpdate);
        socket.on('matrix:drag_start', handleDragStart);

        console.log('MatrixActivityDashboard: Listening for matrix events on workshop', workshopId);

        // Cleanup
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('matrix:position_update', handleMatrixUpdate);
            socket.off('matrix:drag_start', handleDragStart);
        };
    }, [isVisible, workshopId]);

    const loadParticipants = async () => {
        try {
            const response = await api.get(`/participants/workshop/${workshopId}`);
            setParticipantsList(response.data || []);
        } catch (err) {
            console.error('Failed to load participants:', err);
        }
    };

    const handleRefresh = async (mode: 'consolidated' | 'all' | 'participant' = viewMode, participantId: string | null = selectedParticipantId) => {
        if (!workshopId || !onRefreshMatrix) return;

        setIsRefreshing(true);
        try {
            let data: any[] = [];
            if (mode === 'consolidated') {
                const response = await api.get(`/results/${workshopId}`);
                data = response.data || [];
            } else if (mode === 'all') {
                const response = await api.get(`/votes/workshop/${workshopId}/all-matrix-positions`);
                data = response.data || [];
            } else if (mode === 'participant' && participantId) {
                const response = await api.get(`/votes/participant/${participantId}/matrix-positions?workshop_id=${workshopId}`);
                data = response.data || [];
            }

            if (mode === 'consolidated') {
                onRefreshMatrix(data, false);
            } else {
                // Prepare dots with colors
                const participantColors = new Map<string, string>();
                const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7'];
                let colorIndex = 0;

                const processedData = data.map((pos: any) => {
                    const pId = pos.participant_id || participantId;
                    if (!participantColors.has(pId)) {
                        participantColors.set(pId, colorPalette[colorIndex % colorPalette.length]);
                        colorIndex++;
                    }
                    return {
                        ...pos,
                        participantColor: participantColors.get(pId),
                        id: pos.id || `${pos.use_case_id}-${pId}`,
                        title: pos.title || pos.use_case_title,
                        x: pos.x,
                        y: pos.y,
                        scores: pos.scores,
                        participant_name: pos.participant_name,
                        participant_id: pId
                    };
                });
                onRefreshMatrix(processedData, true);
            }

            // Update counts if we have them
            if (mode === 'all') {
                const pIds = new Set<string>(data.map((p: any) => p.participant_id));
                setSubmittedParticipants(prev => new Set([...prev, ...pIds]));
                setActiveParticipants(prev => new Set([...prev, ...pIds]));
            }
        } catch (err: any) {
            console.error('Failed to refresh matrix data:', err);
            toast.error('Failed to refresh matrix data');
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!isVisible) return null;

    const formatTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    const getQuadrantLabel = (x: number, y: number) => {
        const mid = 50;
        if (x > mid && y > mid) return 'Quick Wins';
        if (x <= mid && y > mid) return 'Strategic Bets';
        if (x > mid && y <= mid) return 'Nice to Have';
        return "Don't Do";
    };

    const getQuadrantColor = (x: number, y: number) => {
        const mid = 50;
        if (x > mid && y > mid) return 'text-green-500';
        if (x <= mid && y > mid) return 'text-purple-500';
        if (x > mid && y <= mid) return 'text-blue-500';
        return 'text-red-500';
    };

    return (
        <div className="rounded-xl border p-4 theme-bg-secondary theme-border">
            <div className="flex flex-col space-y-4 mb-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2 theme-text-primary">
                        <Activity className="w-5 h-5 text-brand-violet" />
                        Live Matrix Activity
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${isConnected
                            ? 'theme-badge-success'
                            : 'theme-badge-danger'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-semantic-success' : 'bg-semantic-danger'}`} />
                            {isConnected ? 'Live' : 'Connecting...'}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold uppercase theme-text-secondary mb-1 block px-1">View Mode</label>
                        <select
                            value={viewMode}
                            onChange={(e) => {
                                const mode = e.target.value as any;
                                setViewMode(mode);
                                if (mode !== 'participant') {
                                    handleRefresh(mode, null);
                                } else if (selectedParticipantId) {
                                    handleRefresh(mode, selectedParticipantId);
                                }
                            }}
                            className="w-full h-9 rounded-lg border theme-bg-tertiary theme-border theme-text-primary text-sm px-3 focus:border-brand-violet outline-none"
                        >
                            <option value="consolidated">Consolidated (Averages)</option>
                            <option value="all">All Participants (Dots)</option>
                            <option value="participant">Specific Participant</option>
                        </select>
                    </div>

                    {viewMode === 'participant' && (
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-[10px] font-bold uppercase theme-text-secondary mb-1 block px-1">Select Participant</label>
                            <select
                                value={selectedParticipantId || ''}
                                onChange={(e) => {
                                    setSelectedParticipantId(e.target.value);
                                    handleRefresh('participant', e.target.value);
                                }}
                                className="w-full h-9 rounded-lg border theme-bg-tertiary theme-border theme-text-primary text-sm px-3 focus:border-brand-violet outline-none"
                            >
                                <option value="" disabled>Choose a participant...</option>
                                {participantsList.map(p => (
                                    <option key={p.id} value={p.id}>{p.display_name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-end h-9 pt-5">
                        <Button
                            variant="secondary"
                            onClick={() => handleRefresh()}
                            disabled={isRefreshing || !onRefreshMatrix || (viewMode === 'participant' && !selectedParticipantId)}
                            className="h-9 px-3 text-xs"
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Sync Data
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg theme-bg-tertiary">
                    <div className="text-xs theme-text-secondary">Active Users</div>
                    <div className="text-xl font-bold flex items-center gap-1 theme-text-primary">
                        <Users className="w-4 h-4 text-brand-violet" />
                        {activeParticipants.size}
                    </div>
                </div>
                <div className="p-3 rounded-lg theme-bg-tertiary">
                    <div className="text-xs theme-text-secondary">Submitted</div>
                    <div className="text-xl font-bold theme-text-primary text-green-500">
                        {submittedParticipants.size}
                    </div>
                </div>
                <div className="p-3 rounded-lg theme-bg-tertiary">
                    <div className="text-xs theme-text-secondary">Pending</div>
                    <div className="text-xl font-bold theme-text-primary text-amber-500">
                        {Math.max(0, activeParticipants.size - submittedParticipants.size)}
                    </div>
                </div>
                <div className="p-3 rounded-lg theme-bg-tertiary">
                    <div className="text-xs theme-text-secondary">Total Actions</div>
                    <div className="text-xl font-bold theme-text-primary">
                        {stats.totalActions}
                    </div>
                </div>
            </div>

            {/* Recent Actions Feed */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <AnimatePresence>
                    {recentActions.length === 0 ? (
                        <div className="text-center py-8 text-sm theme-text-secondary">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Waiting for participant actions...</p>
                            <p className="text-xs mt-1">Actions will appear here as participants position items on the matrix</p>
                        </div>
                    ) : (
                        recentActions.map((action) => (
                            <motion.div
                                key={action.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-3 rounded-lg border transition-all theme-bg-tertiary theme-border hover:border-brand-violet/30"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold theme-text-primary">
                                                {action.participantName}
                                            </span>
                                            <span className="text-xs theme-text-secondary">
                                                positioned
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium mb-1 theme-text-primary">
                                            {action.useCaseTitle}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                            <div className="flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" />
                                                <span className={getQuadrantColor(action.position.x, action.position.y)}>
                                                    {getQuadrantLabel(action.position.x, action.position.y)}
                                                </span>
                                            </div>
                                            <div className="theme-text-secondary">
                                                F: {Math.round(action.position.x)} | V: {Math.round(action.position.y)}
                                            </div>
                                            {action.previousPosition && (
                                                <div className={`text-xs ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    from F: {Math.round(action.previousPosition.x)} | V: {Math.round(action.previousPosition.y)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs flex items-center gap-1 theme-text-secondary">
                                        <Clock className="w-3 h-3" />
                                        {formatTimeAgo(action.timestamp)}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
