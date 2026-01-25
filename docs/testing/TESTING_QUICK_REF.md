# Testing Quick Reference

## 🚀 Quick Start

### Backend Tests
```bash
cd server

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific file
pytest tests/test_settings_service.py

# Run specific test
pytest tests/test_settings_service.py::TestSettingsService::test_get_setting

# Run in parallel (faster)
pytest -n auto
```

### Frontend Tests
```bash
cd client

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E in headed mode (see browser)
npm run test:e2e:headed
```

## 📊 Test Markers

### Backend
```bash
# Run only unit tests
pytest -m "not integration"

# Run only integration tests
pytest -m integration

# Run slow tests
pytest -m slow
```

## 🔍 Debugging

### Backend
```bash
# Show print statements
pytest -s

# Enter debugger on failure
pytest --pdb

# Verbose output
pytest -vv
```

### Frontend
```bash
# Watch mode
npm run test:watch

# Debug E2E
npm run test:e2e:debug
```

## 📈 Coverage

### Backend
```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

### Frontend
```bash
npm run test:coverage
open coverage/index.html
```

## 🎯 Common Commands

### Run Everything
```bash
# Backend
cd server && pytest --cov=app

# Frontend
cd client && npm test && npm run test:e2e
```

### CI/CD Simulation
```bash
# Backend
pytest --cov=app --cov-report=xml -n auto

# Frontend
npm run test:coverage && npm run test:e2e
```

## 📝 Test Files

### Backend
- `tests/test_settings_service.py` - Settings service unit tests
- `tests/test_api_settings.py` - Settings API integration tests
- `tests/test_api_subscription.py` - Subscription & feature flags tests
- `tests/test_rbac.py` - RBAC tests
- `tests/test_us32_facilitator_approval.py` - Facilitator tests

### Frontend
- `src/test/AdminSettings.test.tsx` - Component unit tests
- `e2e/admin-settings.spec.ts` - E2E tests

## 🛠️ Troubleshooting

### Backend
**Issue**: Import errors
```bash
# Fix: Check PYTHONPATH
export PYTHONPATH=$PWD
```

**Issue**: Database errors
```bash
# Fix: Tests use in-memory SQLite, no setup needed
```

### Frontend
**Issue**: Module not found
```bash
# Fix: Install dependencies
npm ci
```

**Issue**: Playwright browsers missing
```bash
# Fix: Install browsers
npx playwright install --with-deps
```

## 📚 Documentation
- Full guide: `docs/TESTING.md`
- Implementation summary: `docs/TESTING_IMPLEMENTATION_SUMMARY.md`
