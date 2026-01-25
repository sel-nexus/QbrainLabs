# US16: AI Copilot Assistant for Workshop Facilitation

**Epic:** AI Hotspot Flow - Advanced AI Backlog  
**Module:** AI-Powered Facilitation  
**Story Type:** Feature  
**Story Points:** 34  
**Status:** 📋 BACKLOG - Future Feature  
**Target Sprint:** Phase 3 (Q2-Q3 2026)

---

## Relationship to Other Stories

**US16 vs US07 (AI Intelligence RAG):**
- **US16** provides **comprehensive workshop facilitation assistance**: Real-time suggestions, participant monitoring, phase-specific guidance, anomaly detection, summary generation
- **US07** focuses on **use case enhancement**: RAG-powered refinement of individual use case submissions, feasibility checking, duplicate detection
- **Boundary:** US16 = "Help me facilitate this workshop"; US07 = "Enhance this use case"
- **Relationship:** US16 may leverage US07's RAG infrastructure for content enhancement, but US16 is broader in scope (monitoring, suggestions, summaries)
- **Dependency:** US16 can build upon US07's RAG foundation but serves facilitators rather than participants

**US16 vs US25 (Analytics Dashboard):**
- **US16** provides **real-time** facilitation assistance during active workshops
- **US25** provides **post-workshop** analytics and cross-workshop insights
- **Relationship:** US16's real-time insights complement US25's historical analysis

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

#### 8. Knowledge Graph & Advanced RAG Infrastructure

**Knowledge Graph Architecture:**
The AI Copilot leverages a sophisticated Knowledge Graph for enhanced contextual intelligence:

- **Entity Nodes:** Use cases, industries, technologies, stakeholders, KPIs, challenges, success patterns
- **Relationship Types:**
  - `IMPLEMENTS` (Use Case → Technology)
  - `ADDRESSES` (Use Case → Challenge)
  - `MEASURES` (Use Case → KPI)
  - `BELONGS_TO` (Use Case → Industry)
  - `REQUIRES` (Use Case → Prerequisite)
  - `SIMILAR_TO` (Use Case ↔ Use Case)
  - `PRECEDED_BY` / `FOLLOWED_BY` (Use Case → Use Case, for sequencing)
  - `OWNED_BY` (Use Case → Stakeholder)
  - `CONFLICTS_WITH` (Use Case ↔ Use Case, for dependencies)

**Knowledge Graph Capabilities:**

1. **Multi-Hop Reasoning:**
   - "What use cases require Python AND address customer service challenges?"
   - "Show all prerequisites for implementing predictive maintenance"
   - "Find use cases that conflict with our current AI chatbot initiative"

2. **Contextual Path Discovery:**
   - Trace implementation paths from current state to desired outcome
   - Identify skill gaps and training requirements
   - Map technology dependencies across use cases

3. **Pattern Recognition:**
   - Identify successful implementation patterns across industries
   - Detect anti-patterns from historical workshop data
   - Recommend sequencing based on past success paths

4. **Semantic Clustering:**
   - Auto-group related use cases based on graph proximity
   - Identify hidden connections participants may not see
   - Suggest consolidation opportunities

**Advanced RAG Pipeline:**

1. **Hybrid Retrieval:**
   - Vector similarity search (embeddings) for semantic matching
   - Graph traversal for relationship-aware context
   - BM25 keyword matching for precise term lookups
   - Combined scoring with configurable weights

2. **Context Enrichment:**
   - Retrieved documents enriched with graph neighborhood
   - Automatic inclusion of related entities (1-2 hops)
   - Dynamic context window optimization

3. **Multi-Source Knowledge Integration:**
   - Workshop historical data (past sessions, outcomes)
   - Industry benchmark databases
   - Internal organizational documentation
   - Public research and best practices (via US26 refresh)
   - Real-time workshop submissions

4. **Knowledge Graph Construction:**
   - Automatic entity extraction from use case submissions
   - Relationship inference using NLP and LLM
   - Continuous graph updates during workshops
   - Periodic batch updates from external sources

**Graph-Powered Copilot Features:**

1. **Intelligent Use Case Recommendations:**
   - "Based on your 'Customer Service Chatbot', consider also: 'Sentiment Analysis Dashboard' (commonly paired, 78% co-occurrence)"
   - "Warning: 'Real-time Video Generation' typically requires 'GPU Infrastructure Upgrade' first"

2. **Impact Analysis:**
   - "Implementing 'Automated Invoice Processing' will enable 3 downstream use cases"
   - "This use case has 5 dependencies - consider prioritizing prerequisites"

3. **Cross-Workshop Learning:**
   - Learn from past workshop patterns across organizations
   - "Organizations similar to yours prioritized X before Y"
   - Success/failure pattern matching

4. **Dynamic Knowledge Updates:**
   - Real-time graph updates as participants submit use cases
   - Relationship suggestions: "Should 'HR Chatbot' be linked to 'Employee Onboarding Automation'?"
   - Conflict detection based on resource/technology overlap

**Knowledge Sources:**
- Internal company documentation (via document ingestion)
- Industry-specific AI use case libraries
- Academic research papers (via semantic scholar API)
- Gartner/Forrester trend reports
- Past workshop data and outcomes
- Real-time participant submissions

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

### Scenario 6: Knowledge Graph Multi-Hop Query
**Given** the Knowledge Graph contains use cases with technology and challenge relationships  
**When** the facilitator asks "What use cases require Python and address supply chain challenges?"  
**Then** the AI Copilot performs a multi-hop graph traversal  
**And** returns relevant use cases with their relationship paths  
**And** includes related entities (technologies, KPIs, stakeholders)

### Scenario 7: Graph-Powered Use Case Recommendation
**Given** a participant has submitted "Customer Service Chatbot"  
**When** the system analyzes graph relationships  
**Then** the AI Copilot suggests: "Consider also: 'Sentiment Analysis Dashboard' (78% co-occurrence in similar workshops)"  
**And** displays the relationship path in the Knowledge Graph  
**And** shows prerequisite use cases if applicable

### Scenario 8: Dependency Impact Analysis
**Given** a use case "Automated Invoice Processing" exists in the workshop  
**When** the facilitator requests impact analysis  
**Then** the AI Copilot shows:
  - 3 downstream use cases this enables
  - 2 prerequisite use cases required
  - Technology dependencies (OCR, LLM, SAP integration)
  - Potential conflicts with existing initiatives

### Scenario 9: Real-Time Knowledge Graph Update
**Given** a workshop is in Intake phase  
**When** a new use case is submitted  
**Then** the system extracts entities (technologies, challenges, KPIs)  
**And** creates/updates nodes in the Knowledge Graph  
**And** infers relationships to existing entities  
**And** the updated graph is available for subsequent queries

### Scenario 10: Cross-Workshop Pattern Matching
**Given** historical workshop data exists in the Knowledge Graph  
**When** the current workshop has similar industry/context  
**Then** the AI Copilot suggests: "Organizations similar to yours prioritized 'Data Quality Automation' before 'Predictive Analytics'"  
**And** shows success/failure patterns from past workshops

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
├── InsightsPanel.tsx           # Behavioral insights display
├── KnowledgeGraphView.tsx      # Interactive graph visualization
├── GraphExplorer.tsx           # Graph query and exploration interface
├── RelationshipMapper.tsx      # Visualize entity relationships
├── ImpactAnalysisPanel.tsx     # Dependency and impact analysis view
└── PatternInsights.tsx         # Cross-workshop pattern display
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

// Knowledge Graph Endpoints
POST /api/copilot/graph/query
Request: { 
  query: "natural language or Cypher query",
  query_type: "natural" | "cypher",
  max_hops: 2,
  include_context: true
}
Response: { 
  nodes: [{ id, type, properties, relevance_score }],
  edges: [{ source, target, relationship, properties }],
  paths: [{ nodes: [], edges: [], explanation }],
  context: { related_entities, patterns_detected }
}

POST /api/copilot/graph/entity-extract
Request: { 
  content: { title, description, kpi, challenges },
  auto_link: true
}
Response: { 
  entities: [{ type, value, confidence }],
  suggested_relationships: [{ 
    source, target, relationship, confidence, reasoning 
  }],
  similar_entities: [{ entity, similarity_score }]
}

GET /api/copilot/graph/impact/:use_case_id
Response: { 
  upstream_dependencies: [{ use_case, relationship, required_before }],
  downstream_enables: [{ use_case, relationship, enabled_after }],
  technology_requirements: [{ tech, status, gap_analysis }],
  conflicts: [{ use_case, conflict_type, resolution_suggestion }],
  impact_score: number
}

POST /api/copilot/graph/recommend
Request: { 
  use_case_id: string,
  context: { industry, workshop_goals, existing_use_cases }
}
Response: { 
  recommendations: [{
    use_case: { title, description },
    co_occurrence_rate: number,
    relationship_path: [],
    reasoning: string,
    priority: "high" | "medium" | "low"
  }],
  prerequisites: [{ use_case, reason, criticality }],
  patterns: [{ pattern_name, frequency, success_rate }]
}

GET /api/copilot/graph/patterns/:workshop_id
Response: { 
  cross_workshop_patterns: [{
    pattern_name: string,
    description: string,
    success_rate: number,
    applicable_use_cases: [],
    recommendation: string
  }],
  anti_patterns: [{
    pattern_name: string,
    risk_level: string,
    mitigation: string
  }],
  industry_benchmarks: [{
    metric: string,
    your_value: number,
    industry_avg: number
  }]
}

POST /api/copilot/graph/ingest
Request: { 
  source_type: "document" | "api" | "workshop_data",
  content: any,
  metadata: { source, date, reliability_score }
}
Response: { 
  entities_created: number,
  relationships_created: number,
  conflicts_detected: [],
  processing_status: "complete" | "pending_review"
}

GET /api/copilot/graph/visualize/:workshop_id
Response: { 
  graph_data: {
    nodes: [{ id, label, type, properties, position }],
    edges: [{ id, source, target, label, properties }]
  },
  clusters: [{ id, name, nodes: [] }],
  layout: "force" | "hierarchical" | "radial"
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
        self.knowledge_graph = KnowledgeGraphEngine()
    
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


# Knowledge Graph Engine
class KnowledgeGraphEngine:
    """
    Knowledge Graph engine using Neo4j for graph storage and 
    hybrid retrieval combining vector similarity with graph traversal.
    """
    
    def __init__(self):
        self.graph_db = Neo4jDriver()  # or NetworkX for lightweight
        self.vector_store = ChromaDB()  # Vector embeddings
        self.llm = OpenAI(model="gpt-4o")
        self.entity_extractor = EntityExtractor()
    
    async def query_graph(
        self, 
        query: str, 
        query_type: str = "natural",
        max_hops: int = 2
    ) -> GraphQueryResult:
        """
        Execute multi-hop graph queries.
        Supports natural language (converted via LLM) or direct Cypher.
        """
        if query_type == "natural":
            cypher = await self._nl_to_cypher(query)
        else:
            cypher = query
        
        results = await self.graph_db.execute(cypher)
        enriched = await self._enrich_with_context(results, max_hops)
        return GraphQueryResult(nodes=enriched.nodes, edges=enriched.edges)
    
    async def extract_entities(self, content: UseCase) -> List[Entity]:
        """
        Extract entities and relationships from use case content.
        Uses LLM for entity recognition and relationship inference.
        """
        prompt = f"""
        Extract entities from this use case:
        Title: {content.title}
        Description: {content.description}
        
        Entity types: Technology, Challenge, KPI, Stakeholder, Industry, Process
        
        Return JSON with entities and suggested relationships.
        """
        response = await self.llm.complete(prompt)
        return self.entity_extractor.parse(response)
    
    async def analyze_impact(self, use_case_id: str) -> ImpactAnalysis:
        """
        Analyze upstream dependencies and downstream enablers.
        Uses graph traversal to find all connected use cases.
        """
        # Find prerequisites (incoming REQUIRES edges)
        upstream = await self.graph_db.execute(f"""
            MATCH (prereq:UseCase)-[:REQUIRES]->(uc:UseCase {{id: '{use_case_id}'}})
            RETURN prereq
        """)
        
        # Find downstream (outgoing ENABLES edges)
        downstream = await self.graph_db.execute(f"""
            MATCH (uc:UseCase {{id: '{use_case_id}'}})-[:ENABLES]->(enabled:UseCase)
            RETURN enabled
        """)
        
        # Find conflicts
        conflicts = await self.graph_db.execute(f"""
            MATCH (uc:UseCase {{id: '{use_case_id}'}})-[:CONFLICTS_WITH]-(conflict:UseCase)
            RETURN conflict
        """)
        
        return ImpactAnalysis(
            upstream=upstream,
            downstream=downstream,
            conflicts=conflicts
        )
    
    async def recommend_related(
        self, 
        use_case_id: str, 
        context: WorkshopContext
    ) -> List[Recommendation]:
        """
        Recommend related use cases based on:
        1. Graph proximity (shared relationships)
        2. Co-occurrence patterns from historical workshops
        3. Vector similarity of descriptions
        """
        # Graph-based similarity
        graph_similar = await self.graph_db.execute(f"""
            MATCH (uc:UseCase {{id: '{use_case_id}'}})-[r]-(related:UseCase)
            WHERE NOT related.id = uc.id
            RETURN related, count(r) as connection_strength
            ORDER BY connection_strength DESC
            LIMIT 5
        """)
        
        # Co-occurrence from historical data
        co_occurrences = await self._find_co_occurrences(use_case_id)
        
        # Vector similarity
        use_case = await self.get_use_case(use_case_id)
        vector_similar = await self.vector_store.similarity_search(
            use_case.description, 
            k=5
        )
        
        # Combine and rank
        return await self._rank_recommendations(
            graph_similar, co_occurrences, vector_similar
        )
    
    async def hybrid_retrieve(
        self, 
        query: str, 
        weights: dict = {"vector": 0.4, "graph": 0.4, "bm25": 0.2}
    ) -> List[RetrievalResult]:
        """
        Hybrid retrieval combining:
        - Vector similarity search
        - Graph neighborhood expansion
        - BM25 keyword matching
        """
        # Vector search
        vector_results = await self.vector_store.similarity_search(query, k=10)
        
        # Graph expansion for top vector results
        expanded = []
        for result in vector_results[:3]:
            neighborhood = await self._get_graph_neighborhood(result.id, hops=2)
            expanded.extend(neighborhood)
        
        # BM25 keyword search
        bm25_results = await self._bm25_search(query, k=10)
        
        # Combine with weights
        combined = self._combine_results(
            vector_results, expanded, bm25_results, weights
        )
        return combined
    
    async def ingest_document(
        self, 
        content: str, 
        source_type: str,
        metadata: dict
    ) -> IngestResult:
        """
        Ingest new content into the Knowledge Graph.
        Extracts entities, creates nodes, and infers relationships.
        """
        # Extract entities
        entities = await self.extract_entities_from_text(content)
        
        # Create embeddings
        embeddings = await self.embeddings.embed(content)
        
        # Create graph nodes
        created_nodes = []
        for entity in entities:
            node_id = await self.graph_db.create_node(
                label=entity.type,
                properties={**entity.properties, "source": metadata["source"]}
            )
            created_nodes.append(node_id)
        
        # Infer and create relationships
        relationships = await self._infer_relationships(entities)
        for rel in relationships:
            await self.graph_db.create_relationship(
                source=rel.source,
                target=rel.target,
                type=rel.relationship
            )
        
        # Store in vector store
        await self.vector_store.add(
            documents=[content],
            embeddings=[embeddings],
            metadata=[metadata]
        )
        
        return IngestResult(
            entities_created=len(created_nodes),
            relationships_created=len(relationships)
        )
    
    async def detect_patterns(self, workshop_id: str) -> List[Pattern]:
        """
        Detect patterns across workshops using graph analysis.
        Identifies successful implementation sequences and anti-patterns.
        """
        # Find common implementation sequences
        sequences = await self.graph_db.execute("""
            MATCH path = (start:UseCase)-[:PRECEDED_BY*1..3]->(end:UseCase)
            WHERE end.outcome = 'successful'
            RETURN path, count(*) as frequency
            ORDER BY frequency DESC
            LIMIT 10
        """)
        
        # Identify anti-patterns (failed implementations)
        anti_patterns = await self.graph_db.execute("""
            MATCH (uc:UseCase {outcome: 'failed'})-[r]-(context)
            RETURN uc, type(r), context
        """)
        
        return PatternAnalysis(
            success_patterns=sequences,
            anti_patterns=anti_patterns
        )
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

-- Knowledge Graph Entities
CREATE TABLE kg_entities (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- UseCase, Technology, Challenge, KPI, Stakeholder, Industry
  name VARCHAR(255) NOT NULL,
  properties JSONB,
  embedding VECTOR(1536), -- For vector similarity search
  source VARCHAR(100), -- workshop, document, api, manual
  source_id UUID, -- Reference to original source (workshop_id, document_id, etc.)
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge Graph Relationships
CREATE TABLE kg_relationships (
  id UUID PRIMARY KEY,
  source_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  target_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- IMPLEMENTS, ADDRESSES, REQUIRES, SIMILAR_TO, etc.
  properties JSONB,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  inferred BOOLEAN DEFAULT false, -- true if auto-inferred by AI
  validated BOOLEAN DEFAULT false, -- true if confirmed by facilitator
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Knowledge Graph Patterns (learned from historical data)
CREATE TABLE kg_patterns (
  id UUID PRIMARY KEY,
  pattern_name VARCHAR(255) NOT NULL,
  pattern_type VARCHAR(50), -- success_sequence, anti_pattern, co_occurrence
  description TEXT,
  cypher_query TEXT, -- Pattern definition in Cypher
  frequency INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2),
  applicable_industries TEXT[], -- Industries where pattern applies
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge Graph Ingest Log
CREATE TABLE kg_ingest_log (
  id UUID PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL, -- document, api, workshop_data
  source_reference VARCHAR(255),
  entities_created INTEGER DEFAULT 0,
  relationships_created INTEGER DEFAULT 0,
  conflicts_detected JSONB,
  status VARCHAR(20) DEFAULT 'complete',
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Cross-Workshop Pattern Cache (for performance)
CREATE TABLE kg_pattern_cache (
  id UUID PRIMARY KEY,
  industry VARCHAR(100),
  use_case_type VARCHAR(100),
  recommended_sequence JSONB, -- Ordered list of use case types
  avg_success_rate DECIMAL(3,2),
  sample_size INTEGER,
  last_calculated TIMESTAMP DEFAULT NOW()
);

-- Indexes for Knowledge Graph
CREATE INDEX idx_kg_entities_type ON kg_entities(entity_type);
CREATE INDEX idx_kg_entities_name ON kg_entities(name);
CREATE INDEX idx_kg_relationships_type ON kg_relationships(relationship_type);
CREATE INDEX idx_kg_relationships_source ON kg_relationships(source_entity_id);
CREATE INDEX idx_kg_relationships_target ON kg_relationships(target_entity_id);
CREATE INDEX idx_kg_entities_embedding ON kg_entities USING ivfflat (embedding vector_cosine_ops);
```

---

## Dependencies

- US07: AI Intelligence & RAG (knowledge base foundation)
- US04: Live Scoring Interface (voting data)
- US03: Digital Use Case Canvas (content enhancement)
- US26: Knowledge Base Research Refresh (external content ingestion)
- OpenAI GPT-4o API
- LangChain for RAG pipeline
- Vector database (ChromaDB/Pinecone)
- **Knowledge Graph Stack:**
  - Neo4j (graph database) or NetworkX (lightweight/in-memory)
  - pgvector (PostgreSQL vector extension for hybrid search)
  - spaCy/transformers (entity extraction)
  - LangChain Graph modules (LangGraph for orchestration)

---

## Testing Requirements

### Unit Tests
- Suggestion generation logic
- Engagement score calculation
- Anomaly detection algorithms
- Content enhancement quality
- Entity extraction accuracy
- Relationship inference logic
- Graph query parsing (NL to Cypher)

### Integration Tests
- Real-time suggestion delivery
- Engagement monitoring accuracy
- Summary generation workflow
- RAG pipeline integration
- Knowledge Graph CRUD operations
- Hybrid retrieval accuracy
- Cross-workshop pattern matching

### AI Quality Tests
- Suggestion relevance scoring
- Enhancement quality evaluation
- Summary accuracy assessment
- False positive rate for anomalies
- Entity extraction precision/recall
- Relationship inference accuracy
- Recommendation relevance scoring
- Pattern detection accuracy

### Knowledge Graph Tests
- Graph consistency (no orphan nodes)
- Relationship bidirectionality where required
- Query performance (<500ms for 3-hop queries)
- Ingestion pipeline reliability
- Vector similarity accuracy
- Graph visualization rendering

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
- **Knowledge Graph Enhancements:**
  - **Federated Knowledge Graphs:** Connect graphs across organizations for industry-wide insights
  - **Temporal Graph Analysis:** Track how use cases evolve over time
  - **Causal Inference:** Identify cause-effect relationships between implementations
  - **Graph Neural Networks:** Use GNN for advanced pattern detection
  - **External Knowledge Integration:** Auto-ingest from Gartner, academic papers, patent databases
  - **Explainable AI:** Visualize reasoning paths for all recommendations
  - **Real-Time Graph Streaming:** Update graph in real-time during workshops using graph streaming

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
- [ ] **Knowledge Graph infrastructure deployed**
- [ ] **Entity extraction pipeline functional**
- [ ] **Multi-hop graph queries working**
- [ ] **Hybrid RAG retrieval (vector + graph + BM25)**
- [ ] **Impact analysis for use cases**
- [ ] **Graph-powered recommendations**
- [ ] **Cross-workshop pattern detection**
- [ ] **Knowledge ingestion pipeline**
- [ ] **Graph visualization component**
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] AI quality evaluation completed
- [ ] Security review completed
- [ ] Documentation complete
