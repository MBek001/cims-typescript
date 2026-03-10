"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, CircleAlert, RefreshCcw } from "lucide-react";
import { fetchMyDailyCalendar } from "@/services/updateTrackingServices";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

type WeekFilterValue = "all" | `${number}`;

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

function getWeekFilterOptions(totalDays: number): Array<{ value: WeekFilterValue; label: string }> {
  const weekCount = Math.max(1, Math.ceil(totalDays / 7));

  return [
    { value: "all", label: "All full week" },
    ...Array.from({ length: weekCount }, (_, index) => ({
      value: `${index + 1}` as `${number}`,
      label: `Week ${index + 1}`,
    })),
  ];
}

function isInSelectedWeek(day: number, selectedWeek: WeekFilterValue): boolean {
  if (selectedWeek === "all") {
    return true;
  }

  const weekNumber = Number.parseInt(selectedWeek, 10);
  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    return true;
  }

  const startDay = (weekNumber - 1) * 7 + 1;
  const endDay = weekNumber * 7;
  return day >= startDay && day <= endDay;
}

export function MemberMonthlyCalendar() {
  const now = React.useMemo(() => new Date(), []);
  const [yearInput, setYearInput] = React.useState(String(now.getUTCFullYear()));
  const [monthInput, setMonthInput] = React.useState(String(now.getUTCMonth() + 1));
  const [weekFilter, setWeekFilter] = React.useState<WeekFilterValue>("all");

  const year = Number.parseInt(yearInput, 10);
  const month = Number.parseInt(monthInput, 10);
  const validYear = Number.isInteger(year) && year >= 2000 && year <= 2100;
  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const isValidPeriod = validYear && validMonth;

  const calendarQuery = useQuery({
    queryKey: ["member-dashboard", "my-daily-calendar", year, month],
    queryFn: () => fetchMyDailyCalendar({ year, month }),
    enabled: isValidPeriod,
  });

  const payload = calendarQuery.data;
  const completion = clamp(payload?.percentage ?? 0, 0, 100);
  const workingDays = payload?.working_days ?? 0;
  const updateDays = payload?.update_days ?? 0;
  const missingDays = payload?.missing_days ?? 0;
  const weekFilterOptions = React.useMemo(
    () => getWeekFilterOptions(payload?.calendar.length ?? 0),
    [payload?.calendar.length],
  );

  React.useEffect(() => {
    if (!weekFilterOptions.some((option) => option.value === weekFilter)) {
      setWeekFilter("all");
    }
  }, [weekFilter, weekFilterOptions]);

  const filteredCalendar = React.useMemo(
    () => (payload?.calendar ?? []).filter((day) => isInSelectedWeek(day.day, weekFilter)),
    [payload?.calendar, weekFilter],
  );
  const activeWeekLabel =
    weekFilterOptions.find((option) => option.value === weekFilter)?.label ??
    "All full week";

  return (
    <div className="space-y-6 px-4 py-6">
      <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/10 via-card to-card">
        <CardHeader>
          <CardDescription>Member Dashboard</CardDescription>
          <CardTitle className="text-2xl">My Daily Update Calendar</CardTitle>
          <CardAction className="flex items-center gap-2">
            <Badge variant="outline">{isValidPeriod ? `${month}/${year}` : "Invalid period"}</Badge>
            <Badge variant={getCompletionVariant(completion)}>
              {formatPercent(completion)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="member-calendar-year">Year</Label>
            <Input
              id="member-calendar-year"
              value={yearInput}
              inputMode="numeric"
              placeholder="2026"
              onChange={(event) => {
                const digits = event.target.value.replace(/[^\d]/g, "");
                setYearInput(digits);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-calendar-month">Month</Label>
            <Select value={monthInput} onValueChange={setMonthInput}>
              <SelectTrigger id="member-calendar-month" className="w-full cursor-pointer">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="cursor-pointer"
              disabled={!isValidPeriod || calendarQuery.isFetching}
              onClick={() => void calendarQuery.refetch()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isValidPeriod ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Year and month are required integers. Use a valid year (2000-2100) and month (1-12).
          </CardContent>
        </Card>
      ) : calendarQuery.isLoading ? (
        <div className="px-1 py-8 text-sm text-muted-foreground">Loading calendar data...</div>
      ) : calendarQuery.isError || !payload ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm text-destructive">
              Failed to load `/update-tracking/my-daily-calendar`.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => void calendarQuery.refetch()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-linear-to-br from-card to-muted/30">
              <CardHeader>
                <CardDescription>Working days</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{workingDays.toLocaleString()}</CardTitle>
                <CardAction>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Days with updates</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{updateDays.toLocaleString()}</CardTitle>
                <CardAction>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardAction>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Missing days</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{missingDays.toLocaleString()}</CardTitle>
                <CardAction>
                  <CircleAlert className="h-4 w-4 text-orange-500" />
                </CardAction>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Completion</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{formatPercent(payload.percentage)}</CardTitle>
                <CardAction>
                  <Badge variant={getCompletionVariant(completion)}>
                    {payload.update_days}/{payload.working_days}
                  </Badge>
                </CardAction>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Calendar</CardTitle>
              <CardDescription>
                Green days have updates, orange days are missing updates, Sundays are neutral.
              </CardDescription>
              <CardAction>
                <div className="space-y-2">
                  <Label htmlFor="member-calendar-week" className="text-xs text-muted-foreground">
                    Week Filter
                  </Label>
                  <Select
                    value={weekFilter}
                    onValueChange={(value) => {
                      setWeekFilter(value as WeekFilterValue);
                    }}
                  >
                    <SelectTrigger id="member-calendar-week" className="w-[180px] cursor-pointer">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekFilterOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="cursor-pointer"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Sunday</Badge>
                <Badge variant="success">Has update</Badge>
                <Badge variant="secondary">Missing update</Badge>
                <Badge variant="outline">{activeWeekLabel}</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredCalendar.map((day) => {
                  const dayStatusClass = day.is_sunday
                    ? "border-border/60 bg-muted/20"
                    : day.has_update
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-orange-500/30 bg-orange-500/10";

                  return (
                    <div key={day.date} className={cn("rounded-lg border p-3", dayStatusClass)}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{day.day}</p>
                          <p className="text-xs text-muted-foreground">{day.weekday}</p>
                        </div>
                        <Badge
                          variant={
                            day.is_sunday
                              ? "outline"
                              : day.has_update
                                ? "success"
                                : "secondary"
                          }
                        >
                          {day.is_sunday ? "Sunday" : day.has_update ? "Updated" : "Missing"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{day.date}</p>
                      {day.has_update ? (
                        <p className="mt-2 line-clamp-2 text-xs">
                          {day.update_content?.trim() || "Update submitted"}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {filteredCalendar.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No days found for the selected week filter.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
