import React from 'react';
import type { CostInputs, BenefitInputs, ROIParameters } from '../../types/roi';

interface CostBenefitFormsProps {
    costs: CostInputs;
    benefits: BenefitInputs;
    parameters: ROIParameters;
    onCostsChange: (costs: CostInputs) => void;
    onBenefitsChange: (benefits: BenefitInputs) => void;
    onParametersChange: (params: ROIParameters) => void;
}

export const CostBenefitForms: React.FC<CostBenefitFormsProps> = ({
    costs,
    benefits,
    parameters,
    onCostsChange,
    onBenefitsChange,
    onParametersChange,
}) => {
    const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onCostsChange({ ...costs, [name]: parseFloat(value) || 0 });
    };

    const handleBenefitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onBenefitsChange({ ...benefits, [name]: parseFloat(value) || 0 });
    };

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onParametersChange({ ...parameters, [name]: parseFloat(value) || 0 });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Costs Column */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Investment Costs</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Implementation ($)</label>
                        <input
                            type="number"
                            name="implementation"
                            value={costs.implementation || ''}
                            onChange={handleCostChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                            placeholder="150000"
                        />
                        <p className="mt-1 text-xs text-gray-500">One-time development & setup</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Training ($)</label>
                        <input
                            type="number"
                            name="training"
                            value={costs.training || ''}
                            onChange={handleCostChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">One-time training & change management</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Infrastructure ($/Month)</label>
                        <input
                            type="number"
                            name="infrastructure"
                            value={costs.infrastructure || ''}
                            onChange={handleCostChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                            placeholder="2000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Licensing ($/Year)</label>
                        <input
                            type="number"
                            name="licensing"
                            value={costs.licensing || ''}
                            onChange={handleCostChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Maintenance Rate (0-1)</label>
                        <input
                            type="number"
                            step="0.01"
                            name="maintenance_rate"
                            value={costs.maintenance_rate || ''}
                            onChange={handleCostChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                            placeholder="0.15"
                        />
                        <p className="mt-1 text-xs text-gray-500">% of implementation cost (annual)</p>
                    </div>
                </div>
            </div>

            {/* Benefits Column */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Expected Benefits</h3>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Savings (Hrs/Week)</label>
                            <input
                                type="number"
                                name="time_savings_hours"
                                value={benefits.time_savings_hours || ''}
                                onChange={handleBenefitChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hourly Rate ($)</label>
                            <input
                                type="number"
                                name="hourly_rate"
                                value={benefits.hourly_rate || ''}
                                onChange={handleBenefitChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Revenue Impact ($/Year)</label>
                        <input
                            type="number"
                            name="revenue_impact"
                            value={benefits.revenue_impact || ''}
                            onChange={handleBenefitChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost Avoidance ($ One-time)</label>
                        <input
                            type="number"
                            name="cost_avoidance"
                            value={benefits.cost_avoidance || ''}
                            onChange={handleBenefitChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Productivity Gain (%)</label>
                        <input
                            type="number"
                            name="productivity_gain_pct"
                            value={benefits.productivity_gain_pct || ''}
                            onChange={handleBenefitChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Parameters</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Years</label>
                            <input
                                type="number"
                                name="project_years"
                                value={parameters.project_years}
                                onChange={handleParamChange}
                                className="mt-1 block w-full rounded border-gray-300 py-1 px-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Discount Rate</label>
                            <input
                                type="number"
                                step="0.01"
                                name="discount_rate"
                                value={parameters.discount_rate}
                                onChange={handleParamChange}
                                className="mt-1 block w-full rounded border-gray-300 py-1 px-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
