"""
Challenge Step Service (US34)
Service for generating prompts and summaries for the six-step process
"""

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.challenge import ChallengeCard
from typing import Optional, List, Dict, Any
from datetime import datetime
import json


class ChallengeStepService:
    """Service for generating prompts and summaries for the six-step process"""
    
    STEP_DEFINITIONS = {
        1: {
            "name": "Widen",
            "description": "Rapidly surface personas, pains, workarounds, metrics, insights, risks related to the challenge",
            "prompt_template": """# Step 1: Widen - Discovery and Context Building

## Challenge Context
**Challenge Title:** {title}
**Challenge Description:** {description}
**Success Criteria:** {success_criteria}

## Your Task
Rapidly surface and document the following elements related to this challenge:

### 1. Personas
Identify and describe the key user personas affected by this challenge:
- Who are the primary stakeholders?
- What are their roles and responsibilities?
- How are they impacted by this challenge?

### 2. Pain Points
Document the specific pain points experienced:
- What problems do users face?
- What frustrations exist?
- What inefficiencies are present?

### 3. Workarounds
Identify existing temporary solutions or workarounds:
- What manual processes are in place?
- What tools or methods are currently used?
- How do people cope with the challenge today?

### 4. Metrics
Identify relevant metrics and KPIs:
- What quantitative measures relate to this challenge?
- What data points can be tracked?
- What baseline metrics exist?

### 5. Insights
Document key insights from analysis:
- What patterns have been observed?
- What correlations exist?
- What learnings have been gathered?

### 6. Risks
Identify potential risks and challenges:
- What could go wrong?
- What dependencies exist?
- What constraints must be considered?

## Output Format
Please structure your findings using the sections above, providing specific, actionable information for each category.""",
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
            "prompt_template": """# Step 2: Diagnose - Root Cause Analysis

## Challenge Context
**Challenge Title:** {title}
**Challenge Description:** {description}
**Success Criteria:** {success_criteria}

## Your Task
Drill deep into the chosen pain point using systematic diagnostic techniques:

### 1. Five Whys Analysis
Apply the "Five Whys" technique to identify the root cause:
- Why is this pain occurring? (Why 1)
- Why is that happening? (Why 2)
- Why does that occur? (Why 3)
- Why is that the case? (Why 4)
- Why is that the root cause? (Why 5)

### 2. Hypothesis Formation
Formulate hypotheses about the root cause:
- What are potential explanations?
- What assumptions are being made?
- What theories could explain the pain?

### 3. Disproof Evidence
Seek evidence that contradicts your assumptions:
- What data challenges your hypotheses?
- What evidence suggests alternative causes?
- What assumptions might be wrong?

### 4. Quick Tests for Validation
Design quick tests to validate findings:
- What experiments can be run?
- What data can be collected?
- How can hypotheses be tested quickly?

### 5. Validated Root Cause
Document the validated root cause:
- What is the confirmed root cause?
- What evidence supports this conclusion?
- What tests validated this finding?

## Output Format
Document your diagnostic process, findings, and validated root cause using the structure above.""",
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
            "prompt_template": """# Step 3: Converge - Solution Evaluation and Selection

## Challenge Context
**Challenge Title:** {title}
**Challenge Description:** {description}
**Success Criteria:** {success_criteria}

## Your Task
Cluster ideas, evaluate options, and recommend a solution:

### 1. Idea Clustering
Group related ideas and solutions:
- What themes emerge from the ideas?
- How can ideas be grouped?
- What patterns exist?

### 2. Top Three Options
Identify the top three solution options:
- Option A: [Description]
- Option B: [Description]
- Option C: [Description]

### 3. Impact and Do-ability Scoring
Score each option:
- **Impact:** High / Medium / Low
- **Do-ability:** Easy / Medium / Hard
- **Rationale:** Why this score?

### 4. Recommendation
Select and justify the recommended option:
- Which option is recommended?
- Why is this the best choice?
- What makes it superior?

### 5. Metrics for Leadership
Prepare metrics and data to support the recommendation:
- What quantitative benefits can be shown?
- What ROI or business impact metrics exist?
- What success metrics will be tracked?

## Output Format
Present your three options, scores, recommendation, and supporting metrics in a format suitable for leadership review.""",
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
            "prompt_template": """# Step 4: Brief - Prototype Specification

## Challenge Context
**Challenge Title:** {title}
**Challenge Description:** {description}
**Success Criteria:** {success_criteria}

## Your Task
Create a comprehensive one-page brief for rapid prototyping:

### 1. Users
Define target users:
- Who are the primary users?
- What are their characteristics?
- What are their needs?

### 2. Problem
Clearly state the problem:
- What specific problem are we solving?
- Why is this problem important?
- What happens if we don't solve it?

### 3. Flow
Document the user flow:
- What are the key steps?
- What is the user journey?
- What interactions occur?

### 4. Screens
Describe screen mockups or wireframes:
- What screens are needed?
- What is the layout?
- What elements are present?

### 5. Sample Copy
Provide example text content:
- What are the key messages?
- What is the tone?
- What copy is needed?

### 6. Data
Specify data requirements:
- What data is needed?
- Where does it come from?
- How is it structured?

## Output Format
Create a concise one-page brief covering all elements above, formatted for easy reference during prototyping.""",
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
            "prompt_template": """# Step 5: Build - Prototype Implementation Guide

## Challenge Context
**Challenge Title:** {title}
**Challenge Description:** {description}
**Success Criteria:** {success_criteria}

## Your Task
Generate a platform-specific builder prompt for creating the first-cut prototype:

### 1. User Flows and Navigation
- Define the complete user flow
- Specify navigation structure
- Document user interactions

### 2. Components and Structure
- List required UI components
- Define component hierarchy
- Specify component interactions

### 3. Data Models and Requirements
- Define data structures
- Specify API requirements
- Document data relationships

### 4. Key Metrics to Track
- Identify success metrics
- Define tracking points
- Specify measurement methods

### 5. Technical Constraints
- Platform requirements
- Performance considerations
- Integration constraints

### 6. Implementation Details
- Technology stack recommendations
- Architecture patterns
- Development approach

## Output Format
Create a detailed builder prompt that a developer or AI can use to build the prototype, including all technical specifications and requirements.""",
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
            "prompt_template": """# Step 6: Share-back - Executive Summary

## Challenge Context
**Challenge Title:** {title}
**Challenge Description:** {description}
**Success Criteria:** {success_criteria}

## Your Task
Create a 2-3 minute executive sales pitch style storyline:

### 1. Executive Summary
- High-level overview of progress
- Key achievements
- Current status

### 2. What Has Been Done
- Milestones completed
- Key learnings
- Validated findings
- Prototype status

### 3. Current Status
- Where we are now
- What's working
- What needs attention

### 4. What's Next
- Next steps and roadmap
- Upcoming milestones
- Resource needs

### 5. Value Proposition
- Business impact
- ROI potential
- Strategic value

## Output Format
Create a compelling narrative suitable for a 2-3 minute executive presentation, highlighting progress, value, and next steps.""",
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
        self.mock_mode = settings.AI_MOCK_MODE or not self.api_key
        self.llm = None
        
        if not self.mock_mode:
            self._initialize_ai_components()
        else:
            print("ChallengeStepService running in MOCK MODE (No API Key found)")
            
    def _initialize_ai_components(self):
        """Initialize LangChain/OpenAI components."""
        try:
            from langchain_openai import ChatOpenAI
            self.llm = ChatOpenAI(
                temperature=0.3, # low temp for summarization
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
        include_previous_steps: bool = False
    ) -> str:
        """Generate a prompt for a specific step"""
        step_def = self.STEP_DEFINITIONS.get(step_number)
        if not step_def:
            raise ValueError(f"Invalid step number: {step_number}")
        
        # Prepare context
        success_criteria_str = "\n".join([f"- {c}" for c in challenge_card.success_criteria])
        context = {
            "title": challenge_card.title,
            "description": challenge_card.challenge_description,
            "success_criteria": success_criteria_str
        }
        
        # Add workshop context if requested
        if include_workshop_context:
            context["workshop_context"] = "\n\n**Note:** Workshop context and use case data can be included here."
        
        # Add previous steps context if requested
        if include_previous_steps:
            context["previous_steps_context"] = "\n\n**Note:** Context from previous steps can be included here."
        
        # Generate prompt using template
        prompt = step_def["prompt_template"].format(**context)
        
        return prompt
    
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
            from langchain.schema import HumanMessage
            
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
