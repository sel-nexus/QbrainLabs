
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

# Standardized Axis Keywords
STANDARD_X_KEYWORDS = [
    'Feasibility', 'Ease of Implementation', 'Readiness', 
    'Data Readiness', 'Organizational Readiness', 'Implementation Readiness'
]

STANDARD_Y_KEYWORDS = [
    'Business Value', 'Impact', 'Value', 'Business Impact', 
    'Strategic Alignment', 'Scalability & Value', 'ROI', 
    'Alignment', 'Strategic', 'Strategic Value'
]

# Keywords that should be inverted (lower is better for feasibility)
INVERSE_KEYWORDS = ['Risk', 'Risk & Compliance', 'Complexity', 'Effort', 'Cost']

def detect_scale_max(scores: List[float]) -> float:
    """
    Robustly detect if scores are on a 1-10 or 0-100 scale.
    Defaults to 100.0 for consistency unless explicitly 1-10.
    """
    if not scores:
        return 100.0
    # If any score is > 10, it's definitely 0-100.
    if any(s > 10 for s in scores):
        return 100.0
    # If all scores are <= 10 and contain decimals, it might be 1-10
    # or it might be a very low-scored 0-100 scale.
    # However, to "Unify to 1-100", we will return 100.0 as the preferred scale
    # but the coordinate calculation will handle the normalization.
    return 10.0 if any(0 < s <= 10 and s % 1 != 0 for s in scores) else 100.0

def get_scale_factor(val: float, scale_max: Optional[float] = None) -> float:
    """
    Returns the multiplier needed to bring a value to 0-100.
    """
    if scale_max:
        return 100.0 / scale_max
    return 1.0 if val > 10 else 10.0

def calculate_agreement_score(scores: List[float], scale_max: float = 10.0) -> float:
    """
    Calculates agreement (consensus) based on variance.
    100% = No variance (all voted the same).
    0% = Max possible variance (split between 0 and scale_max).
    """
    if not scores or len(scores) < 2:
        return 100.0
    
    variance = np.var(scores)
    
    # Max variance for a range [0, S] is (S/2)^2
    max_variance = (scale_max / 2) ** 2
    
    if max_variance == 0:
        return 100.0
        
    agreement = max(0, 100 - (variance / max_variance * 100))
    return round(float(agreement), 2)

def calculate_matrix_position(
    avgs: Dict[str, float], 
    template_id: Optional[str] = None,
    scale_max: Optional[float] = None
) -> Tuple[Optional[float], Optional[float]]:
    """
    Standardizes coordinate calculation across the platform.
    Returns (x, y) on a 0-100 scale.
    """
    x_val = None
    y_val = None

    # Determine axis parameters based on template or keywords
    if template_id in ['7_POINT_COMPREHENSIVE', '7_POINT_COMPRE_HENSIVE']:
        y_params = ['Business Impact', 'Strategic Alignment', 'Scalability & Value']
        x_params = ['Ease of Implementation', 'Data Readiness', 'Organizational Readiness']
        inverse_params = ['Risk & Compliance']
    else:
        y_params = STANDARD_Y_KEYWORDS
        x_params = STANDARD_X_KEYWORDS
        inverse_params = INVERSE_KEYWORDS

    # Helper for weighted average and inversion
    def get_axis_val(params: List[str], inv_params: List[str]) -> Optional[float]:
        total_sum = 0
        count = 0
        
        # Regular params
        for p in params:
            if p in avgs:
                val = avgs[p]
                s_factor = get_scale_factor(val, scale_max)
                total_sum += val * s_factor
                count += 1
        
        # Inverse params (e.g. Risk)
        for p in inv_params:
            if p in avgs:
                val = avgs[p]
                s_factor = get_scale_factor(val, scale_max)
                # Max value on the scale (10 or 100)
                current_max = scale_max if scale_max else (100.0 if val > 10 else 10.0)
                
                # Inversion logic: 1-10 -> 11-x, 0-100 -> 100-x
                if current_max <= 10:
                    inverted = 11.0 - val
                else:
                    inverted = 100.0 - val
                    
                total_sum += inverted * (100.0 / current_max)
                count += 1
                
        if count == 0:
            return None
        return total_sum / count

    x_val = get_axis_val(x_params, inverse_params)
    y_val = get_axis_val(y_params, [])

    # Final Boundary Check
    if x_val is not None:
        x_val = max(0, min(100, x_val))
    if y_val is not None:
        y_val = max(0, min(100, y_val))

    return x_val, y_val
