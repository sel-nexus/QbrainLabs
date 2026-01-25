# US34: Challenge Cards for Workshops

**Epic:** Workshop Management & Content  
**Module:** Workshop Content Management  
**Story Type:** Feature  
**Priority:** Medium-High  
**Story Points:** 21  
**Status:** 📋 BACKLOG - Planned  
**Target Sprint:** Phase 3 (Q2-Q3 2026)

---

## User Story

**As a** Workshop Facilitator or Admin,  
**I want to** create challenge cards that define high-value business or technology problems with success criteria for AI-led intervention/transformation,  
**So that** I can provide clear context and measurable outcomes for workshop participants to focus their use case ideation and evaluation.

---

## Description

Challenge Cards enable facilitators and admins to define the strategic problems or opportunities that workshops are designed to address. Each challenge card contains:

1. **Challenge Description:** A detailed description of a high-value business or technology problem
2. **Success Criteria:** A bulleted list of measurable outcomes that define success for AI-led intervention/transformation

These challenge cards serve as the foundation for workshop activities, helping participants understand the context and align their use case submissions with organizational priorities. Challenge cards can be created before or during a workshop and can be displayed to participants to guide their ideation process.

**Six-Step Process Integration:**

When a challenge card is selected, facilitators and participants can generate prompts or one-slide summaries for each step of the "Building on the Challenge" methodology:

1. **Widen:** Rapidly surface personas, pains, workarounds, metrics, insights, and risks
2. **Diagnose:** Drill into chosen pain using five Whys, hypotheses, disproof evidence, and quick tests
3. **Converge:** Cluster ideas into three options, score impact and do-ability, recommend one
4. **Brief:** Create one-page brief with users, problem, flow, screens, sample copy, and data
5. **Build:** Generate platform-specific builder prompt with flows, components, data, metrics, and constraints
6. **Share-back:** Generate a 2-3 min executive sales pitch style storyline

This integration enables structured problem-solving and solution development directly within the workshop context, providing guided prompts and summaries that help teams progress through each stage systematically.

---

## Requirements

### Functional Requirements

#### 1. Challenge Card Creation

**Create Challenge Card Form:**
- **Title** (required)
  - Text input
  - Max 100 characters
  - Default: "Challenge card {n}" (where n is the next sequential number)
  - Customizable by facilitator
  
- **Challenge Description** (required)
  - Rich text area (supports formatting: bold, italics, bullet points)
  - Max 2000 characters
  - Character counter
  - Placeholder text with example
  - Auto-save draft every 30 seconds
  
- **Success Criteria** (required)
  - Multi-line text input for bulleted list
  - Each criterion on a new line
  - Supports markdown-style bullet points (- or *)
  - Max 10 criteria items
  - Each criterion max 500 characters
  - Add/remove criteria dynamically
  - Visual bullet point rendering in preview

**Card Management:**
- Create multiple challenge cards per workshop
- Display order/positioning (drag-and-drop reordering)
- Edit existing challenge cards
- Delete challenge cards (with confirmation)
- Duplicate challenge cards

#### 2. Challenge Card Display

**Card View:**
- Card-based UI matching existing design patterns (similar to ScoringCard, BadgeCard)
- Display title prominently at top
- Challenge description in readable format
- Success criteria as formatted bulleted list
- Card metadata (created by, created date)
- Visual indicator for active/inactive status

**Workshop Integration:**
- Display challenge cards in WorkshopDetail page
- Separate section/tab for challenge cards
- Visible to facilitators/admins (full CRUD)
- Visible to participants (read-only)
- Can be pinned/featured for emphasis

**Challenge Card Detail View:**
- When a challenge card is selected/clicked, display expanded detail view
- Show full challenge description and success criteria
- Display action buttons for six-step process generation
- Each step has option to generate either:
  - **Prompt:** Detailed prompt for AI/team to execute the step
  - **One-Slide Summary:** Concise one-slide summary of the step

#### 3. Six-Step Process Generation

**Building on the Challenge - Six-Step Process:**

When a challenge card is selected, users can generate prompts or one-slide summaries for each of the following steps:

**Step 1: Widen**
- **Purpose:** Rapidly surface personas, pains, workarounds, metrics, insights, risks related to the challenge
- **Prompt Generation:** Creates a detailed prompt that guides users to identify and list:
  - User personas affected by the challenge
  - Pain points experienced
  - Existing workarounds or temporary solutions
  - Relevant metrics and KPIs
  - Key insights from analysis
  - Potential risks and challenges
- **One-Slide Summary:** Concise summary highlighting key personas, top pain points, critical metrics, and primary risks

**Step 2: Diagnose**
- **Purpose:** Drill into chosen pain using five Whys, hypotheses, disproof evidence, and quick tests for validation
- **Prompt Generation:** Creates a detailed prompt that guides users to:
  - Apply the "five Whys" technique for root cause analysis
  - Formulate hypotheses about the root cause
  - Seek disproof evidence to challenge assumptions
  - Design quick tests for validation
  - Document findings and validated root causes
- **One-Slide Summary:** Summary of the chosen pain point, root cause analysis findings, key hypotheses tested, and validation results

**Step 3: Converge**
- **Purpose:** Cluster ideas into three options, score impact and do-ability, recommend one with metrics for leadership
- **Prompt Generation:** Creates a detailed prompt that guides users to:
  - Cluster and group related ideas
  - Identify top three solution options
  - Score each option on impact (high/medium/low) and do-ability (easy/medium/hard)
  - Select one recommended option
  - Prepare metrics and data to support the recommendation for leadership
- **One-Slide Summary:** Summary showing the three options, their impact/do-ability scores, the recommended option, and key metrics for leadership

**Step 4: Brief**
- **Purpose:** Create one-page brief with users, problem, flow, screens, sample copy, and data, enabling rapid prototyping
- **Prompt Generation:** Creates a detailed prompt that guides users to create a comprehensive brief including:
  - Target users and personas
  - Problem statement
  - User flow/journey
  - Screen mockups or wireframes
  - Sample copy/text content
  - Supporting data and metrics
- **One-Slide Summary:** Visual summary of the brief with key elements: users, problem, flow overview, and critical data points

**Step 5: Build**
- **Purpose:** Generate platform-specific builder prompt from brief, including flows, components, data, metrics, constraints for first-cut prototype creation
- **Prompt Generation:** Creates a detailed, platform-specific builder prompt that includes:
  - User flows and navigation
  - UI components and structure
  - Data models and requirements
  - Key metrics to track
  - Technical constraints and considerations
  - Platform-specific implementation details
- **One-Slide Summary:** Technical summary showing architecture overview, key components, data flow, and implementation constraints

**Step 6: Share-back**
- **Purpose:** Generate a 2-3 min executive sales pitch style storyline highlighting what has been done so far and what's next
- **Prompt Generation:** Creates a detailed prompt that guides users to craft:
  - Executive summary of progress
  - Key achievements and milestones
  - Current status and learnings
  - Next steps and roadmap
  - Value proposition and business impact
- **One-Slide Summary:** Executive summary slide with progress highlights, key achievements, current status, and next steps

**Generation Features:**
- Generate prompts or summaries on-demand (no pre-generation)
- Use challenge card content (title, description, success criteria) as context
- Option to include workshop context and use case data
- Export generated prompts/summaries as:
  - Plain text
  - Markdown
  - PDF (for summaries)
- Copy to clipboard functionality
- Save generated content to challenge card (optional, as notes/metadata)

**UI/UX:**
- Expandable/collapsible section for each step
- Clear visual distinction between "Prompt" and "One-Slide Summary" options
- Loading state during generation
- Preview before export/copy
- Regenerate option to create new versions

#### 4. Access Control

**Permissions:**
- **Facilitators:** Can create, edit, delete challenge cards for workshops they own or are assigned to
- **Admins:** Can create, edit, delete challenge cards for any workshop
- **Participants:** Can view challenge cards (read-only) in workshops they've joined

**Validation:**
- Workshop must exist before creating challenge cards
- User must have facilitator/admin role and workshop access
- Challenge cards are scoped to specific workshops

#### 5. Data Persistence

**Storage:**
- Challenge cards stored in PostgreSQL database
- Linked to workshops via foreign key
- Track creator (user ID)
- Track creation and modification timestamps
- Soft delete support (optional for future)

---

## Acceptance Criteria

### Scenario 1: Create Challenge Card
**Given** a facilitator is logged into a workshop they own  
**When** they navigate to the Challenge Cards section and click "Create Challenge Card"  
**And** they fill in:
  - Title: "Ticket Analysis Across Service Queues"
  - Challenge Description: "In WSP's multi-queue support model, tickets often traverse several functional queues..."
  - Success Criteria: 
    - "Shorter end-to-end resolution time (reduce average and P90/P95 by targeted %)"
    - "Fewer handoffs (lower average number of queue transitions per ticket)"
    - "Visibility into queue dynamics..."
**Then** the challenge card is created and displayed in the workshop  
**And** the card shows all entered information in a formatted view  
**And** the card is visible to all participants in the workshop

### Scenario 2: Edit Challenge Card
**Given** a challenge card exists in a workshop  
**When** a facilitator clicks "Edit" on the challenge card  
**And** they modify the challenge description  
**Then** the changes are saved  
**And** the updated card is displayed with the new content  
**And** participants see the updated card

### Scenario 3: Delete Challenge Card
**Given** a challenge card exists in a workshop  
**When** a facilitator clicks "Delete" on the challenge card  
**And** they confirm the deletion  
**Then** the challenge card is removed from the workshop  
**And** it no longer appears in the challenge cards list

### Scenario 4: Participant View (Read-Only)
**Given** a challenge card exists in a workshop  
**When** a participant views the workshop  
**Then** they can see the challenge card with title, description, and success criteria  
**And** they cannot see edit/delete buttons  
**And** they cannot modify the challenge card

### Scenario 5: Multiple Challenge Cards
**Given** a workshop has multiple challenge cards  
**When** a facilitator views the Challenge Cards section  
**Then** all challenge cards are displayed in a grid or list view  
**And** cards can be reordered via drag-and-drop  
**And** the order is persisted

### Scenario 6: Access Control - Unauthorized User
**Given** a user who is not a facilitator/admin for a workshop  
**When** they attempt to create a challenge card for that workshop  
**Then** they receive a 403 Forbidden error  
**And** they cannot create challenge cards

### Scenario 7: Access Control - Admin Override
**Given** an admin user  
**When** they view any workshop  
**Then** they can create, edit, and delete challenge cards  
**And** they have full CRUD access regardless of workshop ownership

### Scenario 8: Generate Step 1 (Widen) Prompt
**Given** a challenge card exists in a workshop  
**When** a facilitator selects the challenge card  
**And** they click "Generate Prompt" for Step 1: Widen  
**Then** a detailed prompt is generated that includes:
  - Instructions to identify personas, pains, workarounds, metrics, insights, and risks
  - Context from the challenge card (title, description, success criteria)
  - Structured format for documenting findings
**And** the prompt can be copied, exported, or saved

### Scenario 9: Generate Step 2 (Diagnose) One-Slide Summary
**Given** a challenge card exists in a workshop  
**When** a facilitator selects the challenge card  
**And** they click "Generate One-Slide Summary" for Step 2: Diagnose  
**Then** a concise one-slide summary is generated that includes:
  - Chosen pain point
  - Root cause analysis findings
  - Key hypotheses tested
  - Validation results
**And** the summary can be exported as PDF or copied as markdown

### Scenario 10: Generate All Six Steps
**Given** a challenge card exists in a workshop  
**When** a facilitator selects the challenge card  
**And** they generate prompts or summaries for all six steps  
**Then** each step generates appropriate content based on its purpose  
**And** all generated content uses the challenge card context  
**And** users can export all content together or individually

### Scenario 11: Participant Access to Generated Content
**Given** a challenge card with generated prompts/summaries exists  
**When** a participant views the challenge card  
**Then** they can see and access the generated prompts/summaries (read-only)  
**And** they can copy or export the content  
**But** they cannot regenerate or modify the content

---

## Technical Implementation

### Frontend Components

```
client/src/components/challenges/
├── ChallengeCard.tsx           # Display component for single card
├── ChallengeCardDetail.tsx     # Expanded detail view with six-step process
├── ChallengeManager.tsx        # Main management interface (CRUD)
├── ChallengeForm.tsx           # Create/Edit form component
├── ChallengeCardList.tsx       # Grid/list view of all cards
├── ChallengeCardPreview.tsx    # Preview component
├── StepGenerator.tsx           # Component for generating step prompts/summaries
├── StepPromptView.tsx          # Display generated prompt
├── StepSummaryView.tsx         # Display one-slide summary
└── index.ts                     # Barrel exports
```

**Component Details:**

**ChallengeCard.tsx:**
- Displays single challenge card
- Shows title, challenge description, success criteria
- Edit/Delete buttons (for facilitators/admins only)
- Click handler to open detail view
- Responsive card design matching existing patterns
- Dark/light theme support

**ChallengeCardDetail.tsx:**
- Expanded view when challenge card is selected
- Displays full challenge card information
- Six-step process section with expandable/collapsible steps
- Each step shows:
  - Step title and description
  - "Generate Prompt" button
  - "Generate One-Slide Summary" button
  - Generated content display area (when available)
- Export and copy functionality
- Close/back button to return to card list

**StepGenerator.tsx:**
- Handles generation of prompts and summaries for each step
- Manages loading states during generation
- Displays generated content in appropriate format
- Provides export options (text, markdown, PDF)
- Copy to clipboard functionality
- Regenerate option

**ChallengeManager.tsx:**
- Main container component
- Lists all challenge cards for a workshop
- "Create New" button
- Drag-and-drop reordering
- Integration with WorkshopDetail page

**ChallengeForm.tsx:**
- Modal or inline form
- Title input
- Rich text editor for challenge description
- Dynamic success criteria list (add/remove items)
- Form validation
- Save/Cancel actions

### Backend Endpoints

```python
# Challenge Card CRUD Operations
POST /api/workshops/{workshop_id}/challenges
Request: {
  "title": "Challenge card 1",
  "challenge_description": "Detailed problem description...",
  "success_criteria": [
    "Criterion 1",
    "Criterion 2",
    "Criterion 3"
  ],
  "display_order": 0
}
Response: {
  "id": "uuid",
  "workshop_id": "uuid",
  "title": "Challenge card 1",
  "challenge_description": "...",
  "success_criteria": [...],
  "display_order": 0,
  "created_by": "uuid",
  "created_at": "2026-01-25T...",
  "updated_at": "2026-01-25T..."
}

GET /api/workshops/{workshop_id}/challenges
Response: [
  {
    "id": "uuid",
    "title": "...",
    "challenge_description": "...",
    "success_criteria": [...],
    "display_order": 0,
    "created_by": {...},
    "created_at": "...",
    "updated_at": "..."
  },
  ...
]

GET /api/challenges/{challenge_id}
Response: {
  "id": "uuid",
  "workshop_id": "uuid",
  "title": "...",
  "challenge_description": "...",
  "success_criteria": [...],
  "display_order": 0,
  "created_by": {...},
  "created_at": "...",
  "updated_at": "..."
}

PUT /api/challenges/{challenge_id}
Request: {
  "title": "Updated title",
  "challenge_description": "Updated description...",
  "success_criteria": [...],
  "display_order": 1
}
Response: {
  "id": "uuid",
  ...
}

DELETE /api/challenges/{challenge_id}
Response: {
  "message": "Challenge card deleted successfully"
}

PATCH /api/challenges/{challenge_id}/reorder
Request: {
  "display_order": 2
}
Response: {
  "id": "uuid",
  "display_order": 2,
  ...
}

# Six-Step Process Generation Endpoints
POST /api/challenges/{challenge_id}/steps/{step_number}/generate-prompt
Request: {
  "include_workshop_context": true,  # Optional: include workshop and use case data
  "include_previous_steps": false    # Optional: include context from previous steps
}
Response: {
  "step_number": 1,
  "step_name": "Widen",
  "prompt": "Based on the challenge 'Ticket Analysis Across Service Queues'...",
  "generated_at": "2026-01-25T...",
  "format": "text"
}

POST /api/challenges/{challenge_id}/steps/{step_number}/generate-summary
Request: {
  "include_workshop_context": true,
  "include_previous_steps": false,
  "format": "markdown"  # or "pdf"
}
Response: {
  "step_number": 1,
  "step_name": "Widen",
  "summary": "# Widen Summary\n\n## Key Personas\n...",
  "generated_at": "2026-01-25T...",
  "format": "markdown"
}

GET /api/challenges/{challenge_id}/steps/{step_number}/prompt
Response: {
  "step_number": 1,
  "step_name": "Widen",
  "prompt": "...",
  "generated_at": "...",
  "format": "text"
}

GET /api/challenges/{challenge_id}/steps/{step_number}/summary
Response: {
  "step_number": 1,
  "step_name": "Widen",
  "summary": "...",
  "generated_at": "...",
  "format": "markdown"
}

POST /api/challenges/{challenge_id}/steps/generate-all
Request: {
  "type": "prompt",  # or "summary"
  "include_workshop_context": true,
  "steps": [1, 2, 3, 4, 5, 6]  # Optional: specify which steps to generate
}
Response: {
  "challenge_id": "uuid",
  "generated_steps": [
    {
      "step_number": 1,
      "step_name": "Widen",
      "content": "...",
      "format": "text"
    },
    ...
  ],
  "generated_at": "2026-01-25T..."
}
```

### Database Schema

```sql
-- Challenge Cards Table
CREATE TABLE challenge_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  challenge_description TEXT NOT NULL,
  success_criteria JSONB NOT NULL DEFAULT '[]',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT challenge_cards_title_length CHECK (char_length(title) <= 100),
  CONSTRAINT challenge_cards_description_length CHECK (char_length(challenge_description) <= 2000),
  CONSTRAINT challenge_cards_success_criteria_array CHECK (jsonb_typeof(success_criteria) = 'array')
);

-- Indexes
CREATE INDEX ix_challenge_cards_workshop_id ON challenge_cards(workshop_id);
CREATE INDEX ix_challenge_cards_created_by ON challenge_cards(created_by);
CREATE INDEX ix_challenge_cards_display_order ON challenge_cards(workshop_id, display_order);

-- Updated timestamp trigger
CREATE TRIGGER update_challenge_cards_updated_at
  BEFORE UPDATE ON challenge_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Backend Models

```python
# server/app/models/challenge.py
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID

class ChallengeCard(Base):
    """
    Challenge cards define high-value business/technology problems
    with success criteria for AI-led transformation.
    """
    __tablename__ = "challenge_cards"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    challenge_description = Column(Text, nullable=False)
    success_criteria = Column(JSONB, nullable=False, default=list)
    display_order = Column(Integer, nullable=False, default=0)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workshop = relationship("Workshop", back_populates="challenge_cards")
    creator = relationship("User", foreign_keys=[created_by])
```

### Backend Schemas

```python
# server/app/schemas/challenge.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class SuccessCriteriaInput(BaseModel):
    """Individual success criterion input"""
    criterion: str = Field(..., max_length=500)

class ChallengeCardCreate(BaseModel):
    """Schema for creating a challenge card"""
    title: str = Field(..., max_length=100)
    challenge_description: str = Field(..., max_length=2000)
    success_criteria: List[str] = Field(..., min_items=1, max_items=10)
    display_order: int = Field(default=0, ge=0)
    
    @validator('success_criteria')
    def validate_success_criteria(cls, v):
        if not v:
            raise ValueError('At least one success criterion is required')
        if len(v) > 10:
            raise ValueError('Maximum 10 success criteria allowed')
        for criterion in v:
            if len(criterion) > 500:
                raise ValueError('Each success criterion must be 500 characters or less')
        return v

class ChallengeCardUpdate(BaseModel):
    """Schema for updating a challenge card"""
    title: Optional[str] = Field(None, max_length=100)
    challenge_description: Optional[str] = Field(None, max_length=2000)
    success_criteria: Optional[List[str]] = Field(None, min_items=1, max_items=10)
    display_order: Optional[int] = Field(None, ge=0)

class ChallengeCardResponse(BaseModel):
    """Schema for challenge card response"""
    id: UUID
    workshop_id: UUID
    title: str
    challenge_description: str
    success_criteria: List[str]
    display_order: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ChallengeCardReorder(BaseModel):
    """Schema for reordering challenge cards"""
    display_order: int = Field(..., ge=0)
```

### Backend API Implementation

```python
# server/app/api/challenge.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.core.database import get_db
from app.middleware.auth_guards import require_facilitator, require_admin
from app.middleware.rbac import WorkshopAccessChecker
from app.models.challenge import ChallengeCard
from app.models.models import Workshop
from app.schemas.challenge import (
    ChallengeCardCreate,
    ChallengeCardUpdate,
    ChallengeCardResponse,
    ChallengeCardReorder
)

router = APIRouter(prefix="/api/challenges", tags=["challenges"])

@router.post("/workshops/{workshop_id}/challenges", response_model=ChallengeCardResponse)
async def create_challenge_card(
    workshop_id: UUID,
    challenge_data: ChallengeCardCreate,
    current_user = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(WorkshopAccessChecker(workshop_id_param="workshop_id"))
):
    """Create a new challenge card for a workshop"""
    # Verify workshop exists
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    # Create challenge card
    challenge_card = ChallengeCard(
        workshop_id=workshop_id,
        title=challenge_data.title,
        challenge_description=challenge_data.challenge_description,
        success_criteria=challenge_data.success_criteria,
        display_order=challenge_data.display_order,
        created_by=current_user.id
    )
    
    db.add(challenge_card)
    await db.commit()
    await db.refresh(challenge_card)
    
    return challenge_card

@router.get("/workshops/{workshop_id}/challenges", response_model=List[ChallengeCardResponse])
async def list_challenge_cards(
    workshop_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """List all challenge cards for a workshop"""
    result = await db.execute(
        select(ChallengeCard)
        .where(ChallengeCard.workshop_id == workshop_id)
        .order_by(ChallengeCard.display_order, ChallengeCard.created_at)
    )
    challenge_cards = result.scalars().all()
    return challenge_cards

@router.get("/{challenge_id}", response_model=ChallengeCardResponse)
async def get_challenge_card(
    challenge_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a single challenge card by ID"""
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    return challenge_card

@router.put("/{challenge_id}", response_model=ChallengeCardResponse)
async def update_challenge_card(
    challenge_id: UUID,
    challenge_data: ChallengeCardUpdate,
    current_user = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Update a challenge card"""
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Check access: must be creator, workshop owner, or admin
    if (challenge_card.created_by != current_user.id and 
        challenge_card.workshop.facilitator_id != current_user.id and
        not current_user.is_admin_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this challenge card"
        )
    
    # Update fields
    update_data = challenge_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(challenge_card, field, value)
    
    await db.commit()
    await db.refresh(challenge_card)
    return challenge_card

@router.delete("/{challenge_id}")
async def delete_challenge_card(
    challenge_id: UUID,
    current_user = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Delete a challenge card"""
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Check access: must be creator, workshop owner, or admin
    if (challenge_card.created_by != current_user.id and 
        challenge_card.workshop.facilitator_id != current_user.id and
        not current_user.is_admin_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this challenge card"
        )
    
    await db.delete(challenge_card)
    await db.commit()
    return {"message": "Challenge card deleted successfully"}

@router.patch("/{challenge_id}/reorder", response_model=ChallengeCardResponse)
async def reorder_challenge_card(
    challenge_id: UUID,
    reorder_data: ChallengeCardReorder,
    current_user = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Update the display order of a challenge card"""
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Check access
    if (challenge_card.workshop.facilitator_id != current_user.id and
        not current_user.is_admin_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to reorder challenge cards"
        )
    
    challenge_card.display_order = reorder_data.display_order
    await db.commit()
    await db.refresh(challenge_card)
    return challenge_card

# Six-Step Process Generation Endpoints
@router.post("/{challenge_id}/steps/{step_number}/generate-prompt")
async def generate_step_prompt(
    challenge_id: UUID,
    step_number: int,
    request_data: dict,
    current_user = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Generate a prompt for a specific step of the six-step process"""
    from app.services.challenge_step_service import ChallengeStepService
    
    # Validate step number
    if step_number < 1 or step_number > 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Step number must be between 1 and 6"
        )
    
    # Get challenge card
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Generate prompt
    service = ChallengeStepService(db)
    prompt = await service.generate_step_prompt(
        challenge_card=challenge_card,
        step_number=step_number,
        include_workshop_context=request_data.get("include_workshop_context", False),
        include_previous_steps=request_data.get("include_previous_steps", False)
    )
    
    return {
        "step_number": step_number,
        "step_name": service.get_step_name(step_number),
        "prompt": prompt,
        "generated_at": datetime.utcnow(),
        "format": "text"
    }

@router.post("/{challenge_id}/steps/{step_number}/generate-summary")
async def generate_step_summary(
    challenge_id: UUID,
    step_number: int,
    request_data: dict,
    current_user = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Generate a one-slide summary for a specific step"""
    from app.services.challenge_step_service import ChallengeStepService
    
    # Validate step number
    if step_number < 1 or step_number > 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Step number must be between 1 and 6"
        )
    
    # Get challenge card
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Generate summary
    service = ChallengeStepService(db)
    summary_format = request_data.get("format", "markdown")
    summary = await service.generate_step_summary(
        challenge_card=challenge_card,
        step_number=step_number,
        include_workshop_context=request_data.get("include_workshop_context", False),
        include_previous_steps=request_data.get("include_previous_steps", False),
        format=summary_format
    )
    
    return {
        "step_number": step_number,
        "step_name": service.get_step_name(step_number),
        "summary": summary,
        "generated_at": datetime.utcnow(),
        "format": summary_format
    }

@router.post("/{challenge_id}/steps/generate-all")
async def generate_all_steps(
    challenge_id: UUID,
    request_data: dict,
    current_user = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Generate prompts or summaries for multiple steps at once"""
    from app.services.challenge_step_service import ChallengeStepService
    
    # Get challenge card
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Generate content for specified steps
    service = ChallengeStepService(db)
    content_type = request_data.get("type", "prompt")  # "prompt" or "summary"
    steps_to_generate = request_data.get("steps", [1, 2, 3, 4, 5, 6])
    
    generated_steps = []
    for step_number in steps_to_generate:
        if step_number < 1 or step_number > 6:
            continue
        
        if content_type == "prompt":
            content = await service.generate_step_prompt(
                challenge_card=challenge_card,
                step_number=step_number,
                include_workshop_context=request_data.get("include_workshop_context", False),
                include_previous_steps=True  # Include previous steps when generating all
            )
            format_type = "text"
        else:
            content = await service.generate_step_summary(
                challenge_card=challenge_card,
                step_number=step_number,
                include_workshop_context=request_data.get("include_workshop_context", False),
                include_previous_steps=True,
                format=request_data.get("format", "markdown")
            )
            format_type = request_data.get("format", "markdown")
        
        generated_steps.append({
            "step_number": step_number,
            "step_name": service.get_step_name(step_number),
            "content": content,
            "format": format_type
        })
    
    return {
        "challenge_id": str(challenge_id),
        "generated_steps": generated_steps,
        "generated_at": datetime.utcnow()
    }
```

### Challenge Step Service

```python
# server/app/services/challenge_step_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.challenge import ChallengeCard
from typing import Optional, Dict, List
import json

class ChallengeStepService:
    """Service for generating prompts and summaries for the six-step process"""
    
    STEP_DEFINITIONS = {
        1: {
            "name": "Widen",
            "description": "Rapidly surface personas, pains, workarounds, metrics, insights, risks related to the challenge",
            "prompt_template": """
# Step 1: Widen - Discovery and Context Building

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
Please structure your findings using the sections above, providing specific, actionable information for each category.
            """,
            "summary_template": """
# Step 1: Widen - Discovery Summary

## Challenge: {title}

### Key Personas
{personas_summary}

### Top Pain Points
{pains_summary}

### Critical Metrics
{metrics_summary}

### Primary Risks
{risks_summary}
            """
        },
        2: {
            "name": "Diagnose",
            "description": "Drill into chosen pain using five Whys, hypotheses, disproof evidence, and quick tests for validation",
            "prompt_template": """
# Step 2: Diagnose - Root Cause Analysis

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
Document your diagnostic process, findings, and validated root cause using the structure above.
            """,
            "summary_template": """
# Step 2: Diagnose - Root Cause Analysis Summary

## Challenge: {title}

### Chosen Pain Point
{pain_point}

### Root Cause (Five Whys)
{root_cause}

### Key Hypotheses Tested
{hypotheses}

### Validation Results
{validation_results}
            """
        },
        3: {
            "name": "Converge",
            "description": "Cluster ideas into three options, score impact and do-ability, recommend one with metrics for leadership",
            "prompt_template": """
# Step 3: Converge - Solution Evaluation and Selection

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
Present your three options, scores, recommendation, and supporting metrics in a format suitable for leadership review.
            """,
            "summary_template": """
# Step 3: Converge - Solution Selection Summary

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
{metrics}
            """
        },
        4: {
            "name": "Brief",
            "description": "Create one-page brief with users, problem, flow, screens, sample copy, and data, enabling rapid prototyping",
            "prompt_template": """
# Step 4: Brief - Prototype Specification

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
Create a concise one-page brief covering all elements above, formatted for easy reference during prototyping.
            """,
            "summary_template": """
# Step 4: Brief - Prototype Specification Summary

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
{data_summary}
            """
        },
        5: {
            "name": "Build",
            "description": "Generate platform-specific builder prompt from brief, including flows, components, data, metrics, constraints for first-cut prototype creation",
            "prompt_template": """
# Step 5: Build - Prototype Implementation Guide

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
Create a detailed builder prompt that a developer or AI can use to build the prototype, including all technical specifications and requirements.
            """,
            "summary_template": """
# Step 5: Build - Implementation Summary

## Challenge: {title}

### Architecture Overview
{architecture}

### Key Components
{components}

### Data Flow
{data_flow}

### Implementation Constraints
{constraints}
            """
        },
        6: {
            "name": "Share-back",
            "description": "Generate a 2-3 min executive sales pitch style storyline highlighting what has been done so far and what's next",
            "prompt_template": """
# Step 6: Share-back - Executive Summary

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
Create a compelling narrative suitable for a 2-3 minute executive presentation, highlighting progress, value, and next steps.
            """,
            "summary_template": """
# Step 6: Share-back - Executive Summary

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
{business_impact}
            """
        }
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
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
        context = {
            "title": challenge_card.title,
            "description": challenge_card.challenge_description,
            "success_criteria": "\n".join([f"- {c}" for c in challenge_card.success_criteria])
        }
        
        # Add workshop context if requested
        if include_workshop_context:
            # Fetch workshop and related data
            # This would include use cases, participant data, etc.
            pass
        
        # Add previous steps context if requested
        if include_previous_steps:
            # Include context from previous steps
            pass
        
        # Generate prompt using template
        prompt = step_def["prompt_template"].format(**context)
        
        return prompt
    
    async def generate_step_summary(
        self,
        challenge_card: ChallengeCard,
        step_number: int,
        include_workshop_context: bool = False,
        include_previous_steps: bool = False,
        format: str = "markdown"
    ) -> str:
        """Generate a one-slide summary for a specific step"""
        step_def = self.STEP_DEFINITIONS.get(step_number)
        if not step_def:
            raise ValueError(f"Invalid step number: {step_number}")
        
        # Prepare context (this would be populated with actual data)
        context = {
            "title": challenge_card.title,
            # Additional context would be filled based on step-specific requirements
        }
        
        # Generate summary using template
        summary = step_def["summary_template"].format(**context)
        
        return summary
```

### Frontend Integration

**WorkshopDetail.tsx Integration:**
- Add "Challenge Cards" tab/section
- Display ChallengeManager component
- Show challenge cards alongside use cases
- Conditional rendering based on user role

**Example Integration:**
```tsx
// In WorkshopDetail.tsx
import { ChallengeManager } from '../components/challenges';

// Add to render:
{isFacilitatorOrAdmin && (
  <div className="mt-6">
    <h3 className="text-xl font-bold mb-4">Challenge Cards</h3>
    <ChallengeManager workshopId={id} />
  </div>
)}
```

---

## Dependencies

- **US01:** Workshop Initialization (workshops must exist before creating challenge cards)
- **US30:** User Roles & Access Control (facilitator/admin permissions required)
- **US06:** Workshop Access Control (workshop access validation)

---

## Testing Requirements

### Unit Tests

**Backend:**
- Challenge card creation validation
- Success criteria validation (min/max items, character limits)
- Access control checks (facilitator/admin only)
- Display order updates
- Database constraints

**Frontend:**
- Form validation
- Success criteria add/remove functionality
- Card display rendering
- Access control UI (show/hide edit buttons)
- Step generation UI components
- Export and copy functionality

**Step Generation:**
- Prompt generation for all six steps
- Summary generation for all six steps
- Template formatting and context injection
- Export format validation (text, markdown, PDF)

### Integration Tests

- End-to-end challenge card creation flow
- Challenge card CRUD operations
- Workshop access control integration
- Participant read-only access
- Step prompt generation flow
- Step summary generation flow
- Batch step generation (all steps at once)
- Export functionality (text, markdown, PDF)

### UI Tests

- Challenge card form interaction
- Drag-and-drop reordering
- Challenge card detail view expansion
- Six-step process UI interaction
- Step generation button clicks
- Generated content display
- Export and copy functionality
- Responsive design on mobile devices
- Dark/light theme support

---

## Future Enhancements

- **AI-Enhanced Generation:** Use AI/LLM to enhance generated prompts and summaries with contextual insights
- **Step Progress Tracking:** Track completion status of each step and store generated content
- **Collaborative Step Completion:** Allow multiple team members to contribute to step completion
- **Step Templates:** Customizable templates for each step's prompt/summary generation
- **Challenge Templates:** Pre-built challenge cards for common business problems
- **Challenge-Use Case Linking:** Link use cases to specific challenge cards and steps
- **Challenge Analytics:** Track which challenges generate the most use cases and step completions
- **Export Challenge Cards:** Export challenge cards with all generated steps as PDF or Word documents
- **Challenge Card Sharing:** Share challenge cards and generated content across workshops
- **Rich Text Editor:** Enhanced formatting options for challenge descriptions
- **Challenge Card Comments:** Allow participants to comment on challenge cards and steps
- **Step Validation:** Add validation and quality checks for generated prompts/summaries

---

## UI/UX Mockup Notes

- **Card Design:** Match existing card patterns (ScoringCard, BadgeCard)
- **Color Scheme:** Use workshop theme colors
- **Typography:** Clear hierarchy (title > description > criteria)
- **Spacing:** Generous padding for readability
- **Icons:** Use appropriate icons for challenge/problem theme
- **Responsive:** Mobile-friendly card layout
- **Accessibility:** Keyboard navigation, screen reader support

---

## Security Considerations

- Input sanitization for all text fields
- XSS prevention in challenge descriptions
- Rate limiting on challenge card creation
- Workshop access validation on all endpoints
- Audit logging for challenge card changes (future)

---

## Performance Considerations

- Lazy load challenge cards when section is viewed
- Pagination for workshops with many challenge cards (future)
- Optimistic UI updates for better UX
- Client-side caching of challenge cards

---

## Related User Stories

- **US03:** Digital Use Case Canvas (use cases can reference challenge cards)
- **US16:** AI Copilot Assistant (AI can suggest challenges based on context)
- **US17:** ROI Calculator (challenges can inform ROI calculations)
- **US22:** Workshop Templates (templates can include challenge cards)

---

## Definition of Done

- [ ] Challenge card database model created
- [ ] Challenge card API endpoints implemented
- [ ] Challenge card frontend components created
- [ ] Challenge card integration in WorkshopDetail page
- [ ] Challenge card detail view with six-step process implemented
- [ ] Step generation service implemented (all six steps)
- [ ] Prompt generation endpoints implemented
- [ ] One-slide summary generation endpoints implemented
- [ ] Step generator UI components created
- [ ] Export functionality (text, markdown, PDF) implemented
- [ ] Copy to clipboard functionality implemented
- [ ] Access control implemented (facilitator/admin only)
- [ ] Participant read-only view implemented (including generated content)
- [ ] Form validation (client and server side)
- [ ] Success criteria dynamic list functionality
- [ ] Display order/reordering functionality
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing (including step generation)
- [ ] UI tests passing
- [ ] Documentation complete
- [ ] Code review completed
- [ ] Demo to stakeholders completed
