import { AppSidebar } from "@/components/app-sidebar";
import { CeoEmployeeUpdateDetailsPage } from "@/components/ceo-employee-update-details-page";
import { PermissionGuard } from "@/components/permissionGuard";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface EmployeeDetailsRouteProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UpdateTrackingCeoEmployeePage({
  params,
}: EmployeeDetailsRouteProps) {
  const resolvedParams = await params;
  const userId = Number.parseInt(resolvedParams.userId, 10);

  return (
    <PermissionGuard required="ceo">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="sidebar" />
        <SidebarInset>
          <SiteHeader header="Employee Update Details" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <CeoEmployeeUpdateDetailsPage userId={userId} />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGuard>
  );
}
