const FULL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export type PeriodState = "past" | "current" | "future";

export interface DateRange {
  start: string;
  end: string;
}

export interface ElapsedPeriodRange {
  range: DateRange | null;
  periodState: PeriodState;
  isInProgress: boolean;
}

export type UpdateDateInput = string | { date: string };

export interface UpdateRangeMetrics {
  expectedCount: number;
  actualCount: number;
  missingCount: number;
  completionRate: number;
}

export interface UpdateTrendComparison {
  current: UpdateRangeMetrics;
  previous: UpdateRangeMetrics;
  deltaCount: number;
  deltaPercent: number;
  deltaCompletionRate: number;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDateFromParts(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseIsoDateParts(isoDate: string) {
  const normalized = normalizeDateOnly(isoDate);
  if (!normalized) {
    return null;
  }

  const year = Number.parseInt(normalized.slice(0, 4), 10);
  const month = Number.parseInt(normalized.slice(5, 7), 10);
  const day = Number.parseInt(normalized.slice(8, 10), 10);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return { year, month, day };
}

function parseDateOnlyAsUtcDate(input: Date | string) {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      return null;
    }

    return new Date(
      Date.UTC(
        input.getUTCFullYear(),
        input.getUTCMonth(),
        input.getUTCDate(),
      ),
    );
  }

  const normalized = normalizeDateOnly(input);
  if (normalized) {
    const parts = parseIsoDateParts(normalized);
    if (!parts) {
      return null;
    }

    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
}

function toIsoDateFromUtcDate(date: Date) {
  return toIsoDateFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

function resolveTodayIso(today?: Date | string) {
  const resolved = today ? parseDateOnlyAsUtcDate(today) : parseDateOnlyAsUtcDate(new Date());
  return resolved ? toIsoDateFromUtcDate(resolved) : toIsoDateFromUtcDate(new Date());
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDayDiffInclusive(startIso: string, endIso: string) {
  const startDate = parseDateOnlyAsUtcDate(startIso);
  const endDate = parseDateOnlyAsUtcDate(endIso);

  if (!startDate || !endDate) {
    return 0;
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / 86_400_000) + 1;
}

function normalizeUpdateDateInput(input: UpdateDateInput) {
  const raw = typeof input === "string" ? input : input.date;
  return normalizeDateOnly(raw);
}

export function getShiftedMonth(year: number, month: number, offset: number) {
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
  };
}

function compareYearMonth(
  leftYear: number,
  leftMonth: number,
  rightYear: number,
  rightMonth: number,
) {
  if (leftYear !== rightYear) {
    return leftYear - rightYear;
  }

  return leftMonth - rightMonth;
}

function forEachDateInRange(range: DateRange, iteratee: (isoDate: string) => void) {
  const startDate = parseDateOnlyAsUtcDate(range.start);
  const endDate = parseDateOnlyAsUtcDate(range.end);

  if (!startDate || !endDate || startDate.getTime() > endDate.getTime()) {
    return;
  }

  let cursor = startDate;
  while (cursor.getTime() <= endDate.getTime()) {
    iteratee(toIsoDateFromUtcDate(cursor));
    cursor = addUtcDays(cursor, 1);
  }
}

export function normalizeDateOnly(value: string) {
  const normalized = value.trim();
  const match = FULL_DATE_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getStartOfWeek(
  value: Date | string,
  weekStartsOn = 0,
) {
  const date = parseDateOnlyAsUtcDate(value);
  if (!date) {
    return null;
  }

  const weekday = date.getUTCDay();
  const diff = (weekday - weekStartsOn + 7) % 7;
  return toIsoDateFromUtcDate(addUtcDays(date, -diff));
}

export function getEndOfWeek(
  value: Date | string,
  weekStartsOn = 0,
) {
  const weekStart = getStartOfWeek(value, weekStartsOn);
  if (!weekStart) {
    return null;
  }

  const startDate = parseDateOnlyAsUtcDate(weekStart);
  if (!startDate) {
    return null;
  }

  return toIsoDateFromUtcDate(addUtcDays(startDate, 6));
}

export function isSunday(value: Date | string) {
  const date = parseDateOnlyAsUtcDate(value);
  return date ? date.getUTCDay() === 0 : false;
}

export function isFutureDate(value: string, today?: Date | string) {
  const normalized = normalizeDateOnly(value);
  if (!normalized) {
    return false;
  }

  return normalized > resolveTodayIso(today);
}

export function getElapsedMonthRange(params: {
  year: number;
  month: number;
  today?: Date | string;
}): ElapsedPeriodRange {
  const { year, month, today } = params;
  const todayDate = parseDateOnlyAsUtcDate(today ?? new Date());

  if (!todayDate) {
    return { range: null, periodState: "future", isInProgress: false };
  }

  const todayYear = todayDate.getUTCFullYear();
  const todayMonth = todayDate.getUTCMonth() + 1;
  const monthComparison = compareYearMonth(year, month, todayYear, todayMonth);

  if (monthComparison > 0) {
    return { range: null, periodState: "future", isInProgress: false };
  }

  const totalDays = getDaysInMonth(year, month);
  if (monthComparison < 0) {
    return {
      range: {
        start: toIsoDateFromParts(year, month, 1),
        end: toIsoDateFromParts(year, month, totalDays),
      },
      periodState: "past",
      isInProgress: false,
    };
  }

  const todayDay = todayDate.getUTCDate();
  return {
    range: {
      start: toIsoDateFromParts(year, month, 1),
      end: toIsoDateFromParts(year, month, todayDay),
    },
    periodState: "current",
    isInProgress: todayDay < totalDays,
  };
}

export function getElapsedWeekRange(params?: {
  referenceDate?: Date | string;
  today?: Date | string;
  weekStartsOn?: number;
}): ElapsedPeriodRange {
  const referenceDate = parseDateOnlyAsUtcDate(params?.referenceDate ?? new Date());
  const todayDate = parseDateOnlyAsUtcDate(params?.today ?? new Date());
  const weekStartsOn = params?.weekStartsOn ?? 0;

  if (!referenceDate || !todayDate) {
    return { range: null, periodState: "future", isInProgress: false };
  }

  const weekStart = getStartOfWeek(referenceDate, weekStartsOn);
  const weekEnd = getEndOfWeek(referenceDate, weekStartsOn);
  if (!weekStart || !weekEnd) {
    return { range: null, periodState: "future", isInProgress: false };
  }

  const todayIso = toIsoDateFromUtcDate(todayDate);

  if (weekStart > todayIso) {
    return { range: null, periodState: "future", isInProgress: false };
  }

  if (weekEnd < todayIso) {
    return {
      range: {
        start: weekStart,
        end: weekEnd,
      },
      periodState: "past",
      isInProgress: false,
    };
  }

  return {
    range: {
      start: weekStart,
      end: todayIso,
    },
    periodState: "current",
    isInProgress: weekEnd !== todayIso,
  };
}

export function getExpectedUpdateCountForRange(
  range: DateRange | null,
  params?: {
    today?: Date | string;
    includeSundays?: boolean;
  },
) {
  if (!range) {
    return 0;
  }

  const includeSundays = params?.includeSundays ?? false;
  const todayIso = resolveTodayIso(params?.today);
  let count = 0;

  forEachDateInRange(range, (isoDate) => {
    if (isoDate > todayIso) {
      return;
    }

    if (!includeSundays && isSunday(isoDate)) {
      return;
    }

    count += 1;
  });

  return count;
}

export function getActualUniqueUpdateCountForRange(params: {
  updates: UpdateDateInput[];
  range: DateRange | null;
  today?: Date | string;
  includeSundays?: boolean;
}) {
  const { updates, range, today, includeSundays = false } = params;

  if (!range) {
    return 0;
  }

  const todayIso = resolveTodayIso(today);
  const uniqueDates = new Set<string>();

  for (const update of updates) {
    const normalized = normalizeUpdateDateInput(update);
    if (!normalized) {
      continue;
    }

    uniqueDates.add(normalized);
  }

  let count = 0;
  for (const isoDate of uniqueDates) {
    if (isoDate < range.start || isoDate > range.end) {
      continue;
    }

    if (isoDate > todayIso) {
      continue;
    }

    if (!includeSundays && isSunday(isoDate)) {
      continue;
    }

    count += 1;
  }

  return count;
}

export function getMissingUpdateCountForRange(params: {
  expectedCount: number;
  actualCount: number;
}) {
  return Math.max(params.expectedCount - params.actualCount, 0);
}

export function getCompletionRateForRange(params: {
  expectedCount: number;
  actualCount: number;
}) {
  const { expectedCount, actualCount } = params;
  if (expectedCount <= 0) {
    return 100;
  }

  return (actualCount / expectedCount) * 100;
}

export function getUpdateMetricsForRange(params: {
  updates: UpdateDateInput[];
  range: DateRange | null;
  today?: Date | string;
  includeSundays?: boolean;
}): UpdateRangeMetrics {
  const expectedCount = getExpectedUpdateCountForRange(params.range, {
    today: params.today,
    includeSundays: params.includeSundays,
  });
  const actualCount = getActualUniqueUpdateCountForRange({
    updates: params.updates,
    range: params.range,
    today: params.today,
    includeSundays: params.includeSundays,
  });
  const missingCount = getMissingUpdateCountForRange({
    expectedCount,
    actualCount,
  });
  const completionRate = getCompletionRateForRange({
    expectedCount,
    actualCount,
  });

  return {
    expectedCount,
    actualCount,
    missingCount,
    completionRate,
  };
}

export function getAlignedPreviousMonthRange(params: {
  year: number;
  month: number;
  today?: Date | string;
}) {
  const { year, month, today } = params;
  const current = getElapsedMonthRange({ year, month, today });
  if (!current.range) {
    return null;
  }

  const previous = getShiftedMonth(year, month, -1);
  const previousTotalDays = getDaysInMonth(previous.year, previous.month);

  if (current.isInProgress) {
    const currentEndParts = parseIsoDateParts(current.range.end);
    const elapsedDay = currentEndParts?.day ?? 1;
    const alignedEndDay = Math.min(elapsedDay, previousTotalDays);

    return {
      start: toIsoDateFromParts(previous.year, previous.month, 1),
      end: toIsoDateFromParts(previous.year, previous.month, alignedEndDay),
    };
  }

  return {
    start: toIsoDateFromParts(previous.year, previous.month, 1),
    end: toIsoDateFromParts(previous.year, previous.month, previousTotalDays),
  };
}

export function getAlignedPreviousWeekRange(params?: {
  referenceDate?: Date | string;
  today?: Date | string;
  weekStartsOn?: number;
}) {
  const elapsedWeek = getElapsedWeekRange(params);
  if (!elapsedWeek.range) {
    return null;
  }

  const currentStartDate = parseDateOnlyAsUtcDate(elapsedWeek.range.start);
  if (!currentStartDate) {
    return null;
  }

  const previousStartDate = addUtcDays(currentStartDate, -7);
  if (elapsedWeek.isInProgress) {
    const elapsedDays = getDayDiffInclusive(
      elapsedWeek.range.start,
      elapsedWeek.range.end,
    );
    const previousEndDate = addUtcDays(previousStartDate, elapsedDays - 1);

    return {
      start: toIsoDateFromUtcDate(previousStartDate),
      end: toIsoDateFromUtcDate(previousEndDate),
    };
  }

  return {
    start: toIsoDateFromUtcDate(previousStartDate),
    end: toIsoDateFromUtcDate(addUtcDays(previousStartDate, 6)),
  };
}

export function getUpdateTrendComparison(params: {
  updates: UpdateDateInput[];
  currentRange: DateRange | null;
  previousRange: DateRange | null;
  today?: Date | string;
  includeSundays?: boolean;
}): UpdateTrendComparison {
  const current = getUpdateMetricsForRange({
    updates: params.updates,
    range: params.currentRange,
    today: params.today,
    includeSundays: params.includeSundays,
  });
  const previous = getUpdateMetricsForRange({
    updates: params.updates,
    range: params.previousRange,
    today: params.today,
    includeSundays: params.includeSundays,
  });

  const deltaCount = current.actualCount - previous.actualCount;
  const deltaPercent =
    previous.actualCount > 0
      ? (deltaCount / previous.actualCount) * 100
      : current.actualCount > 0
        ? 100
        : 0;

  return {
    current,
    previous,
    deltaCount,
    deltaPercent,
    deltaCompletionRate: current.completionRate - previous.completionRate,
  };
}
