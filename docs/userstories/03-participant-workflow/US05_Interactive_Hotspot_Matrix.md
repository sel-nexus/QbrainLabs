# US05: Interactive Qbrain AI Labs

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** The Hotspot Visualization  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 13

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
   - When a participant logs into the app, they can score use cases directly on the matrix:
     - **Drag-and-Drop Scoring:** Drag existing use case bubbles to position them on the 2x2 plot based on their assessment of Ease (X-axis) and Impact (Y-axis)
     - **Manual Score Entry:** Click on a use case to open a scoring modal where participants can manually enter numerical scores (1-10) for each criterion
   - Real-time position updates visible to facilitator
   - Participant scores contribute to the aggregate weighted average
   - Visual indicator showing where participant has positioned each use case
   - Score locking after submission (configurable by facilitator)
   - Anonymous mode: Individual participant placements not visible to other participants
   - Facilitator can enable/disable participant drag mode
   - Touch-friendly drag interaction for mobile devices

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
**When** they view the hotspot matrix  
**Then** they can drag use case bubbles to new positions on the 2x2 plot  
**And** the X-coordinate represents their Ease/Feasibility assessment  
**And** the Y-coordinate represents their Business Impact assessment  
**And** their score is saved and contributes to the aggregate  
**And** a visual indicator shows their placement vs. the aggregate position

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
- `HotspotMatrix.tsx` - Main container
- `MatrixChart.tsx` - D3.js visualization wrapper
- `Bubble.tsx` - Individual data point
- `MatrixTooltip.tsx` - Hover tooltip
- `QuadrantLabels.tsx` - Quadrant annotations
- `MatrixControls.tsx` - Zoom, filter, export controls
- `LegendPanel.tsx` - Visual legend
- `DetailModal.tsx` - Detailed submission view

#### Participant View
- `ParticipantMatrixView.tsx` - Participant-specific matrix with drag enabled
- `DraggableBubble.tsx` - Bubble component with drag-and-drop capability
- `ParticipantScoreModal.tsx` - Manual score entry form
- `ScorePositionIndicator.tsx` - Shows participant's position vs aggregate
- `TouchDragHandler.tsx` - Mobile touch drag interaction handler

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

POST /api/workshops/:workshop_pin/participant-score
Request Body:
{
  "session_id": "UUID",
  "submission_id": "UUID",
  "score_type": "drag|manual",
  "x_coordinate": number (1-10),  // For drag scoring
  "y_coordinate": number (1-10),  // For drag scoring
  "criteria_scores": [             // For manual scoring
    {
      "criterion": "string",
      "value": number (1-10)
    }
  ]
}

Response:
{
  "score_id": "UUID",
  "locked": true,
  "aggregate_position": {
    "x": number,
    "y": number
  },
  "participant_position": {
    "x": number,
    "y": number
  }
}

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

---

## Questions/Clarifications

1. Should facilitator be able to manually adjust bubble positions?
2. Can bubbles be grouped/clustered?
3. Should there be animation when data updates?
4. What happens with tie scores on quadrant boundaries?
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
- [ ] **Participant drag-and-drop scoring functional**
- [ ] **Manual score entry modal working**
- [ ] **Participant vs aggregate position indicator showing**
- [ ] **Touch-friendly drag for mobile devices**
- [ ] **Score locking mechanism implemented**
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
