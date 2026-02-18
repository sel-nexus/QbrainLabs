import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/config';

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

    // Redirect if already authenticated
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
                // Use AuthContext login for proper state management
                await login(formData.email, formData.password);
                toast.success('Welcome back!');
                // Navigation will be handled by the useEffect above when isAuthenticated changes
            } else {
                // Validate password match
                if (formData.password !== formData.confirm_password) {
                    toast.error('Passwords do not match');
                    setLoading(false);
                    return;
                }
                // Handle signup separately
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
                    console.error('[FacilitatorLogin] Signup failed:', error);
                    throw new Error(error.detail || 'Signup failed');
                }

                // After signup, switch to login
                toast.success('Account created! Your registration is pending admin approval. You\'ll receive an email when your account is activated.');
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

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 theme-bg-secondary">
            <div className="max-w-md w-full">
                {/* Welcome Message */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2 theme-text-primary">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="theme-text-secondary">
                        {isLogin ? 'Sign in to your facilitator account' : 'Create your facilitator account'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="backdrop-blur-lg rounded-2xl p-8 shadow-2xl border theme-card">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <>
                                <div>
                                    <label htmlFor="full_name" className="block text-sm font-medium mb-2 theme-text-secondary">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        id="full_name"
                                        required={!isLogin}
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-transparent transition theme-input"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="organization" className="block text-sm font-medium mb-2 theme-text-secondary">
                                        Organization
                                    </label>
                                    <input
                                        type="text"
                                        id="organization"
                                        required={!isLogin}
                                        value={formData.organization}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-transparent transition theme-input"
                                        placeholder="Your Company Name"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2 theme-text-secondary">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-transparent transition theme-input"
                                placeholder="facilitator@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2 theme-text-secondary">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-transparent transition theme-input"
                                placeholder={isLogin ? 'Enter your password' : 'Min. 8 characters'}
                                minLength={isLogin ? undefined : 8}
                            />
                            {!isLogin && (
                                <p className="mt-1 text-xs contrast-muted">
                                    Password must be at least 8 characters
                                </p>
                            )}
                        </div>

                        {!isLogin && (
                            <div>
                                <label htmlFor="confirm_password" className="block text-sm font-medium mb-2 theme-text-secondary">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    id="confirm_password"
                                    required={!isLogin}
                                    value={formData.confirm_password}
                                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-transparent transition theme-input"
                                    placeholder="Re-enter your password"
                                    minLength={8}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-brand-violet text-white font-semibold rounded-lg shadow-lg hover:bg-brand-violet/90 focus:outline-none focus:ring-2 focus:ring-brand-violet focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ '--tw-ring-offset-color': 'var(--theme-bg-primary)' } as React.CSSProperties}
                        >
                            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    {/* Toggle Login/Register */}
                    <div className="mt-6 text-center">
                        {isLogin ? (
                            <p className="text-sm theme-text-secondary">
                                Don't have an account?{' '}
                                <Link
                                    to="/facilitator-register"
                                    className="text-brand-violet hover:text-brand-violet/80 font-medium transition"
                                >
                                    Request access
                                </Link>
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin(true);
                                    setFormData({ email: '', password: '', full_name: '', organization: '', confirm_password: '' });
                                }}
                                className="text-sm transition text-brand-violet hover:text-brand-violet/80"
                            >
                                Already have an account? Sign in
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
