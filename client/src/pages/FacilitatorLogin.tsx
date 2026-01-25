import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
                navigate('/dashboard', { replace: true });
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block mb-4">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            AI Hotspot Matrix
                        </h1>
                    </Link>
                    <p className="text-gray-400">
                        {isLogin ? 'Welcome back, Facilitator' : 'Create your facilitator account'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div>
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    required={!isLogin}
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                placeholder="facilitator@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                placeholder={isLogin ? 'Enter your password' : 'Min. 8 characters'}
                                minLength={isLogin ? undefined : 8}
                            />
                            {!isLogin && (
                                <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg shadow-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="text-purple-400 hover:text-purple-300 text-sm transition"
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>

                {/* Back to Home */}
                <div className="text-center mt-6">
                    <Link to="/" className="text-gray-400 hover:text-gray-300 text-sm transition">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
