import os
import json
import random
from typing import List, Dict, Any

class RAGService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.mock_mode = not self.api_key
        self.vector_store = None
        
        # Load Reference Data
        try:
            with open("app/data/ai_use_cases.json", "r") as f:
                self.reference_data = json.load(f)
        except Exception as e:
            print(f"Error loading reference data: {e}")
            self.reference_data = []

        if not self.mock_mode:
            self._initialize_real_components()
        else:
            print("RAGService running in MOCK MODE (No API Key found)")

    def _initialize_real_components(self):
        try:
            from langchain_openai import ChatOpenAI, OpenAIEmbeddings
            from langchain.vectorstores import Chroma
            from langchain.schema import Document
            
            self.llm = ChatOpenAI(temperature=0.7, model="gpt-4", api_key=self.api_key)
            self.embeddings = OpenAIEmbeddings(api_key=self.api_key)
            
            # Simple in-memory Chroma for MVP
            documents = [
                Document(page_content=f"{item['title']}: {item['description']}", metadata=item)
                for item in self.reference_data
            ]
            self.vector_store = Chroma.from_documents(documents, self.embeddings)
            
        except ImportError:
            print("LangChain dependencies missing. Reverting to Mock Mode.")
            self.mock_mode = True
        except Exception as e:
            print(f"Failed to init RAG components: {e}")
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
        from langchain.prompts import ChatPromptTemplate
        
        # 1. Retrieve context
        docs = self.vector_store.similarity_search(text, k=2)
        context_str = "\n".join([d.page_content for d in docs])
        
        # 2. Call LLM
        prompt = ChatPromptTemplate.from_template("""
        You are an expert AI Solution Architect.
        User Input: "{text}"
        
        Similar Success Stories:
        {context}
        
        Task: 
        1. Create a professional Title.
        2. Refine the Description to be technical and value-focused.
        3. Propose a technical Solution using standard modern AI stack.
        4. Suggest a specific KPI suitable for this use case.
        
        Return JSON only: {{ "title": "...", "description": "...", "solution": "...", "kpi": "..." }}
        """)
        
        chain = prompt | self.llm
        response = await chain.ainvoke({"text": text, "context": context_str})
        
        try:
            return json.loads(response.content)
        except:
            return {"error": "Failed to parse LLM response", "raw": response.content}

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
        try:
            return json.loads(response.content)
        except:
            return {"score": "Unknown", "reason": "Parse error"}

rag_service = RAGService()
