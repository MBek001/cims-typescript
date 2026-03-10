"use client";

import * as React from "react";
import {
  IconDashboard,
  IconHome,
  IconChartBar,
  IconCreditCard,
  IconCircleCheck,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import useAuthStore from "@/stores/useAuthStore";
import { getDashboardRouteForUser, isAuthenticated } from "@/helpers/authHelpers";
import { useRouter } from "next/navigation";

const navMain: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",  
    icon: IconHome,
    permission: "ceo",
  },
  { title: "Sales", url: "/sales", icon: IconChartBar, permission: "crm" },
  { title: "Payment", url: "/payment", icon: IconCreditCard, permission: "payment_list" },
  { title: "Updates", url: "/update-list", icon: IconCircleCheck, permission: "update_list" },
  { title: "Faults", url: "/faults", icon: IconAlertTriangle, permission: "ceo" },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = React.useState(
    () => !isAuthenticated() || Boolean(useAuthStore.getState().user),
  );

  const sidebarItems = React.useMemo(() => {
    const isMemberUser =
      !!user && getDashboardRouteForUser(user) === "/member_dashboard";

    if (!isMemberUser) {
      return navMain;
    }

    return navMain.flatMap((item) => {
      if (item.url !== "/update-list") {
        return [item];
      }

      return [
        {
          ...item,
          title: "Member Dashboard",
          url: "/member_dashboard",
          icon: IconDashboard,
        },
        {
          ...item,
          title: "My Monthly Trend",
          url: "/my-monthly-trend",
          icon: IconChartBar,
        },
        {
          ...item,
          title: "Monthly Calendar",
          url: "/monthly-calendar",
          icon: IconCircleCheck,
        },
      ];
    });
  }, [user]);

  // Check authentication & load user
  React.useEffect(() => {
    if (!isAuthenticated()) {
      setCheckedAuth(true);
      return;
    }

    if (user) {
      setCheckedAuth(true);
      return;
    }

    if (!loading) {
      fetchUser().finally(() => setCheckedAuth(true));
    }
  }, [user, loading, fetchUser]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (checkedAuth && !isAuthenticated()) {
      router.replace("/login");
    }
  }, [checkedAuth, router]);

  // Loading state while checking auth
  if (!checkedAuth) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">
          Checking authentication...
        </span>
      </div>
    );
  }

  // If not authenticated, render nothing (redirect will fire)
  if (!isAuthenticated()) {
    return null;
  }

  const displayUser = {
    name: user ? `${user.name} ${user.surname}` : "Loading...",
    email: user?.email ?? "",
    avatar: "/avatars/default.jpg",
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <span className="text-base font-semibold">Cognilabs</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
