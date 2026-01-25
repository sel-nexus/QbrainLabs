import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { Users, Clock, MessageSquare, Play, Square, Plus, X, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useTheme } from '../../context/ThemeContext';

interface BreakoutRoom {
  id: string;
  name: string;
  max_capacity: number;
  status: string;
  participant_count: number;
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
}

interface BreakoutManagerProps {
  workshopId: string;
}

export function BreakoutManager({ workshopId }: BreakoutManagerProps) {
  const { theme } = useTheme();
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    room_count: '',
    max_capacity: 8,
    duration_minutes: 15,
    assignment_method: 'random',
    activity_type: 'ideation',
    auto_return: true
  });
  const [broadcastMessage, setBroadcastMessage] = useState('');

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [workshopId]);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get(`/workshops/${workshopId}/breakout-rooms`);
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch breakout rooms:', error);
    }
  };

  const createRooms = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/workshops/${workshopId}/breakout-rooms`, {
        room_count: createForm.room_count ? parseInt(createForm.room_count) : undefined,
        max_capacity: createForm.max_capacity,
        duration_minutes: createForm.duration_minutes,
        assignment_method: createForm.assignment_method,
        activity_type: createForm.activity_type,
        auto_return: createForm.auto_return
      });
      setRooms(data);
      setShowCreateModal(false);
      toast.success('Breakout rooms created successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create breakout rooms');
    } finally {
      setLoading(false);
    }
  };

  const startRoom = async (roomId: string) => {
    try {
      await api.post(`/breakout-rooms/${roomId}/start`);
      toast.success('Room started');
      fetchRooms();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to start room');
    }
  };

  const endAllRooms = async () => {
    try {
      await api.post(`/workshops/${workshopId}/breakout-rooms/end`);
      toast.success('All rooms ended');
      fetchRooms();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to end rooms');
    }
  };

  const broadcast = async () => {
    if (!broadcastMessage.trim()) return;
    try {
      await api.post(`/workshops/${workshopId}/breakout-rooms/broadcast`, {
        message: broadcastMessage,
        priority: 'normal'
      });
      toast.success('Message broadcasted');
      setBroadcastMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to broadcast');
    }
  };

  const extendTime = async (minutes: number) => {
    try {
      await api.post(`/workshops/${workshopId}/breakout-rooms/extend`, {
        additional_minutes: minutes
      });
      toast.success(`Extended by ${minutes} minutes`);
      fetchRooms();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to extend time');
    }
  };

  const activeRooms = rooms.filter(r => r.status === 'ACTIVE');
  const pendingRooms = rooms.filter(r => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold theme-text-primary">Breakout Rooms</h2>
          <p className="contrast-muted">Manage small group collaboration sessions</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Rooms
        </Button>
      </div>

      {/* Broadcast Panel */}
      {activeRooms.length > 0 && (
        <div className={`rounded-lg p-4 border ${
          theme === 'light' ? 'bg-white border-gray-200' : 'theme-bg-secondary theme-border'
        }`}>
          <div className="flex gap-2">
            <Input
              placeholder="Broadcast message to all rooms..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="flex-1"
            />
            <Button onClick={broadcast} variant="secondary">
              <Send className="w-4 h-4 mr-2" /> Broadcast
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={() => extendTime(5)} variant="ghost" size="sm">
              +5 min
            </Button>
            <Button onClick={() => extendTime(10)} variant="ghost" size="sm">
              +10 min
            </Button>
            <Button onClick={endAllRooms} variant="ghost" size="sm" className="text-red-600">
              End All
            </Button>
          </div>
        </div>
      )}

      {/* Active Rooms */}
      {activeRooms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 theme-text-primary">Active Rooms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRooms.map(room => (
              <RoomCard key={room.id} room={room} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {/* Pending Rooms */}
      {pendingRooms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 theme-text-primary">Pending Rooms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRooms.map(room => (
              <div key={room.id} className={`rounded-lg p-4 border ${
                theme === 'light' ? 'bg-white border-gray-200' : 'theme-bg-secondary theme-border'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold theme-text-primary">{room.name}</h4>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>
                </div>
                <div className="flex items-center gap-4 text-sm contrast-muted">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {room.participant_count}/{room.max_capacity}
                  </div>
                </div>
                <Button onClick={() => startRoom(room.id)} className="w-full mt-3" size="sm">
                  <Play className="w-4 h-4 mr-2" /> Start Room
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {rooms.length === 0 && (
        <div className={`text-center py-12 rounded-lg border ${
          theme === 'light' ? 'bg-white border-gray-200' : 'theme-bg-secondary theme-border'
        }`}>
          <Users className="w-12 h-12 mx-auto contrast-muted mb-4" />
          <p className="contrast-muted">No breakout rooms created yet</p>
          <Button onClick={() => setShowCreateModal(true)} className="mt-4">
            Create Breakout Rooms
          </Button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Breakout Rooms"
        >
          <div className="space-y-4">
            <Input
              label="Number of Rooms (leave empty for auto)"
              type="number"
              value={createForm.room_count}
              onChange={(e) => setCreateForm({ ...createForm, room_count: e.target.value })}
              placeholder="Auto"
            />
            <Input
              label="Max Capacity per Room"
              type="number"
              value={createForm.max_capacity}
              onChange={(e) => setCreateForm({ ...createForm, max_capacity: parseInt(e.target.value) })}
            />
            <Input
              label="Duration (minutes)"
              type="number"
              value={createForm.duration_minutes}
              onChange={(e) => setCreateForm({ ...createForm, duration_minutes: parseInt(e.target.value) })}
            />
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-secondary">Assignment Method</label>
              <select
                value={createForm.assignment_method}
                onChange={(e) => setCreateForm({ ...createForm, assignment_method: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg theme-text-primary ${
                  theme === 'light' ? 'bg-white border-gray-200' : 'theme-bg-tertiary theme-border'
                }`}
              >
                <option value="random">Random</option>
                <option value="round_robin">Round Robin</option>
                <option value="self_select">Self Select</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-secondary">Activity Type</label>
              <select
                value={createForm.activity_type}
                onChange={(e) => setCreateForm({ ...createForm, activity_type: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg theme-text-primary ${
                  theme === 'light' ? 'bg-white border-gray-200' : 'theme-bg-tertiary theme-border'
                }`}
              >
                <option value="ideation">Ideation</option>
                <option value="scoring">Scoring</option>
                <option value="discussion">Discussion</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={createForm.auto_return}
                onChange={(e) => setCreateForm({ ...createForm, auto_return: e.target.checked })}
                id="auto_return"
              />
              <label htmlFor="auto_return" className="text-sm theme-text-secondary">Auto-return to main session</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={createRooms} disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Rooms'}
              </Button>
              <Button onClick={() => setShowCreateModal(false)} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RoomCard({ room, theme }: { room: BreakoutRoom; theme: 'light' | 'contrast' }) {
  const getTimeRemaining = () => {
    if (!room.ended_at) return null;
    const end = new Date(room.ended_at);
    const now = new Date();
    const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000 / 60));
    return diff;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className={`rounded-lg p-4 border ${
      theme === 'light' ? 'bg-white border-gray-200' : 'theme-bg-secondary theme-border'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold theme-text-primary">{room.name}</h4>
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
      </div>
      <div className="space-y-2 text-sm contrast-muted">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{room.participant_count}/{room.max_capacity} participants</span>
        </div>
        {timeRemaining !== null && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{timeRemaining} minutes remaining</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1">
          <MessageSquare className="w-4 h-4 mr-2" /> View
        </Button>
        <Button variant="ghost" size="sm">
          <Square className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
