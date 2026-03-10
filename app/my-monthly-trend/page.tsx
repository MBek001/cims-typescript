import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MemberMonthlyTrend } from "@/components/member-monthly-trend";
import { PermissionGuard } from "@/components/permissionGuard";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const MemberMonthlyTrendPage: React.FC = () => {
  return (
    <PermissionGuard required={["crm", "update_list", "finance_list"]}>
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
          <SiteHeader header="My Monthly Trend" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <MemberMonthlyTrend />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGuard>
  );
};

export default MemberMonthlyTrendPage;

