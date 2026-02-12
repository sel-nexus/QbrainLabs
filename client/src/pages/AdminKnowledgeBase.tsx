import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
    Brain,
    Search,
    Building2,
    Cpu,
    TrendingUp,
    ChevronRight,
    ArrowLeft,
    BookOpen,
    Trash2,
    Clock,
    CheckCircle,
    AlertCircle,
    Plus,
    Sparkles,
    ArrowRightLeft,
    Move
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { ConfirmationModal } from '../components/ConfirmationModal';
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
    is_new?: boolean;
    is_refinable?: boolean;
    existing_usecase_id?: string;
    refinement_suggestions?: string;
}

interface IndustryDetail {
    id: string;
    name: string;
    icon: string;
    use_cases: UseCaseTemplate[];
}

interface KnowledgeArticle {
    id: string;
    title: string;
    source_type: string;
    source_filename?: string;
    source_url?: string;
    validation_status: string;
    validation_score?: number;
    imported_at: string;
    linked_usecases_count: number;
}

import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;

export function AdminKnowledgeBase() {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const [overview, setOverview] = useState<KnowledgeBaseOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'articles'>('overview');
    const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
    const [loadingArticles, setLoadingArticles] = useState(false);
    const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState<IndustryDetail | null>(null);
    const [selectedUseCase, setSelectedUseCase] = useState<UseCaseTemplate | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [showResearchModal, setShowResearchModal] = useState(false);
    const [researchProvider, setResearchProvider] = useState<'perplexity' | 'google'>('perplexity');
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchResults, setResearchResults] = useState<SearchResult[]>([]);
    const [customScope, setCustomScope] = useState('');
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [targetIndustry, setTargetIndustry] = useState('');
    const [isNewIndustry, setIsNewIndustry] = useState(false);
    const [newIndustryName, setNewIndustryName] = useState('');
    const [usecaseToDelete, setUsecaseToDelete] = useState<UseCaseTemplate | null>(null);
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
            toast.error(t('admin.knowledgeBase.failedLoad', 'Failed to load Knowledge Base'));
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
            toast.error(t('admin.knowledgeBase.failedLoadIndustry', 'Failed to load industry details'));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);

        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/knowledge-base/documents/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Upload failed');
            }

            toast.success(t('admin.knowledgeBase.importSuccess', { name: uploadFile.name }));
            setUploadFile(null);
            setShowUploadModal(false);
            fetchOverview(); // Refresh stats
            fetchArticles(); // Refresh list
            setActiveTab('articles'); // Switch to articles view
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error instanceof Error ? error.message : t('common.error', 'Error occurred'));
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'articles') {
            fetchArticles();
        }
    }, [activeTab]);

    const fetchArticles = async () => {
        setLoadingArticles(true);
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/knowledge/articles`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch articles');
            const data = await response.json();
            setArticles(data);
        } catch (error) {
            console.error('Error fetching articles:', error);
            toast.error(t('admin.knowledgeBase.failedLoadArticles', 'Failed to load articles'));
        } finally {
            setLoadingArticles(false);
        }
    };

    const handleDeleteArticle = async () => {
        if (!articleToDelete) return;

        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/knowledge/articles/${articleToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (!response.ok) throw new Error('Failed to delete article');

            toast.success(t('admin.knowledgeBase.deleteSuccess', 'Article deleted successfully'));
            fetchArticles(); // Refresh list
            setArticleToDelete(null);
        } catch (error) {
            console.error('Error deleting article:', error);
            toast.error(t('admin.knowledgeBase.failedDelete', 'Failed to delete article'));
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

    const handleAddResearchItem = async (result: SearchResult) => {
        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/knowledge-base/add`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: result.title,
                    description: result.description,
                    industry_id: result.industry,
                    category: result.category,
                    complexity: result.complexity,
                    typical_roi: result.typical_roi,
                    implementation_time: "3-6 months",
                    technologies: []
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.detail || 'Failed to add use case';
                throw new Error(errorMessage);
            }
            toast.success('Use case added to library');
            setResearchResults(prev => prev.filter(r => r.id !== result.id));
            fetchOverview(); // Refresh stats
        } catch (error) {
            console.error('Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to add use case to library');
        }
    };

    const handleMoveUseCase = async () => {
        if (!selectedUseCase) return;
        if (isNewIndustry && !newIndustryName) return;
        if (!isNewIndustry && !targetIndustry) return;

        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/knowledge-base/move`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usecase_id: selectedUseCase.id,
                    target_industry_id: isNewIndustry ? newIndustryName : targetIndustry,
                    create_industry: isNewIndustry
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to move use case');
            }

            const data = await response.json();
            toast.success(data.message || 'Use case moved successfully');
            setShowMoveModal(false);
            setTargetIndustry('');
            setIsNewIndustry(false);
            setNewIndustryName('');
            setSelectedUseCase(null);
            setSelectedIndustry(null);
            fetchOverview(); // Refresh to show updated industries
        } catch (error) {
            console.error('Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to move use case');
        }
    };

    const handleDeleteUseCase = async () => {
        if (!usecaseToDelete) return;

        try {
            const authToken = localStorage.getItem('hm_auth_token');
            const response = await fetch(`${API_BASE}/api/knowledge-base/usecases/${usecaseToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to delete use case');
            }

            const data = await response.json();
            toast.success(data.message || 'Use case deleted successfully');
            setShowDeleteModal(false);
            setUsecaseToDelete(null);
            setSelectedUseCase(null);
            setSelectedIndustry(null);
            fetchOverview(); // Refresh to show updated industries
        } catch (error) {
            console.error('Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete use case');
        }
    };

    if (loading) {
        return (
            <AdminLayout title={t('admin.knowledgeBase.title', 'AI Knowledge Base')}>
                <div className="flex items-center justify-center py-20">
                    <div className={isLight ? 'text-gray-500' : 'text-gray-400'}>{t('common.loading')}</div>
                </div>
            </AdminLayout>
        );
    }

    // Show use case detail
    if (selectedUseCase) {
        return (
            <AdminLayout title={t('admin.knowledgeBase.title', 'AI Knowledge Base')}>
                <button
                    onClick={() => setSelectedUseCase(null)}
                    className={`flex items-center gap-2 mb-6 ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('admin.knowledgeBase.backTo', { name: selectedIndustry?.name || 'Industry' })}
                </button>

                <div className={`rounded-xl border p-8 ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h3 className={`text-2xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm ${getComplexityColor(selectedUseCase.complexity)}`}>
                                {selectedUseCase.complexity} {t('admin.knowledgeBase.complexity', 'Complexity')}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Move button clicked', {selectedUseCase, showMoveModal});
                                    setShowMoveModal(true);
                                    console.log('setShowMoveModal(true) called');
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${isLight ? 'border-gray-200 hover:bg-gray-50 text-gray-700' : 'border-white/10 hover:bg-white/5 text-gray-300'}`}
                                title="Move to another industry"
                                type="button"
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                                Move
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Delete button clicked', {selectedUseCase, showDeleteModal});
                                    setUsecaseToDelete(selectedUseCase);
                                    setShowDeleteModal(true);
                                    console.log('setShowDeleteModal(true) called');
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-500 transition"
                                title="Delete use case"
                                type="button"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </div>

                    <p className={`mb-8 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{selectedUseCase.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-white/5'}`}>
                            <div className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.categories', 'Category')}</div>
                            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.category}</div>
                        </div>
                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-white/5'}`}>
                            <div className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.typicalRoi', 'Typical ROI')}</div>
                            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.typical_roi}</div>
                        </div>
                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-white/5'}`}>
                            <div className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.implementationTime', 'Implementation Time')}</div>
                            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.implementation_time}</div>
                        </div>
                        <div className={`rounded-lg p-4 ${isLight ? 'bg-gray-50' : 'bg-white/5'}`}>
                            <div className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.dataRequirements', 'Data Requirements')}</div>
                            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUseCase.data_requirements}</div>
                        </div>
                    </div>

                    {selectedUseCase.technologies?.length > 0 && (
                        <div className="mb-6">
                            <h4 className={`text-lg font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.technologies', 'Technologies')}</h4>
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
                            <h4 className={`text-lg font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.kpis', 'Key Performance Indicators')}</h4>
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

                {/* Move Use Case Modal */}
                {(() => {
                    console.log('Modal render check:', {showMoveModal, selectedUseCase: !!selectedUseCase});
                    return showMoveModal && selectedUseCase;
                })() && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className={`relative w-full max-w-md p-6 rounded-2xl shadow-xl ${isLight ? 'bg-white' : 'bg-surface-800 border border-white/10'}`}>
                            <button
                                onClick={() => {
                                    setShowMoveModal(false);
                                    setTargetIndustry('');
                                    setIsNewIndustry(false);
                                    setNewIndustryName('');
                                }}
                                className={`absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <h3 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>Move Use Case</h3>
                            <p className={`mb-6 text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                Move "{selectedUseCase?.title}" to a different industry. You can select an existing industry or enter a new industry name to create it.
                            </p>

                            <div className="mb-6">
                                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                    Target Industry
                                </label>
                                <select
                                    value={isNewIndustry ? 'new' : targetIndustry}
                                    onChange={(e) => {
                                        if (e.target.value === 'new') {
                                            setIsNewIndustry(true);
                                            setTargetIndustry('');
                                        } else {
                                            setIsNewIndustry(false);
                                            setTargetIndustry(e.target.value);
                                            setNewIndustryName('');
                                        }
                                    }}
                                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-surface-700 border-white/5 text-white'}`}
                                >
                                    <option value="">Select an industry...</option>
                                    {overview?.industries.map((industry) => (
                                        <option key={industry.id} value={industry.id}>
                                            {industry.name}
                                        </option>
                                    ))}
                                    <option value="new">+ Create New Industry</option>
                                </select>
                            </div>

                            {isNewIndustry && (
                                <div className="mb-6">
                                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                        New Industry Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newIndustryName}
                                        onChange={(e) => setNewIndustryName(e.target.value)}
                                        placeholder="Enter new industry name"
                                        className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${isLight ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-700 border-white/5 text-white placeholder-gray-500'}`}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowMoveModal(false);
                                        setTargetIndustry('');
                                        setIsNewIndustry(false);
                                        setNewIndustryName('');
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-white/5'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMoveUseCase}
                                    disabled={isNewIndustry ? !newIndustryName : !targetIndustry}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 ${(isNewIndustry ? !newIndustryName : !targetIndustry)
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'
                                    }`}
                                >
                                    <Move className="w-4 h-4" />
                                    Move Use Case
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setUsecaseToDelete(null);
                    }}
                    onConfirm={handleDeleteUseCase}
                    title="Delete Use Case"
                    message={`Are you sure you want to delete "${usecaseToDelete?.title}"? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    variant="danger"
                />
            </AdminLayout>
        );
    }

    // Show industry detail
    if (selectedIndustry) {
        return (
            <AdminLayout title={t('admin.knowledgeBase.title', 'AI Knowledge Base')}>
                <button
                    onClick={() => setSelectedIndustry(null)}
                    className={`flex items-center gap-2 mb-6 ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('admin.knowledgeBase.backToIndustries', 'Back to Industries')}
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h3 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedIndustry.name}</h3>
                        <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>{t('admin.knowledgeBase.showingKeyAIUseCases')}</p>
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
        <AdminLayout title={t('admin.knowledgeBase.title', 'AI Knowledge Base')} actions={
            <div className="flex gap-3">
                <button
                    onClick={() => setShowResearchModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition"
                >
                    <Sparkles className="w-4 h-4" />
                    {t('admin.knowledgeBase.researchUseCases', 'Research Use Cases')}
                </button>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition"
                >
                    <BookOpen className="w-4 h-4" />
                    {t('admin.knowledgeBase.importKnowledge', 'Import Knowledge')}
                </button>
            </div>
        }>
            {/* Tabs */}
            <div className="flex items-center gap-4 mb-8 border-b border-gray-200 dark:border-white/10">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 text-sm font-medium transition ${activeTab === 'overview'
                        ? 'text-purple-500 border-b-2 border-purple-500'
                        : isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    {t('admin.knowledgeBase.overview', 'Overview')}
                </button>
                <button
                    onClick={() => setActiveTab('articles')}
                    className={`pb-3 text-sm font-medium transition ${activeTab === 'articles'
                        ? 'text-purple-500 border-b-2 border-purple-500'
                        : isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    {t('admin.knowledgeBase.manageArticles', 'Manage Articles')}
                </button>
            </div>

            {activeTab === 'overview' && (
                <>
                    {/* Search */}
                    <div className="relative mb-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('admin.knowledgeBase.searchPlaceholder') as string}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:border-purple-500/50 ${isLight ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-800 border-white/10 text-white placeholder-gray-400'}`}
                        />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                            <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{overview?.total_industries || 0}</div>
                            <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.industries', 'Industries')}</div>
                        </div>
                        <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                            <div className="text-2xl font-bold text-purple-500">{overview?.total_use_cases || 0}</div>
                            <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.useCases', 'Use Cases')}</div>
                        </div>
                        <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                            <div className="text-2xl font-bold text-blue-500">{overview?.total_categories || 0}</div>
                            <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.categories', 'Categories')}</div>
                        </div>
                        <div className={`rounded-xl p-4 border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-surface-800 border-white/10'}`}>
                            <div className="text-2xl font-bold text-green-500">{overview?.total_technologies || 0}</div>
                            <div className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.technologies', 'Technologies')}</div>
                        </div>
                    </div>

                    {/* Industries Grid */}
                    <h3 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.browseByIndustry', 'Browse by Industry')}</h3>
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
                                            <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {industry.use_case_count} {industry.use_case_count === 1 ? 'use case' : 'use cases'}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {activeTab === 'articles' && (
                <div className="space-y-6">
                    {loadingArticles ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        </div>
                    ) : articles.length === 0 ? (
                        <div className={`text-center py-12 ${isLight ? 'bg-gray-50' : 'bg-surface-800'} rounded-xl border ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                            <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <h3 className={`text-lg font-medium mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.noArticles', 'No articles found')}</h3>
                            <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                {t('admin.knowledgeBase.importPrompt', 'Import a document to get started.')}
                            </p>
                        </div>
                    ) : (
                        <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/10'}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className={`border-b ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                                        <tr>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {t('common.title')}
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {t('admin.knowledgeBase.source', 'Source')}
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {t('admin.knowledgeBase.validation', 'Validation')}
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {t('admin.knowledgeBase.linkages', 'Linkages')}
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {t('common.date')}
                                            </th>
                                            <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {t('common.actions')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isLight ? 'divide-gray-200' : 'divide-white/10'}`}>
                                        {articles.map((article) => (
                                            <tr key={article.id} className={`transition-colors ${isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}>
                                                <td className="px-6 py-4">
                                                    <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                                        {article.title}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 text-xs rounded uppercase font-medium ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-white/10 text-gray-300'
                                                            }`}>
                                                            {article.source_type}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {article.validation_status === 'validated' ? (
                                                            <span className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs">
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                {article.validation_score}/100
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs">
                                                                <AlertCircle className="w-3.5 h-3.5" />
                                                                {t('common.pending')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                                        {article.linked_usecases_count} Use Cases
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`text-sm flex items-center gap-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(article.imported_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => setArticleToDelete(article.id)}
                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title={t('common.delete')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`relative w-full max-w-lg p-6 rounded-2xl shadow-xl ${isLight ? 'bg-white' : 'bg-surface-800 border border-white/10'}`}>
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className={`absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h3 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.importKnowledge', 'Import Knowledge')}</h3>
                        <p className={`mb-6 text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            {t('admin.knowledgeBase.uploadHelp')}
                        </p>

                        <div className={`border-2 border-dashed rounded-xl p-8 mb-6 flex flex-col items-center justify-center text-center transition-colors ${uploadFile ? 'border-purple-500 bg-purple-50/10' :
                            isLight ? 'border-gray-300 hover:border-purple-400' : 'border-white/10 hover:border-purple-500/50'
                            }`}>
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                onChange={handleFileSelect}
                                accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.jpg,.jpeg,.png"
                            />

                            {uploadFile ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <p className={`font-medium mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>{uploadFile.name}</p>
                                    <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <button
                                        onClick={() => setUploadFile(null)}
                                        className="mt-3 text-xs text-red-500 hover:underline"
                                    >
                                        {t('admin.knowledgeBase.removeFile', 'Remove file')}
                                    </button>
                                </div>
                            ) : (
                                <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isLight ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-400'}`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    </div>
                                    <p className={`font-medium mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.uploadPrompt')}</p>
                                    <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.uploadNote')}</p>
                                </label>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-white/5'}`}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!uploadFile || uploading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 ${!uploadFile || uploading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'
                                    }`}
                            >
                                {uploading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        {t('admin.knowledgeBase.processing', 'Processing...')}
                                    </>
                                ) : (
                                    t('admin.knowledgeBase.importDocument', 'Import Document')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!articleToDelete}
                onClose={() => setArticleToDelete(null)}
                onConfirm={handleDeleteArticle}
                title={t('admin.knowledgeBase.deleteConfirmTitle', 'Delete Knowledge Article')}
                message={t('admin.knowledgeBase.deleteConfirmMessage', 'Are you sure you want to delete this knowledge article? This will remove all associated use case linkages and cannot be undone.')}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
                variant="danger"
            />

            {/* Research Modal */}
            {showResearchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-xl ${isLight ? 'bg-white' : 'bg-surface-800 border border-white/10'}`}>
                        <button
                            onClick={() => setShowResearchModal(false)}
                            className={`absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h2 className={`text-xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('admin.knowledgeBase.publicResearchRefresh', 'Public Research Refresh')}</h2>
                        <p className={`text-sm mb-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.knowledgeBase.discoverTrendingDesc', 'Discover trending use cases from the web')}</p>

                        <div className="space-y-6">
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{t('admin.knowledgeBase.researchProvider', 'Research Provider')}</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setResearchProvider('perplexity')}
                                        className={`flex-1 p-3 rounded-lg border-2 transition ${researchProvider === 'perplexity'
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : isLight ? 'border-gray-200 hover:border-gray-300' : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className={`font-medium ${researchProvider === 'perplexity' ? 'text-purple-500' : isLight ? 'text-gray-900' : 'text-white'}`}>Perplexity AI</div>
                                        <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Real-time web research</div>
                                    </button>
                                    <button
                                        onClick={() => setResearchProvider('google')}
                                        className={`flex-1 p-3 rounded-lg border-2 transition ${researchProvider === 'google'
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : isLight ? 'border-gray-200 hover:border-gray-300' : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className={`font-medium ${researchProvider === 'google' ? 'text-blue-500' : isLight ? 'text-gray-900' : 'text-white'}`}>Google Search</div>
                                        <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Comprehensive search</div>
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

                            <button
                                onClick={handleResearch}
                                disabled={researchLoading}
                                className={`w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 ${researchLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'}`}
                            >
                                {researchLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        {t('admin.knowledgeBase.processing', 'Researching...')}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        {t('admin.knowledgeBase.startDiscovery', 'Start Discovery')}
                                    </>
                                )}
                            </button>

                            {researchResults.length > 0 && (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    <h3 className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Research Results ({researchResults.length})</h3>
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
                                                            {result.is_new && (
                                                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">
                                                                    NEW
                                                                </span>
                                                            )}
                                                            {result.is_refinable && (
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
                                                {result.is_refinable && result.refinement_suggestions && (
                                                    <div className={`text-xs p-2 rounded mb-2 ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-300'}`}>
                                                        <strong>Refinements:</strong> {result.refinement_suggestions}
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
                                                title={result.is_refinable ? "Update Existing Use Case" : "Add to Library"}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Move Use Case Modal */}
            {(() => {
                console.log('Modal render check:', {showMoveModal, selectedUseCase: !!selectedUseCase});
                return showMoveModal && selectedUseCase;
            })() && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`relative w-full max-w-md p-6 rounded-2xl shadow-xl ${isLight ? 'bg-white' : 'bg-surface-800 border border-white/10'}`}>
                        <button
                            onClick={() => {
                                setShowMoveModal(false);
                                setTargetIndustry('');
                            }}
                            className={`absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h3 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>Move Use Case</h3>
                        <p className={`mb-6 text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Move "{selectedUseCase?.title}" to a different industry. You can select an existing industry or enter a new industry name to create it.
                        </p>

                        <div className="mb-6">
                            <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                Target Industry
                            </label>
                            <input
                                type="text"
                                value={targetIndustry}
                                onChange={(e) => setTargetIndustry(e.target.value)}
                                placeholder="Enter industry name or ID"
                                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${isLight ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-surface-700 border-white/5 text-white placeholder-gray-500'}`}
                            />
                            <p className={`mt-2 text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                Available industries: {overview?.industries.map(i => i.name).join(', ')}
                            </p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowMoveModal(false);
                                    setTargetIndustry('');
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-white/5'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMoveUseCase}
                                disabled={!targetIndustry}
                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 ${!targetIndustry
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'
                                }`}
                            >
                                <Move className="w-4 h-4" />
                                Move Use Case
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setUsecaseToDelete(null);
                }}
                onConfirm={handleDeleteUseCase}
                title="Delete Use Case"
                message={`Are you sure you want to delete "${usecaseToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </AdminLayout>
    );
}
