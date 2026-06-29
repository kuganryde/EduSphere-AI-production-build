import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar,
} from 'recharts';
import { getAuthHeader } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface TrendDay { date: string; averageEngagement: number }
interface RoomSummary {
  roomId: string; name: string; status: string;
  engagement: number; headcount: number; capacity: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0b1120] border border-white/10 rounded-xl px-3 py-2.5 shadow-xl">
      <p className="text-gray-400 text-[10px] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-white text-xs font-semibold">
          {p.value}{p.unit ?? '%'}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [trends, setTrends]   = useState<TrendDay[]>([]);
  const [rooms, setRooms]     = useState<RoomSummary[]>([]);
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

  const avgEngagement = trends.length
    ? Math.round(trends.reduce((s, d) => s + d.averageEngagement, 0) / trends.length) : 0;
  const activeRooms = rooms.filter(r => r.status === 'active').length;

  const kpis = [
    { label: 'Avg Engagement', value: `${avgEngagement}%`, sub: '7-day average', color: 'text-blue-400', icon: '📊' },
    { label: 'Active Rooms',   value: activeRooms,          sub: 'Currently live', color: 'text-green-400', icon: '🟢' },
    { label: 'Total Rooms',    value: rooms.length,          sub: 'Configured',    color: 'text-white',     icon: '🏫' },
    { label: 'Data Points',    value: trends.length,         sub: 'Daily samples', color: 'text-purple-400', icon: '📈' },
  ];

  return (
    <div className="flex flex-col min-h-full bg-[#0b1120]">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Detailed Analytics</h1>
            <p className="text-gray-500 text-xs">7-day engagement trends and room performance overview</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-5 overflow-auto">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map(kpi => (
                <div key={kpi.label} className="bg-[#121b2f] border border-white/5 rounded-2xl p-5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">{kpi.label}</p>
                  <p className={`text-3xl font-bold leading-none mb-1 ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-[10px] text-gray-600">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* 7-day trend chart */}
            <div className="bg-[#121b2f] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-white">Engagement Trend</h2>
                  <p className="text-[10px] text-gray-600 mt-0.5">Daily average across all sessions</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-900/30 border border-blue-500/20 rounded-lg text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                  7 Days
                </span>
              </div>
              {trends.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3 text-center">
                  <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-600 text-xs">No trend data yet — start a session to generate data</p>
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                      <XAxis dataKey="date" stroke="#ffffff25" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff25" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="averageEngagement" stroke="#3b82f6" strokeWidth={2} fill="url(#engGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Room bar chart */}
            {rooms.length > 0 && (
              <div className="bg-[#121b2f] border border-white/5 rounded-2xl p-5">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-white">Room Engagement Snapshot</h2>
                  <p className="text-[10px] text-gray-600 mt-0.5">Latest engagement reading per room</p>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rooms} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                      <XAxis dataKey="name" stroke="#ffffff25" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff25" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="engagement" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Room status table */}
            <div className="bg-[#121b2f] border border-white/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Room Status</h2>
                <span className="text-[10px] text-gray-600">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
              </div>
              {rooms.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-600 text-xs">No rooms configured</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-gray-600 uppercase tracking-wider border-b border-white/5">
                        {['Room', 'Status', 'Engagement', 'Headcount', 'Capacity'].map(h => (
                          <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(room => (
                        <tr key={room.roomId} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5 text-white font-medium">{room.name}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                              room.status === 'active'
                                ? 'bg-green-900/30 text-green-400 border-green-500/25'
                                : 'bg-gray-800/50 text-gray-500 border-gray-700/50'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                              {room.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`font-bold text-sm ${
                              room.engagement > 79 ? 'text-green-400' :
                              room.engagement > 49 ? 'text-amber-400' :
                              room.engagement > 0  ? 'text-red-400'   : 'text-gray-600'
                            }`}>
                              {room.engagement > 0 ? `${room.engagement}%` : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-300">{room.headcount || '—'}</td>
                          <td className="px-5 py-3.5 text-gray-500">{room.capacity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
