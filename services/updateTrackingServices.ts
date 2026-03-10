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
  date: string;
  content: string;
  is_valid: boolean | null;
}

export interface MyProfileResponse {
  user: MyProfileUser;
  statistics: MyProfileStatistics;
  recent_updates: MyProfileRecentUpdate[];
}

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
  const { data } = await api.get<MyProfileResponse>("/update-tracking/my-profile");
  return data;
}
