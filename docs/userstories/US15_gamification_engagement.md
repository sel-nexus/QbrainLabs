# US15: Gamification & Engagement System

**Epic:** AI Hotspot Flow - Advanced Engagement Backlog  
**Module:** Gamification & Participant Engagement  
**Story Type:** Feature  
**Story Points:** 21  
**Status:** 📋 BACKLOG - Future Feature  
**Target Sprint:** Phase 4 (Q4 2026)

---

## User Story

**As a** Workshop Facilitator,  
**I want to** incorporate gamification elements like points, badges, leaderboards, and achievements into AI workshops,  
**So that** participants are more engaged, motivated, and actively contribute to the ideation and scoring process.

---

## Description

Gamification transforms passive workshop participation into an engaging, interactive experience. Research shows 83% of employees feel more motivated with gamified training (TalentLMS, 2024). This feature adds game-like mechanics to drive:

1. **Active Participation:** Points for submitting use cases, voting, and engaging in discussions
2. **Healthy Competition:** Real-time leaderboards showing top contributors
3. **Recognition:** Badges and achievements for milestones and exceptional contributions
4. **Team Dynamics:** Team-based challenges and collaborative scoring
5. **Progress Tracking:** Visual progress bars and performance graphs

---

## Requirements

### Functional Requirements

#### 1. Points System

**Earning Points:**
| Action | Points | Description |
|--------|--------|-------------|
| Submit Use Case | 100 | For each valid use case submitted |
| Vote on Use Case | 10 | For each completed score submission |
| First to Submit | 50 | Bonus for first use case in session |
| Quality Bonus | 25-100 | AI-assessed quality of use case description |
| Speed Bonus | 10-25 | Voting within 30 seconds of card display |
| Consistency Bonus | 20 | All criteria scored (no skips) |
| Collaboration Bonus | 30 | Participating in team discussions |
| Session Completion | 150 | Completing all workshop phases |

**Points Display:**
- Real-time points counter in participant header
- Points animation on earning (floating +10 effect)
- Session total and cumulative (across workshops) tracking
- Points breakdown accessible via profile modal

#### 2. Badge System

**Achievement Badges:**

**Participation Badges:**
- 🎯 **First Contributor** - First to submit a use case
- 💡 **Idea Generator** - Submit 5+ use cases in one workshop
- ⚡ **Quick Thinker** - Vote within 15 seconds consistently
- 🎓 **Workshop Graduate** - Complete first workshop
- 🏆 **Workshop Veteran** - Complete 10 workshops

**Quality Badges:**
- ⭐ **Quality Champion** - High AI quality score on use cases
- 📊 **Data-Driven** - Consistently use metrics in KPIs
- 🎨 **Creative Genius** - High novelty score from AI
- 🔧 **Technical Expert** - Detailed technical specifications

**Engagement Badges:**
- 🔥 **Streak Master** - 5 consecutive workshop participations
- 👥 **Team Player** - Active in all team activities
- 🗣️ **Discussion Leader** - Most engagement in discussions
- 🌟 **All-Star** - Top performer in a workshop

**Rare Badges:**
- 💎 **Diamond Contributor** - Top 1% overall score
- 🦄 **Unicorn Idea** - Use case selected for implementation
- 🏅 **Facilitator's Choice** - Selected by facilitator as best idea

**Badge Properties:**
- Visual icon (SVG/emoji)
- Rarity level (Common, Uncommon, Rare, Epic, Legendary)
- Description and criteria
- Date earned
- Shareable certificate link

#### 3. Leaderboards

**Leaderboard Types:**
- **Session Leaderboard:** Real-time ranking within current workshop
- **Organization Leaderboard:** Monthly top contributors across all workshops
- **Team Leaderboard:** Team vs team competition (if teams enabled)
- **All-Time Leaderboard:** Historical top performers

**Leaderboard Features:**
- Top 10 displayed, with participant's own rank shown
- Avatar/initials display
- Points and badge count
- Position change indicators (↑↓)
- Anonymization option (show rank but hide names)
- Segmented views (by department, role, etc.)

**Privacy Controls:**
- Opt-out of public leaderboard
- Anonymous mode (show position only)
- Facilitator control to enable/disable leaderboards

#### 4. Achievements & Milestones

**Progress Milestones:**
- First use case submitted
- First 100 points
- First badge earned
- Complete all phases
- Participate in 5/10/25/50 workshops
- Submit 10/25/50/100 use cases
- Earn all common badges

**Achievement Notifications:**
- Toast notification on achievement unlock
- Confetti animation for major achievements
- Sound effects (optional, user configurable)
- Achievement summary at workshop end

#### 5. Team-Based Gamification

**Team Formation:**
- Auto-assign teams (balanced by department/role)
- Manual team creation by facilitator
- Self-selection with capacity limits

**Team Competitions:**
- Team total points aggregation
- Best team badge awarded
- Team leaderboard display
- Collaborative challenges (team must work together)

**Team Challenges:**
- "Most Diverse Ideas" - Team with broadest category coverage
- "Fastest Team" - First team to complete all scoring
- "Quality Leaders" - Highest average quality score
- "Consensus Champions" - Lowest standard deviation in scores

#### 6. Real-Time Engagement Features

**Live Activity Feed:**
- Real-time feed showing recent achievements
- "X just earned the Quick Thinker badge!"
- "Team Alpha is in the lead!"
- Celebratory animations for milestones

**Engagement Indicators:**
- Participation heatmap
- Engagement score per participant
- Activity timeline
- Real-time engagement dashboard for facilitator

---

## Acceptance Criteria

### Scenario 1: Points Earning
**Given** a participant is in an active workshop  
**When** they submit a use case  
**Then** they earn 100 points  
**And** a floating "+100" animation appears  
**And** their total points update in real-time  
**And** the leaderboard position updates if changed

### Scenario 2: Badge Unlocking
**Given** a participant has submitted 4 use cases  
**When** they submit their 5th use case  
**Then** they unlock the "Idea Generator" badge  
**And** a badge unlock notification appears with animation  
**And** the badge is added to their profile  
**And** the activity feed shows the achievement

### Scenario 3: Leaderboard Updates
**Given** participants are actively earning points  
**When** the leaderboard is displayed  
**Then** it shows real-time rankings  
**And** position changes are animated  
**And** each participant sees their own rank highlighted  
**And** the top 3 have special visual treatment

### Scenario 4: Team Competition
**Given** teams are enabled for a workshop  
**When** participants earn points  
**Then** points contribute to their team total  
**And** team leaderboard updates in real-time  
**And** at workshop end, winning team is announced

### Scenario 5: Achievement Summary
**Given** a participant has completed a workshop  
**When** they view the end screen  
**Then** they see:
  - Total points earned
  - New badges unlocked
  - Leaderboard position
  - Comparison to previous workshops
  - Shareable achievement card

---

## Technical Implementation

### Frontend Components

```
src/components/gamification/
├── PointsDisplay.tsx           # Points counter with animation
├── PointsAnimation.tsx         # Floating points effect
├── BadgeCard.tsx               # Individual badge display
├── BadgeGrid.tsx               # Badge collection view
├── BadgeUnlockModal.tsx        # Badge unlock celebration
├── Leaderboard.tsx             # Leaderboard component
├── LeaderboardEntry.tsx        # Single leaderboard row
├── TeamLeaderboard.tsx         # Team competition view
├── AchievementToast.tsx        # Achievement notification
├── AchievementSummary.tsx      # End-of-workshop summary
├── ActivityFeed.tsx            # Real-time activity stream
├── EngagementDashboard.tsx     # Facilitator engagement view
└── GamificationSettings.tsx    # User preferences
```

### Backend Endpoints

```typescript
// Points Management
POST /api/gamification/points
Request: { participant_id, action, metadata }
Response: { new_total, points_earned, achievements_unlocked }

GET /api/gamification/points/:participant_id
Response: { total_points, session_points, breakdown }

// Badges
GET /api/gamification/badges
Response: { badges: [{ id, name, icon, description, rarity, criteria }] }

GET /api/gamification/badges/:participant_id
Response: { earned: [...], progress: [...] }

POST /api/gamification/badges/check
Request: { participant_id, action }
Response: { newly_earned: [...] }

// Leaderboards
GET /api/workshops/:pin/leaderboard
Response: { rankings: [{ rank, participant, points, badges }] }

GET /api/gamification/leaderboard/organization
Response: { monthly: [...], all_time: [...] }

GET /api/workshops/:pin/leaderboard/teams
Response: { teams: [{ team_name, total_points, members }] }

// Achievements
GET /api/gamification/achievements/:participant_id
Response: { completed: [...], in_progress: [...] }

// Activity Feed
GET /api/workshops/:pin/activity-feed
Response: { activities: [{ type, participant, timestamp, details }] }
```

### WebSocket Events

```typescript
// Real-time gamification updates
socket.on('gamification:points_earned', {
  participant_id, points, new_total, action
});

socket.on('gamification:badge_unlocked', {
  participant_id, badge_id, badge_name, rarity
});

socket.on('gamification:leaderboard_update', {
  rankings: [...], changes: [...]
});

socket.on('gamification:achievement_unlocked', {
  participant_id, achievement_id, achievement_name
});

socket.on('gamification:team_update', {
  team_id, new_points, new_rank
});
```

### Database Schema

```sql
-- Points tracking
CREATE TABLE participant_points (
  id UUID PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  workshop_id UUID REFERENCES workshops(id),
  points INTEGER DEFAULT 0,
  action VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Badge definitions
CREATE TABLE badges (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  icon VARCHAR(50),
  description TEXT,
  rarity VARCHAR(20), -- common, uncommon, rare, epic, legendary
  criteria JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Earned badges
CREATE TABLE participant_badges (
  id UUID PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  badge_id UUID REFERENCES badges(id),
  workshop_id UUID REFERENCES workshops(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(participant_id, badge_id)
);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  criteria JSONB,
  points_reward INTEGER DEFAULT 0
);

-- Teams
CREATE TABLE workshop_teams (
  id UUID PRIMARY KEY,
  workshop_id UUID REFERENCES workshops(id),
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES workshop_teams(id),
  participant_id UUID REFERENCES participants(id)
);
```

---

## Dependencies

- US01: Workshop Initialization
- US02: PIN-Based Entry (participant identification)
- US04: Live Scoring Interface (points for voting)
- US03: Digital Use Case Canvas (points for submissions)
- WebSocket infrastructure for real-time updates
- Animation library (Framer Motion or React Spring)

---

## Testing Requirements

### Unit Tests
- Points calculation for each action type
- Badge criteria evaluation
- Leaderboard sorting and ranking
- Team points aggregation
- Achievement progress tracking

### Integration Tests
- Real-time points updates via WebSocket
- Badge unlock flow
- Leaderboard sync across participants
- Team competition workflows

### Performance Tests
- Leaderboard updates with 100+ participants
- Activity feed with high event volume
- Points calculation latency

---

## UI/UX Design Notes

### Visual Design
- **Points:** Gold coin icon, animated counter
- **Badges:** Circular icons with glow effect for rare badges
- **Leaderboard:** Clean table with avatar, position indicators
- **Animations:** Confetti for major achievements, subtle for minor

### Accessibility
- Screen reader announcements for achievements
- Non-animated mode option
- High contrast badge icons
- Keyboard navigation for all elements

---

## Future Enhancements

- **Seasonal Events:** Limited-time badges and challenges
- **Custom Badges:** Facilitator-created badges per organization
- **Rewards Redemption:** Points exchangeable for prizes
- **Social Sharing:** Share achievements to LinkedIn
- **Streak System:** Daily/weekly participation streaks
- **XP Levels:** Level progression system

---

## Definition of Done

- [ ] Points system implemented with all earning actions
- [ ] 15+ badges defined and implemented
- [ ] Real-time leaderboard with WebSocket updates
- [ ] Team competition mode
- [ ] Achievement notifications with animations
- [ ] Activity feed component
- [ ] Facilitator engagement dashboard
- [ ] Privacy controls implemented
- [ ] Mobile responsive design
- [ ] All unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Performance tested with 100+ participants
- [ ] Accessibility audit passed
- [ ] Documentation complete
