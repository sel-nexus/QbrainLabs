import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    ChevronLeft,
    ChevronRight,
    Check,
    Star,
    Circle,
    Square,
    Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';

interface QuestionConfig {
    scale?: number;
    labels?: string[];
    max_length?: number;
    statements?: string[];
}

interface Question {
    id: string;
    order: number;
    text: string;
    type: string;
    required: boolean;
    options?: string[];
    config?: QuestionConfig;
}

interface SurveyData {
    id: string;
    title: string;
    description: string;
    questions: Question[];
    existing_response_id: string | null;
    existing_status: string | null;
}

interface SurveyParticipantProps {
    surveyId: string;
    participantId: string;
    onComplete?: () => void;
}

export function SurveyParticipant({ surveyId, participantId, onComplete }: SurveyParticipantProps) {
    const { theme } = useTheme();
    const [survey, setSurvey] = useState<SurveyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [completed, setCompleted] = useState(false);
    const isLight = theme === 'light';

    useEffect(() => {
        fetchSurvey();
    }, [surveyId, participantId]);

    const fetchSurvey = async () => {
        try {
            const response = await fetch(
                `http://localhost:8000/api/surveys/${surveyId}/participant?participant_id=${participantId}`
            );
            
            if (!response.ok) {
                const error = await response.json();
                if (error.detail === 'You have already completed this survey') {
                    setCompleted(true);
                } else {
                    toast.error(error.detail || 'Failed to load survey');
                }
                return;
            }

            const data = await response.json();
            setSurvey(data);
            
            if (data.existing_status === 'completed') {
                setCompleted(true);
            }
        } catch (error) {
            toast.error('Failed to load survey');
        } finally {
            setLoading(false);
        }
    };

    const currentQuestion = survey?.questions[currentIndex];

    const setAnswer = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        
        // Auto-save progress
        saveProgress(questionId, value);
    };

    const saveProgress = async (questionId: string, value: any) => {
        try {
            await fetch(
                `http://localhost:8000/api/surveys/${surveyId}/save-progress?participant_id=${participantId}&current_question=${currentIndex}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question_id: questionId, value })
                }
            );
        } catch (error) {
            console.error('Failed to save progress');
        }
    };

    const canProceed = () => {
        if (!currentQuestion) return false;
        if (!currentQuestion.required) return true;
        
        const answer = answers[currentQuestion.id];
        if (answer === undefined || answer === null || answer === '') return false;
        if (Array.isArray(answer) && answer.length === 0) return false;
        
        return true;
    };

    const goNext = () => {
        if (!canProceed()) {
            toast.error('Please answer this question');
            return;
        }
        
        if (currentIndex < (survey?.questions.length || 0) - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const submitSurvey = async () => {
        if (!canProceed()) {
            toast.error('Please answer this question');
            return;
        }

        // Validate all required questions
        const unanswered = survey?.questions.filter(q => {
            if (!q.required) return false;
            const answer = answers[q.id];
            return answer === undefined || answer === null || answer === '' || 
                   (Array.isArray(answer) && answer.length === 0);
        });

        if (unanswered && unanswered.length > 0) {
            toast.error(`Please answer all required questions (${unanswered.length} remaining)`);
            return;
        }

        try {
            setSubmitting(true);
            
            const response = await fetch(
                `http://localhost:8000/api/surveys/${surveyId}/submit?participant_id=${participantId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        answers: Object.entries(answers).map(([question_id, value]) => ({
                            question_id,
                            value
                        }))
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to submit survey');
            }

            setCompleted(true);
            toast.success('Survey submitted successfully!');
            
            if (onComplete) {
                onComplete();
            }
        } catch (error) {
            toast.error('Failed to submit survey');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (completed) {
        return (
            <div className="max-w-lg mx-auto text-center py-12">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>Thank You!</h2>
                <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>Your responses have been recorded.</p>
            </div>
        );
    }

    if (!survey || !currentQuestion) {
        return (
            <div className={`text-center py-12 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Survey not available
            </div>
        );
    }

    const progress = ((currentIndex + 1) / survey.questions.length) * 100;
    const isLastQuestion = currentIndex === survey.questions.length - 1;

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className={`text-2xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>{survey.title}</h1>
                {survey.description && (
                    <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>{survey.description}</p>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
                <div className={`flex items-center justify-between text-sm mb-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span>Question {currentIndex + 1} of {survey.questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-surface-700'}`}>
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Question */}
            <div className={`rounded-xl p-6 border mb-6 ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                <div className="flex items-start gap-3 mb-6">
                    <span className="text-sm font-mono text-purple-500 bg-purple-500/10 px-2 py-1 rounded">
                        Q{currentIndex + 1}
                    </span>
                    <div>
                        <h2 className={`text-lg ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {currentQuestion.text}
                            {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
                        </h2>
                    </div>
                </div>

                {/* Answer Input */}
                <div className="space-y-3">
                    {/* Multiple Choice */}
                    {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                        <div className="space-y-2">
                            {currentQuestion.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setAnswer(currentQuestion.id, option)}
                                    className={`w-full flex items-center gap-3 p-4 rounded-lg border transition text-left ${
                                        answers[currentQuestion.id] === option
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-700'
                                            : isLight 
                                                ? 'bg-gray-50 border-gray-200 text-gray-700 hover:border-purple-400'
                                                : 'bg-surface-700 border-white/10 text-gray-300 hover:border-purple-500/50'
                                    }`}
                                >
                                    <Circle className={`w-5 h-5 ${
                                        answers[currentQuestion.id] === option ? 'fill-purple-500 text-purple-500' : ''
                                    }`} />
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Multiple Select */}
                    {currentQuestion.type === 'multiple_select' && currentQuestion.options && (
                        <div className="space-y-2">
                            {currentQuestion.options.map((option, idx) => {
                                const selected = (answers[currentQuestion.id] || []).includes(option);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            const current = answers[currentQuestion.id] || [];
                                            const newValue = selected
                                                ? current.filter((v: string) => v !== option)
                                                : [...current, option];
                                            setAnswer(currentQuestion.id, newValue);
                                        }}
                                        className={`w-full flex items-center gap-3 p-4 rounded-lg border transition text-left ${
                                            selected
                                                ? 'bg-purple-500/20 border-purple-500 text-purple-700'
                                                : isLight 
                                                    ? 'bg-gray-50 border-gray-200 text-gray-700 hover:border-purple-400'
                                                    : 'bg-surface-700 border-white/10 text-gray-300 hover:border-purple-500/50'
                                        }`}
                                    >
                                        <Square className={`w-5 h-5 ${selected ? 'fill-purple-500 text-purple-500' : ''}`} />
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Rating */}
                    {currentQuestion.type === 'rating' && (
                        <div className="flex items-center justify-center gap-2 py-4">
                            {Array.from({ length: currentQuestion.config?.scale || 5 }, (_, i) => i + 1).map((value) => (
                                <button
                                    key={value}
                                    onClick={() => setAnswer(currentQuestion.id, value)}
                                    className={`p-2 transition ${
                                        answers[currentQuestion.id] >= value
                                            ? 'text-yellow-400'
                                            : 'text-gray-600 hover:text-yellow-400/50'
                                    }`}
                                >
                                    <Star className={`w-8 h-8 ${answers[currentQuestion.id] >= value ? 'fill-yellow-400' : ''}`} />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Text */}
                    {currentQuestion.type === 'text' && (
                        <input
                            type="text"
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                            placeholder="Type your answer..."
                            maxLength={currentQuestion.config?.max_length || 200}
                            className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${isLight ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-700 border-white/10 text-white placeholder-gray-500'}`}
                        />
                    )}

                    {/* Textarea */}
                    {currentQuestion.type === 'textarea' && (
                        <textarea
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                            placeholder="Type your answer..."
                            maxLength={currentQuestion.config?.max_length || 1000}
                            rows={4}
                            className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${isLight ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-700 border-white/10 text-white placeholder-gray-500'}`}
                        />
                    )}

                    {/* Likert */}
                    {currentQuestion.type === 'likert' && currentQuestion.config?.statements && (
                        <div className="space-y-4">
                            {currentQuestion.config.statements.map((statement, stmtIdx) => (
                                <div key={stmtIdx} className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-surface-700'}`}>
                                    <p className={`mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>{statement}</p>
                                    <div className="flex items-center justify-between gap-2">
                                        {Array.from({ length: currentQuestion.config?.scale || 5 }, (_, i) => i + 1).map((value) => {
                                            const currentAnswers = answers[currentQuestion.id] || {};
                                            const selected = currentAnswers[statement] === value;
                                            return (
                                                <button
                                                    key={value}
                                                    onClick={() => {
                                                        const newAnswers = { ...currentAnswers, [statement]: value };
                                                        setAnswer(currentQuestion.id, newAnswers);
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg border transition ${
                                                        selected
                                                            ? 'bg-purple-500 border-purple-500 text-white'
                                                            : isLight 
                                                                ? 'bg-white border-gray-200 text-gray-600 hover:border-purple-400'
                                                                : 'bg-surface-600 border-white/10 text-gray-400 hover:border-purple-500/50'
                                                    }`}
                                                >
                                                    {value}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {currentQuestion.config?.labels && (
                                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                                            <span>{currentQuestion.config.labels[0]}</span>
                                            <span>{currentQuestion.config.labels[currentQuestion.config.labels.length - 1]}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Previous
                </Button>

                {isLastQuestion ? (
                    <Button onClick={submitSurvey} disabled={submitting}>
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Survey
                                <Check className="w-5 h-5 ml-1" />
                            </>
                        )}
                    </Button>
                ) : (
                    <Button onClick={goNext}>
                        Next
                        <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                )}
            </div>
        </div>
    );
}
