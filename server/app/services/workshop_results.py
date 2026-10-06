"""
Single source of truth for a workshop's prioritization results.

Used by the results API, the CSV export and the PDF report so that ranks,
scores, quadrants and consensus are identical everywhere (US48.11).

- Scores: per-criterion averages on the scale they were given (1-10 or
  0-100), plus `normalized_score` on 0-100 for ranking and display.
- "Unsure" answers (stored as -1) are ignored, not averaged in.
- Rank: competition ranking on normalized score (ties share a rank:
  1, 2, 2, 4). Use cases with no scores are unranked.
- Quadrant: from the matrix position (0-100) split at 50/50.
- Consensus: agreement across participants (100 = everyone gave the same
  score), averaged over criteria with at least two scores.
"""
import statistics
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.models import UseCase, Workshop
from app.utils.matrix import (
    STANDARD_X_KEYWORDS,
    STANDARD_Y_KEYWORDS,
    axes_from_config,
    calculate_agreement_score,
    calculate_matrix_position,
    detect_scale_max,
)

QUADRANT_THRESHOLD = 50.0

# Canonical quadrant keys and the names shown everywhere (chart, analytics, exports).
QUADRANT_LABELS: Dict[str, str] = {
    "quick_wins": "Quick wins",
    "strategic_bets": "Strategic bets",
    "nice_to_have": "Nice to have",
    "dont_do": "Deprioritize",
}
QUADRANT_DESCRIPTIONS: Dict[str, str] = {
    "quick_wins": "High value and easy to deliver — start here",
    "strategic_bets": "High value but harder — plan and invest",
    "nice_to_have": "Easy but lower value — do if capacity allows",
    "dont_do": "Lower value and harder — park for now",
}

CONSENSUS_LABELS: Dict[str, str] = {
    "high": "High consensus",
    "moderate": "Moderate",
    "needs_discussion": "Needs discussion",
}


def consensus_level(agreement: Optional[float]) -> Optional[str]:
    if agreement is None:
        return None
    if agreement >= 70:
        return "high"
    if agreement >= 40:
        return "moderate"
    return "needs_discussion"


def quadrant_for(x: Optional[float], y: Optional[float]) -> Optional[str]:
    if x is None or y is None:
        return None
    high_value, easy = y >= QUADRANT_THRESHOLD, x >= QUADRANT_THRESHOLD
    if high_value and easy:
        return "quick_wins"
    if high_value:
        return "strategic_bets"
    if easy:
        return "nice_to_have"
    return "dont_do"


def axis_labels(config: Optional[Dict[str, Any]]) -> Tuple[str, str]:
    """Matrix axis labels; mirrors client/src/lib/criteria.ts matrixAxes()."""
    config = config or {}
    names = [c.get("name") for c in config.get("criteria", []) if c.get("name")]
    explicit = axes_from_config(config)
    if explicit["x_axis"] in names and explicit["y_axis"] in names:
        return explicit["x_axis"], explicit["y_axis"]
    x_keywords = STANDARD_X_KEYWORDS + ["Effort (Inverse)", "Complexity"]
    x_label = next((n for n in names if n in x_keywords), names[0] if names else "Feasibility")
    y_label = next((n for n in names if n in STANDARD_Y_KEYWORDS), names[1] if len(names) > 1 else "Business Value")
    if x_label == y_label and len(names) > 1:
        y_label = next((n for n in names if n != x_label), y_label)
    return x_label, y_label


TEN_POINT_TEMPLATES = {"7_POINT_COMPREHENSIVE", "7_POINT_COMPRE_HENSIVE"}


def scale_for(template_id: Optional[str], averages: List[float]) -> float:
    """The comprehensive template is scored 1-10; whole-number averages like
    7.0 would otherwise be mistaken for a 0-100 score of 7."""
    if template_id in TEN_POINT_TEMPLATES and averages and all(v <= 10 for v in averages):
        return 10.0
    return detect_scale_max(averages)


def assign_ranks(results: List[Dict[str, Any]]) -> None:
    """Competition ranking on normalized score; unscored items get no rank."""
    scored = sorted((r for r in results if r["vote_count"] > 0), key=lambda r: r["normalized_score"], reverse=True)
    previous_score, previous_rank = None, 0
    for position, item in enumerate(scored, start=1):
        score = round(item["normalized_score"], 1)
        rank = previous_rank if score == previous_score else position
        item["rank"] = rank
        previous_score, previous_rank = score, rank
    counts: Dict[int, int] = {}
    for item in scored:
        counts[item["rank"]] = counts.get(item["rank"], 0) + 1
    for item in results:
        item.setdefault("rank", None)
        item["tied"] = bool(item["rank"] and counts.get(item["rank"], 0) > 1)


def _summarise_use_case(uc: UseCase, weights: Dict[str, float], template_id: Optional[str], axes: Dict[str, Optional[str]]) -> Dict[str, Any]:
    raw_scores: Dict[str, List[float]] = {}
    for vote in uc.votes:
        for criterion, score in (vote.scores or {}).items():
            try:
                value = float(score)
            except (TypeError, ValueError):
                continue
            if value < 0:  # "Unsure" — not a score
                continue
            raw_scores.setdefault(criterion, []).append(value)

    base = {
        "id": uc.id,
        "title": uc.title,
        "description": uc.description or "",
        "category": uc.category,
        "vote_count": len(uc.votes),
    }
    if not raw_scores:
        return {**base, "scores": {}, "total_score": 0.0, "normalized_score": 0.0, "scale_max": 100.0,
                "variance": 0.0, "agreement": None, "consensus_level": None, "x": None, "y": None, "quadrant": None}

    avgs = {c: round(sum(v) / len(v), 2) for c, v in raw_scores.items()}
    weighted_sum = sum(avgs[c] * weights.get(c, 0) for c in avgs)
    total_weight = sum(weights.get(c, 0) for c in avgs)
    total = weighted_sum / total_weight if total_weight > 0 else 0.0

    scale_max = scale_for(template_id, list(avgs.values()))
    x, y = calculate_matrix_position(avgs, template_id, scale_max, **axes)

    variances = [statistics.variance(v) if len(v) > 1 else 0.0 for v in raw_scores.values()]
    max_variance = (scale_max ** 2) / 4
    normalized_variance = round((sum(variances) / len(variances)) / max_variance * 100, 2) if max_variance else 0.0

    agreements = [calculate_agreement_score(v, scale_max) for v in raw_scores.values() if len(v) >= 2]
    agreement = round(sum(agreements) / len(agreements), 1) if agreements else None

    return {
        **base,
        "scores": avgs,
        "total_score": round(total, 2),
        "normalized_score": round(min(100.0, total * 100.0 / scale_max), 1),
        "scale_max": scale_max,
        "variance": normalized_variance,
        "agreement": agreement,
        "consensus_level": consensus_level(agreement),
        "x": x,
        "y": y,
        "quadrant": quadrant_for(x, y),
    }


async def compute_workshop_results(db: AsyncSession, workshop: Workshop) -> List[Dict[str, Any]]:
    """Ranked results for every use case in the workshop (highest first)."""
    config = workshop.config or {}
    weights = {c["name"]: (c.get("weight") or 0) for c in config.get("criteria", [])}
    template_id = config.get("template_id")
    axes = axes_from_config(config)

    rows = await db.execute(
        select(UseCase).where(UseCase.workshop_id == workshop.id).options(selectinload(UseCase.votes))
    )
    results = [_summarise_use_case(uc, weights, template_id, axes) for uc in rows.scalars().all()]
    assign_ranks(results)
    results.sort(key=lambda r: (r["rank"] is None, r["rank"] or 0, r["title"].lower()))
    return results
