from fastapi import APIRouter, Depends, HTTPException
import math
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.db_utils import get_or_404
from app.models.models import Workshop
from app.schemas.results import AggregatedResult
from typing import List

from app.services.workshop_results import compute_workshop_results


router = APIRouter()

@router.get("/{workshop_id}", response_model=List[AggregatedResult])
async def get_workshop_results(workshop_id: str, db: AsyncSession = Depends(get_db)):
    """Ranked results (highest first). Same numbers as the CSV and PDF exports."""
    workshop = await get_or_404(db, Workshop, workshop_id, "Workshop")
    aggregated_results = [AggregatedResult(**r) for r in await compute_workshop_results(db, workshop)]

    # Apply jittering to overlapping points
    # Group by coordinates to detect overlaps
    coord_groups = {}
    for result in aggregated_results:
        if result.x is not None and result.y is not None:
            # Round to 1 decimal to catch near-overlaps
            coord_key = (round(result.x, 1), round(result.y, 1))
            if coord_key not in coord_groups:
                coord_groups[coord_key] = []
            coord_groups[coord_key].append(result)
    
    # Apply jitter to groups with multiple items
    jitter_amount = 5.0  # Units to offset overlapping points (increased for visibility)
    for coord_key, group in coord_groups.items():
        if len(group) > 1:
            # Apply simple deterministic jitter based on position in group
            for i, result in enumerate(group):
                # Simple offset pattern: spread items in a cross pattern
                if i == 0:
                    # First item: slight offset right and up
                    x_offset = jitter_amount
                    y_offset = jitter_amount
                elif i == 1:
                    # Second item: slight offset left and down
                    x_offset = -jitter_amount
                    y_offset = -jitter_amount
                else:
                    # Additional items: spread further
                    angle = (i - 2) * (360 / max(1, len(group) - 2))
                    x_offset = jitter_amount * 1.5 * math.cos(math.radians(angle))
                    y_offset = jitter_amount * 1.5 * math.sin(math.radians(angle))

                
                # Apply jitter while keeping within bounds
                result.x = max(0, min(100, result.x + x_offset))
                result.y = max(0, min(100, result.y + y_offset))

        
    return aggregated_results
