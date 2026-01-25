import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ChallengeCard, ChallengeCardCreate, ChallengeCardUpdate } from '../../lib/api/challenges';
import { challengesApi } from '../../lib/api/challenges';
import { ChallengeCard as ChallengeCardComponent } from './ChallengeCard';
import { ChallengeForm } from './ChallengeForm';
import { ChallengeCardDetail } from './ChallengeCardDetail';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';

interface ChallengeManagerProps {
  workshopId: string;
  isFacilitator: boolean;
}

export function ChallengeManager({ workshopId, isFacilitator }: ChallengeManagerProps) {
  const { theme } = useTheme();
  const [challenges, setChallenges] = useState<ChallengeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<ChallengeCard | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeCard | null>(null);

  useEffect(() => {
    fetchChallenges();
  }, [workshopId]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const data = await challengesApi.list(workshopId);
      setChallenges(data);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast.error('Failed to load challenge cards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: ChallengeCardCreate) => {
    try {
      const newChallenge = await challengesApi.create(workshopId, data);
      setChallenges([...challenges, newChallenge]);
      setShowForm(false);
      toast.success('Challenge card created successfully');
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge card');
      throw error;
    }
  };

  const handleUpdate = async (data: ChallengeCardUpdate) => {
    if (!editingChallenge) return;
    try {
      const updated = await challengesApi.update(editingChallenge.id, data);
      setChallenges(challenges.map(c => (c.id === updated.id ? updated : c)));
      setEditingChallenge(null);
      toast.success('Challenge card updated successfully');
    } catch (error) {
      console.error('Error updating challenge:', error);
      toast.error('Failed to update challenge card');
      throw error;
    }
  };

  const handleDelete = async (challengeId: string) => {
    try {
      await challengesApi.delete(challengeId);
      setChallenges(challenges.filter(c => c.id !== challengeId));
      toast.success('Challenge card deleted successfully');
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast.error('Failed to delete challenge card');
    }
  };

  const handleEdit = (challenge: ChallengeCard) => {
    setEditingChallenge(challenge);
    setShowForm(true);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingChallenge(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="contrast-muted">Loading challenge cards...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold theme-text-primary">Challenge Cards</h3>
          <p className="text-sm contrast-muted mt-1">
            Define high-value business or technology problems with success criteria
          </p>
        </div>
        {isFacilitator && (
          <Button
            onClick={() => {
              setEditingChallenge(null);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Challenge Card
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <ChallengeForm
            challenge={editingChallenge}
            onSubmit={editingChallenge ? handleUpdate : handleCreate}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {challenges.length === 0 ? (
        <div className={`text-center py-12 border rounded-xl ${
          theme === 'light' 
            ? 'bg-gray-50 border-gray-200' 
            : 'bg-surface-800/50 border-white/10'
        }`}>
          <p className="contrast-muted mb-4">No challenge cards yet</p>
          {isFacilitator && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Challenge Card
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((challenge) => (
            <ChallengeCardComponent
              key={challenge.id}
              challenge={challenge}
              isFacilitator={isFacilitator}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClick={setSelectedChallenge}
            />
          ))}
        </div>
      )}

      {selectedChallenge && (
        <ChallengeCardDetail
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          isFacilitator={isFacilitator}
        />
      )}
    </div>
  );
}
