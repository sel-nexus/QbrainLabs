# US35: Participant Theme Consistency for Use Case Creation

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** User Interface & Accessibility  
**Story Type:** Bug Fix / Enhancement  
**Priority:** Medium  
**Story Points:** 3  
**Status:** 📋 BACKLOG

---

## User Story

**As a** Workshop Participant,  
**I want to** have consistent theme mode (light/contrast) when clicking the "New Use Case" button,  
**So that** I can use the application comfortably without jarring theme changes in modals and forms.

---

## Description

When participants click the "New Use Case" button to create a use case, the modal/form should respect the participant's selected theme (light/contrast mode) consistently throughout the interface. Currently, there may be inconsistencies where the modal doesn't properly inherit or apply the theme context, causing visual inconsistencies and poor user experience.

---

## Requirements

### Functional Requirements

1. **Theme Context Inheritance**
   - Use Case Canvas modal must inherit theme from ThemeContext
   - All form elements within the modal use theme-aware styling
   - Theme toggle persists across modal interactions
   - Modal backdrop respects theme settings

2. **Consistent Styling**
   - Input fields use theme-aware colors
   - Buttons match theme styling
   - Text colors are readable in both themes
   - Borders and shadows adapt to theme

3. **Modal Wrapper**
   - Modal container applies theme classes
   - Close button uses theme-aware styling
   - Scrollbars (if any) respect theme

### Non-Functional Requirements

- Theme switching should work seamlessly within modals
- No flash of incorrect theme on modal open
- Consistent with rest of application theme behavior
- Accessibility maintained in both themes

---

## Acceptance Criteria

### Scenario 1: Theme Consistency in Use Case Modal
**Given** a participant has selected Contrast mode  
**When** they click the "New Use Case" button  
**Then** the modal opens with Contrast theme applied  
**And** all form elements use Contrast theme styling  
**And** text is readable with proper contrast ratios

### Scenario 2: Theme Persistence
**Given** a participant opens the Use Case modal  
**When** they toggle the theme while the modal is open  
**Then** the modal immediately updates to the new theme  
**And** all form elements reflect the new theme  
**And** the theme persists when the modal is reopened

### Scenario 3: Light Mode Consistency
**Given** a participant has selected Light mode  
**When** they open the Use Case creation modal  
**Then** the modal displays in Light mode  
**And** all elements are clearly visible  
**And** the styling matches the rest of the Light mode interface

---

## Technical Implementation

### Files to Modify

- `client/src/components/UseCaseCanvas.tsx` - Ensure theme context is used
- `client/src/pages/ParticipantDashboard.tsx` - Modal wrapper should apply theme classes
- `client/src/pages/ParticipantMatrix.tsx` - Modal wrapper for use case creation

### Implementation Details

```typescript
// UseCaseCanvas.tsx should use theme context
import { useTheme } from '../../context/ThemeContext';

export function UseCaseCanvas({ session, onSuccess }: UseCaseCanvasProps) {
  const { theme } = useTheme();
  
  return (
    <div className={`theme-bg-primary theme-text-primary ${/* modal classes */}`}>
      {/* Form elements using theme-aware classes */}
    </div>
  );
}
```

### CSS Classes

- Use existing theme utility classes: `theme-bg-primary`, `theme-bg-secondary`, `theme-text-primary`, `theme-border`
- Ensure modal backdrop uses `bg-black/60` or theme-aware equivalent
- Form inputs use `theme-input-bg` and `theme-text-primary`

---

## Dependencies

- US14: Theme Switching - already implemented
- US03: Digital Use Case Canvas - already implemented
- ThemeContext must be available in component tree

---

## Testing Requirements

### Unit Tests
- Theme context is properly consumed in UseCaseCanvas
- Modal wrapper applies theme classes correctly
- Form elements inherit theme styling

### Integration Tests
- Modal opens with correct theme
- Theme toggle updates modal in real-time
- Theme persists across modal open/close cycles

### Visual Regression Tests
- Screenshots of modal in Light mode
- Screenshots of modal in Contrast mode
- Verify no theme inconsistencies

---

## Definition of Done

- [ ] Use Case Canvas modal respects theme context
- [ ] All form elements use theme-aware styling
- [ ] Theme toggle works within modal
- [ ] No visual inconsistencies between modal and main interface
- [ ] Accessibility maintained in both themes
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Visual regression tests passing
- [ ] Code review completed
