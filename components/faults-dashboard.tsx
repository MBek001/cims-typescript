"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCcw, ShieldAlert, Users } from "lucide-react";
import {
  addMemberPenalty,
  fetchMemberUpdatesAll,
  type SalaryEstimateDetail,
} from "@/services/memberServices";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const MONTH_OPTIONS = [
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
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

function formatAmount(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

const EMPTY_SALARY_ESTIMATE: SalaryEstimateDetail = {
  base_salary: 0,
  total_penalty_points: 0,
  penalty_percentage: 0,
  deduction_amount: 0,
  estimated_salary: 0,
};

export function FaultsDashboard() {
  const now = React.useMemo(() => new Date(), []);
  const [yearInput, setYearInput] = React.useState(
    String(now.getUTCFullYear()),
  );
  const [monthInput, setMonthInput] = React.useState(
    String(now.getUTCMonth() + 1),
  );

  const year = Number.parseInt(yearInput, 10);
  const month = Number.parseInt(monthInput, 10);
  const validYear = Number.isInteger(year) && year >= 2000 && year <= 2100;
  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const isValidPeriod = validYear && validMonth;
  const [penaltyDialogOpen, setPenaltyDialogOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<{
    user_id: number;
    full_name: string;
  } | null>(null);
  const [penaltyPointsInput, setPenaltyPointsInput] = React.useState("");
  const [reasonInput, setReasonInput] = React.useState("");
  const [penaltyFormError, setPenaltyFormError] = React.useState<string | null>(
    null,
  );

  const faultsQuery = useQuery({
    queryKey: ["ceo", "faults-dashboard", year, month],
    queryFn: () =>
      fetchMemberUpdatesAll({
        year,
        month,
        employeeIds: [],
      }),
    enabled: isValidPeriod,
  });

  const payload = faultsQuery.data;
  const employees = React.useMemo(() => {
    if (!payload) {
      return [];
    }

    return payload.employees.map((employee) => {
      const selectedPeriod =
        employee.periods.find((period) => period.year === year && period.month === month) ??
        employee.periods[0];

      const salaryEstimate = selectedPeriod?.salary_estimate
        ? selectedPeriod.salary_estimate
        : {
            ...EMPTY_SALARY_ESTIMATE,
            base_salary: employee.default_salary ?? 0,
            estimated_salary: employee.default_salary ?? 0,
          };

      return {
        user_id: employee.user_id,
        full_name: employee.full_name,
        penalties_count: selectedPeriod?.reports_count ?? employee.summary.total_reports ?? 0,
        salary_estimate: salaryEstimate,
      };
    });
  }, [payload, year, month]);

  const summary = React.useMemo(() => {
    const totalEstimatedSalary = employees.reduce(
      (sum, employee) => sum + employee.salary_estimate.estimated_salary,
      0,
    );
    const totalDeductionAmount = employees.reduce(
      (sum, employee) => sum + employee.salary_estimate.deduction_amount,
      0,
    );

    return {
      employees_count: payload?.summary.employees_count ?? employees.length,
      total_estimated_salary: totalEstimatedSalary,
      total_deduction_amount: totalDeductionAmount,
    };
  }, [payload, employees]);

  const riskyEmployees = employees.filter(
    (employee) => employee.salary_estimate.penalty_percentage > 0,
  );

  const addPenaltyMutation = useMutation({
    mutationFn: addMemberPenalty,
  });

  function openPenaltyDialog(employee: { user_id: number; full_name: string }) {
    setSelectedEmployee(employee);
    setPenaltyPointsInput("");
    setReasonInput("");
    setPenaltyFormError(null);
    setPenaltyDialogOpen(true);
  }

  async function handlePenaltySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEmployee || !isValidPeriod) {
      setPenaltyFormError("Invalid user or period.");
      return;
    }

    const penaltyPoints = Number.parseFloat(penaltyPointsInput.replace(",", "."));
    if (!Number.isFinite(penaltyPoints)) {
      setPenaltyFormError("Penalty points must be a valid number.");
      return;
    }
    if (penaltyPoints <= 0) {
      setPenaltyFormError("Penalty points must be greater than 0.");
      return;
    }

    setPenaltyFormError(null);

    try {
      await addPenaltyMutation.mutateAsync({
        userId: selectedEmployee.user_id,
        year,
        month,
        penaltyPoints,
        reason: reasonInput,
      });
      setPenaltyDialogOpen(false);
      await faultsQuery.refetch();
    } catch {
      setPenaltyFormError("Failed to add penalty points. Please try again.");
    }
  }

  return (
    <div className="space-y-6 px-4 py-6">
      <Card className="overflow-hidden border-orange-500/20 bg-linear-to-br from-orange-500/10 via-card to-card">
        <CardHeader>
          <CardDescription>CEO Faults Overview</CardDescription>
          <CardTitle className="text-2xl">Salary Deductions and Penalties</CardTitle>
          <CardAction className="flex items-center gap-2">
            <Badge variant="outline">
              {isValidPeriod ? `${month}/${year}` : "Invalid period"}
            </Badge>
            <Badge variant={riskyEmployees.length > 0 ? "destructive" : "success"}>
              {riskyEmployees.length > 0
                ? `${riskyEmployees.length} with penalties`
                : "No active penalties"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="faults-year">Year</Label>
            <Input
              id="faults-year"
              value={yearInput}
              inputMode="numeric"
              placeholder="2026"
              onChange={(event) => {
                const digits = event.target.value.replace(/[^\d]/g, "");
                setYearInput(digits);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faults-month">Month</Label>
            <Select value={monthInput} onValueChange={setMonthInput}>
              <SelectTrigger id="faults-month" className="w-full">
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
          <div className="flex items-end">
            <Button
              variant="outline"
              disabled={!isValidPeriod || faultsQuery.isFetching}
              onClick={() => void faultsQuery.refetch()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isValidPeriod ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Year and month are required integers. Use a valid year (2000-2100)
            and month (1-12).
          </CardContent>
        </Card>
      ) : faultsQuery.isLoading ? (
        <div className="px-1 py-8 text-sm text-muted-foreground">
          Loading faults data...
        </div>
      ) : faultsQuery.isError || !payload ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm text-destructive">
              Failed to load `/members/member/updates/all`.
            </p>
            <Button variant="outline" size="sm" onClick={() => void faultsQuery.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-linear-to-br from-card to-muted/30">
              <CardHeader>
                <CardDescription>Employees in report</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {summary?.employees_count.toLocaleString() ?? 0}
                </CardTitle>
                <CardAction>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total estimated salary</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {formatAmount(summary?.total_estimated_salary ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total deduction amount</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {formatAmount(summary?.total_deduction_amount ?? 0)}
                </CardTitle>
                <CardAction>
                  <Badge
                    variant={
                      (summary?.total_deduction_amount ?? 0) > 0
                        ? "destructive"
                        : "success"
                    }
                  >
                    {(summary?.total_deduction_amount ?? 0) > 0
                      ? "Deductions present"
                      : "No deductions"}
                  </Badge>
                </CardAction>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Employees with penalties</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {riskyEmployees.length.toLocaleString()}
                </CardTitle>
                <CardAction>
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {employees.map((employee) => {
              const penaltyPercentage = clamp(
                employee.salary_estimate.penalty_percentage,
                0,
                100,
              );
              const hasDeduction = employee.salary_estimate.deduction_amount > 0;

              return (
                <Card key={employee.user_id} className="overflow-hidden">
                  <CardHeader>
                    <CardDescription>{`User #${employee.user_id}`}</CardDescription>
                    <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                    <CardAction>
                      <div className="flex items-center gap-2">
                        <Badge variant={hasDeduction ? "destructive" : "outline"}>
                          {hasDeduction ? "Has deduction" : "Clean"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            openPenaltyDialog({
                              user_id: employee.user_id,
                              full_name: employee.full_name,
                            })
                          }
                        >
                          Add penalty
                        </Button>
                      </div>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">Estimated salary</p>
                        <p className="mt-1 text-xl font-semibold tabular-nums">
                          {formatAmount(employee.salary_estimate.estimated_salary)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">Deduction</p>
                        <p className="mt-1 text-xl font-semibold tabular-nums">
                          {formatAmount(employee.salary_estimate.deduction_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">Base salary</p>
                        <p className="mt-1 text-base font-semibold tabular-nums">
                          {formatAmount(employee.salary_estimate.base_salary)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">Penalty points</p>
                        <p className="mt-1 text-base font-semibold tabular-nums">
                          {formatAmount(employee.salary_estimate.total_penalty_points)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">Penalty entries</p>
                        <p className="mt-1 text-base font-semibold tabular-nums">
                          {formatAmount(employee.penalties_count)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Penalty percentage
                        </span>
                        <span>{formatPercent(employee.salary_estimate.penalty_percentage)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${penaltyPercentage}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Members</CardTitle>
              <CardDescription>Detailed salary-estimate breakdown for the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Penalty %</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Deduction</TableHead>
                    <TableHead className="text-right">Estimated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={`row-${employee.user_id}`}>
                      <TableCell>
                        <div className="font-medium">{employee.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          User #{employee.user_id}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(employee.salary_estimate.base_salary)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(employee.salary_estimate.penalty_percentage)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(employee.salary_estimate.total_penalty_points)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(employee.salary_estimate.deduction_amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(employee.salary_estimate.estimated_salary)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={penaltyDialogOpen}
        onOpenChange={(open) => {
          setPenaltyDialogOpen(open);
          if (!open) {
            setPenaltyFormError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Penalty Points</DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? `User #${selectedEmployee.user_id} - ${selectedEmployee.full_name}`
                : "Select a user to add penalty points."}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={(event) => void handlePenaltySubmit(event)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={String(year)} disabled />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input value={String(month)} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="penalty-points">Penalty points</Label>
              <Input
                id="penalty-points"
                value={penaltyPointsInput}
                inputMode="decimal"
                placeholder="10"
                onChange={(event) => setPenaltyPointsInput(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="penalty-reason">Reason (optional)</Label>
              <Textarea
                id="penalty-reason"
                value={reasonInput}
                placeholder="Enter reason"
                onChange={(event) => setReasonInput(event.target.value)}
              />
            </div>

            {penaltyFormError ? (
              <p className="text-sm text-destructive">{penaltyFormError}</p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPenaltyDialogOpen(false)}
                disabled={addPenaltyMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addPenaltyMutation.isPending || !selectedEmployee}>
                {addPenaltyMutation.isPending ? "Saving..." : "Save penalty"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
