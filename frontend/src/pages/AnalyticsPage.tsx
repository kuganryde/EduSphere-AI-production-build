import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { getAuthHeader } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface TrendDay { date: string; averageEngagement: number }
interface RoomSummary { roomId: string; name: string; status: string; engagement: number; headcount: number; capacity: number }

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = getAuthHeader();
    Promise.all([
      fetch(`${API_URL}/analytics/trends`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/analytics/rooms/summary`, { headers: h }).then(r => r.json()),
    ]).then(([t, r]) => {
      setTrends(t.days ?? []);
      setRooms(Array.isArray(r) ? r : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const avgEngagement = trends.length
    ? Math.round(trends.reduce((s, d) => s + d.averageEngagement, 0) / trends.length) : 0;
  const activeRooms = rooms.filter(r => r.status === 'active').length;

  return (
    <div className="flex flex-col min-h-full bg-[#0b1120] p-4 md:p-6 gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Detailed Analytics</h1>
        <p className="text-gray-500 text-sm">7-day engagement trends and room performance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Engagement (7d)', value: `${avgEngagement}%`, color: 'text-blue-400' },
          { label: 'Active Rooms', value: activeRooms, color: 'text-green-400' },
          { label: 'Total Rooms', value: rooms.length, color: 'text-white' },
          { label: 'Data Points', value: trends.length, color: 'text-purple-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#121b2f] border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* 7-day engagement trend */}
      <div className="bg-[#121b2f] border border-white/5 rounded-2xl p-5 md:p-6">
        <h2 className="text-base font-semibold text-white mb-4">7-Day Engagement Trend</h2>
        {trends.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-600 text-sm font-mono uppercase tracking-widest">
            No trend data yet — start a session to generate data
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1120', border: '1px solid #ffffff20', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                  formatter={(v: number) => [`${v}%`, 'Avg Engagement']}
                />
                <Area type="monotone" dataKey="averageEngagement" stroke="#3b82f6" strokeWidth={2} fill="url(#engGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Room performance bar chart */}
      {rooms.length > 0 && (
        <div className="bg-[#121b2f] border border-white/5 rounded-2xl p-5 md:p-6">
          <h2 className="text-base font-semibold text-white mb-4">Room Engagement Snapshot</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rooms} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1120', border: '1px solid #ffffff20', borderRadius: '8px' }}
                  formatter={(v: number) => [`${v}%`, 'Engagement']}
                />
                <Bar dataKey="engagement" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Room status table */}
      <div className="bg-[#121b2f] border border-white/5 rounded-2xl p-5 md:p-6">
        <h2 className="text-base font-semibold text-white mb-4">Room Status</h2>
        {rooms.length === 0 ? (
          <p className="text-gray-600 text-sm font-mono uppercase tracking-widest">No rooms configured</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/5">
                  <th className="text-left pb-3 pr-4">Room</th>
                  <th className="text-left pb-3 pr-4">Status</th>
                  <th className="text-left pb-3 pr-4">Engagement</th>
                  <th className="text-left pb-3 pr-4">Headcount</th>
                  <th className="text-left pb-3">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.roomId} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-4 text-white font-medium">{room.name}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${room.status === 'active' ? 'bg-green-900/40 text-green-400 border border-green-500/30' : 'bg-gray-800 text-gray-500'}`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`font-bold ${room.engagement > 79 ? 'text-green-400' : room.engagement > 49 ? 'text-amber-400' : room.engagement > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                        {room.engagement > 0 ? `${room.engagement}%` : '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-300">{room.headcount || '—'}</td>
                    <td className="py-3 text-gray-500">{room.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
