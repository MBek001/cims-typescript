"use client"

import * as React from "react"
import { IconTrendingDown, IconTrendingUp, IconUsers, IconMessageCircle } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import useDashboardStore from "@/stores/useAdminStats"

export function SectionCards() {
  const statistics = useDashboardStore((s) => s.statistics)
  const loading = useDashboardStore((s) => s.loading)
  const error = useDashboardStore((s) => s.error)
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard)

  React.useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard]) // stable because it's the function reference from zustand

  if (loading) {
    return <div className="p-4">Loading dashboard...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>
  }

  const userCount = statistics.user_count
  const active = statistics.active_user_count
  const inactive = statistics.inactive_user_count
  const messages = statistics.messages_count

  // placeholder trends
  const userTrend = userCount > 0 ? "+5%" : "0%"
  const activeTrend = active >= inactive ? "+8%" : "-3%"
  const messageTrend = messages > 100 ? "+12%" : "-5%"

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-1 gap-4 *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">


      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {userCount.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {userTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Active: {active.toLocaleString()} <IconUsers className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Inactive: {inactive.toLocaleString()} users
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {active.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {active >= inactive ? <IconTrendingUp /> : <IconTrendingDown />}
              {activeTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Retention is {active >= inactive ? "strong" : "weak"} <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {active >= inactive
              ? "More active than inactive users"
              : "Inactive users exceed active"}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Messages</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {messages.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {messages > 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {messageTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total messages exchanged <IconMessageCircle className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Shows overall conversation volume
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Inactive Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {inactive.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown />
              {inactive > active ? "-7%" : "+2%"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {inactive > active ? "Needs re-engagement" : "Healthy status"} <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {inactive > active
              ? "Consider campaigns to revive users"
              : "Low churn rate currently"}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}