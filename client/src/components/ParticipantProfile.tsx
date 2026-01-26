import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { User, Building, Trophy, FileText, Vote, Calendar } from 'lucide-react';

interface ParticipantStats {
    total_workshops: number;
    total_use_cases: number;
    total_votes: number;
    contribution_history: Array<{
        workshop_id: string;
        workshop_title: string;
        joined_at: string;
        use_cases_submitted: number;
        votes_cast: number;
        role: string;
    }>;
}

interface ParticipantProfileProps {
    token: string;
    onLogout?: () => void;
}

export function ParticipantProfile({ token, onLogout }: ParticipantProfileProps) {
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<ParticipantStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [organization, setOrganization] = useState('');

    useEffect(() => {
        fetchProfile();
        fetchStats();
    }, [token]);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/participant-auth/me', {
                params: { token }
            });
            setProfile(response.data);
            setDisplayName(response.data.display_name);
            setOrganization(response.data.organization || '');
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/participant-auth/stats', {
                params: { token }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            const response = await api.put('/participant-auth/profile', {
                display_name: displayName,
                organization: organization || null
            }, {
                params: { token }
            });
            setProfile(response.data);
            setEditing(false);
            toast.success('Profile updated successfully');
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'Failed to update profile';
            toast.error(message);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl p-6 border animate-pulse theme-card theme-border">
                <div className="h-6 rounded w-1/3 mb-4 theme-bg-tertiary"></div>
                <div className="h-20 rounded theme-bg-tertiary"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="rounded-xl p-6 border text-center theme-card theme-border">
                <p className="theme-text-secondary">Failed to load profile</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Profile Card */}
            <div className="rounded-xl p-6 border theme-card theme-border shadow-sm">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold theme-text-primary">Your Profile</h3>
                    {!editing && (
                        <Button variant="ghost" onClick={() => setEditing(true)} className="text-sm">
                            Edit
                        </Button>
                    )}
                </div>

                {editing ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 theme-text-primary">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border focus:border-brand-violet focus:outline-none theme-input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 theme-text-primary">
                                Organization
                            </label>
                            <input
                                type="text"
                                value={organization}
                                onChange={(e) => setOrganization(e.target.value)}
                                placeholder="Optional"
                                className="w-full px-4 py-2 rounded-lg border focus:border-brand-violet focus:outline-none theme-input"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleUpdateProfile}>Save</Button>
                            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-brand-violet" />
                            <div>
                                <div className="text-sm theme-text-secondary">Name</div>
                                <div className="font-medium theme-text-primary">{profile.display_name}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Building className="w-5 h-5 text-brand-violet" />
                            <div>
                                <div className="text-sm theme-text-secondary">Organization</div>
                                <div className="font-medium theme-text-primary">{profile.organization || 'Not specified'}</div>
                            </div>
                        </div>
                        {profile.email && (
                            <div className="text-sm pt-2 border-t theme-border theme-text-secondary">
                                {profile.email}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl p-4 border text-center theme-card theme-border shadow-sm">
                        <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold theme-text-primary">{stats.total_workshops}</div>
                        <div className="text-xs theme-text-secondary">Workshops</div>
                    </div>
                    <div className="rounded-xl p-4 border text-center theme-card theme-border shadow-sm">
                        <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold theme-text-primary">{stats.total_use_cases}</div>
                        <div className="text-xs theme-text-secondary">Use Cases</div>
                    </div>
                    <div className="rounded-xl p-4 border text-center theme-card theme-border shadow-sm">
                        <Vote className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold theme-text-primary">{stats.total_votes}</div>
                        <div className="text-xs theme-text-secondary">Votes Cast</div>
                    </div>
                </div>
            )}

            {/* Contribution History */}
            {stats && stats.contribution_history.length > 0 && (
                <div className="rounded-xl p-6 border theme-card theme-border shadow-sm">
                    <h3 className="text-lg font-bold mb-4 theme-text-primary">Recent Workshops</h3>
                    <div className="space-y-3">
                        {stats.contribution_history.slice(0, 5).map((item) => (
                            <div
                                key={item.workshop_id}
                                className="flex items-center justify-between p-3 rounded-lg theme-bg-tertiary"
                            >
                                <div>
                                    <div className="font-medium theme-text-primary">{item.workshop_title}</div>
                                    <div className="text-xs flex items-center gap-1 theme-text-secondary">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(item.joined_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-right text-sm">
                                    <div className="text-blue-500">{item.use_cases_submitted} ideas</div>
                                    <div className="text-green-500">{item.votes_cast} votes</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Logout Button */}
            {onLogout && (
                <Button variant="secondary" onClick={onLogout} className="w-full">
                    Sign Out
                </Button>
            )}
        </div>
    );
}
