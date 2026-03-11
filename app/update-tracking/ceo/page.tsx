import { AppSidebar } from "@/components/app-sidebar";
import { CeoUpdateTrackingPage } from "@/components/ceo-update-tracking-page";
import { PermissionGuard } from "@/components/permissionGuard";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function UpdateTrackingCeoOverviewPage() {
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
          <SiteHeader header="Team Monthly Updates" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <CeoUpdateTrackingPage />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGuard>
  );
}
