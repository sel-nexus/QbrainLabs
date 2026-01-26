# US05: Interactive Qbrain AI Labs

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** The Hotspot Visualization  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 13  
**Status:** ✅ IMPLEMENTED (Participant View)  
**Implementation Date:** January 26, 2026

---

## User Story

**As a** Facilitator,  
**I want to** view an aggregated 2x2 map of all submissions,  
**So that** I can visually present "Quick Wins" and "Strategic Bets" to leadership.

---

## Description

The Interactive Qbrain AI Labs transforms scored submissions into an actionable visual representation. Using a 2x2 matrix (Ease vs. Impact), facilitators can quickly identify which use cases should be prioritized. The visualization helps communicate complex data to leadership through an intuitive, interactive interface.

---

## Requirements

### Functional Requirements

1. **2x2 Matrix Visualization**
   - X-axis: Ease of Implementation (Feasibility)
   - Y-axis: Business Impact
   - Four quadrants:
     - **Top-Right (Green):** Quick Wins
     - **Top-Left (Blue):** Strategic Bets
     - **Bottom-Right (Yellow):** Fill-Ins
     - **Bottom-Left (Red):** Distractions/Money Pits

2. **Data Points (Bubbles)**
   - Each submission represented as a bubble
   - Bubble size: Indicates data readiness score (1-5)
   - Position: Calculated from weighted average scores
   - Color: Quadrant-based coloring
   - Variance indicator: Low consensus = dotted border

   - Variance indicator: Low consensus = dotted border

3. **Interactive & Admin Features**
   - **Hover:** Display tooltip with:
     - Use case title
     - Average scores (per criterion)
     - Variance/consensus level
     - Number of votes
     - Data readiness
   - **Click:** Open detailed view of submission
   - **Drag (Facilitator Override):** Facilitator can manually drag a bubble to a new position to override the calculated score (if consensus dictates).
   - **Zoom:** Pan and zoom functionality
   - **Filter:** By AI category, data readiness, etc.
   - **Search:** Find specific use cases

6. **Participant Scoring Mode**
   - When a participant clicks the "Hotspot Prioritization" tile, they navigate to `/participant-matrix` route
   - Strategic Matrix page displays:
     - **Left Side (70%):** Interactive 2x2 matrix visualization with drag-and-drop support
     - **Right Side (30%):** Scrollable panel with draggable use case tiles
   - **Drag-and-Drop from Tiles:** Participants drag use case tiles from the right panel onto the matrix to position them
   - **Drag-and-Drop on Matrix:** Participants can drag existing dots/bubbles on the matrix to reposition them
   - **Use Cases Only Appear When Dragged:** Use cases only appear on the graph when explicitly dragged onto it from the tiles panel
     - Results are filtered to only show use cases that have been positioned (have votes with Feasibility and Business Value scores)
     - Use cases without positions are only shown in the tiles panel, not on the matrix
     - Filtering criteria: Must have `vote_count > 0` AND (`scores['Feasibility']` AND `scores['Business Value']`) OR (`x` AND `y` coordinates)
   - **Labels on Dots:** Each positioned use case displays a label above the dot showing the use case title
   - **Hover Tooltips:** Hovering over a dot shows:
     - Use case title
     - Position coordinates (Feasibility and Business Value)
     - Variance (if available)
     - Vote count
     - All score details
   - **Add New Use Case:** Participants can add new use cases directly from the matrix window via "Add New" button
     - Opens modal with `UseCaseCanvas` component
     - On successful submission, emits `new_submission` socket event
     - Modal closes automatically on success
     - Use cases list refreshes to show new submission in tiles panel
     - New use case does NOT automatically appear on matrix (must be dragged)
   - **Socket Event Handling:**
     - Participants join workshop room on component mount: `socket.emit('join_workshop', { workshop_id })`
     - Listen for `new_submission` events to refresh use cases list (not results)
     - Listen for `matrix:position_changed` custom events from ResultsChart drag interactions
   - **Position Saving:**
     - When use case is dropped on matrix, saves position via `POST /api/votes/` endpoint
     - Payload: `{ use_case_id, participant_id, scores: { 'Feasibility': x, 'Business Value': y } }`
     - Emits `matrix:position_update` socket event for real-time facilitator updates
     - Updates local results state to show positioned use case on graph
   - Real-time position updates via WebSocket
   - Participant scores saved via `/votes/` API endpoint
   - Positions saved with Feasibility (X-axis) and Business Value (Y-axis) scores
   - Touch-friendly drag interaction for mobile devices

7. **Facilitator Real-Time Activity Dashboard**
   - When admin/facilitator enters workshop in ANALYSIS phase, matrix view displays dynamic activity dashboard
   - **MatrixActivityDashboard Component:**
     - Located on right side of matrix view (400px width)
     - Only visible to admins/facilitators
     - Shows real-time participant actions as they drag and drop items on matrix
   - **Live Activity Feed:**
     - Displays recent actions (last 20) with participant name, use case title, and position
     - Shows quadrant label (Quick Wins, Strategic Bets, Nice to Have, Don't Do)
     - Displays position coordinates (Feasibility and Business Value)
     - Shows previous position when item is moved
     - Timestamp with "time ago" formatting
   - **Statistics Display:**
     - Total Actions: Count of all matrix position updates
     - Active Now: Number of unique participants currently active
     - Last Minute: Activity count in the last 60 seconds (resets every minute)
   - **Connection Status:**
     - Visual indicator showing "Live" (green) or "Connecting..." (red)
     - Automatically connects to socket and joins workshop room
     - Handles connection/disconnection events
   - **Real-Time Updates:**
     - Listens for `matrix:position_update` socket events
     - Listens for `matrix:drag_start` socket events
     - Events broadcast from backend when participants save positions via `/votes/` endpoint
     - Dashboard automatically refreshes matrix results when positions change
   - **Backend Integration:**
     - `/api/votes/` endpoint emits `matrix:position_update` events to workshop room
     - Includes participant info, use case details, position coordinates, and previous position
     - Events received by all facilitators in the workshop room

4. **D3.js Powered Visualization**
   - Smooth animations
   - Responsive scaling
   - Export to PNG/SVG
   - Print-friendly version

5. **Statistical Overlays**
   - Average position marker
   - Confidence ellipses
   - Density heat map (optional)
   - Trend lines

### Non-Functional Requirements

- Initial load time < 2 seconds for up to 100 submissions
- Smooth animations at 60 FPS
- Mobile-responsive layout
- Print-friendly export
- Accessible alternative view (table format)

---

## Acceptance Criteria

### Scenario 1: Matrix Rendering
**Given** a workshop has completed scoring  
**When** the facilitator opens the hotspot matrix  
**Then** all submissions are displayed as bubbles on a 2x2 grid  
**And** coordinates are calculated using weighted average formula  
**And** quadrants are properly colored  
**And** bubbles are sized based on data readiness

### Scenario 2: Weighted Calculation
**Given** submissions have been scored across multiple criteria  
**When** calculating bubble positions  
**Then** X-coordinate = weighted average of feasibility-related criteria  
**And** Y-coordinate = weighted average of impact-related criteria  
**And** weights come from workshop configuration (US01)

### Scenario 3: Quadrant Coloring
**Given** a submission has calculated coordinates  
**When** it is positioned on the matrix  
**Then** it receives the color of its quadrant:
- Top-Right (X>5, Y>5): Green (#28a745)
- Top-Left (X≤5, Y>5): Blue (#007bff)
- Bottom-Right (X>5, Y≤5): Yellow (#ffc107)
- Bottom-Left (X≤5, Y≤5): Red (#dc3545)

### Scenario 4: Variance Visualization
**Given** a submission has varying scores from participants  
**When** variance exceeds threshold (e.g., SD > 2)  
**Then** the bubble displays a dotted border  
**And** tooltip indicates "Low Consensus"  
**And** variance value is shown

### Scenario 5: Tooltip Interaction
**Given** the matrix is displayed  
**When** the facilitator hovers over a bubble  
**Then** a tooltip appears showing:
- Use case title
- Average score per criterion
- Consensus level (variance)
- Vote count
- Data readiness score  
**And** the tooltip follows cursor within bounds

### Scenario 6: Export Functionality
**Given** the facilitator wants to share the matrix  
**When** they click "Export to PNG"  
**Then** the visualization is rendered as a high-res image  
**And** includes legend and axis labels  
**And** downloads automatically

### Scenario 7: Participant Drag-and-Drop Scoring
**Given** a participant is logged into the workshop  
**When** they click the "Hotspot Prioritization" tile on the dashboard  
**Then** they navigate to `/participant-matrix` route  
**And** they see the Strategic Matrix on the left and use case tiles on the right  
**When** they drag a use case tile from the right panel onto the matrix  
**Then** a dot appears at the drop position with a label showing the use case title  
**And** the X-coordinate represents their Feasibility assessment  
**And** the Y-coordinate represents their Business Value assessment  
**And** their position is saved via API and contributes to the aggregate  
**And** hovering over the dot shows position coordinates and details  
**When** they drag an existing dot on the matrix  
**Then** the dot follows the cursor accurately  
**And** the label moves with the dot  
**And** the position is updated and saved

### Scenario 7b: Use Cases Only Appear When Dragged
**Given** a participant is viewing the Strategic Matrix  
**When** a new use case is created (by facilitator, admin, or participant)  
**Then** it appears in the tiles panel on the right  
**And** it does NOT automatically appear on the graph  
**When** the participant drags the use case tile onto the matrix  
**Then** it appears as a dot on the graph at the drop position  
**And** it remains visible on the graph for future sessions

### Scenario 8: Participant Manual Score Entry
**Given** a participant is viewing the hotspot matrix  
**When** they click on a use case bubble  
**Then** a scoring modal opens with input fields for each criterion  
**And** they can enter numerical scores (1-10) for each dimension  
**And** on submit, the use case position updates based on their input  
**And** their scores are locked after submission

---

## Technical Implementation

### Frontend Components
- `QbrainMatrix.tsx` - Main container (or `HotspotMatrix.tsx` if keeping legacy name)
- `MatrixChart.tsx` - D3.js visualization wrapper
- `Bubble.tsx` - Individual data point
- `MatrixTooltip.tsx` - Hover tooltip
- `QuadrantLabels.tsx` - Quadrant annotations
- `MatrixControls.tsx` - Zoom, filter, export controls
- `LegendPanel.tsx` - Visual legend
- `DetailModal.tsx` - Detailed submission view

#### Participant View
- `ParticipantMatrix.tsx` - Participant-specific matrix page with:
  - Strategic Matrix visualization on left (70% width)
  - Draggable use case tiles panel on right (30% width)
  - "Add New" button to create use cases from matrix window
  - Drag-and-drop from tiles to matrix
  - Drag-and-drop repositioning on matrix
  - Filters results to only show positioned use cases (has votes with Feasibility/Business Value)
  - Joins workshop room on mount: `socket.emit('join_workshop', { workshop_id })`
  - Listens for `new_submission` events to refresh use cases list
  - Listens for `matrix:position_changed` custom events from ResultsChart
  - Saves positions via `POST /api/votes/` endpoint
  - Emits `matrix:position_update` and `matrix:drag_start` socket events
- `ResultsChart.tsx` - D3.js matrix visualization component with:
  - Optional label display (`showLabels` prop)
  - Drag handler with correct coordinate transformation using `d3.pointer()`
  - Enhanced tooltips showing position coordinates
  - Label updates during drag operations
  - Dispatches `matrix:position_changed` custom events on drag end
- `UseCaseCanvas.tsx` - Use case creation form (reused from dashboard)
  - Accepts `onSuccess` callback prop
  - Closes modal and refreshes data on successful submission

#### Facilitator View
- `MatrixActivityDashboard.tsx` - Real-time activity monitoring dashboard:
  - Displays on right side of matrix view (400px width) in ANALYSIS phase
  - Only visible to admins/facilitators
  - Shows live participant actions feed (last 20 actions)
  - Displays statistics: Total Actions, Active Participants, Recent Activity (last minute)
  - Connection status indicator (Live/Connecting)
  - Automatically connects to socket and joins workshop room
  - Listens for `matrix:position_update` and `matrix:drag_start` events
  - Animated updates using Framer Motion
  - Shows participant name, use case title, position coordinates, quadrant label, previous position
- `WorkshopDetail.tsx` - Facilitator workshop management page:
  - Integrates MatrixActivityDashboard in ANALYSIS phase matrix view
  - Listens for `matrix:position_update` and `vote_update` events
  - Automatically refreshes results when positions change

### D3.js Implementation
```javascript
// Coordinate calculation
const xScale = d3.scaleLinear()
  .domain([1, 10])
  .range([0, width]);

const yScale = d3.scaleLinear()
  .domain([1, 10])
  .range([height, 0]);

// Bubble sizing
const radiusScale = d3.scaleSqrt()
  .domain([1, 5])
  .range([10, 40]);

// Color assignment
const colorScale = d3.scaleOrdinal()
  .domain(['quick-win', 'strategic', 'fill-in', 'distraction'])
  .range(['#28a745', '#007bff', '#ffc107', '#dc3545']);
```

### Backend Endpoints
```
GET /api/workshops/:workshop_pin/hotspot-data
Response:
{
  "workshop_id": "UUID",
  "criteria": [
    {
      "name": "string",
      "weight": number,
      "axis": "x|y"  // ease vs. impact
    }
  ],
  "submissions": [
    {
      "submission_id": "UUID",
      "title": "string",
      "x_coordinate": number (1-10),
      "y_coordinate": number (1-10),
      "data_readiness": number (1-5),
      "variance": number,
      "vote_count": number,
      "quadrant": "string",
      "scores_detail": [...]
    }
  ],
  "statistics": {
    "total_submissions": number,
    "average_x": number,
    "average_y": number,
    "high_consensus_count": number
  }
}

POST /api/workshops/:workshop_pin/export-matrix
Request Body:
{
  "format": "png|svg|pdf",
  "include_details": boolean
}

Response: File download

POST /api/votes/
Request Body:
{
  "use_case_id": "UUID",
  "participant_id": "UUID",
  "scores": {
    "Feasibility": number (0-100),      // X-axis position
    "Business Value": number (0-100)     // Y-axis position
  }
}

Response:
{
  "id": "UUID",
  "use_case_id": "UUID",
  "participant_id": "UUID"
}

**Socket Event Emission:**
When a vote is saved with Feasibility and Business Value scores, the endpoint automatically emits:
- Event: `matrix:position_update`
- Room: Workshop room (`workshop_id`)
- Payload:
  {
    "participant_id": "UUID",
    "participant_name": "string",
    "use_case_id": "UUID",
    "use_case_title": "string",
    "position": {
      "x": number (0-100),
      "y": number (0-100)
    },
    "previous_position": {
      "x": number,
      "y": number
    } | null  // Only present if updating existing position
  }

Also emits `vote_update` event with vote count for the use case.

GET /api/results/{workshop_id}
Response: List of aggregated use case results
[
  {
    "id": "UUID",
    "title": "string",
    "description": "string",
    "category": "string",
    "scores": {
      "Feasibility": number,
      "Business Value": number,
      ...
    },
    "x": number,  // Calculated X coordinate (0-100)
    "y": number,  // Calculated Y coordinate (0-100)
    "total_score": number,
    "vote_count": number,
    "variance": number
  },
  ...
]

**Client-Side Filtering:**
The ParticipantMatrix component filters results to only show positioned use cases:
- Must have `vote_count > 0` AND
- Must have (`scores['Feasibility']` AND `scores['Business Value']`) OR (`x` AND `y` coordinates)
- Use cases without positions are only shown in the tiles panel, not on the matrix graph

GET /api/workshops/:workshop_pin/participant/:session_id/scores
Response:
{
  "submissions": [
    {
      "submission_id": "UUID",
      "has_scored": boolean,
      "participant_position": { "x": number, "y": number },
      "locked": boolean
    }
  ]
}
```

### Coordinate Calculation Logic
```python
def calculate_coordinates(submission, criteria):
    """
    Calculate X (Ease) and Y (Impact) coordinates
    based on weighted criteria scores
    """
    x_sum = 0
    y_sum = 0
    x_weight_total = 0
    y_weight_total = 0
    
    for score in submission.scores:
        criterion = find_criterion(criteria, score.criterion)
        
        if criterion.axis == 'x':  # Feasibility
            x_sum += score.value * criterion.weight
            x_weight_total += criterion.weight
        elif criterion.axis == 'y':  # Impact
            y_sum += score.value * criterion.weight
            y_weight_total += criterion.weight
    
    x_coordinate = x_sum / x_weight_total if x_weight_total > 0 else 5
    y_coordinate = y_sum / y_weight_total if y_weight_total > 0 else 5
    
    return (x_coordinate, y_coordinate)

def calculate_variance(scores):
    """
    Calculate variance to determine consensus level
    """
    import numpy as np
    values = [s.value for s in scores]
    return np.std(values)

def assign_quadrant(x, y):
    """
    Assign quadrant based on coordinates
    """
    if x > 5 and y > 5:
        return "quick-win"
    elif x <= 5 and y > 5:
        return "strategic"
    elif x > 5 and y <= 5:
        return "fill-in"
    else:
        return "distraction"
```

---

## Dependencies

- US01: Workshop Initialization (criteria weights)
- US03: Digital Use Case Canvas (submissions)
- US04: Live Scoring Interface (scores)
- US06: MongoDB Atlas SaaS Integration
- D3.js library (v7+)
- React (v18+)

---

## Testing Requirements

### Unit Tests
- Coordinate calculation accuracy
- Variance calculation
- Quadrant assignment logic
- Color mapping
- Bubble sizing logic

### Integration Tests
- Data fetching and transformation
- D3.js rendering
- Export functionality
- Filter operations

### Visual Regression Tests
- Matrix layout consistency
- Quadrant coloring
- Bubble positioning
- Tooltip appearance

### Performance Tests
- Rendering time for 100+ submissions
- Animation smoothness
- Zoom/pan responsiveness

---

## UI/UX Mockup Notes

### Matrix Layout
- Clean, professional appearance
- Clear axis labels with units
- Quadrant labels visible but subtle
- Grid lines for reference (optional)
- Legend panel (detachable)

### Color Scheme
- **Quick Wins (Green):** #28a745
- **Strategic Bets (Blue):** #007bff
- **Fill-Ins (Yellow):** #ffc107
- **Distractions (Red):** #dc3545

### Interactive Elements
- Smooth zoom transitions
- Hover highlights related bubbles
- Click opens detailed sidebar
- Drag to pan
- Double-click to reset view

### Responsive Design
- Desktop: Full matrix with controls
- Tablet: Simplified controls
- Mobile: Vertical layout with scrollable table fallback

---

## Accessibility Requirements

- Keyboard navigation between bubbles
- Screen reader table alternative
- High contrast mode
- Focus indicators
- ARIA labels for all interactive elements
- Export to accessible CSV format

---

## Export Formats

### PNG Export
- High resolution (300 DPI)
- Includes legend and labels
- White background
- Timestamp watermark

### SVG Export
- Scalable vector format
- Editable in design tools
- Preserves interactivity (optional)

### CSV Export
- Tabular data format
- All submission details
- Calculated scores
- Quadrant assignments

### PDF Report
- Multi-page executive summary
- Matrix visualization
- Top recommendations
- Detailed submission list

---

## Analytics & Monitoring

### Metrics to Track
- Matrix load time
- Export frequency
- Most common filters used
- Zoom/pan interactions
- Detail view opens
- Time spent on matrix view

### Alerts
- Rendering failures
- Performance degradation
- Export failures
- Data calculation errors

---

## Security Considerations

- Validate facilitator session before showing matrix
- Sanitize submission data for XSS
- Rate limit export operations
- Secure file download links (expiring URLs)
- Prevent data scraping

---

## Performance Optimization

- Lazy load submission details
- Virtual rendering for large datasets
- Canvas rendering for performance mode
- WebGL for 1000+ submissions
- Debounce zoom/pan events
- Cache calculated coordinates

---

## Mathematical Formulas

### Weighted Average
```
X = Σ(score_i × weight_i) / Σ(weight_i)
```

### Standard Deviation (Variance)
```
σ = √(Σ(x_i - μ)² / n)
```

### Bubble Radius
```
radius = √(data_readiness) × scale_factor
```

---

## Related User Stories

- US01: Workshop Initialization (provides weights)
- US04: Live Scoring Interface (provides scores)
- US06: MongoDB Atlas SaaS Integration
- US31: Participant Landing Dashboard (navigation to matrix)

---

## WebSocket Events

### Matrix-Specific Events

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_workshop` | Client -> Server | `{ workshop_id }` | Join workshop room for real-time updates |
| `new_submission` | Server -> Client | `{ id, title, description }` | New use case submitted (refreshes tiles panel only) |
| `matrix:position_update` | Server -> Client | `{ participant_id, participant_name, use_case_id, use_case_title, position: {x, y}, previous_position }` | Participant positioned use case on matrix |
| `matrix:drag_start` | Client -> Server | `{ participant_id, participant_name, use_case_id, use_case_title, workshop_id }` | Participant started dragging use case |
| `vote_update` | Server -> Client | `{ use_case_id, count }` | Vote count updated for use case |

### Event Flow

1. **Participant Positions Use Case:**
   - Participant drags tile onto matrix or repositions existing dot
   - Client saves position via `POST /api/votes/`
   - Backend emits `matrix:position_update` to workshop room
   - Facilitator dashboard receives event and updates activity feed
   - Facilitator matrix view refreshes results automatically

2. **New Use Case Created:**
   - Participant clicks "Add New" button
   - Creates use case via `POST /api/usecases/`
   - Backend emits `new_submission` event to workshop room
   - All participants receive event and refresh tiles panel
   - Use case appears in tiles but NOT on matrix (must be dragged)

3. **Workshop Room Management:**
   - Participants and facilitators join workshop room on component mount
   - Room ID: `workshop_id` (string)
   - All matrix-related events broadcast to workshop room
   - Facilitators receive all participant actions in real-time

---

## Implementation Summary

### ✅ Completed Features (Participant View - January 26, 2026)

- ✅ Strategic Matrix page (`/participant-matrix`) accessible from Participant Dashboard
- ✅ Two-column layout: Matrix visualization (left 70%) and Use Case Tiles panel (right 30%)
- ✅ Drag-and-drop from tiles panel onto matrix to position use cases
- ✅ Drag existing dots on matrix to reposition them
- ✅ **Use cases only appear on matrix when explicitly dragged** (filtered results)
- ✅ Labels displayed above each dot showing use case title (truncated if long)
- ✅ Enhanced tooltips on hover showing:
  - Use case title
  - Position coordinates (Feasibility and Business Value)
  - Variance (if available)
  - Vote count
  - All score details
- ✅ Use cases only appear on graph when explicitly dragged (not automatically)
- ✅ "Add New" button in tiles panel to create use cases from matrix window
- ✅ New use cases appear in tiles panel but not on graph until dragged
- ✅ Real-time updates via WebSocket (`new_submission`, `matrix:position_update`)
- ✅ Position saving via `/votes/` API endpoint with Feasibility and Business Value scores
- ✅ Correct drag coordinate calculation using `d3.pointer()` for accurate positioning
- ✅ Label movement synchronized with dot dragging
- ✅ Filtering logic: Only shows use cases with votes and positions on graph
- ✅ Navigation from Participant Dashboard "Hotspot Prioritization" tile
- ✅ Socket room joining: Participants join workshop room on component mount
- ✅ Use case creation modal with success callback to refresh data

### ✅ Completed Features (Facilitator View - January 26, 2026)

- ✅ **MatrixActivityDashboard Component** - Real-time activity monitoring dashboard
  - Displays on right side of matrix view (400px width) in ANALYSIS phase
  - Only visible to admins/facilitators (`hasRole(['admin', 'facilitator'])`)
  - Shows live participant actions feed (last 20 actions)
  - Displays statistics:
    - Total Actions: Count of all matrix position updates
    - Active Now: Number of unique participants currently active
    - Recent Activity: Activity count in last 60 seconds (auto-resets)
  - Connection status indicator (green "Live" / red "Connecting...")
  - Animated activity feed using Framer Motion
  - Each action shows:
    - Participant name
    - Use case title
    - Position coordinates (Feasibility and Business Value)
    - Quadrant label (Quick Wins, Strategic Bets, Nice to Have, Don't Do)
    - Previous position (when item is moved)
    - Time ago timestamp
- ✅ **Real-Time Event Handling:**
  - Automatically connects to socket and joins workshop room
  - Listens for `matrix:position_update` events from backend
  - Listens for `matrix:drag_start` events
  - Handles connection/disconnection events
  - Updates activity feed in real-time as participants position items
- ✅ **WorkshopDetail Integration:**
  - Dashboard integrated into matrix view in ANALYSIS phase
  - Listens for `matrix:position_update` and `vote_update` events
  - Automatically refreshes results matrix when positions change
  - Grid layout: Matrix (left) + Activity Dashboard (right)

### Technical Implementation Details
- **Component:** `ParticipantMatrix.tsx` - Main matrix page component
- **Visualization:** `ResultsChart.tsx` - Enhanced with `showLabels` prop and improved drag handling
- **Drag Handling:** Uses `d3.pointer()` for accurate coordinate transformation
- **State Management:** Local state for results (positioned use cases) and useCases (all use cases)
- **API Integration:** 
  - `GET /usecases/{workshop_id}` - Fetch all use cases for tiles panel
  - `GET /results/{workshop_id}` - Fetch positioned use cases (filtered client-side)
  - `POST /votes/` - Save matrix positions
- **Socket Events:**
  - `join_workshop` - Join workshop room for real-time updates
  - `new_submission` - New use case created (refreshes tiles panel only)
  - `matrix:position_update` - Position updated (emitted by backend, received by facilitators)
  - `matrix:drag_start` - Participant started dragging (emitted by client)
  - `vote_update` - Vote count updated
- **Routes:** 
  - `/participant-matrix` - Strategic Matrix page (participants)
  - `/workshop/:id` - Workshop Detail page (facilitators, shows dashboard in ANALYSIS phase)
- **Backend Socket Emission:**
  - `/api/votes/` endpoint emits `matrix:position_update` events to workshop room
  - Includes participant info, use case details, position coordinates, and previous position
  - Events received by all facilitators in the workshop room
- **Facilitator Dashboard Components:**
  - `MatrixActivityDashboard.tsx` - Activity monitoring component
  - `WorkshopDetail.tsx` - Integrates dashboard into matrix view
  - Connection status tracking and automatic reconnection
  - Real-time statistics calculation and display

### 🔄 Pending Features (Facilitator View)
- ⏳ Facilitator drag override functionality
- ⏳ Zoom and pan controls
- ⏳ Filter by category/data readiness
- ⏳ Search functionality
- ⏳ Export to PNG/SVG
- ⏳ Statistical overlays (confidence ellipses, density heatmap)
- ⏳ Detailed submission view modal

## Questions/Clarifications

1. Should facilitator be able to manually adjust bubble positions? ✅ Yes (pending implementation)
2. Can bubbles be grouped/clustered? ⏳ Future enhancement
3. Should there be animation when data updates? ✅ Smooth transitions implemented
4. What happens with tie scores on quadrant boundaries? ✅ Handled by quadrant logic (midpoint-based)
5. ✅ Can participants edit their prioritization scores after submission? Yes, by dragging the dot to a new position
6. ✅ Do use cases appear automatically on the graph? No, only when explicitly dragged onto the matrix
5. Should matrix support 3D visualization option?
6. Can facilitator annotate the matrix with notes?

---

## Future Enhancements

- 3D visualization mode
- Time-series animation (if re-scoring)
- Cluster analysis overlay
- AI-powered recommendations
- Comparison with historical workshops
- Collaborative annotation
- Integration with project management tools
- Real-time updates during scoring
- Voice narration export

---

## Definition of Done

- [ ] D3.js matrix visualization implemented
- [ ] Coordinate calculation accurate
- [ ] Quadrant coloring working
- [ ] Variance visualization (dotted borders)
- [ ] Interactive tooltips functional
- [ ] Hover, click, zoom, pan working
- [ ] Export to PNG/SVG/CSV working
- [x] **Participant drag-and-drop scoring functional**
- [ ] **Manual score entry modal working**
- [ ] **Participant vs aggregate position indicator showing**
- [x] **Touch-friendly drag for mobile devices**
- [ ] **Score locking mechanism implemented**
- [x] **Use cases only appear on matrix when explicitly dragged**
- [x] **Real-time activity dashboard for facilitators**
- [x] **Socket event handling for position updates**
- [x] **Results filtering to show only positioned use cases**
- [x] **Add new use case from matrix view**
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Visual regression tests passing
- [ ] Performance tests passing
- [ ] Accessibility audit passed
- [ ] Mobile testing completed
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Demo to stakeholders completed
