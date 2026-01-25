import React from 'react';

interface ResourcePlannerProps {
    roadmap: any;
}

export function ResourcePlanner({ roadmap }: ResourcePlannerProps) {
    if (!roadmap?.resources) {
        return <div className="text-center theme-text-secondary py-8">No resource data available</div>;
    }

    const resources = roadmap.resources;
    const roles = resources.roles || [];
    const byPhase = resources.by_phase || [];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold theme-text-primary mb-2">Resource Summary</h3>
                <div className="bg-brand-violet/10 rounded-lg p-4">
                    <div className="text-2xl font-bold theme-text-primary">
                        {resources.total_fte?.toFixed(1) || 0} FTE
                    </div>
                    <div className="text-sm theme-text-secondary">Total Full-Time Equivalent</div>
                </div>
            </div>

            {/* By Role */}
            <div>
                <h4 className="text-md font-semibold theme-text-primary mb-3">Resources by Role</h4>
                <div className="space-y-2">
                    {roles.map((role: any, idx: number) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-3 border rounded-lg theme-border-primary theme-bg-secondary"
                        >
                            <div>
                                <div className="font-medium theme-text-primary">{role.role}</div>
                                {role.skills && role.skills.length > 0 && (
                                    <div className="text-sm theme-text-secondary mt-1">
                                        Skills: {role.skills.join(', ')}
                                    </div>
                                )}
                            </div>
                            <div className="text-lg font-semibold theme-text-primary">
                                {role.fte} FTE
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* By Phase */}
            {byPhase.length > 0 && (
                <div>
                    <h4 className="text-md font-semibold theme-text-primary mb-3">Resources by Phase</h4>
                    <div className="space-y-3">
                        {byPhase.map((phase: any, idx: number) => (
                            <div
                                key={idx}
                                className="border rounded-lg p-4 theme-border-primary theme-bg-secondary"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold theme-text-primary">{phase.phase}</div>
                                    <div className="text-sm font-medium theme-text-primary">
                                        {phase.fte} FTE
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {phase.roles?.map((role: any, roleIdx: number) => (
                                        <div
                                            key={roleIdx}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <span className="theme-text-secondary">{role.role}</span>
                                            <span className="theme-text-primary">{role.fte} FTE</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Skill Gaps */}
            {resources.skill_gaps && resources.skill_gaps.length > 0 && (
                <div>
                    <h4 className="text-md font-semibold theme-text-primary mb-3">Skill Gaps</h4>
                    <div className="space-y-2">
                        {resources.skill_gaps.map((gap: any, idx: number) => (
                            <div
                                key={idx}
                                className="p-3 border border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
                            >
                                <div className="font-medium theme-text-primary">{gap.skill}</div>
                                <div className="text-sm theme-text-secondary mt-1">{gap.recommendation}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
