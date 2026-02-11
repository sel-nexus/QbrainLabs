
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.schemas.ai import ROIResponse, BusinessCaseResponse, BusinessValueResponse

print("Imported schemas successfully.")

try:
    print("Testing ROIResponse...")
    r = ROIResponse(
        estimates={"a": 1},
        cost_drivers=["a"],
        benefit_levers=["b"],
        assumptions=["c"]
    )
    print("ROIResponse Valid.")
except Exception as e:
    print(f"ROIResponse Invalid: {e}")

try:
    print("Testing BusinessCaseResponse...")
    b = BusinessCaseResponse(
        executive_summary="s",
        problem_statement="p",
        strategic_alignment="s",
        financial_analysis="f",
        risks_and_mitigation="r",
        recommendation="r"
    )
    print("BusinessCaseResponse Valid.")
except Exception as e:
    print(f"BusinessCaseResponse Invalid: {e}")
