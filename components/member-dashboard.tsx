"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Gauge, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { fetchMemberSalaryEstimate } from "@/services/memberServices";
import {
  fetchMyDailyCalendar,
  fetchMyProfile,
  fetchMyUpdateStats,
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  getAlignedPreviousMonthRange,
  getAlignedPreviousWeekRange,
  getElapsedMonthRange,
  getElapsedWeekRange,
  getShiftedMonth,
  getUpdateTrendComparison,
} from "@/lib/update-tracking-period";

const comparisonChartConfig = {
  current: {
    label: "Current",
    color: "var(--chart-1)",
  },
  previous: {
    label: "Previous",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

function formatSignedNumber(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

function formatAmount(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

function formatCompactDate(value?: string) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : value || "-";
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) {
    return <Badge variant="outline">No change</Badge>;
  }

  if (value > 0) {
    return (
      <Badge variant="success">
        <ArrowUpRight className="h-3 w-3" />
        {formatSignedNumber(value)}
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <ArrowDownRight className="h-3 w-3" />
      {formatSignedNumber(value)}
    </Badge>
  );
}

export function MemberDashboard() {
  const now = new Date();
  const salaryYear = now.getUTCFullYear();
  const salaryMonth = now.getUTCMonth() + 1;
  const previousMonthPeriod = getShiftedMonth(salaryYear, salaryMonth, -1);

  const statsQuery = useQuery({
    queryKey: ["member-dashboard", "my-update-stats"],
    queryFn: fetchMyUpdateStats,
  });

  const profileQuery = useQuery({
    queryKey: ["member-dashboard", "my-report"],
    queryFn: fetchMyProfile,
  });

  const currentMonthCalendarQuery = useQuery({
    queryKey: ["member-dashboard", "my-daily-calendar", salaryYear, salaryMonth],
    queryFn: () => fetchMyDailyCalendar({ year: salaryYear, month: salaryMonth }),
  });

  const previousMonthCalendarQuery = useQuery({
    queryKey: [
      "member-dashboard",
      "my-daily-calendar",
      previousMonthPeriod.year,
      previousMonthPeriod.month,
    ],
    queryFn: () =>
      fetchMyDailyCalendar({
        year: previousMonthPeriod.year,
        month: previousMonthPeriod.month,
      }),
  });

  const currentUserId = profileQuery.data?.user.id ?? statsQuery.data?.user_id;

  const salaryQuery = useQuery({
    queryKey: [
      "member-dashboard",
      "salary-estimate",
      salaryYear,
      salaryMonth,
      currentUserId,
    ],
    queryFn: () => {
      if (!currentUserId) {
        throw new Error("Missing current user id");
      }

      return fetchMemberSalaryEstimate({
        userId: currentUserId,
        year: salaryYear,
        month: salaryMonth,
      });
    },
    enabled: typeof currentUserId === "number" && currentUserId > 0,
  });

  if (statsQuery.isLoading) {
    return (
      <div className="px-4 py-8 text-sm text-muted-foreground">
        Loading member dashboard...
      </div>
    );
  }

  if (statsQuery.error || !statsQuery.data) {
    return (
      <div className="space-y-4 px-4 py-8">
        <p className="text-sm text-destructive">
          Failed to load dashboard data from `/update-tracking/stats/me`.
        </p>
        <Button variant="outline" onClick={() => void statsQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const stats = statsQuery.data;
  const profileData = profileQuery.data;
  const profileUser = profileData?.user;
  const profileStatistics = profileData?.statistics;
  const recentUpdates = profileData?.recent_updates ?? [];
  const displayName = profileUser?.name || stats.user_name || "Member";
  const displayUserId = profileUser?.id ?? stats.user_id;
  const displayRole = profileUser?.role;
  const totalUpdatesValue = profileStatistics?.total_updates ?? stats.total_updates;
  const updateDates = [
    ...(currentMonthCalendarQuery.data?.calendar ?? [])
      .filter((day) => day.has_update)
      .map((day) => day.date),
    ...(previousMonthCalendarQuery.data?.calendar ?? [])
      .filter((day) => day.has_update)
      .map((day) => day.date),
  ];
  const canUseElapsedComparisons = Boolean(
    currentMonthCalendarQuery.data && previousMonthCalendarQuery.data,
  );
  const currentWeekRange = getElapsedWeekRange({ today: now });
  const previousWeekRange = getAlignedPreviousWeekRange({ today: now });
  const currentMonthRange = getElapsedMonthRange({
    year: salaryYear,
    month: salaryMonth,
    today: now,
  });
  const previousMonthRange = getAlignedPreviousMonthRange({
    year: salaryYear,
    month: salaryMonth,
    today: now,
  });
  const weeklyTrend = getUpdateTrendComparison({
    updates: updateDates,
    currentRange: currentWeekRange.range,
    previousRange: previousWeekRange,
    today: now,
  });
  const monthlyTrend = getUpdateTrendComparison({
    updates: updateDates,
    currentRange: currentMonthRange.range,
    previousRange: previousMonthRange,
    today: now,
  });
  const expectedWeekUpdates = canUseElapsedComparisons
    ? weeklyTrend.current.expectedCount
    : stats.expected_updates_per_week;
  const thisWeekValue = canUseElapsedComparisons
    ? weeklyTrend.current.actualCount
    : profileStatistics?.this_week ?? stats.updates_this_week;
  const thisMonthValue = canUseElapsedComparisons
    ? monthlyTrend.current.actualCount
    : profileStatistics?.this_month ?? stats.updates_this_month;
  const weeklyDelta = canUseElapsedComparisons
    ? weeklyTrend.deltaCount
    : stats.updates_this_week - stats.updates_last_week;
  const monthlyDelta = canUseElapsedComparisons
    ? monthlyTrend.deltaCount
    : stats.updates_this_month - stats.updates_last_month;
  const weeklyProgressRaw = canUseElapsedComparisons
    ? weeklyTrend.current.completionRate
    : stats.expected_updates_per_week > 0
      ? (stats.updates_this_week / stats.expected_updates_per_week) * 100
      : 0;
  const weeklyProgress = clamp(weeklyProgressRaw, 0, 100);
  const remainingToTarget = canUseElapsedComparisons
    ? weeklyTrend.current.missingCount
    : Math.max(stats.expected_updates_per_week - stats.updates_this_week, 0);
  const overTarget = canUseElapsedComparisons
    ? Math.max(
        weeklyTrend.current.actualCount - weeklyTrend.current.expectedCount,
        0,
      )
    : Math.max(stats.updates_this_week - stats.expected_updates_per_week, 0);

  const comparisonChartData = [
    {
      period: "Week",
      current: canUseElapsedComparisons
        ? weeklyTrend.current.actualCount
        : stats.updates_this_week,
      previous: canUseElapsedComparisons
        ? weeklyTrend.previous.actualCount
        : stats.updates_last_week,
    },
    {
      period: "Month",
      current: canUseElapsedComparisons
        ? monthlyTrend.current.actualCount
        : stats.updates_this_month,
      previous: canUseElapsedComparisons
        ? monthlyTrend.previous.actualCount
        : stats.updates_last_month,
    },
  ];

  const completionRows = [
    {
      label: "This week",
      value: canUseElapsedComparisons
        ? weeklyTrend.current.completionRate
        : profileStatistics?.percentage_this_week ?? stats.percentage_this_week,
    },
    {
      label: "Last week",
      value: canUseElapsedComparisons
        ? weeklyTrend.previous.completionRate
        : stats.percentage_last_week,
    },
    {
      label: "This month",
      value: canUseElapsedComparisons
        ? monthlyTrend.current.completionRate
        : profileStatistics?.percentage_this_month ?? stats.percentage_this_month,
    },
    { label: "Last 3 months", value: profileStatistics?.percentage_last_3_months ?? stats.percentage_last_3_months },
  ];
  const profileWeekCompletion = canUseElapsedComparisons
    ? weeklyTrend.current.completionRate
    : profileStatistics?.percentage_this_week ?? 0;
  const profileMonthCompletion = canUseElapsedComparisons
    ? monthlyTrend.current.completionRate
    : profileStatistics?.percentage_this_month ?? 0;

  const mySalaryData = salaryQuery.data ?? null;
  const mySalaryEstimate = mySalaryData?.salary_estimate ?? null;
  const penaltyProgress = clamp(mySalaryEstimate?.penalty_percentage ?? 0, 0, 100);

  return (
    <div className="space-y-6 px-4 py-6">
      <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/10 via-card to-card">
        <CardHeader>
          <CardDescription>Member Dashboard</CardDescription>
          <CardTitle className="text-2xl">
            {displayName}
          </CardTitle>
          <CardAction className="flex flex-col items-end gap-2">
            <Badge variant="outline">User #{displayUserId}</Badge>
            {displayRole ? <Badge variant="secondary">{displayRole}</Badge> : null}
            <Badge
              variant={
                weeklyProgressRaw >= 100
                  ? "success"
                  : weeklyProgressRaw >= 70
                    ? "secondary"
                    : "outline"
              }
            >
              {weeklyProgressRaw >= 100
                ? "Target reached"
                : weeklyProgressRaw >= 70
                  ? "On track"
                  : "Needs attention"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">
              Expected updates (to date)
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {expectedWeekUpdates.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">This week progress</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {thisWeekValue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {overTarget > 0
                ? `${overTarget.toLocaleString()} above target`
                : `${remainingToTarget.toLocaleString()} remaining`}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                Weekly completion
              </span>
              <span>{formatPercent(weeklyProgressRaw)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-card to-card">
        <CardHeader>
          <CardDescription>{`Salary estimate for ${salaryMonth}/${salaryYear}`}</CardDescription>
          <CardTitle>My Salary Snapshot</CardTitle>
          <CardAction>
            <Badge variant="outline">Employee #{displayUserId}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {salaryQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading salary estimate...
            </div>
          ) : salaryQuery.error ? (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                Failed to load salary estimate data.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void salaryQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : !mySalaryData || !mySalaryEstimate ? (
            <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-sm text-muted-foreground">
              No salary estimate record found for your account.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
                <div className="rounded-xl border border-emerald-500/25 bg-background/90 p-4">
                  <p className="text-xs text-muted-foreground">Estimated salary</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {formatAmount(mySalaryEstimate.estimated_salary)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {mySalaryData.full_name}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <p className="text-xs text-muted-foreground">Base salary</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatAmount(mySalaryEstimate.base_salary)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <p className="text-xs text-muted-foreground">Deduction amount</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatAmount(mySalaryEstimate.deduction_amount)}
                  </p>
                  <Badge
                    variant={
                      mySalaryEstimate.deduction_amount > 0 ? "destructive" : "success"
                    }
                    className="mt-2"
                  >
                    {mySalaryEstimate.deduction_amount > 0
                      ? "Deduction applied"
                      : "No deduction"}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Penalty entries</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatAmount(mySalaryData.penalties_count)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Penalty points</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatAmount(mySalaryEstimate.total_penalty_points)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Penalty percentage</span>
                    <span>{formatPercent(mySalaryEstimate.penalty_percentage)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${penaltyProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-linear-to-br from-card to-muted/30">
          <CardHeader>
            <CardDescription>Total updates</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {totalUpdatesValue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>This week</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {thisWeekValue.toLocaleString()}
            </CardTitle>
            <CardAction>
              <TrendBadge value={weeklyDelta} />
            </CardAction>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>This month</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {thisMonthValue.toLocaleString()}
            </CardTitle>
            <CardAction>
              <TrendBadge value={monthlyDelta} />
            </CardAction>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Last 3 months</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.updates_last_3_months.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>
            Profile and recent updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profileQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading profile data...</p>
          ) : profileQuery.isError ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                Failed to load profile data.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => void profileQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : !profileData ? (
            <p className="text-sm text-muted-foreground">No profile data returned.</p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Full name</p>
                  <p className="mt-1 font-semibold">{profileUser?.name || "-"}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Role</p>
                    <p className="mt-1 font-semibold">{profileUser?.role || "-"}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Telegram</p>
                    <p className="mt-1 font-semibold">{profileUser?.telegram_id || "-"}</p>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">This week</span>
                    <span className="font-medium tabular-nums">
                      {formatPercent(profileWeekCompletion)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{
                        width: `${clamp(profileWeekCompletion, 0, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">This month</span>
                    <span className="font-medium tabular-nums">
                      {formatPercent(profileMonthCompletion)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{
                        width: `${clamp(profileMonthCompletion, 0, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last 3 months</span>
                    <span className="font-medium tabular-nums">
                      {formatPercent(profileStatistics?.percentage_last_3_months ?? 0)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{
                        width: `${clamp(profileStatistics?.percentage_last_3_months ?? 0, 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Recent updates</p>
                {recentUpdates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent updates found.</p>
                ) : (
                  recentUpdates.slice(0, 5).map((item, index) => (
                    <div key={`${item.date}-${index}`} className="rounded-lg border p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{formatCompactDate(item.date)}</span>
                        <Badge
                          variant={
                            item.is_valid === true
                              ? "success"
                              : item.is_valid === false
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {item.is_valid === true
                            ? "Valid"
                            : item.is_valid === false
                              ? "Invalid"
                              : "Unknown"}
                        </Badge>
                      </div>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {item.content?.trim() || "-"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current vs Previous</CardTitle>
            <CardDescription>
              Compare this week/month against the previous period.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer
              config={comparisonChartConfig}
              className="aspect-auto h-65 w-full"
            >
              <BarChart data={comparisonChartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={28} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="current"
                  fill="var(--color-current)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="previous"
                  fill="var(--color-previous)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Breakdown</CardTitle>
            <CardDescription>
              Performance percentages from `/update-tracking/stats/me`.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {completionRows.map((item) => {
              const normalized = clamp(item.value, 0, 100);

              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium tabular-nums">
                      {formatPercent(item.value)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${normalized}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="rounded-lg border border-dashed bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Expected updates (to date)
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {expectedWeekUpdates.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              My Monthly Trend
            </CardTitle>
            <CardDescription>
              View monthly completion percentages from `/update-tracking/my-trends`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="cursor-pointer">
              <Link href="/my-monthly-trend">Open Monthly Trend</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              Monthly Calendar
            </CardTitle>
            <CardDescription>
              View update days, missing days, and day-by-day calendar status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="cursor-pointer">
              <Link href="/monthly-calendar">Open Monthly Calendar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
