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

function CloseRateGauge({ rate }: { rate: number }) {
  const percentage = Math.min(rate * 100, 100);
  const radius = 60;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color: green at 40%+, transitions to red at 0%
  const hue = Math.min(percentage / 40, 1) * 120; // 0=red, 120=green
  const color = percentage >= 40 ? "#2d5a3d" : percentage >= 20 ? "#b8860b" : "#b33a3a";

  return (
    <div className="flex flex-col items-center">
      <svg width="150" height="150" viewBox="0 0 150 150">
        {/* Background circle */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke="#e8f0eb"
          strokeWidth={strokeWidth}
        />
        {/* Gauge arc */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 75 75)"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        {/* Center text */}
        <text
          x="75"
          y="70"
          textAnchor="middle"
          className="font-bold"
          style={{ fontSize: "24px", fontFamily: "Georgia, serif", fill: color }}
        >
          {percentage.toFixed(1)}%
        </text>
        <text
          x="75"
          y="90"
          textAnchor="middle"
          style={{ fontSize: "11px", fontFamily: "Georgia, serif", fill: "#6b6459" }}
        >
          Close Rate
        </text>
      </svg>
    </div>
  );
}

export default function PerformanceChart({ metrics }: PerformanceChartProps) {
  const data = [
    { name: "Win Rate with DM Present", value: metrics.decision_maker_rate, threshold: 0.9 },
    { name: "Win Rate with Webinar Watched", value: metrics.webinar_rate, threshold: 0.8 },
    { name: "Win Rate with PCCd Call", value: metrics.pcc_rate, threshold: 1, neutral: true },
  ];

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide mb-4">
        Performance Overview
      </h3>

      {/* Close Rate Circle Gauge */}
      <div className="flex justify-center mb-6">
        <CloseRateGauge rate={metrics.close_rate} />
      </div>

      {/* Bar chart for DM/Webinar/PCC rates */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d4cfc7" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Georgia, serif" }} stroke="#6b6459" />
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
            {data.map((entry, index) => {
              let fill = "#2d5a3d";
              if (entry.neutral) {
                fill = "#6b6459";
              } else {
                fill = entry.value >= entry.threshold ? "#2d5a3d" : "#b33a3a";
              }
              return <Cell key={index} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
