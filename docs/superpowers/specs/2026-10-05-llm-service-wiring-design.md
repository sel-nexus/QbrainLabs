# Phase 2: Wire RAG/Copilot/Roadmap to Per-Workshop LLM Models — Design

**Status:** Approved design, pre-implementation
**Scope:** Wire `rag_service.py`, `copilot_service.py`, `roadmap_service.py` to resolve and use a workshop's selected reasoning/decision model (from the Phase 1 registry) instead of always using the single global `OPENAI_MODEL`/Azure setting. Embedding-model wiring and the Typesafe AI (JEV) client integration are explicitly out of scope — separate follow-up specs.

## 1. Context / Problem

Phase 1 (merged) built an admin-managed LLM model registry (`LLMModelConfig`: provider/role/model_name/encrypted API key) and let facilitators select, per workshop, which registered model applies to each of three roles (embedding/decision/reasoning). Nothing yet *consumes* that selection — `rag_service.py`, `copilot_service.py`, and `roadmap_service.py` are all module-level singletons that build ONE LangChain client each at process startup from global `settings.OPENAI_MODEL`/Azure config, and every call from every workshop goes through that same client. A workshop's model selection is stored and retrievable but functionally inert.

Investigation found the three services are not uniform, and a second, deeper pass (reading every target method's actual body, not just its signature) found that several originally-assumed targets have **no LLM call in them at all** — pure algorithmic/statistical code — so there is nothing to wire in them:

- **RAG**: `check_duplicates` is pure `difflib.SequenceMatcher` string comparison (comment in the code literally says "For a full prod RAG, we would embed..." — it doesn't yet). `generate_executive_presentation` has zero callers anywhere in the app (dead code). `analyze_document_context`'s only caller (`/api/ai/analyze-file`, a file-upload endpoint) has no workshop in scope by nature. All three are dropped from the wiring scope. Of the remainder: `check_feasibility` already has a real LLM call but no `workshop_id` in its request schema; `enhance_use_case`/`enhance_business_value`/`analyze_technical_feasibility` likewise need a new optional schema field; `estimate_roi`/`generate_business_case` are called from TWO places each — `ai.py`'s direct endpoints (no workshop context, request body only) and `roi.py`'s endpoints (which load a `UseCase` first, giving `workshop_id` for free, no schema change needed there).
- **Copilot**: the actual LLM calls live in **private helper methods one or two levels below** the public methods originally listed. `generate_suggestions` itself is rule-based; its LLM call is in `_generate_ai_suggestions`, which it calls and which already receives the full `workshop` object. `detect_anomalies` dispatches to three helpers by `data_type`; only `_detect_voting_anomalies` → `_detect_groupthink_and_bias` and `_detect_content_anomalies` → `_detect_semantic_duplicates` contain real LLM calls (two levels deep) — `_detect_behavior_anomalies` does not. `analyze_engagement` and `analyze_variance` are both pure statistics with no LLM call anywhere — dropped. `enhance_content` has no LLM call of its own; it's a thin wrapper that calls `rag_service.enhance_use_case(...)` directly — wiring it means forwarding `workshop_id`/`db` into that call, not adding a new resolver call.
- **Roadmap**: only `analyze_complexity`, `generate_timeline` (via its private `_generate_ai_timeline`/`_detect_use_case_types` helpers), and `calculate_resources` (via `_calculate_ai_resources`) contain real LLM calls. `generate_milestones`, `identify_dependencies`, and `calculate_confidence` are pure heuristic/rule-based — dropped.
- **No Anthropic integration exists anywhere** (`langchain-anthropic` is not a dependency) despite `anthropic` already being a valid `LLMProvider` value since Phase 1.
- **Usage tracking** (`app/utils/llm_tracking.py`'s `track_llm_usage`) is only called from `rag_service.py` today; `copilot_service.py` and `roadmap_service.py` don't track usage at all.

## 2. Role mapping (new — Phase 1 defined roles, nothing mapped them to code paths; corrected after reading every target method's actual body)

| Service | Decision model | Reasoning model |
|---|---|---|
| RAG | `check_feasibility` | `enhance_use_case`, `enhance_business_value`, `analyze_technical_feasibility`, `estimate_roi`, `generate_business_case` |
| Copilot | `_detect_groupthink_and_bias`, `_detect_semantic_duplicates` (both private, reached via `detect_anomalies`) | `_generate_ai_suggestions` (private, reached via `generate_suggestions`), `generate_discussion_prompts`, `generate_summary`, `enhance_content` (forwards into RAG's `enhance_use_case`) |
| Roadmap | *(none)* | `analyze_complexity`, `generate_timeline`, `calculate_resources` |

Roadmap has no decision-model split — none of its LLM-calling methods are classification-shaped. Dropped entirely, confirmed via source reading to have no LLM call to redirect: RAG's `check_duplicates`, `generate_executive_presentation`, `analyze_document_context`; Copilot's `analyze_engagement`, `analyze_variance`, `_detect_behavior_anomalies`; Roadmap's `generate_milestones`, `identify_dependencies`, `calculate_confidence`. RAG's global KB-curation methods (`import_knowledge_article`, `delete_knowledge_article`, `validate_against_research`, `find_trending_use_cases`, `find_affected_usecases`, `extract_info_from_image`) are untouched — no workshop in scope by nature, they keep running on the global default exactly as today.

Where a public method already receives a full `workshop`/`use_case`/`UseCase`-list object (true for `generate_suggestions`, `generate_summary`, `generate_discussion_prompts`, `analyze_complexity`, `generate_timeline`, `calculate_resources`), `workshop_id` is derived from that object (`workshop.id`, `use_case.workshop_id`, `use_cases[0].workshop_id`) rather than adding a redundant parameter — only a `db: AsyncSession` parameter needs adding in those cases.

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
- `copilot.py`, `roadmap.py`: pass the already-in-scope `workshop_id`/`workshop.id`/`db` into every wired service call.
- `roi.py` (`/estimate`, `/business-case/generate`): forward `use_case.workshop_id` and `db` (both already loaded) into `rag_service.estimate_roi`/`generate_business_case`.
- `ai.py` (`/enhance`, `/feasibility`, `/business-value`, `/technical-analysis`): add `workshop_id: Optional[UUID] = None` to each request Pydantic schema (`EnhanceRequest`, `FeasibilityRequest`, `BusinessValueRequest`, `TechnicalAnalysisRequest`); forward it plus `db` into the service call. Existing callers who don't send it are unaffected. `ai.py`'s own `/estimate-roi` and `/generate-business-case` endpoints (distinct from `roi.py`'s same-named service calls) have no workshop context available at all (request body only, no DB lookup) and are left unchanged — they simply never pass `workshop_id`, which is the correct no-op path.

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
