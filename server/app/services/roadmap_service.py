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
        self.azure_key = settings.AZURE_OPENAI_API_KEY
        self.azure_endpoint = settings.AZURE_OPENAI_ENDPOINT
        has_llm = self.api_key or (self.azure_key and self.azure_endpoint)
        self.mock_mode = settings.AI_MOCK_MODE or not has_llm

        if not self.mock_mode:
            self._initialize_ai_components()
        else:
            print("RoadmapService running in MOCK MODE (No API Key found)")

    def _initialize_ai_components(self):
        try:
            from langchain_openai import ChatOpenAI, AzureChatOpenAI
            if self.azure_key and self.azure_endpoint:
                self.llm = AzureChatOpenAI(
                    azure_endpoint=self.azure_endpoint,
                    azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT,
                    api_key=self.azure_key,
                    api_version=settings.AZURE_OPENAI_API_VERSION,
                    temperature=0.3,
                    model=settings.AZURE_OPENAI_MODEL_NAME or settings.AZURE_OPENAI_DEPLOYMENT,
                )
            else:
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
        """
        Analyze complexity of use cases for estimation.
        Returns complexity scores (1-10), reasoning factors, and confidence levels.
        """
        if self.mock_mode:
            return {
                "average_complexity": 6.5,
                "total_complexity": sum([6.5] * len(use_cases)),
                "complexity_by_case": {
                    str(uc.id): {
                        "score": 6.5,
                        "factors": {
                            "data_availability": "Medium - Assumed standard data sources",
                            "technical_difficulty": "Medium - Standard ML/AI implementation",
                            "integration_risk": "Medium - Typical enterprise integration"
                        },
                        "confidence": 0.5,
                        "reasoning": "Mock complexity estimate - AI analysis not available"
                    } for uc in use_cases
                },
                "is_mock": True
            }
        
        # Use AI to analyze complexity with detailed factors
        use_case_data = []
        for uc in use_cases:
            use_case_data.append({
                "id": str(uc.id),
                "title": uc.title,
                "description": uc.description[:500] if uc.description else "",
                "proposed_solution": uc.proposed_solution[:300] if hasattr(uc, 'proposed_solution') and uc.proposed_solution else ""
            })
        
        prompt = f"""Analyze the technical complexity of these AI use cases on a scale of 1-10:
- 1-3: Simple (basic automation, rule-based, minimal integration)
- 4-6: Moderate (standard ML models, typical data pipelines, common integrations)
- 7-9: Complex (custom models, complex data engineering, multiple system integration)
- 10: Novel (research-level, unprecedented technical challenges)

For each use case, evaluate these factors:
1. **Data Availability**: How readily available and clean is the required data?
2. **Technical Difficulty**: Complexity of algorithms, models, or technical implementation
3. **Integration Risk**: Difficulty of integrating with existing systems

Use Cases:
{json.dumps(use_case_data, indent=2)}

Return ONLY a JSON object with this exact structure:
{{
  "complexity_by_case": {{
    "use_case_id": {{
      "score": float (1-10),
      "factors": {{
        "data_availability": "Low/Medium/High - brief explanation",
        "technical_difficulty": "Low/Medium/High - brief explanation",
        "integration_risk": "Low/Medium/High - brief explanation"
      }},
      "confidence": float (0.0-1.0),
      "reasoning": "2-3 sentence explanation of the score"
    }}
  }}
}}"""
        
        try:
            from langchain.schema import HumanMessage
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            
            content = response.content
            # Cleanup json if needed
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            result = json.loads(content)
            
            # Calculate aggregates
            complexity_scores = [
                case_data["score"] 
                for case_data in result.get("complexity_by_case", {}).values()
            ]
            
            if complexity_scores:
                avg_complexity = sum(complexity_scores) / len(complexity_scores)
                total_complexity = sum(complexity_scores)
            else:
                avg_complexity = 0.0
                total_complexity = 0.0
            
            return {
                "average_complexity": round(avg_complexity, 2),
                "total_complexity": round(total_complexity, 2),
                "complexity_by_case": result.get("complexity_by_case", {}),
                "is_mock": False
            }
            
        except Exception as e:
            print(f"AI Complexity Analysis failed: {e}")
            # Return enhanced mock fallback with error info
            return {
                "average_complexity": 6.5,
                "total_complexity": 6.5 * len(use_cases),
                "complexity_by_case": {
                    str(uc.id): {
                        "score": 6.5,
                        "factors": {
                            "data_availability": "Unknown - Analysis failed",
                            "technical_difficulty": "Unknown - Analysis failed",
                            "integration_risk": "Unknown - Analysis failed"
                        },
                        "confidence": 0.3,
                        "reasoning": f"AI analysis failed: {str(e)[:100]}"
                    } for uc in use_cases
                },
                "error": str(e),
                "is_mock": True
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
            
        # AI Mode Check
        if not self.mock_mode:
            try:
                return await self._generate_ai_timeline(use_cases, constraints, options)
            except Exception as e:
                print(f"AI Timeline Generation failed, falling back to heuristic: {e}")
        
        # Fallback / Mock Logic
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
            "phases": phase_data,
            "is_mock": True
        }

    async def _generate_ai_timeline(self, use_cases: List[UseCase], constraints: RoadmapConstraints, options: RoadmapOptions) -> Dict[str, Any]:
        """
        Generate timeline using AI analysis of use case types.
        Creates custom phases and tasks specific to the AI project type.
        """
        from langchain.schema import HumanMessage
        
        # Detect use case types for better timeline customization
        use_case_types = await self._detect_use_case_types(use_cases)
        
        # Prepare detailed use case information
        use_case_details = []
        for uc in use_cases:
            use_case_details.append({
                "title": uc.title,
                "description": uc.description[:300] if uc.description else "",
                "proposed_solution": uc.proposed_solution[:200] if hasattr(uc, 'proposed_solution') and uc.proposed_solution else "",
                "detected_type": use_case_types.get(str(uc.id), "General AI")
            })
        
        start_date = constraints.start_date or date.today()
        max_duration = options.max_duration_weeks if options.max_duration_weeks else "Flexible"
        
        prompt = f"""Act as a Technical Project Manager specializing in AI implementation.

Create a tailored implementation timeline for these AI use cases:
{json.dumps(use_case_details, indent=2)}

Project Constraints:
- Start Date: {start_date}
- Max Duration: {max_duration} weeks
- Risk Buffer: {options.risk_buffer_percent if options else 10}%

IMPORTANT: Generate phases that are SPECIFIC to the AI project types identified above.
- For GenAI/LLM projects: Include phases like "Prompt Engineering", "RAG Setup", "Fine-tuning"
- For Predictive ML: Include "Data Pipeline", "Feature Engineering", "Model Training", "Model Validation"
- For Computer Vision: Include "Image Preprocessing", "Model Selection", "Transfer Learning"
- For NLP: Include "Text Preprocessing", "Embedding Setup", "Model Training"

Define 4-7 phases appropriate for these specific AI project types.
For each phase:
1. Name (MUST be specific to the technology, NOT generic like "Build" or "Design")
2. Duration in weeks (realistic for AI projects)
3. 4-6 concrete, actionable tasks
4. Key milestones or deliverables

Return ONLY a JSON object with this structure:
{{
  "project_type_summary": "Brief description of the dominant AI project type(s)",
  "phases": [
    {{
      "name": "Specific Phase Name",
      "duration_weeks": int,
      "tasks": ["Specific Task 1", "Specific Task 2", ...],
      "milestone": "Key deliverable for this phase"
    }}
  ],
  "total_weeks": int,
  "rationale": "2-3 sentence explanation of why this timeline structure fits these AI use cases"
}}"""
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            content = response.content
            
            # Clean JSON from markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            result = json.loads(content)
            
            # Post-process to add dates and format
            current_date = start_date
            formatted_phases = []
            
            for idx, phase in enumerate(result.get("phases", [])):
                weeks = phase.get("duration_weeks", 2)
                phase_start = current_date
                phase_end = current_date + timedelta(weeks=weeks)
                
                # Create task objects with more detail
                tasks = []
                for task_name in phase.get("tasks", []):
                    tasks.append({
                        "name": task_name,
                        "description": f"AI-generated task for {phase.get('name')}: {task_name}",
                        "start_date": phase_start,
                        "end_date": phase_end,
                        "status": "NOT_STARTED",
                        "progress_percent": 0
                    })
                
                formatted_phases.append({
                    "name": phase.get("name", f"Phase {idx + 1}"),
                    "order_index": idx + 1,
                    "start_date": phase_start,
                    "end_date": phase_end,
                    "duration_weeks": weeks,
                    "tasks": tasks,
                    "milestone": phase.get("milestone", "")
                })
                current_date = phase_end + timedelta(days=1)
                
            return {
                "start_date": start_date,
                "end_date": current_date - timedelta(days=1),
                "total_weeks": result.get("total_weeks") or int((current_date - start_date).days / 7),
                "phases": formatted_phases,
                "project_type_summary": result.get("project_type_summary", ""),
                "rationale": result.get("rationale", ""),
                "is_mock": False
            }
            
        except Exception as e:
            print(f"AI timeline generation failed: {e}")
            # Fallback to heuristic method
            return await self._generate_heuristic_timeline(use_cases, constraints, options)
    
    async def _detect_use_case_types(self, use_cases: List[UseCase]) -> Dict[str, str]:
        """
        Detect the type of AI project for each use case.
        Returns mapping of use_case_id to project type.
        """
        if self.mock_mode or not use_cases:
            return {str(uc.id): "General AI" for uc in use_cases}
        
        try:
            from langchain.schema import HumanMessage
            
            use_case_summaries = []
            for uc in use_cases:
                use_case_summaries.append({
                    "id": str(uc.id),
                    "title": uc.title,
                    "description": uc.description[:200] if uc.description else "",
                    "solution": uc.proposed_solution[:150] if hasattr(uc, 'proposed_solution') and uc.proposed_solution else ""
                })
            
            prompt = f"""Classify each AI use case into ONE of these categories:
- GenAI/LLM: Chatbots, text generation, RAG systems, prompt-based solutions
- Predictive ML: Forecasting, classification, regression, predictive maintenance
- Computer Vision: Image recognition, object detection, video analysis
- NLP: Text analysis, sentiment analysis, entity extraction (non-generative)
- Analytics/BI: Data analysis, reporting, insights generation
- Automation: RPA, workflow automation, process optimization

Use Cases:
{json.dumps(use_case_summaries, indent=2)}

Return JSON mapping use_case_id to category:
{{
  "use_case_id": "Category Name"
}}"""
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            content = response.content
            
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            return json.loads(content)
            
        except Exception as e:
            print(f"Use case type detection failed: {e}")
            return {str(uc.id): "General AI" for uc in use_cases}
    
    async def _generate_heuristic_timeline(self, use_cases: List[UseCase], constraints: RoadmapConstraints, options: RoadmapOptions) -> Dict[str, Any]:
        """Fallback heuristic timeline generation when AI fails."""
        complexity = await self.analyze_complexity(use_cases)
        base_weeks = max(8, int(complexity["average_complexity"] * 2))
        
        if options and options.include_contingency:
            base_weeks = int(base_weeks * (1 + (options.risk_buffer_percent or 10) / 100))
        
        start_date = constraints.start_date or date.today()
        
        # Standard phases
        phases = [
            {"name": "Discovery & Requirements", "duration_weeks": max(2, base_weeks // 8), "order": 1},
            {"name": "Design & Architecture", "duration_weeks": max(3, base_weeks // 6), "order": 2},
            {"name": "Implementation", "duration_weeks": max(6, base_weeks // 2), "order": 3},
            {"name": "Testing & Validation", "duration_weeks": max(2, base_weeks // 8), "order": 4},
            {"name": "Deployment & Monitoring", "duration_weeks": max(2, base_weeks // 10), "order": 5}
        ]
        
        current_date = start_date
        phase_data = []
        
        for phase in phases:
            phase_start = current_date
            phase_end = current_date + timedelta(weeks=phase["duration_weeks"])
            
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
        
        return {
            "start_date": start_date,
            "end_date": current_date - timedelta(days=1),
            "total_weeks": int((current_date - start_date).days / 7),
            "phases": phase_data,
            "is_mock": True
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
        constraints: RoadmapConstraints,
        use_cases: Optional[List[UseCase]] = None
    ) -> Dict[str, Any]:
        """
        Calculate resource requirements with AI-powered skill recommendations.
        Analyzes use case technical requirements to suggest specific roles and skills.
        """
        
        if not self.mock_mode and use_cases:
            try:
                return await self._calculate_ai_resources(timeline, constraints, use_cases)
            except Exception as e:
                print(f"AI Resource Calculation failed: {e}")
        
        # Standard role mappings (fallback)
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
            
            # Fallback for unknown phases in mock mode
            if not phase_roles:
                phase_roles = [{"role": "Project Team Member", "fte": 1.0}]
                
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
            "skill_gaps": [],
            "is_mock": True
        }

    async def _calculate_ai_resources(
        self,
        timeline: Dict[str, Any],
        constraints: RoadmapConstraints,
        use_cases: List[UseCase]
    ) -> Dict[str, Any]:
        """
        Use AI to recommend resources based on technical requirements of use cases.
        Analyzes proposed solutions for technology keywords and maps to skill requirements.
        """
        from langchain.schema import HumanMessage
        
        # Extract technical information from use cases
        use_case_tech = []
        for uc in use_cases:
            use_case_tech.append({
                "title": uc.title,
                "description": uc.description[:200] if uc.description else "",
                "proposed_solution": uc.proposed_solution[:300] if hasattr(uc, 'proposed_solution') and uc.proposed_solution else "",
                "technical_keywords": self._extract_tech_keywords(uc)
            })
        
        # Prepare phase and task information
        phases_info = []
        for phase in timeline["phases"]:
            phase_tasks = [task.get('name', '') for task in phase.get("tasks", [])[:5]]
            phases_info.append({
                "name": phase["name"],
                "duration_weeks": phase.get("duration_weeks", 0),
                "tasks": phase_tasks
            })
        
        prompt = f"""Act as an AI/ML Project Resource Planner. Analyze these AI use cases and project phases to recommend a precise team composition.

Use Cases with Technical Requirements:
{json.dumps(use_case_tech, indent=2)}

Project Phases:
{json.dumps(phases_info, indent=2)}

Budget Constraint: {constraints.budget_cap or 'Flexible'}

IMPORTANT: Recommend roles and skills SPECIFIC to the technology stack identified in the use cases.
- For GenAI/LLM projects: Include "Prompt Engineer", "RAG Specialist", "LLM Fine-tuning Expert"
- For ML/Predictive: Include "Data Scientist", "ML Engineer", "Feature Engineering Specialist"
- For Computer Vision: Include "CV Engineer", "Image Processing Specialist", "Model Optimization Expert"
- For NLP: Include "NLP Engineer", "Linguistics Expert", "Text Processing Specialist"

For each role, specify:
1. Job title (specific to the technology)
2. FTE allocation (realistic for project duration)
3. Required skills (technology-specific, not generic)
4. Justification (why this role is needed for THIS specific project)

Return JSON object:
{{
  "total_fte": float,
  "roles": [
    {{
      "role": "Specific Job Title",
      "fte": float,
      "skills": ["Specific Skill 1", "Specific Skill 2", "Specific Skill 3"],
      "justification": "Why this role is needed for this specific technology stack"
    }}
  ],
  "by_phase": [
    {{
      "phase": "Phase Name",
      "fte": float,
      "roles": [{{"role": "Job Title", "fte": float}}]
    }}
  ],
  "technology_summary": "Brief summary of the technology stack and why these specific skills are required"
}}"""
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        content = response.content
        
        # Clean JSON from markdown
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        result = json.loads(content)
        result["is_mock"] = False
        
        # Populate by_role field (flattened) which is expected by frontend
        result["by_role"] = result["roles"] 
        result["skill_gaps"] = []
        
        return result
    
    def _extract_tech_keywords(self, use_case: UseCase) -> List[str]:
        """Extract technology keywords from use case for skill mapping."""
        keywords = []
        
        # Combine all text fields
        text = f"{use_case.title} {use_case.description or ''}"
        if hasattr(use_case, 'proposed_solution') and use_case.proposed_solution:
            text += f" {use_case.proposed_solution}"
        
        text_lower = text.lower()
        
        # Technology keywords to look for
        tech_patterns = {
            "GenAI/LLM": ["gpt", "llm", "chatbot", "generative", "prompt", "rag", "langchain", "openai", "claude"],
            "ML/Predictive": ["machine learning", "predictive", "forecast", "classification", "regression", "model training"],
            "Computer Vision": ["image", "vision", "object detection", "recognition", "cnn", "yolo", "opencv"],
            "NLP": ["nlp", "natural language", "text analysis", "sentiment", "entity extraction", "tokenization"],
            "Data Engineering": ["pipeline", "etl", "data warehouse", "spark", "kafka", "airflow"],
            "Cloud/DevOps": ["aws", "azure", "gcp", "kubernetes", "docker", "ci/cd", "terraform"]
        }
        
        for category, patterns in tech_patterns.items():
            if any(pattern in text_lower for pattern in patterns):
                keywords.append(category)
        
        return keywords if keywords else ["General AI"]


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
