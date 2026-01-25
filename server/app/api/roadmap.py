"""
Roadmap API Endpoints for US20: AI Implementation Roadmap Generator
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.core.database import get_db
from app.models.roadmap import (
    Roadmap, RoadmapPhase, RoadmapTask, TaskDependency,
    RoadmapMilestone, ResourceAllocation, RoadmapScenario
)
from app.models.models import UseCase, Workshop, User
from app.schemas.roadmap import (
    RoadmapGenerateRequest, RoadmapGenerateResponse, RoadmapResponse,
    RoadmapUpdateRequest, TimelineResponse, ResourcesResponse,
    RoadmapPhaseResponse, RoadmapTaskResponse, RoadmapMilestoneResponse,
    TaskDependencyResponse, ConfidenceResponse, ResourceSummaryResponse,
    ResourceOptimizeRequest, ResourceOptimizeResponse, CriticalPathResponse,
    EstimationRequest, EstimationResponse, ExportRequest, ExportResponse,
    ScenarioCreateRequest, ScenarioResponse
)
from app.services.roadmap_service import roadmap_service, RoadmapService
from app.middleware.rbac import require_facilitator
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/roadmaps", tags=["roadmaps"])


@router.post("/generate", response_model=RoadmapGenerateResponse)
async def generate_roadmap(
    request: RoadmapGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new roadmap from workshop use cases.
    Requires facilitator or admin access to the workshop.
    """
    # Verify workshop exists and user has access
    workshop = await db.get(Workshop, request.workshop_id)
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    # Check access (admin or facilitator)
    if not current_user.is_admin_user and workshop.facilitator_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You must be the workshop facilitator or an admin to generate roadmaps"
        )
    
    # Fetch use cases
    use_cases = []
    for uc_id in request.use_case_ids:
        use_case = await db.get(UseCase, uc_id)
        if not use_case:
            raise HTTPException(status_code=404, detail=f"Use case {uc_id} not found")
        if use_case.workshop_id != request.workshop_id:
            raise HTTPException(
                status_code=400,
                detail=f"Use case {uc_id} does not belong to workshop"
            )
        use_cases.append(use_case)
    
    if not use_cases:
        raise HTTPException(status_code=400, detail="At least one use case is required")
    
    # Generate roadmap using service
    timeline_data = await roadmap_service.generate_timeline(
        use_cases,
        request.constraints,
        request.options
    )
    
    resources_data = await roadmap_service.calculate_resources(
        timeline_data,
        request.constraints
    )
    
    milestones_data = await roadmap_service.generate_milestones(timeline_data)
    
    # Store task mapping for dependencies
    task_id_mapping = {}  # Maps (phase_name, task_index) -> task_id
    
    confidence_data = await roadmap_service.calculate_confidence(use_cases, timeline_data)
    
    # Create roadmap record
    roadmap = Roadmap(
        workshop_id=request.workshop_id,
        name=f"Roadmap for {workshop.title}",
        start_date=timeline_data["start_date"],
        end_date=timeline_data["end_date"],
        status="GENERATED",
        constraints=request.constraints.model_dump(),
        options=request.options.model_dump() if request.options else {},
        confidence=confidence_data
    )
    db.add(roadmap)
    await db.flush()
    
    # Create phases and tasks
    for phase_idx, phase_data in enumerate(timeline_data["phases"]):
        phase = RoadmapPhase(
            roadmap_id=roadmap.id,
            name=phase_data["name"],
            order_index=phase_data["order_index"],
            start_date=phase_data["start_date"],
            end_date=phase_data["end_date"],
            duration_weeks=phase_data["duration_weeks"],
            status="NOT_STARTED"
        )
        db.add(phase)
        await db.flush()
        
        for task_idx, task_data in enumerate(phase_data["tasks"]):
            task = RoadmapTask(
                phase_id=phase.id,
                use_case_id=UUID(task_data["use_case_id"]) if task_data.get("use_case_id") else None,
                name=task_data["name"],
                description=task_data.get("description"),
                start_date=task_data["start_date"],
                end_date=task_data["end_date"],
                duration_days=task_data["duration_days"],
                status=task_data["status"],
                progress_percent=task_data["progress_percent"]
            )
            db.add(task)
            await db.flush()
            
            # Store task ID for dependency mapping
            task_id_mapping[(phase_data["name"], task_idx)] = task.id
            
            # Add resource allocations
            phase_name = phase_data["name"]
            role_mapping = {
                "Discovery": [{"role": "Product Manager", "fte": "0.5"}, {"role": "Business Analyst", "fte": "1.0"}],
                "Design": [{"role": "Solution Architect", "fte": "0.5"}, {"role": "UX Designer", "fte": "0.5"}],
                "Build": [{"role": "ML Engineer", "fte": "1.0"}, {"role": "Backend Developer", "fte": "1.5"}],
                "Test": [{"role": "QA Engineer", "fte": "1.0"}],
                "Deploy": [{"role": "DevOps Engineer", "fte": "0.5"}]
            }
            
            for role_info in role_mapping.get(phase_name, []):
                allocation = ResourceAllocation(
                    task_id=task.id,
                    role=role_info["role"],
                    fte=role_info["fte"],
                    skills_required=RoadmapService._get_skills_for_role(role_info["role"])
                )
                db.add(allocation)
    
    # Create dependencies (after all tasks are created)
    dependencies_data = []
    phase_order = ["Discovery", "Design", "Build", "Test", "Deploy"]
    for i in range(len(phase_order) - 1):
        current_phase = phase_order[i]
        next_phase = phase_order[i + 1]
        
        # Get first task of next phase and last task of current phase
        current_tasks = [(k, v) for k, v in task_id_mapping.items() if k[0] == current_phase]
        next_tasks = [(k, v) for k, v in task_id_mapping.items() if k[0] == next_phase]
        
        if current_tasks and next_tasks:
            from_task_id = current_tasks[-1][1]  # Last task of current phase
            to_task_id = next_tasks[0][1]  # First task of next phase
            
            dependency = TaskDependency(
                from_task_id=from_task_id,
                to_task_id=to_task_id,
                dependency_type="FINISH_TO_START",
                lag_days=0
            )
            db.add(dependency)
            await db.flush()
            
            dependencies_data.append({
                "id": dependency.id,
                "from_task_id": from_task_id,
                "to_task_id": to_task_id,
                "dependency_type": "FINISH_TO_START",
                "lag_days": 0
            })
    
    # Create milestones
    for milestone_data in milestones_data:
        milestone = RoadmapMilestone(
            roadmap_id=roadmap.id,
            name=milestone_data["name"],
            target_date=milestone_data.get("target_date"),
            status=milestone_data["status"],
            deliverables=milestone_data["deliverables"],
            owner=milestone_data.get("owner")
        )
        db.add(milestone)
    
    await db.commit()
    await db.refresh(roadmap)
    
    # Build response
    return RoadmapGenerateResponse(
        roadmap_id=roadmap.id,
        timeline=TimelineResponse(**timeline_data),
        resources=ResourcesResponse(**resources_data),
        milestones=[RoadmapMilestoneResponse(**m) for m in milestones_data],
        dependencies=[TaskDependencyResponse(**d) for d in dependencies_data],
        confidence=ConfidenceResponse(**confidence_data)
    )


@router.get("/{roadmap_id}", response_model=RoadmapResponse)
async def get_roadmap(
    roadmap_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a roadmap by ID."""
    roadmap = await db.get(Roadmap, roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Check access
    workshop = await db.get(Workshop, roadmap.workshop_id)
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    if not current_user.is_admin_user and workshop.facilitator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Load related data
    phases_query = select(RoadmapPhase).where(RoadmapPhase.roadmap_id == roadmap_id).order_by(RoadmapPhase.order_index)
    phases_result = await db.execute(phases_query)
    phases = phases_result.scalars().all()
    
    tasks_by_phase = {}
    for phase in phases:
        tasks_query = select(RoadmapTask).where(RoadmapTask.phase_id == phase.id)
        tasks_result = await db.execute(tasks_query)
        tasks = tasks_result.scalars().all()
        
        task_responses = []
        for task in tasks:
            allocations_query = select(ResourceAllocation).where(ResourceAllocation.task_id == task.id)
            allocations_result = await db.execute(allocations_query)
            allocations = allocations_result.scalars().all()
            
            task_responses.append(RoadmapTaskResponse(
                id=task.id,
                phase_id=task.phase_id,
                use_case_id=task.use_case_id,
                name=task.name,
                description=task.description,
                start_date=task.start_date,
                end_date=task.end_date,
                duration_days=task.duration_days,
                progress_percent=task.progress_percent,
                status=task.status,
                assigned_resources=task.assigned_resources or [],
                resource_allocations=[ResourceAllocationResponse(
                    id=a.id,
                    role=a.role,
                    fte=a.fte,
                    skills_required=a.skills_required or [],
                    notes=a.notes
                ) for a in allocations]
            ))
        
        tasks_by_phase[phase.id] = task_responses
    
    milestones_query = select(RoadmapMilestone).where(RoadmapMilestone.roadmap_id == roadmap_id)
    milestones_result = await db.execute(milestones_query)
    milestones = milestones_result.scalars().all()
    
    dependencies_query = select(TaskDependency).join(RoadmapTask).where(RoadmapTask.phase_id.in_([p.id for p in phases]))
    dependencies_result = await db.execute(dependencies_query)
    dependencies = dependencies_result.scalars().all()
    
    # Calculate resources summary
    total_fte = sum(float(a.fte) for phase in phases for task in tasks_by_phase.get(phase.id, []) for a in task.resource_allocations)
    
    return RoadmapResponse(
        id=roadmap.id,
        workshop_id=roadmap.workshop_id,
        name=roadmap.name,
        start_date=roadmap.start_date,
        end_date=roadmap.end_date,
        status=roadmap.status,
        constraints=roadmap.constraints or {},
        options=roadmap.options or {},
        confidence=roadmap.confidence or {},
        timeline=TimelineResponse(
            start_date=roadmap.start_date,
            end_date=roadmap.end_date,
            total_weeks=int((roadmap.end_date - roadmap.start_date).days / 7) if roadmap.end_date and roadmap.start_date else None,
            phases=[RoadmapPhaseResponse(
                id=phase.id,
                roadmap_id=phase.roadmap_id,
                name=phase.name,
                order_index=phase.order_index,
                start_date=phase.start_date,
                end_date=phase.end_date,
                duration_weeks=phase.duration_weeks,
                status=phase.status,
                description=phase.description,
                tasks=tasks_by_phase.get(phase.id, [])
            ) for phase in phases]
        ),
        resources=ResourcesResponse(
            total_fte=total_fte,
            roles=[],
            by_phase=[],
            by_role=[],
            skill_gaps=[]
        ),
        milestones=[RoadmapMilestoneResponse(
            id=m.id,
            roadmap_id=m.roadmap_id,
            name=m.name,
            target_date=m.target_date,
            actual_date=m.actual_date,
            status=m.status,
            deliverables=m.deliverables or [],
            owner=m.owner,
            description=m.description
        ) for m in milestones],
        dependencies=[TaskDependencyResponse(
            id=d.id,
            from_task_id=d.from_task_id,
            to_task_id=d.to_task_id,
            dependency_type=d.dependency_type,
            lag_days=d.lag_days
        ) for d in dependencies],
        created_at=roadmap.created_at,
        updated_at=roadmap.updated_at
    )


@router.get("/workshops/{workshop_id}", response_model=List[RoadmapResponse])
async def list_workshop_roadmaps(
    workshop_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all roadmaps for a workshop."""
    workshop = await db.get(Workshop, workshop_id)
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    if not current_user.is_admin_user and workshop.facilitator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = select(Roadmap).where(Roadmap.workshop_id == workshop_id)
    result = await db.execute(query)
    roadmaps = result.scalars().all()
    
    # Return simplified list (full details available via GET /{roadmap_id})
    return [
        RoadmapResponse(
            id=r.id,
            workshop_id=r.workshop_id,
            name=r.name,
            start_date=r.start_date,
            end_date=r.end_date,
            status=r.status,
            constraints=r.constraints or {},
            options=r.options or {},
            confidence=r.confidence or {},
            timeline=TimelineResponse(start_date=r.start_date, end_date=r.end_date, total_weeks=None, phases=[]),
            resources=ResourcesResponse(total_fte=0.0, roles=[]),
            milestones=[],
            dependencies=[],
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in roadmaps
    ]


@router.put("/{roadmap_id}", response_model=RoadmapResponse)
async def update_roadmap(
    roadmap_id: UUID,
    request: RoadmapUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a roadmap."""
    roadmap = await db.get(Roadmap, roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Check access
    workshop = await db.get(Workshop, roadmap.workshop_id)
    if not current_user.is_admin_user and workshop.facilitator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if request.name:
        roadmap.name = request.name
    if request.start_date:
        roadmap.start_date = request.start_date
    if request.end_date:
        roadmap.end_date = request.end_date
    if request.status:
        roadmap.status = request.status
    if request.constraints:
        roadmap.constraints = request.constraints
    
    await db.commit()
    await db.refresh(roadmap)
    
    return await get_roadmap(roadmap_id, db, current_user)


@router.delete("/{roadmap_id}")
async def delete_roadmap(
    roadmap_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a roadmap."""
    roadmap = await db.get(Roadmap, roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Check access
    workshop = await db.get(Workshop, roadmap.workshop_id)
    if not current_user.is_admin_user and workshop.facilitator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.delete(roadmap)
    await db.commit()
    
    return {"message": "Roadmap deleted successfully"}


@router.get("/{roadmap_id}/resources", response_model=ResourceSummaryResponse)
async def get_roadmap_resources(
    roadmap_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get resource summary for a roadmap."""
    roadmap = await db.get(Roadmap, roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Check access
    workshop = await db.get(Workshop, roadmap.workshop_id)
    if not current_user.is_admin_user and workshop.facilitator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate total FTE
    phases_query = select(RoadmapPhase).where(RoadmapPhase.roadmap_id == roadmap_id)
    phases_result = await db.execute(phases_query)
    phases = phases_result.scalars().all()
    
    total_fte = 0.0
    for phase in phases:
        tasks_query = select(RoadmapTask).where(RoadmapTask.phase_id == phase.id)
        tasks_result = await db.execute(tasks_query)
        tasks = tasks_result.scalars().all()
        
        for task in tasks:
            allocations_query = select(ResourceAllocation).where(ResourceAllocation.task_id == task.id)
            allocations_result = await db.execute(allocations_query)
            allocations = allocations_result.scalars().all()
            
            total_fte += sum(float(a.fte) for a in allocations)
    
    return ResourceSummaryResponse(total_fte=total_fte)


@router.post("/{roadmap_id}/critical-path", response_model=CriticalPathResponse)
async def calculate_critical_path(
    roadmap_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate critical path for a roadmap."""
    roadmap = await db.get(Roadmap, roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Check access
    workshop = await db.get(Workshop, roadmap.workshop_id)
    if not current_user.is_admin_user and workshop.facilitator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Simplified critical path calculation
    # In a full implementation, this would use proper CPM algorithm
    phases_query = select(RoadmapPhase).where(RoadmapPhase.roadmap_id == roadmap_id).order_by(RoadmapPhase.order_index)
    phases_result = await db.execute(phases_query)
    phases = phases_result.scalars().all()
    
    critical_tasks = []
    for phase in phases:
        tasks_query = select(RoadmapTask).where(RoadmapTask.phase_id == phase.id).order_by(RoadmapTask.start_date)
        tasks_result = await db.execute(tasks_query)
        tasks = tasks_result.scalars().all()
        if tasks:
            critical_tasks.append(tasks[0].id)  # First task of each phase
    
    return CriticalPathResponse(
        critical_path_tasks=critical_tasks,
        slack_times={},
        earliest_completion=roadmap.end_date or date.today()
    )
