# US43: Enhanced Live Matrix Activity Dashboard

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Business Intelligence & Analytics  
**Story Type:** Enhancement  
**Priority:** High  
**Story Points:** 13  
**Status:** 📋 BACKLOG

---

## User Story

**As a** Workshop Facilitator,  
**I want to** see matrix activity data immediately on page load with options to view consolidated or individual participant scoring,  
**So that** I can monitor workshop progress and understand participant perspectives effectively.

---

## Description

Enhance Live Matrix Activity dashboard to display data on page load, group prioritized use cases by participant via dropdown, and show consolidated scoring with option to view individual participant scoring. This provides facilitators with comprehensive insights into how participants are prioritizing use cases.

---

## Requirements

### Functional Requirements

1. **Immediate Data Loading**
   - Load matrix activity data on page load
   - Display data without waiting for user interaction
   - Show loading state while fetching
   - Handle errors gracefully

2. **Participant Grouping**
   - Dropdown to filter/group use cases by participant
   - Show all participants in dropdown
   - "All Participants" option for consolidated view
   - Visual indicator of selected participant

3. **Consolidated Scoring View (Default)**
   - Default view shows consolidated scoring of all use cases
   - Aggregate scores from all participants
   - Show average position on matrix
   - Display total number of participants who scored each use case
   - Visual representation on matrix

4. **Individual Participant Scoring**
   - Option to view scoring by individual participant
   - Show use cases positioned by that participant
   - Display participant's scoring values
   - Compare with consolidated view

5. **Real-Time Updates**
   - WebSocket updates for new scoring activity
   - Live updates to consolidated view
   - Updates when participants move use cases
   - Activity indicators

6. **Visual Indicators**
   - Clear distinction between consolidated and individual views
   - Participant-specific vs aggregated positions
   - Activity indicators for recent changes
   - Legend explaining view types

### Non-Functional Requirements

- Dashboard should load in < 2 seconds
- Real-time updates should appear in < 500ms
- Support for workshops with many participants
- Efficient data aggregation
- Mobile-responsive design

---

## Acceptance Criteria

### Scenario 1: Immediate Data Display
**Given** a facilitator opens the Live Matrix Activity dashboard  
**When** the page loads  
**Then** matrix data is displayed immediately  
**And** consolidated scoring is shown by default  
**And** loading state is shown while fetching

### Scenario 2: Participant Filtering
**Given** a facilitator is viewing the dashboard  
**When** they select a participant from the dropdown  
**Then** the view switches to that participant's scoring  
**And** only use cases scored by that participant are shown  
**And** positions reflect that participant's input

### Scenario 3: Consolidated View
**Given** a facilitator selects "All Participants"  
**When** the view updates  
**Then** consolidated scoring is displayed  
**And** average positions are shown  
**And** participant count is visible for each use case

### Scenario 4: Real-Time Updates
**Given** a facilitator has the dashboard open  
**When** a participant updates their scoring  
**Then** the dashboard updates in real-time  
**And** consolidated view recalculates  
**And** activity indicator shows the change

### Scenario 5: View Comparison
**Given** a facilitator views individual participant scoring  
**When** they switch to consolidated view  
**Then** they can see how individual differs from group consensus  
**And** differences are visually apparent

---

## Technical Implementation

### Files to Modify

- `client/src/components/MatrixActivityDashboard.tsx` - Enhance with new features
- `server/app/api/usecases.py` - Add consolidated scoring endpoint
- `server/app/api/participants.py` - Add participant-specific scoring endpoint

### Backend Changes

#### Consolidated Scoring Endpoint

```python
@router.get("/workshops/{workshop_id}/matrix/consolidated")
async def get_consolidated_matrix_scoring(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get consolidated matrix scoring for all participants"""
    # Get all use cases for workshop
    # Get all participant scores/positions
    # Calculate average positions
    # Aggregate scoring data
    # Return consolidated view
    
    use_cases = await get_workshop_usecases(workshop_id, db)
    participants = await get_workshop_participants(workshop_id, db)
    
    consolidated_data = []
    for use_case in use_cases:
        positions = []
        scores = []
        participant_count = 0
        
        for participant in participants:
            position = await get_participant_usecase_position(
                participant.id, use_case.id, db
            )
            if position:
                positions.append(position)
                scores.append(position.get('score', {}))
                participant_count += 1
        
        if positions:
            avg_x = sum(p['x'] for p in positions) / len(positions)
            avg_y = sum(p['y'] for p in positions) / len(positions)
            
            consolidated_data.append({
                'usecase_id': str(use_case.id),
                'usecase_title': use_case.title,
                'position': {'x': avg_x, 'y': avg_y},
                'participant_count': participant_count,
                'score_range': {
                    'min': min(scores),
                    'max': max(scores),
                    'avg': sum(scores) / len(scores) if scores else 0
                }
            })
    
    return {'consolidated_scoring': consolidated_data}
```

#### Participant-Specific Scoring Endpoint

```python
@router.get("/workshops/{workshop_id}/matrix/participant/{participant_id}")
async def get_participant_matrix_scoring(
    workshop_id: str,
    participant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get matrix scoring for a specific participant"""
    # Get participant's use case positions
    # Return participant-specific view
    
    positions = await get_all_participant_positions(participant_id, db)
    use_cases = await get_workshop_usecases(workshop_id, db)
    
    participant_data = []
    for use_case in use_cases:
        position = next(
            (p for p in positions if p.usecase_id == use_case.id),
            None
        )
        if position:
            participant_data.append({
                'usecase_id': str(use_case.id),
                'usecase_title': use_case.title,
                'position': {'x': position.x, 'y': position.y},
                'score': position.score_data if hasattr(position, 'score_data') else {}
            })
    
    return {
        'participant_id': participant_id,
        'participant_name': await get_participant_name(participant_id, db),
        'scoring': participant_data
    }
```

### Frontend Changes

#### Enhanced MatrixActivityDashboard

```typescript
export function MatrixActivityDashboard({ 
    workshopId, 
    isVisible, 
    onRefreshMatrix 
}: MatrixActivityDashboardProps) {
    const [viewMode, setViewMode] = useState<'consolidated' | 'participant'>('consolidated');
    const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (isVisible && workshopId) {
            loadInitialData();
            setupWebSocketListeners();
        }
    }, [isVisible, workshopId]);
    
    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Load participants list
            const participantsData = await api.get(`/participants/workshop/${workshopId}`);
            setParticipants(participantsData.data);
            
            // Load consolidated scoring by default
            await loadConsolidatedScoring();
        } catch (error) {
            toast.error('Failed to load matrix data');
        } finally {
            setLoading(false);
        }
    };
    
    const loadConsolidatedScoring = async () => {
        const data = await api.get(`/workshops/${workshopId}/matrix/consolidated`);
        setMatrixData(data.data);
        setViewMode('consolidated');
        setSelectedParticipant(null);
    };
    
    const loadParticipantScoring = async (participantId: string) => {
        const data = await api.get(
            `/workshops/${workshopId}/matrix/participant/${participantId}`
        );
        setMatrixData(data.data);
        setViewMode('participant');
        setSelectedParticipant(participantId);
    };
    
    const setupWebSocketListeners = () => {
        socket.on('matrix:position_update', (data) => {
            // Update matrix data in real-time
            if (viewMode === 'consolidated') {
                // Recalculate consolidated view
                loadConsolidatedScoring();
            } else if (selectedParticipant === data.participant_id) {
                // Update participant view
                loadParticipantScoring(data.participant_id);
            }
        });
    };
    
    return (
        <div className="matrix-activity-dashboard">
            <div className="controls">
                <select
                    value={selectedParticipant || 'all'}
                    onChange={(e) => {
                        if (e.target.value === 'all') {
                            loadConsolidatedScoring();
                        } else {
                            loadParticipantScoring(e.target.value);
                        }
                    }}
                >
                    <option value="all">All Participants (Consolidated)</option>
                    {participants.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>
            
            {loading ? (
                <LoadingSpinner />
            ) : (
                <MatrixVisualization 
                    data={matrixData}
                    viewMode={viewMode}
                    showParticipantCount={viewMode === 'consolidated'}
                />
            )}
        </div>
    );
}
```

---

## Dependencies

- US05: Interactive Hotspot Matrix - already implemented
- Matrix position tracking system
- Participant scoring system
- WebSocket infrastructure

---

## Data Aggregation Logic

### Consolidated Scoring Calculation

- **Average Position**: Mean of all participant positions for each use case
- **Participant Count**: Number of participants who scored the use case
- **Score Range**: Min, max, and average scores
- **Consensus Indicator**: Visual indicator of agreement level

### Individual Participant Scoring

- **Exact Positions**: Participant's actual positions
- **Scoring Values**: Participant's scoring criteria values
- **Comparison**: Option to compare with consolidated view

---

## UI/UX Design

### Dashboard Layout

```
┌─────────────────────────────────────┐
│ Live Matrix Activity               │
├─────────────────────────────────────┤
│ [Participant: All ▼] [Refresh]    │
├─────────────────────────────────────┤
│                                     │
│         [Matrix Visualization]      │
│                                     │
│  Legend:                            │
│  • Consolidated (avg positions)    │
│  • Individual (exact positions)    │
│  • Participant count: 5            │
│                                     │
└─────────────────────────────────────┘
```

### Visual Indicators

- Consolidated view: Larger markers, participant count badge
- Individual view: Standard markers, participant name
- Activity indicators: Pulse animation for recent updates
- View mode indicator: Badge showing current view

---

## Testing Requirements

### Unit Tests
- Consolidated scoring calculation
- Participant-specific scoring retrieval
- Data aggregation logic
- View mode switching

### Integration Tests
- Dashboard loads on page open
- Participant dropdown works
- Consolidated view displays correctly
- Individual view displays correctly
- Real-time updates work

### Performance Tests
- Load time with many participants
- Load time with many use cases
- Real-time update performance
- Data aggregation performance

---

## Definition of Done

- [ ] Dashboard loads data on page open
- [ ] Participant dropdown implemented
- [ ] Consolidated scoring view works
- [ ] Individual participant scoring works
- [ ] Real-time updates implemented
- [ ] Visual indicators implemented
- [ ] Backend endpoints created
- [ ] Data aggregation logic implemented
- [ ] Mobile-responsive design
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Performance tested
- [ ] Code review completed
- [ ] Documentation updated
