import { useState } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { User, Mail, Lock, Building, UserPlus, LogIn } from 'lucide-react';

interface ParticipantAuthProps {
    workshopPin?: string;
    onAuthSuccess: (data: {
        token: string;
        participant: any;
        mode: 'anonymous' | 'registered';
    }) => void;
    onCancel?: () => void;
}

export function ParticipantAuth({ workshopPin, onAuthSuccess, onCancel }: ParticipantAuthProps) {
    const [mode, setMode] = useState<'login' | 'register' | 'anonymous'>('anonymous');
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [organization, setOrganization] = useState('');

    const handleAnonymousJoin = async () => {
        if (!displayName.trim()) {
            toast.error('Please enter a display name');
            return;
        }
        if (!workshopPin) {
            toast.error('Workshop PIN is required');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/participant-auth/join-anonymous', {
                workshop_pin: workshopPin,
                display_name: displayName.trim()
            });
            
            onAuthSuccess({
                token: response.data.access_token,
                participant: response.data.participant,
                mode: 'anonymous'
            });
            
            toast.success('Joined workshop successfully!');
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'Failed to join workshop';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            toast.error('Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/participant-auth/login', {
                email,
                password
            });
            
            // If workshop PIN is provided, also join the workshop
            if (workshopPin) {
                const joinResponse = await api.post('/participant-auth/join-registered', {
                    workshop_pin: workshopPin
                }, {
                    headers: { 'Authorization': `Bearer ${response.data.access_token}` }
                });
                
                onAuthSuccess({
                    token: joinResponse.data.access_token,
                    participant: joinResponse.data.participant,
                    mode: 'registered'
                });
            } else {
                onAuthSuccess({
                    token: response.data.access_token,
                    participant: response.data.participant,
                    mode: 'registered'
                });
            }
            
            toast.success('Logged in successfully!');
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'Login failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!email || !password || !displayName) {
            toast.error('Please fill in all required fields');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/participant-auth/register', {
                email,
                password,
                display_name: displayName.trim(),
                organization: organization.trim() || null
            });
            
            // If workshop PIN is provided, also join the workshop
            if (workshopPin) {
                const joinResponse = await api.post('/participant-auth/join-registered', {
                    workshop_pin: workshopPin
                }, {
                    headers: { 'Authorization': `Bearer ${response.data.access_token}` }
                });
                
                onAuthSuccess({
                    token: joinResponse.data.access_token,
                    participant: joinResponse.data.participant,
                    mode: 'registered'
                });
            } else {
                onAuthSuccess({
                    token: response.data.access_token,
                    participant: response.data.participant,
                    mode: 'registered'
                });
            }
            
            toast.success('Account created successfully!');
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'Registration failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Mode Tabs */}
            <div className="flex mb-6 bg-surface-800 rounded-lg p-1">
                <button
                    onClick={() => setMode('anonymous')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        mode === 'anonymous'
                            ? 'bg-brand-violet text-white'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Quick Join
                </button>
                <button
                    onClick={() => setMode('login')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        mode === 'login'
                            ? 'bg-brand-violet text-white'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Sign In
                </button>
                <button
                    onClick={() => setMode('register')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        mode === 'register'
                            ? 'bg-brand-violet text-white'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Register
                </button>
            </div>

            {/* Anonymous Join Form */}
            {mode === 'anonymous' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-400 mb-4">
                        Join quickly without creating an account. Your contributions won't be tracked across workshops.
                    </p>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Display Name *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="How should we call you?"
                                className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-white/10 rounded-lg focus:border-brand-violet focus:outline-none"
                            />
                        </div>
                    </div>

                    <Button 
                        onClick={handleAnonymousJoin} 
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Joining...' : 'Join Workshop'}
                    </Button>
                </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-400 mb-4">
                        Sign in to track your contributions across workshops.
                    </p>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Email *
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-white/10 rounded-lg focus:border-brand-violet focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Password *
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-white/10 rounded-lg focus:border-brand-violet focus:outline-none"
                            />
                        </div>
                    </div>

                    <Button 
                        onClick={handleLogin} 
                        disabled={loading}
                        className="w-full"
                    >
                        <LogIn className="w-4 h-4 mr-2" />
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </div>
            )}

            {/* Register Form */}
            {mode === 'register' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-400 mb-4">
                        Create an account to track contributions and build your innovation portfolio.
                    </p>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Display Name *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your name"
                                className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-white/10 rounded-lg focus:border-brand-violet focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Email *
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-white/10 rounded-lg focus:border-brand-violet focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Password *
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-white/10 rounded-lg focus:border-brand-violet focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Organization (optional)
                        </label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={organization}
                                onChange={(e) => setOrganization(e.target.value)}
                                placeholder="Company or team name"
                                className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-white/10 rounded-lg focus:border-brand-violet focus:outline-none"
                            />
                        </div>
                    </div>

                    <Button 
                        onClick={handleRegister} 
                        disabled={loading}
                        className="w-full"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                </div>
            )}

            {onCancel && (
                <button
                    onClick={onCancel}
                    className="w-full mt-4 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
            )}
        </div>
    );
}
