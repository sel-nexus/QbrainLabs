# User Story: Hotspot Mapping & Analysis

**As a** Facilitator,
**I want to** visualize all scored use cases on a 2x2 matrix (Value vs. Feasibility),
**So that** the group can identify "Quick Wins" and "Strategic Bets" for the AI roadmap.

## Acceptance Criteria

### 1. The Matrix (D3.js)
* **Axes:**
    * X-Axis: **Feasibility** (Ease of Implementation). (Left=Hard, Right=Easy)
    * Y-Axis: **Business Value**. (Bottom=Low, Top=High)
* **Quadrants (Configurable Labels):**
    * Top-Right: **Quick Wins** (High Value, Easy).
    * Top-Left: **Strategic Bets** (High Value, Hard).
    * Bottom-Right: **Low Hanging Fruit / Fillers** (Low Value, Easy).
    * Bottom-Left: **Time Sinks / Distractions** (Low Value, Hard).

### 2. Node Representation (Bubbles)
* **Position:** Computed average of all participant scores.
* **Size (Z-Axis):** Represents cost, third criteria, or vote count.
* **Color:** By Category (e.g., GenAI = Blue, Predictive = Green).
* **Label:** show Title on hover or if space permits.

### 3. Interactivity
* **Tooltip:** Hover shows exact score (e.g., "Val: 8.2, Feas: 7.1").
* **Click:** Opens "Detail Panel" listing summary, top comments, and variance (disagreement level).
* **Drag (Facilitator Override):** Facilitator can manually drag a bubble to a new spot if the group agrees to override the math.

## Scenarios

### Scenario A: Analysis Review
1. Scoring ends. Matrix renders.
2. Group sees a cluster in "Quick Wins".
3. Facilitator clicks one.
4. Reads out: "Everyone agrees this is high value."

### Scenario B: identifying Disagreement
1. A bubble has a specific "Glow" or border indicating high standard deviation.
2. Facilitator clicks it.
3. See that 50% voted "Hard" and 50% voted "Easy".
4. Group discusses the discrepancy.

### Scenario C: Export
1. Team agrees on the roadmap.
2. Facilitator clicks "Export PDF".
3. Downloads a high-res image of the matrix with list of use cases.

## Technical Notes:
* **Library:** `D3.js` for SVG rendering. Support Zoom/Pan.
* **Math:** Normalize scores to 0-100 range for plotting.
* **Updates:** Matrix should update in real-time as scores come in (animated transition of bubbles moving) so the group can watch consensus form.