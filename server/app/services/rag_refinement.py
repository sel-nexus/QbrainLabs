"""
RAG Refinement Service for continuous improvement.

This service collects feedback, analyzes AI response quality,
and automatically refines prompts and retrieval strategies.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.rag_feedback import AIFeedback, RAGMetric, PromptTemplate
import json


class RAGRefinementService:
    """Service for continuous RAG system refinement."""
    
    def __init__(self, rag_service):
        """
        Initialize the refinement service.
        
        Args:
            rag_service: The RAG service instance to refine
        """
        self.rag_service = rag_service
    
    async def collect_feedback(
        self,
        db: AsyncSession,
        endpoint: str,
        request_data: Dict[str, Any],
        response_data: Dict[str, Any],
        rating: Optional[int] = None,
        is_helpful: Optional[bool] = None,
        feedback_text: Optional[str] = None,
        response_time_ms: Optional[int] = None,
        workshop_id: Optional[str] = None,
        use_case_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> AIFeedback:
        """
        Collect user feedback on an AI response.
        
        Args:
            db: Database session
            endpoint: API endpoint that was called
            request_data: Original request payload
            response_data: AI response
            rating: 1-5 star rating
            is_helpful: Thumbs up/down
            feedback_text: Optional text feedback
            response_time_ms: Response time in milliseconds
            workshop_id: Associated workshop ID
            use_case_id: Associated use case ID
            user_id: User who provided feedback
            
        Returns:
            The created AIFeedback record
        """
        feedback = AIFeedback(
            endpoint=endpoint,
            request_data=request_data,
            response_data=response_data,
            rating=rating,
            is_helpful=is_helpful,
            feedback_text=feedback_text,
            response_time_ms=response_time_ms,
            workshop_id=workshop_id,
            use_case_id=use_case_id,
            user_id=user_id,
            model_used=response_data.get("model_used"),
            is_mock=response_data.get("is_mock", False)
        )
        
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        
        print(f"✅ Collected feedback for {endpoint}: {'👍' if is_helpful else '👎' if is_helpful is False else '⭐' * (rating or 0)}")
        
        # Trigger async analysis
        await self._analyze_feedback_async(db, endpoint)
        
        return feedback
    
    async def get_feedback_analytics(
        self,
        db: AsyncSession,
        endpoint: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get analytics on collected feedback."""
        since = datetime.utcnow() - timedelta(days=days)
        
        query = select(AIFeedback).where(AIFeedback.created_at >= since)
        
        if endpoint:
            query = query.where(AIFeedback.endpoint == endpoint)
        
        result = await db.execute(query)
        feedbacks = result.scalars().all()
        
        if not feedbacks:
            return {
                "total_feedback": 0,
                "period_days": days,
                "endpoint": endpoint
            }
        
        # Calculate metrics
        ratings = [f.rating for f in feedbacks if f.rating is not None]
        helpful_votes = [f.is_helpful for f in feedbacks if f.is_helpful is not None]
        response_times = [f.response_time_ms for f in feedbacks if f.response_time_ms is not None]
        
        analytics = {
            "total_feedback": len(feedbacks),
            "period_days": days,
            "endpoint": endpoint,
            "ratings": {
                "count": len(ratings),
                "average": sum(ratings) / len(ratings) if ratings else 0,
                "distribution": {
                    str(i): ratings.count(i) for i in range(1, 6)
                }
            },
            "helpful_votes": {
                "count": len(helpful_votes),
                "helpful": helpful_votes.count(True),
                "not_helpful": helpful_votes.count(False),
                "helpful_percentage": (helpful_votes.count(True) / len(helpful_votes) * 100) if helpful_votes else 0
            },
            "performance": {
                "avg_response_time_ms": sum(response_times) / len(response_times) if response_times else 0,
                "min_response_time_ms": min(response_times) if response_times else 0,
                "max_response_time_ms": max(response_times) if response_times else 0
            },
            "mock_vs_real": {
                "mock_count": sum(1 for f in feedbacks if f.is_mock),
                "real_count": sum(1 for f in feedbacks if not f.is_mock)
            }
        }
        
        return analytics
    
    async def get_low_quality_responses(
        self,
        db: AsyncSession,
        threshold_rating: int = 2,
        limit: int = 10
    ) -> List[AIFeedback]:
        """Get low-quality responses for analysis."""
        result = await db.execute(
            select(AIFeedback)
            .where(
                and_(
                    AIFeedback.rating.isnot(None),
                    AIFeedback.rating <= threshold_rating
                )
            )
            .order_by(AIFeedback.created_at.desc())
            .limit(limit)
        )
        
        return result.scalars().all()
    
    async def get_high_quality_responses(
        self,
        db: AsyncSession,
        threshold_rating: int = 4,
        limit: int = 10
    ) -> List[AIFeedback]:
        """Get high-quality responses for analysis."""
        result = await db.execute(
            select(AIFeedback)
            .where(
                and_(
                    AIFeedback.rating.isnot(None),
                    AIFeedback.rating >= threshold_rating
                )
            )
            .order_by(AIFeedback.created_at.desc())
            .limit(limit)
        )
        
        return result.scalars().all()
    
    async def _analyze_feedback_async(
        self,
        db: AsyncSession,
        endpoint: str
    ):
        """Asynchronously analyze feedback and update metrics."""
        # Get recent feedback for this endpoint
        since = datetime.utcnow() - timedelta(hours=1)
        
        result = await db.execute(
            select(AIFeedback)
            .where(
                and_(
                    AIFeedback.endpoint == endpoint,
                    AIFeedback.created_at >= since
                )
            )
        )
        feedbacks = result.scalars().all()
        
        if not feedbacks:
            return
        
        # Calculate quality score
        ratings = [f.rating for f in feedbacks if f.rating is not None]
        helpful_votes = [f.is_helpful for f in feedbacks if f.is_helpful is not None]
        
        quality_score = 0.0
        if ratings:
            quality_score = sum(ratings) / len(ratings) / 5.0  # Normalize to 0-1
        elif helpful_votes:
            quality_score = helpful_votes.count(True) / len(helpful_votes)
        
        # Store metric
        metric = RAGMetric(
            metric_type="response_quality",
            metric_value=quality_score,
            endpoint=endpoint,
            period="hourly",
            period_start=since,
            period_end=datetime.utcnow(),
            sample_count=len(feedbacks),
            details={
                "avg_rating": sum(ratings) / len(ratings) if ratings else None,
                "helpful_percentage": (helpful_votes.count(True) / len(helpful_votes) * 100) if helpful_votes else None
            }
        )
        
        db.add(metric)
        await db.commit()
        
        print(f"📊 Updated quality metric for {endpoint}: {quality_score:.2f}")
    
    async def create_prompt_template(
        self,
        db: AsyncSession,
        name: str,
        template_text: str,
        endpoint: str,
        description: Optional[str] = None,
        category: Optional[str] = None,
        variant: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> PromptTemplate:
        """Create a new prompt template."""
        template = PromptTemplate(
            name=name,
            description=description,
            template_text=template_text,
            endpoint=endpoint,
            category=category,
            variant=variant,
            created_by=user_id
        )
        
        db.add(template)
        await db.commit()
        await db.refresh(template)
        
        print(f"✅ Created prompt template: {name}")
        return template
    
    async def get_active_prompt(
        self,
        db: AsyncSession,
        endpoint: str,
        variant: Optional[str] = None
    ) -> Optional[PromptTemplate]:
        """Get the active prompt template for an endpoint."""
        query = select(PromptTemplate).where(
            and_(
                PromptTemplate.endpoint == endpoint,
                PromptTemplate.is_active == True
            )
        )
        
        if variant:
            query = query.where(PromptTemplate.variant == variant)
        
        # Get the most recent version
        query = query.order_by(PromptTemplate.version.desc())
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def update_prompt_success_rate(
        self,
        db: AsyncSession,
        template_id: str
    ):
        """Update the success rate of a prompt template based on feedback."""
        template = await db.get(PromptTemplate, template_id)
        if not template:
            return
        
        # Get feedback for this template's endpoint
        since = datetime.utcnow() - timedelta(days=7)
        
        result = await db.execute(
            select(AIFeedback)
            .where(
                and_(
                    AIFeedback.endpoint == template.endpoint,
                    AIFeedback.created_at >= since
                )
            )
        )
        feedbacks = result.scalars().all()
        
        if not feedbacks:
            return
        
        # Calculate success rate
        successful = sum(
            1 for f in feedbacks
            if (f.rating and f.rating >= 4) or (f.is_helpful == True)
        )
        
        template.success_rate = successful / len(feedbacks)
        template.usage_count = len(feedbacks)
        
        await db.commit()
        
        print(f"📊 Updated prompt success rate: {template.name} = {template.success_rate:.2%}")
    
    async def suggest_improvements(
        self,
        db: AsyncSession,
        endpoint: str
    ) -> Dict[str, Any]:
        """Analyze feedback and suggest improvements."""
        # Get low-quality responses
        low_quality = await self.get_low_quality_responses(db, threshold_rating=2, limit=20)
        high_quality = await self.get_high_quality_responses(db, threshold_rating=4, limit=20)
        
        suggestions = {
            "endpoint": endpoint,
            "analysis_date": datetime.utcnow().isoformat(),
            "low_quality_count": len(low_quality),
            "high_quality_count": len(high_quality),
            "suggestions": []
        }
        
        # Analyze common patterns in low-quality responses
        if low_quality:
            low_quality_patterns = self._analyze_patterns(low_quality)
            suggestions["low_quality_patterns"] = low_quality_patterns
            
            if low_quality_patterns.get("common_issues"):
                suggestions["suggestions"].append({
                    "type": "prompt_refinement",
                    "priority": "high",
                    "description": "Refine prompts to address common issues",
                    "details": low_quality_patterns["common_issues"]
                })
        
        # Analyze successful patterns
        if high_quality:
            high_quality_patterns = self._analyze_patterns(high_quality)
            suggestions["high_quality_patterns"] = high_quality_patterns
            
            if high_quality_patterns.get("success_factors"):
                suggestions["suggestions"].append({
                    "type": "replicate_success",
                    "priority": "medium",
                    "description": "Replicate successful response patterns",
                    "details": high_quality_patterns["success_factors"]
                })
        
        return suggestions
    
    def _analyze_patterns(self, feedbacks: List[AIFeedback]) -> Dict[str, Any]:
        """Analyze patterns in feedback."""
        patterns = {
            "total_samples": len(feedbacks),
            "avg_response_time": 0,
            "common_request_types": {},
            "feedback_themes": []
        }
        
        # Analyze response times
        response_times = [f.response_time_ms for f in feedbacks if f.response_time_ms]
        if response_times:
            patterns["avg_response_time"] = sum(response_times) / len(response_times)
        
        # Analyze request types
        for feedback in feedbacks:
            request_type = feedback.request_data.get("type", "unknown")
            patterns["common_request_types"][request_type] = patterns["common_request_types"].get(request_type, 0) + 1
        
        # Analyze feedback text
        feedback_texts = [f.feedback_text for f in feedbacks if f.feedback_text]
        if feedback_texts:
            # Simple keyword extraction (could be enhanced with NLP)
            all_words = " ".join(feedback_texts).lower().split()
            word_freq = {}
            for word in all_words:
                if len(word) > 4:  # Only meaningful words
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Get top themes
            patterns["feedback_themes"] = sorted(
                word_freq.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
        
        return patterns
