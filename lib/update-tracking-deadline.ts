function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDateInLocalTimezone(date: Date) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function getLocalTodayIso(params?: { now?: Date }) {
  const now = params?.now ?? new Date();
  return toIsoDateInLocalTimezone(now);
}

export function getLatestDueUpdateDateIso(params?: {
  now?: Date;
  deadlineHour?: number;
}) {
  const now = params?.now ?? new Date();
  const deadlineHour = params?.deadlineHour ?? 5;

  const latestDueDate = new Date(now.getTime());
  latestDueDate.setHours(0, 0, 0, 0);

  const daysToSubtract = now.getHours() < deadlineHour ? 2 : 1;
  latestDueDate.setDate(latestDueDate.getDate() - daysToSubtract);

  return toIsoDateInLocalTimezone(latestDueDate);
}
