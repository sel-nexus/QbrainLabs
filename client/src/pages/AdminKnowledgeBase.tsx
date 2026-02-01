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

import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;

export function AdminKnowledgeBase() {
    const { theme } = useTheme();
    const [overview, setOverview] = useState<KnowledgeBaseOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState<IndustryDetail | null>(null);
    const [selectedUseCase, setSelectedUseCase] = useState<UseCaseTemplate | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
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

            toast.success(`Successfully imported ${uploadFile.name}`);
            setUploadFile(null);
            setShowUploadModal(false);
            fetchOverview(); // Refresh stats
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to uploading document');
        } finally {
            setUploading(false);
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
        <AdminLayout title="AI Knowledge Base" actions={
            <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition"
            >
                <BookOpen className="w-4 h-4" />
                Import Knowledge
            </button>
        }>
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

                        <h3 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>Import Knowledge</h3>
                        <p className={`mb-6 text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Upload PDF, PPT, Word documents, or Images (JPG, PNG) to enhance the AI knowledge base.
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
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isLight ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-400'}`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    </div>
                                    <p className={`font-medium mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>Click to upload or drag and drop</p>
                                    <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>PDF, PPTX, DOCX, JPG, PNG (max 10MB)</p>
                                </label>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-white/5'}`}
                            >
                                Cancel
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
                                        Processing...
                                    </>
                                ) : (
                                    'Import Document'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
