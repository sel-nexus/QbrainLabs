import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/config';
import { LayoutDashboard } from 'lucide-react';

export function FacilitatorLogin() {
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading, user } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        organization: '',
        confirm_password: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            if (user?.is_admin) {
                navigate('/admin', { replace: true });
            } else {
                navigate('/facilitator/dashboard', { replace: true });
            }
        }
    }, [isAuthenticated, isLoading, user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
                toast.success('Welcome back!');
            } else {
                if (formData.password !== formData.confirm_password) {
                    toast.error('Passwords do not match');
                    setLoading(false);
                    return;
                }
                const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        full_name: formData.full_name,
                        organization: formData.organization,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Signup failed');
                }

                toast.success("Account created! Your registration is pending admin approval. You'll receive an email when your account is activated.");
                setIsLogin(true);
                setFormData({ email: '', password: '', full_name: '', organization: '', confirm_password: '' });
            }
        } catch (error: any) {
            console.error('[FacilitatorLogin] Error:', error);
            toast.error(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(v => !v);
        setFormData({ email: '', password: '', full_name: '', organization: '', confirm_password: '' });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 theme-bg-primary">

            {/* Subtle radial glow — visible on both light and dark */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 overflow-hidden"
                style={{ zIndex: 0 }}
            >
                <div
                    className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full opacity-[0.07]"
                    style={{ background: 'radial-gradient(circle, hsl(250,100%,65%) 0%, transparent 70%)' }}
                />
                <div
                    className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full opacity-[0.05]"
                    style={{ background: 'radial-gradient(circle, hsl(320,100%,60%) 0%, transparent 70%)' }}
                />
            </div>

            <div className="relative z-10 w-full max-w-md">

                {/* Brand mark */}
                <div className="flex flex-col items-center mb-8 gap-3">
                    <div
                        className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-violet/10 border border-brand-violet/20"
                    >
                        <LayoutDashboard className="w-6 h-6 text-brand-violet" />
                    </div>
                    <span className="font-heading text-xl font-bold tracking-tight theme-text-primary">
                        Qbrain AI Labs
                    </span>
                </div>

                {/* Card */}
                <div className="theme-card rounded-2xl border shadow-lg overflow-hidden">

                    {/* Tab strip */}
                    <div className="flex theme-bg-secondary border-b theme-border">
                        {(['Sign In', 'Create Account'] as const).map((label, i) => {
                            const active = isLogin ? i === 0 : i === 1;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => i === 0 ? (isLogin ? undefined : switchMode()) : (isLogin ? switchMode() : undefined)}
                                    className={[
                                        'flex-1 py-3 text-sm font-medium transition-colors',
                                        active
                                            ? 'theme-text-primary border-b-2 border-brand-violet'
                                            : 'contrast-muted hover:theme-text-secondary',
                                    ].join(' ')}
                                    style={{ borderBottom: active ? '2px solid hsl(250,100%,65%)' : '2px solid transparent', marginBottom: -1 }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Form */}
                    <div className="p-8">
                        <p className="text-sm contrast-secondary mb-6">
                            {isLogin
                                ? 'Sign in to your facilitator account to continue.'
                                : 'Create your account. An admin will approve it before you can sign in.'}
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {!isLogin && (
                                <>
                                    <Field label="Full Name">
                                        <input
                                            type="text"
                                            required
                                            value={formData.full_name}
                                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-lg text-sm theme-input border focus:ring-2 focus:ring-brand-violet/40 transition"
                                            placeholder="Jane Smith"
                                        />
                                    </Field>
                                    <Field label="Organization">
                                        <input
                                            type="text"
                                            required
                                            value={formData.organization}
                                            onChange={e => setFormData({ ...formData, organization: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-lg text-sm theme-input border focus:ring-2 focus:ring-brand-violet/40 transition"
                                            placeholder="Your Company Name"
                                        />
                                    </Field>
                                </>
                            )}

                            <Field label="Email Address">
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-lg text-sm theme-input border focus:ring-2 focus:ring-brand-violet/40 transition"
                                    placeholder="you@example.com"
                                />
                            </Field>

                            <Field label="Password">
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-lg text-sm theme-input border focus:ring-2 focus:ring-brand-violet/40 transition"
                                    placeholder={isLogin ? 'Enter your password' : 'Min. 8 characters'}
                                    minLength={isLogin ? undefined : 8}
                                />
                                {!isLogin && (
                                    <p className="mt-1.5 text-xs contrast-muted">Must be at least 8 characters</p>
                                )}
                            </Field>

                            {!isLogin && (
                                <Field label="Confirm Password">
                                    <input
                                        type="password"
                                        required
                                        value={formData.confirm_password}
                                        onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-lg text-sm theme-input border focus:ring-2 focus:ring-brand-violet/40 transition"
                                        placeholder="Re-enter your password"
                                        minLength={8}
                                    />
                                </Field>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-brand-violet text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-brand-violet/90 focus:outline-none focus:ring-2 focus:ring-brand-violet focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ '--tw-ring-offset-color': 'var(--theme-bg-primary)' } as React.CSSProperties}
                            >
                                {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
                            </button>
                        </form>

                        {/* Footer link */}
                        <p className="mt-5 text-center text-sm contrast-muted">
                            {isLogin ? (
                                <>
                                    Don't have an account?{' '}
                                    <Link
                                        to="/facilitator-register"
                                        className="font-medium text-brand-violet hover:text-brand-violet/80 transition"
                                    >
                                        Request access
                                    </Link>
                                </>
                            ) : (
                                <>
                                    Already have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={switchMode}
                                        className="font-medium text-brand-violet hover:text-brand-violet/80 transition"
                                    >
                                        Sign in
                                    </button>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Small helper so each field label + input pair stays DRY ─────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-semibold uppercase tracking-wide contrast-secondary mb-1.5">
                {label}
            </label>
            {children}
        </div>
    );
}
