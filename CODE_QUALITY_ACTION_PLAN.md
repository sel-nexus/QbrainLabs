# Code Quality Action Plan — QbrainLabs Backend

> Generated: 2026-03-28
> Scope: `/server/app/` — 123 Python files reviewed

---

## Priority 1 — Critical (Fix Immediately)

### 1. Missing `await` — Rate Limiting Broken
**File:** `core/security.py:319`

```python
# BUG — current code
if not limiter.is_allowed(client_ip):

# FIX
if not await limiter.is_allowed(client_ip):
```

Rate limiting silently does nothing in production.

---

### 2. Bare `except:` Clauses (25 instances)

Catches all exceptions including `KeyboardInterrupt` and `SystemExit`, hiding real bugs.

| File | Lines |
|------|-------|
| `services/rag_service.py` | 268, 360, 423, 502, 540 |
| `services/copilot_service.py` | 189 |
| `services/roi_service.py` | 93 |
| `api/results.py` | 97 |

**Fix:** Replace with specific exception types:
```python
# Instead of:
except:

# Use:
except (json.JSONDecodeError, KeyError) as e:
    logger.error("Failed to parse response", error=str(e))
```

---

### 3. Faulty Cache Eviction Logic
**File:** `core/caching.py:59–63`

```python
# BUG — assumes dict insertion order == age
keys_to_remove = list(_memory_cache.keys())[:100]
```

**Fix:** Use `collections.OrderedDict` or store insertion timestamps alongside values and evict by actual age.

---

## Priority 2 — High

### 4. Replace 150+ `print()` Calls with Structured Logging

The project already has `structlog` set up — it is not being used consistently.

**Worst offenders:**

| File | Lines | Issue |
|------|-------|-------|
| `services/rag_service.py` | 10–48 | Startup sequence uses `print("="*60)` and raw dumps |
| `core/socket_manager.py` | 95, 97, 99 | Socket connection events use print |
| `services/copilot_service.py` | 46 | `print("CopilotService running in MOCK MODE...")` |

**Fix:**
```python
# Instead of:
print("RAG service initialized")

# Use:
logger = structlog.get_logger(__name__)
logger.info("rag_service_initialized")
```

---

### 5. Line Length Violations (300+ lines exceed 88 chars)

| File | ~Count |
|------|--------|
| `api/admin.py` | 75 lines |
| `api/facilitators.py` | 40 lines |
| `api/data_sources.py` | 44 lines |
| `api/knowledge_base.py` | 39 lines |
| `api/copilot.py` | 21 lines |
| `services/rag_service.py` | 20 lines |

**Fix:** Run autoformatters:
```bash
pip install black ruff
black server/
ruff check --select E501 --fix server/
```

---

## Priority 3 — Medium

### 6. Extract Repeated DB Query Pattern

This block appears in 6+ files (`surveys.py`, `knowledge_base.py`, `participants.py`, `results.py`, etc.):

```python
result = await db.execute(select(Model).where(Model.id == id))
item = result.scalars().first()
if not item:
    raise HTTPException(status_code=404, detail="X not found")
```

**Fix:** Add a shared helper (e.g. in `core/db_utils.py`):

```python
async def get_or_404(
    db: AsyncSession,
    model: type,
    id: int,
    name: str,
) -> Any:
    result = await db.execute(select(model).where(model.id == id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{name} not found")
    return obj
```

---

### 7. Functions Too Long / Doing Too Much

| File | Function | ~Lines | Problem |
|------|----------|--------|---------|
| `services/rag_service.py` | `_initialize_real_components()` | 97 | Initializes Azure OpenAI, OpenAI, embeddings, and vector store in one block |
| `services/rag_service.py` | `enhance_use_case()` | 82 | Retrieval + prompting + JSON parsing + error handling |
| `services/copilot_service.py` | `_generate_intake_suggestions()` | 65 | Engagement + volume + theme detection + duplicate check |
| `api/admin.py` | `preview_import_use_cases()` | 94 | File parsing + industry classification + preview generation |
| `api/admin.py` | `get_system_stats()` | 61 | Gathers unrelated metrics in one function |

**Fix:** Break into smaller single-responsibility functions, each doing one thing.

---

### 8. God Object — `models/models.py` (501 lines, 49+ classes)

All enums, core models, and feature models are in a single file.

**Suggested split:**

| New File | Contents |
|----------|----------|
| `models/enums.py` | `UserRole`, `WorkshopStatus`, `WorkshopPhase`, `SuggestionType`, etc. |
| `models/core.py` | `User`, `Workshop`, `Participant`, `UseCase`, `Vote` |
| `models/copilot.py` | `CopilotSuggestion`, `CopilotSettings`, `DetectedAnomaly` |
| `models/analytics.py` | `ParticipantEngagement`, `WorkshopSummary` |

---

### 9. Hardcoded Values That Should Be Config

| File | Line | Issue |
|------|------|-------|
| `core/network_utils.py` | 104–107 | `localhost:5173`, `localhost:3000` hardcoded — should come from env/config |
| `middleware/security.py` | 95–101 | SQL injection pattern strings hardcoded in middleware — move to constants |
| `api/knowledge_base.py` | 32 | `provider: str = "perplexity"` — magic string, should be a constant |
| `services/rag_service.py` | 156 | `"invoice"` keyword hardcoded in matching logic |

---

### 10. Missing Type Hints

| File | Location | Issue |
|------|----------|-------|
| `middleware/error_handler.py` | 104–110, 133, 148 | Return types missing on exception handler functions |
| `core/socket_manager.py` | 52, 56 | `data: any` — lowercase `any` is a Python built-in (a function), not a type annotation; should be `data: Any` from `typing` |

---

## Priority 4 — Low

### 11. Unused Imports — `api/auth.py`

```python
# Lines 6, 9, 10, 11 — never used:
from sqlalchemy.exc import OperationalError
import asyncio
import base64
import json
```

### 12. Duplicate Import — `api/auth.py`

```python
# Appears on both line 25 and line 38:
from app.core.security import hash_password, verify_password, PasswordValidator
```

### 13. Import Order Violations

`api/auth.py` and several other files mix stdlib, third-party, and local imports without blank-line separation.

Correct order per PEP8 / isort:
```
stdlib → third-party → local
```

Run `isort server/` to fix automatically.

### 14. Vague Naming

| File | Symbol | Fix |
|------|--------|-----|
| `core/socket_manager.py:60` | `manager` | Rename to `socket_manager` |
| `api/admin.py:591` | `_int(v)` | Rename to `_parse_int(v)` |

---

## Summary Table

| Category | Count | Severity |
|----------|-------|----------|
| Missing `await` / logic bugs | 3 | **Critical** |
| Bare `except:` clauses | 25 | **Critical** |
| `print()` instead of logging | 150+ | High |
| Line length > 88 chars | 300+ | High |
| Functions > 50 lines | 12+ | Medium |
| Repeated DB query pattern | 6+ files | Medium |
| God object (`models.py`) | 1 | Medium |
| Hardcoded config values | 10+ | Medium |
| Missing type hints | 15+ | Medium |
| Unused/duplicate imports | 8+ | Low |
| Vague naming | 4+ | Low |

---

## Recommended Fix Order

```
1. Fix `await` bug in core/security.py:319
2. Replace all 25 bare `except:` with specific exception types
3. Replace all print() calls with structlog logger calls
4. Run: black server/ && isort server/ && ruff check --fix server/
5. Extract get_or_404() helper to eliminate repeated DB query pattern
6. Break up long functions in rag_service.py, copilot_service.py, admin.py
7. Split models/models.py into 4 focused files
8. Move hardcoded values to config/constants
9. Add missing type hints to middleware and socket_manager
10. Clean up unused and duplicate imports in auth.py
```
