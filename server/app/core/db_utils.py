from typing import Any, TypeVar

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

T = TypeVar("T")


async def get_or_404(db: AsyncSession, model: type[T], id: Any, name: str) -> T:
    """Fetch a single row by primary key or raise HTTP 404."""
    result = await db.execute(select(model).where(model.id == id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{name} not found")
    return obj
