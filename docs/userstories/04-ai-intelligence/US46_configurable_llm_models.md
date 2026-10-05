# User Story: Configurable LLM Models

**Epic:** AI Intelligence
**Module:** LLM Configuration
**Story Type:** Feature
**Priority:** Medium
**Story Points:** 13
**Status:** ✅ Implemented (Phase 1 — registry + selection)

### Implementation Summary
- ✅ Admin-managed LLM model registry (`llm_model_configs` table), tagged by role (embedding / decision / reasoning) and provider (OpenAI / Azure OpenAI / Anthropic / Typesafe AI)
- ✅ API keys encrypted at rest (Fernet, keyed from `SECRET_KEY`), never returned in any API response
- ✅ Admin CRUD UI at `/admin/llm-models`
- ✅ Per-workshop model selection (embedding/decision/reasoning) via the existing Workshop Settings modal
- 📋 **Not yet implemented:** the existing AI services (RAG, Copilot, Roadmap) do not yet read a workshop's selected models — they still use the single global `OPENAI_MODEL` setting. See "Relationship to Other Stories" below.

**As a** platform admin,
**I want to** configure a registry of LLM models — tagged as embedding, decision, or reasoning models, across multiple providers —
**So that** facilitators can choose which models power the AI features for their specific workshop, instead of every workshop being locked to one global model.

## Background & Research

Prior to this story, `server/app/core/config.py` defined exactly one global chat model (`OPENAI_MODEL`, default `gpt-4`) and one embedding model (Azure-only), read independently by three services (`rag_service.py`, `copilot_service.py`, `roadmap_service.py`). There was no way to use a different model for a specific workshop, and no way to introduce a model from a vendor outside OpenAI/Azure (e.g. **Typesafe AI's JEV model**, used here as a worked example of a "decision model" — a fast classification/scoring model distinct from the heavier "reasoning" models used for generation and analysis).

## Acceptance Criteria

### 1. Model Registry (Admin)
   - **Interface**: A new "LLM Models" page under Admin, listing all configured models (name, provider, role, model name, active status).
   - Admin can add a new model config, choosing a provider (OpenAI, Azure OpenAI, Anthropic, Typesafe AI) and a role (embedding, decision, reasoning), with provider-appropriate fields (e.g. Azure needs endpoint/deployment/api version; Typesafe AI needs a base URL).
   - Admin can edit a model config without being forced to re-enter its API key (blank = keep existing).
   - Admin can deactivate or delete a model config.
   - API keys are never visible again after being set — the UI only shows whether one is configured.

### 2. Per-Workshop Selection
   - **Interface**: An "AI Models" section in the existing Workshop Settings modal, with one dropdown per role (Embedding, Decision, Reasoning).
   - Each dropdown only lists active registry entries matching its role.
   - Each dropdown has a "Use default" option that clears the workshop's override for that role.
   - Saving persists the selection against the workshop; reopening the modal shows the saved selection.

### 3. Security
   - API keys are encrypted at rest and never appear in any API response, log, or the frontend after being saved.
   - Only admins can create, edit, or delete registry entries. Any authenticated user can list active entries (needed to populate the per-workshop selection dropdowns).

## Scenarios

### Scenario A: Admin registers a new decision model
1. Admin navigates to `/admin/llm-models` and clicks "Add Model"
2. Admin selects provider "Typesafe AI", role "Decision", names it "JEV Decision", enters the model name and base URL and API key, saves
3. The new entry appears in the registry table with "Active: Yes" and no API key ever shown back

### Scenario B: Facilitator assigns a decision model to a workshop
1. Facilitator opens Workshop Settings for one of their workshops
2. In the "AI Models" section, the Decision dropdown lists "JEV Decision" (and any other active decision-role models)
3. Facilitator selects it and saves; reopening the modal shows "JEV Decision" still selected

## Technical Notes

- New table: `llm_model_configs` (migration: `server/migrations/us46_llm_model_configs.py`).
- Per-workshop selection is stored as three new optional fields on the existing `Workshop.config` JSON blob (`embedding_model_id`, `decision_model_id`, `reasoning_model_id`) — no new join table.
- Encryption: `server/app/core/crypto.py`, Fernet keyed from the existing `SECRET_KEY` setting.
- API: `GET/POST /api/admin/llm-models`, `PUT/DELETE /api/admin/llm-models/{id}` (list is open to any authenticated user; mutations are admin-only), `GET/PUT /api/workshops/{id}/llm-models`.

## Relationship to Other Stories

- **US07 (AI Intelligence / RAG)**, **US16 (AI Copilot)**, **US20 (AI Implementation Roadmap)**: all three currently call a single global model via `rag_service.py`/`copilot_service.py`/`roadmap_service.py`. This story's registry and per-workshop selection are additive and do not change their behavior yet — a follow-up story is needed to make those services look up and use a workshop's selected embedding/decision/reasoning model instead of the global default.
