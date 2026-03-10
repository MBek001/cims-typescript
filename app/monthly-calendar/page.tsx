import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MemberMonthlyCalendar } from "@/components/member-monthly-calendar";
import { PermissionGuard } from "@/components/permissionGuard";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const MemberMonthlyCalendarPage: React.FC = () => {
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
          <SiteHeader header="Monthly Calendar" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <MemberMonthlyCalendar />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGuard>
  );
};

export default MemberMonthlyCalendarPage;

