"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCompanyUpdateStats,
  fetchMyDailyCalendar,
  fetchMyUpdateStats,
  fetchRecentUpdates,
} from "@/services/updateTrackingServices";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getElapsedMonthRange,
  getElapsedWeekRange,
  getShiftedMonth,
  getUpdateMetricsForRange,
} from "@/lib/update-tracking-period";

function formatCellValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

export function UpdateTrackingDashboard() {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const previousMonthPeriod = getShiftedMonth(currentYear, currentMonth, -1);

  const companyStatsQuery = useQuery({
    queryKey: ["update-tracking", "company-stats"],
    queryFn: fetchCompanyUpdateStats,
  });

  const myStatsQuery = useQuery({
    queryKey: ["update-tracking", "my-stats"],
    queryFn: fetchMyUpdateStats,
  });

  const currentMonthCalendarQuery = useQuery({
    queryKey: ["update-tracking", "my-daily-calendar", currentYear, currentMonth],
    queryFn: () => fetchMyDailyCalendar({ year: currentYear, month: currentMonth }),
  });

  const previousMonthCalendarQuery = useQuery({
    queryKey: [
      "update-tracking",
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

  const recentUpdatesQuery = useQuery({
    queryKey: ["update-tracking", "recent"],
    queryFn: () => fetchRecentUpdates(12),
  });

  const isLoading =
    companyStatsQuery.isLoading ||
    myStatsQuery.isLoading ||
    recentUpdatesQuery.isLoading;

  const hasError =
    companyStatsQuery.error || myStatsQuery.error || recentUpdatesQuery.error;

  const recentUpdates = recentUpdatesQuery.data ?? [];
  const recentColumns =
    recentUpdates.length > 0 ? Object.keys(recentUpdates[0]).slice(0, 5) : [];

  if (isLoading) {
    return <div className="px-4 py-8 text-sm text-muted-foreground">Loading update analytics...</div>;
  }

  if (hasError) {
    return (
      <div className="space-y-4 px-4 py-8">
        <p className="text-sm text-destructive">Failed to load update tracking data.</p>
        <Button
          variant="outline"
          onClick={() => {
            void companyStatsQuery.refetch();
            void myStatsQuery.refetch();
            void recentUpdatesQuery.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const companyStats = companyStatsQuery.data;
  const myStats = myStatsQuery.data;
  const updateDates = [
    ...(currentMonthCalendarQuery.data?.calendar ?? [])
      .filter((day) => day.has_update)
      .map((day) => day.date),
    ...(previousMonthCalendarQuery.data?.calendar ?? [])
      .filter((day) => day.has_update)
      .map((day) => day.date),
  ];
  const canUseElapsedMetrics = Boolean(
    currentMonthCalendarQuery.data && previousMonthCalendarQuery.data,
  );
  const currentWeekRange = getElapsedWeekRange({ today: now });
  const currentMonthRange = getElapsedMonthRange({
    year: currentYear,
    month: currentMonth,
    today: now,
  });
  const currentWeekMetrics = getUpdateMetricsForRange({
    updates: updateDates,
    range: currentWeekRange.range,
    today: now,
  });
  const currentMonthMetrics = getUpdateMetricsForRange({
    updates: updateDates,
    range: currentMonthRange.range,
    today: now,
  });
  const weeklyCompletion = canUseElapsedMetrics
    ? currentWeekMetrics.completionRate
    : myStats?.percentage_this_week ?? 0;
  const weeklyUpdates = canUseElapsedMetrics
    ? currentWeekMetrics.actualCount
    : myStats?.updates_this_week ?? 0;
  const monthlyUpdates = canUseElapsedMetrics
    ? currentMonthMetrics.actualCount
    : myStats?.updates_this_month ?? 0;
  const expectedWeekToDate = canUseElapsedMetrics
    ? currentWeekMetrics.expectedCount
    : myStats?.expected_updates_per_week ?? 0;

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Employees</CardDescription>
            <CardTitle>{companyStats?.total_employees ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Updates Today</CardDescription>
            <CardTitle>{companyStats?.total_updates_today ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Week</CardDescription>
            <CardTitle>{companyStats?.total_updates_this_week ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>My Weekly Completion</CardDescription>
            <CardTitle>{weeklyCompletion.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
            <CardDescription>Latest submitted update entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUpdates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent updates returned by the API.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {recentColumns.map((column) => (
                        <TableHead key={column}>{column.replace(/_/g, " ")}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUpdates.map((item, index) => (
                      <TableRow key={`${index}-${String(item.id ?? index)}`}>
                        {recentColumns.map((column) => (
                          <TableCell key={column}>
                            {formatCellValue(item[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Tracking Stats</CardTitle>
            <CardDescription>Current authenticated user performance snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">User</span>
              <Badge variant="outline">{myStats?.user_name ?? "-"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total updates</span>
              <span className="font-medium">{myStats?.total_updates ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This week</span>
              <span className="font-medium">{weeklyUpdates}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This month</span>
              <span className="font-medium">{monthlyUpdates}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expected / week (to date)</span>
              <span className="font-medium">{expectedWeekToDate}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
