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
  estimated_salary: number;
}

export interface SalaryEstimateEmployee {
  user_id: number;
  full_name: string;
  penalties_count: number;
  salary_estimate: SalaryEstimateDetail;
}

export interface SalaryEstimateSummary {
  employees_count: number;
  total_base_salary: number;
  total_deduction_amount: number;
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
  employeeIds: number[];
}): Promise<MemberSalaryEstimatesResponse> {
  const query = new URLSearchParams();
  query.set("year", String(params.year));
  query.set("month", String(params.month));
  params.employeeIds.forEach((id) => query.append("employee_ids", String(id)));

  const { data } = await api.get<MemberSalaryEstimatesResponse>(
    `/members/member/salary-estimates?${query.toString()}`,
  );
  return data;
}
