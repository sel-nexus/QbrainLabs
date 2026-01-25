export interface CostInputs {
    implementation: number;
    infrastructure: number;
    licensing: number;
    training: number;
    maintenance_rate: number;
}

export interface BenefitInputs {
    time_savings_hours: number;
    hourly_rate: number;
    error_reduction_pct: number;
    revenue_impact: number;
    cost_avoidance: number;
    productivity_gain_pct: number;
}

export interface ROIParameters {
    discount_rate: number;
    project_years: number;
    inflation_rate: number;
}

export interface AnnualData {
    year: number;
    costs: number;
    benefits: number;
    net: number;
    cumulative: number;
}

export interface ROIChartData {
    timeline: AnnualData[];
    cost_breakdown: Record<string, number>;
    benefit_breakdown: Record<string, number>;
}

export interface ROIResults {
    roi_percent: number;
    npv: number;
    irr: number;
    payback_months: number;
    tco: number;
    annual_breakdown: AnnualData[];
    charts_data: ROIChartData;
}

export interface ROICalculation {
    id: string;
    use_case_id: string;
    workshop_id: string;
    costs: CostInputs;
    benefits: BenefitInputs;
    parameters: ROIParameters;
    results: ROIResults;
    created_at: string;
    updated_at: string;
}

export const DEFAULT_COSTS: CostInputs = {
    implementation: 0,
    infrastructure: 0,
    licensing: 0,
    training: 0,
    maintenance_rate: 0.15
};

export const DEFAULT_BENEFITS: BenefitInputs = {
    time_savings_hours: 0,
    hourly_rate: 0,
    error_reduction_pct: 0,
    revenue_impact: 0,
    cost_avoidance: 0,
    productivity_gain_pct: 0
};

export const DEFAULT_PARAMS: ROIParameters = {
    discount_rate: 0.10,
    project_years: 3,
    inflation_rate: 0.03
};
