import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Brain,
    Search,
    Building2,
    Cpu,
    TrendingUp,
    ChevronRight,
    ArrowLeft,
    BookOpen
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';

interface Industry {
    id: string;
    name: string;
    icon: string;
    use_case_count: number;
}

interface KnowledgeBaseOverview {
    total_industries: number;
    total_use_cases: number;
    total_categories: number;
    total_technologies: number;
    industries: Industry[];
}

interface UseCaseTemplate {
    id: string;
    title: string;
    description: string;
    category: string;
    complexity: string;
    data_requirements: string;
    typical_roi: string;
    implementation_time: string;
    technologies: string[];
    kpis: string[];
}

interface IndustryDetail {
    id: string;
    name: string;
    icon: string;
    use_cases: UseCaseTemplate[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AdminKnowledgeBase() {
    const { theme } = useTheme();
    const [overview, setOverview] = useState<KnowledgeBaseOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState<IndustryDetail | null>(null);
    const [selectedUseCase, setSelectedUseCase] = useState<UseCaseTemplate | null>(null);
    const isLight = theme === 'light';

    useEffect(() => {
        fetchOverview();
    }, []);

    const fetchOverview = async () => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/knowledge-base/overview`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (!response.ok) throw new Error('Failed to fetch overview');
            const data = await response.json();
            setOverview(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load Knowledge Base');
        } finally {
            setLoading(false);
        }
    };

    const fetchIndustry = async (industryId: string) => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(
                `${API_BASE}/api/knowledge-base/industries/${industryId}`,
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (!response.ok) throw new Error('Failed to fetch industry');
            const data = await response.json();
            setSelectedIndustry(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load industry details');
        }
    };

    const getComplexityColor = (complexity: string) => {
        switch (complexity.toLowerCase()) {
            case 'low': return 'bg-green-500/20 text-green-400';
            case 'medium': return 'bg-yellow-500/20 text-yellow-400';
            case 'high': return 'bg-red-500/20 text-red-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const getIndustryIcon = (iconName: string) => {
        switch (iconName) {
            case 'building': return Building2;
            case 'cpu': return Cpu;
            case 'trending-up': return TrendingUp;
            default: return Brain;
        }
    };

    if (loading) {
        return (
            <AdminLayout title="AI Knowledge Base">
                <div className="flex items-center justify-center py-20">
                    <div className={isLight ? 'text-gray-500' : 'text-gray-400'}>Loading knowledge base...</div>
                </div>
            </AdminLayout>
        );
    }

    // Show use case detail
    if (selectedUseCase) {
        return (
            <AdminLayout title="AI Knowledge Base">
                <button
                    onClick={() => setSelectedUseCase(null)}
                    className={`flex items-center gap-2 mb-6 ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to {selectedIndustry?.name || 'Industry'}
                </button>

                <div className={`rounded-xl border p-8 ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h3 className={`text-2xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm ${getComplexityColor(selectedUseCase.complexity)}`}>
                                {selectedUseCase.complexity} Complexity
                            </span>
                        </div>
                    </div>

                    <p className={`mb-8 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{selectedUseCase.description}</p>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-white/5'}`}>
                            <div className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Category</div>
                            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.category}</div>
                        </div>
                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-white/5'}`}>
                            <div className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Typical ROI</div>
                            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.typical_roi}</div>
                        </div>
                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-white/5'}`}>
                            <div className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Implementation Time</div>
                            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.implementation_time}</div>
                        </div>
                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-white/5'}`}>
                            <div className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Data Requirements</div>
                            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.data_requirements}</div>
                        </div>
                    </div>

                    {selectedUseCase.technologies?.length > 0 && (
                        <div className="mb-6">
                            <h4 className={`text-lg font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>Technologies</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedUseCase.technologies.map((tech, i) => (
                                    <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-600 rounded-full text-sm">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedUseCase.kpis?.length > 0 && (
                        <div>
                            <h4 className={`text-lg font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>Key Performance Indicators</h4>
                            <ul className="space-y-2">
                                {selectedUseCase.kpis.map((kpi, i) => (
                                    <li key={i} className={`flex items-center gap-2 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                        {kpi}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </AdminLayout>
        );
    }

    // Show industry detail
    if (selectedIndustry) {
        return (
            <AdminLayout title="AI Knowledge Base">
                <button
                    onClick={() => setSelectedIndustry(null)}
                    className={`flex items-center gap-2 mb-6 ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Industries
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h3 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedIndustry.name}</h3>
                        <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>{selectedIndustry.use_cases?.length || 0} use cases</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedIndustry.use_cases?.map((useCase) => (
                        <div
                            key={useCase.id}
                            onClick={() => setSelectedUseCase(useCase)}
                            className={`rounded-xl border p-6 cursor-pointer transition ${isLight ? 'bg-white border-gray-200 shadow-sm hover:border-purple-400' : 'bg-surface-800 border-white/10 hover:border-purple-500/50'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h4 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>{useCase.title}</h4>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className={`text-sm mb-4 line-clamp-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{useCase.description}</p>
                            <div className="flex gap-2">
                                <span className={`px-2 py-1 rounded text-xs ${getComplexityColor(useCase.complexity)}`}>
                                    {useCase.complexity}
                                </span>
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-600 rounded text-xs">
                                    {useCase.category}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </AdminLayout>
        );
    }

    // Show overview
    return (
        <AdminLayout title="AI Knowledge Base">
            {/* Search */}
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search AI use cases across all industries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:border-purple-500/50 ${isLight ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-800 border-white/10 text-white placeholder-gray-400'}`}
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview?.total_industries || 0}</div>
                    <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Industries</div>
                </div>
                <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="text-2xl font-bold text-purple-500">{overview?.total_use_cases || 0}</div>
                    <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Use Cases</div>
                </div>
                <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="text-2xl font-bold text-blue-500">{overview?.total_categories || 0}</div>
                    <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Categories</div>
                </div>
                <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="text-2xl font-bold text-green-500">{overview?.total_technologies || 0}</div>
                    <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Technologies</div>
                </div>
            </div>

            {/* Industries Grid */}
            <h3 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>Browse by Industry</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overview?.industries.map((industry) => {
                    const Icon = getIndustryIcon(industry.icon);
                    return (
                        <div
                            key={industry.id}
                            onClick={() => fetchIndustry(industry.id)}
                            className={`rounded-xl border p-6 cursor-pointer transition ${isLight ? 'bg-white border-gray-200 shadow-sm hover:border-purple-400' : 'bg-surface-800 border-white/10 hover:border-purple-500/50'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <Icon className="w-6 h-6 text-purple-500" />
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>{industry.name}</h4>
                                    <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{industry.use_case_count} use cases</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </AdminLayout>
    );
}
