import { useState, useEffect } from 'react';
import { 
  Search, Star, Download, Heart, TrendingUp, Clock, Award,
  ChevronRight, Grid, List, Tag, Building2, FileText, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  long_description?: string;
  category: string;
  industry?: string;
  tags: string[];
  preview_image_url?: string;
  author_name: string;
  author_id: string;
  is_free: boolean;
  price_credits: number;
  status: string;
  is_featured: boolean;
  is_verified: boolean;
  usage_count: number;
  view_count: number;
  average_rating: number;
  rating_count: number;
  version: string;
  created_at: string;
  published_at?: string;
}

interface FeaturedData {
  featured: Template[];
  trending: Template[];
  new_arrivals: Template[];
  top_rated: Template[];
}

interface Industry {
  name: string;
  slug: string;
  template_count: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CATEGORIES = [
  { id: 'WORKSHOP', label: 'Workshop Templates', icon: Building2 },
  { id: 'SURVEY', label: 'Survey Templates', icon: FileText },
  { id: 'SCORING_CRITERIA', label: 'Scoring Criteria', icon: BarChart3 }
];

export function TemplateMarketplace() {
  const [featuredData, setFeaturedData] = useState<FeaturedData | null>(null);
  const [searchResults, setSearchResults] = useState<Template[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchFeatured();
    fetchIndustries();
  }, []);

  useEffect(() => {
    if (searchQuery || selectedCategory || selectedIndustry) {
      setSearchMode(true);
      searchTemplates();
    } else {
      setSearchMode(false);
    }
  }, [searchQuery, selectedCategory, selectedIndustry, sortBy]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchFeatured = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/featured`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setFeaturedData(data);
      }
    } catch (error) {
      console.error('Failed to fetch featured templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndustries = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/industries`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setIndustries(data.industries);
      }
    } catch (error) {
      console.error('Failed to fetch industries:', error);
    }
  };

  const searchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedIndustry) params.append('industry', selectedIndustry);
      params.append('sort_by', sortBy);
      
      const res = await fetch(`${API_BASE}/api/marketplace/search?${params}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.templates);
      }
    } catch (error) {
      console.error('Failed to search templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/${templateId}/use`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Template ready to use!');
        console.log('Template data:', data.template_data);
        setShowDetailModal(false);
      } else {
        toast.error('Failed to use template');
      }
    } catch (error) {
      toast.error('Failed to use template');
    }
  };

  const favoriteTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/${templateId}/favorite`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to favorite');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'WORKSHOP': return <Building2 className="w-4 h-4" />;
      case 'SURVEY': return <FileText className="w-4 h-4" />;
      case 'SCORING_CRITERIA': return <BarChart3 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const TemplateCard = ({ template }: { template: Template }) => (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => {
        setSelectedTemplate(template);
        setShowDetailModal(true);
      }}
    >
      {/* Preview Image */}
      <div className="h-40 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative">
        {template.preview_image_url ? (
          <img src={template.preview_image_url} alt={template.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-white text-4xl font-bold opacity-50">
            {template.name.charAt(0)}
          </div>
        )}
        {template.is_featured && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Award className="w-3 h-3" /> Featured
          </span>
        )}
        {template.is_free ? (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
            Free
          </span>
        ) : (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded-full">
            {template.price_credits} credits
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {getCategoryIcon(template.category)}
          <span className="text-xs text-gray-500 uppercase">{template.category.replace('_', ' ')}</span>
        </div>
        
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">{template.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{template.short_description}</p>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-medium">{template.average_rating.toFixed(1)}</span>
            <span className="text-gray-400">({template.rating_count})</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Download className="w-4 h-4" />
            <span>{template.usage_count}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-xs text-indigo-600 font-medium">{template.author_name.charAt(0)}</span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">{template.author_name}</span>
        </div>
      </div>
    </div>
  );

  const TemplateSection = ({ title, templates, icon: Icon }: { title: string; templates: Template[]; icon: React.ElementType }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <button className="flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          View all <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.slice(0, 4).map(template => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );

  if (loading && !featuredData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Template Marketplace</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and use pre-built templates for workshops, surveys, and scoring criteria
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory || ''}
            onChange={e => setSelectedCategory(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>

          {/* Industry Filter */}
          <select
            value={selectedIndustry || ''}
            onChange={e => setSelectedIndustry(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="">All Industries</option>
            {industries.map(ind => (
              <option key={ind.slug} value={ind.name}>{ind.name} ({ind.template_count})</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="rating">Top Rated</option>
            <option value="usage">Most Used</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedCategory || selectedIndustry || searchQuery) && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full flex items-center gap-1">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-indigo-900">&times;</button>
              </span>
            )}
            {selectedCategory && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full flex items-center gap-1">
                {selectedCategory}
                <button onClick={() => setSelectedCategory(null)} className="ml-1 hover:text-indigo-900">&times;</button>
              </span>
            )}
            {selectedIndustry && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full flex items-center gap-1">
                {selectedIndustry}
                <button onClick={() => setSelectedIndustry(null)} className="ml-1 hover:text-indigo-900">&times;</button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
                setSelectedIndustry(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {searchMode ? (
        /* Search Results */
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchResults.length} templates found
          </p>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
              : 'space-y-4'
            }>
              {searchResults.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
          {searchResults.length === 0 && !loading && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No templates found matching your criteria</p>
            </div>
          )}
        </div>
      ) : (
        /* Featured Sections */
        featuredData && (
          <>
            {featuredData.featured.length > 0 && (
              <TemplateSection title="Featured Templates" templates={featuredData.featured} icon={Award} />
            )}
            {featuredData.trending.length > 0 && (
              <TemplateSection title="Trending Now" templates={featuredData.trending} icon={TrendingUp} />
            )}
            {featuredData.new_arrivals.length > 0 && (
              <TemplateSection title="New Arrivals" templates={featuredData.new_arrivals} icon={Clock} />
            )}
            {featuredData.top_rated.length > 0 && (
              <TemplateSection title="Top Rated" templates={featuredData.top_rated} icon={Star} />
            )}
          </>
        )
      )}

      {/* Template Detail Modal */}
      {showDetailModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header Image */}
            <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative">
              {selectedTemplate.preview_image_url ? (
                <img src={selectedTemplate.preview_image_url} alt={selectedTemplate.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-white text-6xl font-bold opacity-50">
                  {selectedTemplate.name.charAt(0)}
                </div>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(selectedTemplate.category)}
                    <span className="text-sm text-gray-500 uppercase">{selectedTemplate.category.replace('_', ' ')}</span>
                    {selectedTemplate.is_verified && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Verified</span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTemplate.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{selectedTemplate.short_description}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 py-4 border-y border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xl font-bold">{selectedTemplate.average_rating.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-gray-500">{selectedTemplate.rating_count} reviews</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{selectedTemplate.usage_count}</p>
                  <p className="text-sm text-gray-500">Downloads</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{selectedTemplate.view_count}</p>
                  <p className="text-sm text-gray-500">Views</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">v{selectedTemplate.version}</p>
                  <p className="text-sm text-gray-500">Version</p>
                </div>
              </div>

              {/* Description */}
              {selectedTemplate.long_description && (
                <div className="py-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400">{selectedTemplate.long_description}</p>
                </div>
              )}

              {/* Tags */}
              {selectedTemplate.tags.length > 0 && (
                <div className="py-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Author */}
              <div className="py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-medium">{selectedTemplate.author_name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedTemplate.author_name}</p>
                    <p className="text-sm text-gray-500">Template Author</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => useTemplate(selectedTemplate.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  <Download className="w-5 h-5" />
                  {selectedTemplate.is_free ? 'Use Template' : `Use for ${selectedTemplate.price_credits} credits`}
                </button>
                <button
                  onClick={() => favoriteTemplate(selectedTemplate.id)}
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Heart className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateMarketplace;
