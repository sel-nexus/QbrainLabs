import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Loader2, Plus, Trash2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { UseCaseData } from './UseCaseForm';

interface BulkUseCaseFormProps {
    onSubmit: (useCases: UseCaseData[]) => Promise<void>;
    onSuccess?: () => void;
}

interface BulkUseCaseEntry extends UseCaseData {
    tempId: string;
}

export function BulkUseCaseForm({ onSubmit, onSuccess }: BulkUseCaseFormProps) {
    const [loading, setLoading] = useState(false);
    const [useCases, setUseCases] = useState<BulkUseCaseEntry[]>([
        {
            tempId: crypto.randomUUID(),
            title: '',
            description: '',
            proposed_solution: '',
            kpi: '',
            target_user: '',
            category: 'Generative AI'
        }
    ]);

    const addUseCase = () => {
        setUseCases([...useCases, {
            tempId: crypto.randomUUID(),
            title: '',
            description: '',
            proposed_solution: '',
            kpi: '',
            target_user: '',
            category: 'Generative AI'
        }]);
    };

    const removeUseCase = (tempId: string) => {
        if (useCases.length === 1) {
            toast.error("You must have at least one use case");
            return;
        }
        setUseCases(useCases.filter(uc => uc.tempId !== tempId));
    };

    const updateUseCase = (tempId: string, field: keyof UseCaseData, value: string) => {
        setUseCases(useCases.map(uc => 
            uc.tempId === tempId ? { ...uc, [field]: value } : uc
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all use cases
        const invalidUseCases = useCases.filter(uc => 
            !uc.title || !uc.description || !uc.target_user || !uc.kpi
        );

        if (invalidUseCases.length > 0) {
            toast.error("Please fill in all required fields for all use cases");
            return;
        }

        setLoading(true);
        try {
            // Remove tempId before submitting
            const cleanedUseCases = useCases.map(({ tempId, ...rest }) => rest);
            await onSubmit(cleanedUseCases);
            
            toast.success(`${useCases.length} use case(s) added successfully!`);
            
            // Reset form
            setUseCases([{
                tempId: crypto.randomUUID(),
                title: '',
                description: '',
                proposed_solution: '',
                kpi: '',
                target_user: '',
                category: 'Generative AI'
            }]);

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to add use cases");
        } finally {
            setLoading(false);
        }
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());
                
                // Skip header row
                const dataLines = lines.slice(1);
                
                const importedUseCases: BulkUseCaseEntry[] = dataLines.map(line => {
                    const [title, description, proposed_solution, kpi, target_user, category] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                    return {
                        tempId: crypto.randomUUID(),
                        title: title || '',
                        description: description || '',
                        proposed_solution: proposed_solution || '',
                        kpi: kpi || '',
                        target_user: target_user || '',
                        category: category || 'Generative AI'
                    };
                }).filter(uc => uc.title); // Only include rows with titles

                if (importedUseCases.length === 0) {
                    toast.error("No valid use cases found in CSV");
                    return;
                }

                setUseCases(importedUseCases);
                toast.success(`Imported ${importedUseCases.length} use case(s) from CSV`);
            } catch (error) {
                console.error(error);
                toast.error("Failed to parse CSV file");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const downloadTemplate = () => {
        const headers = ['Title', 'Description', 'Proposed Solution', 'KPI', 'Target User', 'Category'];
        const sampleRow = ['Sample Use Case', 'Problem description', 'Solution description', 'Expected benefit', 'End users', 'Generative AI'];
        const csvContent = [
            headers.join(','),
            sampleRow.map(cell => `"${cell}"`).join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'use_cases_template.csv';
        link.click();
        toast.success("Template downloaded");
    };

    return (
        <div className="space-y-6">
            {/* Import/Export Controls */}
            <div className="flex items-center justify-between p-4 rounded-lg theme-bg-tertiary theme-border border">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 theme-text-secondary" />
                    <span className="text-sm font-medium theme-text-primary">Bulk Import</span>
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={downloadTemplate}
                    >
                        <Upload className="w-3 h-3 mr-1" /> Download Template
                    </Button>
                    <label className="cursor-pointer">
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleCSVImport}
                        />
                        <div className="inline-block">
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-8 text-xs pointer-events-none"
                            >
                                <Upload className="w-3 h-3 mr-1" /> Import CSV
                            </Button>
                        </div>
                    </label>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Use Cases List */}
                <div className="space-y-4">
                    {useCases.map((useCase, index) => (
                        <div key={useCase.tempId} className="p-4 rounded-lg border theme-border theme-bg-secondary space-y-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold theme-text-primary">Use Case #{index + 1}</h3>
                                {useCases.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-7 text-xs text-red-500 hover:bg-red-500/10"
                                        onClick={() => removeUseCase(useCase.tempId)}
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                                    </Button>
                                )}
                            </div>

                            <Input
                                label="Title"
                                placeholder="e.g. Automated Customer Support"
                                value={useCase.title}
                                onChange={e => updateUseCase(useCase.tempId, 'title', e.target.value)}
                                required
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Target User"
                                    placeholder="e.g. Support Agents"
                                    value={useCase.target_user}
                                    onChange={e => updateUseCase(useCase.tempId, 'target_user', e.target.value)}
                                    required
                                />
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="text-sm theme-text-secondary pl-1">AI Technique</label>
                                    <select
                                        className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary focus:outline-none focus:border-brand-violet transition-colors"
                                        value={useCase.category}
                                        onChange={e => updateUseCase(useCase.tempId, 'category', e.target.value)}
                                    >
                                        <option>Generative AI</option>
                                        <option>Predictive ML</option>
                                        <option>Computer Vision</option>
                                        <option>Robotics</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm theme-text-secondary pl-1">Problem Statement</label>
                                <textarea
                                    className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors min-h-[80px]"
                                    placeholder="Describe the pain point..."
                                    value={useCase.description}
                                    onChange={e => updateUseCase(useCase.tempId, 'description', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm theme-text-secondary pl-1">Proposed Solution</label>
                                <textarea
                                    className="w-full theme-input-bg theme-border border-b-2 px-4 py-3 rounded-t-md theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:border-brand-violet transition-colors min-h-[80px]"
                                    placeholder="How does AI solve it?"
                                    value={useCase.proposed_solution}
                                    onChange={e => updateUseCase(useCase.tempId, 'proposed_solution', e.target.value)}
                                />
                            </div>

                            <Input
                                label="Expected Benefit (KPI)"
                                placeholder="e.g. Reduce handle time by 20%"
                                value={useCase.kpi}
                                onChange={e => updateUseCase(useCase.tempId, 'kpi', e.target.value)}
                                required
                            />
                        </div>
                    ))}
                </div>

                {/* Add Another Button */}
                <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={addUseCase}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Another Use Case
                </Button>

                {/* Submit Button */}
                <div className="pt-4 border-t theme-border">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm theme-text-secondary">
                            Total: <span className="font-bold theme-text-primary">{useCases.length}</span> use case(s)
                        </span>
                    </div>
                    <Button
                        type="submit"
                        className="w-full justify-center h-12 text-lg"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : `Add ${useCases.length} Use Case${useCases.length > 1 ? 's' : ''}`}
                    </Button>
                </div>
            </form>
        </div>
    );
}
