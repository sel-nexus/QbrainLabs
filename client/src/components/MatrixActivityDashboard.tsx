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
    onRefreshMatrix?: (positions: any[]) => void;
}

export function MatrixActivityDashboard({ workshopId, isVisible, onRefreshMatrix }: MatrixActivityDashboardProps) {
    const { theme } = useTheme();
    const [recentActions, setRecentActions] = useState<ParticipantAction[]>([]);
    const [activeParticipants, setActiveParticipants] = useState<Set<string>>(new Set());
    const [submittedParticipants, setSubmittedParticipants] = useState<Set<string>>(new Set());
    const [isConnected, setIsConnected] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalActions: 0,
        recentActivityCount: 0
    });

    useEffect(() => {
        if (!isVisible || !workshopId) return;

        // Check connection status
        setIsConnected(socket.connected);

        // Ensure socket is connected
        if (!socket.connected) {
            socket.connect();
        }

        // Handle connection events
        const onConnect = () => {
            console.log('MatrixActivityDashboard: Socket connected, joining workshop room:', workshopId);
            setIsConnected(true);
            // Small delay to ensure socket is fully ready
            setTimeout(() => {
                socket.emit('join_workshop', { workshop_id: workshopId });
                console.log('MatrixActivityDashboard: Joined workshop room:', workshopId);
            }, 100);
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
            position: { x: number; y: number };
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
                position: data.position,
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

    // Reset recent activity count periodically
    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setStats(prev => ({ ...prev, recentActivityCount: 0 }));
        }, 60000); // Reset every minute

        return () => clearInterval(interval);
    }, [isVisible]);

    const handleRefresh = async () => {
        if (!workshopId || !onRefreshMatrix) return;

        setIsRefreshing(true);
        try {
            const response = await api.get(`/votes/workshop/${workshopId}/all-matrix-positions`);
            const allPositions = response.data || [];

            // Update submitted participants from historical data
            const historicalParticipants = new Set<string>(allPositions.map((p: any) => p.participant_id));
            setSubmittedParticipants(prev => new Set<string>([...prev, ...historicalParticipants]));
            setActiveParticipants(prev => new Set<string>([...prev, ...historicalParticipants])); // Assume simple aggregation for active

            // Group positions by participant and assign unique colors
            const participantColors = new Map<string, string>();
            const colorPalette = [
                '#3b82f6', // blue
                '#10b981', // green
                '#f59e0b', // amber
                '#ef4444', // red
                '#8b5cf6', // violet
                '#ec4899', // pink
                '#06b6d4', // cyan
                '#84cc16', // lime
                '#f97316', // orange
                '#6366f1', // indigo
                '#14b8a6', // teal
                '#a855f7', // purple
            ];

            let colorIndex = 0;
            const positionsWithColors = allPositions.map((pos: any) => {
                if (!participantColors.has(pos.participant_id)) {
                    participantColors.set(pos.participant_id, colorPalette[colorIndex % colorPalette.length]);
                    colorIndex++;
                }
                return {
                    ...pos,
                    participantColor: participantColors.get(pos.participant_id),
                    id: `${pos.use_case_id}-${pos.participant_id}`, // Unique ID for each participant's position
                    title: pos.use_case_title,
                    x: pos.x,
                    y: pos.y,
                    scores: pos.scores,
                    participant_name: pos.participant_name,
                    participant_id: pos.participant_id
                };
            });

            onRefreshMatrix(positionsWithColors);
            toast.success(`Loaded ${positionsWithColors.length} positions from ${participantColors.size} participants`);
        } catch (err: any) {
            console.error('Failed to refresh matrix positions:', err);
            toast.error('Failed to refresh matrix. Please try again.');
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
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 theme-text-primary">
                    <Activity className="w-5 h-5 text-brand-violet" />
                    Live Matrix Activity
                </h3>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleRefresh}
                        disabled={isRefreshing || !onRefreshMatrix}
                        className="h-7 px-3 text-xs"
                    >
                        <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${isConnected
                        ? 'theme-badge-success'
                        : 'theme-badge-danger'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-semantic-success' : 'bg-semantic-danger'}`} />
                        {isConnected ? 'Live' : 'Connecting...'}
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
