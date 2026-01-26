import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { toast } from 'sonner';

interface ResultsChartProps {
    data: any[];
    showLabels?: boolean;
}

export function ResultsChart({ data, showLabels = false }: ResultsChartProps) {
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

        // Scales
        // Determine scale based on data range, default to 100 if no data
        const xValues = localData.length > 0 ? localData.map(d => d.x ?? d.scores?.['Feasibility'] ?? 0) : [];
        const yValues = localData.length > 0 ? localData.map(d => d.y ?? d.scores?.['Business Value'] ?? 0) : [];
        const maxVal = localData.length > 0 ? Math.max(
            ...xValues,
            ...yValues,
            10 // Ensure at least 10
        ) : 100;
        const domainMax = maxVal > 10 ? 100 : 10;
        const axisMid = domainMax / 2;

        const x = d3.scaleLinear()
            .domain([0, domainMax])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, domainMax])
            .range([height, 0]);

        // Quadrant Backgrounds
        // Top Right (Quick Wins) - x>mid, y>mid
        svg.append("rect")
            .attr("x", x(axisMid))
            .attr("y", 0)
            .attr("width", x(domainMax) - x(axisMid))
            .attr("height", y(axisMid))
            .attr("fill", "#10b981")
            .attr("opacity", 0.05);

        // Top Left (Strategic) - x<mid, y>mid
        svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", x(axisMid))
            .attr("height", y(axisMid))
            .attr("fill", "#a78bfa") // brand-violet
            .attr("opacity", 0.05);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSize(-height).tickFormat(() => ""))
            .attr("color", "#ffffff20")
            .select(".domain").remove();

        svg.append("g")
            .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""))
            .attr("color", "#ffffff20")
            .select(".domain").remove();

        // Axis Labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .style("text-anchor", "middle")
            .style("fill", "#9ca3af")
            .style("font-size", "12px")
            .text("Feasibility (Easy -> Hard)"); // Note: Typically Right is Easy in these matrices?
        // If 0 is Hard and 100 is Easy.

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .style("text-anchor", "middle")
            .style("fill", "#9ca3af")
            .style("font-size", "12px")
            .text("Business Value (Low -> High)");

        // Quadrant Labels
        svg.append("text").attr("x", width - 20).attr("y", 20).attr("text-anchor", "end").style("fill", "#10b981").style("opacity", 0.5).style("font-weight", "bold").text("Quick Wins");
        svg.append("text").attr("x", 20).attr("y", 20).attr("text-anchor", "start").style("fill", "#a78bfa").style("opacity", 0.5).style("font-weight", "bold").text("Strategic Bets");
        svg.append("text").attr("x", 20).attr("y", height - 20).attr("text-anchor", "start").style("fill", "#ef4444").style("opacity", 0.5).style("font-weight", "bold").text("Don't Do");
        svg.append("text").attr("x", width - 20).attr("y", height - 20).attr("text-anchor", "end").style("fill", "#3b82f6").style("opacity", 0.5).style("font-weight", "bold").text("Nice to Have");

        // Tooltip container
        const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "#1e1b4b")
            .style("border", "1px solid rgba(255,255,255,0.2)")
            .style("padding", "10px")
            .style("border-radius", "8px")
            .style("pointer-events", "none")
            .style("z-index", "50")
            .style("color", "white");

        // Drag Handler
        const drag = d3.drag<SVGCircleElement, any>()
            .on("start", function (event, d) {
                d3.select(this).raise().attr("stroke", "white");
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
                d3.select(this).attr("stroke", d.variance > 15 ? "#ffffff" : "none"); // Restore border style
                
                // Get final coordinates relative to the SVG group
                const [xPos, yPos] = d3.pointer(event, svg.node() as any);
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
                    }
                });
                svgRef.current?.dispatchEvent(customEvent);

                toast.success(`Position updated: F:${Math.round(domainX)}, V:${Math.round(domainY)}`);
            });

        // Nodes - only render if there's data
        if (localData.length > 0) {
            svg.selectAll("circle")
                .data(localData)
                .enter()
                .append("circle")
            .attr("cx", d => x(d.x ?? d.scores['Feasibility'] ?? axisMid))
            .attr("cy", d => y(d.y ?? d.scores['Business Value'] ?? axisMid))
            .attr("r", d => 8 + (d.vote_count || 1) * 1.5) // Size by votes
            .attr("fill", d => {
                const valX = d.x ?? d.scores['Feasibility'] ?? 0;
                const valY = d.y ?? d.scores['Business Value'] ?? 0;
                // Color by quadrant
                if (valX > axisMid && valY > axisMid) {
                    return '#10b981'; // Quick Wins - Green (Top Right)
                } else if (valX <= axisMid && valY > axisMid) {
                    return '#a78bfa'; // Strategic Bets - Purple (Top Left)
                } else if (valX <= axisMid && valY <= axisMid) {
                    return '#ef4444'; // Don't Do - Red (Bottom Left)
                } else {
                    return '#3b82f6'; // Nice to Have - Blue (Bottom Right)
                }
            })
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", d => d.variance > 10 ? "3,3" : "0") // Dotted if high variance (threshold 10 is arbitrary)
            .style("cursor", "grab")
            .on("mouseover", function (_, d) {
                const feasValue = d.x ?? d.scores?.['Feasibility'] ?? 0;
                const valueScore = d.y ?? d.scores?.['Business Value'] ?? 0;
                tooltip.style("visibility", "visible")
                    .html(`
                        <div class="font-bold mb-1">${d.title}</div>
                        <div class="text-xs text-gray-300 space-y-0.5">
                            <div><strong>Position:</strong> Feasibility: ${Math.round(feasValue)}, Business Value: ${Math.round(valueScore)}</div>
                            ${d.variance !== undefined ? `<div>Variance: ${d.variance}</div>` : ''}
                            ${d.vote_count ? `<div>Votes: ${d.vote_count}</div>` : ''}
                        </div>
                        ${d.scores && Object.keys(d.scores).length > 0 ? `<div class="text-[10px] text-gray-400 mt-2 pt-2 border-t border-white/10">
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
            })
            .call(drag);
        }

        // Add labels if enabled
        if (showLabels && localData.length > 0) {
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
                .attr("font-size", "10px")
                .attr("font-weight", "500")
                .attr("fill", "#ffffff")
                .attr("stroke", "#1e1b4b")
                .attr("stroke-width", "0.3px")
                .attr("paint-order", "stroke")
                .style("pointer-events", "none")
                .text(d => {
                    // Truncate long titles
                    const title = d.title || 'Untitled';
                    return title.length > 15 ? title.substring(0, 12) + '...' : title;
                });
        }

        return () => {
            tooltip.remove();
        };

    }, [localData, showLabels]);

    return (
        <div className="w-full flex justify-center bg-surface-800/30 rounded-2xl border border-white/5 p-4 overflow-hidden">
            <svg ref={svgRef} className="overflow-visible"></svg>
        </div>
    );
}
