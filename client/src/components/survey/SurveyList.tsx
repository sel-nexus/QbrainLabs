import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    FileText,
    Play,
    Pause,
    Square,
    BarChart3,
    Edit,
    Trash2,
    Clock,
    Users
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';

interface Survey {
    id: string;
    title: string;
    status: string;
    question_count: number;
    response_count: number;
    created_at: string;
    activated_at: string | null;
}

interface SurveyListProps {
    workshopId: string;
    onCreateSurvey: () => void;
    onEditSurvey: (surveyId: string) => void;
    onViewResults: (surveyId: string) => void;
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
    DRAFT: { color: 'text-gray-400 bg-gray-500/10', icon: FileText, label: 'Draft' },
    ACTIVE: { color: 'text-green-400 bg-green-500/10', icon: Play, label: 'Active' },
    PAUSED: { color: 'text-yellow-400 bg-yellow-500/10', icon: Pause, label: 'Paused' },
    CLOSED: { color: 'text-red-400 bg-red-500/10', icon: Square, label: 'Closed' },
    ARCHIVED: { color: 'text-gray-500 bg-gray-500/10', icon: FileText, label: 'Archived' }
};

export function SurveyList({ workshopId, onCreateSurvey, onEditSurvey, onViewResults }: SurveyListProps) {
    const { theme } = useTheme();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSurveys();
    }, [workshopId]);

    const fetchSurveys = async () => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`http://localhost:8000/api/surveys/workshop/${workshopId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSurveys(data.surveys || []);
            }
        } catch (error) {
            toast.error('Failed to load surveys');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (surveyId: string, action: 'activate' | 'pause' | 'resume' | 'close') => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`http://localhost:8000/api/surveys/${surveyId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                toast.success(`Survey ${action}d successfully`);
                fetchSurveys();
            } else {
                const error = await response.json();
                toast.error(error.detail || `Failed to ${action} survey`);
            }
        } catch (error) {
            toast.error(`Failed to ${action} survey`);
        }
    };

    const handleDelete = async (surveyId: string) => {
        if (!confirm('Are you sure you want to delete this survey?')) return;
        
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`http://localhost:8000/api/surveys/${surveyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                toast.success('Survey deleted');
                fetchSurveys();
            } else {
                const error = await response.json();
                toast.error(error.detail || 'Failed to delete survey');
            }
        } catch (error) {
            toast.error('Failed to delete survey');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    Surveys
                </h3>
                <Button onClick={onCreateSurvey} className="text-sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Create Survey
                </Button>
            </div>

            {surveys.length === 0 ? (
                <div
                    className={`text-center py-12 border border-dashed rounded-xl ${
                        theme === 'light'
                            ? 'border-gray-200 bg-gray-50'
                            : 'border-white/10'
                    }`}
                >
                    <FileText
                        className={`w-12 h-12 mx-auto mb-3 ${
                            theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                        }`}
                    />
                    <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} mb-4`}>
                        No surveys yet
                    </p>
                    <Button variant="secondary" onClick={onCreateSurvey}>
                        Create your first survey
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {surveys.map((survey) => {
                        const statusConfig = STATUS_CONFIG[survey.status] || STATUS_CONFIG.DRAFT;
                        const StatusIcon = statusConfig.icon;

                        return (
                            <div
                                key={survey.id}
                                className={`rounded-xl border p-4 transition ${
                                    theme === 'light'
                                        ? 'bg-white border-gray-200 hover:border-purple-500/30'
                                        : 'bg-surface-800 border-white/10 hover:border-purple-500/30'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                                {survey.title}
                                            </h4>
                                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${statusConfig.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <div className={`flex items-center gap-4 text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-4 h-4" />
                                                {survey.question_count} questions
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {survey.response_count} responses
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {formatDate(survey.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Status Actions */}
                                        {survey.status === 'DRAFT' && (
                                            <Button
                                                variant="secondary"
                                                className="text-xs h-8"
                                                onClick={() => handleStatusChange(survey.id, 'activate')}
                                            >
                                                <Play className="w-3 h-3 mr-1" />
                                                Activate
                                            </Button>
                                        )}
                                        {survey.status === 'ACTIVE' && (
                                            <>
                                                <Button
                                                    variant="secondary"
                                                    className="text-xs h-8"
                                                    onClick={() => handleStatusChange(survey.id, 'pause')}
                                                >
                                                    <Pause className="w-3 h-3 mr-1" />
                                                    Pause
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    className="text-xs h-8 text-red-400"
                                                    onClick={() => handleStatusChange(survey.id, 'close')}
                                                >
                                                    <Square className="w-3 h-3 mr-1" />
                                                    Close
                                                </Button>
                                            </>
                                        )}
                                        {survey.status === 'PAUSED' && (
                                            <>
                                                <Button
                                                    variant="secondary"
                                                    className="text-xs h-8"
                                                    onClick={() => handleStatusChange(survey.id, 'resume')}
                                                >
                                                    <Play className="w-3 h-3 mr-1" />
                                                    Resume
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    className="text-xs h-8 text-red-400"
                                                    onClick={() => handleStatusChange(survey.id, 'close')}
                                                >
                                                    <Square className="w-3 h-3 mr-1" />
                                                    Close
                                                </Button>
                                            </>
                                        )}

                                        {/* Common Actions */}
                                        {survey.response_count > 0 && (
                                            <Button
                                                variant="ghost"
                                                className="text-xs h-8"
                                                onClick={() => onViewResults(survey.id)}
                                            >
                                                <BarChart3 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {survey.status === 'DRAFT' && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    className="text-xs h-8"
                                                    onClick={() => onEditSurvey(survey.id)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="text-xs h-8 text-red-400"
                                                    onClick={() => handleDelete(survey.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
