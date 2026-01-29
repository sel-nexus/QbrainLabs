# US42: Enhanced Q&A Chat with Historic Conversations and Facilitator Chat

**Epic:** AI Hotspot Flow - Engagement Backlog  
**Module:** Real-Time Audience Interaction  
**Story Type:** Enhancement  
**Priority:** High  
**Story Points:** 21  
**Status:** 📋 BACKLOG

---

## User Story

**As a** Workshop Participant,  
**I want to** see my Q&A conversation history and receive real-time responses from facilitators,  
**So that** I can get answers to my questions and follow the conversation context.

**As a** Workshop Facilitator,  
**I want to** see all participant questions and respond in real-time,  
**So that** I can address participant concerns and engage with the audience effectively.

---

## Description

Enhance Q&A system to display historic conversations, enable real-time facilitator-participant chat, and allow facilitators to converse with all participants in the workshop. This transforms the Q&A system from a simple question submission tool into a full-featured chat system with conversation history and real-time communication.

---

## Requirements

### Functional Requirements

1. **Historic Conversation Display**
   - Display all previous Q&A messages in chat window
   - Show conversation thread/history
   - Chronological ordering
   - Participant and facilitator messages clearly distinguished
   - Timestamps for each message

2. **Real-Time Messaging**
   - Real-time message updates via WebSocket
   - New messages appear instantly
   - Typing indicators (optional)
   - Message delivery confirmation
   - Online/offline status

3. **Participant Features**
   - Submit questions/messages
   - View conversation history
   - See facilitator responses
   - Upvote questions (existing feature)
   - Mark questions as answered

4. **Facilitator Features**
   - View all participant questions
   - Respond to individual participants
   - Broadcast messages to all participants
   - See which participants are active
   - Mark questions as answered
   - Pin important questions
   - Filter by participant

5. **Message Threading**
   - Replies to specific questions
   - Thread view for conversations
   - Context preservation
   - Nested conversation display

6. **Chat History Persistence**
   - Store all messages in database
   - Load history on chat open
   - Support for long conversation histories
   - Efficient pagination

### Non-Functional Requirements

- Messages should appear in < 500ms
- Support for high message volume
- Efficient database queries for history
- Mobile-responsive chat interface
- Accessible (keyboard navigation, screen readers)

---

## Acceptance Criteria

### Scenario 1: View Conversation History
**Given** a participant opens the Q&A chat  
**When** the chat window loads  
**Then** they see all previous messages  
**And** messages are in chronological order  
**And** they can scroll through history

### Scenario 2: Real-Time Message Updates
**Given** a participant has the Q&A chat open  
**When** a facilitator responds to their question  
**Then** the message appears immediately  
**And** they see a notification  
**And** the message is clearly from the facilitator

### Scenario 3: Facilitator Sees All Questions
**Given** a facilitator opens the Q&A panel  
**When** they view the chat  
**Then** they see all participant questions  
**And** can see which participant asked each question  
**And** can respond to any question

### Scenario 4: Facilitator Broadcast
**Given** a facilitator wants to address all participants  
**When** they send a broadcast message  
**Then** all participants receive the message  
**And** it appears in their chat history  
**And** it's clearly marked as a broadcast

### Scenario 5: Message Threading
**Given** a participant asks a question  
**When** a facilitator responds  
**Then** the response appears as a reply  
**And** the conversation is threaded  
**And** context is preserved

---

## Technical Implementation

### Files to Modify

- `client/src/components/polls/QAPanel.tsx` - Enhance for chat functionality
- `server/app/api/polls.py` - Add chat endpoints
- `server/app/models/polls.py` - Add chat message model if needed
- `server/app/socket_handlers.py` - Add chat WebSocket events

### Backend Changes

#### Chat Message Model

```python
class QAChatMessage(Base):
    __tablename__ = "qa_chat_messages"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    question_id = Column(GUID(), ForeignKey("qa_questions.id"), nullable=True)  # Optional for threading
    sender_id = Column(GUID(), nullable=False)  # Participant or Facilitator ID
    sender_type = Column(String(20), nullable=False)  # 'participant' or 'facilitator'
    sender_name = Column(String(200), nullable=False)
    message_text = Column(Text, nullable=False)
    is_broadcast = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workshop = relationship("Workshop", backref="qa_chat_messages")
    question = relationship("QAQuestion", backref="chat_messages")
```

#### API Endpoints

```python
@router.post("/workshop/{workshop_id}/chat")
async def send_chat_message(
    workshop_id: str,
    message: QAChatMessageCreate,
    participant_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Send a chat message"""
    # Create message record
    # Emit WebSocket event
    # Return message

@router.get("/workshop/{workshop_id}/chat")
async def get_chat_history(
    workshop_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get chat history"""
    # Return messages with pagination

@router.post("/workshop/{workshop_id}/chat/broadcast")
async def broadcast_message(
    workshop_id: str,
    message: QAChatMessageCreate,
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Facilitator broadcast to all participants"""
    # Create broadcast message
    # Emit to all participants
    # Return message
```

#### WebSocket Events

```python
# Socket handlers
@socketio.on('qa:send_message')
def handle_chat_message(data):
    # Save message to database
    # Emit to relevant participants
    socketio.emit('qa:new_message', message_data, room=workshop_id)

@socketio.on('qa:broadcast')
def handle_broadcast(data):
    # Save broadcast message
    # Emit to all participants in workshop
    socketio.emit('qa:broadcast_message', message_data, room=workshop_id)
```

### Frontend Changes

#### Enhanced QAPanel Component

```typescript
export function QAPanel({ className }: QAPanelProps) {
    const { session } = useSession();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isFacilitator, setIsFacilitator] = useState(false);
    
    useEffect(() => {
        loadChatHistory();
        setupWebSocketListeners();
    }, [session?.workshopId]);
    
    const loadChatHistory = async () => {
        const data = await PollService.getChatHistory(session.workshopId);
        setMessages(data);
    };
    
    const setupWebSocketListeners = () => {
        socket.on('qa:new_message', (message) => {
            setMessages(prev => [...prev, message]);
        });
        
        socket.on('qa:broadcast_message', (message) => {
            setMessages(prev => [...prev, message]);
            toast.info('Broadcast: ' + message.text);
        });
    };
    
    const sendMessage = async () => {
        if (isFacilitator) {
            await PollService.sendFacilitatorMessage(session.workshopId, newMessage);
        } else {
            await PollService.sendParticipantMessage(session.workshopId, newMessage);
        }
        setNewMessage('');
    };
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
                {messages.map(msg => (
                    <ChatMessageBubble key={msg.id} message={msg} />
                ))}
            </div>
            <div className="border-t p-4">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                />
                {isFacilitator && (
                    <Button onClick={() => broadcastMessage()}>
                        Broadcast to All
                    </Button>
                )}
            </div>
        </div>
    );
}
```

---

## Dependencies

- US21: Live Polling & Reactions - partially implemented
- WebSocket infrastructure
- QAQuestion model (existing)
- Workshop and Participant models

---

## Database Schema

### QAChatMessage Table

- `id` (UUID, primary key)
- `workshop_id` (UUID, foreign key)
- `question_id` (UUID, foreign key, nullable)
- `sender_id` (UUID)
- `sender_type` (String: 'participant' or 'facilitator')
- `sender_name` (String)
- `message_text` (Text)
- `is_broadcast` (Boolean)
- `created_at` (DateTime)

### Indexes

- Index on `workshop_id` for workshop chat queries
- Index on `question_id` for threaded conversations
- Index on `created_at` for chronological ordering
- Composite index on `(workshop_id, created_at)` for efficient history loading

---

## UI/UX Design

### Chat Interface Layout

```
┌─────────────────────────────────────┐
│ Q&A Chat                    [Filter]│
├─────────────────────────────────────┤
│ [Previous messages...]              │
│                                     │
│ Participant: Question text           │
│ Facilitator: Response text          │
│                                     │
│ [New messages appear here]         │
├─────────────────────────────────────┤
│ [Message input] [Send] [Broadcast]  │
└─────────────────────────────────────┘
```

### Message Display

- Participant messages: Left-aligned, participant color
- Facilitator messages: Right-aligned, facilitator color
- Broadcast messages: Centered, highlighted
- Timestamps: Small, muted text
- Threading: Indented replies

---

## Testing Requirements

### Unit Tests
- Chat message creation
- WebSocket event handling
- Message history loading
- Facilitator broadcast functionality

### Integration Tests
- Participant sends message
- Facilitator receives message
- Facilitator responds
- Broadcast to all participants
- Message history persistence
- Real-time updates

### Performance Tests
- Load chat history with many messages
- Handle high message volume
- WebSocket connection stability
- Database query performance

---

## Security Considerations

- Verify participant belongs to workshop
- Verify facilitator has access to workshop
- Sanitize message content
- Rate limiting on message sending
- Prevent spam/abuse

---

## Definition of Done

- [ ] Chat message model created
- [ ] API endpoints implemented
- [ ] WebSocket events configured
- [ ] Frontend chat interface enhanced
- [ ] Historic conversation display works
- [ ] Real-time messaging works
- [ ] Facilitator can see all questions
- [ ] Facilitator can respond to participants
- [ ] Broadcast functionality works
- [ ] Message threading implemented
- [ ] Chat history persists
- [ ] Mobile-responsive design
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Performance tested
- [ ] Code review completed
- [ ] Documentation updated
