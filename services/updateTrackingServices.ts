import api from "@/lib/api";

export interface UpdateTrackingStats {
  user_id: number;
  user_name: string;
  total_updates: number;
  updates_this_week: number;
  updates_last_week: number;
  updates_this_month: number;
  updates_last_month: number;
  updates_last_3_months: number;
  percentage_this_week: number;
  percentage_last_week: number;
  percentage_this_month: number;
  percentage_last_3_months: number;
  expected_updates_per_week: number;
}

export interface CompanyUpdateStats {
  total_employees: number;
  total_updates_today: number;
  total_updates_this_week: number;
  avg_percentage_this_week: number;
  avg_percentage_last_week: number;
  avg_percentage_this_month: number;
  avg_percentage_last_3_months: number;
}

export interface GenericUpdateItem {
  [key: string]: string | number | boolean | null | undefined;
}

export interface MyDailyCalendarItem {
  day: number;
  date: string;
  weekday: string;
  is_sunday: boolean;
  has_update: boolean;
  update_content: string | null;
  is_valid: boolean | null;
  created_at?: string | null;
  update_created_at?: string | null;
}

export interface MyDailyCalendarResponse {
  month: number;
  year: number;
  working_days: number;
  sundays_count: number;
  total_days: number;
  update_days: number;
  missing_days: number;
  percentage: number;
  calendar: MyDailyCalendarItem[];
}

export interface MyTrendItem {
  month: number;
  year: number;
  month_name: string;
  working_days: number;
  update_days: number;
  percentage: number;
}

export interface MyTrendsResponse {
  trends: MyTrendItem[];
  average_percentage: number;
}

export interface MyProfileUser {
  id: number;
  name: string;
  telegram_id: string | null;
  role: string;
  is_active?: boolean;
}

export interface MyProfileStatistics {
  total_updates: number;
  this_week: number;
  this_month: number;
  percentage_this_week: number;
  percentage_this_month: number;
  percentage_last_3_months: number;
}

export interface MyProfileRecentUpdate {
  id?: number;
  date: string;
  content: string;
  is_valid: boolean | null;
  created_at?: string;
}

export interface MyProfileResponse {
  user: MyProfileUser;
  statistics: MyProfileStatistics;
  recent_updates: MyProfileRecentUpdate[];
}

export interface AllUsersUpdateEntry {
  id: number;
  date: string;
  content: string;
  is_valid: boolean | null;
  created_at: string;
}

export interface AllUsersMonthlyUpdatesEmployee {
  user_id: number;
  name: string;
  updates: AllUsersUpdateEntry[];
}

export type AllUsersMonthlyUpdatesResponse = AllUsersMonthlyUpdatesEmployee[];

function normalizeUpdateList(data: unknown): GenericUpdateItem[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is GenericUpdateItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  if (
    data &&
    typeof data === "object" &&
    "updates" in data &&
    Array.isArray(data.updates)
  ) {
    return data.updates.filter(
      (item): item is GenericUpdateItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNumber(source: Record<string, unknown>, key: string) {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

function readBoolean(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
}

function normalizeMyProfileResponse(payload: unknown): MyProfileResponse {
  const root = isRecord(payload) ? payload : {};
  const userSource = isRecord(root.user) ? root.user : {};
  const overallSource = isRecord(root.overall_stats) ? root.overall_stats : {};
  const statisticsSource = isRecord(root.statistics) ? root.statistics : {};
  const recentRaw = Array.isArray(root.recent_updates) ? root.recent_updates : [];

  const userId =
    readNumber(userSource, "id") ??
    readNumber(root, "user_id") ??
    0;
  const userName =
    readString(userSource, "name") ??
    readString(root, "user_name") ??
    "";

  const normalizedRecentUpdates: MyProfileRecentUpdate[] = recentRaw
    .filter(isRecord)
    .map((item) => ({
      id: readNumber(item, "id") ?? undefined,
      date: readString(item, "date") ?? readString(item, "update_date") ?? "",
      content:
        readString(item, "content") ??
        readString(item, "update_content") ??
        "",
      is_valid: readBoolean(item, "is_valid"),
      created_at:
        readString(item, "created_at") ??
        undefined,
    }))
    .filter((item) => item.date.length > 0 || item.content.length > 0);

  const thisWeekUpdates =
    readNumber(overallSource, "updates_this_week") ??
    readNumber(root, "updates_this_week") ??
    0;
  const thisMonthUpdates =
    readNumber(overallSource, "updates_this_month") ??
    readNumber(root, "updates_this_month") ??
    readNumber(statisticsSource, "update_days") ??
    0;

  return {
    user: {
      id: userId,
      name: userName,
      telegram_id: readString(userSource, "telegram_id"),
      role: readString(userSource, "role") ?? "",
      is_active: readBoolean(userSource, "is_active") ?? undefined,
    },
    statistics: {
      total_updates:
        readNumber(overallSource, "total_updates") ??
        readNumber(root, "total_updates") ??
        0,
      this_week: thisWeekUpdates,
      this_month: thisMonthUpdates,
      percentage_this_week:
        readNumber(overallSource, "percentage_this_week") ??
        readNumber(root, "percentage_this_week") ??
        0,
      percentage_this_month:
        readNumber(overallSource, "percentage_this_month") ??
        readNumber(root, "percentage_this_month") ??
        readNumber(statisticsSource, "percentage") ??
        0,
      percentage_last_3_months:
        readNumber(overallSource, "percentage_last_3_months") ??
        readNumber(root, "percentage_last_3_months") ??
        0,
    },
    recent_updates: normalizedRecentUpdates,
  };
}

export async function fetchCompanyUpdateStats(): Promise<CompanyUpdateStats> {
  const { data } = await api.get<CompanyUpdateStats>(
    "/update-tracking/company-stats",
  );
  return data;
}

export async function fetchMyUpdateStats(): Promise<UpdateTrackingStats> {
  const { data } = await api.get<UpdateTrackingStats>(
    "/update-tracking/stats/me",
  );
  return data;
}

export async function fetchRecentUpdates(
  limit = 20,
): Promise<GenericUpdateItem[]> {
  const { data } = await api.get<unknown>(`/update-tracking/recent?limit=${limit}`);
  return normalizeUpdateList(data);
}

function assertInteger(value: number, field: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
}

export async function fetchMyDailyCalendar(params?: {
  month?: number;
  year?: number;
}): Promise<MyDailyCalendarResponse> {
  const query = new URLSearchParams();

  if (typeof params?.month === "number") {
    assertInteger(params.month, "month");
    query.set("month", String(params.month));
  }

  if (typeof params?.year === "number") {
    assertInteger(params.year, "year");
    query.set("year", String(params.year));
  }

  const suffix = query.toString();
  const url = suffix
    ? `/update-tracking/my-daily-calendar?${suffix}`
    : "/update-tracking/my-daily-calendar";

  const { data } = await api.get<MyDailyCalendarResponse>(url);
  return data;
}

export async function fetchMyTrends(): Promise<MyTrendsResponse> {
  const { data } = await api.get<MyTrendsResponse>("/update-tracking/my-trends");
  return data;
}

export async function fetchMyProfile(): Promise<MyProfileResponse> {
  const { data } = await api.get<unknown>("/update-tracking/my-report");
  return normalizeMyProfileResponse(data);
}

export async function fetchAllUsersMonthlyUpdates(params: {
  year: number;
  month: number;
}): Promise<AllUsersMonthlyUpdatesResponse> {
  assertInteger(params.year, "year");
  assertInteger(params.month, "month");

  const query = new URLSearchParams();
  query.set("year", String(params.year));
  query.set("month", String(params.month));

  const { data } = await api.get<AllUsersMonthlyUpdatesResponse>(
    `/update-tracking/all-users-updates?${query.toString()}`,
  );

  return data;
}
