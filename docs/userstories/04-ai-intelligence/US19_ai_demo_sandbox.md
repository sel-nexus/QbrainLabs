# US19: AI Demo Sandbox & Hands-On Labs

**Epic:** AI Hotspot Flow - Experiential Learning Backlog  
**Module:** Interactive AI Demonstrations  
**Story Type:** Feature  
**Story Points:** 34  
**Status:** 📋 BACKLOG - Future Feature  
**Target Sprint:** Phase 4 (Q4 2026)

---

## User Story

**As a** Workshop Participant,  
**I want** hands-on access to AI demo environments and interactive labs during AI immersion days,  
**So that** I can experience AI capabilities firsthand and better understand the potential of proposed use cases.

---

## Description

Transform theoretical AI discussions into experiential learning. This feature provides:

1. **Live AI Demos:** Interactive demonstrations of AI capabilities
2. **Sandbox Environments:** Safe spaces to experiment with AI tools
3. **Guided Labs:** Step-by-step AI exercises
4. **Use Case Simulators:** Try-before-you-build simulations
5. **Quick Prototypes:** Rapid proof-of-concept builders

---

## Requirements

### Functional Requirements

#### 1. AI Demo Library

**Pre-Built Demonstrations:**

**Generative AI Demos:**
| Demo | Description | AI Model |
|------|-------------|----------|
| Text Generation | Create content from prompts | GPT-4o |
| Image Generation | Generate images from text | DALL-E 3 |
| Code Assistant | Write code from descriptions | GPT-4o |
| Document Summarizer | Summarize long documents | Claude |
| Translation | Multi-language translation | GPT-4o |
| Chatbot | Conversational AI demo | GPT-4o |

**Analytical AI Demos:**
| Demo | Description | Technology |
|------|-------------|------------|
| Sentiment Analysis | Analyze text sentiment | NLP Models |
| Entity Extraction | Extract entities from text | spaCy/GPT |
| Classification | Categorize documents | ML Models |
| Anomaly Detection | Find outliers in data | Statistical |
| Forecasting | Time series predictions | Prophet |
| Recommendation | Similarity-based suggestions | Embeddings |

**Vision AI Demos:**
| Demo | Description | Technology |
|------|-------------|------------|
| Image Classification | Categorize images | Vision API |
| Object Detection | Identify objects in images | YOLO/Vision |
| OCR | Extract text from images | Tesseract/Vision |
| Face Detection | Detect faces (ethical demo) | Vision API |

**Demo Features:**
- Live interactive interface
- Sample inputs provided
- Custom input capability
- Explanation of how it works
- Relevance to use cases

#### 2. Sandbox Environments

**Environment Types:**

**ChatGPT-Style Sandbox:**
- Conversational interface
- System prompt customization
- Temperature/parameter controls
- Conversation history
- Export conversations

**Code Sandbox:**
- Browser-based Python/JavaScript IDE
- Pre-installed AI libraries
- Sample notebooks
- Run code in secure container
- Share code snippets

**No-Code AI Builder:**
- Drag-and-drop AI workflow
- Connect data sources
- Apply AI operations
- View results
- Export workflow

**Data Analysis Sandbox:**
- Upload sample data (CSV)
- Apply AI analysis
- Visualize results
- Generate insights

**Sandbox Limits:**
- API call quotas per session
- Execution time limits
- Data size limits
- Rate limiting
- Content filtering

#### 3. Guided Labs

**Lab Structure:**
1. **Objective:** What you'll learn
2. **Prerequisites:** Required knowledge
3. **Duration:** Estimated time
4. **Steps:** Guided walkthrough
5. **Checkpoints:** Verify progress
6. **Challenge:** Optional extension
7. **Takeaways:** Key learnings

**Lab Categories:**

**Beginner Labs:**
- "Your First AI Prompt"
- "Understanding AI Responses"
- "Prompt Engineering Basics"
- "AI Ethics Exploration"

**Intermediate Labs:**
- "Building a Customer Service Bot"
- "Document Analysis Pipeline"
- "Creating AI-Powered Search"
- "Automating Email Responses"

**Advanced Labs:**
- "Fine-Tuning for Your Domain"
- "RAG Implementation"
- "Multi-Model Orchestration"
- "AI Agent Development"

**Lab Features:**
- Progress tracking
- Hints system
- Solution reveal
- Discussion forum
- Certificate on completion

#### 4. Use Case Simulators

**Simulation Framework:**
- Connect to workshop use cases
- Generate simulation from use case description
- Configurable scenarios
- Mock data generation
- Results visualization

**Simulator Types:**

**Process Automation Simulator:**
- Input: Current manual process
- Simulation: AI-automated version
- Output: Time savings, error reduction

**Chatbot Simulator:**
- Input: FAQ/knowledge base
- Simulation: Interactive chatbot
- Output: Response quality metrics

**Document Processing Simulator:**
- Input: Sample documents
- Simulation: Extraction, classification
- Output: Accuracy metrics

**Predictive Model Simulator:**
- Input: Historical data
- Simulation: ML predictions
- Output: Accuracy, business impact

**Simulator Outputs:**
- Live demo of use case
- Estimated metrics
- Implementation complexity
- Required data/resources

#### 5. Rapid Prototyping

**Quick Prototype Builder:**
- Select use case from workshop
- AI generates prototype specification
- Choose from templates
- Customize parameters
- Deploy temporary demo

**Prototype Templates:**
- Chatbot (customer service, HR, IT)
- Document processor (invoices, contracts)
- Data analyzer (reports, dashboards)
- Workflow automator (approval, routing)
- Content generator (emails, summaries)

**Prototype Features:**
- 24-hour temporary deployment
- Shareable demo link
- Usage analytics
- Feedback collection
- Export configuration

#### 6. Integration with Workshop Flow

**Contextual Demos:**
- Suggest relevant demos based on use case category
- "See it in action" button on use cases
- Demo results feed into scoring decisions

**Lab Assignments:**
- Facilitator assigns labs to participants
- Track completion status
- Discuss findings in workshop
- Award badges for completion

**Prototype Showcase:**
- Present prototypes to group
- Collect reactions/votes
- Integrate feedback into use case

---

## Acceptance Criteria

### Scenario 1: Access AI Demo
**Given** a participant is viewing the Demo Library  
**When** they select "Chatbot Demo"  
**Then** they see an interactive chatbot interface  
**And** can type custom messages  
**And** see AI responses in real-time  
**And** understand how it relates to their use cases

### Scenario 2: Complete Guided Lab
**Given** a participant starts "Prompt Engineering Basics" lab  
**When** they follow the step-by-step instructions  
**Then** they complete exercises at each step  
**And** see their progress tracked  
**And** receive hints if stuck  
**And** earn a completion badge

### Scenario 3: Use Case Simulation
**Given** a use case "AI Invoice Processing" exists  
**When** the participant clicks "Simulate"  
**Then** the system generates a simulation environment  
**And** shows before/after comparison  
**And** displays estimated metrics  
**And** allows interaction with mock data

### Scenario 4: Rapid Prototype
**Given** a use case "Customer Support Chatbot" is prioritized  
**When** the facilitator clicks "Build Prototype"  
**Then** a chatbot configuration wizard appears  
**And** they can customize responses/knowledge  
**And** deploy a working demo in minutes  
**And** share the demo link with stakeholders

### Scenario 5: Sandbox Experimentation
**Given** a participant accesses the Code Sandbox  
**When** they write Python code using AI libraries  
**Then** the code executes in a secure environment  
**And** results display immediately  
**And** they can save and share their work

---

## Technical Implementation

### Frontend Components

```
src/components/sandbox/
├── DemoLibrary.tsx              # Demo catalog view
├── DemoPlayer.tsx               # Interactive demo interface
├── ChatbotDemo.tsx              # Conversational AI demo
├── ImageGenDemo.tsx             # Image generation demo
├── CodeDemo.tsx                 # Code assistant demo
├── SandboxEnvironment.tsx       # General sandbox container
├── ChatSandbox.tsx              # ChatGPT-style sandbox
├── CodeSandbox.tsx              # Code IDE sandbox
├── NoCodeBuilder.tsx            # Drag-drop AI builder
├── GuidedLab.tsx                # Lab interface
├── LabStep.tsx                  # Individual lab step
├── LabProgress.tsx              # Progress tracker
├── UseCaseSimulator.tsx         # Simulation interface
├── SimulationResults.tsx        # Results visualization
├── PrototypeBuilder.tsx         # Quick prototype wizard
├── PrototypePreview.tsx         # Demo preview
└── SandboxQuotaDisplay.tsx      # Usage limits display
```

### Backend Endpoints

```typescript
// Demo Library
GET /api/demos
Response: {
  categories: [
    {
      name: "Generative AI",
      demos: [{ id, name, description, thumbnail, ai_model }]
    }
  ]
}

GET /api/demos/:demo_id
Response: {
  id, name, description, 
  interface_type: "chat" | "form" | "upload",
  sample_inputs: [...],
  ai_config: { model, parameters }
}

POST /api/demos/:demo_id/run
Request: { input, parameters }
Response: { output, execution_time, tokens_used }

// Sandbox
POST /api/sandbox/session
Request: { 
  sandbox_type: "chat" | "code" | "nocode" | "data",
  workshop_id
}
Response: { 
  session_id, 
  quota: { api_calls, execution_minutes, expires_at }
}

POST /api/sandbox/:session_id/execute
Request: { 
  code?: string,
  prompt?: string,
  workflow?: object
}
Response: { result, execution_time, quota_remaining }

// Labs
GET /api/labs
Response: { labs: [{ id, title, category, duration, difficulty }] }

GET /api/labs/:lab_id
Response: { 
  id, title, objective, prerequisites, estimated_duration,
  steps: [{ order, title, instructions, checkpoint, hint }]
}

POST /api/labs/:lab_id/progress
Request: { participant_id, step_completed, checkpoint_data }
Response: { progress_percent, next_step, badge_earned }

GET /api/labs/:lab_id/progress/:participant_id
Response: { completed_steps, current_step, started_at, completed_at }

// Simulators
POST /api/simulators/generate
Request: { 
  use_case_id,
  simulator_type: "process" | "chatbot" | "document" | "predictive"
}
Response: { 
  simulator_id, 
  config: { inputs, mock_data, scenarios },
  preview_url
}

POST /api/simulators/:simulator_id/run
Request: { scenario, inputs }
Response: { 
  results: { metrics, visualization_data },
  comparison: { before, after }
}

// Prototypes
POST /api/prototypes/build
Request: { 
  use_case_id,
  template: "chatbot" | "document" | "workflow",
  config: { ... }
}
Response: { 
  prototype_id, 
  demo_url, 
  expires_at,
  embed_code
}

GET /api/prototypes/:prototype_id
Response: { config, demo_url, usage_stats, feedback }

POST /api/prototypes/:prototype_id/feedback
Request: { rating, comments }
```

### Infrastructure

**Sandbox Execution:**
```yaml
# Kubernetes config for sandbox containers
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: sandbox-python
    image: sandbox-python:latest
    resources:
      limits:
        cpu: "500m"
        memory: "512Mi"
    securityContext:
      runAsNonRoot: true
      readOnlyRootFilesystem: true
```

**AI API Integration:**
```python
class AIService:
    def __init__(self):
        self.openai = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def run_demo(self, demo_type: str, input: dict) -> dict:
        """Execute AI demo with appropriate model."""
        pass
    
    async def generate_simulation(self, use_case: UseCase) -> Simulation:
        """Generate simulation environment from use case."""
        pass
    
    async def build_prototype(self, config: PrototypeConfig) -> Prototype:
        """Build and deploy quick prototype."""
        pass
```

### Database Schema

```sql
-- Demos
CREATE TABLE demos (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  category VARCHAR(50),
  ai_model VARCHAR(50),
  interface_type VARCHAR(20),
  sample_inputs JSONB,
  config JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sandbox Sessions
CREATE TABLE sandbox_sessions (
  id UUID PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  workshop_id UUID REFERENCES workshops(id),
  sandbox_type VARCHAR(20),
  quota_used JSONB,
  quota_limit JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Labs
CREATE TABLE labs (
  id UUID PRIMARY KEY,
  title VARCHAR(200),
  category VARCHAR(50),
  difficulty VARCHAR(20),
  duration_minutes INTEGER,
  objective TEXT,
  prerequisites TEXT,
  steps JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

-- Lab Progress
CREATE TABLE lab_progress (
  id UUID PRIMARY KEY,
  lab_id UUID REFERENCES labs(id),
  participant_id UUID REFERENCES participants(id),
  completed_steps INTEGER[],
  current_step INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  badge_awarded BOOLEAN DEFAULT FALSE
);

-- Simulators
CREATE TABLE simulators (
  id UUID PRIMARY KEY,
  use_case_id UUID REFERENCES use_cases(id),
  simulator_type VARCHAR(20),
  config JSONB,
  mock_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Prototypes
CREATE TABLE prototypes (
  id UUID PRIMARY KEY,
  use_case_id UUID REFERENCES use_cases(id),
  template VARCHAR(50),
  config JSONB,
  demo_url VARCHAR(500),
  usage_stats JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Dependencies

- US03: Digital Use Case Canvas (use case data)
- US07: AI Intelligence & RAG (AI capabilities)
- OpenAI API / Anthropic API
- Kubernetes for sandbox isolation
- Code execution service (e.g., Piston)

---

## Security Considerations

- Sandbox isolation (containers)
- API key protection
- Content filtering
- Rate limiting
- No persistent data access
- Audit logging

---

## Testing Requirements

### Unit Tests
- Demo execution logic
- Quota management
- Lab progress tracking
- Simulation generation

### Integration Tests
- End-to-end demo flow
- Sandbox execution
- Prototype deployment
- Lab completion flow

### Security Tests
- Sandbox escape attempts
- API abuse prevention
- Content injection

---

## Future Enhancements

- **Custom Demo Builder:** Create organization-specific demos
- **Multi-Player Labs:** Collaborative lab exercises
- **AI Model Comparison:** Side-by-side model evaluation
- **Persistent Prototypes:** Long-term prototype hosting
- **Industry-Specific Labs:** Vertical-focused content

---

## Definition of Done

- [ ] Demo library with 10+ demos
- [ ] Chat sandbox environment
- [ ] Code sandbox with secure execution
- [ ] 5+ guided labs implemented
- [ ] Use case simulator framework
- [ ] Prototype builder with templates
- [ ] Quota and rate limiting
- [ ] Progress tracking and badges
- [ ] Mobile responsive design
- [ ] Security audit completed
- [ ] Unit tests passing (>80% coverage)
- [ ] Documentation complete
