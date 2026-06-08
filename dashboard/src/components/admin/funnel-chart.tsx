"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { FunnelStep } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "#6366f1",
  "#818cf8",
  "#a5b4fc",
  "#c7d2fe",
  "#e0e7ff",
  "#eef2ff",
];

interface FunnelChartProps {
  data?: FunnelStep[];
  isLoading?: boolean;
}

export function FunnelChart({ data, isLoading }: FunnelChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted">
            No funnel data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Funnel</CardTitle>
        <p className="text-sm text-muted">
          Signup → GBP Connected → WhatsApp → Territory → Active → First Lead
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis
              dataKey="label"
              type="category"
              width={120}
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number, _name: string, props: { payload: FunnelStep }) => {
                const step = props.payload;
                return [
                  `${value} (${step.conversion_pct}% conversion)`,
                  step.label,
                ];
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                formatter={(value: number) => `${value}`}
                style={{ fontSize: 12, fontWeight: 600, fill: "#0f172a" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Conversion indicators */}
        <div className="mt-4 flex flex-wrap gap-2">
          {data.slice(1).map((step, idx) => (
            <div
              key={step.step}
              className="flex items-center gap-1.5 rounded-badge bg-gray-50 px-2 py-1 text-xs"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: COLORS[idx] }}
              />
              <span className="text-muted">{step.label}:</span>
              <span
                className={
                  step.conversion_pct >= 70
                    ? "font-medium text-success-600"
                    : step.conversion_pct >= 40
                    ? "font-medium text-warning-600"
                    : "font-medium text-danger-600"
                }
              >
                {step.conversion_pct}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
