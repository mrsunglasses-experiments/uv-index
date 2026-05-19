import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ShieldCheck } from 'lucide-react';
import type { MonthlyUV } from '../services/api';

interface UVBarChartProps {
  data: MonthlyUV[];
  viewType: 'avg' | 'peak';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const uv = payload[0].value;
    let advice = '';
    let colorClass = '';

    if (uv < 3) { advice = 'Safe to be outside.'; colorClass = 'text-emerald-700'; }
    else if (uv < 6) { advice = 'Sunscreen recommended.'; colorClass = 'text-yellow-700'; }
    else if (uv < 8) { advice = 'Seek shade midday.'; colorClass = 'text-orange-700'; }
    else if (uv < 11) { advice = 'High risk. Avoid midday sun.'; colorClass = 'text-red-700'; }
    else { advice = 'Extreme risk. Stay indoors.'; colorClass = 'text-purple-700'; }

    return (
      <div className="bg-white p-3 rounded-lg shadow-2xl border border-slate-200 ring-1 ring-black/10">
        <p className="text-slate-900 font-bold uppercase text-[10px] mb-1">{label}</p>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`text-2xl font-black ${colorClass}`}>{uv}</span>
          <span className="text-slate-400 font-bold text-[11px] uppercase">UV Index</span>
        </div>
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
          <ShieldCheck size={14} className={colorClass} />
          <p className="text-[11px] font-bold text-slate-700">{advice}</p>
        </div>
      </div>
    );
  }
  return null;
};

const getBarColor = (uv: number) => {
  if (uv < 3) return '#059669';
  if (uv < 6) return '#d97706';
  if (uv < 8) return '#ea580c';
  if (uv < 11) return '#dc2626';
  return '#7c3aed';
};

export function UVBarChart({ data, viewType }: UVBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }} tickLine={false} tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 900 }} dy={10} />
        <YAxis axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }} tickLine={false} tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 4 }} />
        <Bar dataKey={viewType === 'peak' ? 'peakUV' : 'uvIndex'} radius={[4, 4, 0, 0]} barSize={35}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(viewType === 'peak' ? entry.peakUV : entry.uvIndex)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
