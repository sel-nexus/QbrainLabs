import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Loader2, Map, Calendar, Users, Target, CheckCircle2 } from 'lucide-react';
import { GanttChart } from './GanttChart';
import { ResourcePlanner } from './ResourcePlanner';
import { MilestoneTracker } from './MilestoneTracker';

interface UseCase {
    id: string;
    title: string;
    description: string;
    value_score?: number;
    feasibility_score?: number;
}

interface RoadmapGeneratorProps {
    workshopId: string;
    useCases: UseCase[];
    onClose?: () => void;
}

export function RoadmapGenerator({ workshopId, useCases, onClose }: RoadmapGeneratorProps) {
    const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
    const [roadmap, setRoadmap] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [activeView, setActiveView] = useState<'gantt' | 'resources' | 'milestones'>('gantt');
    
    const [constraints, setConstraints] = useState({
        start_date: new Date().toISOString().split('T')[0],
        deadline: '',
        budget: '',
        team_size: 5,
        working_days_per_week: 5
    });

    const [options, setOptions] = useState({
        include_contingency: true,
        risk_buffer_percent: 20,
        parallel_execution: true
    });

    const handleGenerate = async () => {
        if (selectedUseCases.length === 0) {
            toast.error('Please select at least one use case');
            return;
        }

        setGenerating(true);
        try {
            const response = await api.post('/roadmaps/generate', {
                workshop_id: workshopId,
                use_case_ids: selectedUseCases,
                constraints: {
                    start_date: constraints.start_date || null,
                    deadline: constraints.deadline || null,
                    budget: constraints.budget ? parseFloat(constraints.budget) : null,
                    team_size: constraints.team_size,
                    working_days_per_week: constraints.working_days_per_week
                },
                options
            });

            setRoadmap(response.data);
            toast.success('Roadmap generated successfully!');
        } catch (error: any) {
            console.error('Failed to generate roadmap', error);
            toast.error(error.response?.data?.detail || 'Failed to generate roadmap');
        } finally {
            setGenerating(false);
        }
    };

    const toggleUseCase = (useCaseId: string) => {
        setSelectedUseCases(prev =>
            prev.includes(useCaseId)
                ? prev.filter(id => id !== useCaseId)
                : [...prev, useCaseId]
        );
    };

    if (roadmap) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold theme-text-primary">Generated Roadmap</h2>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setRoadmap(null)}
                        >
                            Generate New
                        </Button>
                        {onClose && (
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                        )}
                    </div>
                </div>

                {/* View Tabs */}
                <div className="flex gap-2 border-b theme-border-primary">
                    <button
                        onClick={() => setActiveView('gantt')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeView === 'gantt'
                                ? 'border-b-2 border-brand-violet theme-text-primary'
                                : 'theme-text-secondary'
                        }`}
                    >
                        <Calendar className="inline w-4 h-4 mr-2" />
                        Timeline
                    </button>
                    <button
                        onClick={() => setActiveView('resources')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeView === 'resources'
                                ? 'border-b-2 border-brand-violet theme-text-primary'
                                : 'theme-text-secondary'
                        }`}
                    >
                        <Users className="inline w-4 h-4 mr-2" />
                        Resources
                    </button>
                    <button
                        onClick={() => setActiveView('milestones')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeView === 'milestones'
                                ? 'border-b-2 border-brand-violet theme-text-primary'
                                : 'theme-text-secondary'
                        }`}
                    >
                        <Target className="inline w-4 h-4 mr-2" />
                        Milestones
                    </button>
                </div>

                {/* View Content */}
                {activeView === 'gantt' && (
                    <GanttChart roadmap={roadmap} />
                )}
                {activeView === 'resources' && (
                    <ResourcePlanner roadmap={roadmap} />
                )}
                {activeView === 'milestones' && (
                    <MilestoneTracker roadmap={roadmap} />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold theme-text-primary">Generate Implementation Roadmap</h2>
                {onClose && (
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                )}
            </div>

            {/* Use Case Selection */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold theme-text-primary">Select Use Cases</h3>
                <div className="grid gap-3 max-h-64 overflow-y-auto">
                    {useCases.map(uc => (
                        <label
                            key={uc.id}
                            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                                selectedUseCases.includes(uc.id)
                                    ? 'border-brand-violet bg-brand-violet/10'
                                    : 'theme-border-primary theme-bg-secondary'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedUseCases.includes(uc.id)}
                                onChange={() => toggleUseCase(uc.id)}
                                className="mt-1 mr-3"
                            />
                            <div className="flex-1">
                                <div className="font-medium theme-text-primary">{uc.title}</div>
                                <div className="text-sm theme-text-secondary mt-1">{uc.description}</div>
                                {(uc.value_score !== undefined || uc.feasibility_score !== undefined) && (
                                    <div className="text-xs theme-text-secondary mt-2">
                                        Value: {uc.value_score?.toFixed(1) || 'N/A'} | 
                                        Feasibility: {uc.feasibility_score?.toFixed(1) || 'N/A'}
                                    </div>
                                )}
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Constraints */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold theme-text-primary">Project Constraints</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-1">
                            Start Date
                        </label>
                        <Input
                            type="date"
                            value={constraints.start_date}
                            onChange={(e) => setConstraints({ ...constraints, start_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-1">
                            Deadline (Optional)
                        </label>
                        <Input
                            type="date"
                            value={constraints.deadline}
                            onChange={(e) => setConstraints({ ...constraints, deadline: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-1">
                            Budget (Optional)
                        </label>
                        <Input
                            type="number"
                            placeholder="Enter budget"
                            value={constraints.budget}
                            onChange={(e) => setConstraints({ ...constraints, budget: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-1">
                            Team Size
                        </label>
                        <Input
                            type="number"
                            min="1"
                            value={constraints.team_size}
                            onChange={(e) => setConstraints({ ...constraints, team_size: parseInt(e.target.value) || 5 })}
                        />
                    </div>
                </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold theme-text-primary">Generation Options</h3>
                <div className="space-y-3">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={options.include_contingency}
                            onChange={(e) => setOptions({ ...options, include_contingency: e.target.checked })}
                            className="mr-2"
                        />
                        <span className="theme-text-primary">Include contingency buffer</span>
                    </label>
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-1">
                            Risk Buffer (%)
                        </label>
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={options.risk_buffer_percent}
                            onChange={(e) => setOptions({ ...options, risk_buffer_percent: parseFloat(e.target.value) || 20 })}
                        />
                    </div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={options.parallel_execution}
                            onChange={(e) => setOptions({ ...options, parallel_execution: e.target.checked })}
                            className="mr-2"
                        />
                        <span className="theme-text-primary">Allow parallel execution</span>
                    </label>
                </div>
            </div>

            <Button
                onClick={handleGenerate}
                disabled={generating || selectedUseCases.length === 0}
                className="w-full"
            >
                {generating ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Roadmap...
                    </>
                ) : (
                    <>
                        <Map className="w-4 h-4 mr-2" />
                        Generate Roadmap
                    </>
                )}
            </Button>
        </div>
    );
}
