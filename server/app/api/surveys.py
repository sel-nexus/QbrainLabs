from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import uuid
import re
from collections import Counter

from app.core.database import get_db
from app.models import (
    Survey, SurveyStatus, SurveyQuestion, QuestionType,
    SurveyResponse, SurveyAnswer, SurveyTemplate,
    Workshop, Participant, User
)
from app.schemas.survey import (
    SurveyCreate, SurveyUpdate, SurveyResponse as SurveyResponseSchema,
    SurveyListResponse, SurveyListItem,
    QuestionCreate, QuestionUpdate, QuestionResponse,
    SurveySubmissionCreate, SurveySubmissionPartial,
    SurveyProgress, ParticipantSurveyStatus,
    SurveyResults, QuestionResults, OptionDistribution,
    WordCloudResponse, WordCloudItem,
    TemplateListResponse, TemplateListItem, SurveyTemplateResponse,
    ActivateSurveyRequest, PauseSurveyRequest
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/surveys", tags=["surveys"])


# Helper function to check facilitator access
async def verify_facilitator_access(
    workshop_id: str,
    user: User,
    db: AsyncSession
) -> Workshop:
    """Verify user has facilitator access to the workshop"""
    result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id)
    )
    workshop = result.scalar_one_or_none()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    if str(workshop.facilitator_id) != str(user.id) and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to manage this workshop's surveys")
    
    return workshop


# ==================== Survey CRUD ====================

@router.post("/workshop/{workshop_id}", response_model=SurveyResponseSchema)
async def create_survey(
    workshop_id: str,
    survey_data: SurveyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new survey for a workshop"""
    workshop = await verify_facilitator_access(workshop_id, current_user, db)
    
    # Create survey
    survey = Survey(
        id=uuid.uuid4(),
        workshop_id=workshop.id,
        facilitator_id=current_user.id,
        title=survey_data.title,
        description=survey_data.description,
        status=SurveyStatus.DRAFT,
        settings=survey_data.settings.model_dump() if survey_data.settings else {},
        template_id=survey_data.template_id
    )
    db.add(survey)
    
    # Add questions if provided
    if survey_data.questions:
        for idx, q in enumerate(survey_data.questions):
            question = SurveyQuestion(
                id=uuid.uuid4(),
                survey_id=survey.id,
                order=q.order if q.order is not None else idx,
                text=q.text,
                type=q.type.value,
                required=q.required,
                options=q.options,
                config=q.config.model_dump() if q.config else {}
            )
            db.add(question)
    
    await db.commit()
    await db.refresh(survey)
    
    # Load questions
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(Survey.id == survey.id)
    )
    survey = result.scalar_one()
    
    return _survey_to_response(survey)


@router.get("/workshop/{workshop_id}", response_model=SurveyListResponse)
async def list_workshop_surveys(
    workshop_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all surveys for a workshop"""
    await verify_facilitator_access(workshop_id, current_user, db)
    
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions), selectinload(Survey.responses))
        .where(Survey.workshop_id == workshop_id)
        .order_by(Survey.created_at.desc())
    )
    surveys = result.scalars().all()
    
    items = []
    for s in surveys:
        items.append(SurveyListItem(
            id=str(s.id),
            title=s.title,
            status=s.status,
            question_count=len(s.questions),
            response_count=len([r for r in s.responses if r.status == "completed"]),
            created_at=s.created_at,
            activated_at=s.activated_at
        ))
    
    return SurveyListResponse(surveys=items)


@router.get("/{survey_id}", response_model=SurveyResponseSchema)
async def get_survey(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get survey details"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    return _survey_to_response(survey)


@router.put("/{survey_id}", response_model=SurveyResponseSchema)
async def update_survey(
    survey_id: str,
    survey_data: SurveyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update survey details"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    # Update fields
    if survey_data.title is not None:
        survey.title = survey_data.title
    if survey_data.description is not None:
        survey.description = survey_data.description
    if survey_data.settings is not None:
        survey.settings = survey_data.settings.model_dump()
    
    survey.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(survey)
    
    return _survey_to_response(survey)


@router.delete("/{survey_id}")
async def delete_survey(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a draft survey"""
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft surveys can be deleted")
    
    await db.delete(survey)
    await db.commit()
    
    return {"success": True, "message": "Survey deleted"}


# ==================== Question Management ====================

@router.post("/{survey_id}/questions", response_model=QuestionResponse)
async def add_question(
    survey_id: str,
    question_data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a question to a survey"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    # Determine order
    max_order = max([q.order for q in survey.questions], default=-1)
    order = question_data.order if question_data.order is not None else max_order + 1
    
    question = SurveyQuestion(
        id=uuid.uuid4(),
        survey_id=survey.id,
        order=order,
        text=question_data.text,
        type=question_data.type.value,
        required=question_data.required,
        options=question_data.options,
        config=question_data.config.model_dump() if question_data.config else {}
    )
    db.add(question)
    
    survey.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(question)
    
    return _question_to_response(question)


@router.put("/{survey_id}/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    survey_id: str,
    question_id: str,
    question_data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a question"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions), selectinload(Survey.responses))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    # Find question
    question = next((q for q in survey.questions if str(q.id) == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if survey is active with responses
    has_responses = len(survey.responses) > 0
    if survey.status == SurveyStatus.ACTIVE and has_responses:
        # Limited editing for active surveys
        if question_data.text is not None:
            question.text = question_data.text  # Allow text edit with warning
    else:
        # Full editing for draft/inactive surveys
        if question_data.text is not None:
            question.text = question_data.text
        if question_data.required is not None:
            question.required = question_data.required
        if question_data.options is not None:
            question.options = question_data.options
        if question_data.config is not None:
            question.config = question_data.config.model_dump()
    
    question.updated_at = datetime.utcnow()
    survey.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(question)
    
    return _question_to_response(question)


@router.delete("/{survey_id}/questions/{question_id}")
async def delete_question(
    survey_id: str,
    question_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a question from a survey"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions), selectinload(Survey.responses))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    # Cannot delete questions from active surveys with responses
    if survey.status == SurveyStatus.ACTIVE and len(survey.responses) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete questions from active survey with responses")
    
    question = next((q for q in survey.questions if str(q.id) == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await db.delete(question)
    survey.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"success": True, "message": "Question deleted"}


@router.put("/{survey_id}/questions/reorder")
async def reorder_questions(
    survey_id: str,
    question_order: List[str],  # List of question IDs in new order
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reorder questions in a survey"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only reorder questions in draft surveys")
    
    # Update order
    for idx, qid in enumerate(question_order):
        question = next((q for q in survey.questions if str(q.id) == qid), None)
        if question:
            question.order = idx
    
    survey.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"success": True, "message": "Questions reordered"}


# ==================== Survey Lifecycle ====================

@router.post("/{survey_id}/activate")
async def activate_survey(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate a survey to start collecting responses"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    if survey.status not in [SurveyStatus.DRAFT, SurveyStatus.PAUSED]:
        raise HTTPException(status_code=400, detail=f"Cannot activate survey in {survey.status} status")
    
    if len(survey.questions) == 0:
        raise HTTPException(status_code=400, detail="Cannot activate survey with no questions")
    
    survey.status = SurveyStatus.ACTIVE
    survey.activated_at = datetime.utcnow()
    survey.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"success": True, "activated_at": survey.activated_at}


@router.post("/{survey_id}/pause")
async def pause_survey(
    survey_id: str,
    request: PauseSurveyRequest = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pause an active survey"""
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Can only pause active surveys")
    
    survey.status = SurveyStatus.PAUSED
    survey.paused_at = datetime.utcnow()
    survey.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"success": True, "paused_at": survey.paused_at}


@router.post("/{survey_id}/resume")
async def resume_survey(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resume a paused survey"""
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    if survey.status != SurveyStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Can only resume paused surveys")
    
    survey.status = SurveyStatus.ACTIVE
    survey.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"success": True, "resumed_at": datetime.utcnow()}


@router.post("/{survey_id}/close")
async def close_survey(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Close a survey (irreversible)"""
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    if survey.status in [SurveyStatus.CLOSED, SurveyStatus.ARCHIVED]:
        raise HTTPException(status_code=400, detail="Survey is already closed")
    
    survey.status = SurveyStatus.CLOSED
    survey.closed_at = datetime.utcnow()
    survey.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"success": True, "closed_at": survey.closed_at}


# ==================== Participant Survey Access ====================

@router.get("/{survey_id}/participant")
async def get_survey_for_participant(
    survey_id: str,
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get survey for participant to fill out"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey is not active")
    
    # Verify participant belongs to workshop
    result = await db.execute(
        select(Participant).where(
            and_(
                Participant.id == participant_id,
                Participant.workshop_id == survey.workshop_id
            )
        )
    )
    participant = result.scalar_one_or_none()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Participant not found in this workshop")
    
    # Check if already responded
    result = await db.execute(
        select(SurveyResponse).where(
            and_(
                SurveyResponse.survey_id == survey_id,
                SurveyResponse.participant_id == participant_id
            )
        )
    )
    existing_response = result.scalar_one_or_none()
    
    settings = survey.settings or {}
    if existing_response and existing_response.status == "completed":
        if not settings.get("allow_multiple_submissions", False):
            raise HTTPException(status_code=400, detail="You have already completed this survey")
    
    # Return survey without sensitive data
    return {
        "id": str(survey.id),
        "title": survey.title,
        "description": survey.description,
        "questions": [
            {
                "id": str(q.id),
                "order": q.order,
                "text": q.text,
                "type": q.type,
                "required": q.required,
                "options": q.options,
                "config": q.config
            }
            for q in sorted(survey.questions, key=lambda x: x.order)
        ],
        "existing_response_id": str(existing_response.id) if existing_response else None,
        "existing_status": existing_response.status if existing_response else None
    }


@router.post("/{survey_id}/submit")
async def submit_survey_response(
    survey_id: str,
    participant_id: str = Query(...),
    submission: SurveySubmissionCreate = None,
    db: AsyncSession = Depends(get_db)
):
    """Submit survey responses"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey is not active")
    
    # Verify participant
    result = await db.execute(
        select(Participant).where(
            and_(
                Participant.id == participant_id,
                Participant.workshop_id == survey.workshop_id
            )
        )
    )
    participant = result.scalar_one_or_none()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Participant not found in this workshop")
    
    # Get or create response
    result = await db.execute(
        select(SurveyResponse).where(
            and_(
                SurveyResponse.survey_id == survey_id,
                SurveyResponse.participant_id == participant_id
            )
        )
    )
    response = result.scalar_one_or_none()
    
    if not response:
        response = SurveyResponse(
            id=uuid.uuid4(),
            survey_id=survey.id,
            participant_id=participant.id,
            status="in_progress",
            started_at=datetime.utcnow()
        )
        db.add(response)
        await db.flush()
    
    # Save answers
    if submission and submission.answers:
        for answer_data in submission.answers:
            # Check if answer already exists
            result = await db.execute(
                select(SurveyAnswer).where(
                    and_(
                        SurveyAnswer.response_id == response.id,
                        SurveyAnswer.question_id == answer_data.question_id
                    )
                )
            )
            existing_answer = result.scalar_one_or_none()
            
            if existing_answer:
                existing_answer.value = answer_data.value
                existing_answer.updated_at = datetime.utcnow()
            else:
                answer = SurveyAnswer(
                    id=uuid.uuid4(),
                    response_id=response.id,
                    question_id=answer_data.question_id,
                    value=answer_data.value
                )
                db.add(answer)
    
    # Mark as completed
    response.status = "completed"
    response.completed_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "success": True,
        "response_id": str(response.id),
        "completed_at": response.completed_at
    }


@router.post("/{survey_id}/save-progress")
async def save_survey_progress(
    survey_id: str,
    participant_id: str = Query(...),
    answer: SurveySubmissionPartial = None,
    current_question: int = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Save partial survey progress"""
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey or survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey not available")
    
    # Get or create response
    result = await db.execute(
        select(SurveyResponse).where(
            and_(
                SurveyResponse.survey_id == survey_id,
                SurveyResponse.participant_id == participant_id
            )
        )
    )
    response = result.scalar_one_or_none()
    
    if not response:
        response = SurveyResponse(
            id=uuid.uuid4(),
            survey_id=survey.id,
            participant_id=participant_id,
            status="in_progress",
            started_at=datetime.utcnow()
        )
        db.add(response)
        await db.flush()
    
    # Update current question
    if current_question is not None:
        response.current_question = current_question
    
    # Save answer if provided
    if answer:
        result = await db.execute(
            select(SurveyAnswer).where(
                and_(
                    SurveyAnswer.response_id == response.id,
                    SurveyAnswer.question_id == answer.question_id
                )
            )
        )
        existing_answer = result.scalar_one_or_none()
        
        if existing_answer:
            existing_answer.value = answer.value
            existing_answer.updated_at = datetime.utcnow()
        else:
            new_answer = SurveyAnswer(
                id=uuid.uuid4(),
                response_id=response.id,
                question_id=answer.question_id,
                value=answer.value
            )
            db.add(new_answer)
    
    await db.commit()
    
    return {"success": True, "response_id": str(response.id)}


# ==================== Progress & Results ====================

@router.get("/{survey_id}/progress", response_model=SurveyProgress)
async def get_survey_progress(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get real-time survey progress"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.responses))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    # Get workshop participants
    result = await db.execute(
        select(Participant).where(Participant.workshop_id == survey.workshop_id)
    )
    participants = result.scalars().all()
    
    # Build response map
    response_map = {str(r.participant_id): r for r in survey.responses}
    
    started_count = len(survey.responses)
    completed_count = len([r for r in survey.responses if r.status == "completed"])
    total = len(participants)
    
    # Calculate average completion time
    completed_responses = [r for r in survey.responses if r.status == "completed" and r.completed_at and r.started_at]
    avg_time = None
    if completed_responses:
        total_seconds = sum((r.completed_at - r.started_at).total_seconds() for r in completed_responses)
        avg_time = total_seconds / len(completed_responses)
    
    # Build participant status list
    participant_statuses = []
    for p in participants:
        response = response_map.get(str(p.id))
        if response:
            participant_statuses.append(ParticipantSurveyStatus(
                participant_id=str(p.id),
                participant_name=p.display_name,
                status=response.status,
                current_question=response.current_question,
                started_at=response.started_at,
                completed_at=response.completed_at
            ))
        else:
            participant_statuses.append(ParticipantSurveyStatus(
                participant_id=str(p.id),
                participant_name=p.display_name,
                status="not_started"
            ))
    
    return SurveyProgress(
        total_participants=total,
        started_count=started_count,
        completed_count=completed_count,
        completion_rate=round(completed_count / total * 100, 1) if total > 0 else 0,
        average_time_seconds=avg_time,
        participants=participant_statuses
    )


@router.get("/{survey_id}/results", response_model=SurveyResults)
async def get_survey_results(
    survey_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get survey results with analytics"""
    result = await db.execute(
        select(Survey)
        .options(
            selectinload(Survey.questions).selectinload(SurveyQuestion.answers),
            selectinload(Survey.responses)
        )
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    completed_responses = [r for r in survey.responses if r.status == "completed"]
    total_responses = len(completed_responses)
    
    question_results = []
    for question in sorted(survey.questions, key=lambda x: x.order):
        qr = _calculate_question_results(question, total_responses)
        question_results.append(qr)
    
    return SurveyResults(
        survey_id=str(survey.id),
        total_responses=total_responses,
        questions=question_results,
        last_updated=datetime.utcnow()
    )


@router.get("/{survey_id}/questions/{question_id}/wordcloud", response_model=WordCloudResponse)
async def get_question_wordcloud(
    survey_id: str,
    question_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get word cloud data for a text question"""
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    # Get question with answers
    result = await db.execute(
        select(SurveyQuestion)
        .options(selectinload(SurveyQuestion.answers))
        .where(SurveyQuestion.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question.type not in [QuestionType.TEXT.value, QuestionType.TEXTAREA.value, "text", "textarea"]:
        raise HTTPException(status_code=400, detail="Word cloud only available for text questions")
    
    # Calculate word frequencies
    words = _calculate_word_frequencies([a.value for a in question.answers if a.value])
    
    return WordCloudResponse(
        words=words,
        total_responses=len(question.answers),
        last_updated=datetime.utcnow()
    )


# ==================== Templates ====================

@router.get("/templates/list", response_model=TemplateListResponse)
async def list_templates(
    industry: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List available survey templates"""
    query = select(SurveyTemplate).where(SurveyTemplate.is_public == True)
    
    if industry:
        query = query.where(SurveyTemplate.industry == industry)
    if category:
        query = query.where(SurveyTemplate.category == category)
    
    result = await db.execute(query.order_by(SurveyTemplate.usage_count.desc()))
    templates = result.scalars().all()
    
    items = []
    for t in templates:
        questions = t.questions or []
        items.append(TemplateListItem(
            id=str(t.id),
            name=t.name,
            industry=t.industry,
            category=t.category,
            description=t.description,
            question_count=len(questions),
            preview_questions=[q.get("text", "")[:50] for q in questions[:3]]
        ))
    
    return TemplateListResponse(templates=items)


@router.get("/templates/{template_id}", response_model=SurveyTemplateResponse)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get template details"""
    result = await db.execute(
        select(SurveyTemplate).where(SurveyTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return SurveyTemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description,
        industry=template.industry,
        category=template.category,
        questions=template.questions or [],
        tags=template.tags or [],
        is_public=template.is_public,
        usage_count=template.usage_count,
        created_by=template.created_by,
        created_at=template.created_at
    )


@router.post("/{survey_id}/apply-template")
async def apply_template_to_survey(
    survey_id: str,
    template_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apply a template to an existing survey"""
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    await verify_facilitator_access(str(survey.workshop_id), current_user, db)
    
    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only apply templates to draft surveys")
    
    result = await db.execute(
        select(SurveyTemplate).where(SurveyTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Add template questions
    existing_count = len(survey.questions)
    for idx, q in enumerate(template.questions or []):
        question = SurveyQuestion(
            id=uuid.uuid4(),
            survey_id=survey.id,
            order=existing_count + idx,
            text=q.get("text", ""),
            type=q.get("type", "text"),
            required=q.get("required", True),
            options=q.get("options"),
            config=q.get("config", {})
        )
        db.add(question)
    
    survey.template_id = str(template.id)
    survey.updated_at = datetime.utcnow()
    
    # Increment template usage
    template.usage_count += 1
    
    await db.commit()
    
    return {"success": True, "questions_added": len(template.questions or [])}


# ==================== Helper Functions ====================

def _survey_to_response(survey: Survey) -> SurveyResponseSchema:
    """Convert Survey model to response schema"""
    return SurveyResponseSchema(
        id=str(survey.id),
        workshop_id=str(survey.workshop_id),
        facilitator_id=str(survey.facilitator_id),
        title=survey.title,
        description=survey.description,
        status=survey.status,
        settings=survey.settings or {},
        template_id=survey.template_id,
        created_at=survey.created_at,
        updated_at=survey.updated_at,
        activated_at=survey.activated_at,
        paused_at=survey.paused_at,
        closed_at=survey.closed_at,
        questions=[_question_to_response(q) for q in sorted(survey.questions, key=lambda x: x.order)]
    )


def _question_to_response(question: SurveyQuestion) -> QuestionResponse:
    """Convert SurveyQuestion model to response schema"""
    return QuestionResponse(
        id=str(question.id),
        order=question.order,
        text=question.text,
        type=question.type,
        required=question.required,
        options=question.options,
        config=question.config,
        created_at=question.created_at
    )


def _calculate_question_results(question: SurveyQuestion, total_responses: int) -> QuestionResults:
    """Calculate results for a single question"""
    answers = question.answers or []
    response_count = len(answers)
    
    result = QuestionResults(
        question_id=str(question.id),
        text=question.text,
        type=question.type,
        response_count=response_count
    )
    
    if question.type in [QuestionType.MULTIPLE_CHOICE.value, QuestionType.MULTIPLE_SELECT.value, "multiple_choice", "multiple_select"]:
        # Calculate distribution
        all_values = []
        for a in answers:
            if isinstance(a.value, list):
                all_values.extend(a.value)
            elif a.value:
                all_values.append(a.value)
        
        counter = Counter(all_values)
        total = sum(counter.values()) or 1
        
        result.distribution = [
            OptionDistribution(
                option=opt,
                count=count,
                percentage=round(count / total * 100, 1)
            )
            for opt, count in counter.most_common()
        ]
    
    elif question.type in [QuestionType.RATING.value, "rating"]:
        values = [a.value for a in answers if isinstance(a.value, (int, float))]
        if values:
            result.average = round(sum(values) / len(values), 2)
            sorted_values = sorted(values)
            mid = len(sorted_values) // 2
            result.median = sorted_values[mid] if len(sorted_values) % 2 else (sorted_values[mid-1] + sorted_values[mid]) / 2
    
    elif question.type in [QuestionType.TEXT.value, QuestionType.TEXTAREA.value, "text", "textarea"]:
        result.responses = [str(a.value) for a in answers if a.value][:50]  # Limit to 50
        result.word_frequency = [{"word": w.text, "count": w.frequency} for w in _calculate_word_frequencies(result.responses)[:20]]
    
    elif question.type in [QuestionType.LIKERT.value, "likert"]:
        # Aggregate likert responses
        all_scores = {}
        for a in answers:
            if isinstance(a.value, dict):
                for stmt, score in a.value.items():
                    if stmt not in all_scores:
                        all_scores[stmt] = []
                    all_scores[stmt].append(score)
        
        if all_scores:
            avg_scores = {stmt: round(sum(scores)/len(scores), 2) for stmt, scores in all_scores.items()}
            result.average = round(sum(avg_scores.values()) / len(avg_scores), 2)
    
    return result


# Stop words for word cloud
STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
    'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
    'there', 'then', 'once', 'if', 'because', 'until', 'while', 'about',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once'
}


def _calculate_word_frequencies(texts: List[str]) -> List[WordCloudItem]:
    """Calculate word frequencies for word cloud"""
    word_counts = Counter()
    
    for text in texts:
        if not text:
            continue
        # Clean and tokenize
        words = re.findall(r'\b[a-zA-Z]{3,}\b', str(text).lower())
        # Filter stop words
        words = [w for w in words if w not in STOP_WORDS]
        word_counts.update(words)
    
    if not word_counts:
        return []
    
    # Calculate weights (1-100 scale)
    max_count = max(word_counts.values())
    
    return [
        WordCloudItem(
            text=word,
            frequency=count,
            weight=max(1, int(count / max_count * 100))
        )
        for word, count in word_counts.most_common(100)
    ]
