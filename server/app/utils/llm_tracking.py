"""
LLM Usage Tracking Utilities
Provides functions to log LLM usage to the database.
"""
import logging
from typing import Optional, Any, Dict
from app.core.database import AsyncSessionLocal
from app.models.llm_usage import LLMUsageLog

logger = logging.getLogger(__name__)

# Cost rates in cents per 1k tokens (prompt / completion)
COST_RATES: Dict[str, Dict[str, float]] = {
    "gpt-4.1":       {"prompt": 2.0,   "completion": 8.0},
    "gpt-4.1-mini":  {"prompt": 0.4,   "completion": 1.6},
    "gpt-4.1-nano":  {"prompt": 0.1,   "completion": 0.4},
    "gpt-4o":        {"prompt": 0.5,   "completion": 1.5},
    "gpt-4o-mini":   {"prompt": 0.015, "completion": 0.06},
    "gpt-4":         {"prompt": 3.0,   "completion": 6.0},
    "gpt-35-turbo":  {"prompt": 0.05,  "completion": 0.15},
    "gpt-3.5-turbo": {"prompt": 0.05,  "completion": 0.15},
    "default":       {"prompt": 1.0,   "completion": 2.0},
}

_tiktoken_encoder = None


def _estimate_tokens(text: str) -> int:
    """Estimate token count using tiktoken (cl100k_base, used by GPT-4 family)."""
    global _tiktoken_encoder
    try:
        if _tiktoken_encoder is None:
            import tiktoken
            _tiktoken_encoder = tiktoken.get_encoding("cl100k_base")
        return len(_tiktoken_encoder.encode(text))
    except Exception:
        return max(1, len(text) // 4)


def get_usage_from_response(response: Any, prompt_text: str = "") -> Dict[str, int]:
    """
    Extract token counts from a LangChain / OpenAI response object.

    Supports:
      - AIMessage.usage_metadata  (LangChain >= 0.2 / newer)
      - AIMessage.response_metadata["token_usage"]  (older LangChain)
      - raw OpenAI response dict with "usage" key
      - AzureChatOpenAI response_metadata["usage"]
      - tiktoken estimation fallback when metadata is unavailable
    """
    try:
        # 1. Newer LangChain: usage_metadata attribute
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            meta = response.usage_metadata
            prompt = meta.get("input_tokens", 0) or meta.get("prompt_tokens", 0)
            completion = meta.get("output_tokens", 0) or meta.get("completion_tokens", 0)
            if prompt or completion:
                logger.debug(f"[LLM Tracking] usage_metadata: prompt={prompt} completion={completion}")
                return {"prompt": prompt, "completion": completion}

        # 2. response_metadata (LangChain generic / Azure)
        if hasattr(response, 'response_metadata') and response.response_metadata:
            rm = response.response_metadata
            tu = rm.get("token_usage") or rm.get("usage") or {}
            prompt = tu.get("prompt_tokens", 0) or tu.get("input_tokens", 0)
            completion = tu.get("completion_tokens", 0) or tu.get("output_tokens", 0)
            if prompt or completion:
                logger.debug(f"[LLM Tracking] response_metadata: prompt={prompt} completion={completion}")
                return {"prompt": prompt, "completion": completion}

        # 3. Raw dict (e.g. Perplexity / direct API call result)
        if isinstance(response, dict):
            usage = response.get("usage", {})
            prompt = usage.get("prompt_tokens", 0) or usage.get("input_tokens", 0)
            completion = usage.get("completion_tokens", 0) or usage.get("output_tokens", 0)
            if prompt or completion:
                return {"prompt": prompt, "completion": completion}

        # 4. Fallback: estimate tokens via tiktoken when LangChain doesn't provide usage
        content = ""
        if hasattr(response, 'content'):
            content = response.content or ""
        elif isinstance(response, str):
            content = response

        if content or prompt_text:
            est_prompt = _estimate_tokens(prompt_text) if prompt_text else 0
            est_completion = _estimate_tokens(content) if content else 0
            if est_prompt or est_completion:
                logger.debug(
                    f"[LLM Tracking] tiktoken estimate: prompt~{est_prompt} completion~{est_completion}"
                )
                return {"prompt": est_prompt, "completion": est_completion}

        logger.debug("[LLM Tracking] No token usage found in response object")
        return {"prompt": 0, "completion": 0}

    except Exception as exc:
        logger.warning(f"[LLM Tracking] Error extracting usage: {exc}")
        return {"prompt": 0, "completion": 0}


async def track_llm_usage(
    feature: str,
    model_name: str,
    prompt_tokens: int,
    completion_tokens: int,
    workshop_id: Optional[Any] = None,
    user_id: Optional[Any] = None,
    success: bool = True,
    error_message: Optional[str] = None,
    request_type: str = "chat",
):
    """
    Persist a single LLM usage record.
    Silently swallows any DB error so the main feature is never broken.
    """
    try:
        total_tokens = prompt_tokens + completion_tokens

        # Pick the rate by finding the first matching model key (case-insensitive)
        rate = COST_RATES["default"]
        model_lower = (model_name or "").lower()
        for key, r in COST_RATES.items():
            if key != "default" and key in model_lower:
                rate = r
                break

        est_cost_cents = (
            prompt_tokens * rate["prompt"] + completion_tokens * rate["completion"]
        ) / 1000
        # Bump to 1 cent minimum when tokens were consumed
        if total_tokens > 0 and est_cost_cents < 1:
            est_cost_cents = 1

        async with AsyncSessionLocal() as db:
            log_entry = LLMUsageLog(
                feature=feature,
                workshop_id=workshop_id,
                user_id=user_id,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                model_name=model_name,
                request_type=request_type,
                estimated_cost_cents=int(est_cost_cents),
                success="true" if success else "false",
                error_message=error_message,
            )
            db.add(log_entry)
            await db.commit()

        logger.debug(
            f"[LLM Tracking] Logged: feature={feature} model={model_name} "
            f"tokens={total_tokens} cost={int(est_cost_cents)}c"
        )

    except Exception as exc:
        logger.error(f"[LLM Tracking] Failed to persist usage log: {exc}")
