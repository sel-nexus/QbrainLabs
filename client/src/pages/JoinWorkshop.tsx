import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { useSession } from '../context/SessionContext';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, ArrowLeft, UserCircle } from 'lucide-react';
import { ParticipantAuth } from '../components/ParticipantAuth';

export function JoinWorkshop() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [pin, setPin] = useState(searchParams.get('pin') || '');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFacilitator, setIsFacilitator] = useState(false);
    const [showAdvancedAuth, setShowAdvancedAuth] = useState(false);

    const { login } = useSession();

    const handleAdvancedAuthSuccess = (data: { token: string; participant: any; mode: 'anonymous' | 'registered' }) => {
        // Store token for future requests
        localStorage.setItem('participant_token', data.token);
        
        // Login via session context
        login({
            participantId: data.participant.id,
            workshopId: '', // Will be set when joining
            name: data.participant.display_name,
            role: 'PARTICIPANT'
        });
        
        navigate('/lobby');
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin || !name) return;

        setLoading(true);
        setError('');

        try {
            const { data } = await api.post('/join', {
                pin: pin.toUpperCase(),
                display_name: name,
                role: isFacilitator ? "FACILITATOR" : "PARTICIPANT"
            });

            // Save session info via Context
            login({
                participantId: data.participant_id,
                workshopId: data.workshop_id,
                name: name,
                role: data.role
            });

            // Navigation is handled by the component or finding we are in a valid session
            // But waiting for "state" to direct us is better?
            // For now, default to lobby, and let lobby redirect if state is different.
            navigate('/lobby');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to join. check PIN.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
            <Button
                variant="ghost"
                className="absolute top-6 left-6 text-gray-400 hover:text-white"
                onClick={() => navigate('/')}
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-md"
            >
                <h1 className="text-3xl font-heading font-bold text-center mb-8">Join Session</h1>

                <form onSubmit={handleJoin} className="space-y-6">
                    <Input
                        inputMode="text"
                        className="text-4xl text-center tracking-widest uppercase py-6 font-mono font-bold placeholder:tracking-normal placeholder:normal-case placeholder:text-2xl placeholder:font-sans"
                        placeholder="Enter PIN"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                    />

                    <Input
                        placeholder="Your Name"
                        className="text-center text-lg"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    {error && (
                        <div className="text-center text-semantic-danger text-sm bg-semantic-danger/10 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center space-x-2 justify-center">
                        <input
                            type="checkbox"
                            id="facilitator"
                            checked={isFacilitator}
                            onChange={(e) => setIsFacilitator(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-surface-900"
                        />
                        <label htmlFor="facilitator" className="text-sm text-gray-400">Join as Facilitator</label>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-lg"
                        disabled={!pin || !name || loading}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <span className="flex items-center">Join <ArrowRight className="ml-2 w-4 h-4" /></span>}
                    </Button>

                    {/* Toggle to advanced auth */}
                    <button
                        type="button"
                        onClick={() => setShowAdvancedAuth(true)}
                        className="w-full text-sm text-gray-400 hover:text-brand-violet transition-colors flex items-center justify-center gap-2"
                    >
                        <UserCircle className="w-4 h-4" />
                        Sign in to track contributions
                    </button>
                </form>
            </motion.div>

            {/* Advanced Auth Modal */}
            {showAdvancedAuth && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-surface-900 rounded-xl border border-white/10 p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold mb-4 text-center">Join Workshop</h2>
                        
                        {/* PIN display if provided */}
                        {pin && (
                            <div className="text-center mb-4 p-2 bg-surface-800 rounded-lg">
                                <span className="text-gray-400 text-sm">Workshop PIN: </span>
                                <span className="font-mono font-bold text-brand-violet">{pin.toUpperCase()}</span>
                            </div>
                        )}
                        
                        <ParticipantAuth
                            workshopPin={pin.toUpperCase()}
                            onAuthSuccess={handleAdvancedAuthSuccess}
                            onCancel={() => setShowAdvancedAuth(false)}
                        />
                    </motion.div>
                </div>
            )}
        </div>
    );
}
