import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function GestureBreakdown() {
  const data = [
    { name: 'Writing Notes', value: 40, color: '#10b981' }, // green
    { name: 'Hands Raised', value: 14, color: '#3b82f6' }, // blue
    { name: 'Using Phone', value: 10, color: '#ef4444' }, // red
    { name: 'Heads Down', value: 6, color: '#eab308' }, // yellow
    { name: 'Looking at Board', value: 30, color: '#8b5cf6' }, // purple
  ];

  return (
    <div className="bg-[#121b2f] border border-white/5 p-5 rounded-2xl flex flex-col h-[280px]">
      <h3 className="text-sm font-semibold text-white mb-4">Gesture Breakdown</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={data} 
              dataKey="value" 
              nameKey="name" 
              cx="50%" 
              cy="50%" 
              innerRadius={50}
              outerRadius={80}
              stroke="#121b2f"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0b1120', border: '1px solid #ffffff20', borderRadius: '8px' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <button className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-medium border border-white/10 transition-colors text-white shrink-0">
        View Full Diagnostic Report
      </button>
    </div>
  );
}
