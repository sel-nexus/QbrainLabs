import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { Search, Star, Download, Building2, FileText, BarChart3, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface WorkshopTemplate {
  id: string;
  name: string;
  category: string;
  industry?: string;
  description?: string;
  criteria: any;
  config: any;
  usage_count: number;
  rating: number;
  rating_count: number;
}

interface CriteriaTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  criteria: any;
}

interface TemplateSelectorProps {
  onSelectTemplate: (template: { criteria: any; config: any; name: string }) => void;
  selectedTemplateId?: string;
}

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [workshopTemplates, setWorkshopTemplates] = useState<WorkshopTemplate[]>([]);
  const [criteriaTemplates, setCriteriaTemplates] = useState<CriteriaTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (showModal) {
      fetchTemplates();
    }
  }, [showModal]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const [workshopRes, criteriaRes] = await Promise.all([
        api.get('templates/workshop-templates'),
        api.get('templates/criteria-templates')
      ]);
      setWorkshopTemplates(workshopRes.data);
      setCriteriaTemplates(criteriaRes.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkshopTemplate = async (template: WorkshopTemplate) => {
    try {
      const { data } = await api.post(`templates/workshop-templates/${template.id}/use`, {
        customize: true
      });
      onSelectTemplate({
        criteria: data.criteria,
        config: data.config,
        name: data.workshop_title || template.name
      });
      setShowModal(false);
      toast.success('Template applied');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to use template');
    }
  };

  const handleSelectCriteriaTemplate = (template: CriteriaTemplate) => {
    onSelectTemplate({
      criteria: template.criteria,
      config: {},
      name: template.name
    });
    setShowModal(false);
    toast.success('Criteria template applied');
  };

  const filteredWorkshopTemplates = workshopTemplates.filter(t => {
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredCriteriaTemplates = criteriaTemplates.filter(t => {
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <>
      <Button variant="secondary" onClick={() => setShowModal(true)}>
        <FileText className="w-4 h-4 mr-2" /> Browse Templates
      </Button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Select Template"
          size="large"
        >
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Categories</option>
                <option value="AI_STRATEGY">AI Strategy</option>
                <option value="INNOVATION_SPRINT">Innovation Sprint</option>
                <option value="EXECUTIVE_BRIEFING">Executive Briefing</option>
                <option value="TECHNICAL_DEEP_DIVE">Technical Deep Dive</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <>
                {/* Workshop Templates */}
                {filteredWorkshopTemplates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5" /> Workshop Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {filteredWorkshopTemplates.map(template => (
                        <div
                          key={template.id}
                          className="border rounded-lg p-4 hover:border-indigo-500 cursor-pointer transition-colors"
                          onClick={() => handleSelectWorkshopTemplate(template)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                            {template.industry && (
                              <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                                {template.industry}
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              {template.rating.toFixed(1)} ({template.rating_count})
                            </div>
                            <div className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {template.usage_count}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Criteria Templates */}
                {filteredCriteriaTemplates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" /> Criteria Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {filteredCriteriaTemplates.map(template => (
                        <div
                          key={template.id}
                          className="border rounded-lg p-4 hover:border-indigo-500 cursor-pointer transition-colors"
                          onClick={() => handleSelectCriteriaTemplate(template)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {template.category}
                            </span>
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {template.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredWorkshopTemplates.length === 0 && filteredCriteriaTemplates.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No templates found matching your search</p>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
