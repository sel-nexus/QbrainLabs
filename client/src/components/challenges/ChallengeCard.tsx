import { useState } from 'react';
import { Edit2, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ChallengeCard as ChallengeCardType } from '../../lib/api/challenges';
import { useTheme } from '../../context/ThemeContext';

interface ChallengeCardProps {
  challenge: ChallengeCardType;
  isFacilitator: boolean;
  onEdit: (challenge: ChallengeCardType) => void;
  onDelete: (challengeId: string) => void;
  onClick: (challenge: ChallengeCardType) => void;
}

export function ChallengeCard({ challenge, isFacilitator, onEdit, onDelete, onClick }: ChallengeCardProps) {
  const { theme } = useTheme();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(challenge.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div
      className={`backdrop-blur border rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer ${
        theme === 'light' 
          ? 'bg-white border-gray-200 hover:border-brand-violet/50' 
          : 'bg-surface-800/80 border-white/10 hover:border-brand-violet/50'
      }`}
      onClick={() => onClick(challenge)}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold theme-text-primary flex-1">{challenge.title}</h3>
        {isFacilitator && (
          <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
            <Button aria-label="Edit"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(challenge);
              }}
              className="contrast-muted hover:theme-text-primary"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button aria-label="Delete"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="text-red-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className={`mb-4 p-3 border rounded-lg ${
          theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-500/50'
        }`} onClick={(e) => e.stopPropagation()}>
          <p className={`text-sm mb-2 ${theme === 'light' ? 'text-red-700' : 'text-red-300'}`}>
            Are you sure you want to delete this challenge card?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="theme-text-secondary text-sm mb-4 line-clamp-3">{challenge.challenge_description}</p>

      {challenge.success_criteria && challenge.success_criteria.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold contrast-muted uppercase tracking-wider mb-2">
            Success Criteria
          </h4>
          <ul className="space-y-1">
            {challenge.success_criteria.slice(0, 3).map((criterion, idx) => (
              <li key={idx} className="text-sm contrast-muted flex items-start">
                <span className="text-brand-violet mr-2">•</span>
                <span className="line-clamp-1">{criterion}</span>
              </li>
            ))}
            {challenge.success_criteria.length > 3 && (
              <li className="text-xs contrast-muted">
                +{challenge.success_criteria.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-xs contrast-muted">
        <span>Created {new Date(challenge.created_at).toLocaleDateString()}</span>
        <div className="flex items-center text-brand-violet">
          <span>View Details</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </div>
  );
}
