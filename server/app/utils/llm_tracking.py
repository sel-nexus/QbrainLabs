"""
LLM Usage Tracking Utilities
Provides functions to log LLM usage to the database.
"""
import logging
from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.llm_usage import LLMUsageLog

logger = logging.getLogger(__name__)

# Basic cost estimation rates (in cents per 1k tokens)
# These are rough estimates for cost calculation
COST_RATES = {
    "gpt-4": {"prompt": 3, "completion": 6},
    "gpt-3.5-turbo": {"prompt": 0.05, "completion": 0.15},
    "gpt-4o": {"prompt": 0.5, "completion": 1.5},
    "gpt-4o-mini": {"prompt": 0.015, "completion": 0.06},
    "default": {"prompt": 1, "completion": 2}
}

async def track_llm_usage(
    feature: str,
    model_name: str,
    prompt_tokens: int,
    completion_tokens: int,
    workshop_id: Optional[Any] = None,
    user_id: Optional[Any] = None,
    success: bool = True,
    error_message: Optional[str] = None,
    request_type: str = "chat"
):
    """
    Asynchronously logs LLM usage to the database.
    Creates its own database session to be independent of the request session.
    """
    try:
        total_tokens = prompt_tokens + completion_tokens
        
        # Calculate estimated cost in cents
        # We use a simple lookup based on model name
        rate = COST_RATES.get("default")
        for model_key in COST_RATES:
            if model_key in model_name.lower():
                rate = COST_RATES[model_key]
                break
        
        # rate * tokens / 1000
        cost_cents = int((prompt_tokens * rate["prompt"] + completion_tokens * rate["completion"]) / 10) / 100
        # Actually storing as integer cents, so:
        cost_cents = int((prompt_tokens * rate["prompt"] + completion_tokens * rate["completion"]) / 10)
        # correction: if prompt is 3 cents per 1k, then cost = tokens * 3 / 1000
        # to keep it in cents as integer, we might need more precision or just store float.
        # Let's adjust precision: store as integer micro-cents? No, let's just do decimal math and store cents.
        
        est_cost_cents = (prompt_tokens * rate["prompt"] + completion_tokens * rate["completion"]) / 1000
        # Rounding up to 1 cent if usage exists but very low
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
                error_message=error_message
            )
            db.add(log_entry)
            await db.commit()
            
    except Exception as e:
        # Don't let tracking failure break the main feature
        logger.error(f"Failed to track LLM usage: {str(e)}")

def get_usage_from_response(response: Any) -> Dict[str, int]:
    """
    Extracts token usage from LangChain response object.
    Supports both standard AIMessage with response_metadata and older formats.
    """
    try:
        # Check for usage_metadata (newer LangChain)
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            return {
                "prompt": response.usage_metadata.get("input_tokens", 0),
                "completion": response.usage_metadata.get("output_tokens", 0)
            }
            
        # Check for response_metadata (older LangChain)
        if hasattr(response, 'response_metadata') and response.response_metadata:
            token_usage = response.response_metadata.get("token_usage", {})
            return {
                "prompt": token_usage.get("prompt_tokens", 0),
                "completion": token_usage.get("completion_tokens", 0)
            }
            
        # Fallback for other response types
        return {"prompt": 0, "completion": 0}
    except Exception:
        return {"prompt": 0, "completion": 0}
