import React from 'react';

// Helper functions for date manipulation
const parseISO = (dateString: string): Date => new Date(dateString);
const format = (date: Date, formatStr: string): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    if (formatStr === 'MMM d, yyyy') {
        return `${month} ${day}, ${year}`;
    }
    return date.toLocaleDateString();
};
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

interface MilestoneTrackerProps {
    roadmap: any;
}

export function MilestoneTracker({ roadmap }: MilestoneTrackerProps) {
    if (!roadmap?.milestones || roadmap.milestones.length === 0) {
        return <div className="text-center theme-text-secondary py-8">No milestones available</div>;
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'ON_TRACK':
                return <Clock className="w-5 h-5 text-blue-500" />;
            case 'AT_RISK':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'DELAYED':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 dark:bg-green-900/20 border-green-500';
            case 'ON_TRACK':
                return 'bg-blue-100 dark:bg-blue-900/20 border-blue-500';
            case 'AT_RISK':
                return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500';
            case 'DELAYED':
                return 'bg-red-100 dark:bg-red-900/20 border-red-500';
            default:
                return 'bg-gray-100 dark:bg-gray-900/20 border-gray-500';
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold theme-text-primary">Project Milestones</h3>
            <div className="space-y-3">
                {roadmap.milestones.map((milestone: any) => (
                    <div
                        key={milestone.id}
                        className={`p-4 border rounded-lg ${getStatusColor(milestone.status)}`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {getStatusIcon(milestone.status)}
                                    <h4 className="font-semibold theme-text-primary">{milestone.name}</h4>
                                </div>
                                
                                {milestone.description && (
                                    <p className="text-sm theme-text-secondary mb-2">{milestone.description}</p>
                                )}
                                
                                {milestone.target_date && (
                                    <div className="text-sm theme-text-secondary mb-2">
                                        Target Date: {format(parseISO(milestone.target_date), 'MMM d, yyyy')}
                                    </div>
                                )}
                                
                                {milestone.owner && (
                                    <div className="text-sm theme-text-secondary mb-2">
                                        Owner: {milestone.owner}
                                    </div>
                                )}
                                
                                {milestone.deliverables && milestone.deliverables.length > 0 && (
                                    <div className="mt-2">
                                        <div className="text-sm font-medium theme-text-primary mb-1">Deliverables:</div>
                                        <ul className="list-disc list-inside space-y-1">
                                            {milestone.deliverables.map((deliverable: string, idx: number) => (
                                                <li key={idx} className="text-sm theme-text-secondary">
                                                    {deliverable}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            
                            <div className="ml-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                    milestone.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                                    milestone.status === 'ON_TRACK' ? 'bg-blue-500 text-white' :
                                    milestone.status === 'AT_RISK' ? 'bg-yellow-500 text-white' :
                                    milestone.status === 'DELAYED' ? 'bg-red-500 text-white' :
                                    'bg-gray-500 text-white'
                                }`}>
                                    {milestone.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
