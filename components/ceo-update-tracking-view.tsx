"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Gauge, RefreshCcw, Search, Trophy, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  buildCalendarGrid,
  formatCompactDate,
  formatCompletionRate,
  getMonthLabel,
  MONTH_OPTIONS,
  type EmployeeCalendarDay,
  type EmployeeMonthlyOverview,
  type EmployeeSortOption,
  type EmployeeStatusFilter,
  type EmployeeStatusLabel,
  type TeamMonthlySummary,
} from "@/lib/update-tracking-ceo";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS: Record<EmployeeStatusLabel, string> = {
  on_track: "On Track",
  needs_attention: "Needs Attention",
  at_risk: "At Risk",
};

const SORT_OPTIONS: Array<{ value: EmployeeSortOption; label: string }> = [
  { value: "most_updates", label: "Most updates" },
  { value: "most_missing", label: "Most missing" },
  { value: "highest_completion", label: "Highest completion" },
  { value: "latest_update", label: "Latest update" },
  { value: "name_asc", label: "Name A-Z" },
];

const STATUS_FILTER_OPTIONS: Array<{ value: EmployeeStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "on_track", label: "On Track" },
  { value: "needs_attention", label: "Needs Attention" },
  { value: "at_risk", label: "At Risk" },
];

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getStatusBadgeStyles(status: EmployeeStatusLabel) {
  if (status === "on_track") {
    return { variant: "success" as const, className: "" };
  }

  if (status === "needs_attention") {
    return {
      variant: "secondary" as const,
      className: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
    };
  }

  return { variant: "destructive" as const, className: "" };
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
        dotClassName: "border-emerald-400/70 bg-emerald-500",
      };
    case "missing":
      return {
        label: "Missing",
        badgeVariant: "secondary" as const,
        badgeClassName: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
        cellClassName:
          "border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/15",
        dotClassName: "border-amber-400/70 bg-amber-500",
      };
    case "future":
      return {
        label: "Future",
        badgeVariant: "outline" as const,
        badgeClassName: "text-muted-foreground",
        cellClassName: "border-border/70 bg-muted/15 opacity-80 hover:bg-muted/25",
        dotClassName: "border-border/70 bg-muted/60",
      };
    case "sunday":
    default:
      return {
        label: "Sunday",
        badgeVariant: "outline" as const,
        badgeClassName: "text-muted-foreground",
        cellClassName: "border-border/70 bg-muted/25 hover:bg-muted/35",
        dotClassName: "border-border/70 bg-muted",
      };
  }
}

function formatAsCount(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

export function UpdateTrackingHeaderControls(props: {
  yearInput: string;
  monthInput: string;
  isRefreshing: boolean;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onRefresh: () => void;
  disabled: boolean;
}) {
  const {
    yearInput,
    monthInput,
    isRefreshing,
    onYearChange,
    onMonthChange,
    onRefresh,
    disabled,
  } = props;

  return (
    <Card className="overflow-hidden border-primary/15 bg-linear-to-br from-card via-card to-primary/5">
      <CardHeader>
        <CardDescription>CEO Dashboard</CardDescription>
        <CardTitle className="text-2xl">Team Monthly Updates</CardTitle>
        <CardAction className="flex items-center gap-2">
          <div className="space-y-2">
            <Label htmlFor="ceo-update-tracking-year" className="text-xs text-muted-foreground">
              Year
            </Label>
            <Input
              id="ceo-update-tracking-year"
              value={yearInput}
              placeholder="2026"
              inputMode="numeric"
              className="w-24"
              onChange={(event) =>
                onYearChange(event.target.value.replace(/[^\d]/g, ""))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ceo-update-tracking-month" className="text-xs text-muted-foreground">
              Month
            </Label>
            <Select value={monthInput} onValueChange={onMonthChange}>
              <SelectTrigger id="ceo-update-tracking-month" className="w-40">
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
            disabled={disabled || isRefreshing}
            onClick={onRefresh}
            className="self-end"
          >
            <RefreshCcw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Monitor employee update activity by month.
        </p>
      </CardContent>
    </Card>
  );
}

export function UpdateTrackingSummaryCards({ summary }: { summary: TeamMonthlySummary }) {
  const topPerformerText = summary.topPerformer
    ? `${summary.topPerformer.name} (${formatCompletionRate(summary.topPerformer.completionRate)})`
    : "-";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Card className="bg-linear-to-br from-card to-muted/30">
        <CardHeader>
          <CardDescription>Total Employees</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatAsCount(summary.totalEmployees)}
          </CardTitle>
          <CardAction>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Submitted Updates</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatAsCount(summary.submittedUpdates)}
          </CardTitle>
          <CardAction>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardAction>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Missing Workday Updates</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatAsCount(summary.missingWorkdayUpdates)}
          </CardTitle>
          <CardAction>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardAction>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Average Completion Rate</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatCompletionRate(summary.averageCompletionRate)}
          </CardTitle>
          <CardAction>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Top Performer</CardDescription>
          <CardTitle className="line-clamp-2 text-lg">{topPerformerText}</CardTitle>
          <CardAction>
            <Trophy className="h-4 w-4 text-yellow-400" />
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}

export function UpdateTrackingFilters(props: {
  search: string;
  sortBy: EmployeeSortOption;
  statusFilter: EmployeeStatusFilter;
  visibleCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onSortChange: (value: EmployeeSortOption) => void;
  onStatusChange: (value: EmployeeStatusFilter) => void;
}) {
  const {
    search,
    sortBy,
    statusFilter,
    visibleCount,
    totalCount,
    onSearchChange,
    onSortChange,
    onStatusChange,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filters and Comparison Controls</CardTitle>
        <CardDescription>
          Showing {formatAsCount(visibleCount)} of {formatAsCount(totalCount)} employees
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ceo-update-search">Search employee</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="ceo-update-search"
              placeholder="Search by name"
              className="pl-9"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ceo-update-sort">Sort by</Label>
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as EmployeeSortOption)}>
            <SelectTrigger id="ceo-update-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ceo-update-status-filter">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusChange(value as EmployeeStatusFilter)}
          >
            <SelectTrigger id="ceo-update-status-filter">
              <SelectValue placeholder="Status filter" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmployeeActivityMiniPreview({ days }: { days: EmployeeCalendarDay[] }) {
  return (
    <div className="max-w-[230px] overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-1">
        {days.map((day) => {
          const style = getDayStatusStyles(day.status);
          return (
            <span
              key={day.date}
              className={cn("h-2.5 w-2.5 shrink-0 rounded-full border", style.dotClassName)}
              title={`${day.date} | ${style.label}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function EmployeeRowStatusBadge({ status }: { status: EmployeeStatusLabel }) {
  const style = getStatusBadgeStyles(status);
  return (
    <Badge variant={style.variant} className={style.className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function EmployeeUpdatesOverview(props: {
  employees: EmployeeMonthlyOverview[];
  onViewDetails: (employee: EmployeeMonthlyOverview) => void;
}) {
  const { employees, onViewDetails } = props;

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No employees match the current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Missing</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead>Monthly Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const completionBadgeStyle = getStatusBadgeStyles(employee.status);

                  return (
                    <TableRow
                      key={employee.userId}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => onViewDetails(employee)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onViewDetails(employee);
                        }
                      }}
                      tabIndex={0}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{employee.initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{employee.submittedUpdatesCount}</TableCell>
                      <TableCell className="tabular-nums">{employee.missingWorkdaysCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={completionBadgeStyle.variant}
                          className={completionBadgeStyle.className}
                        >
                          {formatCompletionRate(employee.completionRate)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCompactDate(employee.lastUpdateDate)}</TableCell>
                      <TableCell>
                        <EmployeeActivityMiniPreview days={employee.calendarDays} />
                      </TableCell>
                      <TableCell>
                        <EmployeeRowStatusBadge status={employee.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onViewDetails(employee);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:hidden">
        {employees.map((employee) => {
          const completionBadgeStyle = getStatusBadgeStyles(employee.status);

          return (
            <Card
              key={employee.userId}
              className="cursor-pointer transition-colors hover:bg-muted/20"
              onClick={() => onViewDetails(employee)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onViewDetails(employee);
                }
              }}
              tabIndex={0}
            >
              <CardHeader>
                <CardTitle className="text-base">{employee.name}</CardTitle>
                <CardDescription>Last update: {formatCompactDate(employee.lastUpdateDate)}</CardDescription>
                <CardAction>
                  <EmployeeRowStatusBadge status={employee.status} />
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md border border-border/70 bg-background/70 p-2">
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {employee.submittedUpdatesCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/70 p-2">
                    <p className="text-muted-foreground">Missing</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {employee.missingWorkdaysCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/70 p-2">
                    <p className="text-muted-foreground">Completion</p>
                    <Badge
                      variant={completionBadgeStyle.variant}
                      className={cn("mt-1", completionBadgeStyle.className)}
                    >
                      {formatCompletionRate(employee.completionRate)}
                    </Badge>
                  </div>
                </div>
                <EmployeeActivityMiniPreview days={employee.calendarDays} />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewDetails(employee);
                  }}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function UpdateDayDetailsPanel({ day }: { day: EmployeeCalendarDay | null }) {
  if (!day) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Select a day to view full update details.
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
        <CardDescription>{`${day.weekday} • ${style.label}`}</CardDescription>
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
            Submitted: {formatCompactDate(day.update.created_at)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function EmployeeDetailsDrawer(props: {
  employee: EmployeeMonthlyOverview | null;
  open: boolean;
  month: number;
  year: number;
  onOpenChange: (open: boolean) => void;
}) {
  const { employee, open, month, year, onOpenChange } = props;
  const isMobile = useIsMobile();
  const [selectedDayDate, setSelectedDayDate] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!employee) {
      setSelectedDayDate(null);
      return;
    }

    const preferredDay =
      employee.calendarDays.find((day) => day.hasUpdate) ?? employee.calendarDays[0] ?? null;
    setSelectedDayDate(preferredDay?.date ?? null);
  }, [employee]);

  const calendarCells = React.useMemo(() => {
    if (!employee) {
      return [];
    }

    return buildCalendarGrid(employee.calendarDays, year, month);
  }, [employee, month, year]);

  const selectedDay = React.useMemo(() => {
    if (!employee || !selectedDayDate) {
      return null;
    }

    return employee.calendarDays.find((day) => day.date === selectedDayDate) ?? null;
  }, [employee, selectedDayDate]);

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-4xl">
        <DrawerHeader className="border-b">
          <DrawerTitle>{employee?.name ?? "Employee Details"}</DrawerTitle>
          <DrawerDescription>
            {employee
              ? `${getMonthLabel(month)} ${year} monthly update details`
              : "No employee selected"}
          </DrawerDescription>
          <div className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {employee ? (
          <div className="space-y-4 overflow-y-auto p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardDescription>Submitted updates</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {employee.submittedUpdatesCount}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Missing workdays</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {employee.missingWorkdaysCount}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Completion rate</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {formatCompletionRate(employee.completionRate)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Last update</CardDescription>
                  <CardTitle className="text-lg">
                    {formatCompactDate(employee.lastUpdateDate)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Calendar</CardTitle>
                <CardDescription>
                  Updated days are green, missing workdays are amber, Sundays are neutral.
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
                <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium text-muted-foreground">
                  {WEEKDAY_HEADERS.map((weekday) => (
                    <div key={weekday}>{weekday}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarCells.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="min-h-[110px] rounded-md border border-dashed border-border/40" />;
                    }

                    const style = getDayStatusStyles(day.status);
                    const isSelected = day.date === selectedDayDate;
                    const updateContent = day.update?.content?.trim();

                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedDayDate(day.date)}
                        className={cn(
                          "min-h-[110px] rounded-md border p-2 text-left transition-colors",
                          style.cellClassName,
                          isSelected && "ring-2 ring-primary/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <p className="text-sm font-semibold">{day.day}</p>
                            <p className="text-[11px] text-muted-foreground">{day.weekday}</p>
                          </div>
                          <Badge variant={style.badgeVariant} className={cn("text-[10px]", style.badgeClassName)}>
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

            <UpdateDayDetailsPanel day={selectedDay} />
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">No employee selected.</div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export function UpdateTrackingLoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={`summary-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}
