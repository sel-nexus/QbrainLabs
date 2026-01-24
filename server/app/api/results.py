from fastapi import APIRouter, Depends, HTTPException
import statistics
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
        raw_scores = {} # Support for variance calc
        
        for v in votes:
            if not v.scores: continue
            for criterion, score in v.scores.items():
                # Cast score to float/int to be safe
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

        # Normalize variance for UI? Raw variance is fine for now on 0-100 scale.
        avg_variance = 0.0
        if criteria_variances:
            avg_variance = sum(criteria_variances) / len(criteria_variances)
        
        # Calculate X and Y coordinates
        x_val = None
        y_val = None
        
        template_id = workshop.config.get('template_id')
        
        if template_id == '7_POINT_COMPREHENSIVE':
            # Y-Axis (Value/Impact): AVG(Business Impact, Strategic Alignment, Scalability & Value)
            y_params = ['Business Impact', 'Strategic Alignment', 'Scalability & Value']
            y_sum = 0
            y_count = 0
            for p in y_params:
                if p in avgs:
                    y_sum += avgs[p]
                    y_count += 1
            if y_count > 0:
                y_val = round(y_sum / y_count, 2)
            
            # X-Axis (Feasibility): AVG(Ease of Implementation, Data Readiness, Organizational Readiness, (11 - Risk))
            x_params = ['Ease of Implementation', 'Data Readiness', 'Organizational Readiness']
            x_sum = 0
            x_count = 0
            for p in x_params:
                if p in avgs:
                    x_sum += avgs[p]
                    x_count += 1
            
            # Risk & Compliance is inverse
            if 'Risk & Compliance' in avgs:
                # Assuming 1-10 scale
                inverted_risk = 11.0 - avgs['Risk & Compliance']
                x_sum += inverted_risk
                x_count += 1
            
            if x_count > 0:
                x_val = round(x_sum / x_count, 2)
                
        else:
            # Fallback / Custom Logic
            # Try to map 'Feasibility' -> X, 'Impact'/'Value' -> Y
            # Case insensitive lookup could be better but let's stick to simple first
            
            # Feasibility synonyms
            for key in ['Feasibility', 'Ease of Implementation', 'Effort (Inverse)']:
                if key in avgs:
                    x_val = avgs[key]
                    break
            
            # Value synonyms
            for key in ['Business Value', 'Impact', 'Value', 'Business Impact']:
                if key in avgs:
                    y_val = avgs[key]
                    break

        aggregated_results.append(AggregatedResult(
            id=uc.id,
            title=uc.title,
            description=uc.description,
            category=uc.category,
            scores=avgs,
            total_score=round(final_score, 2),
            vote_count=vote_count,
            variance=round(avg_variance, 2),
            x=x_val,
            y=y_val
        ))
        
    # Sort by total score descending
    aggregated_results.sort(key=lambda x: x.total_score, reverse=True)
        
    return aggregated_results
