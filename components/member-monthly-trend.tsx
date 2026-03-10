"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import {
  fetchMyTrends,
  type MyTrendItem,
} from "@/services/updateTrackingServices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

function getCompletionVariant(value: number): "success" | "secondary" | "outline" {
  if (value >= 80) {
    return "success";
  }

  if (value >= 50) {
    return "secondary";
  }

  return "outline";
}

function findBestTrend(trends: MyTrendItem[]): MyTrendItem | null {
  if (trends.length === 0) {
    return null;
  }

  return trends.reduce((best, current) =>
    current.percentage > best.percentage ? current : best,
  );
}

export function MemberMonthlyTrend() {
  const trendsQuery = useQuery({
    queryKey: ["member-dashboard", "my-trends"],
    queryFn: fetchMyTrends,
  });

  const trendPayload = trendsQuery.data;
  const trends = React.useMemo(() => trendPayload?.trends ?? [], [trendPayload?.trends]);
  const trendAverageCompletion = clamp(trendPayload?.average_percentage ?? 0, 0, 100);
  const bestTrend = React.useMemo(() => findBestTrend(trends), [trends]);
  const totalTrendWorkingDays = trends.reduce((sum, trend) => sum + trend.working_days, 0);
  const totalTrendUpdateDays = trends.reduce((sum, trend) => sum + trend.update_days, 0);

  return (
    <div className="space-y-6 px-4 py-6">
      <Card className="overflow-hidden border-primary/15 bg-linear-to-br from-card via-card to-primary/5">
        <CardHeader>
          <CardDescription>Update Tracking Trends</CardDescription>
          <CardTitle className="text-xl">My Monthly Trend</CardTitle>
          <CardAction className="flex items-center gap-2">
            <Badge variant={getCompletionVariant(trendAverageCompletion)}>
              Avg {formatPercent(trendAverageCompletion)}
            </Badge>
            <Badge variant="outline">
              {totalTrendUpdateDays}/{totalTrendWorkingDays}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {trendsQuery.isLoading ? (
            <div className="py-3 text-sm text-muted-foreground">Loading trend data...</div>
          ) : trendsQuery.isError ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                Failed to load `/update-tracking/my-trends`.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => void trendsQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : trends.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">No trend records returned yet.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Months tracked</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{trends.length}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Average completion</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatPercent(trendAverageCompletion)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Best month</p>
                  <div className="mt-1 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="text-lg font-semibold">
                      {bestTrend ? `${bestTrend.month_name} ${bestTrend.year}` : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {trends.map((trend) => {
                  const trendCompletion = clamp(trend.percentage, 0, 100);

                  return (
                    <div key={`${trend.year}-${trend.month}`} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {trend.month_name} {trend.year}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {trend.update_days} updates / {trend.working_days} working days
                          </p>
                        </div>
                        <Badge variant={getCompletionVariant(trendCompletion)}>
                          {formatPercent(trendCompletion)}
                        </Badge>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-muted/60">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-500",
                            trendCompletion >= 80
                              ? "bg-emerald-500"
                              : trendCompletion >= 50
                                ? "bg-primary"
                                : "bg-orange-500",
                          )}
                          style={{ width: `${trendCompletion}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

