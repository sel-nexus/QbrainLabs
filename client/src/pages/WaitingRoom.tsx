import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, ClipboardCheck, CheckCircle2, Circle, Loader2, X, ChevronRight } from 'lucide-react';
import { SurveyParticipant } from '../components/survey/SurveyParticipant';

interface UseCase {
    id: string;
    title: string;
    description?: string;
}

interface Survey {
    id: string;
    title: string;
    status: string;
    completed: boolean;
}

interface SessionInfo {
    workshop_id: string;
    workshop_title: string;
    workshop_status: string;
    current_phase: string;
    use_cases: UseCase[];
    surveys: Survey[];
}

export function WaitingRoom() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { session, updateRole } = useSession();
    const [status, setStatus] = useState('Waiting for host...');
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);

    // Fetch session info
    const fetchSessionInfo = async () => {
        if (!session?.participantId) return;
        
        try {
            const { data } = await api.get(`/session/${session.participantId}`);
            setSessionInfo(data);
        } catch (err) {
            console.error('Failed to fetch session info:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessionInfo();
    }, [session?.participantId]);

    const handleSurveyComplete = () => {
        setActiveSurveyId(null);
        fetchSessionInfo(); // Refresh to update completion status
    };

    const handleSurveyClick = (survey: Survey) => {
        // Only allow opening active surveys that aren't completed
        if (survey.status === 'ACTIVE' && !survey.completed) {
            setActiveSurveyId(survey.id);
        } else if (survey.completed) {
            // Survey already completed - could show a toast message
            console.log('Survey already completed');
        } else if (survey.status !== 'ACTIVE') {
            // Survey not active - could show a toast message
            console.log(`Survey is ${survey.status.toLowerCase()}`);
        }
    };

    useEffect(() => {
        if (!session) {
            navigate('/');
            return;
        }

        if (session.role === 'PENDING_FACILITATOR') {
            setStatus('Waiting for Host Approval...');
        }

        // Socket listeners
        const onJoin = (data: any) => console.log("Joined room:", data);
        const onStateChange = (data: any) => {
            console.log("State changed:", data);
            if (data.phase === 'INTAKE') {
                navigate('/intake');
            } else if (data.phase === 'SCORING') {
                navigate('/scoring');
            }
        };

        const onRoleUpdate = (data: any) => {
            console.log("Role update:", data);

            if (data.participant_id === session?.participantId) {
                updateRole(data.role);

                if (data.role === 'FACILITATOR') {
                    // Redirect to Admin/Facilitator view
                    navigate(`/workshop/${session.workshopId}`);
                } else if (data.role === 'PARTICIPANT') {
                    setStatus('Waiting for host...');
                }
            }
        };

        socket.on('participant_joined', onJoin);
        socket.on('workshop_state_change', onStateChange);
        socket.on('participant_role_update', onRoleUpdate);

        return () => {
            socket.off('participant_joined', onJoin);
            socket.off('workshop_state_change', onStateChange);
            socket.off('participant_role_update', onRoleUpdate);
        };
    }, [navigate, session, updateRole]);

    const completedSurveys = sessionInfo?.surveys.filter(s => s.completed).length || 0;
    const totalSurveys = sessionInfo?.surveys.length || 0;

    return (
        <div className={`min-h-screen flex flex-col items-center p-6 ${
            theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'
        }`}>
            {/* Workshop Title Header */}
            {sessionInfo && (
                <div className={`w-full max-w-2xl mb-8 text-center pt-4`}>
                    <h1 className={`text-3xl font-heading font-bold mb-2 ${
                        theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                        {sessionInfo.workshop_title}
                    </h1>
                    <div className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                        Phase: <span className="font-medium text-brand-violet">{sessionInfo.current_phase}</span>
                    </div>
                </div>
            )}

            {/* Welcome Section */}
            <div className="text-center mb-8">
                <div className="relative mb-4 inline-block">
                    <div className="absolute inset-0 bg-brand-violet rounded-full blur-xl opacity-20 animate-pulse" />
                    <div className={`w-20 h-20 rounded-full border flex items-center justify-center z-10 relative ${
                        theme === 'light' 
                            ? 'bg-white border-gray-200 shadow-lg' 
                            : 'bg-surface-800 border-white/10'
                    }`}>
                        <span className="text-3xl">
                            {session?.role === 'PENDING_FACILITATOR' ? '🔒' : '⏳'}
                        </span>
                    </div>
                </div>

                <h2 className={`text-xl font-bold mb-1 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                    Welcome, {session?.name}
                </h2>
                <p className={`animate-pulse text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                    {status}
                </p>
            </div>

            {/* Content Sections */}
            {loading ? (
                <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading session info...</span>
                </div>
            ) : sessionInfo && (
                <div className="w-full max-w-2xl space-y-6">
                    {/* Use Cases Section */}
                    <div className={`rounded-xl border p-5 ${
                        theme === 'light' 
                            ? 'bg-white border-gray-200 shadow-sm' 
                            : 'bg-surface-800 border-white/10'
                    }`}>
                        <div className="flex items-center gap-2 mb-4">
                            <Lightbulb className="w-5 h-5 text-brand-violet" />
                            <h3 className={`font-semibold ${
                                theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}>
                                Use Cases ({sessionInfo.use_cases.length})
                            </h3>
                        </div>
                        
                        {sessionInfo.use_cases.length === 0 ? (
                            <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                No use cases submitted yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {sessionInfo.use_cases.map((uc) => (
                                    <li key={uc.id} className={`text-sm p-3 rounded-lg ${
                                        theme === 'light' ? 'bg-gray-50' : 'bg-surface-700'
                                    }`}>
                                        <div className={`font-medium ${
                                            theme === 'light' ? 'text-gray-800' : 'text-white'
                                        }`}>
                                            {uc.title}
                                        </div>
                                        {uc.description && (
                                            <div className={`text-xs mt-1 line-clamp-2 ${
                                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                            }`}>
                                                {uc.description}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Surveys Section */}
                    <div className={`rounded-xl border p-5 ${
                        theme === 'light' 
                            ? 'bg-white border-gray-200 shadow-sm' 
                            : 'bg-surface-800 border-white/10'
                    }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ClipboardCheck className="w-5 h-5 text-brand-violet" />
                                <h3 className={`font-semibold ${
                                    theme === 'light' ? 'text-gray-900' : 'text-white'
                                }`}>
                                    Surveys
                                </h3>
                            </div>
                            {totalSurveys > 0 && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    completedSurveys === totalSurveys
                                        ? 'bg-semantic-success/20 text-semantic-success'
                                        : theme === 'light' 
                                            ? 'bg-gray-100 text-gray-600' 
                                            : 'bg-surface-700 text-gray-300'
                                }`}>
                                    {completedSurveys}/{totalSurveys} completed
                                </span>
                            )}
                        </div>
                        
                        {sessionInfo.surveys.length === 0 ? (
                            <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                No surveys available yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {sessionInfo.surveys.map((survey) => {
                                    const isClickable = survey.status === 'ACTIVE' && !survey.completed;
                                    return (
                                        <li 
                                            key={survey.id} 
                                            onClick={() => handleSurveyClick(survey)}
                                            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                                theme === 'light' ? 'bg-gray-50' : 'bg-surface-700'
                                            } ${
                                                isClickable 
                                                    ? 'cursor-pointer hover:ring-2 hover:ring-brand-violet/50' 
                                                    : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {survey.completed ? (
                                                    <CheckCircle2 className="w-5 h-5 text-semantic-success" />
                                                ) : (
                                                    <Circle className={`w-5 h-5 ${
                                                        theme === 'light' ? 'text-gray-300' : 'text-gray-500'
                                                    }`} />
                                                )}
                                                <span className={`text-sm font-medium ${
                                                    theme === 'light' ? 'text-gray-800' : 'text-white'
                                                }`}>
                                                    {survey.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    survey.completed 
                                                        ? 'bg-semantic-success/20 text-semantic-success'
                                                        : survey.status === 'ACTIVE'
                                                            ? 'bg-brand-violet/20 text-brand-violet'
                                                            : theme === 'light'
                                                                ? 'bg-gray-200 text-gray-600'
                                                                : 'bg-surface-600 text-gray-400'
                                                }`}>
                                                    {survey.completed ? 'Completed' : survey.status}
                                                </span>
                                                {isClickable && (
                                                    <ChevronRight className="w-4 h-4 text-brand-violet" />
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <p className={`fixed bottom-8 text-xs font-mono ${
                theme === 'light' ? 'text-gray-400' : 'text-gray-500'
            }`}>
                ID: {session?.participantId?.slice(0, 8)}
            </p>

            {/* Survey Modal */}
            {activeSurveyId && session?.participantId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${
                        theme === 'light' ? 'bg-white' : 'bg-surface-800'
                    }`}>
                        <button
                            onClick={() => setActiveSurveyId(null)}
                            className={`absolute top-4 right-4 p-2 rounded-lg transition ${
                                theme === 'light' 
                                    ? 'hover:bg-gray-100 text-gray-500' 
                                    : 'hover:bg-surface-700 text-gray-400'
                            }`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <SurveyParticipant
                            surveyId={activeSurveyId}
                            participantId={session.participantId}
                            onComplete={handleSurveyComplete}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
