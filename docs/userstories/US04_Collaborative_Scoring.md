# User Story: Collaborative Scoring & Evaluation

**As a** Workshop Participant,
**I want to** rate use cases using interactive sliders based on the defined criteria,
**So that** my expertise is reflected in the final prioritization map.

## Acceptance Criteria

### 1. Scoring Interface (The "Card")
* **Interaction:** Single-card view (Tinder-style or Carousel).
* **Content:** Displays Title, Problem, Solution, and KPI.
* **Sliders:** One slider per criterion (e.g., Value, Feasibility).
    * Range: 1-10 or 1-5 (Configured in Setup).
    * Default: Center or 0 (Must force an active choice).
* **Comment:** Optional text field for "Why I gave this score".

### 2. Navigation
* **Next/Submit:** Saves score and moves to next card.
* **Skip:** "I don't know enough to rate this" -> records null/abstain.
* **Back:** Ability to return to previous card to revise (only during Scoring Phase).

### 3. Progress Tracking
* **Progress Bar:** "3 of 15 Scored".
* **Queue:** Automatically fetches new cards if Facilitator pushes them in batches.

## Scenarios

### Scenario A: Scoring a Card
1. Screen shows "HR Chatbot".
2. User drags "Value" to 8/10.
3. Drags "Feasibility" to 3/10 (Hard).
4. Taps "Next".
5. Score is sent to server; next card slides in.

### Scenario B: Skipping
1. Screen shows "Quantum Computing Optimization".
2. User thinks "I have no idea".
3. Taps "Skip".
4. System records `skipped: true` for this user/card combo (excluded from averages).

### Scenario C: Facilitator Pause
1. Facilitator clicks "Pause Scoring" to discuss a card.
2. Participant screens lock: "Eyes on the screen please...".
3. Inputs disabled.

## Technical Notes:
* **Aggregation:**
    * Use `AVG()` of all non-skipped scores.
    * Calculate `STD_DEV` to find "controversy" (high variance).
* **Latency:** Send scores via WebSocket `emit('score_submit')` for instant dashboard updates, but also queue locally if offline.
* **Anonymity:** Backend should store relation `(user_id, card_id)` to prevent double-voting, but API to client should never expose "Who voted what" to the public.