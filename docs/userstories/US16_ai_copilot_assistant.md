# US16: AI Copilot Assistant for Workshop Facilitation

**Epic:** AI Hotspot Flow - Advanced AI Backlog  
**Module:** AI-Powered Facilitation  
**Story Type:** Feature  
**Story Points:** 34  
**Status:** 📋 BACKLOG - Future Feature  
**Target Sprint:** Phase 3 (Q2-Q3 2026)

---

## User Story

**As a** Workshop Facilitator,  
**I want** an AI Copilot assistant that provides real-time guidance, suggestions, and insights during workshop sessions,  
**So that** I can run more effective workshops with data-driven recommendations and reduce cognitive load.

---

## Description

The AI Copilot is an intelligent assistant that operates alongside facilitators during AI immersion days. It provides:

1. **Real-Time Suggestions:** Proactive recommendations based on workshop dynamics
2. **Participant Insights:** Behavioral analysis and engagement monitoring
3. **Content Enhancement:** Auto-improve use case descriptions in real-time
4. **Facilitation Prompts:** Suggested talking points and discussion starters
5. **Anomaly Detection:** Alerts for unusual voting patterns or disengaged participants
6. **Summary Generation:** Real-time and post-workshop AI summaries

---

## Requirements

### Functional Requirements

#### 1. AI Copilot Interface

**Copilot Panel:**
- Collapsible side panel for facilitator view only
- Persistent across all workshop phases
- Contextual suggestions based on current phase
- Voice-activated commands (optional)
- Quick action buttons for common tasks

**Interaction Modes:**
- **Proactive Mode:** AI surfaces suggestions automatically
- **Reactive Mode:** AI responds only when asked
- **Silent Mode:** AI monitors but doesn't interrupt

#### 2. Real-Time Facilitation Assistance

**Phase-Specific Suggestions:**

**Intake Phase:**
- "3 participants haven't submitted yet. Consider sending a reminder."
- "Use case volume is low. Try: 'Think about processes that frustrate you daily.'"
- "Several submissions mention 'customer service' - this could be a hot topic."
- "Duplicate detected: 'Chatbot for HR' and 'AI HR Assistant' are 92% similar."

**Scoring Phase:**
- "Voting velocity is slowing. Consider taking a 5-minute break."
- "Use Case #4 has high variance (σ=3.2). May need discussion before proceeding."
- "Team B is voting consistently higher. Consider calibration exercise."
- "Current use case is complex. Suggest allowing more discussion time."

**Analysis Phase:**
- "Quick Wins quadrant has 7 items. Prioritize top 3 for action planning."
- "No items in Strategic Bets. May indicate risk-averse group."
- "Top use case 'AI Invoice Processing' aligns with industry trends."
- "Suggest grouping similar use cases before final prioritization."

#### 3. Participant Engagement Monitoring

**Engagement Metrics:**
- Time spent on each use case during voting
- Voting patterns (speed, consistency, skips)
- Submission quality scores
- Discussion participation indicators

**Engagement Alerts:**
- "Participant 'John D.' hasn't voted in 10 minutes."
- "Low engagement detected: 5 participants below activity threshold."
- "High engagement: Team Alpha averaging 40 seconds per vote (thorough review)."

**Behavioral Insights:**
- "This group tends to score feasibility higher than value."
- "Morning sessions have 23% higher engagement than afternoon."
- "Groups with pre-read material submit higher quality use cases."

#### 4. Content Enhancement Engine

**Real-Time Use Case Improvement:**
- As participants type, AI suggests improvements
- Auto-complete for KPIs and metrics
- Industry-specific terminology suggestions
- Similar use case references from knowledge base

**Quality Scoring:**
- Completeness score (all fields filled)
- Clarity score (NLP analysis)
- Technical depth score
- Business value articulation score

**Auto-Enhancement Actions:**
- "Enhance" button to auto-improve use case text
- Suggest missing KPIs
- Add technical specifications
- Include estimated effort/timeline

#### 5. Discussion Prompts & Talking Points

**Generated Discussion Questions:**
- "What would be the biggest barrier to implementing this use case?"
- "Who are the key stakeholders for this initiative?"
- "What data would be needed and is it currently available?"
- "How does this align with our strategic priorities?"

**Facilitation Templates:**
- Opening remarks for each phase
- Transition scripts between phases
- Closing summary templates
- Follow-up action item templates

**Debate Facilitation:**
- When high variance detected, suggest structured debate format
- Pro/con discussion framework
- Dot voting alternative for contentious items

#### 6. Anomaly Detection & Alerts

**Voting Anomalies:**
- Consistently same scores (potential disengagement)
- Extreme outliers (9-10 or 1-2 consistently)
- Rapid voting (< 5 seconds per criterion)
- High skip rate

**Content Anomalies:**
- Inappropriate content detection
- Off-topic submissions
- Duplicate/near-duplicate detection
- Unrealistic KPI claims

**Group Dynamics Anomalies:**
- Groupthink indicators (very low variance)
- Polarization (bimodal distributions)
- Department/role bias patterns

#### 7. AI-Generated Summaries

**Real-Time Summary:**
- Live updating summary visible to facilitator
- Key themes emerging from submissions
- Voting trend highlights
- Notable outliers and discussions

**Post-Workshop Summary:**
- Executive summary (1-page)
- Detailed findings report
- Recommended next steps
- Risk and consideration analysis
- Participant engagement statistics

**Summary Formats:**
- Markdown document
- PowerPoint slides (auto-generated)
- Email-ready format
- PDF export

---

## Acceptance Criteria

### Scenario 1: Proactive Suggestion During Intake
**Given** a workshop is in Intake phase with 20 participants  
**When** only 8 have submitted use cases after 10 minutes  
**Then** the AI Copilot suggests: "12 participants haven't submitted. Consider: 'What manual tasks take up most of your time?'"  
**And** the facilitator can dismiss or act on the suggestion

### Scenario 2: Engagement Alert
**Given** participants are voting on use cases  
**When** a participant hasn't interacted for 8+ minutes  
**Then** the AI Copilot shows an alert: "Participant 'Sarah M.' may be disengaged"  
**And** suggests: "Consider checking in or taking a group break"

### Scenario 3: High Variance Alert
**Given** voting is in progress for a use case  
**When** the standard deviation exceeds 2.5  
**Then** the AI Copilot alerts: "High disagreement on 'AI Hiring Assistant' (σ=3.1)"  
**And** suggests: "Consider pausing for discussion before continuing"  
**And** provides debate prompts

### Scenario 4: Real-Time Use Case Enhancement
**Given** a participant is submitting a use case  
**When** the description is vague: "AI for customer stuff"  
**Then** the AI suggests: "AI-Powered Customer Service Automation: Implement intelligent chatbot to handle Tier-1 support queries, reducing response time by 60%"  
**And** the participant can accept, modify, or reject

### Scenario 5: Post-Workshop Summary Generation
**Given** a workshop has completed all phases  
**When** the facilitator clicks "Generate Summary"  
**Then** the AI produces:
  - Executive summary (key findings, top use cases)
  - Detailed report (all use cases, scores, discussions)
  - Next steps recommendations
  - PowerPoint-ready slides

---

## Technical Implementation

### Frontend Components

```
src/components/ai-copilot/
├── CopilotPanel.tsx            # Main copilot interface
├── CopilotToggle.tsx           # Expand/collapse control
├── SuggestionCard.tsx          # Individual suggestion display
├── AlertBanner.tsx             # Urgent alerts
├── EngagementMonitor.tsx       # Participant engagement view
├── DiscussionPrompts.tsx       # Generated discussion questions
├── ContentEnhancer.tsx         # Use case improvement UI
├── SummaryGenerator.tsx        # Summary generation interface
├── CopilotSettings.tsx         # Mode and preference settings
├── VoiceControl.tsx            # Voice command interface
└── InsightsPanel.tsx           # Behavioral insights display
```

### Backend Endpoints

```typescript
// AI Copilot Core
POST /api/copilot/suggestion
Request: { 
  workshop_id, 
  context: { phase, participants, use_cases, votes },
  type: "proactive" | "reactive"
}
Response: { 
  suggestions: [{ 
    id, type, message, priority, actions, dismissible 
  }] 
}

POST /api/copilot/enhance-content
Request: { 
  content: { title, description, kpi },
  context: { industry, workshop_goals }
}
Response: { 
  enhanced: { title, description, kpi, improvements_made },
  quality_score: { completeness, clarity, technical_depth }
}

GET /api/copilot/engagement/:workshop_id
Response: { 
  participants: [{ 
    id, name, engagement_score, last_activity, alerts 
  }],
  group_metrics: { avg_engagement, at_risk_count }
}

POST /api/copilot/analyze-variance
Request: { use_case_id, votes }
Response: { 
  variance_analysis: { std_dev, is_significant, distribution },
  recommendation: { action, discussion_prompts }
}

POST /api/copilot/generate-summary
Request: { 
  workshop_id, 
  format: "executive" | "detailed" | "slides" | "email",
  sections: ["findings", "recommendations", "next_steps"]
}
Response: { 
  summary: { 
    content, 
    format, 
    generated_at,
    download_url 
  }
}

GET /api/copilot/discussion-prompts/:use_case_id
Response: { 
  prompts: [{ category, question, follow_up }]
}

POST /api/copilot/detect-anomalies
Request: { workshop_id, data_type: "votes" | "content" | "behavior" }
Response: { 
  anomalies: [{ type, severity, details, recommendation }]
}
```

### AI/ML Components

```python
# Copilot AI Engine
class CopilotEngine:
    def __init__(self):
        self.llm = OpenAI(model="gpt-4o")
        self.embeddings = OpenAIEmbeddings()
        self.knowledge_base = VectorStore()
    
    async def generate_suggestion(self, context: WorkshopContext) -> List[Suggestion]:
        """Generate contextual suggestions based on workshop state."""
        pass
    
    async def enhance_content(self, content: UseCase) -> EnhancedContent:
        """Improve use case description using RAG."""
        pass
    
    async def analyze_engagement(self, participants: List[Participant]) -> EngagementReport:
        """Analyze participant engagement patterns."""
        pass
    
    async def detect_voting_anomalies(self, votes: List[Vote]) -> List[Anomaly]:
        """Detect unusual voting patterns."""
        pass
    
    async def generate_summary(self, workshop: Workshop, format: str) -> Summary:
        """Generate workshop summary in requested format."""
        pass
```

### Database Schema

```sql
-- Copilot suggestions log
CREATE TABLE copilot_suggestions (
  id UUID PRIMARY KEY,
  workshop_id UUID REFERENCES workshops(id),
  suggestion_type VARCHAR(50),
  message TEXT,
  priority VARCHAR(20),
  context JSONB,
  status VARCHAR(20), -- shown, dismissed, acted_upon
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);

-- Engagement tracking
CREATE TABLE participant_engagement (
  id UUID PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  workshop_id UUID REFERENCES workshops(id),
  engagement_score DECIMAL(5,2),
  last_activity TIMESTAMP,
  activity_log JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated summaries
CREATE TABLE workshop_summaries (
  id UUID PRIMARY KEY,
  workshop_id UUID REFERENCES workshops(id),
  format VARCHAR(20),
  content TEXT,
  metadata JSONB,
  generated_at TIMESTAMP DEFAULT NOW()
);

-- Anomaly detections
CREATE TABLE detected_anomalies (
  id UUID PRIMARY KEY,
  workshop_id UUID REFERENCES workshops(id),
  anomaly_type VARCHAR(50),
  severity VARCHAR(20),
  details JSONB,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Dependencies

- US07: AI Intelligence & RAG (knowledge base foundation)
- US04: Live Scoring Interface (voting data)
- US03: Digital Use Case Canvas (content enhancement)
- OpenAI GPT-4o API
- LangChain for RAG pipeline
- Vector database (ChromaDB/Pinecone)

---

## Testing Requirements

### Unit Tests
- Suggestion generation logic
- Engagement score calculation
- Anomaly detection algorithms
- Content enhancement quality

### Integration Tests
- Real-time suggestion delivery
- Engagement monitoring accuracy
- Summary generation workflow
- RAG pipeline integration

### AI Quality Tests
- Suggestion relevance scoring
- Enhancement quality evaluation
- Summary accuracy assessment
- False positive rate for anomalies

---

## Privacy & Security

- Copilot data visible only to facilitator
- Participant names anonymizable in summaries
- No PII in AI model training
- Opt-out option for AI analysis
- Data retention policies

---

## Future Enhancements

- **Voice-Activated Commands:** "Hey Copilot, summarize the discussion"
- **Predictive Analytics:** Predict workshop outcomes early
- **Learning System:** Copilot learns from facilitator preferences
- **Multi-Language Support:** Suggestions in participant languages
- **Integration with Meeting Tools:** Sync with Zoom/Teams

---

## Definition of Done

- [ ] Copilot panel implemented with all modes
- [ ] Real-time suggestions for all phases
- [ ] Engagement monitoring with alerts
- [ ] Content enhancement engine
- [ ] Discussion prompts generation
- [ ] Anomaly detection system
- [ ] Summary generation (all formats)
- [ ] Voice control (optional)
- [ ] Privacy controls implemented
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] AI quality evaluation completed
- [ ] Security review completed
- [ ] Documentation complete
