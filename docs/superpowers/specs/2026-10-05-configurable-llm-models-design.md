# Configurable LLM Models — Design

**Status:** Approved design, pre-implementation
**Scope:** Phase 1 only — model registry + per-workshop selection. Rewiring the existing AI services (RAG, Copilot, Roadmap) to actually consume the selection is explicitly out of scope and left for a follow-up plan.

## 1. Context / Problem

Today, model selection is a single global setting. `server/app/core/config.py` defines one `OPENAI_MODEL` (default `"gpt-4"`) plus a parallel set of Azure OpenAI settings. Three independent services each read these settings directly and build their own LangChain client:

- `rag_service.py` — embeddings (Chroma vector store) + chat/reasoning (use-case enhancement, feasibility, duplicate detection, business value, technical analysis, ROI estimate, business case generation, document analysis)
- `copilot_service.py` — chat/reasoning only (facilitation suggestions, engagement/anomaly detection, discussion prompts, workshop summaries)
- `roadmap_service.py` — chat/reasoning only (complexity analysis, timeline/resource estimation)

There is no concept of distinct model *roles* (embedding vs. reasoning vs. decision), no per-workshop override, and no UI anywhere to pick or configure a model — `AdminLLMUsage.tsx` is a read-only cost/usage dashboard, not a configuration surface. The closest existing precedent for "per-workshop AI settings" is `CopilotSettings` (`GET/PUT /api/copilot/settings/{workshop_id}`), which configures copilot *behavior* (engagement thresholds, which suggestion types fire), not which model to call.

The user wants to configure multiple LLMs — across three roles (embedding, decision, reasoning) — and choose which ones apply to a given workshop. One named decision-model vendor to support: **Typesafe AI's JEV model** (needs its own client/SDK integration later — not an OpenAI-compatible endpoint).

## 2. Role definitions

Three roles, confirmed with the user:

- **Embedding** — vector search / knowledge base embeddings (what `rag_service`'s `OpenAIEmbeddings`/`AzureOpenAIEmbeddings` does today).
- **Reasoning** — complex analysis and generation (use-case enhancement, business case generation, roadmap complexity analysis, copilot suggestions/summaries — i.e., most of what `OPENAI_MODEL` drives today).
- **Decision** — fast classification/scoring tasks (duplicate detection, feasibility flags, engagement/anomaly detection, JEV-style evaluation). A new role; no current service formally distinguishes this from "reasoning," but the registry treats it as a separate, tagged role so a cheaper/faster/specialized model (like JEV) can be assigned here independently of the reasoning model.

A single underlying model can be registered twice under different roles if useful (e.g., GPT-4 as both reasoning and decision) — the registry entry is role-specific, not the model name.

## 3. Data model

New table `llm_model_configs` (SQLAlchemy model in `server/app/models/models.py`, Pydantic schemas in a new `server/app/schemas/llm_model.py`):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID, PK | |
| `name` | String | Admin-chosen display name, e.g. "GPT-4 Reasoning", "Typesafe JEV Decision" |
| `provider` | Enum: `openai`, `azure_openai`, `anthropic`, `typesafe_ai` | |
| `role` | Enum: `embedding`, `decision`, `reasoning` | |
| `model_name` | String | The literal model identifier passed to the provider's API (e.g. `gpt-4`, `claude-3-5-sonnet-20241022`, `jev-v1`) |
| `config_json` | JSON | Provider-specific non-secret fields: `endpoint`, `deployment`, `api_version` (Azure); `base_url` (Typesafe AI); empty for OpenAI/Anthropic |
| `encrypted_api_key` | Text, nullable | Fernet-encrypted; see §5 |
| `is_active` | Boolean, default `true` | Soft toggle; inactive configs can't be newly assigned but existing workshop references are left alone |
| `created_by` | UUID, FK → `users.id` | |
| `created_at` / `updated_at` | Timestamp | |

**Per-workshop selection** does *not* get a new table. `Workshop.config` (the existing loosely-typed JSON column, validated at the API boundary by `WorkshopConfig`) gets three new optional fields:

```python
class WorkshopConfig(BaseModel):
    criteria: List[Criterion]
    template_id: Optional[str] = None
    embedding_model_id: Optional[UUID] = None
    decision_model_id: Optional[UUID] = None
    reasoning_model_id: Optional[UUID] = None
```

Deleting an `llm_model_configs` row does not cascade-fail: any workshop referencing that id simply has a dangling id that resolves to "no model assigned" when looked up (checked at read time, not enforced by a DB-level FK constraint) — avoids blocking admin deletes on referential integrity for a Phase-1-only, UI-driven relationship.

## 4. Encryption

New `server/app/core/crypto.py`:

```python
def encrypt_secret(plaintext: str) -> str: ...
def decrypt_secret(ciphertext: str) -> str: ...
```

Backed by `cryptography.fernet.Fernet` (already pinned in `requirements.txt` — no new dependency). The Fernet key is derived from the existing `settings.SECRET_KEY` (already validated ≥32 chars app-wide) via SHA-256 → base64 urlsafe, not a new env var and not the PBKDF2-from-human-password dance in `config.py`'s `load_secure_db_config` (that derivation exists there only because its source secret is a human-memorable master password; `SECRET_KEY` is already high-entropy, so a direct hash is sufficient).

API keys are write-only: the create/update request accepts `api_key` as a plain string and immediately encrypts it; every read/list response omits `encrypted_api_key` entirely and instead returns a boolean `has_api_key` plus (if set) a fixed `"••••••••"` placeholder — never the real value, never the ciphertext. Updating a config without passing `api_key` leaves the existing encrypted value untouched.

## 5. API

All registry endpoints require admin (`require_admin`, matching the existing pattern in `app/api/admin.py`/`settings.py`):

- `GET /api/admin/llm-models` — list all (key omitted per §4)
- `POST /api/admin/llm-models` — create
- `PUT /api/admin/llm-models/{id}` — update
- `DELETE /api/admin/llm-models/{id}` — delete

Per-workshop selection (facilitator/admin of that workshop — same auth as other workshop-scoped endpoints):

- `GET /api/workshops/{id}/llm-models` — current `{embedding_model_id, decision_model_id, reasoning_model_id}` (ids only; the client fetches the full registry separately to render names)
- `PUT /api/workshops/{id}/llm-models` — set any subset of the three slots; server validates each provided id exists, `is_active` is true, and its `role` matches the slot being set (a `decision`-role config can't be assigned to `reasoning_model_id`)

## 6. UI

**Admin registry** — new `client/src/pages/AdminLLMModels.tsx`, routed at `/admin/llm-models`, new entry in `AdminLayout.tsx`'s `navItems`. Table: Name / Provider / Role / Model Name / Active / Edit / Delete. Add/edit form shows provider-conditional fields (OpenAI/Anthropic: API key + model name; Azure: endpoint + API key + deployment + api version + model name; Typesafe AI: base URL + API key + model name), a role `<select>`, and an active toggle.

**Per-workshop selection** — extend the existing `WorkshopSettingsModal.tsx` with a new "AI Models" section: three `<select>`s (Embedding / Decision / Reasoning), each populated from the registry filtered to `role` match and `is_active`, plus a "Use default" option that clears the slot (`null`). Visible/editable wherever `WorkshopSettingsModal` is already surfaced (facilitator's workshop settings).

## 7. Explicitly out of scope (Phase 2, separate plan)

- `rag_service.py`, `copilot_service.py`, `roadmap_service.py` are **not** touched — they keep reading the global `OPENAI_MODEL`/Azure settings exactly as today. Making them look up a workshop's `embedding_model_id`/`decision_model_id`/`reasoning_model_id` and dispatch to the right provider client is a separate, later plan.
- A Typesafe AI client/SDK integration (JEV needs a bespoke client, confirmed not OpenAI-compatible) — the registry stores its config shape now; nothing calls it yet.
- Any cost/usage tracking tie-in for the new registry entries (existing `llm_tracking.py` keys usage by `model_name` string already, which will naturally line up once Phase 2 wires real calls through named configs — no schema change needed there).

## 8. Documentation

New `docs/userstories/04-ai-intelligence/US46_configurable_llm_models.md`, following the existing template exactly (metadata block, story form, Background & Research, Acceptance Criteria, Scenarios, Technical Notes, Relationship to Other Stories — referencing US07 RAG, US16 Copilot, US20 Roadmap, since Phase 2 will touch all three). New row added to `docs/userstories/README.md`'s `04-ai-intelligence` group table and relevant summary/backlog tables.
