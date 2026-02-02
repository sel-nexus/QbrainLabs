import React, { useState, useEffect } from 'react';
import type {
    CostInputs, BenefitInputs, ROIParameters, ROIResults
} from '../../types/roi';
import {
    DEFAULT_COSTS, DEFAULT_BENEFITS, DEFAULT_PARAMS
} from '../../types/roi';
import { CostBenefitForms } from './CostBenefitForms';
import { ROIResultsDisplay } from './ROIResultsDisplay';
import { ScenarioModeler } from './ScenarioModeler';
import { SensitivityAnalysis } from './SensitivityAnalysis';
import { BenchmarkPanel } from './BenchmarkPanel';
import { BusinessCaseGenerator } from './BusinessCaseGenerator';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { Loader2, Calculator, Save, Sparkles, FileText, GitCompare, Database, TrendingUp } from 'lucide-react';

interface ROICalculatorProps {
    workshopId: string;
    useCaseId: string;
    initialData?: {
        costs?: CostInputs;
        benefits?: BenefitInputs;
        parameters?: ROIParameters;
    };
    onSaveSuccess?: () => void;
}

export const ROICalculator: React.FC<ROICalculatorProps> = ({
    workshopId,
    useCaseId,
    initialData,
    onSaveSuccess
}) => {
    const [costs, setCosts] = useState<CostInputs>(initialData?.costs || DEFAULT_COSTS);
    const [benefits, setBenefits] = useState<BenefitInputs>(initialData?.benefits || DEFAULT_BENEFITS);
    const [parameters, setParameters] = useState<ROIParameters>(initialData?.parameters || DEFAULT_PARAMS);

    const [results, setResults] = useState<ROIResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState<'calculator' | 'scenarios' | 'sensitivity' | 'benchmarks' | 'business-case'>('calculator');

    // ROI ID for business case generation
    const [roiId, setRoiId] = useState<string | null>(null);

    // Use case metadata for business case
    const [useCaseMetadata, setUseCaseMetadata] = useState<{ title: string; description: string }>({
        title: '',
        description: ''
    });

    // Load existing ROI data and use case metadata
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch ROI data
                const roiResponse = await api.get(`roi/workshops/${workshopId}/usecases/${useCaseId}`);
                if (roiResponse.data) {
                    setCosts(roiResponse.data.costs);
                    setBenefits(roiResponse.data.benefits);
                    setParameters(roiResponse.data.parameters);
                    setResults(roiResponse.data.results);
                    setRoiId(roiResponse.data.id);
                }

                // Fetch use case metadata
                const useCaseResponse = await api.get(`usecases/${useCaseId}`);
                if (useCaseResponse.data) {
                    setUseCaseMetadata({
                        title: useCaseResponse.data.title,
                        description: useCaseResponse.data.description
                    });
                }
            } catch (error: any) {
                // Ignore 404 (not calculated yet)
                if (error.response?.status !== 404) {
                    console.error("Failed to load data", error);
                }
            }
        };
        if (!initialData) {
            fetchData();
        }
    }, [workshopId, useCaseId, initialData]);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const response = await api.post('roi/calculate-only', {
                costs,
                benefits,
                parameters
            });
            setResults(response.data);
            toast.success("ROI Calculated Successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to calculate ROI");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!results) {
            toast.error("Please calculate results first");
            return;
        }
        setSaving(true);
        try {
            const response = await api.post(`roi/workshops/${workshopId}/usecases/${useCaseId}`, {
                use_case_id: useCaseId,
                costs,
                benefits,
                parameters
            });
            setRoiId(response.data.id);
            toast.success("ROI Analysis Saved");
            if (onSaveSuccess) onSaveSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save ROI analysis");
        } finally {
            setSaving(false);
        }
    };

    const [estimating, setEstimating] = useState(false);

    const handleEstimate = async () => {
        setEstimating(true);
        try {
            const response = await api.post('roi/estimate', {
                use_case_id: useCaseId
            });
            const { estimates } = response.data;

            // Map estimates to form state (using 'mid' values)
            setCosts(prev => ({
                ...prev,
                implementation: estimates.implementation.mid,
                infrastructure: estimates.infrastructure.mid
            }));

            setBenefits(prev => ({
                ...prev,
                time_savings_hours: estimates.time_savings.mid
            }));

            toast.success("AI Estimates Applied");
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch AI estimates");
        } finally {
            setEstimating(false);
        }
    };

    const TABS = [
        { id: 'calculator' as const, name: 'Calculator', icon: Calculator },
        { id: 'scenarios' as const, name: 'Scenarios', icon: GitCompare, disabled: !results },
        { id: 'sensitivity' as const, name: 'Sensitivity', icon: TrendingUp, disabled: !results },
        { id: 'benchmarks' as const, name: 'Benchmarks', icon: Database, disabled: !results },
        { id: 'business-case' as const, name: 'Business Case', icon: FileText, disabled: !roiId }
    ];

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-indigo-600" />
                        ROI Calculator
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Comprehensive financial analysis and business case builder
                    </p>
                </div>

                <div className="flex gap-3">
                    {activeTab === 'calculator' && (
                        <>
                            <button
                                onClick={handleEstimate}
                                disabled={estimating}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50"
                            >
                                {estimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Auto-Estimate
                            </button>
                            <button
                                onClick={handleCalculate}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {results ? 'Recalculate' : 'Calculate ROI'}
                            </button>
                            {results && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Analysis
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex px-6 gap-1 overflow-x-auto">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                                disabled={tab.disabled}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : tab.disabled
                                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
                {activeTab === 'calculator' && (
                    <>
                        <CostBenefitForms
                            costs={costs}
                            benefits={benefits}
                            parameters={parameters}
                            onCostsChange={setCosts}
                            onBenefitsChange={setBenefits}
                            onParametersChange={setParameters}
                        />

                        {results && (
                            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Financial Analysis</h3>
                                <ROIResultsDisplay results={results} />
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'scenarios' && results && (
                    <ScenarioModeler
                        baseCosts={costs}
                        baseBenefits={benefits}
                        baseParameters={parameters}
                        baseResults={results}
                    />
                )}

                {activeTab === 'sensitivity' && results && (
                    <SensitivityAnalysis
                        costs={costs}
                        benefits={benefits}
                        parameters={parameters}
                        baseResults={results}
                    />
                )}

                {activeTab === 'benchmarks' && results && (
                    <BenchmarkPanel
                        useCaseType="AI Implementation"
                        industry="Technology"
                        currentROI={results.roi_percent}
                        currentPayback={results.payback_months}
                    />
                )}

                {activeTab === 'business-case' && roiId && results && (
                    <BusinessCaseGenerator
                        useCaseId={useCaseId}
                        roiCalculationId={roiId}
                        roiResults={results}
                        useCaseTitle={useCaseMetadata.title}
                        useCaseDescription={useCaseMetadata.description}
                    />
                )}
            </div>
        </div>
    );
};
