from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Workshop, UseCase, Vote
from app.schemas.results import AggregatedResult
from typing import List

router = APIRouter()

@router.get("/{workshop_id}", response_model=List[AggregatedResult])
async def get_workshop_results(workshop_id: str, db: AsyncSession = Depends(get_db)):
    # Fetch workshop to get config/weights if needed
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
        
    # Simplify: Fetch all usecases for this workshop with their votes
    result = await db.execute(
        select(UseCase)
        .where(UseCase.workshop_id == workshop_id)
        .options(selectinload(UseCase.votes))
    )
    use_cases = result.scalars().all()
    
    aggregated_results = []
    
    # Get criteria weights from config
    # config format: { criteria: [{name: 'Feasibility', weight: 50}, ...] }
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
        
        for v in votes:
            if not v.scores: continue
            for criterion, score in v.scores.items():
                totals[criterion] = totals.get(criterion, 0) + score
                counts[criterion] = counts.get(criterion, 0) + 1
        
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
        
        aggregated_results.append(AggregatedResult(
            id=uc.id,
            title=uc.title,
            description=uc.description,
            category=uc.category,
            scores=avgs,
            total_score=round(final_score, 2),
            vote_count=vote_count
        ))
        
    # Sort by total score descending
    aggregated_results.sort(key=lambda x: x.total_score, reverse=True)
        
    return aggregated_results
