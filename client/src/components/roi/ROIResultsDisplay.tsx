import React from 'react';
import type { ROIResults } from '../../types/roi';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

interface ROIResultsDisplayProps {
    results: ROIResults;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const ROIResultsDisplay: React.FC<ROIResultsDisplayProps> = ({ results }) => {
    const { charts_data } = results;

    // Transform dicts to arrays for Recharts
    const costData = Object.entries(charts_data.cost_breakdown).map(([name, value]) => ({ name, value }));
    const benefitData = Object.entries(charts_data.benefit_breakdown).map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 uppercase font-bold">ROI</p>
                    <p className={`text-2xl font-bold ${results.roi_percent > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {results.roi_percent}%
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 uppercase font-bold">NPV</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(results.npv)}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 uppercase font-bold">Payback</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {results.payback_months} <span className="text-sm font-normal text-gray-500">months</span>
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 uppercase font-bold">IRR</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {results.irr}%
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 uppercase font-bold">TCO (3yr)</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(results.tco)}
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Cumulative Cash Flow */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Cumulative Cash Flow</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={charts_data.timeline}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="year" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip
                                    formatter={(val: number) => formatCurrency(val)}
                                    contentStyle={{ backgroundColor: '#1F2937', color: '#F9FAFB', border: 'none', borderRadius: '8px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative"
                                    stroke="#4F46E5"
                                    fill="#C7D2FE"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cost vs Benefit Breakdown */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Cost Structure</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={costData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {costData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
