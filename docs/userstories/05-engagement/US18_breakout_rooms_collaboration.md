# US18: Breakout Rooms & Team Collaboration

**Epic:** AI Hotspot Flow - Collaboration Backlog  
**Module:** Team Collaboration & Breakout Sessions  
**Story Type:** Feature  
**Story Points:** 21  
**Status:** 📋 BACKLOG - Future Feature  
**Target Sprint:** Phase 3 (Q2-Q3 2026)

---

## User Story

**As a** Workshop Facilitator,  
**I want** to create breakout rooms and team collaboration spaces within workshops,  
**So that** participants can work in smaller groups for focused ideation, discussion, and consensus-building activities.

---

## Description

Large workshops benefit from small-group interactions. This feature enables:

1. **Breakout Rooms:** Virtual spaces for small group work
2. **Team Formation:** Auto-assign or manual team creation
3. **Collaborative Activities:** Shared canvases, voting, discussions
4. **Room Management:** Facilitator oversight and control
5. **Results Aggregation:** Merge team outputs to main session

---

## Requirements

### Functional Requirements

#### 1. Breakout Room Creation

**Creation Options:**
- **Quick Create:** Auto-generate rooms based on participant count
- **Manual Create:** Define number of rooms and capacity
- **Team-Based:** One room per pre-defined team
- **Topic-Based:** Rooms organized by use case category

**Room Configuration:**
| Setting | Options | Default |
|---------|---------|---------|
| Room Count | 2-20 | Auto (5-8 per room) |
| Max Capacity | 3-15 | 8 |
| Duration | 5-60 min | 15 min |
| Auto-Return | On/Off | On |
| Room Names | Custom/Auto | Auto (Room A, B, C...) |

**Assignment Methods:**
- **Random:** Evenly distributed random assignment
- **Round-Robin:** Sequential assignment
- **Self-Select:** Participants choose rooms
- **Balanced:** Balance by department/role
- **Interest-Based:** By use case category interest

#### 2. Breakout Room Interface

**Participant View:**
- Room name and timer displayed
- List of room members
- Room-specific activity area
- Chat/discussion panel
- "Call Facilitator" button
- Return to main session button

**Facilitator View:**
- Dashboard showing all rooms
- Participant distribution overview
- Room activity indicators
- Broadcast to all rooms
- Join any room instantly
- Timer controls (extend, end early)

#### 3. Collaborative Activities

**Room Activities:**

**Ideation Canvas:**
- Shared whiteboard for brainstorming
- Sticky notes with participant names
- Real-time collaborative editing
- Voting on room ideas
- Category tagging

**Mini-Scoring Session:**
- Room-specific use cases to score
- Simplified scoring (3-point or 5-point)
- See room-level aggregates
- Identify room consensus

**Discussion Board:**
- Threaded discussions
- Reaction emojis
- Pin important comments
- Summary generation

**Dot Voting:**
- Each participant gets N votes
- Visual dot placement
- Real-time results
- Top picks identified

**Consensus Builder:**
- Proposal + voting
- Agreement scale (1-5)
- Objection capture
- Modified proposal iteration

#### 4. Room Management

**Facilitator Controls:**
- Start/stop all rooms
- Extend/reduce time
- Move participants between rooms
- Close individual rooms
- Broadcast announcements
- Send resources to rooms

**Monitoring Dashboard:**
- Room status (active, idle, waiting)
- Activity level per room
- Time remaining
- Participant engagement indicators
- Alert for inactive rooms

**Communication:**
- Broadcast message to all rooms
- Message specific room
- Join room voice/video (if enabled)
- Request facilitator help notification

#### 5. Results Aggregation

**Merging Room Outputs:**
- Auto-collect all room ideas
- Deduplicate similar items
- Tag items by source room
- Weighted merge (room consensus items ranked higher)

**Presentation Mode:**
- Each room presents top ideas
- Sequential room spotlights
- Cross-room voting on merged ideas
- Final prioritization

**Reports:**
- Room-by-room summary
- Comparison across rooms
- Participation metrics per room
- Consensus vs. divergence analysis

#### 6. Pre-Configured Templates

**Template Activities:**

**"World Café":**
- Rotating room assignments
- Multiple rounds (3-4)
- Cumulative idea building
- Cross-pollination of ideas

**"Lightning Brainstorm":**
- 5-minute intense ideation
- Quick share-out
- Rapid iteration

**"Expert Panel":**
- Rooms by expertise area
- Deep-dive discussions
- Expert recommendations

**"Debate Format":**
- Pro/con rooms for controversial topics
- Structured argumentation
- Judge panel voting

**"Design Sprint":**
- Sequential phases in rooms
- Problem → Solution → Prototype → Vote
- Time-boxed activities

---

## Acceptance Criteria

### Scenario 1: Create Breakout Rooms
**Given** a workshop with 40 participants  
**When** the facilitator clicks "Create Breakout Rooms"  
**And** selects "Auto-assign" with 5 rooms  
**Then** 5 rooms are created with ~8 participants each  
**And** participants are randomly distributed  
**And** each participant sees their room assignment

### Scenario 2: Self-Select Room
**Given** breakout rooms are in "Self-Select" mode  
**When** participants view available rooms  
**Then** they see room names, topics, and current occupancy  
**And** they can join any room with available capacity  
**And** capacity limits are enforced

### Scenario 3: Collaborative Ideation
**Given** participants are in a breakout room  
**When** they use the shared canvas  
**Then** all room members see real-time updates  
**And** sticky notes show author names  
**And** ideas can be grouped and voted on

### Scenario 4: Facilitator Broadcast
**Given** breakout rooms are active  
**When** the facilitator sends a broadcast: "5 minutes remaining"  
**Then** all participants in all rooms see the message  
**And** an alert/notification appears prominently

### Scenario 5: Results Aggregation
**Given** breakout sessions have completed  
**When** the facilitator merges room outputs  
**Then** all ideas from all rooms are collected  
**And** duplicates are flagged for review  
**And** room-level voting results are preserved  
**And** facilitator can run cross-room prioritization

---

## Technical Implementation

### Frontend Components

```
src/components/breakout/
├── BreakoutManager.tsx          # Facilitator room management
├── RoomCreator.tsx              # Room creation wizard
├── RoomAssignment.tsx           # Participant assignment UI
├── BreakoutRoom.tsx             # Individual room interface
├── RoomList.tsx                 # Available rooms list
├── RoomTimer.tsx                # Countdown timer
├── CollaborativeCanvas.tsx      # Shared whiteboard
├── StickyNote.tsx               # Draggable sticky note
├── RoomChat.tsx                 # Room discussion panel
├── DotVoting.tsx                # Dot voting component
├── ConsensusBuilder.tsx         # Consensus activity
├── RoomMonitor.tsx              # Facilitator overview
├── BroadcastPanel.tsx           # Announcement sender
├── ResultsAggregator.tsx        # Merge room outputs
└── RoomPresentation.tsx         # Share-out mode
```

### Backend Endpoints

```typescript
// Room Management
POST /api/workshops/:pin/breakout-rooms
Request: {
  room_count: number,
  max_capacity: number,
  duration_minutes: number,
  assignment_method: "random" | "self_select" | "balanced",
  room_names: string[] | null,
  activity_type: string
}
Response: {
  rooms: [{ room_id, name, capacity, participants: [] }],
  end_time: ISODate
}

GET /api/workshops/:pin/breakout-rooms
Response: {
  status: "active" | "pending" | "completed",
  rooms: [{ room_id, name, participant_count, activity_status }],
  time_remaining: number
}

POST /api/breakout-rooms/:room_id/join
Request: { participant_id }
Response: { success, room_details }

POST /api/breakout-rooms/:room_id/leave
Request: { participant_id }

// Room Activities
POST /api/breakout-rooms/:room_id/canvas/items
Request: { 
  participant_id, 
  content, 
  type: "sticky" | "text" | "shape",
  position: { x, y },
  color: string
}
Response: { item_id, created_at }

PUT /api/breakout-rooms/:room_id/canvas/items/:item_id
Request: { position, content, votes }

GET /api/breakout-rooms/:room_id/canvas
Response: { items: [...], votes: [...] }

POST /api/breakout-rooms/:room_id/vote
Request: { participant_id, item_id, vote_type }

// Facilitator Controls
POST /api/workshops/:pin/breakout-rooms/broadcast
Request: { message, priority: "normal" | "urgent" }

POST /api/workshops/:pin/breakout-rooms/extend
Request: { additional_minutes }

POST /api/workshops/:pin/breakout-rooms/end
Response: { rooms_closed, outputs_collected }

POST /api/workshops/:pin/breakout-rooms/move-participant
Request: { participant_id, from_room_id, to_room_id }

// Results Aggregation
GET /api/workshops/:pin/breakout-rooms/results
Response: {
  rooms: [{
    room_id, name,
    items: [{ content, votes, author }],
    discussions: [...],
    consensus_items: [...]
  }],
  merged: {
    all_items: [...],
    duplicates: [...],
    top_voted: [...]
  }
}

POST /api/workshops/:pin/breakout-rooms/merge
Request: { 
  duplicate_handling: "keep_all" | "dedupe" | "manual",
  preserve_room_tags: boolean
}
Response: { merged_items, deduplication_report }
```

### WebSocket Events

```typescript
// Room events
socket.on('breakout:room_created', { rooms });
socket.on('breakout:assigned', { room_id, room_name });
socket.on('breakout:participant_joined', { room_id, participant });
socket.on('breakout:participant_left', { room_id, participant_id });

// Activity events
socket.on('breakout:canvas_update', { room_id, item });
socket.on('breakout:vote_cast', { room_id, item_id, vote_count });
socket.on('breakout:chat_message', { room_id, message });

// Facilitator events
socket.on('breakout:broadcast', { message, priority });
socket.on('breakout:time_update', { time_remaining, extended });
socket.on('breakout:rooms_ending', { return_in_seconds });
socket.on('breakout:rooms_closed', { });

// Help requests
socket.on('breakout:help_requested', { room_id, participant_id });
```

### Database Schema

```sql
-- Breakout Rooms
CREATE TABLE breakout_rooms (
  id UUID PRIMARY KEY,
  workshop_id UUID REFERENCES workshops(id),
  name VARCHAR(100),
  max_capacity INTEGER DEFAULT 8,
  activity_type VARCHAR(50),
  status VARCHAR(20), -- pending, active, completed
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Room Assignments
CREATE TABLE room_assignments (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES breakout_rooms(id),
  participant_id UUID REFERENCES participants(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  UNIQUE(room_id, participant_id)
);

-- Canvas Items
CREATE TABLE canvas_items (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES breakout_rooms(id),
  participant_id UUID REFERENCES participants(id),
  content TEXT,
  item_type VARCHAR(20),
  position JSONB,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Canvas Votes
CREATE TABLE canvas_votes (
  id UUID PRIMARY KEY,
  item_id UUID REFERENCES canvas_items(id),
  participant_id UUID REFERENCES participants(id),
  vote_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(item_id, participant_id)
);

-- Room Chat
CREATE TABLE room_messages (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES breakout_rooms(id),
  participant_id UUID REFERENCES participants(id),
  content TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Dependencies

- US01: Workshop Initialization
- US02: PIN-Based Entry
- WebSocket infrastructure
- Real-time collaboration library (e.g., Yjs, Liveblocks)
- Canvas rendering library

---

## Testing Requirements

### Unit Tests
- Room assignment algorithms
- Capacity enforcement
- Timer logic
- Vote aggregation

### Integration Tests
- Full breakout flow
- Multi-room synchronization
- Results merging
- Facilitator controls

### Real-Time Tests
- Canvas synchronization under load
- WebSocket stability with many rooms
- Latency testing

---

## Future Enhancements

- **Video Conferencing:** Integrated video/audio in rooms
- **AI Moderator:** AI facilitator per room
- **Templates Library:** Community-created activity templates
- **Cross-Workshop Rooms:** Rooms spanning multiple workshops

---

## Definition of Done

- [ ] Room creation with all assignment methods
- [ ] Breakout room interface for participants
- [ ] Facilitator management dashboard
- [ ] Collaborative canvas with real-time sync
- [ ] Dot voting and consensus builder
- [ ] Room chat functionality
- [ ] Broadcast and communication tools
- [ ] Results aggregation and merging
- [ ] Pre-configured templates (3+)
- [ ] Timer with extend/end controls
- [ ] Unit tests passing (>80% coverage)
- [ ] Real-time sync tested with 50+ users
- [ ] Mobile responsive design
- [ ] Documentation complete
