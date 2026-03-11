import type {
  AllUsersMonthlyUpdatesEmployee,
  AllUsersUpdateEntry,
} from "@/services/updateTrackingServices";

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
const FULL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

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

function normalizeDateOnly(value: string): string | null {
  const normalized = value.trim();
  const match = FULL_DATE_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
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

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
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
  return [...employees].sort((a, b) => {
    switch (sortBy) {
      case "most_updates":
        return (
          b.submittedUpdatesCount - a.submittedUpdatesCount ||
          b.completionRate - a.completionRate ||
          a.name.localeCompare(b.name)
        );
      case "most_missing":
        return (
          b.missingWorkdaysCount - a.missingWorkdaysCount ||
          a.completionRate - b.completionRate ||
          a.name.localeCompare(b.name)
        );
      case "highest_completion":
        return (
          b.completionRate - a.completionRate ||
          b.submittedUpdatesCount - a.submittedUpdatesCount ||
          a.name.localeCompare(b.name)
        );
      case "latest_update":
        return (
          b.lastUpdateTimestamp - a.lastUpdateTimestamp ||
          a.name.localeCompare(b.name)
        );
      case "name_asc":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });
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
  todayIso: string;
}) {
  const { employees, year, month, todayIso } = params;
  const totalDays = getDaysInMonth(year, month);

  return employees.map<EmployeeMonthlyOverview>((employee) => {
    const scopedUpdates = employee.updates.filter((update) =>
      belongsToMonth(update.date, year, month),
    );
    const updatesByDate = pickLatestUpdateByDate(scopedUpdates);
    const calendarDays: EmployeeCalendarDay[] = [];

    let totalWorkdays = 0;
    let submittedUpdatesCount = 0;

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

      if (!isSunday) {
        totalWorkdays += 1;
        if (hasUpdate) {
          submittedUpdatesCount += 1;
        }
      }

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

    const missingWorkdaysCount = Math.max(totalWorkdays - submittedUpdatesCount, 0);
    const completionRate =
      totalWorkdays > 0 ? (submittedUpdatesCount / totalWorkdays) * 100 : 100;
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
      ? [...employees].sort(
          (a, b) =>
            b.completionRate - a.completionRate ||
            b.submittedUpdatesCount - a.submittedUpdatesCount ||
            a.name.localeCompare(b.name),
        )[0]
      : null;

  return {
    totalEmployees,
    submittedUpdates,
    missingWorkdayUpdates,
    averageCompletionRate,
    topPerformer,
  };
}
