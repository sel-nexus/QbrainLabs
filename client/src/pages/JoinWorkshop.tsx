import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';

export function JoinWorkshop() {
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFacilitator, setIsFacilitator] = useState(false);

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

            // Save session info
            const session = {
                participantId: data.participant_id,
                workshopId: data.workshop_id,
                name: name,
                role: data.role
            };
            localStorage.setItem('hm_session', JSON.stringify(session));

            // Connect Socket
            socket.connect();
            socket.emit('join_workshop', { workshop_id: data.workshop_id });

            navigate('/lobby');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to join. check PIN.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
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
                </form>
            </motion.div>
        </div>
    );
}
