import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Upload, Loader2, X } from 'lucide-react';
import { challengesApi } from '../../lib/api/challenges';
import { toast } from 'sonner';
import { Input } from '../ui/Input';
import type { ChallengeCard, ChallengeCardCreate, ChallengeCardUpdate } from '../../lib/api/challenges';
import { useTheme } from '../../context/ThemeContext';

interface ChallengeFormProps {
  challenge?: ChallengeCard | null;
  onSubmit: (data: ChallengeCardCreate | ChallengeCardUpdate) => Promise<void>;
  onCancel: () => void;
}

export function ChallengeForm({ challenge, onSubmit, onCancel }: ChallengeFormProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (challenge) {
      setTitle(challenge.title);
      setDescription(challenge.challenge_description);
      setSuccessCriteria(
        challenge.success_criteria && challenge.success_criteria.length > 0
          ? challenge.success_criteria
          : ['']
      );
    } else {
      // Default title for new challenge
      setTitle('Challenge card 1');
      setDescription('');
      setSuccessCriteria(['']);
    }
  }, [challenge]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (!description.trim()) {
      newErrors.description = 'Challenge description is required';
    } else if (description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or less';
    }

    const validCriteria = successCriteria.filter(c => c.trim().length > 0);
    if (validCriteria.length === 0) {
      newErrors.success_criteria = 'At least one success criterion is required';
    } else if (validCriteria.length > 10) {
      newErrors.success_criteria = 'Maximum 10 success criteria allowed';
    }

    for (let i = 0; i < validCriteria.length; i++) {
      if (validCriteria[i].length > 500) {
        newErrors[`criterion_${i}`] = 'Each criterion must be 500 characters or less';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const validCriteria = successCriteria.filter(c => c.trim().length > 0);
      const data = {
        title: title.trim(),
        challenge_description: description.trim(),
        success_criteria: validCriteria
      };

      await onSubmit(data);
    } catch (error) {
      console.error('Error saving challenge card:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCriterion = () => {
    if (successCriteria.length < 10) {
      setSuccessCriteria([...successCriteria, '']);
    }
  };

  const removeCriterion = (index: number) => {
    if (successCriteria.length > 1) {
      setSuccessCriteria(successCriteria.filter((_, i) => i !== index));
    }
  };

  const updateCriterion = (index: number, value: string) => {
    const updated = [...successCriteria];
    updated[index] = value;
    setSuccessCriteria(updated);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAnalyzing(true);
      const candidates = await challengesApi.analyzeFile(file);

      if (candidates && candidates.length > 0) {
        // Use the first candidate
        const candidate = candidates[0];
        setTitle(candidate.title);
        setDescription(candidate.challenge_description);
        setSuccessCriteria(candidate.success_criteria || ['']);
        toast.success(`Imported content from ${file.name}`);

        if (candidates.length > 1) {
          toast.info(`Found ${candidates.length} challenges. Using the first one.`);
        }
      } else {
        toast.warning('No challenges identified in the file');
      }
    } catch (error) {
      console.error('File analysis error:', error);
      toast.error('Failed to analyze file');
    } finally {
      setAnalyzing(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`p-1 ${theme === 'light'
      ? ''
      : ''
      }`}>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium theme-text-secondary">
              Title <span className="text-red-400">*</span>
            </label>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".docx,.pptx,.pdf,.md,.txt,.jpg,.jpeg,.png"
                onChange={handleFileImport}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing || loading}
                className="flex items-center gap-2 text-xs"
              >
                {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Import from File
              </Button>
            </div>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Challenge card 1"
            maxLength={100}
            className={errors.title ? 'border-red-500' : ''}
          />
          <div className="flex justify-between mt-1">
            {errors.title && <span className="text-sm text-red-400">{errors.title}</span>}
            <span className="text-xs contrast-muted ml-auto">{title.length}/100</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium theme-text-secondary mb-2">
            Challenge Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the high-value business or technology problem..."
            rows={6}
            maxLength={2000}
            className={`w-full px-4 py-2 border rounded-lg theme-text-primary focus:outline-none focus:ring-2 focus:ring-brand-violet ${theme === 'light'
              ? 'bg-gray-50 border-gray-200 placeholder-gray-400'
              : 'bg-surface-700 border-white/10 placeholder-gray-500'
              } ${errors.description ? 'border-red-500' : ''}`}
          />
          <div className="flex justify-between mt-1">
            {errors.description && (
              <span className="text-sm text-red-400">{errors.description}</span>
            )}
            <span className="text-xs contrast-muted ml-auto">{description.length}/2000</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium theme-text-secondary mb-2">
            Success Criteria <span className="text-red-400">*</span>
            <span className="text-xs contrast-muted font-normal ml-2">
              (1-10 criteria, each max 500 characters)
            </span>
          </label>
          <div className="space-y-2">
            {successCriteria.map((criterion, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={criterion}
                    onChange={(e) => updateCriterion(index, e.target.value)}
                    placeholder={`Criterion ${index + 1}`}
                    maxLength={500}
                    className={errors[`criterion_${index}`] ? 'border-red-500' : ''}
                  />
                </div>
                {successCriteria.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeCriterion(index)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {successCriteria.length < 10 && (
              <Button
                type="button"
                variant="ghost"
                onClick={addCriterion}
                className="text-brand-violet hover:text-brand-violet/80"
              >
                + Add Criterion
              </Button>
            )}
          </div>
          {errors.success_criteria && (
            <span className="text-sm text-red-400 mt-1 block">{errors.success_criteria}</span>
          )}
        </div>

        <div className={`flex gap-3 justify-end pt-4 border-t ${theme === 'light' ? 'border-gray-200' : 'border-white/10'
          }`}>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : challenge ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}
