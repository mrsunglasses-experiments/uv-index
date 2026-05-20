import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ShieldCheck, Clock } from "lucide-react";
import type { MonthlyUV } from "../services/api";

interface UVBarChartProps {
  data: MonthlyUV[];
  viewType: "avg" | "peak";
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const uv = payload[0].value;
    const entry: MonthlyUV | undefined = payload[0].payload;

    if (entry?.unavailable) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-2xl border border-slate-200 ring-1 ring-black/10">
          <p className="text-slate-900 font-bold uppercase text-[10px] mb-1">
            {label}
          </p>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            <p className="text-[11px] font-bold text-slate-500">
              Data not yet available
            </p>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            NASA POWER data has a processing lag of a few months.
          </p>
        </div>
      );
    }

    let advice = "";
    let colorClass = "";

    if (uv < 3) {
      advice = "Safe to be outside.";
      colorClass = "text-emerald-700";
    } else if (uv < 6) {
      advice = "Sunscreen recommended.";
      colorClass = "text-yellow-700";
    } else if (uv < 8) {
      advice = "Seek shade midday.";
      colorClass = "text-orange-700";
    } else if (uv < 11) {
      advice = "High risk. Avoid midday sun.";
      colorClass = "text-red-700";
    } else {
      advice = "Extreme risk. Stay indoors.";
      colorClass = "text-purple-700";
    }

    return (
      <div className="bg-white p-3 rounded-lg shadow-2xl border border-slate-200 ring-1 ring-black/10">
        <p className="text-slate-900 font-bold uppercase text-[10px] mb-1">
          {label}
        </p>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`text-2xl font-black ${colorClass}`}>{uv}</span>
          <span className="text-slate-400 font-bold text-[11px] uppercase">
            UV Index
          </span>
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
  if (uv < 3) return "#059669";
  if (uv < 6) return "#d97706";
  if (uv < 8) return "#ea580c";
  if (uv < 11) return "#dc2626";
  return "#7c3aed";
};

// Placeholder height for unavailable months so they appear visually in the chart
const UNAVAILABLE_PLACEHOLDER = 0.5;

export function UVBarChart({ data, viewType }: UVBarChartProps) {
  const hasUnavailable = data.some((d) => d.unavailable);

  // Build chart-ready data: unavailable months get a small placeholder value
  const chartData = data.map((d) => ({
    ...d,
    [viewType === "peak" ? "peakUV" : "uvIndex"]: d.unavailable
      ? UNAVAILABLE_PLACEHOLDER
      : viewType === "peak"
        ? d.peakUV
        : d.uvIndex,
  }));

  return (
    <div className="flex flex-col h-full gap-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: -25, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="0"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="month"
            axisLine={{ stroke: "#94a3b8", strokeWidth: 2 }}
            tickLine={false}
            tick={{ fill: "#1e293b", fontSize: 11, fontWeight: 900 }}
            dy={10}
          />
          <YAxis
            axisLine={{ stroke: "#94a3b8", strokeWidth: 2 }}
            tickLine={false}
            tick={{ fill: "#1e293b", fontSize: 11, fontWeight: 700 }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "#f1f5f9", radius: 4 }}
          />
          <Bar
            dataKey={viewType === "peak" ? "peakUV" : "uvIndex"}
            radius={[4, 4, 0, 0]}
            barSize={35}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.unavailable
                    ? "#cbd5e1"
                    : getBarColor(
                        viewType === "peak" ? entry.peakUV : entry.uvIndex,
                      )
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {hasUnavailable && (
        <div className="flex items-center gap-1.5 px-1">
          <div className="w-3 h-3 rounded-sm bg-slate-300 shrink-0" />
          <p className="text-[11px] font-medium text-slate-400">
            Gray bars indicate months where NASA POWER data is not yet available
            (processing lag of a few months).
          </p>
        </div>
      )}
    </div>
  );
}
