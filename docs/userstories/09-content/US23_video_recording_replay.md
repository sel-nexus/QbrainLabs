# US23: Workshop Recording & Replay

**Epic:** AI Hotspot Flow - Documentation Backlog  
**Module:** Session Recording & Playback  
**Story Type:** Feature  
**Story Points:** 21  
**Status:** 📋 BACKLOG - Future Feature  
**Target Sprint:** Phase 4 (Q4 2026)

---

## User Story

**As a** Workshop Facilitator,  
**I want** to record workshop sessions and provide replay capabilities,  
**So that** absent stakeholders can review the session, and teams can reference discussions for future planning.

---

## Description

Capture and preserve workshop insights for future reference. Features include:

1. **Session Recording:** Capture screen, audio, and activities
2. **Activity Timeline:** Timestamped log of all workshop events
3. **Replay Mode:** Playback with synchronized data visualization
4. **Highlights & Clips:** Create shareable excerpts
5. **Transcription:** AI-powered transcription and search
6. **Annotation:** Add notes and comments to recordings

---

## Requirements

### Functional Requirements

#### 1. Session Recording

**Recording Types:**
- **Activity Recording:** All workshop events (votes, submissions, phase changes)
- **Screen Recording:** Facilitator screen capture (optional)
- **Audio Recording:** Voice capture via browser (optional)
- **Video Recording:** Webcam integration (optional)

**Recording Controls:**
- Start/pause/stop recording
- Privacy indicators (recording active)
- Automatic recording option
- Recording quality settings

#### 2. Activity Timeline

**Captured Events:**
- Workshop phase transitions
- Use case submissions (with timestamps)
- Voting events (aggregated, not individual)
- Discussion highlights
- AI copilot suggestions
- Breakout room activities
- Poll results

**Timeline Features:**
- Searchable event log
- Filter by event type
- Jump to specific timestamp
- Export as transcript

#### 3. Replay Mode

**Playback Features:**
- Synchronized playback of all data
- Speed controls (0.5x, 1x, 1.5x, 2x)
- Seek to any timestamp
- Matrix visualization replay
- Voting progress replay
- Chapter markers

**Visualization:**
- Real-time matrix animation
- Participant count overlay
- Phase indicator
- Activity heatmap

#### 4. Highlights & Clips

**Clip Creation:**
- Select start/end timestamps
- Add title and description
- Tag with categories
- Generate shareable link
- Embed code for presentations

**Auto-Highlights:**
- AI-detected key moments
- High-activity periods
- Consensus moments
- Major discussions

#### 5. Transcription

**Features:**
- AI-powered speech-to-text
- Speaker identification
- Searchable transcript
- Highlight matching audio
- Export transcript (TXT, SRT, VTT)

**AI Enhancement:**
- Key topic extraction
- Action item identification
- Decision point highlighting
- Summary generation

#### 6. Annotations

**Annotation Types:**
- Text notes at timestamps
- Highlight important moments
- Tag participants mentioned
- Link to use cases
- Add external references

---

## Technical Implementation

### Endpoints

```typescript
POST /api/workshops/:pin/recording/start
POST /api/workshops/:pin/recording/stop
GET /api/workshops/:pin/recording
GET /api/workshops/:pin/timeline
POST /api/recordings/:id/clips
GET /api/recordings/:id/transcript
POST /api/recordings/:id/annotations
GET /api/recordings/:id/highlights
```

### Storage

- Activity data: Database (PostgreSQL)
- Media files: Cloud storage (S3/GCS)
- Transcripts: Searchable index (Elasticsearch)

### Database Schema

```sql
CREATE TABLE workshop_recordings (
  id UUID PRIMARY KEY,
  workshop_id UUID REFERENCES workshops(id),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  media_url VARCHAR(500),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recording_events (
  id UUID PRIMARY KEY,
  recording_id UUID REFERENCES workshop_recordings(id),
  event_type VARCHAR(50),
  timestamp_offset INTEGER,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recording_clips (
  id UUID PRIMARY KEY,
  recording_id UUID REFERENCES workshop_recordings(id),
  title VARCHAR(200),
  start_offset INTEGER,
  end_offset INTEGER,
  share_token VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recording_transcripts (
  id UUID PRIMARY KEY,
  recording_id UUID REFERENCES workshop_recordings(id),
  content TEXT,
  segments JSONB,
  language VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recording_annotations (
  id UUID PRIMARY KEY,
  recording_id UUID REFERENCES workshop_recordings(id),
  timestamp_offset INTEGER,
  content TEXT,
  author_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Acceptance Criteria

1. Recording captures all workshop activities
2. Timeline shows all events with timestamps
3. Replay mode synchronizes all data
4. Clips can be created and shared
5. Transcription is accurate and searchable
6. Annotations can be added at any point

---

## Dependencies

- US01: Workshop flow (events to capture)
- US05: Matrix visualization (replay rendering)
- Cloud storage for media
- Speech-to-text API (Whisper/Google)
- Media streaming infrastructure

---

## Definition of Done

- [ ] Activity recording implemented
- [ ] Timeline with all event types
- [ ] Replay mode with synchronization
- [ ] Clip creation and sharing
- [ ] AI transcription integration
- [ ] Annotation system
- [ ] Auto-highlights feature
- [ ] Export functionality
- [ ] Mobile playback support
- [ ] Unit tests (>80% coverage)
- [ ] Documentation complete
