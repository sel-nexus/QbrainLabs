from fastapi import APIRouter, Depends, HTTPException
import statistics
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Workshop, UseCase, Vote
from app.schemas.results import AggregatedResult
from typing import List

from app.utils.matrix import calculate_matrix_position, detect_scale_max

router = APIRouter()

@router.get("/{workshop_id}", response_model=List[AggregatedResult])
async def get_workshop_results(workshop_id: str, db: AsyncSession = Depends(get_db)):
    # Fetch workshop to get config/weights if needed
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    # Store template_id for coordinate calculation
    ws_template_id = workshop.config.get('template_id')
        
    # Simplify: Fetch all usecases for this workshop with their votes
    result = await db.execute(
        select(UseCase)
        .where(UseCase.workshop_id == workshop_id)
        .options(selectinload(UseCase.votes))
    )
    use_cases = result.scalars().all()
    
    aggregated_results = []
    
    # Get criteria weights from config
    criteria = workshop.config.get('criteria', [])
    weights = {c['name']: (c['weight'] or 0) for c in criteria}
    
    for uc in use_cases:
        votes = uc.votes
        vote_count = len(votes)
        
        if vote_count == 0:
            aggregated_results.append(AggregatedResult(
                id=uc.id,
                title=uc.title,
                description=uc.description,
                category=uc.category,
                scores={},
                total_score=0,
                vote_count=0
            ))
            continue

        # Aggregate scores
        totals = {}
        counts = {}
        raw_scores = {}
        
        for v in votes:
            if not v.scores: continue
            for criterion, score in v.scores.items():
                val = float(score)
                totals[criterion] = totals.get(criterion, 0) + val
                counts[criterion] = counts.get(criterion, 0) + 1
                
                if criterion not in raw_scores:
                    raw_scores[criterion] = []
                raw_scores[criterion].append(val)
        
        avgs = {}
        weighted_sum = 0
        total_weight = 0
        
        for criterion, total in totals.items():
            avg = total / counts[criterion]
            avgs[criterion] = round(avg, 2)
            
            # Weighted Score Calculation
            weight = weights.get(criterion, 0)
            weighted_sum += avg * weight
            total_weight += weight
            
        final_score = 0
        if total_weight > 0:
            final_score = weighted_sum / total_weight
            
        # Variance Calculation (Average of criteria variances)
        criteria_variances = []
        for crit_params in raw_scores.values():
            if len(crit_params) > 1:
                try:
                    criteria_variances.append(statistics.variance(crit_params))
                except:
                    criteria_variances.append(0)
            else:
                criteria_variances.append(0)

        avg_variance = 0.0
        if criteria_variances:
            avg_variance = sum(criteria_variances) / len(criteria_variances)
        
        # Detect scale max from available averages
        # To unify across categories, we favor 100 unless it's clearly a high-precision 1-10 scale
        scale_max = detect_scale_max([float(v) for v in avgs.values()])
        
        # If any global scores in the workshop results (if we had them) were > 10, we'd use 100
        # For now, detect_scale_max already favors 100.
        
        # Calculate X and Y coordinates using shared utility
        x_val, y_val = calculate_matrix_position(avgs, ws_template_id, scale_max)

        # Normalize average variance to 0-100 scale (100 = maximum disagreement)
        # Max variance for scale_max property is (scale_max^2 / 4)
        max_variance = (scale_max ** 2) / 4
        normalized_variance = 0.0
        if max_variance > 0:
            normalized_variance = round((avg_variance / max_variance) * 100, 2)

        aggregated_results.append(AggregatedResult(
            id=uc.id,
            title=uc.title,
            description=uc.description,
            category=uc.category,
            scores=avgs,
            total_score=round(final_score, 2),
            vote_count=vote_count,
            variance=normalized_variance,
            x=x_val,
            y=y_val
        ))
        
    # Sort by total score descending
    aggregated_results.sort(key=lambda x: x.total_score, reverse=True)
        
    return aggregated_results
