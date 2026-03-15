"""
Challenge Step Service (US34)
Service for generating prompts and summaries for the six-step process
"""

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.challenge import ChallengeCard
from app.core.config import settings
from typing import Optional, List, Dict, Any
from datetime import datetime
import json


class ChallengeStepService:
    """Service for generating prompts and summaries for the six-step process"""

    # Ideation-exercise prompt templates — placeholders: {company}, {domain}, {challenge}
    IDEATION_PROMPTS = {
        1: """\
You are a research aide for a technology innovation workshop.

**Company:** {company}

**Company Domain:** {domain}

**Business Challenge:** {challenge}

Deliver the following in structured format:

1. **Key Personas** — List 4–6 personas (role, seniority, department) most affected by this challenge. Include BOTH internal staff AND external stakeholders (customers, partners, suppliers).

2. **Top Pains** — Rank the top 5 pain points these personas experience today, with:
   - Severity (High / Medium / Low)
   - Frequency (Daily / Weekly / Monthly)
   - Who feels it most (which persona)

3. **Current Workarounds** — For each pain point, describe the manual or semi-manual workaround currently in use.

4. **Success Metrics** — Define 4–6 measurable KPIs that would indicate the challenge is solved. Include current estimated baselines and target values.

5. **3 Insights** — Non-obvious, data-informed insights specific to this industry and challenge domain.

6. **1 Key Risk** — The single biggest risk to solving this challenge (regulatory, technical, organisational, or data-related). Explain why and how it could derail the solution.

Format with clear headers and tables where appropriate.\
""",
        2: """\
You are conducting a root-cause analysis for {company}.

Using the top 3 pain points (by severity and frequency) from the Research & Discovery output:

1. **Five Whys Drill-Down** — Run a Five Whys analysis for each to uncover the root cause. Show each "Why?" step clearly.

2. **3 Root-Cause Hypotheses** per pain (9 total). For each hypothesis, specify:
   - **Hypothesis statement** — A clear, testable claim
   - **Disproof evidence** — What data or observation would INVALIDATE this hypothesis?
   - **Minimum data cut** — The smallest dataset needed to test it
   - **Data owner(s)** — Who at {company} (or their partners) holds this data?

3. **Root-Cause Map** — A structured text diagram linking:
   Pain Points → Why Chains → Root Causes
   Show how multiple pains may share common root causes.

4. **Test Plan** — A table with columns:
   | Hypothesis | Test Method | Data Required | Owner | Timeline | Priority |

5. **Privacy & Regulatory Constraints** — Identify any privacy laws, industry regulations, or contractual constraints that apply to the data involved. Flag anything that could limit data collection or sharing.

Format with clear headers. Use tables for the test plan.\
""",
        3: """\
You are an AI product strategist generating solution ideas for {company}.

**Context:** {domain}

Use the root causes from Stage 2 and the key insights from Stage 1 (already in this conversation) to generate AI-driven solution ideas clustered into three categories:

### CLUSTER 1: Computer Vision (CV)
Ideas leveraging image recognition, document parsing, OCR, visual monitoring, or anomaly detection.
- Generate **3–5 concrete ideas** with a one-line description
- Score each: Impact (1–5), Feasibility (1–5), Speed-to-Pilot (1–5)
- **Star (★)** the single highest-priority idea

### CLUSTER 2: RAG / Co-Pilot
Ideas using retrieval-augmented generation, conversational AI, knowledge assistants, or intelligent Q&A.
- Generate **3–5 concrete ideas**
- Score and star as above

### CLUSTER 3: Tasking & Automation
Ideas for workflow automation, intelligent scheduling, auto-notifications, trigger-based actions, or predictive systems.
- Generate **3–5 concrete ideas**
- Score and star as above

### SCORING GUIDE
- **Impact (1–5):** How much does this solve the core challenge?
- **Feasibility (1–5):** Can {company} build/buy this with existing data and tech?
- **Speed-to-Pilot (1–5):** Can a working prototype be delivered in <4 weeks?

### OUTPUT
1. A scored table for each cluster
2. The ★ top idea per cluster (with brief justification)
3. **Final Recommendation:** The single best idea overall to take to pilot, with a 3-sentence justification.

Be specific to {company}'s domain — no generic "AI dashboard" ideas.\
""",
        4: """\
You are an AI product strategist creating a pilot brief for {company}.

Using the recommended idea from Stage 3 and root causes from Stage 2, produce a **one-page pilot brief** with these sections:

### 1. Pilot Title & One-Line Summary
A memorable name and a single sentence describing what will be built and for whom.

### 2. Target Users
- Primary persona(s) from Stage 1
- Number of users in pilot
- Location / business unit

### 3. Problem Statement (2–3 sentences)
Specific pain being solved. Why now? What is the cost of inaction?

### 4. Proposed Solution
- What it does (functional description)
- Key AI capability used (CV / RAG / Automation / Other)
- Platform or tool to build it on

### 5. User Flow (5–7 steps)
Step-by-step journey from trigger to outcome, in plain English.

### 6. Key Screens / Interfaces
List 4–6 screens or UI components with a one-sentence description each.

### 7. Sample Data Requirements
| Data Element | Source | Format | Owner | Privacy Flag |

### 8. Success Metrics for Pilot
| Metric | Baseline | Target | Measurement Method |

### 9. Constraints & Assumptions
- Time: 4-week pilot
- Budget: [specify]
- Integrations needed
- Known data gaps

Format as a clean, structured brief ready to hand to a developer or AI builder.\
""",
        5: """\
You are a senior full-stack developer building a prototype for {company}.

Using the pilot brief from Stage 4 (already in this conversation), build a **fully functional, single-page web application** with these constraints:

### TECHNICAL
- Single file: HTML5, CSS3, vanilla JavaScript in one .html file
- No external dependencies except Google Fonts (Inter or DM Sans)
- Responsive: desktop-first, mobile-friendly

### BRANDING — {company}
- Research {company}'s brand colours and visual identity
- Use their actual brand palette (primary, secondary, accent colours)
- If uncertain, use professional colours appropriate for the {domain_short} industry
- Typography: Clean, modern, trustworthy
- Tone: Professional and appropriate for the target users

### FUNCTIONALITY
- Ingest and display sample data from pilot brief
- Implement complete key flow (5–7 steps) as interactive UI
- Data visualisation: charts, progress indicators, breakdowns as appropriate
- Notification/communication preview component
- AI Q&A component (simulated responses)
- Export/summary generation
- Clear status indicators with colour coding

### DESIGN QUALITY
- Production-grade — will be shown to {company} executives
- No generic AI aesthetics
- Think: a real product {company} would proudly show their stakeholders
- Subtle animations, clear hierarchy, accessible contrast

Output the complete HTML file only.\
""",
        6: """\
I have a single-file HTML5 prototype built for {company} based on the pilot brief. I want to test it with a group of 5–6 users who represent the personas from Stage 1. The users will be a mix of internal staff and external stakeholders. I will ask them to perform the key flow from the pilot brief and observe their interactions.

Based on the feedback, produce a **one-page executive summary** with the following sections:

1. **Executive Summary** — 3–4 sentences on what was tested, key findings, and recommendation
2. **User Feedback Highlights** — Top 3 positive themes and top 3 areas for improvement
3. **Success Metrics Update** — How the prototype performed against KPIs
4. **Key Insights** — 2–3 non-obvious learnings from testing
5. **Risks & Mitigations** — Any new risks discovered
6. **Next Steps** — Clear recommendations for next steps

Also provide:

1. **Deployment Note** (3–5 sentences): what was built, the core value proposition, and how it can be deployed in a real environment.
2. **Presentation Note** (3–5 sentences): how to present this prototype to stakeholders at {company}.
3. **Known Limitations** of the prototype (be honest and critical):
   - What data connections are real and what are simulated
   - What integrations are real and what are simulated
   - What AI responses are real and what are simulated
   - What workflows are real and what are simulated
   - What UI components are real and what are simulated
4. **3 Questions to ask {company}** that would validate whether this solution addresses their real needs.\
""",
    }

    STEP_DEFINITIONS = {
        1: {
            "name": "Widen",
            "description": "Rapidly surface personas, pains, workarounds, metrics, insights, risks related to the challenge",
            "summary_template": """# Step 1: Widen - Discovery Summary

## Challenge: {title}

### Key Personas
{personas_summary}

### Top Pain Points
{pains_summary}

### Critical Metrics
{metrics_summary}

### Primary Risks
{risks_summary}"""
        },
        2: {
            "name": "Diagnose",
            "description": "Drill into chosen pain using five Whys, hypotheses, disproof evidence, and quick tests for validation",
            "summary_template": """# Step 2: Diagnose - Root Cause Analysis Summary

## Challenge: {title}

### Chosen Pain Point
{pain_point}

### Root Cause (Five Whys)
{root_cause}

### Key Hypotheses Tested
{hypotheses}

### Validation Results
{validation_results}"""
        },
        3: {
            "name": "Converge",
            "description": "Cluster ideas into three options, score impact and do-ability, recommend one with metrics for leadership",
            "summary_template": """# Step 3: Converge - Solution Selection Summary

## Challenge: {title}

### Three Options Evaluated
| Option | Impact | Do-ability | Description |
|--------|--------|------------|-------------|
| Option A | {impact_a} | {doability_a} | {desc_a} |
| Option B | {impact_b} | {doability_b} | {desc_b} |
| Option C | {impact_c} | {doability_c} | {desc_c} |

### Recommended Option
**{recommended_option}** - {rationale}

### Key Metrics for Leadership
{metrics}"""
        },
        4: {
            "name": "Brief",
            "description": "Create one-page brief with users, problem, flow, screens, sample copy, and data, enabling rapid prototyping",
            "summary_template": """# Step 4: Brief - Prototype Specification Summary

## Challenge: {title}

### Users
{users_summary}

### Problem
{problem_summary}

### User Flow
{flow_summary}

### Key Screens
{screens_summary}

### Critical Data Points
{data_summary}"""
        },
        5: {
            "name": "Build",
            "description": "Generate platform-specific builder prompt from brief, including flows, components, data, metrics, constraints for first-cut prototype creation",
            "summary_template": """# Step 5: Build - Implementation Summary

## Challenge: {title}

### Architecture Overview
{architecture}

### Key Components
{components}

### Data Flow
{data_flow}

### Implementation Constraints
{constraints}"""
        },
        6: {
            "name": "Share-back",
            "description": "Generate a 2-3 min executive sales pitch style storyline highlighting what has been done so far and what's next",
            "summary_template": """# Step 6: Share-back - Executive Summary

## Challenge: {title}

### Progress Highlights
{progress_highlights}

### Key Achievements
{achievements}

### Current Status
{current_status}

### Next Steps
{next_steps}

### Business Impact
{business_impact}"""
        }
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.api_key = settings.OPENAI_API_KEY
        self.azure_key = settings.AZURE_OPENAI_API_KEY
        self.azure_endpoint = settings.AZURE_OPENAI_ENDPOINT
        has_llm = self.api_key or (self.azure_key and self.azure_endpoint)
        self.mock_mode = settings.AI_MOCK_MODE or not has_llm
        self.llm = None

        if not self.mock_mode:
            self._initialize_ai_components()
        else:
            print("ChallengeStepService running in MOCK MODE (No API Key found)")

    def _initialize_ai_components(self):
        """Initialize LangChain/OpenAI components (Azure OpenAI or standard OpenAI)."""
        try:
            from langchain_openai import ChatOpenAI, AzureChatOpenAI
            if self.azure_key and self.azure_endpoint:
                self.llm = AzureChatOpenAI(
                    azure_endpoint=self.azure_endpoint,
                    azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT,
                    api_key=self.azure_key,
                    api_version=settings.AZURE_OPENAI_API_VERSION,
                    temperature=0.3,
                    model=settings.AZURE_OPENAI_MODEL_NAME or settings.AZURE_OPENAI_DEPLOYMENT,
                )
            else:
                self.llm = ChatOpenAI(
                    temperature=0.3,
                    model=settings.OPENAI_MODEL,
                    api_key=self.api_key
                )
        except ImportError:
            print("LangChain dependencies missing. Reverting to Mock Mode.")
            self.mock_mode = True
        except Exception as e:
            print(f"Failed to init AI components: {e}")
            self.mock_mode = True
    
    def get_step_name(self, step_number: int) -> str:
        """Get the name of a step"""
        return self.STEP_DEFINITIONS.get(step_number, {}).get("name", f"Step {step_number}")
    
    async def generate_step_prompt(
        self,
        challenge_card: ChallengeCard,
        step_number: int,
        include_workshop_context: bool = False,
        include_previous_steps: bool = False,
        customer_name: str = "",
        customer_about: str = "",
    ) -> str:
        """Generate a prompt for a specific step using ideation-exercise templates."""
        step_def = self.STEP_DEFINITIONS.get(step_number)
        if not step_def:
            raise ValueError(f"Invalid step number: {step_number}")

        template = self.IDEATION_PROMPTS.get(step_number, "")
        if not template:
            return f"Prompt template not found for step {step_number}."

        company = customer_name.strip() or challenge_card.title or "the company"
        domain = customer_about.strip() or "the company's domain and offerings"
        # A short one-word/phrase domain label used in the Build prompt
        domain_words = domain.split()
        domain_short = " ".join(domain_words[:6]) if len(domain_words) > 6 else domain

        return template.format(
            company=company,
            domain=domain,
            domain_short=domain_short,
            challenge=challenge_card.challenge_description or "",
        )
    
    async def generate_step_summary(
        self,
        challenge_card: ChallengeCard,
        step_number: int,
        step_content: Optional[Dict[str, Any]] = None,
        format: str = "markdown"
    ) -> str:
        """Generate a one-slide summary for a specific step based on content."""
        step_def = self.STEP_DEFINITIONS.get(step_number)
        if not step_def:
            raise ValueError(f"Invalid step number: {step_number}")
        
        if self.mock_mode or not step_content:
            return self._generate_mock_step_summary(challenge_card, step_number, step_def)
            
        # Use AI to generate summary
        try:
            from langchain_core.messages import HumanMessage
            
            prompt = f"""
            Synthesize the following output from the '{step_def['name']}' step of an AI challenge workshop into a concise, executive-level summary slide.
            
            Challenge: {challenge_card.title}
            Step Description: {step_def['description']}
            
            Key Content Generated:
            {json.dumps(step_content, indent=2)}
            
            Format the output using this Markdown template structure:
            {step_def['summary_template']}
            
            Fill in the placeholders with synthesized insights derived from the content. Keep bullet points punchy.
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            return response.content
            
        except Exception as e:
            print(f"AI Step Summary generation failed: {e}")
            return self._generate_mock_step_summary(challenge_card, step_number, step_def)

    def _generate_mock_step_summary(self, challenge_card, step_number, step_def) -> str:
        """Generate mock summary."""
        # Prepare context with placeholder values
        context = {
            "title": challenge_card.title,
            "personas_summary": "Key personas identified during the Widen phase",
            "pains_summary": "Top pain points documented",
            "metrics_summary": "Critical metrics identified",
            "risks_summary": "Primary risks identified",
            "pain_point": "Selected pain point from Widen phase",
            "root_cause": "Root cause identified through Five Whys analysis",
            "hypotheses": "Key hypotheses tested",
            "validation_results": "Validation results from quick tests",
            "impact_a": "High",
            "doability_a": "Medium",
            "desc_a": "Option A description",
            "impact_b": "Medium",
            "doability_b": "Easy",
            "desc_b": "Option B description",
            "impact_c": "Low",
            "doability_c": "Hard",
            "desc_c": "Option C description",
            "recommended_option": "Option A",
            "rationale": "Best balance of impact and do-ability",
            "metrics": "Key metrics for leadership review",
            "users_summary": "Target users identified",
            "problem_summary": "Problem clearly defined",
            "flow_summary": "User flow documented",
            "screens_summary": "Key screens identified",
            "data_summary": "Critical data points specified",
            "architecture": "Architecture overview",
            "components": "Key components identified",
            "data_flow": "Data flow documented",
            "constraints": "Implementation constraints identified",
            "progress_highlights": "Progress highlights",
            "achievements": "Key achievements",
            "current_status": "Current status",
            "next_steps": "Next steps outlined",
            "business_impact": "Business impact identified"
        }
        
        # Generate summary using template
        return step_def["summary_template"].format(**context)
