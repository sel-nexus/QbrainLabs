import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';
import { toast } from 'sonner';
import { Users, Clock, MessageSquare, Send, HelpCircle, ArrowLeft, StickyNote } from 'lucide-react';

interface BreakoutRoomProps {
  roomId: string;
  roomName: string;
  workshopId: string;
  participantId: string;
  onExit: () => void;
}

interface CanvasItem {
  id: string;
  content: string;
  item_type: string;
  position?: { x: number; y: number };
  color?: string;
  participant_name: string;
  vote_count: number;
}

interface RoomMessage {
  id: string;
  content: string;
  participant_name: string;
  created_at: string;
  is_pinned: boolean;
}

export function BreakoutRoomComponent({ roomId, roomName, workshopId, participantId, onExit }: BreakoutRoomProps) {
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newStickyNote, setNewStickyNote] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCanvasItems();
    fetchMessages();
    
    // Join breakout room socket
    socket.emit('join_breakout_room', { room_id: roomId });
    
    // Listen for updates
    socket.on('breakout:canvas_update', handleCanvasUpdate);
    socket.on('breakout:vote_cast', handleVoteUpdate);
    socket.on('breakout:chat_message', handleChatMessage);
    socket.on('breakout:broadcast', handleBroadcast);
    socket.on('breakout:time_update', handleTimeUpdate);
    socket.on('breakout:rooms_ending', handleRoomsEnding);
    socket.on('breakout:rooms_closed', handleRoomsClosed);
    
    return () => {
      socket.emit('leave_breakout_room', { room_id: roomId });
      socket.off('breakout:canvas_update');
      socket.off('breakout:vote_cast');
      socket.off('breakout:chat_message');
      socket.off('breakout:broadcast');
      socket.off('breakout:time_update');
      socket.off('breakout:rooms_ending');
      socket.off('breakout:rooms_closed');
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchCanvasItems = async () => {
    try {
      const { data } = await api.get(`/breakout-rooms/${roomId}/canvas`);
      setCanvasItems(data);
    } catch (error) {
      console.error('Failed to fetch canvas items:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await api.get(`/breakout-rooms/${roomId}/messages`);
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleCanvasUpdate = (data: any) => {
    if (data.room_id === roomId) {
      fetchCanvasItems();
    }
  };

  const handleVoteUpdate = (data: any) => {
    if (data.room_id === roomId) {
      fetchCanvasItems();
    }
  };

  const handleChatMessage = (data: any) => {
    if (data.room_id === roomId) {
      fetchMessages();
    }
  };

  const handleBroadcast = (data: any) => {
    toast.info(data.message, {
      duration: data.priority === 'urgent' ? 10000 : 5000
    });
  };

  const handleTimeUpdate = (data: any) => {
    setTimeRemaining(data.time_remaining);
  };

  const handleRoomsEnding = (data: any) => {
    toast.warning(`Rooms ending in ${data.return_in_seconds} seconds`);
  };

  const handleRoomsClosed = () => {
    toast.info('Breakout session ended');
    setTimeout(() => {
      onExit();
    }, 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await api.post(`/breakout-rooms/${roomId}/messages`, {
        content: newMessage
      }, {
        params: { participant_id: participantId }
      });
      setNewMessage('');
      fetchMessages();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    }
  };

  const createStickyNote = async () => {
    if (!newStickyNote.trim()) return;
    try {
      await api.post(`/breakout-rooms/${roomId}/canvas/items`, {
        content: newStickyNote,
        item_type: 'sticky',
        color: '#FFEB3B'
      }, {
        params: { participant_id: participantId }
      });
      setNewStickyNote('');
      fetchCanvasItems();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create sticky note');
    }
  };

  const voteOnItem = async (itemId: string) => {
    try {
      await api.post(`/breakout-rooms/${roomId}/vote`, {}, {
        params: {
          item_id: itemId,
          participant_id: participantId,
          vote_type: 'upvote'
        }
      });
      fetchCanvasItems();
    } catch (error: any) {
      if (error.response?.status !== 400) { // Ignore "already voted" errors
        toast.error('Failed to vote');
      }
    }
  };

  const requestHelp = () => {
    socket.emit('breakout:help_requested', { room_id: roomId, participant_id: participantId });
    toast.success('Help request sent to facilitator');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{roomName}</h2>
            {timeRemaining !== null && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                <Clock className="w-4 h-4" />
                <span>{timeRemaining} minutes remaining</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={requestHelp} variant="ghost" size="sm">
              <HelpCircle className="w-4 h-4 mr-2" /> Help
            </Button>
            <Button onClick={onExit} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Exit
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add a sticky note..."
                value={newStickyNote}
                onChange={(e) => setNewStickyNote(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createStickyNote()}
                className="flex-1"
              />
              <Button onClick={createStickyNote}>
                <StickyNote className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>
          </div>

          {/* Canvas Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {canvasItems.map(item => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                style={{ backgroundColor: item.color || '#fff' }}
              >
                <p className="text-gray-900 dark:text-white mb-2">{item.content}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{item.participant_name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => voteOnItem(item.id)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      👍 {item.vote_count}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {canvasItems.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <StickyNote className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items yet. Start by adding a sticky note!</p>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Chat
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className="text-sm">
                <div className="font-medium text-gray-900 dark:text-white">{msg.participant_name}</div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">{msg.content}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button aria-label="Send message" onClick={sendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
