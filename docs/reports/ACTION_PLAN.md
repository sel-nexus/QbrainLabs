# QbrainLabs Backend — Prioritized Action Plan

Generated from a full session audit covering security, logic bugs, performance, code quality, and test coverage.

Items marked ✅ were addressed in this session. Unmarked checkboxes are open work.

---

## 1. Fix Immediately
> Data loss, security vulnerabilities, runtime crashes, or silent corruption

### Security

- ✅ **`main.py`** — `CORSMiddleware` import was missing; app crashed at startup when `ENABLE_DYNAMIC_CORS=false`
- ✅ **`main.py`** — Public IP `48.214.144.154` hardcoded in CORS origins; moved to `PRODUCTION_CORS_ORIGINS` env var
- ✅ **`main.py`** — `allow_credentials=True` + `allow_headers=["*"]` violates CORS spec; restricted to explicit header list
- ✅ **`core/network_utils.py`** — DNS rebinding: `socket.gethostbyname()` on Origin headers accepted attacker-controlled IPs; added `TRUSTED_ORIGIN_HOSTNAMES` allowlist
- ✅ **`core/socket_manager.py`** — WebSocket CORS silently fell back to `"*"` on empty origins list; now raises `ValueError` at startup
- ✅ **`core/config_production.py`** — Known dev secret key `"dev-secret-key-not-for-production-use-only"` passed length validator (46 chars); added explicit value check
- ✅ **`core/security.py`** — Rate limiter `is_allowed()` was called without `await`; rate limiting was completely non-functional
- ✅ **`services/settings_service.py`** — API keys and passwords logged in plaintext; applied `_mask_if_sensitive()` to logs and audit table
- ✅ **`services/file_service.py`** — File type validated by extension only; malicious `.xlsx` renamed to `.csv` bypassed checks; added `filetype` magic-byte validation
- [ ] **`api/votes.py:38`** — `submit_vote()` accepts any UUID as `participant_id` with no existence check. Phantom votes from non-existent participants are committed to the DB and corrupt results. **Fix:** add `await get_or_404(db, Participant, vote_in.participant_id, "Participant")` before line 64. _(Test written; currently fails to document the bug.)_
- [ ] **`api/votes.py:267`** — `DELETE /api/votes/` has no authentication or authorization check. Any caller (unauthenticated) can delete any vote. **Fix:** add `current_user: User = Depends(get_current_user)` and verify the participant belongs to the caller or user is a facilitator of the workshop.
- [ ] **`app/models/models.py` + Alembic** — DB indexes declared in model `__table_args__` this session but the Alembic migration has not been run. Until the migration runs, all FK-column queries are full table scans. **Fix:** `alembic revision --autogenerate -m "add_fk_indexes" && alembic upgrade head`
- [ ] **`services/rag_service.py:972,1180`** — Two additional `requests.post()` blocking HTTP calls remain (the session fixed lines 1023 and 1229 only). These stall the async event loop. **Fix:** replace both with `httpx.AsyncClient` same as the other two.
- [ ] **JWT — no token revocation** — `logout` endpoint logs the action but tokens remain valid until expiry (default 30 days). A stolen token gives full access for up to a month. **Fix options:** (a) reduce `ACCESS_TOKEN_EXPIRE_MINUTES` to 60–480 minutes, (b) add a Redis revocation list keyed by `jti`, checked in `decode_access_token()`.

### Runtime Crashes

- ✅ **`api/results.py:24,37`** — `workshop.config.get()` called when `workshop.config` is `NULL`; added `ws_config = workshop.config or {}`
- ✅ **`services/copilot_service.py:185`** — `content.split("```json")[1]` raises `IndexError` when LLM omits fences; replaced with `re.search`
- ✅ **`services/rag_service.py:151`** — `self.reference_data[0]` used as fallback when list is empty; replaced with `None` guard + early return
- ✅ **`api/admin.py:1148,1150`** — SQLAlchemy `== None` / `!= None` generates `= NULL` in SQL, returning 0 rows silently; replaced with `.is_(None)` / `.isnot(None)`
- [ ] **`api/results.py:65`** — `float(score)` crashes with `ValueError` if any vote stores a non-numeric score value. The entire results endpoint returns 500. **Fix:** wrap in `try/except ValueError` and skip or default to 0.
- [ ] **`services/roi_service.py`** — No input validation at all. Negative costs, zero `project_years`, and `discount_rate > 1.0` all produce nonsensical or mathematically invalid results that silently pass through to the client. **Fix:** add Pydantic validators to `CostInputs`, `BenefitInputs`, `ROIParameters` with `ge=0` constraints and sane max bounds.

### Data Integrity

- ✅ **`core/security.py:145`** — Redis `incr` + `expire` were not atomic; under load, the TTL was never set and rate limit keys persisted forever. Replaced with a pipeline.
- ✅ **`services/rag_service.py:151`** — Boolean precedence `or X and Y` evaluated incorrectly (and binds tighter than or); added parentheses
- ✅ **`api/votes.py:59`** — Shallow `.copy()` on `existing_vote.scores` dict shared nested references; replaced with `copy.deepcopy()`

---

## 2. Fix Soon
> Quality, maintainability, correctness issues that will cause bugs or slow down development

### Correctness Bugs

- ✅ **`services/roi_service.py:129`** — `(curr - prev) / (prev + 0.0001)` epsilon guard introduced calculation error when `prev` is large; replaced with explicit zero-check
- ✅ **`services/rag_service.py:205`** — Regex `\{[^{}]*\}` rejected nested JSON like `{"key": {"a": 1}}`; replaced with try-`json.loads` first, then `\{.*\}` fallback
- [ ] **`services/roi_service.py` — TCO formula** — `total_cost_of_ownership` subtracts benefits from costs, which is net cost, not TCO. TCO should be total costs only. Fix the calculation and update the response schema description.
- [ ] **`services/roi_service.py` — silent IRR failure** — When `npf.irr()` returns NaN (no breakeven), the code silently sets `irr = 0.0`. Clients see 0% IRR instead of "not calculable." Return `null` or a flag field.
- [ ] **`api/auth.py` — PENDING account login UX** — PENDING users receive a valid JWT from `/login` but are then blocked by `get_current_active_user` on every protected route. Consider either: (a) blocking login for PENDING accounts with a specific 403 message, or (b) documenting this as intentional and keeping the current behavior. Currently undocumented and confusing.

### Performance (fixes applied; migration outstanding)

- ✅ **`api/admin.py:133`** — N+1 query (2 queries per workshop in listing loop); replaced with correlated subqueries
- ✅ **`services/copilot_service.py:1279`** — O(n²) duplicate detection; capped at 30 candidates and pre-normalized strings
- ✅ **`services/copilot_service.py:415,597,686,938`** — O(n×m) per-participant linear scans in 4 functions; replaced with dict-indexed lookups
- ✅ **`api/gamification.py:55`** — 4–6 sequential badge queries per vote; replaced with 2 batch queries + dict lookup
- [ ] **`api/usecases.py:223`** — Per-workshop DB queries inside a loop when linking a use case to multiple workshops. **Fix:** use `WHERE workshop_id IN (...)` + single access check.
- [ ] **`api/analytics_dashboard.py:42`** — `.participants` relationship accessed without `selectinload`; may trigger lazy loads. **Fix:** add `.options(selectinload(Workshop.participants))`.
- [ ] **`api/challenge.py:112`** — `session.steps` accessed without `selectinload`; triggers a lazy load per session in list view. **Fix:** add `selectinload(ChallengePlannerSession.steps)` to the query.

### Test Coverage

- [ ] **`api/votes.py`** — Zero test coverage. The phantom-vote test (written this session) currently **fails** because the bug is not yet fixed. Unblock by fixing the phantom-vote bug first, then the test should pass.
- [ ] **`api/results.py`** — Zero test coverage except the 3 tests written this session.
- [ ] **`api/participants.py`, `api/usecases.py`, `api/workshops.py`** — Core participant/use-case/workshop CRUD is undertested. Write tests for: add participant → submit use case → full vote round → get results as an end-to-end flow.
- [ ] **`api/admin.py`** — Zero test coverage despite being the highest-privilege module. At minimum: test that non-admin users cannot reach admin endpoints, and test the workshop listing query change made this session.
- [ ] **`services/roi_service.py`** — Zero test coverage. Critical path for business decisions. Add tests for: happy path, negative inputs (should error), zero project years, never-payback scenario.
- [ ] **`api/export.py`**, **`api/notifications.py`**, **`api/polls.py`** — Zero test coverage. These are standalone enough to test without complex fixtures.
- [ ] **25 additional API modules** have zero test coverage total (full list in session analysis).

### Code Quality

- ✅ **`services/rag_service.py`** — ~30 `print()` calls replaced with `structlog` logger
- ✅ **`services/copilot_service.py`** — 8 `print()` calls replaced with `structlog` logger
- ✅ **`services/roi_service.py`**, **`api/results.py`** — bare `except:` clauses replaced with specific exception types
- [ ] **`services/knowledge_base_manager.py`** — 13 remaining `print()` calls; replace with `structlog` logger
- [ ] **`services/roadmap_service.py`** — 8 remaining `print()` calls; replace with `structlog` logger
- [ ] **`services/rag_refinement.py`** — 4 remaining `print()` calls; replace with `structlog` logger
- [ ] **`services/challenge_step_service.py`** — 4 remaining `print()` calls; replace with `structlog` logger
- [ ] **`api/knowledge_base.py`** — 6 remaining `print()` calls
- [ ] **`models/models.py`** — God object: 501 lines, 49+ model classes. Split into domain modules: `models/workshop.py`, `models/user.py`, `models/voting.py`, `models/gamification.py`. Requires updating ~30 import paths across the codebase.

---

## 3. Nice to Have
> Style, minor improvements, developer experience

- [ ] **`services/copilot_service.py` — theme detection** — `_detect_themes()` recomputes on every call even when use cases haven't changed. Add a simple `@functools.lru_cache` or workshop-scoped dict to avoid repeated tokenization.
- [ ] **`services/rag_service.py` — LLM result caching** — `enhance_use_case()` and `estimate_roi()` hit OpenAI on identical inputs. A short-TTL Redis cache keyed by input hash would cut costs and latency. Note: adds invalidation complexity.
- [ ] **`api/results.py` — Python-side aggregation** — Vote scores are summed in Python. For workshops with thousands of votes, SQL `AVG()` and `STDDEV_POP()` with `GROUP BY use_case_id, criterion` would be more efficient. Low priority: current scale doesn't justify the complexity.
- [ ] **`services/knowledge_base_manager.py` — triple-nested difflib loop** — Fuzzy search over the knowledge base runs `difflib.SequenceMatcher` in a triple nested loop. Acceptable for current data sizes; consider pre-building an inverted keyword index if the KB grows beyond ~500 entries.
- [ ] **`core/config.py` — default DB credentials warning** — A `UserWarning` is emitted at startup when `postgres:postgres` is detected. Upgrade to a hard error when `APP_ENV=production`.
- [ ] **`api/auth.py` — password history** — `change_password()` allows setting the same password repeatedly. Add a hashed history of last 5 passwords.
- [ ] **Run formatter** — `black server/ && isort server/` have never been run on the full codebase. Large diff but purely cosmetic. Do this as a standalone commit with no logic changes.
- [ ] **`core/security.py` — in-memory rate limiter memory leak** — Fallback in-memory rate limiter grows the request-timestamp list indefinitely per client key. Already has cleanup logic but confirm it runs on every check, not just on refusal.
- [ ] **`api/usecases.py:256`** — Sequential `await sio.emit()` calls in a `for` loop over created use cases. Replace with `asyncio.gather(*[sio.emit(...) for uc in created])` to emit in parallel.
- [ ] **`.env` / deployment docs** — Document all new env vars added this session: `PRODUCTION_CORS_ORIGINS`, `TRUSTED_ORIGIN_HOSTNAMES`, `DEV_CORS_ORIGINS`. Add them to `.env.example` with safe placeholder values.

---

## Quick Reference: Session Fixes Summary

| Area | Fixed | Still Open |
|------|-------|------------|
| Security | 10 issues | 3 (phantom vote, delete_vote auth, JWT revocation) |
| Logic bugs | 11 issues | 2 (float(score) crash, ROI validation) |
| Performance | 6 issues | 3 (Alembic migration, 2 remaining requests.post, usecases loop) |
| Test coverage | 3 critical tests written | 25 modules untested, 1 test intentionally failing |
| Code quality | ~50 print() + bare except fixes | ~35 print() remaining, models.py split |
