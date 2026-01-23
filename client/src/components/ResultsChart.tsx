import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface ResultsChartProps {
    data: any[];
}

export function ResultsChart({ data }: ResultsChartProps) {
    // Transform data for chart
    const chartData = data.map(d => ({
        x: d.scores['Feasibility'] || 0,
        y: d.scores['Business Value'] || 0,
        z: d.vote_count || 1,
        title: d.title,
        id: d.id,
        category: d.category
    }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-surface-900 border border-white/20 p-4 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="font-bold text-white mb-2">{data.title}</p>
                    <div className="text-xs text-gray-300 space-y-1">
                        <p>Feasibility: <span className="font-mono text-brand-violet">{data.x}</span></p>
                        <p>Value: <span className="font-mono text-brand-magenta">{data.y}</span></p>
                        <p className="text-gray-500 mt-2">{data.category}</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-[600px] w-full bg-surface-800/30 rounded-2xl border border-white/5 p-6 relative">
            {/* Quadrant Labels */}
            <div className="absolute top-4 right-4 text-semantic-success font-bold opacity-30">Quick Wins</div>
            <div className="absolute top-4 left-4 text-semantic-warning font-bold opacity-30">Strategic Bets</div>
            <div className="absolute bottom-4 left-4 text-semantic-danger font-bold opacity-30">Don't Do</div>
            <div className="absolute bottom-4 right-4 text-blue-400 font-bold opacity-30">Nice to Have</div>

            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis
                        type="number"
                        dataKey="x"
                        name="Feasibility"
                        domain={[0, 100]}
                        stroke="#9ca3af"
                        label={{ value: 'Feasibility (Easy -> Hard)', position: 'bottom', fill: '#9ca3af', dy: 10 }}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        name="Value"
                        domain={[0, 100]}
                        stroke="#9ca3af"
                        label={{ value: 'Business Value (Low -> High)', angle: -90, position: 'left', fill: '#9ca3af', dx: -10 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                    <ReferenceLine x={50} stroke="#ffffff40" strokeDasharray="5 5" />
                    <ReferenceLine y={50} stroke="#ffffff40" strokeDasharray="5 5" />

                    <Scatter name="Use Cases" data={chartData} fill="#8884d8">
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.y > 50 && entry.x > 50 ? '#10b981' : '#a78bfa'} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
