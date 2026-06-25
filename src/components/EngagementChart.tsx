import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

const data = [
  { time: '10:00', focus: 60, attention: 55 },
  { time: '10:05', focus: 75, attention: 70 },
  { time: '10:10', focus: 85, attention: 82 },
  { time: '10:15', focus: 80, attention: 78 },
  { time: '10:20', focus: 90, attention: 88 },
  { time: '10:25', focus: 88, attention: 85 },
  { time: '10:30', focus: 84, attention: 80 },
];

export default function EngagementChart() {
  return (
    <div className="flex-1 bg-[#121b2f] border border-white/5 p-5 rounded-2xl flex flex-col h-64">
      <h3 className="text-sm font-semibold text-white mb-4 flex justify-between items-center">
        Engagement Timeline
        <span className="text-[10px] font-mono text-gray-500">SESSION: 45:12</span>
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="time" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0b1120', border: '1px solid #ffffff20', borderRadius: '8px' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="focus" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorFocus)" />
            <Line type="monotone" dataKey="attention" stroke="#10b981" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
