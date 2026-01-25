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
const differenceInDays = (dateLeft: Date, dateRight: Date): number => {
    const diffTime = dateLeft.getTime() - dateRight.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

interface GanttChartProps {
    roadmap: any;
}

export function GanttChart({ roadmap }: GanttChartProps) {
    if (!roadmap?.timeline?.phases) {
        return <div className="text-center theme-text-secondary py-8">No timeline data available</div>;
    }

    const phases = roadmap.timeline.phases || [];
    const startDate = roadmap.timeline.start_date ? parseISO(roadmap.timeline.start_date) : new Date();
    
    // Calculate total duration
    const totalDays = roadmap.timeline.total_weeks ? roadmap.timeline.total_weeks * 7 : 0;
    const endDate = roadmap.timeline.end_date ? parseISO(roadmap.timeline.end_date) : new Date();

    // Calculate scale (pixels per day)
    const containerWidth = 1000;
    const scale = containerWidth / Math.max(totalDays, 1);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold theme-text-primary">Project Timeline</h3>
                    <p className="text-sm theme-text-secondary">
                        {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
                        {' '}({roadmap.timeline.total_weeks} weeks)
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-full">
                    {/* Timeline Header */}
                    <div className="flex border-b theme-border-primary mb-4">
                        <div className="w-48 p-2 font-medium theme-text-primary">Phase / Task</div>
                        <div className="flex-1 relative" style={{ minWidth: containerWidth }}>
                            <div className="flex">
                                {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, weekIdx) => {
                                    const weekDate = new Date(startDate);
                                    weekDate.setDate(weekDate.getDate() + weekIdx * 7);
                                    return (
                                        <div
                                            key={weekIdx}
                                            className="flex-1 text-xs text-center theme-text-secondary border-r theme-border-primary"
                                            style={{ minWidth: scale * 7 }}
                                        >
                                            Week {weekIdx + 1}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Phases and Tasks */}
                    {phases.map((phase: any) => {
                        const phaseStart = phase.start_date ? parseISO(phase.start_date) : startDate;
                        const phaseEnd = phase.end_date ? parseISO(phase.end_date) : startDate;
                        const phaseDays = differenceInDays(phaseEnd, phaseStart);
                        const phaseOffset = differenceInDays(phaseStart, startDate);

                        return (
                            <div key={phase.id} className="mb-4">
                                {/* Phase Row */}
                                <div className="flex items-center mb-2">
                                    <div className="w-48 p-2 font-semibold theme-text-primary">
                                        {phase.name}
                                    </div>
                                    <div className="flex-1 relative h-8" style={{ minWidth: containerWidth }}>
                                        <div
                                            className="absolute h-6 bg-brand-violet/30 rounded theme-border-primary border"
                                            style={{
                                                left: `${phaseOffset * scale}px`,
                                                width: `${phaseDays * scale}px`,
                                            }}
                                        >
                                            <div className="px-2 py-1 text-xs theme-text-primary">
                                                {phase.duration_weeks} weeks
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tasks */}
                                {phase.tasks?.map((task: any) => {
                                    const taskStart = task.start_date ? parseISO(task.start_date) : phaseStart;
                                    const taskEnd = task.end_date ? parseISO(task.end_date) : phaseStart;
                                    const taskDays = differenceInDays(taskEnd, taskStart);
                                    const taskOffset = differenceInDays(taskStart, startDate);

                                    return (
                                        <div key={task.id} className="flex items-center mb-1 ml-4">
                                            <div className="w-44 p-2 text-sm theme-text-secondary truncate">
                                                {task.name}
                                            </div>
                                            <div className="flex-1 relative h-6" style={{ minWidth: containerWidth }}>
                                                <div
                                                    className={`absolute h-5 rounded ${
                                                        task.status === 'COMPLETED'
                                                            ? 'bg-green-500'
                                                            : task.status === 'IN_PROGRESS'
                                                            ? 'bg-blue-500'
                                                            : 'bg-gray-400'
                                                    }`}
                                                    style={{
                                                        left: `${taskOffset * scale}px`,
                                                        width: `${Math.max(taskDays * scale, 20)}px`,
                                                    }}
                                                >
                                                    <div className="px-1 py-0.5 text-xs text-white truncate">
                                                        {task.duration_days}d
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
