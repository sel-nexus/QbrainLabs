import os
import json
import random
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.utils.llm_tracking import track_llm_usage, get_usage_from_response

class RAGService:
    def __init__(self):
        print("="*60)
        print("RAGService Initialization Starting...")
        print("="*60)
        
        self.api_key = settings.OPENAI_API_KEY
        self.azure_api_key = settings.AZURE_OPENAI_API_KEY
        self.azure_endpoint = settings.AZURE_OPENAI_ENDPOINT
        
        print(f"OpenAI API Key: {'SET' if self.api_key else 'NOT SET'}")
        print(f"Azure OpenAI API Key: {'SET' if self.azure_api_key else 'NOT SET'}")
        print(f"Azure OpenAI Endpoint: {self.azure_endpoint if self.azure_endpoint else 'NOT SET'}")
        print(f"AI Mock Mode Setting: {settings.AI_MOCK_MODE}")
        
        self.mock_mode = settings.AI_MOCK_MODE or (not self.api_key and not self.azure_api_key)
        self.vector_store = None
        self.llm = None
        self.embeddings = None
        
        print(f"\n[RAG] Service Mode: {'MOCK' if self.mock_mode else 'REAL AI'}")
        
        # Load Reference Data
        try:
            with open("app/data/ai_use_cases.json", "r") as f:
                self.reference_data = json.load(f)
            print(f"[OK] Loaded {len(self.reference_data)} reference use cases")
        except Exception as e:
            print(f"[WARN] Error loading reference data: {e}")
            self.reference_data = []

        if not self.mock_mode:
            print("\n[RAG] Initializing REAL AI components...")
            self._initialize_real_components()
        else:
            print("\n[WARN] RAGService running in MOCK MODE")
            print("   Reason: No API keys configured or AI_MOCK_MODE=true")
        
        print("="*60)
        print(f"RAGService Initialization Complete - Mode: {'MOCK' if self.mock_mode else 'REAL'}")
        print("="*60 + "\n")

    def _initialize_real_components(self):
        try:
            print("   [INFO] Importing LangChain modules...")
            from langchain_openai import ChatOpenAI, OpenAIEmbeddings, AzureChatOpenAI, AzureOpenAIEmbeddings
            from langchain.vectorstores import Chroma
            from langchain.schema import Document
            print("   [OK] LangChain modules imported successfully")
            
            # Check for Azure Configuration first
            if self.azure_api_key and settings.AZURE_OPENAI_ENDPOINT:
                print("\n   [AZURE] Initializing Azure OpenAI Client...")
                print(f"      Endpoint: {settings.AZURE_OPENAI_ENDPOINT}")
                print(f"      Deployment: {settings.AZURE_OPENAI_DEPLOYMENT}")
                print(f"      Model: {settings.AZURE_OPENAI_MODEL_NAME or settings.AZURE_OPENAI_DEPLOYMENT}")
                print(f"      API Version: {settings.AZURE_OPENAI_API_VERSION}")
                
                try:
                    self.llm = AzureChatOpenAI(
                        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                        azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT,
                        api_key=self.azure_api_key,
                        api_version=settings.AZURE_OPENAI_API_VERSION,
                        temperature=settings.OPENAI_TEMPERATURE,
                        model=settings.AZURE_OPENAI_MODEL_NAME or settings.AZURE_OPENAI_DEPLOYMENT
                    )
                    print("   [OK] Azure OpenAI Chat client initialized")
                except Exception as e:
                    print(f"   [ERROR] Failed to initialize Azure OpenAI Chat: {e}")
                    raise
                
                # Use Azure Embeddings if configured
                if settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME:
                    print(f"\n   [AZURE] Initializing Azure OpenAI Embeddings...")
                    print(f"      Deployment: {settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME}")
                    print(f"      Model: {settings.AZURE_OPENAI_EMBEDDING_MODEL}")
                    
                    try:
                        self.embeddings = AzureOpenAIEmbeddings(
                            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                            azure_deployment=settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
                            api_key=self.azure_api_key,
                            api_version=settings.AZURE_OPENAI_EMBEDDING_API_VERSION,
                            model=settings.AZURE_OPENAI_EMBEDDING_MODEL,
                        )
                        print("   [OK] Azure OpenAI Embeddings initialized")
                    except Exception as e:
                        print(f"   [ERROR] Failed to initialize Azure OpenAI Embeddings: {e}")
                        print("   [WARN] Falling back to standard OpenAI embeddings...")
                        self.embeddings = OpenAIEmbeddings(api_key=self.api_key) if self.api_key else None
                else:
                    print("   [WARN] Azure embedding deployment not configured")
                    self.embeddings = OpenAIEmbeddings(api_key=self.api_key) if self.api_key else None
            
            # Fallback to Standard OpenAI
            elif self.api_key:
                print("\n   [OPENAI] Initializing Standard OpenAI Client...")
                print(f"      Model: {settings.OPENAI_MODEL}")
                
                self.llm = ChatOpenAI(
                    temperature=settings.OPENAI_TEMPERATURE,
                    model=settings.OPENAI_MODEL,
                    api_key=self.api_key
                )
                self.embeddings = OpenAIEmbeddings(api_key=self.api_key)
                print("   [OK] Standard OpenAI client initialized")
            
            # Initialize Vector Store
            if self.embeddings and len(self.reference_data) > 0:
                print(f"\n   [VECTOR] Initializing Vector Store with {len(self.reference_data)} documents...")
                try:
                    documents = [
                        Document(page_content=f"{item['title']}: {item['description']}", metadata=item)
                        for item in self.reference_data
                    ]
                    self.vector_store = Chroma.from_documents(documents, self.embeddings)
                    print("   [OK] Vector store initialized successfully")
                except Exception as e:
                    print(f"   [ERROR] Failed to initialize vector store: {e}")
                    print("   [WARN] RAG will work without vector search")
            else:
                if not self.embeddings:
                    print("   [WARN] No embeddings configured. RAG features will be limited.")
                if len(self.reference_data) == 0:
                    print("   [WARN] No reference data loaded. Vector store not created.")
            
            print("\n   [OK] Real AI components initialization complete")
            
        except ImportError as e:
            print(f"   [ERROR] LangChain dependencies missing: {e}")
            print("   [WARN] Reverting to Mock Mode")
            self.mock_mode = True
        except Exception as e:
            print(f"   [ERROR] Failed to init RAG components: {e}")
            print("   [WARN] Reverting to Mock Mode")
            import traceback
            traceback.print_exc()
            self.mock_mode = True

    async def enhance_use_case(self, text: str) -> Dict[str, Any]:
        """
        Refines the problem statement and suggests a solution/KPI.
        """
        if self.mock_mode:
            # Mock Logic: Pick a random reference template that matches keywords or just random
            # For "invoice" -> match invoice
            lower_text = text.lower()
            match = next((item for item in self.reference_data if item['category'].lower() in lower_text or "invoice" in lower_text and "invoice" in item['title'].lower()), self.reference_data[0])
            
            return {
                "refined_title": f"Smart {match['title']}",
                "refined_description": f"Enhanced: {match['description']} context: {text}",
                "suggested_solution": "Implement a Python-based pipeline using Tesseract OCR and OpenAI GPT-4 for extraction.",
                "kpi": match['kpi'],
                "is_mock": True
            }
        
        # Real Logic
        from langchain_core.messages import HumanMessage
        
        try:
            # 1. Retrieve context
            if self.vector_store:
                docs = self.vector_store.similarity_search(text, k=2)
                context_str = "\n".join([d.page_content for d in docs])
            else:
                context_str = "No reference context available."
            
            # 2. Build prompt message directly
            prompt_text = f"""You are an expert AI Solution Architect.
User Input: "{text}"

Similar Success Stories:
{context_str}

Task: 
1. Create a professional Title.
2. Refine the Description to be technical and value-focused.
3. Propose a technical Solution using standard modern AI stack.
4. Suggest a specific KPI suitable for this use case.

Return JSON only: {{ "title": "...", "description": "...", "solution": "...", "kpi": "..." }}"""
            
            # 3. Call LLM directly (not via chain)
            message = HumanMessage(content=prompt_text)
            response = await self.llm.ainvoke([message])
            
            # Track Usage
            usage = get_usage_from_response(response)
            await track_llm_usage(
                feature="enhance",
                model_name=getattr(self.llm, 'model_name', settings.OPENAI_MODEL),
                prompt_tokens=usage["prompt"],
                completion_tokens=usage["completion"]
            )
            
            # 4. Parse response
            response_content = response.content if hasattr(response, 'content') else str(response)
            
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{[^{}]*\}', response_content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                return json.loads(response_content)
        except json.JSONDecodeError as e:
            print(f"[RAG] JSON parse error: {e}")
            return {
                "title": "AI-Enhanced Use Case",
                "description": text,
                "solution": "Recommend using standard AI/ML stack for implementation.",
                "kpi": "Improve efficiency by 30%",
                "is_mock": False,
                "parse_error": str(e)
            }
        except Exception as e:
            print(f"[RAG] Error in enhance_use_case: {e}")
            import traceback
            traceback.print_exc()
            raise

    async def check_feasibility(self, solution_text: str) -> Dict[str, Any]:
        if self.mock_mode:
            score = random.choice(["High", "Medium", "Low"])
            reasons = {
                "High": "Standard pattern, well-supported libraries available.",
                "Medium": "Feasible but requires significant data prep.",
                "Low": "High technical risk or resource cost."
            }
            return {
                "score": score,
                "reason": reasons[score],
                "is_mock": True
            }
            
        # Real Logic
        prompt = ChatPromptTemplate.from_template("""
        Assess the technical feasibility of this AI solution:
        "{solution}"
        
        Consider: Data availability, model complexity, and computing cost.
        Return JSON: {{ "score": "High/Medium/Low", "reason": "One sentence explanation." }}
        """)
        
        chain = prompt | self.llm
        response = await chain.ainvoke({"solution": solution_text})
        
        # Track Usage
        usage = get_usage_from_response(response)
        await track_llm_usage(
            feature="feasibility",
            model_name=getattr(self.llm, 'model_name', settings.OPENAI_MODEL),
            prompt_tokens=usage["prompt"],
            completion_tokens=usage["completion"]
        )
        
        try:
            return json.loads(response.content)
        except:
            return {"score": "Unknown", "reason": "Parse error"}

    async def check_duplicates(self, candidate_title: str, candidate_desc: str, existing_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Checks for semantic duplicates.
        For MVP, we use difflib SequenceMatcher if in Mock Mode or if no Vector Store for dynamic data.
        In a full prod RAG, we would embed the candidate and compare dot-products with existing embeddings.
        """
        import difflib
        
        highest_score = 0.0
        best_match = None
        
        # Combine title and desc for check
        candidate_full = f"{candidate_title} {candidate_desc}".lower()
        
        for item in existing_items:
            # Check Title Similarity
            item_full = f"{item['title']} {item['description']}".lower()
            
            # Use SequenceMatcher for a robust string similarity
            seq = difflib.SequenceMatcher(None, candidate_full, item_full)
            score = seq.ratio()
            
            if score > highest_score:
                highest_score = score
                best_match = item
        
        # Threshold for "Duplicate"
        is_duplicate = highest_score > 0.6  # 60% similarity
        
        return {
            "is_duplicate": is_duplicate,
            "similarity_score": round(highest_score, 2),
            "similar_to_id": str(best_match['id']) if best_match else None,
            "similar_to_title": best_match['title'] if best_match else None,
            "message": f"Similar idea detected: '{best_match['title']}' ({int(highest_score*100)}% match)" if is_duplicate else None
        }

    async def estimate_roi(self, use_case_title: str, use_case_desc: str, industry: str = None) -> Dict[str, Any]:
        """
        AI-powered Robust ROI parameter estimation.
        Performs multi-step reasoning to identify cost drivers and benefit levers.
        """
        if self.mock_mode:
            return {
                "estimates": {
                    "implementation": {"low": 50000, "mid": 120000, "high": 250000, "confidence": 0.8},
                    "infrastructure": {"low": 500, "mid": 2000, "high": 5000, "confidence": 0.7},
                    "time_savings": {"low": 10, "mid": 30, "high": 60, "confidence": 0.6}
                },
                "cost_drivers": ["API Token Costs", "Cloud Computer", "Data Storage"],
                "benefit_levers": ["Labor Efficiency", "Error Reduction"],
                "assumptions": ["3 engineers for 3 months", "20% initial adoption rate"],
                "benchmarks": [{"source": "Industry Report", "metric": "Avg ROI", "value": "250%"}],
                "is_mock": True
            }

        from langchain.prompts import ChatPromptTemplate
        
        # Step 1: Analyze Cost Drivers & Benefit Levers
        analysis_prompt = ChatPromptTemplate.from_template("""
        Analyze the financial implications of this AI Use Case:
        Title: {title}
        Description: {description}
        Industry: {industry}
        
        Identify:
        1. 3 Major Cost Drivers (e.g., API costs, GPU compute, Integration labor)
        2. 3 Major Benefit Levers (e.g., FTE savings, Revenue uplift, Error reduction)
        3. Key Assumptions needed for estimation
        
        Return JSON: {{ "cost_drivers": [], "benefit_levers": [], "assumptions": [] }}
        """)
        
        chain1 = analysis_prompt | self.llm
        analysis_res = await chain1.ainvoke({
            "title": use_case_title,
            "description": use_case_desc,
            "industry": industry or "General"
        })
        
        try:
            # Clean up potential markdown code blocks
            content = analysis_res.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            analysis_data = json.loads(content)
        except:
            analysis_data = {"cost_drivers": [], "benefit_levers": [], "assumptions": []}

        # Step 2: quantitative Estimation
        est_prompt = ChatPromptTemplate.from_template("""
        Based on these drivers, estimate financial ranges (Low, Mid, High) for a pilot implementation.
        
        Use Case: {title}
        Cost Drivers: {drivers}
        Benefit Levers: {levers}
        Assumptions: {assumptions}
        
        Estimate:
        1. One-time Implementation Cost ($)
        2. Monthly Operational/Infrastructure Cost ($)
        3. Annual Financial Value Generated ($)
        
        Return JSON:
        {{
            "implementation_cost": {{"low": 0, "mid": 0, "high": 0, "confidence": 0.0}},
            "monthly_run_cost": {{"low": 0, "mid": 0, "high": 0, "confidence": 0.0}},
            "annual_value": {{"low": 0, "mid": 0, "high": 0, "confidence": 0.0}}
        }}
        """)

        chain2 = est_prompt | self.llm
        est_res = await chain2.ainvoke({
            "title": use_case_title,
            "drivers": ", ".join(analysis_data.get("cost_drivers", [])),
            "levers": ", ".join(analysis_data.get("benefit_levers", [])),
            "assumptions": ", ".join(analysis_data.get("assumptions", []))
        })
        
        # Track Usage
        usage = get_usage_from_response(est_res)
        await track_llm_usage(
            feature="roi_robust",
            model_name=getattr(self.llm, 'model_name', settings.OPENAI_MODEL),
            prompt_tokens=usage["prompt"],
            completion_tokens=usage["completion"]
        )
        
        try:
            content = est_res.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            estimates = json.loads(content)
            
            # Combine results
            return {
                "estimates": {
                    "implementation": estimates.get("implementation_cost"),
                    "infrastructure": estimates.get("monthly_run_cost"),
                    "value": estimates.get("annual_value")
                },
                "cost_drivers": analysis_data.get("cost_drivers"),
                "benefit_levers": analysis_data.get("benefit_levers"),
                "assumptions": analysis_data.get("assumptions"),
                "is_mock": False
            }
        except:
            return {"error": "Failed to parse estimate", "is_mock": False}

    async def generate_business_case(self, use_case_data: Dict, roi_results: Dict) -> Dict[str, Any]:
        """Generates a comprehensive, professional Business Case narrative."""
        if self.mock_mode:
            return {
                "executive_summary": "This project aims to automate core processes using AI...",
                "problem_statement": use_case_data.get("description", ""),
                "proposed_solution": use_case_data.get("proposed_solution", "Implement a RAG-based AI system."),
                "financial_overview": f"Expected ROI: {roi_results.get('roi_percent', 0)}% with a payback period.",
                "strategic_alignment": "Aligns with digital transformation goals.",
                "risks_and_mitigation": "Data privacy risks mitigated by local processing.",
                "recommendation": "Proceed with pilot.",
                "is_mock": True
            }

        from langchain.prompts import ChatPromptTemplate
        
        # Prepare financial context
        estimates = roi_results.get("estimates", {})
        impl_cost = estimates.get("implementation", {}).get("mid", "N/A")
        annual_val = estimates.get("value", {}).get("mid", "N/A")
        run_cost = estimates.get("infrastructure", {}).get("mid", "N/A")
        
        prompt = ChatPromptTemplate.from_template("""
        Write a formal Business Case Document for this AI initiative.
        
        Project: {title}
        Problem: {description}
        Solution: {solution}
        
        Financials (Estimated):
        - Implementation Cost: ${impl_cost}
        - Annual Value: ${annual_val}
        - Monthly Run Cost: ${run_cost}
        - Drivers: {drivers}
        
        Structure the output as a JSON object with these sections (text content):
        1. "executive_summary": High-level overview and recommendation (2-3 sentences).
        2. "problem_statement": Clear articulation of the pain point and why it matters.
        3. "strategic_alignment": How this supports broader business goals (Innovation, Efficiency).
        4. "financial_analysis": Narrative explaining the costs vs benefits and expected ROI.
        5. "risks_and_mitigation": Top 3 risks and how to handle them.
        6. "recommendation": Clear Go/No-Go recommendation and next steps.
        
        Ensure a professional, persuasive tone suitable for a CIO/CFO.
        """)

        chain = prompt | self.llm
        response = await chain.ainvoke({
            "title": use_case_data.get("title"),
            "description": use_case_data.get("description"),
            "solution": use_case_data.get("proposed_solution", "AI-based automation"),
            "impl_cost": impl_cost,
            "annual_val": annual_val,
            "run_cost": run_cost,
            "drivers": ", ".join(roi_results.get("benefit_levers", []))
        })
        
        # Track Usage
        usage = get_usage_from_response(response)
        await track_llm_usage(
            feature="business_case_full",
            model_name=getattr(self.llm, 'model_name', settings.OPENAI_MODEL),
            prompt_tokens=usage["prompt"],
            completion_tokens=usage["completion"]
        )
        
        try:
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            res = json.loads(content)
            res["is_mock"] = False
            return res
        except:
            return {"error": "Failed to generate business case", "is_mock": False}

    async def generate_executive_presentation(self, top_use_cases: List[Dict]) -> Dict[str, Any]:
        """Generates a summary presentation or narrative for executives."""
        if self.mock_mode:
            return {
                "title": "AI Strategy Portfolio Review",
                "executive_summary": "We have identified 3 high-impact AI opportunities...",
                "top_recommendations": [
                    {
                        "title": uc.get("title"),
                        "roi": f"{uc.get('roi')}%",
                        "payback": f"{uc.get('payback')} months",
                        "strategic_value": "High strategic alignment with organizational goals."
                    } for uc in top_use_cases
                ],
                "implementation_roadmap": "Phase 1: Pilot top ROI case. Phase 2: Scale success stories.",
                "is_mock": True
            }

        from langchain.prompts import ChatPromptTemplate
        prompt = ChatPromptTemplate.from_template("""
        Create an Executive AI Strategy Presentation summary for these top use cases:
        {cases_json}

        Focus on: Strategic alignment, financial impact, and execution roadmap.
        Return JSON with keys: title, executive_summary, top_recommendations (list of objects with title, roi, payback, strategic_value), implementation_roadmap.
        """)

        chain = prompt | self.llm
        response = await chain.ainvoke({
            "cases_json": json.dumps(top_use_cases)
        })
        try:
            res = json.loads(response.content)
            res["is_mock"] = False
            return res
        except:
            return {"error": "Failed to generate presentation"}

    async def enhance_business_value(self, title: str, description: str, category: str = "Generative AI", current_kpi: str = None) -> Dict[str, Any]:
        """
        Enhances the business value proposition with specific metrics, ROI indicators, and benchmarks.
        """
        if self.mock_mode:
            # Mock response with realistic business value data
            mock_metrics = [
                "Reduce processing time by 40-60%",
                "Improve accuracy to 95%+",
                "Save 20-30 hours per week per employee",
                "Decrease operational costs by $50K-$150K annually"
            ]
            
            mock_roi = [
                "Expected ROI: 250-350% within 12 months",
                "Payback period: 6-9 months",
                "NPV: $200K-$500K over 3 years"
            ]
            
            mock_benchmarks = [
                {"source": "Gartner 2025", "metric": "AI Adoption ROI", "value": "300%"},
                {"source": "McKinsey Report", "metric": "Process Automation Savings", "value": "40-60%"},
                {"source": "Industry Average", "metric": "Implementation Time", "value": "3-6 months"}
            ]
            
            return {
                "enhanced_kpi": current_kpi or "Reduce manual processing time by 50% and improve accuracy to 95%+ within 6 months",
                "specific_metrics": mock_metrics,
                "roi_indicators": mock_roi,
                "benchmarks": mock_benchmarks,
                "business_impact": "This AI solution will significantly reduce operational overhead, improve decision-making speed, and free up valuable employee time for higher-value strategic work. Expected to deliver measurable ROI within the first year.",
                "confidence_score": 0.85,
                "is_mock": True
            }
        
        # Real LLM Logic
        from langchain_core.messages import HumanMessage
        
        try:
            prompt_text = f"""You are an expert Business Value Analyst specializing in AI/ML projects.

Use Case Title: "{title}"
Description: "{description}"
Category: "{category}"
Current KPI: "{current_kpi or 'Not specified'}"

Task: Enhance the business value proposition with:
1. An enhanced, specific KPI statement (measurable, time-bound)
2. 3-5 specific metrics this use case could improve
3. 3-4 ROI indicators (expected ROI %, payback period, NPV range)
4. 2-3 industry benchmarks with sources
5. A compelling business impact statement (2-3 sentences)
6. A confidence score (0.0-1.0) for these estimates

Return ONLY valid JSON in this exact format:
{{
    "enhanced_kpi": "Specific, measurable KPI statement",
    "specific_metrics": ["metric 1", "metric 2", "metric 3"],
    "roi_indicators": ["ROI indicator 1", "ROI indicator 2"],
    "benchmarks": [
        {{"source": "Source name", "metric": "Metric name", "value": "Value"}},
        {{"source": "Source name", "metric": "Metric name", "value": "Value"}}
    ],
    "business_impact": "Compelling 2-3 sentence impact statement",
    "confidence_score": 0.8
}}"""
            
            message = HumanMessage(content=prompt_text)
            response = await self.llm.ainvoke([message])
            
            response_content = response.content if hasattr(response, 'content') else str(response)
            
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response_content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(response_content)
            result["is_mock"] = False
            return result
        except json.JSONDecodeError as e:
            print(f"Failed to parse LLM response: {e}")
            # Fallback to mock on parse error
            return {
                "enhanced_kpi": current_kpi or "Improve operational efficiency by 40% within 6 months",
                "specific_metrics": ["Reduce processing time", "Improve accuracy", "Lower costs"],
                "roi_indicators": ["Expected ROI: 200-300%", "Payback: 6-12 months"],
                "benchmarks": [{"source": "Industry Average", "metric": "AI ROI", "value": "250%"}],
                "business_impact": "This solution will deliver measurable business value through automation and improved decision-making.",
                "confidence_score": 0.7,
                "is_mock": False,
                "parse_error": str(e)
            }
        except Exception as e:
            print(f"Error in enhance_business_value: {e}")
            import traceback
            traceback.print_exc()
            raise

    async def analyze_technical_feasibility(self, title: str, description: str, proposed_solution: str) -> Dict[str, Any]:
        """
        Generates a detailed technical analysis including architecture, stack, and risks.
        """
        if self.mock_mode:
            return {
                "architecture_overview": "Microservices architecture with an event-driven core. The system utilizes a React frontend communicating via REST/GraphQL with a Python/FastAPI backend. AI processing is handled asynchronously via a task queue.",
                "recommended_stack": [
                    {"category": "Frontend", "name": "React + Vite", "justification": "High performance and rich ecosystem for interactive UIs."},
                    {"category": "Backend", "name": "FastAPI (Python)", "justification": "Native async support and excellent libraries for AI integration."},
                    {"category": "Database", "name": "PostgreSQL + pgvector", "justification": "Robust relational data storage with vector search capabilities."},
                    {"category": "AI/ML", "name": "Azure OpenAI / LangChain", "justification": "Enterprise-grade LLM access with orchestration."}
                ],
                "implementation_steps": [
                    "1. Setup cloud infrastructure (Azure Resource Group, OpenAI Service).",
                    "2. Initialize vector database and ingestion pipeline.",
                    "3. Develop core API with authentication.",
                    "4. Build interactive frontend dashboard.",
                    "5. Implement feedback loop and monitoring."
                ],
                "technical_risks": [
                    "Data Privacy: Ensuring PII masking before sending to LLM.",
                    "Latency: Potential delays in multi-step AI reasoning.",
                    "Cost Control: Token usage monitoring required."
                ],
                "complexity_score": 6,
                "is_mock": True
            }

        # Real LLM Logic
        from langchain_core.messages import HumanMessage
        
        try:
            prompt_text = f"""You are an expert Chief Software Architect.

Analyze this AI Use Case:
Title: "{title}"
Description: "{description}"
Proposed Solution: "{proposed_solution}"

Provide a technical deep dive:
1. High-level Architecture Overview (1 paragraph)
2. Recommended Tech Stack (Specific tools for Frontend, Backend, DB, AI)
3. 5 High-level Implementation Steps
4. 3-4 Technical Risks to mitigate
5. Complexity Score (1-10)

Return valid JSON:
{{
    "architecture_overview": "...",
    "recommended_stack": [
        {{ "category": "...", "name": "...", "justification": "..." }}
    ],
    "implementation_steps": ["1. ...", "2. ..."],
    "technical_risks": ["..."],
    "complexity_score": 5
}}"""
            
            message = HumanMessage(content=prompt_text)
            response = await self.llm.ainvoke([message])
            
            response_content = response.content if hasattr(response, 'content') else str(response)
            
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response_content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(response_content)
            result["is_mock"] = False
            return result
        except json.JSONDecodeError as e:
            print(f"Failed to parse LLM response: {e}")
            return {
                "architecture_overview": "Standard Web App with AI Integration (Fallback)",
                "recommended_stack": [],
                "implementation_steps": ["Define requirements", "Build MVP"],
                "technical_risks": ["Integration complexity"],
                "complexity_score": 5,
                "is_mock": False,
                "parse_error": str(e)
            }
        except Exception as e:
            print(f"Error in analyze_technical_feasibility: {e}")
            import traceback
            traceback.print_exc()
            raise

    async def analyze_document_context(self, text: str) -> List[Dict[str, Any]]:
        """
        Analyzes document text to extract potential challenge cards.
        Returns a list of dictionaries with title, description, and success_criteria.
        """
        if self.mock_mode:
            # Mock extracted challenges
            return [
                {
                    "title": "Extracted Challenge 1",
                    "challenge_description": f"Based on the document: {text[:50]}...",
                    "success_criteria": ["Criterion 1", "Criterion 2"],
                    "is_mock": True
                }
            ]

        from langchain_core.messages import HumanMessage
        
        try:
            prompt_text = f"""You are an expert Business Analyst. 
Analyze the following document text and identify key business or technology challenges.

Document Text:
"{text}"

Task:
Extract one or more 'Challenge Cards' from this text.
For each challenge, provide:
1. A concise Title (max 100 chars).
2. A detailed Description (max 2000 chars, describing the problem).
3. A list of Success Criteria (measurable outcomes, max 10 items).

Return valid JSON as a list of objects:
[
    {{
        "title": "...",
        "challenge_description": "...",
        "success_criteria": ["...", "..."]
    }}
]"""
            
            message = HumanMessage(content=prompt_text)
            response = await self.llm.ainvoke([message])
            
            response_content = response.content if hasattr(response, 'content') else str(response)
            
            # Try to extract JSON array from the response
            import re
            json_match = re.search(r'\[[\s\S]*\]', response_content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(response_content)
            # Ensure it's a list
            if isinstance(result, dict):
                result = [result]
            return result
        except Exception as e:
            print(f"Failed to parse LLM response for document analysis: {e}")
            return []


    async def extract_info_from_image(self, image_bytes: bytes, mime_type: str) -> str:
        """
        Extracts information/text from an image using LLM Vision capabilities.
        """
        if self.mock_mode:
            return "[MOCK] Extracted text from image: This appears to be a diagram showing AI architecture."

        try:
            import base64
            from langchain_core.messages import HumanMessage
            
            # Encode image
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            message = HumanMessage(
                content=[
                    {
                        "type": "text", 
                        "text": "Please analyze this image and provide a detailed description of its content. If it contains text, please transcribe it. If it contains diagrams, describe the structure and components."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            )
            
            response = await self.llm.ainvoke([message])
            return response.content
            
        except Exception as e:
            print(f"Error extracting info from image: {e}")
            return f"[ERROR] Failed to analyze image: {str(e)}"


    # ========================================================================
    # KNOWLEDGE VALIDATION METHODS
    # ========================================================================

    async def import_knowledge_article(self, content: str, title: str, source_type: str, metadata: dict = None) -> Dict[str, Any]:
        """
        Import a knowledge article into the RAG system.
        Generates embeddings and stores in vector database.
        
        Args:
            content: Full article text content
            title: Article title
            source_type: Type of source (pdf, docx, url, etc.)
            metadata: Additional metadata (source_url, filename, etc.)
        
        Returns:
            Dict with article_id, embedding_id, and summary
        """
        if metadata is None:
            metadata = {}
        
        if self.mock_mode:
            return {
                "article_id": f"mock_article_{random.randint(1000, 9999)}",
                "embedding_id": f"emb_{random.randint(1000, 9999)}",
                "summary": f"Mock summary of article: {title[:100]}...",
                "is_mock": True
            }
        
        try:
            from langchain.schema import Document
            from langchain_core.messages import HumanMessage
            
            # Generate summary using LLM
            summary_prompt = f"""Summarize the following article in 2-3 sentences, focusing on key insights and findings:

Title: {title}

Content:
{content[:2000]}...

Provide a concise summary:"""
            
            message = HumanMessage(content=summary_prompt)
            response = await self.llm.ainvoke([message])
            summary = response.content if hasattr(response, 'content') else str(response)
            
            # Create document for embedding
            doc = Document(
                page_content=f"{title}\n\n{content}",
                metadata={
                    "title": title,
                    "source_type": source_type,
                    **metadata
                }
            )
            
            # Generate embedding and store in vector database
            if self.vector_store and self.embeddings:
                # Add to existing vector store
                embedding_ids = self.vector_store.add_documents([doc])
                embedding_id = embedding_ids[0] if embedding_ids else None
            else:
                embedding_id = None
            
            return {
                "embedding_id": embedding_id,
                "summary": summary,
                "is_mock": False
            }
            
        except Exception as e:
            print(f"[RAG] Error importing knowledge article: {e}")
            import traceback
            traceback.print_exc()
            raise



    async def delete_knowledge_article(self, embedding_id: str) -> bool:
        """
        Delete a knowledge article's embeddings from the vector store.
        """
        if self.mock_mode:
            return True
            
        if not embedding_id:
            return True # Nothing to delete from vector store
            
        try:
            if self.vector_store:
                # Chroma deletion by ID
                self.vector_store.delete([embedding_id])
                print(f"[RAG] Deleted embedding {embedding_id} from vector store")
            return True
        except Exception as e:
            print(f"[RAG] Error deleting embedding {embedding_id}: {e}")
            return False

    async def validate_against_research(self, article_title: str, article_content: str, provider: str = "llm_only") -> Dict[str, Any]:
        """
        Validate article content against public research.
        
        Args:
            article_title: Title of the article
            article_content: Content to validate
            provider: Research API provider (perplexity, google_scholar, arxiv, llm_only)
        
        Returns:
            Dict with validation_score, sources, and notes
        """
        # Perplexity API integration
        if provider == "perplexity" and not self.mock_mode:
            try:
                import os
                import requests
                
                perplexity_api_key = os.getenv("PERPLEXITY_API_KEY", "").strip('"')
                
                if not perplexity_api_key:
                    print("[RAG] Perplexity API key not configured, falling back to LLM-only mode")
                    provider = "llm_only"
                else:
                    # Call Perplexity API to search for related research
                    search_query = f"Latest research and findings about: {article_title}"
                    
                    headers = {
                        "Authorization": f"Bearer {perplexity_api_key}",
                        "Content-Type": "application/json"
                    }
                    
                    payload = {
                        "model": "sonar",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a research validation expert. Provide credible sources and assess the validity of claims."
                            },
                            {
                                "role": "user",
                                "content": f"""Validate the following article against current research and provide credible sources:

Title: {article_title}

Content Summary:
{article_content[:1000]}...

Please provide:
1. A credibility score (0-100) based on how well the claims align with current research
2. List of credible research sources that support or contradict the claims
3. Any concerns or red flags

Return your response in JSON format:
{{
    "validation_score": 85,
    "sources": [
        {{"source": "Source name", "relevance": "High/Medium/Low", "url": "URL if available", "finding": "Brief summary"}}
    ],
    "notes": "Overall assessment and any concerns"
}}"""
                            }
                        ],
                        "temperature": 0.2,
                        "max_tokens": 1000
                    }
                    
                    response = requests.post(
                        "https://api.perplexity.ai/chat/completions",
                        headers=headers,
                        json=payload,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        result_data = response.json()
                        content = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        
                        # Parse JSON from response
                        import re
                        json_match = re.search(r'\{[\s\S]*\}', content, re.DOTALL)
                        if json_match:
                            validation_result = json.loads(json_match.group())
                            
                            return {
                                "validation_score": validation_result.get("validation_score", 75),
                                "sources": validation_result.get("sources", []),
                                "notes": validation_result.get("notes", "Validated using Perplexity AI research."),
                                "is_mock": False,
                                "provider": "perplexity"
                            }
                        else:
                            print(f"[RAG] Failed to parse Perplexity response: {content}")
                            provider = "llm_only"
                    else:
                        print(f"[RAG] Perplexity API error: {response.status_code} - {response.text}")
                        provider = "llm_only"
                        
            except Exception as e:
                print(f"[RAG] Error calling Perplexity API: {e}")
                import traceback
                traceback.print_exc()
                provider = "llm_only"
        
        # Mock mode or LLM-only validation
        if self.mock_mode or provider == "llm_only":
            # Mock sources for mock mode
            mock_sources = [
                {"source": "Gartner Research 2025", "relevance": "High", "url": "https://example.com/research1"},
                {"source": "McKinsey AI Report", "relevance": "Medium", "url": "https://example.com/research2"},
                {"source": "IEEE AI Standards", "relevance": "High", "url": "https://example.com/research3"}
            ]
            
            if self.mock_mode:
                return {
                    "validation_score": random.uniform(70, 95),
                    "sources": mock_sources,
                    "notes": "Mock validation: Article appears credible based on simulated research sources.",
                    "is_mock": True
                }
        
        # LLM-only validation (when not using external APIs)
        try:
            from langchain_core.messages import HumanMessage
            
            # Use LLM to assess credibility and suggest research sources
            validation_prompt = f"""You are a research validation expert. Analyze the following article and assess its credibility.

Title: {article_title}

Content:
{article_content[:1500]}...

Tasks:
1. Assess the credibility of the claims made (score 0-100)
2. Identify potential research sources that could validate these claims
3. Note any red flags or areas requiring verification

Return JSON only:
{{
    "validation_score": 85,
    "suggested_sources": [
        {{"source": "Source name", "relevance": "High/Medium/Low", "reason": "Why this source is relevant"}}
    ],
    "notes": "Brief assessment of credibility and any concerns"
}}"""
            
            message = HumanMessage(content=validation_prompt)
            response = await self.llm.ainvoke([message])
            response_content = response.content if hasattr(response, 'content') else str(response)
            
            # Parse JSON response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response_content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(response_content)
            
            # Format sources
            sources = []
            for src in result.get("suggested_sources", []):
                sources.append({
                    "source": src.get("source", "Unknown"),
                    "relevance": src.get("relevance", "Medium"),
                    "url": f"https://scholar.google.com/scholar?q={src.get('source', '').replace(' ', '+')}"
                })
            
            return {
                "validation_score": result.get("validation_score", 75),
                "sources": sources,
                "notes": result.get("notes", "Validation completed using LLM analysis."),
                "is_mock": False,
                "provider": "llm_only"
            }
            
        except Exception as e:
            print(f"[RAG] Error validating article: {e}")
            import traceback
            traceback.print_exc()
            # Return default validation
            return {
                "validation_score": 70,
                "sources": [],
                "notes": f"Validation error: {str(e)}",
                "is_mock": False
            }

    async def find_trending_use_cases(self, industry: str = "General", count: int = 3, custom_scope: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Find trending AI use cases for a specific industry using Perplexity API.
        
        Args:
            industry: Industry name (e.g. "Healthcare", "Finance")
            count: Number of use cases to find
            custom_scope: Optional custom search scope provided by user
            
        Returns:
            List of use case dictionaries
        """
        import uuid
        import random
        
        # Mock data generator
        def get_mock_data():
            mock_cases = []
            for i in range(count):
                mock_cases.append({
                    "id": f"fresh_{uuid.uuid4()}",
                    "title": f"Generative {industry} Agent {i+1}",
                    "description": f"AI agent that autonomously coordinates {industry.lower()} workflows using LLMs.",
                    "industry": industry,
                    "industry_name": industry,
                    "category": "Agentic AI",
                    "complexity": "High",
                    "typical_roi": "30-50% Efficiency Gain",
                    "relevance_score": 0.95 - (i * 0.05),
                    "is_trending": True
                })
            return mock_cases

        if self.mock_mode:
            return get_mock_data()

        # Try Perplexity API
        try:
            import os
            import requests
            
            perplexity_api_key = os.getenv("PERPLEXITY_API_KEY", "").strip('"')
            
            if not perplexity_api_key:
                print("[RAG] Perplexity API key not configured, falling back to mock data")
                return get_mock_data()
            
            # Determine search query based on custom scope or industry
            if custom_scope:
                search_query = f"Identify the top {count} trending AI use cases for: {custom_scope}"
            else:
                search_query = f"Identify the top {count} trending AI use cases in the {industry} industry for 2024-2025."
                
            # Call Perplexity API
            headers = {
                "Authorization": f"Bearer {perplexity_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "sonar",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a strategic AI consultant. Identify top trending AI use cases."
                    },
                    {
                        "role": "user",
                        "content": f"""{search_query}
Focus on actionable, high-value applications.

Return JSON in this format:
{{
    "use_cases": [
        {{
            "title": "Use Case Title",
            "description": "2-3 sentence description",
            "category": "Category (e.g. Generative AI, Predictive Analytics)",
            "complexity": "Low/Medium/High",
            "typical_roi": "Estimated ROI (e.g. 20% cost reduction)",
            "relevance_score": 0.95 (0.0-1.0 score)
        }}
    ]
}}"""
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 1000
            }
            
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result_data = response.json()
                content = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Parse JSON
                import re
                json_match = re.search(r'\{[\s\S]*\}', content, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                    use_cases = result.get("use_cases", [])
                    
                    # Add IDs and industry info
                    formatted_cases = []
                    for uc in use_cases:
                        uc["id"] = f"fresh_{uuid.uuid4()}"
                        uc["industry"] = industry
                        uc["industry_name"] = industry
                        uc["is_trending"] = True
                        formatted_cases.append(uc)
                        
                    return formatted_cases[:count]
                else:
                    print(f"[RAG] Failed to parse Perplexity response for trending use cases: {content}")
                    return get_mock_data()
            else:
                print(f"[RAG] Perplexity API error: {response.status_code} - {response.text}")
                return get_mock_data()
                
        except Exception as e:
            print(f"[RAG] Error finding trending use cases: {e}")
            return get_mock_data()


    async def find_affected_usecases(self, article_content: str, article_title: str, existing_usecases: List[Dict]) -> List[Dict]:
        """
        Find use cases that could be enhanced by the knowledge article.
        
        Args:
            article_content: Content of the knowledge article
            article_title: Title of the article
            existing_usecases: List of existing use case dicts
        
        Returns:
            List of dicts with usecase_id, relevance_score, impact_type, and suggested_changes
        """
        if self.mock_mode:
            # Mock affected use cases
            affected = []
            for uc in existing_usecases[:3]:  # Mock: affect first 3
                affected.append({
                    "usecase_id": uc.get("id"),
                    "usecase_title": uc.get("title"),
                    "relevance_score": random.uniform(60, 95),
                    "impact_type": random.choice(["addition", "refinement", "validation"]),
                    "suggested_changes": {
                        "description": f"Enhanced description based on {article_title}",
                        "typical_roi": "Updated ROI based on latest research",
                        "technologies": ["GPT-4", "RAG", "Vector DB"]
                    }
                })
            return affected
        
        try:
            from langchain_core.messages import HumanMessage
            
            affected_usecases = []
            
            # Analyze each use case for potential impact
            for uc in existing_usecases:
                analysis_prompt = f"""Analyze if this knowledge article is relevant to the use case and suggest improvements.

Knowledge Article: {article_title}
Article Summary: {article_content[:800]}...

Use Case: {uc.get('title')}
Description: {uc.get('description', '')}
Category: {uc.get('category', '')}

Tasks:
1. Determine relevance (score 0-100)
2. Identify impact type: "addition" (new info), "refinement" (improve existing), "validation" (confirms existing), or "none"
3. Suggest specific changes if relevant

Return JSON only:
{{
    "relevance_score": 75,
    "impact_type": "refinement",
    "suggested_changes": {{
        "description": "Updated description text",
        "typical_roi": "Updated ROI estimate",
        "key_benefits": ["benefit1", "benefit2"]
    }}
}}

If not relevant, return: {{"relevance_score": 0, "impact_type": "none", "suggested_changes": {{}}}}"""
                
                message = HumanMessage(content=analysis_prompt)
                response = await self.llm.ainvoke([message])
                response_content = response.content if hasattr(response, 'content') else str(response)
                
                # Parse JSON response
                import re
                json_match = re.search(r'\{[\s\S]*\}', response_content, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    result = json.loads(response_content)
                
                # Only include if relevance is above threshold
                if result.get("relevance_score", 0) >= 50 and result.get("impact_type") != "none":
                    affected_usecases.append({
                        "usecase_id": uc.get("id"),
                        "usecase_title": uc.get("title"),
                        "relevance_score": result.get("relevance_score"),
                        "impact_type": result.get("impact_type"),
                        "suggested_changes": result.get("suggested_changes", {})
                    })
            
            return affected_usecases
            
        except Exception as e:
            print(f"[RAG] Error finding affected use cases: {e}")
            import traceback
            traceback.print_exc()
            return []


rag_service = RAGService()

