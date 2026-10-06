import { useState, useEffect } from 'react';
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
import { errorMessage } from '../lib/apiErrors';
import { useTranslation } from 'react-i18next';

// Participant ids used on this device, so re-joining a workshop under the
// same name resumes the same identity (and ownership of earlier work).
const KNOWN_PARTICIPANTS_KEY = 'hm_known_participants';

function readKnownParticipantIds(): string[] {
    try {
        const ids = JSON.parse(localStorage.getItem(KNOWN_PARTICIPANTS_KEY) || '[]');
        return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string').slice(0, 50) : [];
    } catch {
        return [];
    }
}

function rememberParticipantId(id: string) {
    try {
        const ids = [id, ...readKnownParticipantIds().filter((x) => x !== id)].slice(0, 50);
        localStorage.setItem(KNOWN_PARTICIPANTS_KEY, JSON.stringify(ids));
    } catch {
        // storage unavailable: resume is best-effort
    }
}

export function JoinWorkshop() {
    const navigate = useNavigate();
    const { t } = useTranslation();
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

    const { login, logout, session } = useSession();
    const urlPin = (searchParams.get('pin') || '').trim().toUpperCase();
    // Set when a QR/link for a *different* workshop is opened while the
    // participant still has a session in another one.
    const [switchFrom, setSwitchFrom] = useState<string | null>(null);
    const [showHostOptions, setShowHostOptions] = useState(false);

    // Existing session: go back to it, unless the link is for another workshop.
    useEffect(() => {
        if (!(session && session.workshopId && session.participantId)) return;
        if (!urlPin) {
            navigate('/participant-dashboard', { replace: true });
            return;
        }
        let cancelled = false;
        api.get(`workshops/${session.workshopId}`)
            .then(({ data }) => {
                if (cancelled) return;
                if (String(data?.pin || '').toUpperCase() === urlPin) {
                    navigate('/participant-dashboard', { replace: true });
                } else {
                    setSwitchFrom(data?.title || t('join.currentWorkshop'));
                }
            })
            .catch((err) => {
                if (cancelled) return;
                // The old workshop no longer exists: just let them join the new one.
                if (err?.response?.status === 404) logout();
                else setSwitchFrom(t('join.currentWorkshop'));
            });
        return () => {
            cancelled = true;
        };
    }, [session, navigate, urlPin, logout, t]);

    const handleAdvancedAuthSuccess = async (data: { token: string; participant: any; mode: 'anonymous' | 'registered' }) => {
        // Store token for future requests
        localStorage.setItem('participant_token', data.token);

        try {
            let workshopId = '';
            let participantId = data.participant.id;

            // For anonymous participants, they always have a Participant record created during join
            // For registered participants:
            //   - If they logged in WITH a workshop PIN: participant.id is the Participant ID (from join-registered)
            //   - If they logged in WITHOUT a workshop PIN: participant.id is the RegisteredParticipant ID
            // 
            // We can distinguish by checking if the participant has is_registered flag and trying to fetch session
            // If it's a RegisteredParticipant ID, the session fetch will fail (404) because there's no Participant record yet

            if (data.participant.id) {
                try {
                    const response = await api.get(`/session/${data.participant.id}`);
                    workshopId = response.data?.workshop_id || '';
                    // Success means this is a valid Participant ID and they've joined a workshop
                } catch (err: any) {
                    // 404 means participant hasn't joined a workshop yet
                    // This is expected for registered participants logging in without a PIN
                    if (err.response?.status === 404) {
                        // Registered participant hasn't joined a workshop yet
                        // They need to enter a PIN to join
                        console.log('Participant has not joined a workshop yet');
                    } else {
                        console.warn('Could not fetch session info:', err);
                    }
                }
            }

            // Only create session and navigate if participant has joined a workshop
            if (workshopId && participantId) {
                // Login via session context
                login({
                    participantId: participantId,
                    workshopId: workshopId,
                    name: data.participant.display_name,
                    role: 'PARTICIPANT'
                });

                // Navigate to participant dashboard
                navigate('/participant-dashboard');
            } else {
                // If no workshop joined, keep them on join page so they can enter PIN
                // Don't create a session yet - they need to join a workshop first
                toast.info(t('join.enterPinToJoin'));
                // Close the auth modal so they can see the join form
                setShowAdvancedAuth(false);
            }
        } catch (error) {
            console.error('Error setting up participant session:', error);
            toast.error(t('join.sessionFailed'));
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Prevent multiple submissions
        if (loading) return;
        if (!pin || !name) return;

        console.log('[JoinWorkshop] Attempting join:', {
            pin: pin.toUpperCase(),
            name,
            isFacilitator,
            requestFacilitatorAccess
        });

        setLoading(true);
        setError('');

        try {
            // US32: If requesting facilitator access, submit the request first
            if (requestFacilitatorAccess) {
                console.log('[JoinWorkshop] Submitting facilitator request...');
                const { data: requestData } = await api.post(`workshops/${pin.toUpperCase()}/facilitator-request`, {
                    name: name,
                    email: email || undefined,
                    session_id: undefined
                });

                console.log('[JoinWorkshop] Facilitator request success:', requestData);
                setFacilitatorRequestId(requestData.request_id);
                setShowFacilitatorRequestSuccess(true);
                toast.success(t('join.requestSubmittedToast'));
                setLoading(false);
                return;
            }

            console.log('[JoinWorkshop] Sending join request...');
            const { data } = await api.post('join', {
                pin: pin.toUpperCase(),
                display_name: name,
                role: isFacilitator ? "FACILITATOR" : "PARTICIPANT",
                resume_participant_ids: readKnownParticipantIds(),
            });

            console.log('[JoinWorkshop] Join response:', data);

            // Validate response data before proceeding
            if (!data || !data.participant_id || !data.workshop_id) {
                console.error('[JoinWorkshop] Invalid response data:', data);
                throw new Error('Invalid response from server');
            }

            rememberParticipantId(String(data.participant_id));

            // Save session info via Context
            console.log('[JoinWorkshop] saving session context...');
            login({
                participantId: data.participant_id,
                workshopId: data.workshop_id,
                name: name,
                role: data.role || "PARTICIPANT"
            });

            // Navigate to participant dashboard to show tiles
            // Dashboard will handle phase-based redirects (e.g., to /scoring if in SCORING phase)
            console.log('[JoinWorkshop] Navigating to dashboard...');
            navigate('/participant-dashboard', { replace: true });
        } catch (err: any) {
            console.error('[JoinWorkshop] Join error:', err);
            const message = errorMessage(err, t('join.joinFailed'));
            setError(message);
            toast.error(message);
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-900'
            }`}>
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-md"
            >
                <h1 className={`text-3xl font-heading font-bold text-center mb-8 ${theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {t('join.title')}
                </h1>

                {switchFrom && (
                    <div role="alertdialog" aria-labelledby="switch-title" className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                        <p id="switch-title" className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                            {t('join.stillIn', { title: switchFrom })}
                        </p>
                        <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                            {t('join.differentWorkshop', { pin: urlPin })}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <Button type="button" onClick={() => { logout(); setSwitchFrom(null); }}>
                                {t('join.leaveAndJoin')}
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => navigate('/participant-dashboard', { replace: true })}>
                                {t('join.stayCurrent')}
                            </Button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleJoin} className="space-y-6" noValidate>
                    <Input
                        label={t('join.pinLabel')}
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        className="text-4xl text-center tracking-widest uppercase py-6 font-mono font-bold placeholder:tracking-normal placeholder:normal-case placeholder:text-2xl placeholder:font-sans"
                        placeholder={t('join.pinPlaceholder')}
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        disabled={loading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && loading) {
                                e.preventDefault();
                            }
                        }}
                    />

                    <Input
                        label={t('join.nameLabel')}
                        placeholder={t('join.namePlaceholder')}
                        maxLength={60}
                        autoComplete="name"
                        className="text-center text-lg"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && loading) {
                                e.preventDefault();
                            }
                        }}
                    />

                    {error && (
                        <div className="text-center text-semantic-danger text-sm bg-semantic-danger/10 p-3 rounded-lg font-medium">
                            {error}
                        </div>
                    )}

                    {/* US32: facilitator access requests are rare, so they sit behind a small
                        link instead of being a choice every participant has to read. */}
                    {!showHostOptions ? (
                        <button
                            type="button"
                            className={`w-full text-center text-sm underline ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}
                            onClick={() => setShowHostOptions(true)}
                        >
                            {t('join.hosting')}
                        </button>
                    ) : (
                    <div className={`p-4 rounded-lg ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-800'}`}>
                        <p className={`text-sm font-medium mb-3 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                            {t('join.joinAs')}
                        </p>
                        <div className="space-y-2">
                            <label className={`flex items-center gap-3 p-2 rounded cursor-pointer ${!requestFacilitatorAccess
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
                                    {t('join.asParticipant')}
                                </span>
                            </label>
                            <label className={`flex items-center gap-3 p-2 rounded cursor-pointer ${requestFacilitatorAccess
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
                                    {t('join.requestFacilitator')}
                                </span>
                            </label>
                        </div>

                        {/* Email field for facilitator request */}
                        {requestFacilitatorAccess && (
                            <div className="mt-3">
                                <Input
                                    type="email"
                                    placeholder={t('join.emailPlaceholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="text-sm"
                                />
                                <p className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {t('join.emailHelp')}
                                </p>
                            </div>
                        )}
                    </div>
                    )}

                    {/* Legacy facilitator checkbox - hidden but kept for backward compatibility */}
                    <input type="hidden" value={isFacilitator ? "true" : "false"} />

                    <Button
                        type="submit"
                        className="w-full h-12 text-lg"
                        disabled={!pin || !name || loading}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <span className="flex items-center">{t('join.join')} <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" /></span>}
                    </Button>

                    {/* Toggle to advanced auth */}
                    <button
                        type="button"
                        onClick={() => setShowAdvancedAuth(true)}
                        className={`w-full text-sm transition-colors flex items-center justify-center gap-2 ${theme === 'light'
                            ? 'text-gray-500 hover:text-brand-violet'
                            : 'text-gray-400 hover:text-brand-violet'
                            }`}
                    >
                        <UserCircle className="w-4 h-4" />
                        {t('join.signIn')}
                    </button>
                </form>

                {/* Back to Home */}
                <div className="text-center mt-8">
                    <Link
                        to="/"
                        className={`text-sm transition-colors ${theme === 'light'
                            ? 'text-gray-500 hover:text-gray-700'
                            : 'text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        {t('join.backHome')}
                    </Link>
                </div>
            </motion.div>

            {/* Advanced Auth Modal */}
            {showAdvancedAuth && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`rounded-xl border p-6 w-full max-w-md ${theme === 'light'
                            ? 'bg-white border-gray-200 shadow-xl'
                            : 'bg-surface-900 border-white/10'
                            }`}
                    >
                        <h2 className={`text-xl font-bold mb-4 text-center ${theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}>
                            {t('join.authTitle')}
                        </h2>

                        {/* PIN display if provided */}
                        {pin && (
                            <div className={`text-center mb-4 p-2 rounded-lg ${theme === 'light' ? 'bg-gray-100' : 'bg-surface-800'
                                }`}>
                                <span className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {t('join.pinPrefix')}{' '}
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
                        className={`rounded-xl border p-6 w-full max-w-md ${theme === 'light'
                            ? 'bg-white border-gray-200 shadow-xl'
                            : 'bg-surface-900 border-white/10'
                            }`}
                    >
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className={`text-xl font-bold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'
                                }`}>
                                {t('join.requestSubmitted')}
                            </h2>
                            <p className={`mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                                {t('join.requestSubmittedBody')}
                            </p>

                            <div className={`p-4 rounded-lg mb-4 text-left ${theme === 'light' ? 'bg-gray-50' : 'bg-surface-800'
                                }`}>
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <strong>{t('join.pinPrefix')}</strong> {pin.toUpperCase()}
                                </p>
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <strong>{t('join.yourName')}</strong> {name}
                                </p>
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <strong>{t('join.requestId')}</strong> {facilitatorRequestId}
                                </p>
                            </div>

                            <div className={`text-sm mb-6 text-left ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                                <p className="font-medium mb-2">{t('join.whatNext')}</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>{t('join.next1')}</li>
                                    <li>{t('join.next2')}</li>
                                    <li>{t('join.next3')}</li>
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
                                    {t('join.joinAsParticipantNow')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => navigate('/')}
                                    className="flex-1"
                                >
                                    {t('join.returnHome')}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
