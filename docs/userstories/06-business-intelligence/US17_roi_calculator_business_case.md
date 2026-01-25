# US17: AI ROI Calculator & Business Case Generator

**Epic:** AI Hotspot Flow - Business Value Backlog  
**Module:** Financial Analysis & Business Planning  
**Story Type:** Feature  
**Story Points:** 21  
**Status:** 📋 BACKLOG - Future Feature  
**Target Sprint:** Phase 3 (Q2-Q3 2026)

---

## User Story

**As a** Workshop Facilitator or Business Stakeholder,  
**I want** an AI-powered ROI calculator and business case generator for prioritized use cases,  
**So that** I can quickly build compelling investment justifications and accelerate decision-making.

---

## Description

Transform workshop outputs into actionable business cases. This feature enables:

1. **ROI Calculation:** Automated cost-benefit analysis for each use case
2. **Business Case Generation:** AI-generated investment proposals
3. **Comparison Analysis:** Side-by-side use case comparisons
4. **Scenario Modeling:** What-if analysis for different implementation approaches
5. **Executive Presentations:** Auto-generated pitch decks

---

## Requirements

### Functional Requirements

#### 1. ROI Calculator Interface

**Input Parameters:**

**Cost Inputs:**
| Parameter | Description | Default |
|-----------|-------------|---------|
| Implementation Cost | One-time development/setup costs | - |
| Infrastructure Cost | Cloud/hardware costs (monthly) | - |
| Licensing Cost | Software/API licenses (annual) | - |
| Training Cost | Employee training and change management | - |
| Maintenance Cost | Ongoing support (% of implementation) | 15% |
| FTE Cost | Full-time equivalent labor cost | $120K/year |

**Benefit Inputs:**
| Parameter | Description | Default |
|-----------|-------------|---------|
| Time Savings | Hours saved per week | - |
| Error Reduction | Percentage error reduction | - |
| Revenue Impact | Additional revenue potential | - |
| Cost Avoidance | Prevented costs | - |
| Productivity Gain | Percentage productivity increase | - |
| Customer Satisfaction | NPS improvement points | - |

**AI-Assisted Estimation:**
- Auto-suggest costs based on use case type
- Industry benchmarks for similar implementations
- Historical data from past workshops (if available)
- Confidence intervals for estimates

#### 2. ROI Calculations

**Core Metrics:**
- **Net Present Value (NPV):** Discounted cash flows over project lifetime
- **Return on Investment (ROI):** (Benefits - Costs) / Costs × 100
- **Payback Period:** Months until investment recovered
- **Internal Rate of Return (IRR):** Discount rate where NPV = 0
- **Total Cost of Ownership (TCO):** All costs over 3-5 years

**Calculation Formula:**
```
Annual Benefits = (Time Savings × Hourly Rate) + Revenue Impact + Cost Avoidance
Annual Costs = Infrastructure + Licensing + Maintenance
Year 1 Total = Implementation + Training + Year 1 Costs
ROI = ((Total Benefits - Total Costs) / Total Costs) × 100
Payback = Total Investment / Monthly Net Benefit
```

**Visualization:**
- ROI timeline chart (cumulative)
- Cost breakdown pie chart
- Benefit breakdown bar chart
- Break-even point visualization
- Sensitivity analysis tornado diagram

#### 3. Business Case Generator

**Business Case Sections:**
1. **Executive Summary:** AI-generated overview
2. **Problem Statement:** From use case description
3. **Proposed Solution:** Technical and business approach
4. **Financial Analysis:** ROI, NPV, payback
5. **Risk Assessment:** Identified risks and mitigations
6. **Implementation Timeline:** Phased approach
7. **Resource Requirements:** Team, skills, tools
8. **Success Metrics:** KPIs and measurement plan
9. **Recommendation:** Go/No-Go with rationale

**AI Generation Features:**
- Extract problem statement from use case
- Suggest technical approach based on RAG knowledge
- Generate risk matrix from feasibility scores
- Create timeline from complexity assessment
- Propose team composition based on skills needed

**Customization:**
- Editable sections
- Custom branding (logo, colors)
- Template selection (formal, startup, consulting)
- Tone adjustment (technical, business, executive)

#### 4. Scenario Modeling

**What-If Analysis:**
- Adjust any input parameter
- See real-time impact on ROI
- Compare multiple scenarios side-by-side
- Best/worst/expected case scenarios

**Sensitivity Analysis:**
- Which variables most impact ROI?
- Tornado diagram visualization
- Break-even thresholds for each variable
- Risk quantification

**Scenario Templates:**
- **Conservative:** 50% of estimated benefits
- **Expected:** Baseline estimates
- **Optimistic:** 150% of estimated benefits
- **Phased Rollout:** Gradual implementation
- **Full Deployment:** Complete implementation

#### 5. Comparison Dashboard

**Multi-Use Case Comparison:**
- Compare up to 5 use cases simultaneously
- Side-by-side metric comparison
- Ranking by ROI, NPV, payback
- Portfolio optimization view

**Comparison Metrics:**
| Use Case | ROI | NPV | Payback | Risk | Priority |
|----------|-----|-----|---------|------|----------|
| Case A   | 250%| $1.2M| 8 mo  | Low  | High     |
| Case B   | 180%| $800K| 14 mo | Med  | Medium   |
| Case C   | 320%| $500K| 6 mo  | High | Medium   |

**Portfolio View:**
- Bubble chart (ROI vs Investment size vs Risk)
- Efficient frontier analysis
- Resource allocation optimization
- Dependency mapping

#### 6. Executive Presentation Generator

**Auto-Generated Slides:**
1. Title slide with use case name
2. Problem/Opportunity statement
3. Proposed AI solution
4. Financial summary (ROI, payback)
5. Implementation roadmap
6. Risk and mitigation
7. Team and resources
8. Next steps and ask

**Export Formats:**
- PowerPoint (.pptx)
- Google Slides
- PDF
- Keynote
- Web presentation (shareable link)

**Design Options:**
- Template selection
- Color scheme
- Logo placement
- Chart styles

---

## Acceptance Criteria

### Scenario 1: ROI Calculation
**Given** a use case "AI Invoice Processing" is selected  
**When** the facilitator enters:
  - Implementation cost: $150,000
  - Monthly infrastructure: $2,000
  - Time savings: 40 hours/week at $50/hour  
**Then** the system calculates:
  - Annual benefit: $104,000
  - Annual cost: $24,000
  - ROI: 233%
  - Payback: 22 months

### Scenario 2: AI-Assisted Estimation
**Given** a use case type "Customer Service Chatbot"  
**When** the facilitator clicks "Auto-Estimate"  
**Then** the system suggests:
  - Implementation: $80,000 - $150,000 (based on complexity)
  - Infrastructure: $500 - $2,000/month
  - Expected time savings: 20-40 hours/week
  - Source: Industry benchmarks displayed

### Scenario 3: Business Case Generation
**Given** a use case with completed ROI analysis  
**When** the facilitator clicks "Generate Business Case"  
**Then** the system produces:
  - 8-10 page business case document
  - All sections populated with relevant content
  - Financial tables and charts embedded
  - Editable in Google Docs/Word format

### Scenario 4: Scenario Comparison
**Given** a use case with baseline ROI of 200%  
**When** the facilitator runs sensitivity analysis  
**Then** the system shows:
  - Impact of ±20% on each variable
  - Tornado diagram ranking variable impact
  - Break-even values for key inputs
  - Best/worst case ROI range

### Scenario 5: Executive Presentation
**Given** a prioritized use case portfolio  
**When** the facilitator clicks "Generate Presentation"  
**Then** the system creates:
  - 8-slide PowerPoint deck
  - Professional design with charts
  - Editable text and graphics
  - Speaker notes included

---

## Technical Implementation

### Frontend Components

```
src/components/roi/
├── ROICalculator.tsx           # Main calculator interface
├── CostInputForm.tsx           # Cost parameter inputs
├── BenefitInputForm.tsx        # Benefit parameter inputs
├── ROIResults.tsx              # Calculated results display
├── ROIChart.tsx                # Timeline and charts
├── SensitivityAnalysis.tsx     # Tornado diagram
├── ScenarioModeler.tsx         # What-if analysis
├── ComparisonDashboard.tsx     # Multi-use case comparison
├── BusinessCaseGenerator.tsx   # Business case UI
├── BusinessCasePreview.tsx     # Document preview
├── PresentationGenerator.tsx   # Slide deck generator
├── BenchmarkPanel.tsx          # Industry benchmarks
└── ExportOptions.tsx           # Export format selection
```

### Backend Endpoints

```typescript
// ROI Calculation
POST /api/roi/calculate
Request: {
  use_case_id: UUID,
  costs: {
    implementation, infrastructure, licensing, training, maintenance_rate
  },
  benefits: {
    time_savings_hours, hourly_rate, error_reduction_pct,
    revenue_impact, cost_avoidance, productivity_gain_pct
  },
  parameters: {
    discount_rate, project_years, inflation_rate
  }
}
Response: {
  roi_percent, npv, irr, payback_months, tco,
  annual_breakdown: [...],
  charts_data: { timeline, cost_breakdown, benefit_breakdown }
}

// AI-Assisted Estimation
POST /api/roi/estimate
Request: {
  use_case_id: UUID,
  use_case_type: string,
  industry: string,
  company_size: string
}
Response: {
  estimates: {
    implementation: { low, mid, high, confidence },
    infrastructure: { low, mid, high },
    time_savings: { low, mid, high }
  },
  benchmarks: [{ source, metric, value }],
  similar_cases: [{ name, roi, industry }]
}

// Business Case Generation
POST /api/business-case/generate
Request: {
  use_case_id: UUID,
  roi_data: {...},
  template: "formal" | "startup" | "consulting",
  sections: ["executive_summary", "financials", "risks", ...],
  branding: { logo_url, colors }
}
Response: {
  document_id: UUID,
  preview_url: string,
  download_urls: { docx, pdf, gdocs }
}

// Scenario Analysis
POST /api/roi/scenarios
Request: {
  use_case_id: UUID,
  base_case: {...},
  scenarios: [
    { name, adjustments: { variable, multiplier } }
  ]
}
Response: {
  scenarios: [
    { name, roi, npv, payback, comparison_to_base }
  ],
  sensitivity: {
    variables: [{ name, impact_score, break_even }]
  }
}

// Portfolio Comparison
GET /api/roi/compare?use_case_ids=uuid1,uuid2,uuid3
Response: {
  comparison: [
    { use_case_id, name, roi, npv, payback, risk, rank }
  ],
  portfolio_metrics: {
    total_investment, total_npv, avg_roi, risk_profile
  },
  charts_data: { bubble_chart, efficient_frontier }
}

// Presentation Generation
POST /api/presentations/generate
Request: {
  use_case_ids: [UUID],
  template: "executive" | "technical" | "sales",
  format: "pptx" | "pdf" | "gslides",
  options: { include_speaker_notes, chart_style }
}
Response: {
  presentation_id: UUID,
  download_url: string,
  preview_url: string
}
```

### AI/ML Components

```python
class ROIEngine:
    def __init__(self):
        self.llm = OpenAI(model="gpt-4o")
        self.benchmark_db = BenchmarkDatabase()
    
    async def estimate_costs(self, use_case: UseCase) -> CostEstimate:
        """AI-powered cost estimation using industry benchmarks."""
        similar_cases = await self.benchmark_db.find_similar(use_case)
        return self.calculate_estimates(similar_cases)
    
    async def generate_business_case(
        self, use_case: UseCase, roi_data: ROIData
    ) -> BusinessCase:
        """Generate comprehensive business case document."""
        pass
    
    async def assess_risks(self, use_case: UseCase) -> RiskAssessment:
        """AI-powered risk identification and mitigation."""
        pass
```

### Database Schema

```sql
-- ROI Calculations
CREATE TABLE roi_calculations (
  id UUID PRIMARY KEY,
  use_case_id UUID REFERENCES use_cases(id),
  workshop_id UUID REFERENCES workshops(id),
  costs JSONB,
  benefits JSONB,
  parameters JSONB,
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Business Cases
CREATE TABLE business_cases (
  id UUID PRIMARY KEY,
  use_case_id UUID REFERENCES use_cases(id),
  roi_calculation_id UUID REFERENCES roi_calculations(id),
  content JSONB,
  template VARCHAR(50),
  status VARCHAR(20),
  document_urls JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Industry Benchmarks
CREATE TABLE industry_benchmarks (
  id UUID PRIMARY KEY,
  use_case_type VARCHAR(100),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  metric_name VARCHAR(100),
  metric_value JSONB,
  source VARCHAR(255),
  year INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Generated Presentations
CREATE TABLE presentations (
  id UUID PRIMARY KEY,
  workshop_id UUID REFERENCES workshops(id),
  use_case_ids UUID[],
  template VARCHAR(50),
  format VARCHAR(20),
  file_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Dependencies

- US05: Interactive Hotspot Matrix (prioritized use cases)
- US03: Digital Use Case Canvas (use case data)
- US07: AI Intelligence & RAG (business case generation)
- Document generation library (docxtpl, python-pptx)
- Financial calculation library

---

## Testing Requirements

### Unit Tests
- ROI calculation accuracy
- NPV and IRR calculations
- Scenario comparison logic
- Benchmark matching algorithm

### Integration Tests
- End-to-end ROI workflow
- Business case generation
- Presentation export
- Multi-use case comparison

### Financial Accuracy Tests
- Verify calculations against Excel models
- Edge case handling (negative ROI, infinite payback)
- Rounding and currency handling

---

## Future Enhancements

- **Monte Carlo Simulation:** Probabilistic ROI analysis
- **Integration with ERP:** Pull actual cost data
- **Historical Tracking:** Compare projected vs actual ROI
- **Portfolio Optimization:** Constraint-based optimization
- **CFO Dashboard:** Executive financial overview

---

## Definition of Done

- [ ] ROI calculator with all metrics
- [ ] AI-assisted estimation
- [ ] Business case generator (all sections)
- [ ] Scenario modeling with sensitivity
- [ ] Multi-use case comparison
- [ ] Presentation generator (PPTX, PDF)
- [ ] Industry benchmarks database
- [ ] Export functionality
- [ ] Unit tests passing (>80% coverage)
- [ ] Financial accuracy verified
- [ ] Documentation complete
