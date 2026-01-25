import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FileText, Download, Loader2, Check, Mail, Presentation } from 'lucide-react';
import { generateSummary } from '../../lib/api/copilot';
import type { SummaryContent } from '../../lib/api/copilot';
import { toast } from 'sonner';

interface SummaryGeneratorProps {
    workshopId: string;
    workshopTitle?: string;
    className?: string;
}

type SummaryFormat = 'executive' | 'detailed' | 'email' | 'slides';

export function SummaryGenerator({ workshopId, workshopTitle, className = '' }: SummaryGeneratorProps) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<SummaryContent | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<SummaryFormat>('executive');

    const formats: { id: SummaryFormat; label: string; icon: React.ReactNode; description: string }[] = [
        { id: 'executive', label: 'Executive', icon: <FileText className="w-4 h-4" />, description: '1-page summary' },
        { id: 'detailed', label: 'Detailed', icon: <FileText className="w-4 h-4" />, description: 'Full report' },
        { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, description: 'Email-ready' },
        { id: 'slides', label: 'Slides', icon: <Presentation className="w-4 h-4" />, description: 'Presentation' },
    ];

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const result = await generateSummary(workshopId, selectedFormat);
            setSummary(result.summary);
            toast.success('Summary generated successfully');
        } catch (err) {
            console.error('Failed to generate summary:', err);
            toast.error('Failed to generate summary');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        if (!summary) return;
        
        const text = `
${summary.executive_summary}

KEY FINDINGS:
${summary.key_findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

TOP RECOMMENDATIONS:
${summary.top_recommendations.map((r, i) => `${i + 1}. ${r.title}${r.rationale ? ` - ${r.rationale}` : ''}`).join('\n')}

NEXT STEPS:
${summary.next_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
        `.trim();
        
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Format Selection */}
            <div>
                <label className={`text-xs font-medium uppercase tracking-wider block mb-2 ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                    Summary Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {formats.map((format) => (
                        <button
                            key={format.id}
                            onClick={() => setSelectedFormat(format.id)}
                            className={`p-3 rounded-lg border text-left transition-colors ${
                                selectedFormat === format.id
                                    ? 'border-brand-violet bg-brand-violet/10'
                                    : theme === 'light'
                                        ? 'border-gray-200 bg-white hover:border-gray-300'
                                        : 'border-white/10 bg-surface-800 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={selectedFormat === format.id ? 'text-brand-violet' : 
                                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                                }>
                                    {format.icon}
                                </span>
                                <span className={`text-sm font-medium ${
                                    theme === 'light' ? 'text-gray-900' : 'text-white'
                                }`}>
                                    {format.label}
                                </span>
                            </div>
                            <p className={`text-xs mt-1 ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                                {format.description}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <FileText className="w-5 h-5" />
                        Generate Summary
                    </>
                )}
            </button>

            {/* Generated Summary */}
            {summary && (
                <div className={`rounded-lg border ${
                    theme === 'light'
                        ? 'border-gray-200 bg-white'
                        : 'border-white/10 bg-surface-800'
                }`}>
                    <div className={`p-4 border-b ${
                        theme === 'light' ? 'border-gray-200' : 'border-white/10'
                    }`}>
                        <div className="flex items-center justify-between">
                            <h4 className={`font-medium ${
                                theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}>
                                {workshopTitle || 'Workshop'} Summary
                            </h4>
                            <div className="flex items-center gap-2">
                                {summary.is_mock && (
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                        theme === 'light' ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400'
                                    }`}>
                                        Mock
                                    </span>
                                )}
                                <button
                                    onClick={handleCopyToClipboard}
                                    className={`p-1.5 rounded hover:bg-white/10 ${
                                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                    }`}
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Executive Summary */}
                        <div>
                            <h5 className={`text-xs font-medium uppercase tracking-wider mb-2 ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                                Executive Summary
                            </h5>
                            <p className={`text-sm ${
                                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                            }`}>
                                {summary.executive_summary}
                            </p>
                        </div>

                        {/* Key Findings */}
                        <div>
                            <h5 className={`text-xs font-medium uppercase tracking-wider mb-2 ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                                Key Findings
                            </h5>
                            <ul className="space-y-1">
                                {summary.key_findings.map((finding, index) => (
                                    <li key={index} className={`text-sm flex items-start gap-2 ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                    }`}>
                                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                        {finding}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Top Recommendations */}
                        <div>
                            <h5 className={`text-xs font-medium uppercase tracking-wider mb-2 ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                                Top Recommendations
                            </h5>
                            <div className="space-y-2">
                                {summary.top_recommendations.map((rec, index) => (
                                    <div key={index} className={`p-2 rounded ${
                                        theme === 'light' ? 'bg-gray-50' : 'bg-surface-700'
                                    }`}>
                                        <div className={`text-sm font-medium ${
                                            theme === 'light' ? 'text-gray-900' : 'text-white'
                                        }`}>
                                            {index + 1}. {rec.title}
                                        </div>
                                        {rec.rationale && (
                                            <p className={`text-xs mt-1 ${
                                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                            }`}>
                                                {rec.rationale}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div>
                            <h5 className={`text-xs font-medium uppercase tracking-wider mb-2 ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                                Next Steps
                            </h5>
                            <ol className="list-decimal list-inside space-y-1">
                                {summary.next_steps.map((step, index) => (
                                    <li key={index} className={`text-sm ${
                                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                    }`}>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Stats */}
                        <div className={`pt-4 border-t ${
                            theme === 'light' ? 'border-gray-200' : 'border-white/10'
                        }`}>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className={`text-lg font-bold ${
                                        theme === 'light' ? 'text-gray-900' : 'text-white'
                                    }`}>
                                        {summary.participant_stats.total}
                                    </div>
                                    <div className={`text-xs ${
                                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                        Participants
                                    </div>
                                </div>
                                <div>
                                    <div className={`text-lg font-bold ${
                                        theme === 'light' ? 'text-gray-900' : 'text-white'
                                    }`}>
                                        {Math.round(summary.participant_stats.avg_engagement)}%
                                    </div>
                                    <div className={`text-xs ${
                                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                        Engagement
                                    </div>
                                </div>
                                <div>
                                    <div className={`text-lg font-bold ${
                                        summary.participant_stats.at_risk > 0 ? 'text-yellow-500' : 'text-green-500'
                                    }`}>
                                        {summary.participant_stats.at_risk}
                                    </div>
                                    <div className={`text-xs ${
                                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                        At Risk
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
