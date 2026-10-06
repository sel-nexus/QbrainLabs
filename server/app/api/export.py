"""
Export API Endpoints
CSV and PDF exports of workshop results.

Both are built from app.services.workshop_results, so ranks, scores,
quadrants and consensus match the results screen exactly (US48.11).
"""

import csv
import io
import re
from datetime import datetime
from typing import Dict, List, Optional
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.auth import get_current_user
from app.core.database import get_db
from app.middleware.error_handler import NotFoundException
from app.models.models import User, Workshop
from app.services.workshop_results import (
    CONSENSUS_LABELS,
    QUADRANT_DESCRIPTIONS,
    QUADRANT_LABELS,
    axis_labels,
    compute_workshop_results,
)

router = APIRouter(prefix="/api/export", tags=["export"])

_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


async def _load_workshop(db: AsyncSession, workshop_id: str, user: User) -> Workshop:
    from app.api.workshops import _check_workshop_permission  # avoid import cycle at module load

    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    if not workshop:
        raise NotFoundException("Workshop", workshop_id)
    await _check_workshop_permission(workshop, user, db)
    return workshop


def _safe_filename(title: str, suffix: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", title or "workshop").strip("-").lower()[:60] or "workshop"
    return f"{slug}-results.{suffix}"


def _criteria_names(workshop: Workshop, results: List[dict]) -> List[str]:
    names = [c.get("name") for c in (workshop.config or {}).get("criteria", []) if c.get("name")]
    extra = sorted({k for r in results for k in r["scores"] if k not in names})
    return names + extra


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------

@router.get("/workshop/{workshop_id}/csv")
async def export_workshop_csv(
    workshop_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ranked results as CSV (same numbers as the results screen)."""
    workshop = await _load_workshop(db, workshop_id, current_user)
    results = await compute_workshop_results(db, workshop)
    criteria = _criteria_names(workshop, results)
    x_label, y_label = axis_labels(workshop.config)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Rank", "Use case", "Category", "Quadrant", "Score (0-100)", "Consensus", "Agreement (%)",
        "Scores received", f"Matrix X: {x_label} (0-100)", f"Matrix Y: {y_label} (0-100)",
        *[f"{c} (avg)" for c in criteria], "Description",
    ])
    for r in results:
        writer.writerow([
            (f"{r['rank']}=" if r["tied"] else r["rank"]) if r["rank"] else "",
            r["title"],
            r["category"] or "",
            QUADRANT_LABELS.get(r["quadrant"], ""),
            r["normalized_score"] if r["vote_count"] else "",
            CONSENSUS_LABELS.get(r["consensus_level"], "") if r["consensus_level"] else "",
            r["agreement"] if r["agreement"] is not None else "",
            r["vote_count"],
            round(r["x"], 1) if r["x"] is not None else "",
            round(r["y"], 1) if r["y"] is not None else "",
            *[r["scores"].get(c, "") for c in criteria],
            (r["description"] or "")[:500],
        ])

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{_safe_filename(workshop.title, "csv")}"'},
    )


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------

QUADRANT_COLORS = {
    "quick_wins": "#10b981",
    "strategic_bets": "#8b5cf6",
    "nice_to_have": "#3b82f6",
    "dont_do": "#ef4444",
}
CONSENSUS_COLORS = {"high": "#047857", "moderate": "#b45309", "needs_discussion": "#b91c1c"}


def _matrix_drawing(results: List[dict], x_label: str, y_label: str, brand: str):
    """Scatter of the prioritization matrix with quadrants and rank labels."""
    from reportlab.graphics.shapes import Circle, Drawing, Group, Line, Rect, String
    from reportlab.lib import colors

    width, height, pad = 460, 300, 40
    plot_w, plot_h = width - pad - 10, height - pad - 20
    drawing = Drawing(width, height)

    def px(x):
        return pad + plot_w * (x / 100.0)

    def py(y):
        return pad + plot_h * (y / 100.0)

    quads = [
        ("strategic_bets", 0, 50), ("quick_wins", 50, 50),
        ("dont_do", 0, 0), ("nice_to_have", 50, 0),
    ]
    for key, qx, qy in quads:
        drawing.add(Rect(px(qx), py(qy), plot_w / 2, plot_h / 2,
                         fillColor=colors.HexColor(QUADRANT_COLORS[key]), fillOpacity=0.08, strokeColor=None))
        drawing.add(String(px(qx) + 6, py(qy) + plot_h / 2 - 14, QUADRANT_LABELS[key],
                           fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor(QUADRANT_COLORS[key])))
    drawing.add(Rect(pad, pad, plot_w, plot_h, fillColor=None, strokeColor=colors.HexColor("#9ca3af")))
    drawing.add(Line(px(50), pad, px(50), pad + plot_h, strokeColor=colors.HexColor("#d1d5db"), strokeDashArray=[3, 3]))
    drawing.add(Line(pad, py(50), pad + plot_w, py(50), strokeColor=colors.HexColor("#d1d5db"), strokeDashArray=[3, 3]))
    drawing.add(String(pad + plot_w / 2, 12, f"{x_label} →", textAnchor="middle", fontName="Helvetica", fontSize=9))
    y_axis = Group(String(0, 0, f"{y_label} →", textAnchor="middle", fontName="Helvetica", fontSize=9))
    y_axis.translate(16, pad + plot_h / 2)
    y_axis.rotate(90)
    drawing.add(y_axis)

    for r in results:
        if r["x"] is None or r["y"] is None:
            continue
        color = colors.HexColor(QUADRANT_COLORS.get(r["quadrant"], brand))
        drawing.add(Circle(px(r["x"]), py(r["y"]), 7, fillColor=color, strokeColor=colors.white))
        if r["rank"]:
            drawing.add(String(px(r["x"]), py(r["y"]) - 3, str(r["rank"]), textAnchor="middle",
                               fontName="Helvetica-Bold", fontSize=7, fillColor=colors.white))
    return drawing


def build_pdf(workshop: Workshop, results: List[dict], brand_name: str, brand_color: str) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    brand = colors.HexColor(brand_color)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Title"], textColor=brand, alignment=0, fontSize=22, spaceAfter=4)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=brand, spaceBefore=12, spaceAfter=6)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=9.5, leading=13)
    small = ParagraphStyle("small", parent=body, fontSize=8, leading=10, textColor=colors.HexColor("#4b5563"))
    cell = ParagraphStyle("cell", parent=body, fontSize=8.5, leading=11)

    x_label, y_label = axis_labels(workshop.config)
    scored = [r for r in results if r["vote_count"]]
    by_quadrant: Dict[str, List[dict]] = {k: [r for r in scored if r["quadrant"] == k] for k in QUADRANT_LABELS}
    needs_discussion = [r for r in scored if r["consensus_level"] == "needs_discussion"]
    criteria = (workshop.config or {}).get("criteria", [])

    story = [
        Paragraph(escape(workshop.title), h1),
        Paragraph(f"Prioritization results · {datetime.now().strftime('%d %B %Y')} · {escape(brand_name)}", small),
        Spacer(1, 6 * mm),
    ]

    stats = Table(
        [[str(len(results)), str(len(scored)), str(len(by_quadrant["quick_wins"])), str(len(needs_discussion))],
         ["Use cases", "Scored", "Quick wins", "Need discussion"]],
        colWidths=[42 * mm] * 4,
    )
    stats.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 18),
        ("TEXTCOLOR", (0, 0), (-1, 0), brand),
        ("FONT", (0, 1), (-1, 1), "Helvetica", 8),
        ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#6b7280")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [stats]

    if scored:
        top = scored[:3]
        story += [Paragraph("Top use cases", h2)]
        story += [Paragraph(
            "; ".join(f"<b>#{r['rank']}</b> {escape(r['title'])} ({r['normalized_score']:.0f}/100)" for r in top), body)]

    story += [Paragraph("Prioritization matrix", h2),
              Paragraph(f"Horizontal: <b>{escape(x_label)}</b> · Vertical: <b>{escape(y_label)}</b>. "
                        "Numbers on the dots are ranks.", small),
              Spacer(1, 2 * mm),
              _matrix_drawing(results, x_label, y_label, brand_color)]

    # Ranked table
    rows = [["Rank", "Use case", "Quadrant", "Score\n/100", "Consensus", "Scores"]]
    for r in results:
        rank = (f"{r['rank']}=" if r["tied"] else str(r["rank"])) if r["rank"] else "–"
        consensus = CONSENSUS_LABELS.get(r["consensus_level"], "Not enough scores") if r["vote_count"] else "Not scored"
        rows.append([
            rank,
            Paragraph(escape(r["title"]), cell),
            QUADRANT_LABELS.get(r["quadrant"], "–"),
            f"{r['normalized_score']:.0f}" if r["vote_count"] else "–",
            consensus,
            str(r["vote_count"]),
        ])
    table = Table(rows, colWidths=[13 * mm, 70 * mm, 28 * mm, 15 * mm, 32 * mm, 14 * mm], repeatRows=1)
    style = [
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("FONT", (0, 1), (-1, -1), "Helvetica", 8.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (3, 0), (3, -1), "CENTER"),
        ("ALIGN", (5, 0), (5, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
    ]
    for i, r in enumerate(results, start=1):
        if r["consensus_level"]:
            style.append(("TEXTCOLOR", (4, i), (4, i), colors.HexColor(CONSENSUS_COLORS[r["consensus_level"]])))
        if r["quadrant"]:
            style.append(("TEXTCOLOR", (2, i), (2, i), colors.HexColor(QUADRANT_COLORS[r["quadrant"]])))
    table.setStyle(TableStyle(style))
    story += [Paragraph("All use cases, ranked", h2), table]

    # Quadrant breakdown
    for index, (key, label) in enumerate(QUADRANT_LABELS.items()):
        items = by_quadrant[key]
        text = ", ".join(f"#{r['rank']} {escape(r['title'])}" for r in items) or "None"
        block = [
            Paragraph(f"<font color='{QUADRANT_COLORS[key]}'><b>{label}</b></font> ({len(items)}) — {QUADRANT_DESCRIPTIONS[key]}", body),
            Paragraph(text, small),
            Spacer(1, 2 * mm),
        ]
        # Keep the section heading with its first block (no orphaned heading).
        story.append(KeepTogether(([Paragraph("By quadrant", h2)] if index == 0 else []) + block))

    if needs_discussion:
        story += [Paragraph("Needs discussion", h2),
                  Paragraph("Participants scored these very differently — worth a follow-up conversation:", body),
                  Paragraph(", ".join(f"{escape(r['title'])} (agreement {r['agreement']:.0f}%)" for r in needs_discussion), small)]

    if criteria:
        crit_rows = [["Criterion", "Weight"]] + [[Paragraph(escape(c.get("name", "")), cell), f"{c.get('weight', 0)}%"] for c in criteria]
        crit = Table(crit_rows, colWidths=[120 * mm, 25 * mm])
        crit.setStyle(TableStyle([
            ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.5),
            ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ]))
        story += [Paragraph("Scoring criteria", h2), crit,
                  Paragraph("Scores are weighted averages shown on a 0–100 scale. Consensus reflects how closely "
                            "participants agreed (High ≥ 70%, Moderate ≥ 40%).", small)]

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#6b7280"))
        canvas.drawString(18 * mm, 10 * mm, f"{brand_name} · {workshop.title}"[:110])
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
        canvas.restoreState()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=18 * mm, title=f"{workshop.title} — Results",
                            author=brand_name)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()


@router.get("/workshop/{workshop_id}/pdf")
async def export_workshop_pdf(
    workshop_id: str,
    company_name: Optional[str] = Query(None, max_length=100),
    primary_color: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ranked results as a PDF report (summary, matrix, ranked table, quadrants)."""
    workshop = await _load_workshop(db, workshop_id, current_user)
    results = await compute_workshop_results(db, workshop)
    color = primary_color if primary_color and _HEX_COLOR.match(primary_color) else "#7c3aed"
    pdf = build_pdf(workshop, results, company_name or "Qbrain AI Labs", color)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_safe_filename(workshop.title, "pdf")}"'},
    )
