import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { toast } from 'sonner';

interface ResultsChartProps {
    data: any[];
}

export function ResultsChart({ data }: ResultsChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    // Local state to track overrides without mutating props immediately
    const [localData, setLocalData] = useState<any[]>(data);

    useEffect(() => {
        setLocalData(data);
    }, [data]);

    useEffect(() => {
        if (!svgRef.current || !localData.length) return;

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
        // Determine scale based on data range
        const xValues = localData.map(d => d.x ?? d.scores['Feasibility'] ?? 0);
        const yValues = localData.map(d => d.y ?? d.scores['Business Value'] ?? 0);
        const maxVal = Math.max(
            ...xValues,
            ...yValues,
            10 // Ensure at least 10
        );
        const domainMax = maxVal > 10 ? 100 : 10;
        const axisMid = domainMax / 2;

        const x = d3.scaleLinear()
            .domain([0, domainMax])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, domainMax])
            .range([height, 0]);

        // Quadrant Backgrounds
        // Top Right (Quick Wins) - x>50, y>50
        svg.append("rect")
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
            .on("start", function () {
                d3.select(this).raise().attr("stroke", "white");
            })
            .on("drag", function (event, _) {
                // Constrain to bounds
                let newX = Math.max(0, Math.min(width, event.x));
                let newY = Math.max(0, Math.min(height, event.y));

                d3.select(this)
                    .attr("cx", newX)
                    .attr("cy", newY);

                // Update tooltip position if visible
                tooltip.style("top", (event.sourceEvent.pageY - 10) + "px")
                    .style("left", (event.sourceEvent.pageX + 10) + "px");
            })
            .on("end", function (event, d) {
                d3.select(this).attr("stroke", d.variance > 15 ? "#ffffff" : "none"); // Restore border style
                const finalX = Math.max(0, Math.min(width, event.x));
                const finalY = Math.max(0, Math.min(height, event.y));

                // Convert back to domain
                const domainX = x.invert(finalX);
                const domainY = y.invert(finalY);

                toast.success(`Position overridden: F:${Math.round(domainX)}, V:${Math.round(domainY)}`);
                // Ideally propagate this up
            });

        // Nodes
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
                return (valX > axisMid && valY > axisMid) ? '#10b981' : '#a78bfa';
            })
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", d => d.variance > 10 ? "3,3" : "0") // Dotted if high variance (threshold 10 is arbitrary)
            .style("cursor", "grab")
            .on("mouseover", function (_, d) {
                tooltip.style("visibility", "visible")
                    .html(`
                        <div class="font-bold">${d.title}</div>
                        <div class="text-xs text-gray-300">
                            F: ${d.x ?? d.scores['Feasibility'] ?? '?'} | V: ${d.y ?? d.scores['Business Value'] ?? '?'}<br/>
                            Variance: ${d.variance}
                        </div>
                        ${d.x ? `<div class="text-[10px] text-gray-400 mt-1 border-t border-white/10 pt-1">
                            ${Object.entries(d.scores).map(([k, v]) => `${k}: ${v}`).join('<br/>')}
                        </div>` : ''}
                        </div>
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

        return () => {
            tooltip.remove();
        };

    }, [localData]);

    return (
        <div className="w-full flex justify-center bg-surface-800/30 rounded-2xl border border-white/5 p-4 overflow-hidden">
            <svg ref={svgRef} className="overflow-visible"></svg>
        </div>
    );
}
