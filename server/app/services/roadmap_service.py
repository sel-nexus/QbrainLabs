"""
Roadmap Service for US20: AI Implementation Roadmap Generator
"""
import os
import json
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from uuid import UUID

from app.models.models import UseCase, Workshop
from app.schemas.roadmap import (
    RoadmapConstraints, RoadmapOptions, TimelineResponse, ResourcesResponse,
    RoadmapPhaseResponse, RoadmapTaskResponse, RoadmapMilestoneResponse,
    TaskDependencyResponse, ConfidenceResponse
)
from app.core.config import settings


class RoadmapService:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.mock_mode = settings.AI_MOCK_MODE or not self.api_key
        
        if not self.mock_mode:
            self._initialize_ai_components()
        else:
            print("RoadmapService running in MOCK MODE (No API Key found)")

    def _initialize_ai_components(self):
        try:
            from langchain_openai import ChatOpenAI
            self.llm = ChatOpenAI(
                temperature=0.3,
                model=settings.OPENAI_MODEL,
                api_key=self.api_key
            )
        except ImportError:
            print("LangChain dependencies missing. Reverting to Mock Mode.")
            self.mock_mode = True
        except Exception as e:
            print(f"Failed to init AI components: {e}")
            self.mock_mode = True

    async def analyze_complexity(self, use_cases: List[UseCase]) -> Dict[str, Any]:
        """Analyze complexity of use cases for estimation."""
        if self.mock_mode:
            return {
                "average_complexity": 6.5,
                "total_complexity": sum([6.5] * len(use_cases)),
                "complexity_by_case": {str(uc.id): 6.5 for uc in use_cases}
            }
        
        # Use AI to analyze complexity
        use_case_summaries = [
            f"{uc.title}: {uc.description[:200]}" for uc in use_cases
        ]
        
        prompt = f"""
        Analyze the complexity of these AI use cases on a scale of 1-10:
        
        {chr(10).join(use_case_summaries)}
        
        Return JSON: {{"average_complexity": float, "complexity_by_case": {{"use_case_id": float}}}}
        """
        
        try:
            response = await self.llm.ainvoke(prompt)
            return json.loads(response.content)
        except:
            return {
                "average_complexity": 6.5,
                "total_complexity": 6.5 * len(use_cases),
                "complexity_by_case": {str(uc.id): 6.5 for uc in use_cases}
            }

    async def generate_timeline(
        self,
        use_cases: List[UseCase],
        constraints: RoadmapConstraints,
        options: Optional[RoadmapOptions] = None
    ) -> Dict[str, Any]:
        """Generate project timeline with phases and tasks."""
        
        if options is None:
            options = RoadmapOptions()
        
        # Calculate base duration based on complexity
        complexity = await self.analyze_complexity(use_cases)
        base_weeks = max(8, int(complexity["average_complexity"] * 2))
        
        # Apply risk buffer
        if options.include_contingency:
            base_weeks = int(base_weeks * (1 + options.risk_buffer_percent / 100))
        
        # Determine start date
        start_date = constraints.start_date or date.today()
        
        # Standard phases
        phases = [
            {"name": "Discovery", "duration_weeks": max(2, base_weeks // 8), "order": 1},
            {"name": "Design", "duration_weeks": max(3, base_weeks // 6), "order": 2},
            {"name": "Build", "duration_weeks": max(6, base_weeks // 2), "order": 3},
            {"name": "Test", "duration_weeks": max(2, base_weeks // 8), "order": 4},
            {"name": "Deploy", "duration_weeks": max(2, base_weeks // 10), "order": 5}
        ]
        
        # Calculate phase dates
        current_date = start_date
        phase_data = []
        
        for phase in phases:
            phase_start = current_date
            phase_end = current_date + timedelta(weeks=phase["duration_weeks"])
            
            # Generate tasks for each phase
            tasks = self._generate_tasks_for_phase(phase["name"], use_cases, phase_start, phase_end)
            
            phase_data.append({
                "name": phase["name"],
                "order_index": phase["order"],
                "start_date": phase_start,
                "end_date": phase_end,
                "duration_weeks": phase["duration_weeks"],
                "tasks": tasks
            })
            
            current_date = phase_end + timedelta(days=1)
        
        end_date = current_date - timedelta(days=1)
        total_weeks = int((end_date - start_date).days / 7)
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_weeks": total_weeks,
            "phases": phase_data
        }

    def _generate_tasks_for_phase(
        self,
        phase_name: str,
        use_cases: List[UseCase],
        phase_start: date,
        phase_end: date
    ) -> List[Dict[str, Any]]:
        """Generate tasks for a specific phase."""
        tasks = []
        days_per_task = max(3, (phase_end - phase_start).days // max(2, len(use_cases)))
        
        phase_tasks_map = {
            "Discovery": [
                "Requirements gathering",
                "Stakeholder interviews",
                "Technical feasibility assessment",
                "Data availability analysis"
            ],
            "Design": [
                "Solution architecture design",
                "Data pipeline design",
                "API design",
                "UI/UX design"
            ],
            "Build": [
                "Core implementation",
                "Integration development",
                "Data pipeline implementation",
                "Testing infrastructure"
            ],
            "Test": [
                "Unit testing",
                "Integration testing",
                "User acceptance testing",
                "Performance testing"
            ],
            "Deploy": [
                "Production deployment",
                "Monitoring setup",
                "Documentation",
                "Training"
            ]
        }
        
        task_templates = phase_tasks_map.get(phase_name, ["Task"])
        current_date = phase_start
        
        for i, use_case in enumerate(use_cases):
            for j, task_template in enumerate(task_templates[:2]):  # Limit tasks per use case
                task_start = current_date
                task_end = min(task_start + timedelta(days=days_per_task), phase_end)
                
                tasks.append({
                    "name": f"{task_template} - {use_case.title[:50]}",
                    "description": f"{task_template} for use case: {use_case.description[:200]}",
                    "use_case_id": str(use_case.id),
                    "start_date": task_start,
                    "end_date": task_end,
                    "duration_days": (task_end - task_start).days,
                    "status": "NOT_STARTED",
                    "progress_percent": 0
                })
                
                current_date = task_end + timedelta(days=1)
                if current_date >= phase_end:
                    break
        
        return tasks

    async def calculate_resources(
        self,
        timeline: Dict[str, Any],
        constraints: RoadmapConstraints
    ) -> Dict[str, Any]:
        """Calculate resource requirements."""
        
        # Standard role mappings
        role_mapping = {
            "Discovery": [
                {"role": "Product Manager", "fte": 0.5},
                {"role": "Business Analyst", "fte": 1.0},
                {"role": "Technical Lead", "fte": 0.25}
            ],
            "Design": [
                {"role": "Solution Architect", "fte": 0.5},
                {"role": "UX Designer", "fte": 0.5},
                {"role": "Data Engineer", "fte": 0.25}
            ],
            "Build": [
                {"role": "ML Engineer", "fte": 1.0},
                {"role": "Backend Developer", "fte": 1.5},
                {"role": "Frontend Developer", "fte": 0.5}
            ],
            "Test": [
                {"role": "QA Engineer", "fte": 1.0},
                {"role": "UAT Coordinator", "fte": 0.5}
            ],
            "Deploy": [
                {"role": "DevOps Engineer", "fte": 0.5},
                {"role": "Change Manager", "fte": 0.25}
            ]
        }
        
        total_fte = 0.0
        roles = []
        by_phase = []
        
        for phase in timeline["phases"]:
            phase_roles = role_mapping.get(phase["name"], [])
            phase_fte = sum(r["fte"] for r in phase_roles)
            
            by_phase.append({
                "phase": phase["name"],
                "fte": phase_fte,
                "roles": phase_roles
            })
            
            total_fte += phase_fte
            
            for role in phase_roles:
                existing = next((r for r in roles if r["role"] == role["role"]), None)
                if existing:
                    existing["fte"] += role["fte"]
                else:
                    roles.append({
                        "role": role["role"],
                        "fte": role["fte"],
                        "skills": self._get_skills_for_role(role["role"])
                    })
        
        return {
            "total_fte": total_fte,
            "roles": roles,
            "by_phase": by_phase,
            "by_role": roles,
            "skill_gaps": []
        }

    @staticmethod
    def _get_skills_for_role(role: str) -> List[str]:
        """Get required skills for a role."""
        skills_map = {
            "Product Manager": ["Product Strategy", "Stakeholder Management", "Agile"],
            "Business Analyst": ["Requirements Analysis", "Process Mapping", "Documentation"],
            "Technical Lead": ["Architecture", "Technical Leadership", "System Design"],
            "Solution Architect": ["System Architecture", "Cloud Platforms", "Integration"],
            "UX Designer": ["User Research", "Wireframing", "Prototyping"],
            "Data Engineer": ["ETL", "Data Pipelines", "SQL", "Python"],
            "ML Engineer": ["Machine Learning", "Python", "MLOps", "Data Science"],
            "Backend Developer": ["Python", "APIs", "Databases", "Microservices"],
            "Frontend Developer": ["React", "TypeScript", "UI/UX"],
            "QA Engineer": ["Testing", "Automation", "Quality Assurance"],
            "UAT Coordinator": ["User Testing", "Test Planning", "Documentation"],
            "DevOps Engineer": ["CI/CD", "Cloud Infrastructure", "Monitoring"],
            "Change Manager": ["Change Management", "Training", "Communication"]
        }
        return skills_map.get(role, ["General Skills"])

    async def generate_milestones(
        self,
        timeline: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate standard milestones."""
        milestones = [
            {
                "name": "Project Kickoff",
                "target_date": timeline["start_date"],
                "status": "PENDING",
                "deliverables": ["Charter signed"],
                "owner": "Project Manager"
            },
            {
                "name": "Discovery Complete",
                "target_date": None,
                "status": "PENDING",
                "deliverables": ["BRD approved"],
                "owner": "Business Analyst"
            },
            {
                "name": "Design Approved",
                "target_date": None,
                "status": "PENDING",
                "deliverables": ["Design docs"],
                "owner": "Solution Architect"
            },
            {
                "name": "MVP Ready",
                "target_date": None,
                "status": "PENDING",
                "deliverables": ["Working prototype"],
                "owner": "Technical Lead"
            },
            {
                "name": "UAT Complete",
                "target_date": None,
                "status": "PENDING",
                "deliverables": ["Sign-off received"],
                "owner": "UAT Coordinator"
            },
            {
                "name": "Go-Live",
                "target_date": timeline["end_date"],
                "status": "PENDING",
                "deliverables": ["System live"],
                "owner": "DevOps Engineer"
            }
        ]
        
        # Set milestone dates based on phases
        for phase in timeline["phases"]:
            if phase["name"] == "Discovery":
                milestones[1]["target_date"] = phase["end_date"]
            elif phase["name"] == "Design":
                milestones[2]["target_date"] = phase["end_date"]
            elif phase["name"] == "Build":
                milestones[3]["target_date"] = phase["end_date"]
            elif phase["name"] == "Test":
                milestones[4]["target_date"] = phase["end_date"]
        
        return milestones

    async def identify_dependencies(
        self,
        tasks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Identify task dependencies."""
        dependencies = []
        
        # Simple dependency logic: tasks in earlier phases depend on later phases
        # In a real implementation, this would use AI to analyze task relationships
        task_by_phase = {}
        for task in tasks:
            phase = task.get("phase_name", "Discovery")
            if phase not in task_by_phase:
                task_by_phase[phase] = []
            task_by_phase[phase].append(task)
        
        phase_order = ["Discovery", "Design", "Build", "Test", "Deploy"]
        
        for i in range(len(phase_order) - 1):
            current_phase = phase_order[i]
            next_phase = phase_order[i + 1]
            
            if current_phase in task_by_phase and next_phase in task_by_phase:
                # Last task of current phase -> first task of next phase
                if task_by_phase[current_phase] and task_by_phase[next_phase]:
                    dependencies.append({
                        "from_task_id": task_by_phase[current_phase][-1].get("id"),
                        "to_task_id": task_by_phase[next_phase][0].get("id"),
                        "dependency_type": "FINISH_TO_START",
                        "lag_days": 0
                    })
        
        return dependencies

    async def calculate_confidence(
        self,
        use_cases: List[UseCase],
        timeline: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate confidence level for estimates."""
        # Simple confidence calculation based on use case count and complexity
        complexity = await self.analyze_complexity(use_cases)
        
        if len(use_cases) <= 2 and complexity["average_complexity"] < 5:
            level = "HIGH"
            variance = {"min": -10, "max": 10}
        elif len(use_cases) <= 5 and complexity["average_complexity"] < 7:
            level = "MEDIUM"
            variance = {"min": -25, "max": 25}
        else:
            level = "LOW"
            variance = {"min": -50, "max": 50}
        
        return {
            "level": level,
            "variance_range": variance
        }


# Singleton instance
roadmap_service = RoadmapService()
