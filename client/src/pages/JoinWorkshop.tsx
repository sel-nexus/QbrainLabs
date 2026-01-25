import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, UserCircle, CheckCircle, Users } from 'lucide-react';
import { ParticipantAuth } from '../components/ParticipantAuth';
import { toast } from 'sonner';

export function JoinWorkshop() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [searchParams] = useSearchParams();
    const [pin, setPin] = useState(searchParams.get('pin') || '');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFacilitator, setIsFacilitator] = useState(false);
    const [requestFacilitatorAccess, setRequestFacilitatorAccess] = useState(false);
    const [showAdvancedAuth, setShowAdvancedAuth] = useState(false);
    const [showFacilitatorRequestSuccess, setShowFacilitatorRequestSuccess] = useState(false);
    const [facilitatorRequestId, setFacilitatorRequestId] = useState('');
    const [email, setEmail] = useState('');

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
            // US32: If requesting facilitator access, submit the request first
            if (requestFacilitatorAccess) {
                const { data: requestData } = await api.post(`/workshops/${pin.toUpperCase()}/facilitator-request`, {
                    name: name,
                    email: email || undefined,
                    session_id: undefined
                });
                
                setFacilitatorRequestId(requestData.request_id);
                setShowFacilitatorRequestSuccess(true);
                toast.success('Facilitator access request submitted!');
                setLoading(false);
                return;
            }

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
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${
            theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'
        }`}>
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-md"
            >
                <h1 className={`text-3xl font-heading font-bold text-center mb-8 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                    Join Session
                </h1>

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
                        <div className="text-center text-semantic-danger text-sm bg-semantic-danger/10 p-3 rounded-lg font-medium">
                            {error}
                        </div>
                    )}

                    {/* US32: Join as options */}
                    <div className={`p-4 rounded-lg ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-800'}`}>
                        <p className={`text-sm font-medium mb-3 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                            Join as:
                        </p>
                        <div className="space-y-2">
                            <label className={`flex items-center gap-3 p-2 rounded cursor-pointer ${
                                !requestFacilitatorAccess 
                                    ? (theme === 'light' ? 'bg-brand-violet/10 border-brand-violet' : 'bg-brand-violet/20') 
                                    : ''
                            }`}>
                                <input
                                    type="radio"
                                    name="joinType"
                                    checked={!requestFacilitatorAccess}
                                    onChange={() => setRequestFacilitatorAccess(false)}
                                    className="w-4 h-4"
                                />
                                <Users className="w-4 h-4" />
                                <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                                    Participant (Default)
                                </span>
                            </label>
                            <label className={`flex items-center gap-3 p-2 rounded cursor-pointer ${
                                requestFacilitatorAccess 
                                    ? (theme === 'light' ? 'bg-brand-violet/10 border-brand-violet' : 'bg-brand-violet/20') 
                                    : ''
                            }`}>
                                <input
                                    type="radio"
                                    name="joinType"
                                    checked={requestFacilitatorAccess}
                                    onChange={() => setRequestFacilitatorAccess(true)}
                                    className="w-4 h-4"
                                />
                                <UserCircle className="w-4 h-4" />
                                <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                                    Request Facilitator Access
                                </span>
                            </label>
                        </div>
                        
                        {/* Email field for facilitator request */}
                        {requestFacilitatorAccess && (
                            <div className="mt-3">
                                <Input
                                    type="email"
                                    placeholder="Email (optional, for notifications)"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="text-sm"
                                />
                                <p className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Provide email to receive approval notification
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Legacy facilitator checkbox - hidden but kept for backward compatibility */}
                    <input type="hidden" value={isFacilitator ? "true" : "false"} />

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
                        className={`w-full text-sm transition-colors flex items-center justify-center gap-2 ${
                            theme === 'light' 
                                ? 'text-gray-500 hover:text-brand-violet' 
                                : 'text-gray-400 hover:text-brand-violet'
                        }`}
                    >
                        <UserCircle className="w-4 h-4" />
                        Sign in to track contributions
                    </button>
                </form>

                {/* Back to Home */}
                <div className="text-center mt-8">
                    <Link 
                        to="/" 
                        className={`text-sm transition-colors ${
                            theme === 'light' 
                                ? 'text-gray-500 hover:text-gray-700' 
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        ← Back to Home
                    </Link>
                </div>
            </motion.div>

            {/* Advanced Auth Modal */}
            {showAdvancedAuth && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`rounded-xl border p-6 w-full max-w-md ${
                            theme === 'light' 
                                ? 'bg-white border-gray-200 shadow-xl' 
                                : 'bg-surface-900 border-white/10'
                        }`}
                    >
                        <h2 className={`text-xl font-bold mb-4 text-center ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                        }`}>
                            Join Workshop
                        </h2>
                        
                        {/* PIN display if provided */}
                        {pin && (
                            <div className={`text-center mb-4 p-2 rounded-lg ${
                                theme === 'light' ? 'bg-gray-100' : 'bg-surface-800'
                            }`}>
                                <span className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Workshop PIN:{' '}
                                </span>
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

            {/* US32: Facilitator Request Success Modal */}
            {showFacilitatorRequestSuccess && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`rounded-xl border p-6 w-full max-w-md ${
                            theme === 'light' 
                                ? 'bg-white border-gray-200 shadow-xl' 
                                : 'bg-surface-900 border-white/10'
                        }`}
                    >
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className={`text-xl font-bold mb-2 ${
                                theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}>
                                Request Submitted
                            </h2>
                            <p className={`mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                                Your request to join as a facilitator has been submitted for approval.
                            </p>
                            
                            <div className={`p-4 rounded-lg mb-4 text-left ${
                                theme === 'light' ? 'bg-gray-50' : 'bg-surface-800'
                            }`}>
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <strong>Workshop PIN:</strong> {pin.toUpperCase()}
                                </p>
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <strong>Your Name:</strong> {name}
                                </p>
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <strong>Request ID:</strong> {facilitatorRequestId}
                                </p>
                            </div>

                            <div className={`text-sm mb-6 text-left ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                                <p className="font-medium mb-2">What happens next?</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Your request will be reviewed by an administrator</li>
                                    <li>You will receive an email notification once approved or rejected</li>
                                    <li>If approved, you can access facilitator features</li>
                                </ol>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={() => {
                                        setShowFacilitatorRequestSuccess(false);
                                        setRequestFacilitatorAccess(false);
                                        // Join as participant now
                                        setIsFacilitator(false);
                                    }}
                                    className="flex-1"
                                >
                                    Join as Participant Now
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => navigate('/')}
                                    className="flex-1"
                                >
                                    Return to Home
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
