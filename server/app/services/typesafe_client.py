"""
Minimal client for TypeSafe AI's System One API (the Jev model).

Jev is not a chat LLM: it reads a `state` (text or JSON) and answers
predefined questions with typed values and probabilities, never prose:
- choice: one option from a dict of {label: description}
- score:  a (possibly fractional) position on 2-10 ordered levels
- noul:   probability (0-1) that a statement is true

POST {base}/v1/systemone with {"model", "state", "questions"} and a Bearer
key; the response is {"model", "answers": {key: {...}}, "usage": {...}}.
"""
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

DEFAULT_BASE_URL = "https://api.typesafe.ai"
DEFAULT_MODEL = "jev-latest"
TIMEOUT_SECONDS = 15.0


@dataclass
class JevConfig:
    """A workshop's active Typesafe AI decision model (from the LLM registry)."""
    base_url: str
    api_key: str
    model: str
    config_id: str


def endpoint_url(base_url: Optional[str]) -> str:
    """Accept either the API root or the full endpoint as the stored base URL."""
    url = (base_url or DEFAULT_BASE_URL).rstrip("/")
    return url if url.endswith("/systemone") else f"{url}/v1/systemone"


def model_id(model_name: Optional[str]) -> str:
    """Registry names like "JEV" mean the latest model; pinned ids look like "jev-1.13.0"."""
    name = (model_name or "").strip().lower()
    return name if name.startswith("jev-") else DEFAULT_MODEL


class TypesafeError(RuntimeError):
    pass


async def system_one(config: JevConfig, state: Any, questions: Dict[str, Dict[str, Any]],
                     transport: Optional[httpx.AsyncBaseTransport] = None) -> Dict[str, Any]:
    """Ask Jev `questions` about `state`. Returns the parsed response; raises TypesafeError."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, transport=transport) as client:
            response = await client.post(
                endpoint_url(config.base_url),
                headers={"Authorization": f"Bearer {config.api_key}"},
                json={"model": model_id(config.model), "state": state, "questions": questions},
            )
    except httpx.HTTPError as e:
        raise TypesafeError(f"Typesafe AI request failed: {e}") from e
    if response.status_code != 200:
        raise TypesafeError(f"Typesafe AI returned {response.status_code}: {response.text[:200]}")
    data = response.json()
    if not isinstance(data.get("answers"), dict):
        raise TypesafeError("Typesafe AI response has no answers")
    return data


def usage_tokens(data: Dict[str, Any]) -> Dict[str, int]:
    usage = data.get("usage") or {}
    return {"prompt": int(usage.get("input_tokens") or 0), "completion": int(usage.get("output_tokens") or 0)}
