# Testing Documentation

## Overview
This document describes the comprehensive testing strategy for the Qbrain AI Labs application, covering unit tests, integration tests, and end-to-end (E2E) tests.

## Test Coverage Goals
- **Unit Tests**: >80% code coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user workflows

## Backend Testing (Python/FastAPI)

### Test Framework
- **pytest**: Main testing framework
- **pytest-asyncio**: For async test support
- **httpx**: For API testing
- **SQLAlchemy**: In-memory SQLite for test database

### Running Backend Tests

```bash
# Run all tests
cd server
pytest

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term

# Run specific test file
pytest tests/test_settings_service.py

# Run specific test
pytest tests/test_settings_service.py::TestSettingsService::test_get_setting

# Run only integration tests
pytest -m integration

# Run only unit tests
pytest -m "not integration"

# Run with verbose output
pytest -v

# Run in parallel (faster)
pytest -n auto
```

### Test Structure

```
server/tests/
├── conftest.py                      # Shared fixtures
├── test_settings_service.py         # Settings service unit tests
├── test_api_settings.py             # Settings API integration tests
├── test_api_subscription.py         # Subscription & feature flags tests
├── test_api_auth.py                 # Authentication tests
├── test_api_workshops.py            # Workshop API tests
├── test_api_surveys.py              # Survey API tests
├── test_api_organizations.py        # Organization API tests
├── test_api_marketplace.py          # Marketplace API tests
├── test_api_analytics.py            # Analytics API tests
├── test_rbac.py                     # RBAC tests
├── test_us32_facilitator_approval.py # Facilitator approval tests
└── test_auth_guards.py              # Auth guard tests
```

### Key Test Files

#### 1. `test_settings_service.py`
- Tests settings CRUD operations
- Tests caching mechanism
- Tests validation rules
- Tests audit logging
- Coverage: Settings service (US33)

#### 2. `test_api_settings.py`
- Tests all settings API endpoints
- Tests admin authentication
- Tests authorization (admin-only access)
- Tests concurrent updates
- Coverage: Settings API (US33)

#### 3. `test_api_subscription.py`
- Tests subscription tier CRUD
- Tests feature flag CRUD
- Tests organization-specific overrides
- Coverage: Subscription & feature flags (US33)

### Writing New Tests

```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
class TestMyFeature:
    """Test description"""

    async def test_something(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test specific functionality"""
        response = await client.get(
            "/api/endpoint",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "expected_field" in data
```

## Frontend Testing (React/TypeScript)

### Test Framework
- **Vitest**: Fast unit test runner
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **@testing-library/jest-dom**: DOM matchers

### Running Frontend Tests

```bash
# Run all unit tests
cd client
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests in specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### E2E Test Plan

See `docs/testing/E2E_TEST_PLAN.md` for the full E2E architecture, scope, and
out-of-scope list. Required environment variable before running
`npm run test:e2e` locally:

```bash
export E2E_ADMIN_PASSWORD=<password for your local admin@qbrainlabs.com account>
```

Optional overrides: `E2E_ADMIN_EMAIL` (defaults to `admin@qbrainlabs.com`),
`PLAYWRIGHT_API_URL` (defaults to `http://localhost:8000`).

### Test Structure

```
client/
├── src/test/
│   ├── setup.ts                     # Test setup and mocks
│   ├── test-utils.tsx               # Testing utilities
│   └── AdminSettings.test.tsx       # Component unit tests
└── e2e/
    ├── auth.spec.ts                 # Login, route guard E2E tests
    ├── workshop-lifecycle.spec.ts   # Workshop creation/phase E2E tests
    ├── participant-flow.spec.ts     # Participant join/scoring E2E tests
    └── admin-settings.spec.ts       # E2E tests
```

### Key Test Files

#### 1. `AdminSettings.test.tsx`
- Tests component rendering
- Tests user interactions
- Tests API calls
- Tests error handling
- Coverage: AdminSettings component (US33)

#### 2. `admin-settings.spec.ts`
- Tests complete user workflows
- Tests authentication flows
- Tests admin panel navigation
- Tests facilitator management
- Tests responsive design
- Coverage: Critical user journeys

### Writing New Component Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyComponent } from '../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    render(<MyComponent />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });
});
```

### Writing New E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
    await page.goto('/login');
    // Login, etc.
  });

  test('should do something', async ({ page }) => {
    await page.goto('/feature');
    
    await expect(page.locator('h1')).toContainText('Expected');
    
    await page.click('button');
    
    await expect(page).toHaveURL('/result');
  });
});
```

## Test Data Management

### Backend Test Data
- Uses in-memory SQLite database
- Fresh database for each test
- Fixtures provide reusable test data
- Automatic rollback after each test

### Frontend Test Data
- Mocked API responses
- Mocked localStorage
- Mocked browser APIs (matchMedia, ResizeObserver, etc.)

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd server
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-asyncio
      - name: Run tests
        run: |
          cd server
          pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd client
          npm ci
      - name: Run unit tests
        run: |
          cd client
          npm run test:coverage
      - name: Run E2E tests
        run: |
          cd client
          npx playwright install --with-deps
          npm run test:e2e

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Playwright
        run: |
          cd client
          npx playwright install --with-deps
      - name: Run E2E tests
        run: |
          cd client
          npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: client/playwright-report/
```

## Test Coverage Reports

### Backend Coverage
```bash
cd server
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

### Frontend Coverage
```bash
cd client
npm run test:coverage
open coverage/index.html
```

## Best Practices

### General
1. **Test Naming**: Use descriptive names that explain what is being tested
2. **AAA Pattern**: Arrange, Act, Assert
3. **One Assertion Per Test**: Focus on testing one thing
4. **Independent Tests**: Tests should not depend on each other
5. **Fast Tests**: Keep tests fast to encourage frequent running

### Backend
1. **Use Fixtures**: Reuse common setup code
2. **Mock External Services**: Don't call real APIs in tests
3. **Test Edge Cases**: Include boundary conditions
4. **Test Error Handling**: Verify error responses
5. **Use Markers**: Mark tests as unit, integration, slow, etc.

### Frontend
1. **Test User Behavior**: Test what users see and do
2. **Avoid Implementation Details**: Don't test internal state
3. **Use Semantic Queries**: Use getByRole, getByLabelText, etc.
4. **Wait for Async**: Use waitFor for async operations
5. **Mock API Calls**: Mock fetch/axios calls

### E2E
1. **Test Critical Paths**: Focus on important user journeys
2. **Use Page Objects**: Organize selectors and actions
3. **Stable Selectors**: Use data-testid or semantic selectors
4. **Clean State**: Reset state between tests
5. **Parallel Execution**: Run tests in parallel when possible

## Debugging Tests

### Backend
```bash
# Run with print statements visible
pytest -s

# Run with debugger
pytest --pdb

# Run specific test with verbose output
pytest -vv tests/test_file.py::test_name
```

### Frontend Unit Tests
```bash
# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui
```

### E2E Tests
```bash
# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode (step through)
npm run test:e2e:debug

# Generate trace
npm run test:e2e -- --trace on
```

## Test Maintenance

### Regular Tasks
1. **Update Dependencies**: Keep testing libraries up to date
2. **Review Coverage**: Aim for >80% coverage
3. **Fix Flaky Tests**: Investigate and fix intermittent failures
4. **Refactor Tests**: Keep tests clean and maintainable
5. **Update Documentation**: Keep this doc current

### When to Write Tests
1. **New Features**: Write tests before or alongside code
2. **Bug Fixes**: Write a failing test first, then fix
3. **Refactoring**: Ensure tests pass before and after
4. **Critical Paths**: Always have E2E tests for critical flows

## Test Metrics

### Current Coverage (as of US33 implementation)
- **Backend Unit Tests**: ~75%
- **Backend Integration Tests**: ~85%
- **Frontend Unit Tests**: ~60%
- **E2E Tests**: Critical paths covered

### Goals
- **Backend**: >80% coverage
- **Frontend**: >75% coverage
- **E2E**: All critical user journeys

## Troubleshooting

### Common Issues

#### Backend
- **Database errors**: Check that test database is properly initialized
- **Async errors**: Ensure using `@pytest.mark.asyncio`
- **Import errors**: Check PYTHONPATH and module structure

#### Frontend
- **Component not rendering**: Check mocks and providers
- **Async timeout**: Increase timeout in waitFor
- **DOM not found**: Use correct query methods

#### E2E
- **Selector not found**: Use more stable selectors
- **Timeout**: Increase timeout or wait for specific condition
- **Flaky tests**: Add proper waits, avoid hardcoded delays

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
