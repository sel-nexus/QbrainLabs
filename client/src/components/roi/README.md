# ROI Calculator Components

This directory contains the comprehensive ROI Calculator feature (US17) for the Hotspot Matrix application.

## Components Overview

### Core Components

#### `ROICalculator.tsx`
Main calculator component with tabbed interface for organizing all ROI-related functionality.

**Features:**
- Cost/benefit input forms
- Financial metrics calculation
- Tab navigation (Calculator, Scenarios, Sensitivity, Benchmarks, Business Case)
- AI-assisted estimation
- Save/load functionality

**Props:**
```typescript
interface ROICalculatorProps {
    workshopId: string;
    useCaseId: string;
    initialData?: {
        costs?: CostInputs;
        benefits?: BenefitInputs;
        parameters?: ROIParameters;
    };
    onSaveSuccess?: () => void;
}
```

---

#### `CostBenefitForms.tsx`
Input forms for cost and benefit parameters.

**Features:**
- Cost inputs (implementation, infrastructure, licensing, training, maintenance rate)
- Benefit inputs (time savings, hourly rate, revenue impact, cost avoidance, productivity gain)
- Financial parameters (discount rate, project years, inflation rate)
- Real-time validation

---

#### `ROIResultsDisplay.tsx`
Visual display of ROI calculation results.

**Features:**
- Metric cards (ROI%, NPV, Payback, IRR, TCO)
- Cumulative cash flow area chart
- Cost structure pie chart
- Recharts integration

---

### Advanced Components

#### `ScenarioModeler.tsx`
What-if scenario analysis and comparison.

**Features:**
- Template scenarios (Conservative 50%, Expected 100%, Optimistic 150%)
- Custom scenario builder
- Variable adjustment interface
- Side-by-side comparison
- Real-time recalculation

**Usage:**
```tsx
<ScenarioModeler
    baseCosts={costs}
    baseBenefits={benefits}
    baseParameters={parameters}
    baseResults={results}
/>
```

---

#### `SensitivityAnalysis.tsx`
Sensitivity analysis with tornado diagrams.

**Features:**
- Tornado diagram visualization
- Variable impact ranking
- Configurable variance (±10%, ±20%, ±30%, ±50%)
- ROI range calculation
- Key insights generation

**Usage:**
```tsx
<SensitivityAnalysis
    costs={costs}
    benefits={benefits}
    parameters={parameters}
    baseResults={results}
/>
```

---

#### `BenchmarkPanel.tsx`
Industry benchmark comparisons.

**Features:**
- Performance percentile calculation
- Metric selection (ROI % / Payback)
- Benchmark charts (bar charts with reference lines)
- Detailed benchmark tables
- Performance badges

**Usage:**
```tsx
<BenchmarkPanel
    useCaseType="AI Implementation"
    industry="Technology"
    currentROI={results.roi_percent}
    currentPayback={results.payback_months}
/>
```

---

#### `BusinessCaseGenerator.tsx`
AI-powered business case document generator.

**Features:**
- Template selection (Formal, Startup, Consulting, Executive)
- Section customization (9 available sections)
- Branding options (company name, logo, colors)
- AI content generation
- Document preview
- Export functionality (PDF, Word, Google Docs)

**Usage:**
```tsx
<BusinessCaseGenerator
    useCaseId={useCaseId}
    roiCalculationId={roiId}
    roiResults={results}
    useCaseTitle="My Use Case"
    useCaseDescription="Description..."
/>
```

---

### Utility Components

#### `ROICalculatorModal.tsx`
Modal wrapper for the ROI Calculator.

**Usage:**
```tsx
<ROICalculatorModal
    isOpen={isOpen}
    onClose={handleClose}
    workshopId={workshopId}
    useCaseId={useCaseId}
    useCaseTitle="My Use Case"
/>
```

---

#### `ROIComparisonView.tsx`
Portfolio comparison across multiple use cases.

**Features:**
- Multi-use case ranking
- ROI % bar chart
- TCO vs NPV scatter plot
- Comparison table

**Usage:**
```tsx
<ROIComparisonView
    workshopId={workshopId}
    useCases={useCases}
/>
```

---

## Type Definitions

All type definitions are in `client/src/types/roi.ts`:

```typescript
// Core types
interface CostInputs { ... }
interface BenefitInputs { ... }
interface ROIParameters { ... }
interface ROIResults { ... }
interface AnnualData { ... }
interface ROIChartData { ... }

// Defaults
const DEFAULT_COSTS: CostInputs
const DEFAULT_BENEFITS: BenefitInputs
const DEFAULT_PARAMS: ROIParameters
```

---

## API Integration

### Endpoints Used

```typescript
// Calculate ROI without saving
POST /api/roi/calculate-only
Body: { costs, benefits, parameters }
Response: ROIResults

// Save ROI calculation
POST /api/roi/workshops/{workshopId}/usecases/{useCaseId}
Body: { use_case_id, costs, benefits, parameters }
Response: ROICalculationResponse

// Get ROI calculation
GET /api/roi/workshops/{workshopId}/usecases/{useCaseId}
Response: ROICalculationResponse

// Get all workshop ROIs
GET /api/roi/workshops/{workshopId}
Response: ROICalculationResponse[]

// AI-assisted estimation
POST /api/roi/estimate
Body: { use_case_id, industry?, company_size? }
Response: ROIEstimatesResponse

// Generate business case
POST /api/roi/business-case/generate
Body: { use_case_id, roi_calculation_id, template, sections, branding }
Response: BusinessCaseResponse
```

---

## Styling

All components use:
- **TailwindCSS** for styling
- **Dark mode support** via `dark:` variants
- **Responsive design** with mobile-first approach
- **Consistent color scheme:**
  - Primary: Indigo (`indigo-600`)
  - Success: Green (`green-600`)
  - Warning: Amber (`amber-600`)
  - Danger: Red (`red-600`)

---

## Charts & Visualizations

Powered by **Recharts**:

- **Area Charts:** Cumulative cash flow
- **Pie Charts:** Cost/benefit breakdown
- **Bar Charts:** ROI comparison, tornado diagrams, benchmarks
- **Scatter Charts:** Portfolio TCO vs NPV

All charts support:
- Dark mode
- Tooltips
- Responsive resizing
- Custom colors

---

## State Management

Components use React hooks for state:
- `useState` for local state
- `useEffect` for data fetching
- No global state management (props-based)

---

## Error Handling

All API calls include:
- Try-catch blocks
- Toast notifications (via `sonner`)
- Loading states
- Graceful degradation

---

## Testing

### Unit Testing
```bash
cd client
npm test src/components/roi
```

### E2E Testing
```bash
cd client
npx playwright test e2e/roi-calculator.spec.ts
```

---

## Performance Considerations

- **Lazy Loading:** Components load on-demand via tabs
- **Memoization:** Chart data is memoized to prevent re-renders
- **Debouncing:** Input changes are debounced for API calls
- **Code Splitting:** Large components are dynamically imported

---

## Accessibility

All components include:
- **Keyboard navigation**
- **ARIA labels**
- **Focus management**
- **Color contrast** (WCAG AA compliant)
- **Screen reader support**

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Known Issues

1. **Benchmark Data:** Currently uses mock data (production API integration pending)
2. **Export Functionality:** UI-only (backend document generation pending)
3. **Use Case Metadata:** Requires use case API endpoint

---

## Future Enhancements

- Monte Carlo simulation
- Historical ROI tracking
- ERP integration
- Advanced benchmarking
- Presentation generator
- Email sharing

---

## Contributing

When adding new features:

1. Follow existing component patterns
2. Use TypeScript for type safety
3. Include dark mode support
4. Add responsive design
5. Include loading/error states
6. Update this README
7. Add unit tests

---

## Support

For questions or issues:
- Check `/docs/US17_IMPLEMENTATION_SUMMARY.md`
- Review `/docs/userstories/US17_roi_calculator_business_case.md`
- Contact the development team

---

Last Updated: January 25, 2026
