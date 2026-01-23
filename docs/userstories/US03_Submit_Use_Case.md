# User Story: AI Use Case Intake

**As a** Business Stakeholder,
**I want to** submit AI use case ideas through a structured digital canvas,
**So that** the core value proposition and technical needs are captured consistently.

## Acceptance Criteria

### 1. The Intake Canvas
* **Fields:**
    * **Title:** (Req, Max 100 chars)
    * **Problem Statement:** (Req, Textarea) - "What is the pain point?"
    * **Proposed Solution:** (Req, Textarea) - "How does AI solve it?"
    * **Success Metric (KPI):** (Req) - e.g., "Reduce handle time by 20%".
    * **Target User:** (Req) - e.g., "Customer Support Agents".
* **Categorization:**
    * "AI Technique" dropdown: Generative Text, Computer Vision, Predictive, etc.
* **Drafting Mode:**
    * Changes are saved locally (`onChange`) so data isn't lost if the browser refreshes.

### 2. Submission Flow
* **Submit Action:** Validates all required fields before sending.
* **Post-Submit State:**
    * Form clears or shows "Success! Submit another?".
    * User sees a list of "My Submissions" below the form.
* **Editing:** Users can tap one of their previous submissions to edit *only* while the session is still in the "Intake" phase.

### 3. Real-Time Aspects
* **Facilitator View:** As soon as a user hits submit, the card pops up on the Facilitator's screen (Sound effect optional).

## Scenarios

### Scenario A: Standard Submission
1. User types "Automated Emails".
2. Fills in Problem/Solution.
3. Selects "GenAI".
4. Taps "Submit".
5. Success toast appears. Card appears in "My Submissions" list.

### Scenario B: Validation Error
1. User forgets "Target User".
2. Taps "Submit".
3. Field turns red with "Required".
4. User fixes and resubmits.

### Scenario C: The "AI Assist" (Future Feature)
1. User types "I want a chatbot for HR."
2. User taps "Wand Icon" (AI Assist).
3. System auto-fills: "Problem: HR spends 40% time answering policy questions..."

## Technical Notes:
* **WebSockets:** `socket.emit('submit_case', data)` -> Server broadcasts to Facilitator room.
* **Database:** `use_cases` table link to `workshop_id` and `participant_id` (or session_id).
* **Sanitization:** Strip HTML/Script tags from text inputs to prevent XSS.