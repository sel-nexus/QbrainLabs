import React, { useState } from 'react';
import type { CostInputs, BenefitInputs, ROIParameters, ROIResults } from '../../types/roi';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Play } from 'lucide-react';

interface Scenario {
    id: string;
    name: string;
    adjustments: {
        costs?: Partial<CostInputs>;
        benefits?: Partial<BenefitInputs>;
        parameters?: Partial<ROIParameters>;
    };
    results?: ROIResults;
}

interface ScenarioModelerProps {
    baseCosts: CostInputs;
    baseBenefits: BenefitInputs;
    baseParameters: ROIParameters;
    baseResults: ROIResults;
}

const SCENARIO_TEMPLATES = [
    {
        name: 'Conservative',
        multiplier: 0.5,
        description: '50% of expected benefits'
    },
    {
        name: 'Expected',
        multiplier: 1.0,
        description: 'Baseline estimates'
    },
    {
        name: 'Optimistic',
        multiplier: 1.5,
        description: '150% of expected benefits'
    }
];

export const ScenarioModeler: React.FC<ScenarioModelerProps> = ({
    baseCosts,
    baseBenefits,
    baseParameters,
    baseResults
}) => {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
    const [loading, setLoading] = useState(false);

    const addScenarioFromTemplate = (template: typeof SCENARIO_TEMPLATES[0]) => {
        const newScenario: Scenario = {
            id: Date.now().toString(),
            name: template.name,
            adjustments: {
                benefits: {
                    time_savings_hours: baseBenefits.time_savings_hours * template.multiplier,
                    revenue_impact: baseBenefits.revenue_impact * template.multiplier,
                    cost_avoidance: baseBenefits.cost_avoidance * template.multiplier
                }
            }
        };
        setScenarios([...scenarios, newScenario]);
        setActiveScenario(newScenario);
    };

    const addCustomScenario = () => {
        const newScenario: Scenario = {
            id: Date.now().toString(),
            name: `Scenario ${scenarios.length + 1}`,
            adjustments: {}
        };
        setScenarios([...scenarios, newScenario]);
        setActiveScenario(newScenario);
    };

    const deleteScenario = (id: string) => {
        setScenarios(scenarios.filter(s => s.id !== id));
        if (activeScenario?.id === id) {
            setActiveScenario(null);
        }
    };

    const updateScenarioName = (id: string, name: string) => {
        setScenarios(scenarios.map(s =>
            s.id === id ? { ...s, name } : s
        ));
        if (activeScenario?.id === id) {
            setActiveScenario({ ...activeScenario, name });
        }
    };

    const updateAdjustment = (field: string, value: number) => {
        if (!activeScenario) return;

        const [category, key] = field.split('.');
        const updatedScenario = { ...activeScenario };

        if (category === 'costs') {
            updatedScenario.adjustments.costs = {
                ...updatedScenario.adjustments.costs,
                [key]: value
            };
        } else if (category === 'benefits') {
            updatedScenario.adjustments.benefits = {
                ...updatedScenario.adjustments.benefits,
                [key]: value
            };
        }

        setActiveScenario(updatedScenario);
        setScenarios(scenarios.map(s =>
            s.id === updatedScenario.id ? updatedScenario : s
        ));
    };

    const runScenario = async () => {
        if (!activeScenario) return;

        setLoading(true);
        try {
            const adjustedCosts = {
                ...baseCosts,
                ...activeScenario.adjustments.costs
            };
            const adjustedBenefits = {
                ...baseBenefits,
                ...activeScenario.adjustments.benefits
            };
            const adjustedParams = {
                ...baseParameters,
                ...activeScenario.adjustments.parameters
            };

            const response = await api.post('roi/calculate-only', {
                costs: adjustedCosts,
                benefits: adjustedBenefits,
                parameters: adjustedParams
            });

            const updatedScenario = {
                ...activeScenario,
                results: response.data
            };
            setActiveScenario(updatedScenario);
            setScenarios(scenarios.map(s =>
                s.id === updatedScenario.id ? updatedScenario : s
            ));

            toast.success(`${activeScenario.name} calculated`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to calculate scenario');
        } finally {
            setLoading(false);
        }
    };

    const formatValue = (value: number | undefined, isPercent = false) => {
        if (value === undefined) return '-';
        return isPercent ? `${value}%` : `$${value.toLocaleString()}`;
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Scenario Modeling</h3>
                    <p className="text-sm text-gray-500 mt-1">Create and compare what-if scenarios</p>
                </div>
                <div className="flex gap-2">
                    {SCENARIO_TEMPLATES.map(template => (
                        <button
                            key={template.name}
                            onClick={() => addScenarioFromTemplate(template)}
                            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors"
                        >
                            {template.name}
                        </button>
                    ))}
                    <button
                        onClick={addCustomScenario}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Custom
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scenarios List */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Scenarios</h4>

                    {/* Baseline */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Baseline</span>
                            <span className="text-xs text-green-600 dark:text-green-400 font-bold">
                                {baseResults.roi_percent}%
                            </span>
                        </div>
                    </div>

                    {scenarios.map(scenario => (
                        <div
                            key={scenario.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${activeScenario?.id === scenario.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-200'
                                }`}
                            onClick={() => setActiveScenario(scenario)}
                        >
                            <div className="flex items-center justify-between">
                                <input
                                    type="text"
                                    value={scenario.name}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        updateScenarioName(scenario.id, e.target.value);
                                    }}
                                    className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-gray-900 dark:text-white w-full"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteScenario(scenario.id);
                                    }}
                                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                            {scenario.results && (
                                <div className="mt-1 text-xs text-green-600 dark:text-green-400 font-bold">
                                    ROI: {scenario.results.roi_percent}%
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Adjustment Controls */}
                {activeScenario && (
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Adjust Variables for "{activeScenario.name}"
                            </h4>
                            <button
                                onClick={runScenario}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                Calculate
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Cost Adjustments */}
                            <div className="space-y-3">
                                <h5 className="text-xs font-bold text-gray-500 uppercase">Costs</h5>
                                {Object.entries(baseCosts).map(([key, baseValue]) => (
                                    <div key={key}>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {key.replace(/_/g, ' ')}
                                        </label>
                                        <input
                                            type="number"
                                            step={key === 'maintenance_rate' ? '0.01' : '1'}
                                            value={activeScenario.adjustments.costs?.[key as keyof CostInputs] ?? baseValue}
                                            onChange={(e) => updateAdjustment(`costs.${key}`, parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs text-gray-400">Base: {baseValue}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Benefit Adjustments */}
                            <div className="space-y-3">
                                <h5 className="text-xs font-bold text-gray-500 uppercase">Benefits</h5>
                                {Object.entries(baseBenefits).map(([key, baseValue]) => (
                                    <div key={key}>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {key.replace(/_/g, ' ')}
                                        </label>
                                        <input
                                            type="number"
                                            step={key.includes('_pct') ? '0.01' : '1'}
                                            value={activeScenario.adjustments.benefits?.[key as keyof BenefitInputs] ?? baseValue}
                                            onChange={(e) => updateAdjustment(`benefits.${key}`, parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs text-gray-400">Base: {baseValue}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Results Comparison */}
                        {activeScenario.results && (
                            <div className="mt-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                                <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                                    Results Comparison
                                </h5>
                                <div className="grid grid-cols-4 gap-4">
                                    {['roi_percent', 'npv', 'payback_months', 'irr'].map(metric => {
                                        const baseVal = baseResults[metric as keyof ROIResults] as number;
                                        const scenarioVal = activeScenario.results![metric as keyof ROIResults] as number;
                                        const diff = scenarioVal - baseVal;
                                        const diffPercent = baseVal !== 0 ? (diff / baseVal) * 100 : 0;

                                        return (
                                            <div key={metric} className="text-center">
                                                <p className="text-xs text-gray-500 uppercase mb-1">
                                                    {metric.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {formatValue(scenarioVal, metric.includes('percent') || metric === 'irr')}
                                                </p>
                                                <p className={`text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {diff >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!activeScenario && scenarios.length > 0 && (
                    <div className="lg:col-span-2 flex items-center justify-center text-gray-500">
                        Select a scenario to adjust variables
                    </div>
                )}
            </div>
        </div>
    );
};
