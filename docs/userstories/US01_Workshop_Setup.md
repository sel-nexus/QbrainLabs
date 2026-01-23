# User Story: Workshop Creation & Configuration

**As a** Workshop Facilitator,
**I want to** create a new session and define the specific scoring criteria,
**So that** I can tailor the AI prioritization framework to my organization's unique strategic goals.

## Acceptance Criteria

### 1. Workshop Definition
* **Basic Info:** User must input:
    * **Title** (e.g., "Q1 AI Strategy")
    * **Department/Team** (e.g., "Marketing")
    * **Strategic Objective** (Text description for context)
* **Date/Time:** Option to schedule for later or start immediately.

### 2. Criteria Configuration
* **Standard Library:** Provide a pre-loaded list of common criteria:
    * *Feasibility:* Technical Complexity, Data Availability, Talent Readiness.
    * *Value:* ROI, Customer Experience, Revenue Potential.
* **Custom Criteria:** Ability to add new criteria with:
    * Name (Max 50 chars)
    * Description (Tooltip for participants)
    * Scale Label (e.g., "Low" to "High")
* **Weighting Enforcement:**
    * User assigns percentage weights to criteria.
    * **Validation:** System MUST prevent saving if Total Weight != 100%.
    * Visual indicator of remaining weight (e.g., "10% left to assign").

### 3. Session Management
* **PIN Generation:** Auto-generate a unique 6-digit alphanumeric PIN (avoid ambiguous chars like 'O' vs '0').
* **QR Code:** Generate a downloadable/displayable QR code linking to the join URL.
* **Persistence:** Save configuration to the Facilitator's dashboard as "Draft" or "Active".

## Scenarios

### Scenario A: Happy Path
1. Facilitator logs in and clicks "New Workshop".
2. Enters "Finance AI Brainstorm".
3. Selects "ROI" (50%) and "Effort" (50%) from library.
4. Clicks "Create".
5. System generates PIN "A1B2C3" and shows the "Lobby" screen.

### Scenario B: Invalid Weights
1. Facilitator assigns "ROI" (60%) and "Risk" (30%).
2. Clicks "Create".
3. System validates Total = 90%.
4. Error message appears: "Total weight must be 100%. You have 10% remaining."
5. "Create" button remains disabled or blocked check.

### Scenario C: Templates
1. Facilitator wants to reuse the setup from "Last Month's Workshop".
2. Selects "Clone from previous..." option.
3. All criteria and weights are pre-filled.
4. Facilitator tweaks one weight and saves.

## Technical Notes:
* **Database:** Store configuration in `workshops` and `criteria` tables.
* **State Management:** Workshop status can be `DRAFT`, `OPEN`, `IN_PROGRESS`, `COMPLETED`.
* **Validation:** Backend must strictly enforce 100% weight sum before commiting to DB.