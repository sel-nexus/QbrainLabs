# US21: Live Polling & Audience Reactions

**Epic:** AI Hotspot Flow - Engagement Backlog  
**Module:** Real-Time Audience Interaction  
**Story Type:** Feature  
**Story Points:** 13  
**Status:** 📋 BACKLOG - Future Feature  
**Target Sprint:** Phase 3 (Q2-Q3 2026)

---

## User Story

**As a** Workshop Facilitator,  
**I want** live polling and real-time reaction features during AI immersion sessions,  
**So that** I can gauge audience sentiment, collect instant feedback, and keep participants engaged throughout the workshop.

---

## Description

Interactive polling and reactions transform passive audiences into active participants. Features include:

1. **Quick Polls:** Instant audience polls with live results
2. **Emoji Reactions:** Real-time sentiment reactions
3. **Q&A System:** Question submission and upvoting
4. **Pulse Checks:** Engagement and understanding gauges
5. **Word Clouds:** Live word cloud generation
6. **Sentiment Analysis:** AI-powered mood tracking

---

## Requirements

### Functional Requirements

#### 1. Quick Polls

**Poll Types:**
- Multiple Choice (single selection)
- Multiple Select (multiple allowed)
- Rating Scale (1-5 or 1-10)
- Yes/No (binary)
- Open Text (short responses)
- Ranking (order by preference)

**Poll Features:**
- Create on-the-fly or pre-configured
- Anonymous or identified responses
- Timer option (auto-close)
- Live results display
- Results visualization (bar, pie, donut)
- Export poll results

#### 2. Emoji Reactions

**Reaction Types:**
- 👍 Agree | 👎 Disagree
- ❤️ Love | 🤔 Thinking
- 💡 Insight | 🔥 Exciting
- ⚠️ Concern | ❓ Question

**Features:**
- Floating reaction animation
- Reaction heatmap over time
- Per-slide reaction summary
- Reaction rate tracking

#### 3. Q&A System

**Features:**
- Submit questions anonymously
- Upvote questions
- Facilitator moderation queue
- Mark as answered
- Pin important questions
- Archive for later

#### 4. Pulse Checks

**Types:**
- Understanding check (Got it / Need review)
- Pace check (Too fast / Just right / Too slow)
- Energy check (Energized / Neutral / Tired)
- Confidence check (scale 1-5)

#### 5. Live Word Clouds

- Real-time word aggregation
- Auto-refresh every 5 seconds
- Filter common words
- Click to see sources

---

## Technical Implementation

### Endpoints

```typescript
POST /api/workshops/:pin/polls
POST /api/polls/:poll_id/vote
GET /api/polls/:poll_id/results
POST /api/workshops/:pin/reactions
GET /api/workshops/:pin/reactions/summary
POST /api/workshops/:pin/questions
POST /api/questions/:id/upvote
GET /api/workshops/:pin/pulse-check
```

### WebSocket Events

```typescript
socket.on('poll:created', { poll });
socket.on('poll:vote', { poll_id, results });
socket.on('reaction:sent', { type, count });
socket.on('question:submitted', { question });
socket.on('question:upvoted', { question_id, votes });
```

---

## Acceptance Criteria

1. Facilitator can create polls with live results
2. Participants can send emoji reactions in real-time
3. Q&A system supports submission and upvoting
4. Pulse checks provide instant feedback
5. Word clouds update in real-time
6. All features work on mobile

---

## Definition of Done

- [ ] Poll system with all types implemented
- [ ] Emoji reactions with animations
- [ ] Q&A with moderation
- [ ] Pulse check functionality
- [ ] Live word clouds
- [ ] Mobile responsive
- [ ] Unit tests (>80% coverage)
- [ ] Documentation complete
