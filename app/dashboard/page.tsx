import { AppSidebar } from "@/components/app-sidebar"
import { CeoMessagesPanel } from "@/components/ceo-messages-panel"
import { PermissionsOverviewPanel } from "@/components/permissions-overview-panel"

import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"


import { UsersTable } from "@/components/users-table"

export default function Page() {
  const tabsIdPrefix = "dashboard-main-tabs"

  return (
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
        <SiteHeader header="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Tabs defaultValue="overview" className="px-4">
                <TabsList>
                  <TabsTrigger
                    value="overview"
                    id={`${tabsIdPrefix}-trigger-overview`}
                    aria-controls={`${tabsIdPrefix}-content-overview`}
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="permissions"
                    id={`${tabsIdPrefix}-trigger-permissions`}
                    aria-controls={`${tabsIdPrefix}-content-permissions`}
                  >
                    Permissions
                  </TabsTrigger>
                  <TabsTrigger
                    value="messages"
                    id={`${tabsIdPrefix}-trigger-messages`}
                    aria-controls={`${tabsIdPrefix}-content-messages`}
                  >
                    Messages
                  </TabsTrigger>
                </TabsList>
                <TabsContent
                  value="overview"
                  id={`${tabsIdPrefix}-content-overview`}
                  aria-labelledby={`${tabsIdPrefix}-trigger-overview`}
                  className="space-y-4"
                >
                  <SectionCards />
                  <UsersTable />
                </TabsContent>
                <TabsContent
                  value="permissions"
                  id={`${tabsIdPrefix}-content-permissions`}
                  aria-labelledby={`${tabsIdPrefix}-trigger-permissions`}
                >
                  <PermissionsOverviewPanel />
                </TabsContent>
                <TabsContent
                  value="messages"
                  id={`${tabsIdPrefix}-content-messages`}
                  aria-labelledby={`${tabsIdPrefix}-trigger-messages`}
                >
                  <CeoMessagesPanel />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
