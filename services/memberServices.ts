import api from "@/lib/api";
import type { GenericUpdateItem } from "@/services/updateTrackingServices";

export interface SalaryEstimateRecord {
  [key: string]: string | number | boolean | null | undefined;
}

export interface SalaryEstimateDetail {
  base_salary: number;
  total_penalty_points: number;
  penalty_percentage: number;
  deduction_amount: number;
  salary_after_penalty: number;
  total_bonus_amount: number;
  final_salary: number;
  estimated_salary: number;
}

export interface SalaryEstimateEmployee {
  user_id: number;
  full_name: string;
  penalties_count: number;
  bonuses_count: number;
  salary_estimate: SalaryEstimateDetail;
}

export interface MemberSalaryPenaltyItem {
  id: number;
  penalty_points: number;
  reason: string | null;
  created_at: string;
}

export interface MemberSalaryBonusItem {
  id: number;
  bonus_amount: number;
  reason: string | null;
  created_at: string;
}

export interface MemberSalaryEstimateResponse {
  user: {
    id: number;
    full_name: string;
  };
  period: {
    year: number;
    month: number;
  };
  penalties_count: number;
  penalties: MemberSalaryPenaltyItem[];
  bonuses_count: number;
  bonuses: MemberSalaryBonusItem[];
  salary_estimate: SalaryEstimateDetail;
}

export interface SalaryEstimateSummary {
  employees_count: number;
  total_base_salary: number;
  total_deduction_amount: number;
  total_bonus_amount: number;
  total_final_salary: number;
  total_estimated_salary: number;
}

export interface MemberSalaryEstimatesResponse {
  period: {
    year: number;
    month: number;
  };
  filters: {
    employee_ids: number[];
  };
  summary: SalaryEstimateSummary;
  employees: SalaryEstimateEmployee[];
}

export interface MemberUpdatesAllPeriod {
  year: number;
  month: number;
  month_name: string;
  reports_count: number;
  average_update_percentage: number;
  total_penalty_points: number;
  total_salary_amount: number;
  salary_estimate: SalaryEstimateDetail;
  latest_report_date: string | null;
}

export interface MemberUpdatesAllEmployee {
  user_id: number;
  full_name: string;
  default_salary: number;
  summary: {
    periods_count: number;
    total_reports: number;
    average_update_percentage: number;
  };
  periods: MemberUpdatesAllPeriod[];
}

export interface MemberUpdatesAllSummary {
  employees_count: number;
  periods_count: number;
  total_reports: number;
  average_update_percentage: number;
}

export interface MemberUpdatesAllResponse {
  filters: {
    year: number;
    month: number;
    employee_ids: number[];
  };
  summary: MemberUpdatesAllSummary;
  employees: MemberUpdatesAllEmployee[];
}

export interface AddMemberPenaltyParams {
  userId: number;
  year: number;
  month: number;
  penaltyPoints: number;
  reason?: string;
}

export interface AddMemberPenaltyResponse {
  message: string;
  penalty_id: number;
  user_id: number;
  year: number;
  month: number;
  penalty_points: number;
}

function assertInteger(value: number, field: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
}

function normalizeRecordList(data: unknown): GenericUpdateItem[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is GenericUpdateItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  if (
    data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray(data.items)
  ) {
    return data.items.filter(
      (item): item is GenericUpdateItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  return [];
}

export async function fetchMemberUpdates(): Promise<GenericUpdateItem[]> {
  const { data } = await api.get<unknown>("/members/member/updates");
  return normalizeRecordList(data);
}

export async function fetchSalaryEstimates(
  year: number,
  month: number,
): Promise<SalaryEstimateRecord[]> {
  const { data } = await api.get<unknown>(
    `/members/member/salary-estimates?year=${year}&month=${month}`,
  );
  return normalizeRecordList(data);
}

export async function fetchMemberSalaryEstimates(params: {
  year: number;
  month: number;
  employeeIds?: number[];
}): Promise<MemberSalaryEstimatesResponse> {
  assertInteger(params.year, "year");
  assertInteger(params.month, "month");

  const employeeIds = params.employeeIds ?? [];
  employeeIds.forEach((id) => assertInteger(id, "employee_id"));

  const query = new URLSearchParams();
  query.set("year", String(params.year));
  query.set("month", String(params.month));
  employeeIds.forEach((id) => query.append("employee_ids", String(id)));

  const { data } = await api.get<MemberSalaryEstimatesResponse>(
    `/members/member/salary-estimates?${query.toString()}`,
  );
  return data;
}

export async function fetchMemberSalaryEstimate(params: {
  userId: number;
  year: number;
  month: number;
}): Promise<MemberSalaryEstimateResponse> {
  assertInteger(params.userId, "user_id");
  assertInteger(params.year, "year");
  assertInteger(params.month, "month");

  const query = new URLSearchParams();
  query.set("user_id", String(params.userId));
  query.set("year", String(params.year));
  query.set("month", String(params.month));

  const { data } = await api.get<MemberSalaryEstimateResponse>(
    `/members/member/salary-estimate?${query.toString()}`,
  );

  return data;
}

export async function fetchMemberUpdatesAll(params: {
  year: number;
  month: number;
  employeeIds?: number[];
}): Promise<MemberUpdatesAllResponse> {
  assertInteger(params.year, "year");
  assertInteger(params.month, "month");

  const employeeIds = params.employeeIds ?? [];
  employeeIds.forEach((id) => assertInteger(id, "employee_id"));

  const query = new URLSearchParams();
  query.set("year", String(params.year));
  query.set("month", String(params.month));
  employeeIds.forEach((id) => query.append("employee_ids", String(id)));

  const { data } = await api.get<MemberUpdatesAllResponse>(
    `/members/member/updates/all?${query.toString()}`,
  );

  return data;
}

export async function addMemberPenalty(
  params: AddMemberPenaltyParams,
): Promise<AddMemberPenaltyResponse> {
  assertInteger(params.userId, "user_id");
  assertInteger(params.year, "year");
  assertInteger(params.month, "month");

  if (!Number.isFinite(params.penaltyPoints)) {
    throw new Error("penalty_points must be a finite number");
  }

  const query = new URLSearchParams();
  query.set("user_id", String(params.userId));
  query.set("year", String(params.year));
  query.set("month", String(params.month));
  query.set("penalty_points", String(params.penaltyPoints));

  const reason = params.reason?.trim();
  if (reason) {
    query.set("reason", reason);
  }

  const { data } = await api.post<AddMemberPenaltyResponse>(
    `/members/member/penalties/add?${query.toString()}`,
  );

  return data;
}
