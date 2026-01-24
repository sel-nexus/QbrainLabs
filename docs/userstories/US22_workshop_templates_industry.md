# US22: Workshop Templates & Industry Packages

**Epic:** AI Hotspot Flow - Content Library Backlog  
**Module:** Templates & Pre-Built Content  
**Story Type:** Feature  
**Story Points:** 13  
**Status:** 📋 BACKLOG - Future Feature  
**Target Sprint:** Phase 4 (Q4 2026)

---

## User Story

**As a** Workshop Facilitator,  
**I want** access to pre-built workshop templates and industry-specific content packages,  
**So that** I can quickly set up high-quality AI workshops tailored to specific industries and use cases.

---

## Description

Accelerate workshop preparation with ready-to-use templates. Features include:

1. **Workshop Templates:** Complete workshop configurations
2. **Industry Packages:** Vertical-specific content (Healthcare, Finance, Retail, etc.)
3. **Use Case Libraries:** Pre-populated AI use case examples
4. **Criteria Templates:** Industry-appropriate scoring criteria
5. **Template Marketplace:** Community-shared templates

---

## Requirements

### Functional Requirements

#### 1. Workshop Templates

**Template Categories:**
- **AI Strategy Workshop** (4-hour)
- **Innovation Sprint** (1-day)
- **Executive Briefing** (2-hour)
- **Technical Deep Dive** (half-day)
- **Change Readiness Assessment** (3-hour)
- **ROI Planning Session** (2-hour)

**Template Contents:**
- Pre-configured phases and timing
- Default scoring criteria
- Suggested agenda
- Facilitator guide
- Participant materials
- Sample use cases

#### 2. Industry Packages

**Available Industries:**
| Industry | Use Cases | Criteria | Templates |
|----------|-----------|----------|-----------|
| Healthcare | 25+ | Clinical, Regulatory | 4 |
| Financial Services | 30+ | Risk, Compliance | 5 |
| Retail & CPG | 20+ | Customer, Supply Chain | 3 |
| Manufacturing | 22+ | Operations, Quality | 4 |
| Technology | 28+ | Product, Engineering | 4 |
| Education | 15+ | Learning, Admin | 3 |
| Government | 18+ | Citizen, Efficiency | 3 |

**Package Contents:**
- Industry-specific use case library
- Tailored scoring criteria
- Relevant AI capability matrix
- Industry benchmarks
- Regulatory considerations
- Case studies and examples

#### 3. Use Case Library

**Library Features:**
- 200+ pre-built AI use cases
- Categorized by function and technology
- Detailed descriptions and KPIs
- Implementation complexity ratings
- Similar use case suggestions
- Import to workshop with one click

**Use Case Categories:**
- Customer Experience
- Operations & Efficiency
- Revenue & Growth
- Risk & Compliance
- Employee Experience
- Innovation & R&D

#### 4. Criteria Templates

**Pre-Built Criteria Sets:**
- **Standard 7-Point:** Comprehensive evaluation
- **Quick 3-Point:** Fast prioritization
- **Executive View:** Value-focused
- **Technical View:** Feasibility-focused
- **Risk-Adjusted:** Compliance-heavy industries
- **Innovation Focus:** R&D and exploration

#### 5. Template Marketplace

**Marketplace Features:**
- Browse community templates
- Rating and reviews
- Usage statistics
- Template previews
- One-click import
- Version history

**Sharing Options:**
- Public (marketplace)
- Organization only
- Invite-only sharing
- Commercial licensing

---

## Technical Implementation

### Endpoints

```typescript
GET /api/templates
GET /api/templates/:template_id
POST /api/templates/:template_id/use
GET /api/industry-packages
GET /api/industry-packages/:industry/use-cases
GET /api/use-case-library
POST /api/use-case-library/:case_id/import
GET /api/criteria-templates
GET /api/marketplace/templates
POST /api/marketplace/templates (publish)
```

### Database Schema

```sql
CREATE TABLE workshop_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(200),
  category VARCHAR(50),
  industry VARCHAR(50),
  description TEXT,
  config JSONB,
  phases JSONB,
  criteria JSONB,
  is_public BOOLEAN,
  author_id UUID,
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE industry_packages (
  id UUID PRIMARY KEY,
  industry VARCHAR(50),
  use_cases JSONB,
  criteria JSONB,
  benchmarks JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE use_case_library (
  id UUID PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  category VARCHAR(50),
  industry VARCHAR(50),
  ai_technology VARCHAR(50),
  complexity VARCHAR(20),
  kpis JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Acceptance Criteria

1. Facilitator can browse and preview templates
2. One-click workshop creation from template
3. Industry packages include relevant use cases
4. Use case library searchable and filterable
5. Templates customizable after import
6. Marketplace supports ratings and reviews

---

## Definition of Done

- [ ] 10+ workshop templates created
- [ ] 5+ industry packages with content
- [ ] 200+ use cases in library
- [ ] Template marketplace functional
- [ ] Search and filter capabilities
- [ ] Import/export functionality
- [ ] Rating and review system
- [ ] Unit tests (>80% coverage)
- [ ] Documentation complete
