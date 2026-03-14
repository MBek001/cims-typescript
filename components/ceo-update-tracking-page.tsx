"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  EmployeeUpdatesOverview,
  UpdateTrackingFilters,
  UpdateTrackingHeaderControls,
  UpdateTrackingLoadingState,
  UpdateTrackingSummaryCards,
} from "@/components/ceo-update-tracking-view";
import {
  buildEmployeeOverviews,
  buildTeamSummary,
  sortEmployees,
  type EmployeeSortOption,
  type EmployeeStatusFilter,
} from "@/lib/update-tracking-ceo";
import {
  getLatestDueUpdateDateIso,
  getLocalTodayIso,
} from "@/lib/update-tracking-deadline";
import { fetchAllUsersMonthlyUpdates } from "@/services/updateTrackingServices";

export function CeoUpdateTrackingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = React.useMemo(() => new Date(), []);
  const todayIso = React.useMemo(() => getLocalTodayIso({ now }), [now]);
  const metricsAsOfIso = React.useMemo(
    () => getLatestDueUpdateDateIso({ now }),
    [now],
  );
  const searchParamsString = searchParams.toString();
  const lastSearchParamsRef = React.useRef(searchParamsString);

  const [yearInput, setYearInput] = React.useState(() => {
    const value = Number.parseInt(searchParams.get("year") ?? "", 10);
    return Number.isInteger(value) ? String(value) : String(now.getFullYear());
  });
  const [monthInput, setMonthInput] = React.useState(() => {
    const value = Number.parseInt(searchParams.get("month") ?? "", 10);
    return Number.isInteger(value) ? String(value) : String(now.getMonth() + 1);
  });
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<EmployeeSortOption>("most_updates");
  const [statusFilter, setStatusFilter] = React.useState<EmployeeStatusFilter>("all");

  const year = Number.parseInt(yearInput, 10);
  const month = Number.parseInt(monthInput, 10);
  const validYear = Number.isInteger(year) && year >= 2000 && year <= 2100;
  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const isValidPeriod = validYear && validMonth;

  const updatesQuery = useQuery({
    queryKey: ["ceo", "update-tracking", "all-users-updates", year, month],
    queryFn: () => fetchAllUsersMonthlyUpdates({ year, month }),
    enabled: isValidPeriod,
  });

  const employeeOverviews = React.useMemo(() => {
    if (!updatesQuery.data || !isValidPeriod) {
      return [];
    }

    return buildEmployeeOverviews({
      employees: updatesQuery.data,
      year,
      month,
      metricsAsOfIso,
      todayIso,
    });
  }, [metricsAsOfIso, todayIso, updatesQuery.data, isValidPeriod, month, year]);

  const summary = React.useMemo(
    () => buildTeamSummary(employeeOverviews),
    [employeeOverviews],
  );

  const filteredEmployees = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const searched = normalizedSearch
      ? employeeOverviews.filter((employee) =>
          employee.name.toLowerCase().includes(normalizedSearch),
        )
      : employeeOverviews;

    const statusFiltered =
      statusFilter === "all"
        ? searched
        : searched.filter((employee) => employee.status === statusFilter);

    return sortEmployees(statusFiltered, sortBy);
  }, [employeeOverviews, search, sortBy, statusFilter]);

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

  const showNoUpdatesState = summary.totalEmployees > 0 && summary.submittedUpdates === 0;

  return (
    <div className="space-y-6 px-4 py-6">
      <UpdateTrackingHeaderControls
        yearInput={yearInput}
        monthInput={monthInput}
        isRefreshing={updatesQuery.isFetching}
        onYearChange={setYearInput}
        onMonthChange={setMonthInput}
        onRefresh={() => void updatesQuery.refetch()}
        disabled={!isValidPeriod}
      />

      {!isValidPeriod ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Year and month are required integers. Use a valid year (2000-2100) and
            month (1-12).
          </CardContent>
        </Card>
      ) : updatesQuery.isLoading ? (
        <UpdateTrackingLoadingState />
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
      ) : employeeOverviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No employees were returned for this month.
          </CardContent>
        </Card>
      ) : (
        <>
          <UpdateTrackingSummaryCards summary={summary} />
          <UpdateTrackingFilters
            search={search}
            sortBy={sortBy}
            statusFilter={statusFilter}
            visibleCount={filteredEmployees.length}
            totalCount={employeeOverviews.length}
            onSearchChange={setSearch}
            onSortChange={setSortBy}
            onStatusChange={setStatusFilter}
          />
          {showNoUpdatesState ? (
            <Card className="border-amber-500/30 bg-amber-500/10">
              <CardContent className="py-4 text-sm text-amber-100">
                No updates were submitted for the selected month.
              </CardContent>
            </Card>
          ) : null}
          <EmployeeUpdatesOverview
            employees={filteredEmployees}
            onViewDetails={(employee) => {
              const params = new URLSearchParams();
              if (isValidPeriod) {
                params.set("year", String(year));
                params.set("month", String(month));
              }

              const query = params.toString();
              router.push(
                query
                  ? `/update-tracking/ceo/${employee.userId}?${query}`
                  : `/update-tracking/ceo/${employee.userId}`,
              );
            }}
          />
        </>
      )}
    </div>
  );
}
