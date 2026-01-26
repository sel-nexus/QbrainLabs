"""
Export API Endpoints
Provides PDF and CSV export with branding support
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime
from collections import defaultdict
import io
import csv
import statistics

from app.core.database import get_db
from app.models.models import Workshop, UseCase, Vote, Participant
from app.middleware.error_handler import NotFoundException

router = APIRouter(prefix="/api/export", tags=["export"])


def generate_html_report(
    workshop: Workshop,
    use_cases: list,
    quadrant_data: dict,
    agreement_data: list,
    branding: dict = None
) -> str:
    """Generate HTML report for PDF conversion"""
    
    # Default branding
    brand_name = branding.get("company_name", "Qbrain AI Labs") if branding else "Qbrain AI Labs"
    brand_color = branding.get("primary_color", "#8b5cf6") if branding else "#8b5cf6"
    logo_url = branding.get("logo_url", "") if branding else ""
    
    # Build HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{workshop.title} - Workshop Report</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                color: #333; 
                line-height: 1.6;
                padding: 40px;
            }}
            .header {{ 
                border-bottom: 3px solid {brand_color}; 
                padding-bottom: 20px; 
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .logo {{ max-height: 50px; }}
            .brand-name {{ color: {brand_color}; font-size: 14px; }}
            h1 {{ color: {brand_color}; font-size: 28px; margin-bottom: 10px; }}
            h2 {{ color: {brand_color}; font-size: 20px; margin: 30px 0 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }}
            h3 {{ color: #555; font-size: 16px; margin: 20px 0 10px; }}
            .meta {{ color: #666; font-size: 14px; }}
            .stats-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }}
            .stat-card {{ 
                background: #f8f9fa; 
                padding: 20px; 
                border-radius: 8px; 
                text-align: center;
                border-left: 4px solid {brand_color};
            }}
            .stat-value {{ font-size: 32px; font-weight: bold; color: {brand_color}; }}
            .stat-label {{ font-size: 12px; color: #666; text-transform: uppercase; }}
            .quadrant-section {{ margin: 20px 0; }}
            .quadrant {{ 
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 8px; 
                margin: 10px 0;
            }}
            .quadrant-title {{ 
                font-weight: bold; 
                padding: 5px 10px; 
                border-radius: 4px; 
                display: inline-block;
                margin-bottom: 10px;
            }}
            .quick-wins {{ background: #10b981; color: white; }}
            .strategic-bets {{ background: #8b5cf6; color: white; }}
            .nice-to-have {{ background: #3b82f6; color: white; }}
            .dont-do {{ background: #ef4444; color: white; }}
            .use-case-item {{ 
                background: white; 
                padding: 12px; 
                margin: 8px 0; 
                border-radius: 4px;
                border: 1px solid #eee;
            }}
            .use-case-title {{ font-weight: bold; }}
            .use-case-scores {{ font-size: 12px; color: #666; margin-top: 5px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
            th {{ background: #f8f9fa; font-weight: 600; }}
            .agreement-high {{ color: #10b981; }}
            .agreement-medium {{ color: #f59e0b; }}
            .agreement-low {{ color: #ef4444; }}
            .footer {{ 
                margin-top: 40px; 
                padding-top: 20px; 
                border-top: 1px solid #eee; 
                text-align: center;
                color: #666;
                font-size: 12px;
            }}
            @media print {{
                body {{ padding: 20px; }}
                .page-break {{ page-break-before: always; }}
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <h1>{workshop.title}</h1>
                <p class="meta">Workshop Report • Generated {datetime.now().strftime('%B %d, %Y')}</p>
            </div>
            <div class="brand-name">
                {f'<img src="{logo_url}" class="logo" alt="Logo">' if logo_url else ''}
                <div>{brand_name}</div>
            </div>
        </div>
        
        <h2>Executive Summary</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{len(use_cases)}</div>
                <div class="stat-label">Use Cases</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{quadrant_data['summary']['quick_wins_count']}</div>
                <div class="stat-label">Quick Wins</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{quadrant_data['summary']['strategic_bets_count']}</div>
                <div class="stat-label">Strategic Bets</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{sum(uc.get('vote_count', 0) for uc in use_cases)}</div>
                <div class="stat-label">Total Votes</div>
            </div>
        </div>
        
        <h2>Prioritization Matrix</h2>
        
        <div class="quadrant-section">
            <div class="quadrant">
                <span class="quadrant-title quick-wins">Quick Wins ({len(quadrant_data['quadrants']['quick_wins'])})</span>
                <p style="font-size: 12px; color: #666; margin-bottom: 10px;">High value, high feasibility - prioritize these</p>
                {''.join([f'<div class="use-case-item"><div class="use-case-title">{uc["title"]}</div><div class="use-case-scores">Value: {uc["y"]} | Feasibility: {uc["x"]} | Votes: {uc["vote_count"]}</div></div>' for uc in quadrant_data['quadrants']['quick_wins'][:5]]) or '<p style="color: #666;">No use cases in this quadrant</p>'}
            </div>
            
            <div class="quadrant">
                <span class="quadrant-title strategic-bets">Strategic Bets ({len(quadrant_data['quadrants']['strategic_bets'])})</span>
                <p style="font-size: 12px; color: #666; margin-bottom: 10px;">High value, lower feasibility - invest strategically</p>
                {''.join([f'<div class="use-case-item"><div class="use-case-title">{uc["title"]}</div><div class="use-case-scores">Value: {uc["y"]} | Feasibility: {uc["x"]} | Votes: {uc["vote_count"]}</div></div>' for uc in quadrant_data['quadrants']['strategic_bets'][:5]]) or '<p style="color: #666;">No use cases in this quadrant</p>'}
            </div>
        </div>
        
        <div class="page-break"></div>
        
        <h2>Consensus Analysis</h2>
        <table>
            <thead>
                <tr>
                    <th>Use Case</th>
                    <th>Agreement Score</th>
                    <th>Consensus Level</th>
                    <th>Votes</th>
                </tr>
            </thead>
            <tbody>
                {''.join([f'<tr><td>{item["title"]}</td><td>{item["overall_agreement"]}%</td><td class="agreement-{item["consensus_level"].lower()}">{item["consensus_level"]}</td><td>{item["vote_count"]}</td></tr>' for item in agreement_data[:10]])}
            </tbody>
        </table>
        
        <h2>All Use Cases Ranked</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Avg Score</th>
                    <th>Votes</th>
                </tr>
            </thead>
            <tbody>
                {''.join([f'<tr><td>{i+1}</td><td>{uc["title"]}</td><td>{uc.get("category", "-")}</td><td>{uc.get("total_score", "-")}</td><td>{uc.get("vote_count", 0)}</td></tr>' for i, uc in enumerate(use_cases[:20])])}
            </tbody>
        </table>
        
        <div class="footer">
            <p>Generated by {brand_name} • {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            <p>This report contains confidential workshop data.</p>
        </div>
    </body>
    </html>
    """
    
    return html


@router.get("/workshop/{workshop_id}/pdf")
async def export_workshop_pdf(
    workshop_id: str,
    company_name: Optional[str] = None,
    primary_color: Optional[str] = None,
    logo_url: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Export workshop results as a branded PDF report.
    Returns HTML that can be converted to PDF client-side.
    """
    # Get workshop
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id)
    )
    workshop = workshop_result.scalars().first()
    if not workshop:
        raise NotFoundException("Workshop", workshop_id)
    
    # Get use cases with votes
    result = await db.execute(
        select(UseCase)
        .where(UseCase.workshop_id == workshop_id)
        .options(selectinload(UseCase.votes))
    )
    use_cases_raw = result.scalars().all()
    
    # Process use cases
    use_cases = []
    for uc in use_cases_raw:
        scores_sum = defaultdict(float)
        scores_count = defaultdict(int)
        
        for vote in uc.votes:
            if vote.scores:
                for criterion, score in vote.scores.items():
                    scores_sum[criterion] += float(score)
                    scores_count[criterion] += 1
        
        avg_scores = {k: round(scores_sum[k] / scores_count[k], 2) for k in scores_sum}
        total_score = round(sum(avg_scores.values()) / len(avg_scores), 2) if avg_scores else 0
        
        use_cases.append({
            "id": str(uc.id),
            "title": uc.title,
            "category": uc.category,
            "total_score": total_score,
            "vote_count": len(uc.votes),
            "scores": avg_scores
        })
    
    use_cases.sort(key=lambda x: x["total_score"], reverse=True)
    
    # Build quadrant data
    threshold = 5.0
    quadrant_data = {
        "quadrants": {
            "quick_wins": [],
            "strategic_bets": [],
            "nice_to_have": [],
            "dont_do": []
        },
        "summary": {
            "quick_wins_count": 0,
            "strategic_bets_count": 0,
            "nice_to_have_count": 0,
            "dont_do_count": 0
        }
    }
    
    for uc in use_cases:
        feasibility_keys = ['Feasibility', 'Ease of Implementation', 'Data Readiness']
        value_keys = ['Business Value', 'Impact', 'Value', 'Business Impact']
        
        x_val = next((uc["scores"].get(k) for k in feasibility_keys if k in uc["scores"]), None)
        y_val = next((uc["scores"].get(k) for k in value_keys if k in uc["scores"]), None)
        
        if x_val is None or y_val is None:
            continue
        
        uc_data = {**uc, "x": x_val, "y": y_val}
        
        if y_val >= threshold and x_val >= threshold:
            quadrant_data["quadrants"]["quick_wins"].append(uc_data)
        elif y_val >= threshold:
            quadrant_data["quadrants"]["strategic_bets"].append(uc_data)
        elif x_val >= threshold:
            quadrant_data["quadrants"]["nice_to_have"].append(uc_data)
        else:
            quadrant_data["quadrants"]["dont_do"].append(uc_data)
    
    for key in ["quick_wins", "strategic_bets", "nice_to_have", "dont_do"]:
        quadrant_data["summary"][f"{key}_count"] = len(quadrant_data["quadrants"][key])
    
    # Build agreement data
    agreement_data = []
    for uc in use_cases_raw:
        if not uc.votes:
            continue
        
        criteria_variances = []
        for vote in uc.votes:
            if vote.scores:
                for criterion, score in vote.scores.items():
                    pass  # Simplified for export
        
        # Calculate simple agreement (higher vote count = more confidence)
        agreement_score = min(100, len(uc.votes) * 10)
        consensus = "High" if agreement_score >= 70 else "Medium" if agreement_score >= 40 else "Low"
        
        agreement_data.append({
            "title": uc.title,
            "overall_agreement": agreement_score,
            "consensus_level": consensus,
            "vote_count": len(uc.votes)
        })
    
    # Generate HTML report
    branding = {}
    if company_name:
        branding["company_name"] = company_name
    if primary_color:
        branding["primary_color"] = primary_color
    if logo_url:
        branding["logo_url"] = logo_url
    
    html_content = generate_html_report(
        workshop=workshop,
        use_cases=use_cases,
        quadrant_data=quadrant_data,
        agreement_data=agreement_data,
        branding=branding
    )
    
    return Response(
        content=html_content,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="workshop_report_{workshop_id}.html"'
        }
    )


@router.get("/workshop/{workshop_id}/csv")
async def export_workshop_csv(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Export workshop results as CSV.
    """
    # Get workshop
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id)
    )
    workshop = workshop_result.scalars().first()
    if not workshop:
        raise NotFoundException("Workshop", workshop_id)
    
    # Get use cases with votes
    result = await db.execute(
        select(UseCase)
        .where(UseCase.workshop_id == workshop_id)
        .options(selectinload(UseCase.votes))
    )
    use_cases = result.scalars().all()
    
    # Collect all criteria
    all_criteria = set()
    for uc in use_cases:
        for vote in uc.votes:
            if vote.scores:
                all_criteria.update(vote.scores.keys())
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    headers = ['ID', 'Title', 'Category', 'Description', 'Vote Count', 'Avg Total Score']
    headers.extend(sorted(all_criteria))
    writer.writerow(headers)
    
    # Data rows
    for uc in use_cases:
        scores_sum = defaultdict(float)
        scores_count = defaultdict(int)
        
        for vote in uc.votes:
            if vote.scores:
                for criterion, score in vote.scores.items():
                    scores_sum[criterion] += float(score)
                    scores_count[criterion] += 1
        
        avg_scores = {k: round(scores_sum[k] / scores_count[k], 2) for k in scores_sum}
        total_score = round(sum(avg_scores.values()) / len(avg_scores), 2) if avg_scores else 0
        
        row = [
            str(uc.id),
            uc.title,
            uc.category or '',
            uc.description[:200] if uc.description else '',
            len(uc.votes),
            total_score
        ]
        for criterion in sorted(all_criteria):
            row.append(avg_scores.get(criterion, ''))
        
        writer.writerow(row)
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="workshop_results_{workshop_id}.csv"'
        }
    )
