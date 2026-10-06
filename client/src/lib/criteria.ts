// Scoring criteria helpers shared by Create Workshop and Workshop Settings.

export interface Criterion {
    name: string;
    weight: number;
    description?: string;
}

export interface CriteriaAxes {
    x_axis?: string | null;
    y_axis?: string | null;
}

// Keyword mapping used when no explicit axes are chosen (matches server/app/utils/matrix.py).
const X_KEYWORDS = ['Feasibility', 'Ease of Implementation', 'Effort (Inverse)', 'Readiness', 'Data Readiness', 'Organizational Readiness', 'Complexity', 'Implementation Readiness'];
const Y_KEYWORDS = ['Business Value', 'Impact', 'Value', 'Business Impact', 'Strategic Alignment', 'Scalability & Value', 'ROI', 'Alignment', 'Strategic', 'Strategic Value'];

/** Axes for the prioritization matrix: explicit choice first, then keyword inference. */
export function matrixAxes(criteriaNames: string[], axes?: CriteriaAxes): { xLabel: string; yLabel: string } {
    if (axes?.x_axis && axes?.y_axis && criteriaNames.includes(axes.x_axis) && criteriaNames.includes(axes.y_axis)) {
        return { xLabel: axes.x_axis, yLabel: axes.y_axis };
    }
    const xLabel = criteriaNames.find((n) => X_KEYWORDS.includes(n)) || criteriaNames[0] || 'Feasibility';
    let yLabel = criteriaNames.find((n) => Y_KEYWORDS.includes(n)) || criteriaNames[1] || 'Business Value';
    if (xLabel === yLabel && criteriaNames.length > 1) {
        yLabel = criteriaNames.find((n) => n !== xLabel) || yLabel;
    }
    return { xLabel, yLabel };
}

/** Whole-number weights that add up to exactly 100. */
export function distributeEvenly<T extends Criterion>(criteria: T[]): T[] {
    if (!criteria.length) return criteria;
    const base = Math.floor(100 / criteria.length);
    let remainder = 100 - base * criteria.length;
    return criteria.map((c) => {
        const extra = remainder > 0 ? 1 : 0;
        remainder -= extra;
        return { ...c, weight: base + extra };
    });
}

export const totalWeight = (criteria: Criterion[]) => criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

/** Errors keyed by "name-<i>", "weight", "axes". Empty object means valid. */
export function validateCriteria(criteria: Criterion[], axes?: CriteriaAxes): Record<string, string> {
    const errors: Record<string, string> = {};
    const seen = new Set<string>();
    criteria.forEach((c, i) => {
        const name = c.name.trim();
        if (!name) errors[`name-${i}`] = 'Give this criterion a name';
        else if (seen.has(name.toLowerCase())) errors[`name-${i}`] = 'This name is already used';
        seen.add(name.toLowerCase());
        const w = Number(c.weight);
        if (!Number.isInteger(w) || w < 0 || w > 100) errors[`weight-${i}`] = '0–100';
    });
    const total = totalWeight(criteria);
    if (total !== 100) errors.weight = `Weights must add up to 100% (currently ${total}%)`;
    if (axes?.x_axis && axes?.y_axis && axes.x_axis === axes.y_axis) errors.axes = 'Choose two different criteria for the axes';
    return errors;
}
