"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import {
  buildCalendarGrid,
  buildEmployeeOverviews,
  formatCompactDate,
  formatCompletionRate,
  getMonthLabel,
  MONTH_OPTIONS,
  type EmployeeCalendarDay,
  type EmployeeMonthlyOverview,
} from "@/lib/update-tracking-ceo";
import { cn } from "@/lib/utils";
import { fetchAllUsersMonthlyUpdates } from "@/services/updateTrackingServices";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Skeleton } from "@/components/ui/skeleton";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toIsoDateInUtc(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayStatusStyles(status: EmployeeCalendarDay["status"]) {
  switch (status) {
    case "updated":
      return {
        label: "Updated",
        badgeVariant: "success" as const,
        badgeClassName: "",
        cellClassName:
          "border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15",
      };
    case "missing":
      return {
        label: "Missing",
        badgeVariant: "secondary" as const,
        badgeClassName: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
        cellClassName:
          "border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/15",
      };
    case "future":
      return {
        label: "Future",
        badgeVariant: "outline" as const,
        badgeClassName: "text-muted-foreground",
        cellClassName: "border-border/70 bg-muted/15 opacity-80 hover:bg-muted/25",
      };
    case "sunday":
    default:
      return {
        label: "Sunday",
        badgeVariant: "outline" as const,
        badgeClassName: "text-muted-foreground",
        cellClassName: "border-border/70 bg-muted/25 hover:bg-muted/35",
      };
  }
}

function UpdateDayDetailsPanel({ day }: { day: EmployeeCalendarDay | null }) {
  if (!day) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Select a day in the calendar to view full update details.
        </CardContent>
      </Card>
    );
  }

  const style = getDayStatusStyles(day.status);
  const content = day.update?.content?.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{day.date}</CardTitle>
        <CardDescription>{`${day.weekday} | ${style.label}`}</CardDescription>
        <CardAction>
          <Badge variant={style.badgeVariant} className={style.badgeClassName}>
            {style.label}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {content ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {day.isSunday
              ? "Sunday is neutral and does not require an update."
              : day.isFuture
                ? "Future workday."
                : "No update submitted for this workday."}
          </p>
        )}
        {day.update?.created_at ? (
          <p className="text-xs text-muted-foreground">
            Submitted at: {formatCompactDate(day.update.created_at)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmployeeCalendarCard(props: {
  employee: EmployeeMonthlyOverview;
  month: number;
  year: number;
  selectedDayDate: string | null;
  onSelectDay: (date: string) => void;
}) {
  const { employee, month, year, selectedDayDate, onSelectDay } = props;
  const calendarCells = React.useMemo(
    () => buildCalendarGrid(employee.calendarDays, year, month),
    [employee.calendarDays, month, year],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Calendar</CardTitle>
        <CardDescription>
          Full activity view for {getMonthLabel(month)} {year}
        </CardDescription>
        <CardAction className="flex flex-wrap gap-1">
          <Badge variant="success">Updated</Badge>
          <Badge
            variant="secondary"
            className="bg-amber-500/15 text-amber-200 border border-amber-500/30"
          >
            Missing
          </Badge>
          <Badge variant="outline">Sunday</Badge>
          <Badge variant="outline" className="text-muted-foreground">
            Future
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAY_HEADERS.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[128px] rounded-md border border-dashed border-border/40"
                />
              );
            }

            const style = getDayStatusStyles(day.status);
            const isSelected = day.date === selectedDayDate;
            const updateContent = day.update?.content?.trim();

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelectDay(day.date)}
                className={cn(
                  "min-h-[128px] rounded-md border p-2 text-left transition-colors",
                  style.cellClassName,
                  isSelected && "ring-2 ring-primary/60",
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="text-sm font-semibold">{day.day}</p>
                    <p className="text-[11px] text-muted-foreground">{day.weekday}</p>
                  </div>
                  <Badge
                    variant={style.badgeVariant}
                    className={cn("text-[10px]", style.badgeClassName)}
                  >
                    {style.label}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{day.date}</p>
                {updateContent ? (
                  <p className="mt-1 line-clamp-2 text-[11px]">{updateContent}</p>
                ) : (
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {day.isSunday
                      ? "No action required."
                      : day.isFuture
                        ? "Future workday."
                        : "No update."}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeSummaryCards({ employee }: { employee: EmployeeMonthlyOverview }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Submitted updates</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {employee.submittedUpdatesCount}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Missing workdays</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {employee.missingWorkdaysCount}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Completion rate</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatCompletionRate(employee.completionRate)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Last update</CardDescription>
          <CardTitle className="text-xl">{formatCompactDate(employee.lastUpdateDate)}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

function EmployeeDetailsLoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`employee-summary-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}

export function CeoEmployeeUpdateDetailsPage({ userId }: { userId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = React.useMemo(() => new Date(), []);
  const todayIso = React.useMemo(() => toIsoDateInUtc(now), [now]);
  const searchParamsString = searchParams.toString();
  const lastSearchParamsRef = React.useRef(searchParamsString);

  const [yearInput, setYearInput] = React.useState(() => {
    const value = Number.parseInt(searchParams.get("year") ?? "", 10);
    return Number.isInteger(value) ? String(value) : String(now.getUTCFullYear());
  });
  const [monthInput, setMonthInput] = React.useState(() => {
    const value = Number.parseInt(searchParams.get("month") ?? "", 10);
    return Number.isInteger(value) ? String(value) : String(now.getUTCMonth() + 1);
  });
  const [selectedDayDate, setSelectedDayDate] = React.useState<string | null>(null);

  const year = Number.parseInt(yearInput, 10);
  const month = Number.parseInt(monthInput, 10);
  const validYear = Number.isInteger(year) && year >= 2000 && year <= 2100;
  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const isValidPeriod = validYear && validMonth;
  const isValidUserId = Number.isInteger(userId) && userId > 0;

  const updatesQuery = useQuery({
    queryKey: ["ceo", "update-tracking", "all-users-updates", year, month],
    queryFn: () => fetchAllUsersMonthlyUpdates({ year, month }),
    enabled: isValidPeriod && isValidUserId,
  });

  const employeeOverviews = React.useMemo(() => {
    if (!updatesQuery.data || !isValidPeriod) {
      return [];
    }

    return buildEmployeeOverviews({
      employees: updatesQuery.data,
      year,
      month,
      todayIso,
    });
  }, [isValidPeriod, month, todayIso, updatesQuery.data, year]);

  const employee = React.useMemo(
    () => employeeOverviews.find((item) => item.userId === userId) ?? null,
    [employeeOverviews, userId],
  );

  const selectedDay = React.useMemo(() => {
    if (!employee || !selectedDayDate) {
      return null;
    }

    return employee.calendarDays.find((day) => day.date === selectedDayDate) ?? null;
  }, [employee, selectedDayDate]);

  React.useEffect(() => {
    if (searchParamsString === lastSearchParamsRef.current) {
      return;
    }

    lastSearchParamsRef.current = searchParamsString;
    const currentYear = Number.parseInt(searchParams.get("year") ?? "", 10);
    const currentMonth = Number.parseInt(searchParams.get("month") ?? "", 10);

    if (
      Number.isInteger(currentYear) &&
      Number.isInteger(currentMonth) &&
      (String(currentYear) !== yearInput || String(currentMonth) !== monthInput)
    ) {
      setYearInput(String(currentYear));
      setMonthInput(String(currentMonth));
    }
  }, [monthInput, searchParams, searchParamsString, yearInput]);

  React.useEffect(() => {
    if (!isValidPeriod) {
      return;
    }

    const params = new URLSearchParams(searchParamsString);
    const nextYear = String(year);
    const nextMonth = String(month);

    if (params.get("year") === nextYear && params.get("month") === nextMonth) {
      return;
    }

    params.set("year", nextYear);
    params.set("month", nextMonth);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [isValidPeriod, month, pathname, router, searchParamsString, year]);

  React.useEffect(() => {
    if (!employee) {
      setSelectedDayDate(null);
      return;
    }

    const preferredDay =
      employee.calendarDays.find((day) => day.hasUpdate) ?? employee.calendarDays[0] ?? null;
    setSelectedDayDate(preferredDay?.date ?? null);
  }, [employee]);

  const backQuery = React.useMemo(() => {
    const params = new URLSearchParams();
    if (isValidPeriod) {
      params.set("year", String(year));
      params.set("month", String(month));
    }
    return params.toString();
  }, [isValidPeriod, month, year]);

  const backHref = backQuery ? `/update-tracking/ceo?${backQuery}` : "/update-tracking/ceo";
  const employeeName = employee?.name ?? `Employee #${userId}`;

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={backHref}>Team Monthly Updates</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{employeeName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="overflow-hidden border-primary/15 bg-linear-to-br from-card via-card to-primary/5">
          <CardHeader>
            <CardDescription>Employee Analytics</CardDescription>
            <CardTitle className="text-2xl">{employeeName}</CardTitle>
            <CardAction className="flex items-end gap-2">
              <div className="space-y-2">
                <Label className="text-xs text-transparent select-none" aria-hidden>
                  Action
                </Label>
                <Button asChild variant="outline">
                  <Link href={backHref}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Overview
                  </Link>
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ceo-employee-year" className="text-xs text-muted-foreground">
                  Year
                </Label>
                <Input
                  id="ceo-employee-year"
                  value={yearInput}
                  placeholder="2026"
                  inputMode="numeric"
                  className="w-24"
                  onChange={(event) =>
                    setYearInput(event.target.value.replace(/[^\d]/g, ""))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ceo-employee-month" className="text-xs text-muted-foreground">
                  Month
                </Label>
                <Select value={monthInput} onValueChange={setMonthInput}>
                  <SelectTrigger id="ceo-employee-month" className="w-40">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={!isValidPeriod || updatesQuery.isFetching}
                onClick={() => void updatesQuery.refetch()}
                className="self-end"
              >
                <RefreshCcw
                  className={cn("mr-2 h-4 w-4", updatesQuery.isFetching && "animate-spin")}
                />
                Refresh
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      {!isValidUserId ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Invalid employee id in URL.
          </CardContent>
        </Card>
      ) : !isValidPeriod ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Year and month are required integers. Use a valid year (2000-2100) and
            month (1-12).
          </CardContent>
        </Card>
      ) : updatesQuery.isLoading ? (
        <EmployeeDetailsLoadingState />
      ) : updatesQuery.isError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm text-destructive">
              Failed to load `/update-tracking/all-users-updates`.
            </p>
            <Button variant="outline" size="sm" onClick={() => void updatesQuery.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !employee ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-sm text-muted-foreground">
            <p>Employee with id `{userId}` was not found for this period.</p>
            <Button asChild variant="outline" size="sm">
              <Link href={backHref}>Return to CEO Overview</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <EmployeeSummaryCards employee={employee} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <EmployeeCalendarCard
              employee={employee}
              month={month}
              year={year}
              selectedDayDate={selectedDayDate}
              onSelectDay={setSelectedDayDate}
            />
            <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <UpdateDayDetailsPanel day={selectedDay} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
