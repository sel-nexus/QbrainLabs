from typing import List, Dict
import numpy_financial as npf
from app.schemas.roi import (
    CostInputs, BenefitInputs, ROIParameters, ROIResults, 
    AnnualData, ROIChartData
)

class ROIService:
    @staticmethod
    def calculate_roi(costs: CostInputs, benefits: BenefitInputs, params: ROIParameters) -> ROIResults:
        # 1. Calculate Annual Streams
        
        # Annual Benefits
        # Time savings (Weekly hours * rate * 52 weeks)
        annual_time_savings = benefits.time_savings_hours * benefits.hourly_rate * 52
        
        # Total Annual Recurring Benefit
        annual_recurring_benefit = (
            annual_time_savings + 
            benefits.revenue_impact
        )
        
        # One-time Benefit (Cost Avoidance) - counted in Year 1? 
        # Usually Cost Avoidance is treated as a benefit in Year 0 or 1. Let's assume Year 1.
        one_time_benefit = benefits.cost_avoidance

        # Costs
        maintenance_cost = costs.implementation * costs.maintenance_rate
        annual_infrastructure = costs.infrastructure * 12
        
        annual_recurring_cost = (
            annual_infrastructure + 
            costs.licensing + 
            maintenance_cost
        )
        
        # Initial Investment (Year 0)
        initial_investment = costs.implementation + costs.training

        # 2. Project Cash Flows
        cash_flows = [-initial_investment] # Year 0
        annual_breakdown: List[AnnualData] = []
        cumulative_cash = -initial_investment
        
        # Year 0 Data
        annual_breakdown.append(AnnualData(
            year=0,
            costs=initial_investment,
            benefits=0,
            net=-initial_investment,
            cumulative=cumulative_cash
        ))

        total_benefits = 0.0
        total_costs = initial_investment

        for year in range(1, params.project_years + 1):
            # Apply inflation if needed (keeping simple for now unless specified)
            # inflation_factor = (1 + params.inflation_rate) ** (year - 1)
            
            year_benefit = annual_recurring_benefit
            if year == 1:
                year_benefit += one_time_benefit
                
            year_cost = annual_recurring_cost
            
            net_year = year_benefit - year_cost
            cumulative_cash += net_year
            
            cash_flows.append(net_year)
            
            total_benefits += year_benefit
            total_costs += year_cost
            
            annual_breakdown.append(AnnualData(
                year=year,
                costs=year_cost,
                benefits=year_benefit,
                net=net_year,
                cumulative=cumulative_cash
            ))

        # 3. Calculate Metrics
        
        # NPV
        npv = npf.npv(params.discount_rate, cash_flows)
        
        # IRR
        try:
            irr = npf.irr(cash_flows)
            if irr is None or str(irr) == 'nan':
                irr = 0.0
        except (ValueError, FloatingPointError):
            irr = 0.0
            
        # ROI
        # Simple ROI = (Total Benefits - Total Costs) / Total Costs
        roi_percent = 0.0
        if total_costs > 0:
            roi_percent = ((total_benefits - total_costs) / total_costs) * 100

        # Payback Period (Months)
        # Find when cumulative cash becomes positive
        payback_months = 0.0
        cumulative = -initial_investment
        recovered = False
        
        # Monthly Net Benefit approximation
        monthly_net = (annual_recurring_benefit - annual_recurring_cost) / 12
        if one_time_benefit > 0:
             # This complicates simple payback. Let's use cumulative cash flow interpolation.
             pass
             
        # Proper payback calculation
        # Helper to find crossover
        cf_cumulative = []
        curr = 0
        for cf in cash_flows:
            curr += cf
            cf_cumulative.append(curr)
            
        # Iterate to find the year where it flips
        payback_years = 0.0
        for i in range(1, len(cf_cumulative)):
            prev = cf_cumulative[i-1]
            curr = cf_cumulative[i]
            if prev < 0 and curr >= 0:
                # Fraction of year
                fraction = abs(prev) / (curr - prev) if curr != prev else 0.0
                payback_years = (i - 1) + fraction
                recovered = True
                break
        
        if recovered:
            payback_months = payback_years * 12
        else:
            payback_months = params.project_years * 12 # Cap at project end
            
        # TCO
        tco = total_costs

        # 4. Prepare Charts Data
        cost_breakdown = {
            "Implementation": costs.implementation,
            "Training": costs.training,
            "Infrastructure (Total)": annual_infrastructure * params.project_years,
            "Licensing (Total)": costs.licensing * params.project_years,
            "Maintenance (Total)": maintenance_cost * params.project_years
        }
        
        benefit_breakdown = {
            "Time Savings": annual_time_savings * params.project_years,
            "Revenue Impact": benefits.revenue_impact * params.project_years,
            "Cost Avoidance": benefits.cost_avoidance, # One time
        }

        charts_data = ROIChartData(
            timeline=annual_breakdown,
            cost_breakdown=cost_breakdown,
            benefit_breakdown=benefit_breakdown
        )
        
        return ROIResults(
            roi_percent=round(roi_percent, 2),
            npv=round(npv, 2),
            irr=round(irr * 100, 2), # Convert to percent
            payback_months=round(payback_months, 1),
            tco=round(tco, 2),
            annual_breakdown=annual_breakdown,
            charts_data=charts_data
        )
