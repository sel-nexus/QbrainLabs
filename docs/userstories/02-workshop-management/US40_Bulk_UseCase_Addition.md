# US40: Bulk Use Case Addition for Facilitators

**Epic:** Workshop Management - Use Case Management  
**Module:** Facilitator Tools  
**Story Type:** Feature  
**Story Points:** 8  
**Status:** ✅ IMPLEMENTED - Sprint 16  
**Implementation Date:** February 12, 2026

---

## User Story

**As a** Workshop Facilitator,  
**I want to** add single or multiple use cases to a workshop through an intuitive interface,  
**So that** I can quickly populate workshops with pre-defined use cases or import them in bulk from CSV files.

---

## Description

Facilitators need flexible options to add use cases to workshops. This feature provides:

1. **Single Use Case Addition:** Add one use case at a time with full AI enhancement features
2. **Bulk Use Case Addition:** Add multiple use cases simultaneously with a streamlined form
3. **CSV Import:** Import use cases from CSV files using a template
4. **Mode Switching:** Toggle between single and bulk modes within the same modal

This enhances facilitator productivity by supporting both quick single additions and efficient bulk imports.

---

## Requirements

### Functional Requirements

#### 1. Dual-Mode Interface

**Add Use Case Button Options:**
- "Add Use Case" - Opens modal in single mode
- "Add Multiple" - Opens modal in bulk mode
- Mode toggle buttons within the modal (Single/Multiple)

**Modal Behavior:**
- Single mode: Standard use case form with AI enhancements
- Bulk mode: Multi-entry form with CSV import capability
- Seamless switching between modes without losing context

#### 2. Single Use Case Mode

**Features:**
- Full use case form with all fields
- AI enhancement buttons (Enhance, Feasibility Check, etc.)
- Real-time validation
- Duplicate detection
- Submit single use case

**Fields:**
- Title (required)
- Target User (required)
- AI Technique/Category (dropdown)
- Problem Statement (required, textarea)
- Proposed Solution (textarea)
- Expected Benefit/KPI (required)

#### 3. Bulk Use Case Mode

**Features:**
- Add multiple use case entries in one form
- Add/remove individual entries dynamically
- CSV template download
- CSV import functionality
- Bulk validation
- Parallel submission of all use cases

**Entry Management:**
- Start with one empty entry
- "Add Another Use Case" button
- "Remove" button for each entry (minimum 1 entry)
- Entry counter showing total use cases
- Numbered headers for each entry

**CSV Import:**
- Download template button
- Import CSV button with file picker
- Automatic parsing and population
- Sample data in template
- Field mapping (Title, Description, Proposed Solution, KPI, Target User, Category)

#### 4. Validation & Error Handling

**Single Mode:**
- Required field validation
- Duplicate detection with modal warning
- AI service error handling
- Form reset on successful submission

**Bulk Mode:**
- All entries must have required fields
- Error message if any entry is incomplete
- Individual entry validation
- Batch submission with error handling
- Success message showing count of added use cases

---

## Acceptance Criteria

### Scenario 1: Add Single Use Case
**Given** a facilitator is viewing the workshop use cases tab  
**When** they click "Add Use Case"  
**Then** the modal opens in single mode  
**And** they see the standard use case form  
**When** they fill in all required fields and submit  
**Then** the use case is added to the workshop  
**And** the modal closes  
**And** they see a success message

### Scenario 2: Add Multiple Use Cases Manually
**Given** a facilitator clicks "Add Multiple"  
**Then** the modal opens in bulk mode  
**And** they see one empty use case entry  
**When** they click "Add Another Use Case"  
**Then** a new entry is added below  
**When** they fill in 3 use case entries  
**And** click submit  
**Then** all 3 use cases are added in parallel  
**And** they see "3 use case(s) added successfully!"  
**And** the modal closes

### Scenario 3: Import Use Cases from CSV
**Given** a facilitator is in bulk mode  
**When** they click "Download Template"  
**Then** a CSV file downloads with headers and sample data  
**When** they prepare a CSV file with 5 use cases  
**And** click "Import CSV"  
**And** select their file  
**Then** the form populates with 5 entries  
**And** all fields are filled from the CSV  
**When** they submit  
**Then** all 5 use cases are added  
**And** they see "5 use case(s) added successfully!"

### Scenario 4: Switch Between Modes
**Given** a facilitator has the modal open in single mode  
**When** they click the "Multiple" toggle button  
**Then** the form switches to bulk mode  
**And** they see the bulk entry interface  
**When** they click "Single"  
**Then** the form switches back to single mode  
**And** they see the standard form

### Scenario 5: Validation Error in Bulk Mode
**Given** a facilitator has 3 entries in bulk mode  
**And** entry 2 is missing the title  
**When** they try to submit  
**Then** they see "Please fill in all required fields for all use cases"  
**And** the form does not submit  
**When** they fill in the missing title  
**And** submit again  
**Then** all 3 use cases are added successfully

### Scenario 6: Remove Entry in Bulk Mode
**Given** a facilitator has 4 entries in bulk mode  
**When** they click "Remove" on entry 3  
**Then** entry 3 is removed  
**And** they now have 3 entries  
**When** they try to remove the last remaining entry  
**Then** they see "You must have at least one use case"  
**And** the entry is not removed

---

## Technical Implementation

### Frontend Components

**New Component:**
- `BulkUseCaseForm.tsx` - Bulk use case entry form
  - Multiple entry management
  - CSV import/export
  - Validation
  - Parallel submission

**Updated Components:**
- `WorkshopDetail.tsx` - Added dual-mode support
  - New state: `addMode` ('single' | 'bulk')
  - New handler: `handleBulkSubmitUseCases`
  - Updated modal with mode toggle
  - Conditional rendering based on mode

### Component Structure

```typescript
// BulkUseCaseForm.tsx
interface BulkUseCaseFormProps {
    onSubmit: (useCases: UseCaseData[]) => Promise<void>;
    onSuccess?: () => void;
}

interface BulkUseCaseEntry extends UseCaseData {
    tempId: string; // For React key management
}

// Features:
- useState for managing array of use cases
- addUseCase() - Add new entry
- removeUseCase(tempId) - Remove entry
- updateUseCase(tempId, field, value) - Update specific entry
- handleCSVImport() - Parse and populate from CSV
- downloadTemplate() - Generate CSV template
- handleSubmit() - Validate and submit all entries
```

### API Integration

**Endpoint Used:**
```typescript
POST /api/usecases/
Request: {
    title: string,
    description: string,
    proposed_solution: string,
    kpi: string,
    target_user: string,
    category: string,
    workshop_id: string,
    added_by_facilitator: true
}
```

**Bulk Submission:**
```typescript
const handleBulkSubmitUseCases = async (useCases: UseCaseData[]) => {
    const promises = useCases.map(data => 
        api.post('usecases/', {
            ...data,
            workshop_id: id,
            added_by_facilitator: true
        })
    );
    await Promise.all(promises);
};
```

### CSV Format

**Template Structure:**
```csv
Title,Description,Proposed Solution,KPI,Target User,Category
"Sample Use Case","Problem description","Solution description","Expected benefit","End users","Generative AI"
```

**Import Logic:**
- Parse CSV using FileReader
- Split by newlines and commas
- Skip header row
- Trim and remove quotes from values
- Create BulkUseCaseEntry objects
- Filter out empty rows

---

## UI/UX Design

### Modal Layout

**Header:**
- Title: "Add Use Case" or "Add Multiple Use Cases"
- Mode toggle buttons (Single/Multiple)
- Close button (X)

**Single Mode:**
- Standard vertical form layout
- AI enhancement buttons inline
- Full width (max-w-2xl)

**Bulk Mode:**
- Wider modal (max-w-4xl)
- Import/Export controls at top
- Scrollable entry list
- "Add Another" button at bottom
- Submit button shows count

### Visual Elements

**Mode Toggle:**
- Pill-style buttons
- Active: Purple background, white text
- Inactive: Gray background, gray text
- Smooth transition

**Entry Cards:**
- Light background border
- Numbered headers (Use Case #1, #2, etc.)
- Remove button (red, top-right)
- Compact field layout

**Import Controls:**
- Icon + label design
- Download Template: Upload icon
- Import CSV: Upload icon
- Secondary button style

---

## Testing Requirements

### Unit Tests
- BulkUseCaseForm component rendering
- Add/remove entry logic
- CSV parsing accuracy
- Validation rules
- Form state management

### Integration Tests
- Single use case submission
- Bulk use case submission
- CSV import flow
- Mode switching
- Error handling

### UI Tests
- Modal opening in correct mode
- Mode toggle functionality
- Entry add/remove interactions
- CSV file upload
- Template download
- Form validation display

---

## Performance Considerations

- Parallel API calls for bulk submission (Promise.all)
- Efficient state updates for large entry lists
- CSV parsing in browser (no server upload needed)
- Debounced validation for better UX
- Virtual scrolling for 50+ entries (future enhancement)

---

## Security Considerations

- Client-side CSV parsing (no file upload to server)
- Same validation as single mode
- Facilitator authentication required
- Workshop ownership verification
- XSS prevention in CSV data

---

## Accessibility

- Keyboard navigation for all controls
- Focus management in modal
- ARIA labels for buttons
- Screen reader announcements for entry count
- Error messages associated with fields

---

## Future Enhancements

1. **AI Bulk Enhancement:** Apply AI enhancements to all entries at once
2. **Excel Import:** Support .xlsx files
3. **Duplicate Detection:** Check for duplicates across bulk entries
4. **Field Auto-fill:** Smart suggestions based on previous entries
5. **Drag-and-Drop:** Reorder entries before submission
6. **Save as Draft:** Save bulk entries without submitting
7. **Import from URL:** Fetch use cases from external source

---

## Related User Stories

- US13: Facilitator Survey Management & Real-Time Analytics
- US02: Workshop Creation and Configuration
- US03: Use Case Submission Interface

---

## Implementation Summary

### Files Created
- `client/src/components/BulkUseCaseForm.tsx` (new)

### Files Modified
- `client/src/pages/WorkshopDetail.tsx`
  - Added `BulkUseCaseForm` import
  - Added `addMode` state
  - Added `handleBulkSubmitUseCases` handler
  - Updated modal to support mode switching
  - Added "Add Multiple" button

### Key Features Delivered
✅ Single and bulk use case addition  
✅ CSV template download  
✅ CSV import functionality  
✅ Mode switching in modal  
✅ Dynamic entry management  
✅ Parallel submission  
✅ Comprehensive validation  
✅ User-friendly error messages  

---

## Screenshots

### Single Mode
- Standard use case form with AI enhancements
- Clean, focused interface

### Bulk Mode
- Multiple entry cards
- Import/export controls
- Entry counter
- Add/remove buttons

### CSV Template
- Headers with sample data
- Ready for offline preparation

---

## Success Metrics

- Time to add 10 use cases: < 2 minutes (vs 10+ minutes manually)
- CSV import success rate: > 95%
- User satisfaction: Positive feedback from facilitators
- Adoption rate: 60%+ of workshops use bulk addition

---

## Notes

This feature significantly improves facilitator productivity by providing flexible options for use case management. The dual-mode interface ensures both quick single additions and efficient bulk imports are supported without context switching between different screens.
