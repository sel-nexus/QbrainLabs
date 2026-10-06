import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/config';
import { useConfirm } from '../context/ConfirmContext';

const API_BASE = API_BASE_URL;
const TOKEN_KEY = 'hm_auth_token';

type LLMProvider = 'openai' | 'azure_openai' | 'anthropic' | 'typesafe_ai';
type LLMRole = 'embedding' | 'decision' | 'reasoning';

interface LLMModelConfig {
    id: string;
    name: string;
    provider: LLMProvider;
    role: LLMRole;
    model_name: string;
    config_json: Record<string, string>;
    has_api_key: boolean;
    is_active: boolean;
}

interface FormState {
    id: string | null;
    name: string;
    provider: LLMProvider;
    role: LLMRole;
    model_name: string;
    api_key: string;
    endpoint: string;
    deployment: string;
    api_version: string;
    base_url: string;
    is_active: boolean;
}

const EMPTY_FORM: FormState = {
    id: null,
    name: '',
    provider: 'openai',
    role: 'reasoning',
    model_name: '',
    api_key: '',
    endpoint: '',
    deployment: '',
    api_version: '',
    base_url: '',
    is_active: true,
};

export function AdminLLMModels() {
    const confirm = useConfirm();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [models, setModels] = useState<LLMModelConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const authHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        'Content-Type': 'application/json',
    });

    const fetchModels = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/api/admin/llm-models`, {
                headers: authHeaders(),
            });
            if (!response.ok) throw new Error('Failed to fetch LLM models');
            setModels(await response.json());
        } catch (error) {
            console.error(error);
            toast.error('Failed to load LLM models');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const openCreateForm = () => {
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEditForm = (model: LLMModelConfig) => {
        setForm({
            id: model.id,
            name: model.name,
            provider: model.provider,
            role: model.role,
            model_name: model.model_name,
            api_key: '',
            endpoint: model.config_json?.endpoint || '',
            deployment: model.config_json?.deployment || '',
            api_version: model.config_json?.api_version || '',
            base_url: model.config_json?.base_url || '',
            is_active: model.is_active,
        });
        setShowForm(true);
    };

    const buildConfigJson = (f: FormState): Record<string, string> => {
        if (f.provider === 'azure_openai') {
            return { endpoint: f.endpoint, deployment: f.deployment, api_version: f.api_version };
        }
        if (f.provider === 'typesafe_ai') {
            return { base_url: f.base_url };
        }
        return {};
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body: Record<string, unknown> = {
                name: form.name,
                provider: form.provider,
                role: form.role,
                model_name: form.model_name,
                config_json: buildConfigJson(form),
                is_active: form.is_active,
            };
            if (form.api_key) {
                body.api_key = form.api_key;
            }

            const url = form.id
                ? `${API_BASE}/api/admin/llm-models/${form.id}`
                : `${API_BASE}/api/admin/llm-models`;
            const method = form.id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.detail || 'Failed to save LLM model');
            }

            toast.success(form.id ? 'Model updated' : 'Model created');
            setShowForm(false);
            fetchModels();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save LLM model');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!(await confirm.ok({ title: 'Delete this LLM model config?', message: 'Workshops using it will fall back to no model selected.', confirmText: 'Delete' }))) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/api/admin/llm-models/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            if (!response.ok) throw new Error('Failed to delete LLM model');
            toast.success('Model deleted');
            fetchModels();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete LLM model');
        }
    };

    return (
        <AdminLayout title="LLM Models">
            <div className="flex justify-end mb-6">
                <button
                    onClick={openCreateForm}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-violet text-white hover:bg-brand-violet/90"
                >
                    <Plus className="w-4 h-4" /> Add Model
                </button>
            </div>

            {loading ? (
                <p className="contrast-muted">Loading...</p>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                      <thead>
                          <tr className={`text-left border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                              <th className="py-2">Name</th>
                              <th className="py-2">Provider</th>
                              <th className="py-2">Role</th>
                              <th className="py-2">Model Name</th>
                              <th className="py-2">Active</th>
                              <th className="py-2">Actions</th>
                          </tr>
                      </thead>
                      <tbody>
                          {models.map((model) => (
                              <tr key={model.id} className={`border-b ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                                  <td className="py-2">{model.name}</td>
                                  <td className="py-2">{model.provider}</td>
                                  <td className="py-2">{model.role}</td>
                                  <td className="py-2">{model.model_name}</td>
                                  <td className="py-2">{model.is_active ? 'Yes' : 'No'}</td>
                                  <td className="py-2 flex gap-2">
                                      <button onClick={() => openEditForm(model)} aria-label="Edit">
                                          <Pencil className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleDelete(model.id)} aria-label="Delete">
                                          <Trash2 className="w-4 h-4 text-semantic-danger" />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <form
                        onSubmit={handleSubmit}
                        className={`w-full max-w-md rounded-xl p-6 space-y-4 ${isLight ? 'bg-white' : 'bg-surface-800'}`}
                    >
                        <h2 className="text-lg font-bold">{form.id ? 'Edit Model' : 'Add Model'}</h2>

                        <div>
                            <label className="block text-sm mb-1">Name</label>
                            <input
                                className="w-full px-3 py-2 rounded border"
                                placeholder="e.g. Reasoning Model"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Provider</label>
                            <select
                                className="w-full px-3 py-2 rounded border"
                                value={form.provider}
                                onChange={(e) => setForm({ ...form, provider: e.target.value as LLMProvider })}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="azure_openai">Azure OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="typesafe_ai">Typesafe AI</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Role</label>
                            <select
                                className="w-full px-3 py-2 rounded border"
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value as LLMRole })}
                            >
                                <option value="embedding">Embedding</option>
                                <option value="decision">Decision</option>
                                <option value="reasoning">Reasoning</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Model Name</label>
                            <input
                                className="w-full px-3 py-2 rounded border"
                                placeholder="e.g. gpt-4"
                                value={form.model_name}
                                onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                                required
                            />
                        </div>

                        {form.provider === 'azure_openai' && (
                            <>
                                <div>
                                    <label className="block text-sm mb-1">Endpoint</label>
                                    <input
                                        className="w-full px-3 py-2 rounded border"
                                        value={form.endpoint}
                                        onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">Deployment</label>
                                    <input
                                        className="w-full px-3 py-2 rounded border"
                                        value={form.deployment}
                                        onChange={(e) => setForm({ ...form, deployment: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">API Version</label>
                                    <input
                                        className="w-full px-3 py-2 rounded border"
                                        value={form.api_version}
                                        onChange={(e) => setForm({ ...form, api_version: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        {form.provider === 'typesafe_ai' && (
                            <div>
                                <label className="block text-sm mb-1">Base URL</label>
                                <input
                                    className="w-full px-3 py-2 rounded border"
                                    value={form.base_url}
                                    onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm mb-1">
                                API Key {form.id ? '(leave blank to keep existing)' : ''}
                            </label>
                            <input
                                type="password"
                                className="w-full px-3 py-2 rounded border"
                                value={form.api_key}
                                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                            />
                            Active
                        </label>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded border">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 rounded bg-brand-violet text-white"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
}
