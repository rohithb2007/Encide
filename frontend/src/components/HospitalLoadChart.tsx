import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Hospital } from '../types';

interface HospitalLoadChartProps {
  hospitals: Hospital[];
  onSelectHospital?: (hospital: Hospital) => void;
}

export const HospitalLoadChart: React.FC<HospitalLoadChartProps> = ({
  hospitals,
  onSelectHospital,
}) => {
  const chartData = hospitals.map((h) => ({
    id: h.id,
    name: h.short_code || h.name,
    fullName: h.name,
    loadPct: Math.round(h.current_load * 100),
    availableBeds: h.available_beds,
    availableICU: h.available_icu,
    totalBeds: h.total_beds,
    raw: h,
  }));

  const getBarColor = (load: number) => {
    if (load >= 85) return '#ef4444'; // Red
    if (load >= 65) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl font-mono text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-white tracking-wider text-[11px]">
          REGIONAL HOSPITAL CAPACITY LOAD (%)
        </span>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;65% Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 65-85% Surge
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> &gt;85% Saturated
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-700 p-2 rounded shadow-lg text-[10px]">
                      <span className="font-bold text-white block">{data.fullName}</span>
                      <span className="text-slate-300 block">Occupancy: {data.loadPct}%</span>
                      <span className="text-cyan-400 block">Available Beds: {data.availableBeds} / {data.totalBeds}</span>
                      <span className="text-rose-400 block">Available ICU: {data.availableICU}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="loadPct"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(entry: any) => entry && onSelectHospital?.(entry.raw)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.loadPct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
