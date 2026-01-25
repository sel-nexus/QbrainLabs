import React, { useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { FileText, Download, Eye, Sparkles, Settings, Loader2 } from 'lucide-react';
import type { ROIResults } from '../../types/roi';

interface BusinessCaseGeneratorProps {
    useCaseId: string;
    roiCalculationId: string;
    roiResults: ROIResults;
    useCaseTitle: string;
    useCaseDescription: string;
}

interface BusinessCase {
    id: string;
    content: Record<string, string>;
    status: string;
    document_urls: Record<string, string>;
}

const TEMPLATES = [
    { id: 'formal', name: 'Formal', description: 'Traditional corporate style' },
    { id: 'startup', name: 'Startup', description: 'Modern and concise' },
    { id: 'consulting', name: 'Consulting', description: 'Strategy-focused' },
    { id: 'executive', name: 'Executive', description: 'C-suite audience' }
];

const SECTIONS = [
    { id: 'executive_summary', name: 'Executive Summary', required: true },
    { id: 'problem_statement', name: 'Problem Statement', required: true },
    { id: 'proposed_solution', name: 'Proposed Solution', required: true },
    { id: 'financial_analysis', name: 'Financial Analysis', required: true },
    { id: 'risk_assessment', name: 'Risk Assessment', required: false },
    { id: 'implementation_timeline', name: 'Implementation Timeline', required: false },
    { id: 'resource_requirements', name: 'Resource Requirements', required: false },
    { id: 'success_metrics', name: 'Success Metrics', required: false },
    { id: 'recommendation', name: 'Recommendation', required: true }
];

export const BusinessCaseGenerator: React.FC<BusinessCaseGeneratorProps> = ({
    useCaseId,
    roiCalculationId,
    roiResults,
    useCaseTitle,
    useCaseDescription
}) => {
    const [generating, setGenerating] = useState(false);
    const [businessCase, setBusinessCase] = useState<BusinessCase | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    
    // Configuration
    const [selectedTemplate, setSelectedTemplate] = useState('formal');
    const [selectedSections, setSelectedSections] = useState<string[]>(
        SECTIONS.filter(s => s.required).map(s => s.id)
    );
    const [branding, setBranding] = useState({
        company_name: '',
        logo_url: '',
        color_primary: '#4F46E5',
        color_secondary: '#10B981'
    });

    const toggleSection = (sectionId: string) => {
        const section = SECTIONS.find(s => s.id === sectionId);
        if (section?.required) return; // Can't toggle required sections

        setSelectedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const response = await api.post('/roi/business-case/generate', {
                use_case_id: useCaseId,
                roi_calculation_id: roiCalculationId,
                template: selectedTemplate,
                sections: selectedSections.map(id => SECTIONS.find(s => s.id === id)?.name || id),
                branding
            });

            setBusinessCase(response.data);
            setShowPreview(true);
            toast.success('Business Case Generated Successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate business case');
        } finally {
            setGenerating(false);
        }
    };

    const handleExport = async (format: 'pdf' | 'docx' | 'gdocs') => {
        if (!businessCase) return;
        
        try {
            toast.info(`Exporting to ${format.toUpperCase()}...`);
            // In production, this would call an export endpoint
            // const response = await api.post(`/roi/business-case/${businessCase.id}/export`, { format });
            // window.open(response.data.download_url, '_blank');
            
            // Mock for now
            setTimeout(() => {
                toast.success(`Export to ${format.toUpperCase()} complete!`);
            }, 2000);
        } catch (error) {
            toast.error('Export failed');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600" />
                            AI Business Case Generator
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Create a comprehensive business case document
                        </p>
                    </div>
                    {businessCase && (
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            {showPreview ? 'Hide' : 'Show'} Preview
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Configuration */}
                {!businessCase && (
                    <>
                        {/* Template Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Template Style
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {TEMPLATES.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template.id)}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                                            selectedTemplate === template.id
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Section Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Sections to Include
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {SECTIONS.map(section => (
                                    <label
                                        key={section.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            selectedSections.includes(section.id)
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        } ${section.required ? 'opacity-75 cursor-not-allowed' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSections.includes(section.id)}
                                            onChange={() => toggleSection(section.id)}
                                            disabled={section.required}
                                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <span className="text-sm text-gray-900 dark:text-white">
                                            {section.name}
                                            {section.required && (
                                                <span className="text-xs text-red-500 ml-1">*</span>
                                            )}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Branding Options */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Branding (Optional)
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={branding.company_name}
                                        onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        Logo URL
                                    </label>
                                    <input
                                        type="url"
                                        value={branding.logo_url}
                                        onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-lg disabled:opacity-50"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generating Business Case...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generate Business Case
                                </>
                            )}
                        </button>
                    </>
                )}

                {/* Preview */}
                {businessCase && showPreview && (
                    <div className="space-y-6">
                        {/* Export Options */}
                        <div className="flex gap-3 justify-end border-b border-gray-200 dark:border-gray-700 pb-4">
                            <button
                                onClick={() => handleExport('pdf')}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Export PDF
                            </button>
                            <button
                                onClick={() => handleExport('docx')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Export Word
                            </button>
                            <button
                                onClick={() => handleExport('gdocs')}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Google Docs
                            </button>
                        </div>

                        {/* Document Preview */}
                        <div className="prose dark:prose-invert max-w-none bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
                            {/* Header */}
                            <div className="mb-8 pb-6 border-b-4 border-green-600">
                                {branding.company_name && (
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                        {branding.company_name}
                                    </h1>
                                )}
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                                    Business Case: {useCaseTitle}
                                </h2>
                                <p className="text-sm text-gray-500 mt-2">
                                    Generated on {new Date().toLocaleDateString()} | {selectedTemplate} Template
                                </p>
                            </div>

                            {/* ROI Summary Box */}
                            <div className="not-prose mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                    Financial Summary
                                </h3>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">ROI</p>
                                        <p className="text-2xl font-bold text-green-600">{roiResults.roi_percent}%</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">NPV</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            ${roiResults.npv.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Payback</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {roiResults.payback_months} mo
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">IRR</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {roiResults.irr}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Sections */}
                            {Object.entries(businessCase.content).map(([section, content]) => {
                                if (section === 'is_mock') return null;
                                
                                return (
                                    <div key={section} className="mb-8">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                                            {section.replace(/_/g, ' ')}
                                        </h3>
                                        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                            {String(content)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Regenerate Button */}
                        <button
                            onClick={() => {
                                setBusinessCase(null);
                                setShowPreview(false);
                            }}
                            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Generate New Business Case
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
