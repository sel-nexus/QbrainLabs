import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export function FacilitatorLogin() {
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading, user } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
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
                // Handle signup separately
                const response = await fetch(`http://localhost:8000/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        full_name: formData.full_name,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Signup failed');
                }

                // After signup, switch to login
                toast.success('Account created! Please log in.');
                setIsLogin(true);
                setFormData({ ...formData, full_name: '' });
            }
        } catch (error: any) {
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-brand-violet text-white font-semibold rounded-lg shadow-lg hover:bg-brand-violet/90 focus:outline-none focus:ring-2 focus:ring-brand-violet focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ focusRingOffsetColor: 'var(--theme-bg-primary)' }}
                        >
                            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    {/* Toggle Login/Signup */}
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setFormData({ email: '', password: '', full_name: '' });
                            }}
                            className="text-sm transition text-brand-violet hover:text-brand-violet/80"
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
