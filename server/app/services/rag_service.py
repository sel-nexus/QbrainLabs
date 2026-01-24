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

rag_service = RAGService()
