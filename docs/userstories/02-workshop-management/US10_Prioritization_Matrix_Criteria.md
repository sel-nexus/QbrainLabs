# User Story: Use Case Prioritization Matrix Criteria

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Scoring & Prioritization  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 8  
**Status:** ✅ IMPLEMENTED  
**Implementation Date:** January 24, 2026

---

## Relationship to Other Stories

**US10 vs US01 (Workshop Initialization):**
- **US10** defines the comprehensive scoring criteria framework (7-point evaluation)
- **US01** creates workshops and may include basic criteria setup
- **Boundary:** US10 = "What criteria to use for scoring"; US01 = "Create the workshop container"
- **Relationship:** US10's criteria templates are selected/configured during US01's workshop creation
- **Dependency:** US10 criteria are used in US04 (Live Scoring) and US05 (Hotspot Matrix visualization)

**US10 vs US04 (Live Scoring Interface):**
- **US10** defines the criteria and scoring framework
- **US04** provides the interface for participants to score use cases using US10's criteria
- **Dependency:** US04 depends on US10 for criteria definitions

**US10 vs US05 (Interactive Hotspot Matrix):**
- **US10** defines how criteria map to matrix axes (Value vs Feasibility)
- **US05** visualizes use cases on the matrix based on US10's scoring framework
- **Dependency:** US05 uses US10's composite scoring logic to position use cases

---

### Implementation Summary
- ✅ 7-point comprehensive evaluation framework
- ✅ Slider/Likert scale input for all dimensions
- ✅ Tooltip descriptions for each criterion
- ✅ Composite scoring for Value vs Feasibility axes
- ✅ Hotspot Matrix visualization with quadrants
- ✅ Configurable criteria templates

---

**As a** Strategy Consultant or Workshop Facilitator,
**I want to** evaluate AI use cases using a standardized, multi-dimensional framework,
**So that** I can objectively identify the highest-value and most feasible opportunities for the organization.

## Acceptance Criteria

### 1. Standardized Criteria Definition
The system must support the evaluation of use cases based on the following seven key dimensions:

*   **Business Impact:**
    *   ROI estimates
    *   Cost savings (efficiency)
    *   Revenue growth potential
    *   Customer satisfaction improvement
*   **Ease of Implementation:**
    *   Technical feasibility
    *   Integration complexity
    *   Resource requirements (talent, infrastructure)
*   **Data Readiness:**
    *   Data availability
    *   Data quality and cleanliness
    *   Data governance and access
*   **Strategic Alignment:**
    *   Alignment with corporate strategy/goals
    *   Executive sponsorship and support
*   **Organizational Readiness:**
    *   Leadership buy-in
    *   Workforce adaptability and change management
*   **Risk & Compliance:**
    *   Regulatory and legal compliance
    *   Ethical considerations (bias, fairness)
    *   Security and privacy risks
*   **Scalability & Value:**
    *   Long-term impact durability
    *   Ability to scale across the enterprise

### 2. Evaluation Interface
*   **Input Mechanism:** Sliders or Likert scales (e.g., 1-5 or 1-10) for each of the 7 dimensions.
*   **Tooltips/Descriptions:** Each criterion must display its description (as listed above) to ensure consistent understanding among voters.

### 3. Aggregation & Mapping
*   **Composite Scoring:** The system should calculate composite scores for the Hotspot Matrix axes.
    *   *Proposed Mapping:*
        *   **Vertical Axis (Value/Impact):** Average of Business Impact, Strategic Alignment, Scalability & Value.
        *   **Horizontal Axis (Feasibility/Readiness):** Average of Ease of Implementation, Data Readiness, Organizational Readiness, and (inverse of) Risk & Compliance.

### 4. Configuration
*   **Template:** This set of criteria should be available as a "Comprehensive 7-Point" evaluation template when creating a new workshop.

## Scenarios

### Scenario A: Full Strategic Review
1.  Facilitator creates a new workshop for "Q1 AI Strategy".
2.  Selects the "Comprehensive 7-Point" criteria template.
3.  Participants submitting a use case (e.g., "Customer Service Chatbot") are prompted to rate it on all 7 dimensions.
4.  The system calculates the weighted score.

### Scenario B: Matrix Visualization
1.  After voting, the Facilitator views the Hotspot Matrix.
2.  Use cases are plotted based on the aggregated "Value" vs "Readiness" scores derived from the 7 detailed inputs.
3.  Clicking a node reveals the detailed breakdown (e.g., "High ROI, but Low Data Readiness").

## Technical Notes
*   **Data Model:** Ensure the `Criteria` schema is flexible enough to store these 7 definitions with their descriptions.
*   **UI:** The evaluation modal needs to accommodate 7 input fields without cluttering the screen (support accordion or steps if needed).
*   **Calculation Logic:** Define the formula for mapping these 7 fields to the 2D matrix coordinates (X, Y).
