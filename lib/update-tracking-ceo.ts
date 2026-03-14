import type {
  AllUsersMonthlyUpdatesEmployee,
  AllUsersUpdateEntry,
} from "@/services/updateTrackingServices";
import {
  getDaysInMonth,
  getElapsedMonthRange,
  getUpdateMetricsForRange,
  normalizeDateOnly,
} from "@/lib/update-tracking-period";

export const MONTH_OPTIONS = [
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
] as const;

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type EmployeeDayStatus = "updated" | "missing" | "sunday" | "future";
export type EmployeeStatusLabel = "on_track" | "needs_attention" | "at_risk";
export type EmployeeSortOption =
  | "most_updates"
  | "most_missing"
  | "highest_completion"
  | "latest_update"
  | "name_asc";
export type EmployeeStatusFilter = "all" | EmployeeStatusLabel;

export interface EmployeeCalendarDay {
  day: number;
  date: string;
  weekday: string;
  weekdayIndex: number;
  isSunday: boolean;
  hasUpdate: boolean;
  isFuture: boolean;
  status: EmployeeDayStatus;
  update: AllUsersUpdateEntry | null;
}

export interface EmployeeMonthlyOverview {
  userId: number;
  name: string;
  initials: string;
  updates: AllUsersUpdateEntry[];
  calendarDays: EmployeeCalendarDay[];
  totalWorkdays: number;
  submittedUpdatesCount: number;
  missingWorkdaysCount: number;
  completionRate: number;
  lastUpdateDate: string | null;
  lastUpdateTimestamp: number;
  status: EmployeeStatusLabel;
}

export interface TeamMonthlySummary {
  totalEmployees: number;
  submittedUpdates: number;
  missingWorkdayUpdates: number;
  averageCompletionRate: number;
  topPerformer: EmployeeMonthlyOverview | null;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getTimestampFromString(value: string | undefined | null) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getUpdateTimestamp(update: AllUsersUpdateEntry) {
  const createdAt = getTimestampFromString(update.created_at);
  if (createdAt > 0) {
    return createdAt;
  }

  const normalizedDate = normalizeDateOnly(update.date);
  return normalizedDate ? getTimestampFromString(`${normalizedDate}T00:00:00Z`) : 0;
}

function getWeekdayIndex(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function getInitials(name: string) {
  const chunks = name.trim().split(/\s+/).filter(Boolean);
  if (chunks.length === 0) {
    return "NA";
  }

  if (chunks.length === 1) {
    return chunks[0].slice(0, 2).toUpperCase();
  }

  return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
}

function deriveEmployeeStatus(params: {
  completionRate: number;
  missingWorkdaysCount: number;
}): EmployeeStatusLabel {
  const { completionRate, missingWorkdaysCount } = params;

  if (completionRate >= 85 && missingWorkdaysCount <= 4) {
    return "on_track";
  }

  if (completionRate >= 60 && missingWorkdaysCount <= 10) {
    return "needs_attention";
  }

  return "at_risk";
}

function pickLatestUpdateByDate(updates: AllUsersUpdateEntry[]) {
  const updatesByDate = new Map<string, AllUsersUpdateEntry>();

  for (const update of updates) {
    const normalizedDate = normalizeDateOnly(update.date);
    if (!normalizedDate) {
      continue;
    }

    const existing = updatesByDate.get(normalizedDate);
    if (!existing) {
      updatesByDate.set(normalizedDate, update);
      continue;
    }

    if (getUpdateTimestamp(update) >= getUpdateTimestamp(existing)) {
      updatesByDate.set(normalizedDate, update);
    }
  }

  return updatesByDate;
}

function pickLastUpdate(updates: AllUsersUpdateEntry[]) {
  if (updates.length === 0) {
    return null;
  }

  return updates.reduce((latest, current) => {
    if (!latest) {
      return current;
    }

    return getUpdateTimestamp(current) >= getUpdateTimestamp(latest)
      ? current
      : latest;
  }, null as AllUsersUpdateEntry | null);
}

function belongsToMonth(date: string, year: number, month: number) {
  const normalized = normalizeDateOnly(date);
  if (!normalized) {
    return false;
  }

  return normalized.startsWith(`${year}-${pad2(month)}-`);
}

export function getMonthLabel(month: number) {
  return MONTH_OPTIONS.find((option) => Number(option.value) === month)?.label ?? String(month);
}

export function formatCompletionRate(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

export function formatCompactDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function sortEmployees(
  employees: EmployeeMonthlyOverview[],
  sortBy: EmployeeSortOption,
) {
  const indexed = employees.map((employee, index) => ({ employee, index }));

  indexed.sort((left, right) => {
    const a = left.employee;
    const b = right.employee;
    let comparison = 0;

    switch (sortBy) {
      case "most_updates":
        comparison = b.submittedUpdatesCount - a.submittedUpdatesCount;
        break;
      case "most_missing":
        comparison = b.missingWorkdaysCount - a.missingWorkdaysCount;
        break;
      case "highest_completion":
        comparison = b.completionRate - a.completionRate;
        break;
      case "latest_update":
        comparison = b.lastUpdateTimestamp - a.lastUpdateTimestamp;
        break;
      case "name_asc":
        comparison = a.name.localeCompare(b.name);
        break;
      default:
        comparison = 0;
        break;
    }

    if (comparison !== 0) {
      return comparison;
    }

    // Preserve backend order for ties.
    return left.index - right.index;
  });

  return indexed.map((item) => item.employee);
}

export function buildCalendarGrid(
  days: EmployeeCalendarDay[],
  year: number,
  month: number,
) {
  const firstWeekday = getWeekdayIndex(year, month, 1);
  const prefix = Array.from({ length: firstWeekday }, () => null);
  const cells: Array<EmployeeCalendarDay | null> = [...prefix, ...days];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function buildEmployeeOverviews(params: {
  employees: AllUsersMonthlyUpdatesEmployee[];
  year: number;
  month: number;
  metricsAsOfIso: string;
  todayIso: string;
}) {
  const { employees, year, month, metricsAsOfIso, todayIso } = params;
  const totalDays = getDaysInMonth(year, month);
  const elapsedMonth = getElapsedMonthRange({ year, month, today: metricsAsOfIso });

  return employees.map<EmployeeMonthlyOverview>((employee) => {
    const scopedUpdates = employee.updates.filter((update) =>
      belongsToMonth(update.date, year, month),
    );
    const updatesByDate = pickLatestUpdateByDate(scopedUpdates);
    const calendarDays: EmployeeCalendarDay[] = [];

    for (let day = 1; day <= totalDays; day += 1) {
      const date = toIsoDate(year, month, day);
      const weekdayIndex = getWeekdayIndex(year, month, day);
      const isSunday = weekdayIndex === 0;
      const dayUpdate = updatesByDate.get(date) ?? null;
      const hasUpdate = Boolean(dayUpdate);
      const isFuture = date > todayIso;
      const status: EmployeeDayStatus = isSunday
        ? "sunday"
        : hasUpdate
          ? "updated"
          : isFuture
            ? "future"
            : "missing";

      calendarDays.push({
        day,
        date,
        weekday: WEEKDAY_SHORT[weekdayIndex],
        weekdayIndex,
        isSunday,
        hasUpdate,
        isFuture,
        status,
        update: dayUpdate,
      });
    }

    const metrics = getUpdateMetricsForRange({
      updates: scopedUpdates,
      range: elapsedMonth.range,
      today: metricsAsOfIso,
    });
    const totalWorkdays = metrics.expectedCount;
    const submittedUpdatesCount = metrics.actualCount;
    const missingWorkdaysCount = metrics.missingCount;
    const completionRate = metrics.completionRate;
    const lastUpdate = pickLastUpdate(scopedUpdates);
    const lastUpdateDate = lastUpdate ? normalizeDateOnly(lastUpdate.date) : null;
    const lastUpdateTimestamp = lastUpdate ? getUpdateTimestamp(lastUpdate) : 0;

    return {
      userId: employee.user_id,
      name: employee.name,
      initials: getInitials(employee.name),
      updates: scopedUpdates,
      calendarDays,
      totalWorkdays,
      submittedUpdatesCount,
      missingWorkdaysCount,
      completionRate,
      lastUpdateDate,
      lastUpdateTimestamp,
      status: deriveEmployeeStatus({ completionRate, missingWorkdaysCount }),
    };
  });
}

export function buildTeamSummary(
  employees: EmployeeMonthlyOverview[],
): TeamMonthlySummary {
  const totalEmployees = employees.length;
  const submittedUpdates = employees.reduce(
    (sum, employee) => sum + employee.submittedUpdatesCount,
    0,
  );
  const missingWorkdayUpdates = employees.reduce(
    (sum, employee) => sum + employee.missingWorkdaysCount,
    0,
  );
  const averageCompletionRate =
    totalEmployees > 0
      ? employees.reduce((sum, employee) => sum + employee.completionRate, 0) /
        totalEmployees
      : 0;

  const topPerformer =
    employees.length > 0
      ? employees.reduce<EmployeeMonthlyOverview | null>((best, candidate) => {
          if (!best) {
            return candidate;
          }

          if (candidate.completionRate > best.completionRate) {
            return candidate;
          }

          if (candidate.completionRate < best.completionRate) {
            return best;
          }

          if (candidate.submittedUpdatesCount > best.submittedUpdatesCount) {
            return candidate;
          }

          if (candidate.submittedUpdatesCount < best.submittedUpdatesCount) {
            return best;
          }

          // Keep earlier backend order on exact ties.
          return best;
        }, null)
      : null;

  return {
    totalEmployees,
    submittedUpdates,
    missingWorkdayUpdates,
    averageCompletionRate,
    topPerformer,
  };
}
