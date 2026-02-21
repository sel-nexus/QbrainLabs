import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
    Brain,
    Search,
    Building2,
    Cpu,
    TrendingUp,
    Clock,
    ChevronRight,
    ArrowLeft,
    BookOpen,
    Filter,
    X,
    Globe,
    RefreshCw,
    Bot,
    Plus
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { API_BASE_URL as API_BASE } from '../lib/config';

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

interface SearchResult {
    id: string;
    title: string;
    description: string;
    industry: string;
    industry_name: string;
    category: string;
    complexity: string;
    typical_roi: string;
    relevance_score: number;
}

interface IndustryDetail {
    id: string;
    name: string;
    icon: string;
    use_cases: UseCaseTemplate[];
}

export function KnowledgeBase() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { user, hasRole } = useAuth();
    const isLight = theme === 'light';
    const isFacilitatorOnly = !!user && !hasRole('admin');
    const [overview, setOverview] = useState<KnowledgeBaseOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedIndustry, setSelectedIndustry] = useState<IndustryDetail | null>(null);
    const [selectedUseCase, setSelectedUseCase] = useState<UseCaseTemplate | null>(null);
    const [currentUser, setCurrentUser] = useState<unknown>(null);

    const [showResearchModal, setShowResearchModal] = useState(false);
    const [researchProvider, setResearchProvider] = useState<'perplexity' | 'google'>('perplexity');
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchResults, setResearchResults] = useState<SearchResult[]>([]);
    const [customScope, setCustomScope] = useState('');

    // Update custom scope when industry changes
    useEffect(() => {
        if (selectedIndustry) {
            setCustomScope(`Searching for trending AI use cases in ${selectedIndustry.name}...`);
        } else {
            setCustomScope('Searching for general trending AI use cases across all industries...');
        }
    }, [selectedIndustry]);

    useEffect(() => {
        const authToken = localStorage.getItem('hm_auth_token');
        const userStr = localStorage.getItem('hm_user');

        if (!authToken || !userStr) {
            toast.error('Please log in to access the Knowledge Base');
            navigate('/facilitator-login');
            return;
        }

        setCurrentUser(JSON.parse(userStr));
        fetchOverview();
    }, [navigate]);

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

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;

        setSearching(true);
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(
                `${API_BASE}/api/knowledge-base/search?query=${encodeURIComponent(searchQuery)}`,
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Search failed');
        } finally {
            setSearching(false);
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

    const handleResearch = async () => {
        setResearchLoading(true);
        setResearchResults([]);
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/knowledge-base/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider: researchProvider,
                    industry_id: selectedIndustry?.id || null,
                    custom_scope: customScope || null
                })
            });

            if (!response.ok) throw new Error('Research failed');
            const data = await response.json();
            setResearchResults(data);
            if (data.length === 0) toast.info('No new or refinable use cases found');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to research use cases');
        } finally {
            setResearchLoading(false);
        }
    };

    const handleAddResearchItem = async (item: SearchResult) => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/knowledge-base/add`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: item.title,
                    description: item.description,
                    industry_id: item.industry,
                    category: item.category,
                    complexity: item.complexity,
                    typical_roi: item.typical_roi
                })
            });

            if (!response.ok) throw new Error('Failed to add use case');

            toast.success(`Added "${item.title}" to library`);
            setResearchResults(prev => prev.filter(r => r.id !== item.id));

            // Update stats
            fetchOverview();

            // If viewing the industry detailing this item, refresh it too
            if (selectedIndustry && selectedIndustry.id === item.industry) {
                fetchIndustry(item.industry);
            }

        } catch (error) {
            console.error('Error adding use case:', error);
            toast.error('Failed to add use case to library');
        }
    };

    const getComplexityColor = (complexity: string) => {
        switch (complexity.toLowerCase()) {
            case 'low': return 'text-green-400 bg-green-500/10';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10';
            case 'high': return 'text-red-400 bg-red-500/10';
            default: return 'text-gray-400 bg-gray-500/10';
        }
    };

    const getIndustryIcon = () => {
        return <Building2 className="w-6 h-6" />;
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
                <div className={`text-xl ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('common.loading', 'Loading Knowledge Base...')}</div>
            </div>
        );
    }

    // Header is now provided by AuthenticatedLayout wrapper
    return (
        <div className={`min-h-screen ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
            {/* Page Header - Title and Actions */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.title', 'AI Knowledge Base')}</h1>
                            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                {isFacilitatorOnly
                                    ? t('admin.knowledgeBase.facilitatorSubtitle', 'Use cases you created')
                                    : t('admin.aiKnowledgeBaseDesc', 'Browse industry use cases.')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {!!currentUser && (
                            <Button
                                onClick={() => setShowResearchModal(true)}
                                variant="secondary"
                                className="gap-2 hidden md:flex border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                            >
                                <Globe className="w-4 h-4" />
                                {t('admin.knowledgeBase.researchUseCases', 'Research Use Cases')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Research Modal */}
            {showResearchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className={`rounded-xl border w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.publicResearchRefresh', 'Public Research Refresh')}</h2>
                                    <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.discoverTrendingDesc', 'Discover trending use cases from the web')}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowResearchModal(false)} className={`${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {!researchResults.length && !researchLoading ? (
                                <div className="space-y-6">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{t('admin.knowledgeBase.researchProvider', 'Research Provider')}</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setResearchProvider('perplexity')}
                                                className={`p-4 rounded-lg border flex items-center gap-3 transition ${researchProvider === 'perplexity'
                                                    ? 'bg-blue-500/10 border-blue-500 text-blue-600'
                                                    : isLight
                                                        ? 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                                        : 'bg-surface-700 border-white/5 text-gray-400 hover:bg-surface-600'
                                                    }`}
                                            >
                                                <Bot className="w-5 h-5" />
                                                <div className="text-left">
                                                    <div className="font-medium">Perplexity AI</div>
                                                    <div className="text-xs opacity-70">Deep research & citations</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setResearchProvider('google')}
                                                className={`p-4 rounded-lg border flex items-center gap-3 transition ${researchProvider === 'google'
                                                    ? 'bg-green-500/10 border-green-500 text-green-600'
                                                    : isLight
                                                        ? 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                                        : 'bg-surface-700 border-white/5 text-gray-400 hover:bg-surface-600'
                                                    }`}
                                            >
                                                <Globe className="w-5 h-5" />
                                                <div className="text-left">
                                                    <div className="font-medium">Google Search</div>
                                                    <div className="text-xs opacity-70">Broad web coverage</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{t('admin.knowledgeBase.scope', 'Scope')}</label>
                                        <textarea
                                            value={customScope}
                                            onChange={(e) => setCustomScope(e.target.value)}
                                            placeholder="Enter custom search scope or use the default..."
                                            maxLength={500}
                                            rows={3}
                                            className={`w-full p-3 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLight ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-700 border-white/5 text-white placeholder-gray-500'}`}
                                        />
                                        <div className={`text-xs mt-1 text-right ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {customScope.length}/500 characters
                                        </div>
                                    </div>

                                    <Button onClick={handleResearch} className="w-full py-6 text-lg" disabled={researchLoading}>
                                        {researchLoading ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                                                {t('admin.knowledgeBase.processing', 'Researching...')}
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="w-5 h-5 mr-2" />
                                                {t('admin.knowledgeBase.startDiscovery', 'Start Discovery')}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {researchLoading && (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-4" />
                                            <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>Analyzing search results...</p>
                                        </div>
                                    )}

                                    {researchResults.map((result) => (
                                        <div key={result.id} className={`rounded-lg p-4 border flex gap-4 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-surface-700 border-white/5'}`}>
                                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex-shrink-0 flex items-center justify-center">
                                                <TrendingUp className="w-5 h-5 text-green-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{result.title}</h4>
                                                            {(result as any).is_new && (
                                                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">
                                                                    NEW
                                                                </span>
                                                            )}
                                                            {(result as any).is_refinable && (
                                                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-medium">
                                                                    REFINABLE
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded inline-block">
                                                            {result.industry_name}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 uppercase">{researchProvider}</span>
                                                </div>
                                                <p className={`text-sm mt-2 mb-3 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{result.description}</p>
                                                {(result as any).is_refinable && (result as any).refinement_suggestions && (
                                                    <div className={`text-xs p-2 rounded mb-2 ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-300'}`}>
                                                        <strong>Refinements:</strong> {(result as any).refinement_suggestions}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <span>ROI: <span className="text-green-400">{result.typical_roi}</span></span>
                                                    <span>•</span>
                                                    <span>{result.category}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddResearchItem(result)}
                                                className={`self-center p-2 rounded-lg transition ${isLight ? 'bg-gray-200 hover:bg-purple-100 hover:text-purple-600 text-gray-500' : 'bg-surface-600 hover:bg-purple-600 hover:text-white text-gray-400'}`}
                                                title={(result as any).is_refinable ? "Update Existing Use Case" : "Add to Library"}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}

                                    {!researchLoading && researchResults.length > 0 && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => { setResearchResults([]); }}
                                            className="w-full mt-4"
                                        >
                                            Disconnect & Clear
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Search Section */}
                <div className={`rounded-xl p-6 border mb-8 ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('admin.knowledgeBase.searchPlaceholder', "Search AI use cases across all industries...")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${isLight ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-700 border-white/10 text-white placeholder-gray-500'}`}
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
                            {searching ? t('common.searching', 'Searching...') : t('common.search', 'Search')}
                        </Button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                    {t('common.searchResults', 'Search Results')} ({searchResults.length})
                                </h3>
                                <button
                                    onClick={() => { setSearchResults([]); setSearchQuery(''); }}
                                    className={`${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {searchResults.map((result) => (
                                    <div
                                        key={result.id}
                                        className={`p-4 rounded-lg border cursor-pointer transition ${isLight ? 'bg-gray-50 border-gray-200 hover:border-purple-400' : 'bg-surface-700 border-white/5 hover:border-purple-500/50'}`}
                                        onClick={() => {
                                            fetchIndustry(result.industry);
                                        }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{result.title}</h4>
                                                <p className={`text-sm mt-1 line-clamp-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{result.description}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-xs text-purple-400">{result.industry_name}</span>
                                                    <span className="text-xs text-gray-500">•</span>
                                                    <span className="text-xs text-gray-400">{result.category}</span>
                                                    <span className="text-xs text-gray-500">•</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(result.complexity)}`}>
                                                        {result.complexity}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                <div className="text-sm text-green-400">{result.typical_roi}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {Math.round(result.relevance_score * 100)}% match
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Overview */}
                {overview && !selectedIndustry && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-purple-400" />
                                    </div>
                                </div>
                                <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview.total_industries}</div>
                                <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.industries', 'Industries')}</div>
                            </div>
                            <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-blue-400" />
                                    </div>
                                </div>
                                <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview.total_use_cases}</div>
                                <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.useCases', 'Use Cases')}</div>
                            </div>
                            <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                        <Filter className="w-5 h-5 text-green-400" />
                                    </div>
                                </div>
                                <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview.total_categories}</div>
                                <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.categories', 'Categories')}</div>
                            </div>
                            <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <Cpu className="w-5 h-5 text-amber-400" />
                                    </div>
                                </div>
                                <div className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview.total_technologies}</div>
                                <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.technologies', 'Technologies')}</div>
                            </div>
                        </div>

                        {/* Industries Grid */}
                        <h2 className={`text-2xl font-bold mb-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.browseByIndustry', 'Browse by Industry')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {overview.industries.map((industry) => (
                                <button
                                    key={industry.id}
                                    onClick={() => fetchIndustry(industry.id)}
                                    className={`rounded-xl p-6 border transition text-left group ${isLight ? 'bg-white border-gray-200 hover:border-purple-400' : 'bg-surface-800 border-white/10 hover:border-purple-500/50'}`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                            {getIndustryIcon()}
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition" />
                                    </div>
                                    <h3 className={`text-lg font-semibold mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>{industry.name} ({industry.use_case_count})</h3>
                                    <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.showingKeyAIUseCases', 'Showing Key AI usecases')}</p>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Industry Detail View */}
                {selectedIndustry && !selectedUseCase && (
                    <div>
                        <button
                            onClick={() => setSelectedIndustry(null)}
                            className={`flex items-center gap-2 mb-6 ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('admin.knowledgeBase.backToIndustries', 'Back to Industries')}
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                {getIndustryIcon()}
                            </div>
                            <div>
                                <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedIndustry.name}</h2>
                                <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>{t('admin.knowledgeBase.showingKeyAIUseCases', 'Showing Key AI usecases')}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {selectedIndustry.use_cases.map((uc) => (
                                <div
                                    key={uc.id}
                                    onClick={() => setSelectedUseCase(uc)}
                                    className={`rounded-xl p-6 border cursor-pointer transition ${isLight ? 'bg-white border-gray-200 hover:border-purple-400' : 'bg-surface-800 border-white/10 hover:border-purple-500/50'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>{uc.title}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(uc.complexity)}`}>
                                                    {uc.complexity}
                                                </span>
                                            </div>
                                            <p className={`mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{uc.description}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {uc.technologies.slice(0, 4).map((tech) => (
                                                    <span key={tech} className={`text-xs px-2 py-1 rounded ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-surface-700 text-gray-300'}`}>
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right ml-6">
                                            <div className="flex items-center gap-2 text-green-400 mb-2">
                                                <TrendingUp className="w-4 h-4" />
                                                <span className="text-sm font-medium">{uc.typical_roi}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-sm">{uc.implementation_time}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Use Case Detail View */}
                {selectedUseCase && (
                    <div>
                        <button
                            onClick={() => setSelectedUseCase(null)}
                            className={`flex items-center gap-2 mb-6 ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('admin.knowledgeBase.backTo', { name: selectedIndustry?.name || 'Industry' })}
                        </button>

                        <div className={`rounded-xl p-8 border ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.title}</h2>
                                        <span className={`text-sm px-3 py-1 rounded ${getComplexityColor(selectedUseCase.complexity)}`}>
                                            {selectedUseCase.complexity} {t('admin.knowledgeBase.complexity', 'Complexity')}
                                        </span>
                                    </div>
                                    <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>{selectedUseCase.category}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-400">{selectedUseCase.typical_roi}</div>
                                    <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.typicalRoi', 'Typical ROI')}</div>
                                </div>
                            </div>

                            <p className={`text-lg mb-8 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{selectedUseCase.description}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-surface-700'}`}>
                                    <h4 className={`text-sm font-medium mb-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.dataRequirements', 'Data Requirements')}</h4>
                                    <p className={isLight ? 'text-gray-900' : 'text-white'}>{selectedUseCase.data_requirements}</p>
                                </div>
                                <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-surface-700'}`}>
                                    <h4 className={`text-sm font-medium mb-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.implementationTime', 'Implementation Time')}</h4>
                                    <p className={isLight ? 'text-gray-900' : 'text-white'}>{selectedUseCase.implementation_time}</p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h4 className={`text-sm font-medium mb-3 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.technologies', 'Technologies')}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedUseCase.technologies.map((tech) => (
                                        <span key={tech} className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-sm">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className={`text-sm font-medium mb-3 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.kpis', 'Key Performance Indicators')}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedUseCase.kpis.map((kpi) => (
                                        <span key={kpi} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm">
                                            {kpi}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
