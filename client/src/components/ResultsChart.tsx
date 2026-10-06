import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { toast } from 'sonner';
import { QUADRANT_COLORS, QUADRANT_LABELS, quadrantFor } from '../lib/results';

interface ResultsChartProps {
    data: any[];
    showLabels?: boolean;
    activeQuadrant?: string | null;
    highlightQuadrant?: string | null;
    readOnly?: boolean;
    xAxisLabel?: string;
    yAxisLabel?: string;
}

import { useTheme } from '../context/ThemeContext';

export function ResultsChart({
    data,
    showLabels = false,
    activeQuadrant,
    highlightQuadrant,
    readOnly = false,
    xAxisLabel = "Feasibility (Easy -> Hard)",
    yAxisLabel = "Business Value (Low -> High)"
}: ResultsChartProps) {
    const { theme } = useTheme();
    const svgRef = useRef<SVGSVGElement>(null);
    // Local state to track overrides without mutating props immediately
    const [localData, setLocalData] = useState<any[]>(data);

    useEffect(() => {
        setLocalData(data);
    }, [data]);

    useEffect(() => {
        if (!svgRef.current) return;

        // Clear previous render
        d3.select(svgRef.current).selectAll("*").remove();

        const margin = { top: 40, right: 40, bottom: 60, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales - force 0-100 scale since we've standardized the mapping
        const domainMax = 100;
        const axisMid = 50;

        const x = d3.scaleLinear()
            .domain([0, domainMax])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, domainMax])
            .range([height, 0]);

        // Helper to get scaled value
        const getScaledX = (d: any) => {
            if (d.x !== undefined && d.x !== null) return d.x;
            const score = d.scores?.['Feasibility'] ?? d.scores?.['Ease of Implementation'] ?? axisMid / 10;
            return score <= 10 ? score * 10 : score;
        };

        const getScaledY = (d: any) => {
            if (d.y !== undefined && d.y !== null) return d.y;
            const score = d.scores?.['Business Value'] ?? d.scores?.['Impact'] ?? axisMid / 10;
            return score <= 10 ? score * 10 : score;
        };

        // Quadrant Backgrounds
        const quadrants = [
            {
                id: 'top-right',
                x: x(axisMid), y: 0,
                width: x(domainMax) - x(axisMid), height: y(axisMid),
                color: "#10b981", // Green
                label: QUADRANT_LABELS.quick_wins,
                labelX: width - 20, labelY: 20, anchor: "end", labelColor: "#10b981"
            },
            {
                id: 'top-left',
                x: 0, y: 0,
                width: x(axisMid), height: y(axisMid),
                color: "#a78bfa", // Purple
                label: QUADRANT_LABELS.strategic_bets,
                labelX: 20, labelY: 20, anchor: "start", labelColor: "#a78bfa"
            },
            {
                id: 'bottom-left',
                x: 0, y: y(axisMid),
                width: x(axisMid), height: height - y(axisMid),
                color: "#ef4444", // Red
                label: QUADRANT_LABELS.dont_do,
                labelX: 20, labelY: height - 20, anchor: "start", labelColor: "#ef4444"
            },
            {
                id: 'bottom-right',
                x: x(axisMid), y: y(axisMid),
                width: x(domainMax) - x(axisMid), height: height - y(axisMid),
                color: "#3b82f6", // Blue
                label: QUADRANT_LABELS.nice_to_have,
                labelX: width - 20, labelY: height - 20, anchor: "end", labelColor: "#3b82f6"
            }
        ];

        quadrants.forEach(q => {
            const isActive = activeQuadrant === q.id;
            const isHighlighted = highlightQuadrant === q.id;
            const isGlowing = isActive || isHighlighted;

            // Background rect
            svg.append("rect")
                .attr("x", q.x)
                .attr("y", q.y)
                .attr("width", q.width)
                .attr("height", q.height)
                .attr("fill", q.color)
                .attr("opacity", isGlowing ? 0.2 : 0.05)
                .attr("class", isGlowing ? "quadrant-glow" : "")
                .style("transition", "opacity 0.3s ease");

            // Add a glowing border/stroke if active
            if (isGlowing) {
                svg.append("rect")
                    .attr("x", q.x + 2)
                    .attr("y", q.y + 2)
                    .attr("width", q.width - 4)
                    .attr("height", q.height - 4)
                    .attr("fill", "none")
                    .attr("stroke", q.color)
                    .attr("stroke-width", 2)
                    .attr("opacity", 0.5)
                    .style("filter", "drop-shadow(0 0 4px " + q.color + ")");
            }

            // Label
            svg.append("text")
                .attr("x", q.labelX)
                .attr("y", q.labelY)
                .attr("text-anchor", q.anchor)
                .style("fill", q.labelColor)
                .style("opacity", isGlowing ? 1 : 0.5)
                .style("font-weight", "bold")
                .style("text-shadow", isGlowing ? `0 0 10px ${q.color}` : "none")
                .text(q.label);
        });

        // Axes
        const axisColor = theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
        const textColor = theme === 'light' ? '#64748b' : '#94a3b8';

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSize(-height).tickFormat(() => ""))
            .attr("color", axisColor)
            .select(".domain").remove();

        svg.append("g")
            .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""))
            .attr("color", axisColor)
            .select(".domain").remove();

        // Axis Labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .style("text-anchor", "middle")
            .style("fill", textColor)
            .style("font-size", "12px")
            .text(xAxisLabel);

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .style("text-anchor", "middle")
            .style("fill", textColor)
            .style("font-size", "12px")
            .text(yAxisLabel);

        // Tooltip container
        const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", theme === 'light' ? 'rgba(255,255,255,0.95)' : '#1e1b4b')
            .style("border", theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.2)')
            .style("padding", "10px")
            .style("border-radius", "8px")
            .style("pointer-events", "none")
            .style("z-index", "50")
            .style("color", theme === 'light' ? '#0f172a' : 'white')
            .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)");

        // Drag Handler
        const drag = d3.drag<SVGCircleElement, any>()
            .on("start", function () {
                d3.select(this).raise().attr("stroke", theme === 'light' ? '#000' : 'white');
                // Store initial position for smooth dragging
                (this as any).__initialX = d3.select(this).attr("cx");
                (this as any).__initialY = d3.select(this).attr("cy");
            })
            .on("drag", function (event, d) {
                // Get coordinates relative to the SVG group (accounting for transform)
                const [xPos, yPos] = d3.pointer(event, svg.node() as any);

                // Constrain to bounds within the plot area
                const constrainedX = Math.max(0, Math.min(width, xPos));
                const constrainedY = Math.max(0, Math.min(height, yPos));

                d3.select(this)
                    .attr("cx", constrainedX)
                    .attr("cy", constrainedY);

                // Update label position if it exists
                const label = d3.select(this.parentNode as any).select(`text.label[data-id="${d.id}"]`);
                if (!label.empty()) {
                    label
                        .attr("x", constrainedX)
                        .attr("y", constrainedY - 15);
                }

                // Update tooltip position if visible
                tooltip.style("top", (event.sourceEvent.pageY - 10) + "px")
                    .style("left", (event.sourceEvent.pageX + 10) + "px");
            })
            .on("end", function (event, d) {
                d3.select(this).attr("stroke", d.variance > 15 ? (theme === 'light' ? '#000' : '#ffffff') : "none"); // Restore border style

                // Get final coordinates relative to the SVG group
                const [xPos, yPos] = d3.pointer(event, svg.node() as any);

                // Check if dropped outside bounds (Drag to Remove)
                // If dragged significantly outside the box (> 50px), consider it a removal
                if (xPos < -50 || xPos > width + 50 || yPos < -50 || yPos > height + 50) {
                    const removeEvent = new CustomEvent('matrix:position_removed', {
                        detail: {
                            id: d.id,
                            title: d.title
                        },
                        bubbles: true
                    });
                    svgRef.current?.dispatchEvent(removeEvent);

                    // Animate disappearance
                    d3.select(this)
                        .transition()
                        .duration(300)
                        .attr("r", 0)
                        .style("opacity", 0)
                        .remove();

                    return;
                }

                const finalX = Math.max(0, Math.min(width, xPos));
                const finalY = Math.max(0, Math.min(height, yPos));

                // Convert back to domain coordinates
                const domainX = x.invert(finalX);
                const domainY = y.invert(finalY);

                // Emit custom event to notify parent component
                const customEvent = new CustomEvent('matrix:position_changed', {
                    detail: {
                        id: d.id,
                        x: domainX,
                        y: domainY,
                        scores: {
                            'Feasibility': domainX,
                            'Business Value': domainY
                        }
                    },
                    bubbles: true
                });
                svgRef.current?.dispatchEvent(customEvent);

                toast.success(`Position updated: ${xAxisLabel} ${Math.round(domainX)}, ${yAxisLabel} ${Math.round(domainY)}`);
            });

        // Nodes - only render if there's data
        if (localData.length > 0) {
            svg.selectAll("circle")
                .data(localData)
                .enter()
                .append("circle")
                .attr("cx", d => x(getScaledX(d)))
                .attr("cy", d => y(getScaledY(d)))
                .attr("r", d => 8 + (d.vote_count || 1) * 1.5) // Size by votes
                .attr("fill", d => {
                    // Use participant color if available (for individual view)
                    if (d.participantColor) return d.participantColor;

                    // Same quadrant split (>= 50) as results cards, analytics and exports
                    return QUADRANT_COLORS[quadrantFor(getScaledX(d), getScaledY(d))!];
                })
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", (d: any) => d.variance > 10 ? "3,3" : "0")
                .style("cursor", readOnly ? "default" : "grab")
                .on("mouseover", function (_, d) {
                    const feasValue = getScaledX(d);
                    const valueScore = getScaledY(d);
                    tooltip.style("visibility", "visible")
                        .html(`
                        <div class="font-bold mb-1">${d.title}</div>
                        ${d.participant_name ? `<div class="text-xs font-semibold mb-1" style="color:${d.participantColor}">${d.participant_name}</div>` : ''}
                        <div class="text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'} space-y-0.5">
                            <div><strong>Position:</strong> ${xAxisLabel}: ${Math.round(feasValue)}, ${yAxisLabel}: ${Math.round(valueScore)}</div>
                            ${d.variance !== undefined ? `<div>Variance: ${d.variance}</div>` : ''}
                            ${d.vote_count ? `<div>Votes: ${d.vote_count}</div>` : ''}
                        </div>
                        ${d.scores && Object.keys(d.scores).length > 0 ? `<div class="text-[10px] ${theme === 'light' ? 'text-gray-500 border-gray-200' : 'text-gray-400 border-white/10'} mt-2 pt-2 border-t">
                            <div class="font-semibold mb-1">Scores:</div>
                            ${Object.entries(d.scores).map(([k, v]) => `<div>${k}: ${Math.round(Number(v))}</div>`).join('')}
                        </div>` : ''}
                    `);
                })
                .on("mousemove", function (event) {
                    tooltip.style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function () {
                    tooltip.style("visibility", "hidden");
                });

            if (!readOnly) {
                svg.selectAll<SVGCircleElement, any>("circle").call(drag);
            }
        }

        // Add labels if enabled (or if individual participant data is present)
        const hasParticipantData = localData.some(d => d.participant_name);
        if ((showLabels || hasParticipantData) && localData.length > 0) {
            const labels = svg.selectAll("text.label")
                .data(localData, (d: any) => d.id || d.title); // Use key function for proper updates

            // Remove old labels
            labels.exit().remove();

            // Add new labels
            const labelsEnter = labels.enter()
                .append("text")
                .attr("class", "label")
                .attr("data-id", (d: any) => d.id || d.title);

            labelsEnter.merge(labels as any)
                .attr("x", d => x(d.x ?? d.scores['Feasibility'] ?? axisMid))
                .attr("y", d => y(d.y ?? d.scores['Business Value'] ?? axisMid) - 15) // Position above the circle
                .attr("text-anchor", "middle")
                .attr("font-size", d => d.participant_name ? "9px" : "10px") // Smaller font for names
                .attr("font-weight", "500")
                .attr("fill", theme === 'light' ? '#0f172a' : "#ffffff")
                .attr("stroke", theme === 'light' ? 'white' : "#1e1b4b")
                .attr("stroke-width", "3px")
                .attr("paint-order", "stroke")
                .style("pointer-events", "none")
                .text(d => {
                    // If showing individual participant positions, show their name
                    if (d.participant_name) {
                        return d.participant_name.length > 10
                            ? d.participant_name.substring(0, 8) + '...'
                            : d.participant_name;
                    }
                    // Otherwise show use case title
                    const title = d.title || 'Untitled';
                    return title.length > 15 ? title.substring(0, 12) + '...' : title;
                });
        }

        return () => {
            tooltip.remove();
        };

    }, [localData, showLabels, theme]);

    return (
        <div className="w-full flex justify-center theme-bg-secondary rounded-2xl border theme-border p-4 overflow-hidden">
            <svg ref={svgRef} className="overflow-visible"></svg>
        </div>
    );
}
