"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Metrics } from "@/lib/types";

interface PerformanceChartProps {
  metrics: Metrics;
}

export default function PerformanceChart({ metrics }: PerformanceChartProps) {
  const data = [
    { name: "Close Rate", value: metrics.close_rate, threshold: 0.3 },
    { name: "Show Rate", value: metrics.show_rate, threshold: 0.7 },
    { name: "Follow-up", value: metrics.follow_up_rate, threshold: 0.5 },
    { name: "DM Rate", value: metrics.decision_maker_rate, threshold: 0.9 },
    { name: "Webinar", value: metrics.webinar_rate, threshold: 0.8 },
  ];

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide mb-4">
        Performance Overview
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d4cfc7" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "Georgia, serif" }} stroke="#6b6459" />
          <YAxis
            tick={{ fontSize: 12, fontFamily: "Georgia, serif" }}
            stroke="#6b6459"
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            domain={[0, 1]}
          />
          <Tooltip
            formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #d4cfc7",
              fontSize: "13px",
              fontFamily: "Georgia, serif",
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  index === 2
                    ? entry.value <= entry.threshold ? "#2d5a3d" : "#b8860b"
                    : entry.value >= entry.threshold ? "#2d5a3d" : "#b33a3a"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
