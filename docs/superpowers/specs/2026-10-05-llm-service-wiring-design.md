# Phase 2: Wire RAG/Copilot/Roadmap to Per-Workshop LLM Models — Design

**Status:** Approved design, pre-implementation
**Scope:** Wire `rag_service.py`, `copilot_service.py`, `roadmap_service.py` to resolve and use a workshop's selected reasoning/decision model (from the Phase 1 registry) instead of always using the single global `OPENAI_MODEL`/Azure setting. Embedding-model wiring and the Typesafe AI (JEV) client integration are explicitly out of scope — separate follow-up specs.

## 1. Context / Problem

Phase 1 (merged) built an admin-managed LLM model registry (`LLMModelConfig`: provider/role/model_name/encrypted API key) and let facilitators select, per workshop, which registered model applies to each of three roles (embedding/decision/reasoning). Nothing yet *consumes* that selection — `rag_service.py`, `copilot_service.py`, and `roadmap_service.py` are all module-level singletons that build ONE LangChain client each at process startup from global `settings.OPENAI_MODEL`/Azure config, and every call from every workshop goes through that same client. A workshop's model selection is stored and retrievable but functionally inert.

Investigation found the three services are not uniform:
- **Copilot and Roadmap**: every call site already has `workshop_id` (or a `workshop`/`UseCase.workshop_id`) in scope — wiring is pure threading, no schema changes needed.
- **RAG**: mixed. `check_duplicates` (via `/api/ai/duplicates`) and the two `roi.py` endpoints already have `workshop_id` in scope (just not forwarded into the service call). `enhance_use_case`, `check_feasibility`, `enhance_business_value`, `analyze_technical_feasibility`, the direct `/estimate-roi` and `/generate-business-case` paths in `ai.py` have no `workshop_id` in their request schemas at all. A separate group of RAG methods (`import_knowledge_article`, `delete_knowledge_article`, `validate_against_research`, `find_trending_use_cases`, `find_affected_usecases`, `extract_info_from_image`) are genuinely global knowledge-base operations with no workshop in scope by nature — these keep running on the global default.
- **No Anthropic integration exists anywhere** (`langchain-anthropic` is not a dependency) despite `anthropic` already being a valid `LLMProvider` value since Phase 1.
- **Usage tracking** (`app/utils/llm_tracking.py`'s `track_llm_usage`) is only called from `rag_service.py` today; `copilot_service.py` and `roadmap_service.py` don't track usage at all.

## 2. Role mapping (new — Phase 1 defined roles, nothing mapped them to code paths)

| Service | Decision model | Reasoning model |
|---|---|---|
| RAG | `check_duplicates`, `check_feasibility` | `enhance_use_case`, `enhance_business_value`, `analyze_technical_feasibility`, `estimate_roi`, `generate_business_case`, `generate_executive_presentation`, `analyze_document_context` |
| Copilot | `analyze_engagement`, `detect_anomalies`, `analyze_variance` | `generate_suggestions`, `generate_summary`, `generate_discussion_prompts`, `enhance_content` |
| Roadmap | *(none)* | `analyze_complexity`, `generate_timeline`, `calculate_resources`, `generate_milestones`, `identify_dependencies`, `calculate_confidence` |

Roadmap has no decision-model split — none of its methods are classification-shaped. RAG's global KB-curation methods (`import_knowledge_article`, `delete_knowledge_article`, `validate_against_research`, `find_trending_use_cases`, `find_affected_usecases`, `extract_info_from_image`) gain a `workshop_id: Optional[str] = None` parameter for interface consistency but it's never populated by any current caller — they keep running on the global default, unchanged.

Embedding-model wiring is explicitly skipped: the RAG vector store is one shared Chroma index built once at startup from the whole app's knowledge base, not per-workshop — a workshop's embedding-model selection has nothing to plug into with that architecture as-is. It stays stored but unused until a per-workshop embedding operation exists to hook it into.

## 3. Architecture

**New file: `server/app/services/llm_resolver.py`**

```python
async def resolve_chat_model(
    db: AsyncSession,
    workshop_id: Optional[str],
    role: str,  # "decision" | "reasoning"
    fallback_llm: Any,  # the service's existing self.llm (or None in mock mode)
    fallback_model_name: str,
) -> tuple[Any, str]:  # (client_to_use, model_name_for_tracking)
```

Logic: if `workshop_id` is `None`, or the workshop's `Workshop.config` has no active id for that role (reusing the same "resolve dangling/inactive to None" logic already built in `get_workshop_llm_models`), return `(fallback_llm, fallback_model_name)` unchanged — **this is the path every existing call site takes today, so passing no `workshop_id` is a guaranteed no-op.** If an active `LLMModelConfig` is found, build a fresh LangChain client for it (`ChatOpenAI`/`AzureChatOpenAI`/`ChatAnthropic` per `provider`, using `decrypt_secret` on the config's key) and return `(new_client, config.model_name)`.

If building that client raises (bad config, decrypt failure), log a warning and fall back to `(fallback_llm, fallback_model_name)` — the existing global-default behavior, not mock mode. If the global default itself isn't configured, today's existing `mock_mode` logic in each service is untouched and still applies.

No caching of built clients — each call builds fresh. These are lightweight object constructions (HTTP client wrappers), not persistent connections; add caching later only if profiling shows a real cost.

**Each service's public methods** (per the role-mapping table) gain `workshop_id: Optional[str] = None`, call `resolve_chat_model(...)` once at the top using `self.db` (services currently don't hold a db session — see Open Question below) to get `(llm_to_use, model_name_for_tracking)`, and use `llm_to_use` instead of `self.llm` for that call. The returned `model_name_for_tracking` replaces the existing `getattr(self.llm, 'model_name', settings.OPENAI_MODEL)` pattern at every `track_llm_usage` call site.

**Call-site threading:**
- `copilot.py`, `roadmap.py`: pass the already-in-scope `workshop_id`/`workshop.id` into every service call.
- `ai.py` (`/duplicates`): forward the already-fetched `request.workshop_id`.
- `roi.py` (both endpoints): forward `use_case.workshop_id` (already loaded).
- `ai.py` (`/enhance`, `/feasibility`, `/business-value`, `/technical-analysis`, `/estimate-roi`, `/generate-business-case`): add `workshop_id: Optional[UUID] = None` to each request Pydantic schema; forward it if present. Existing callers who don't send it are unaffected.

**Usage tracking extension:** `copilot_service.py` and `roadmap_service.py` each gain `track_llm_usage` calls at their reasoning/decision call sites, mirroring `rag_service.py`'s existing pattern (`feature=<method name>`, `model_name=<resolved name>`, token counts via `get_usage_from_response`, `workshop_id=<the one just resolved against>`). This makes the per-workshop model choice visible in the existing "by workshop"/"by model" admin usage dashboard.

**New dependency:** `langchain-anthropic` added to `server/requirements.txt`, used in `resolve_chat_model`'s provider branch for `anthropic`-type registry entries (`ChatAnthropic(model=config.model_name, api_key=decrypted_key)`).

## 4. DB session access inside services

`rag_service`/`copilot_service`/`roadmap_service` are plain singletons with no DB session of their own — they're called from API routes that already have a `db: AsyncSession = Depends(get_db)`. `resolve_chat_model` needs a `db` session to look up `Workshop.config` and `LLMModelConfig`. Simplest fix, no architecture change: every service method that needs role-resolution gains a `db: AsyncSession` parameter alongside `workshop_id`, supplied by its caller (which already has one in every single call site found). No service becomes session-holding or request-scoped; the session is passed through just like `workshop_id` is.

## 5. Testing

Existing test files (`server/tests/test_api_llm_models.py`, `test_api_workshop_llm_models.py`) already cover the registry and selection endpoints. This phase adds:
- Unit tests for `resolve_chat_model` covering: no `workshop_id` → fallback; `workshop_id` with no selection for the role → fallback; active selection → correct provider client type returned with correct `model_name`; inactive/deleted selection → fallback (reusing the dangling-reference resolution already proven in Task 3 of Phase 1).
- One integration test per service confirming `track_llm_usage` is called with the resolved `model_name` and the passed `workshop_id` when a workshop has an active selection, and with the original global default when it doesn't.
- No live calls to real OpenAI/Anthropic/Azure APIs in automated tests — `resolve_chat_model`'s client-construction branches are tested by asserting the correct LangChain class is instantiated with the correct constructor arguments (mocked), not by making real network calls. This matches how the existing `mock_mode` tests in this codebase already avoid live API calls.

## 6. Explicitly out of scope

- Embedding-model wiring (§2).
- Typesafe AI (JEV) client integration — separate follow-up spec once its API details are available.
- Caching of constructed LangChain clients.
- Any change to the global-default fallback behavior itself (still reads `settings.OPENAI_MODEL`/Azure config exactly as today).
