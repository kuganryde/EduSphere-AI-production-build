import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function GestureBreakdown() {
  const data = [
    { name: 'Writing', value: 40, color: '#10b981' }, // green
    { name: 'Hands Raised', value: 14, color: '#3b82f6' }, // blue
    { name: 'Using Phone', value: 10, color: '#ef4444' }, // red
    { name: 'Heads Down', value: 6, color: '#eab308' }, // yellow
    { name: 'Board', value: 30, color: '#8b5cf6' }, // purple
  ];

  return (
    <div className="bg-[#121b2f] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col h-full min-h-[300px] shadow-sm w-full">
      <h3 className="text-base font-semibold text-white mb-2">Gesture Breakdown</h3>
      <div className="flex-1 min-h-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={data} 
              dataKey="value" 
              nameKey="name" 
              cx="50%" 
              cy="50%" 
              innerRadius={60}
              outerRadius={90}
              stroke="#121b2f"
              strokeWidth={3}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0b1120', border: '1px solid #ffffff20', borderRadius: '8px', padding: '8px 12px' }}
              itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}
              formatter={(value: number) => [`${value}%`, '']}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <button className="w-full mt-4 py-3 bg-[#1e293b] hover:bg-[#334155] rounded-xl text-[11px] font-semibold tracking-wider uppercase border border-white/5 transition-colors text-white shrink-0 shadow-sm">
        View Diagnostic Report
      </button>
    </div>
  );
}
