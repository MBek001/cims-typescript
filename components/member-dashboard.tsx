'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Gauge, Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { fetchMemberSalaryEstimate } from '@/services/memberServices'
import { fetchMyUpdateStats } from '@/services/updateTrackingServices'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'

const comparisonChartConfig = {
	current: {
		label: 'Current',
		color: 'var(--chart-1)',
	},
	previous: {
		label: 'Previous',
		color: 'var(--chart-3)',
	},
} satisfies ChartConfig

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}

function formatPercent(value: number) {
	return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`
}

function formatSignedNumber(value: number) {
	return `${value > 0 ? '+' : ''}${value}`
}

function formatAmount(value: number) {
	return Number.isFinite(value) ? value.toLocaleString() : '0'
}

function TrendBadge({ value }: { value: number }) {
	if (value === 0) {
		return <Badge variant='outline'>No change</Badge>
	}

	if (value > 0) {
		return (
			<Badge variant='success'>
				<ArrowUpRight className='h-3 w-3' />
				{formatSignedNumber(value)}
			</Badge>
		)
	}

	return (
		<Badge variant='destructive'>
			<ArrowDownRight className='h-3 w-3' />
			{formatSignedNumber(value)}
		</Badge>
	)
}

export function MemberDashboard() {
	const now = new Date()
	const salaryYear = now.getUTCFullYear()
	const salaryMonth = now.getUTCMonth() + 1

	const statsQuery = useQuery({
		queryKey: ['member-dashboard', 'my-update-stats'],
		queryFn: fetchMyUpdateStats,
	})

	const currentUserId = statsQuery.data?.user_id

	const salaryQuery = useQuery({
		queryKey: [
			'member-dashboard',
			'salary-estimate',
			salaryYear,
			salaryMonth,
			currentUserId,
		],
		queryFn: () => {
			if (!currentUserId) {
				throw new Error('Missing current user id')
			}

			return fetchMemberSalaryEstimate({
				userId: currentUserId,
				year: salaryYear,
				month: salaryMonth,
			})
		},
		enabled: typeof currentUserId === 'number' && currentUserId > 0,
	})

	if (statsQuery.isLoading) {
		return (
			<div className='px-4 py-8 text-sm text-muted-foreground'>
				Loading member dashboard...
			</div>
		)
	}

	if (statsQuery.error || !statsQuery.data) {
		return (
			<div className='space-y-4 px-4 py-8'>
				<p className='text-sm text-destructive'>
					Failed to load dashboard data from `/update-tracking/stats/me`.
				</p>
				<Button variant='outline' onClick={() => void statsQuery.refetch()}>
					Try again
				</Button>
			</div>
		)
	}

	const stats = statsQuery.data
	const weeklyDelta = stats.updates_this_week - stats.updates_last_week
	const monthlyDelta = stats.updates_this_month - stats.updates_last_month
	const weeklyProgressRaw =
		stats.expected_updates_per_week > 0
			? (stats.updates_this_week / stats.expected_updates_per_week) * 100
			: 0
	const weeklyProgress = clamp(weeklyProgressRaw, 0, 100)
	const remainingToTarget = Math.max(
		stats.expected_updates_per_week - stats.updates_this_week,
		0,
	)
	const overTarget = Math.max(
		stats.updates_this_week - stats.expected_updates_per_week,
		0,
	)

	const comparisonChartData = [
		{
			period: 'Week',
			current: stats.updates_this_week,
			previous: stats.updates_last_week,
		},
		{
			period: 'Month',
			current: stats.updates_this_month,
			previous: stats.updates_last_month,
		},
	]

	const completionRows = [
		{ label: 'This week', value: stats.percentage_this_week },
		{ label: 'Last week', value: stats.percentage_last_week },
		{ label: 'This month', value: stats.percentage_this_month },
		{ label: 'Last 3 months', value: stats.percentage_last_3_months },
	]

	const mySalaryData = salaryQuery.data ?? null
	const mySalaryEstimate = mySalaryData?.salary_estimate ?? null
	const penaltyProgress = clamp(mySalaryEstimate?.penalty_percentage ?? 0, 0, 100)

	return (
		<div className='space-y-6 px-4 py-6'>
			<Card className='overflow-hidden border-primary/20 bg-linear-to-br from-primary/10 via-card to-card'>
				<CardHeader>
					<CardDescription>Member Dashboard</CardDescription>
					<CardTitle className='text-2xl'>
						{stats.user_name || 'Member'}
					</CardTitle>
					<CardAction className='flex flex-col items-end gap-2'>
						<Badge variant='outline'>User #{stats.user_id}</Badge>
						<Badge
							variant={
								weeklyProgressRaw >= 100
									? 'success'
									: weeklyProgressRaw >= 70
										? 'secondary'
										: 'outline'
							}
						>
							{weeklyProgressRaw >= 100
								? 'Target reached'
								: weeklyProgressRaw >= 70
									? 'On track'
									: 'Needs attention'}
						</Badge>
					</CardAction>
				</CardHeader>
				<CardContent className='grid gap-4 sm:grid-cols-3'>
					<div className='rounded-lg border border-border/60 bg-background/70 p-3'>
						<p className='text-xs text-muted-foreground'>
							Expected updates/week
						</p>
						<p className='mt-1 text-2xl font-semibold tabular-nums'>
							{stats.expected_updates_per_week.toLocaleString()}
						</p>
					</div>
					<div className='rounded-lg border border-border/60 bg-background/70 p-3'>
						<p className='text-xs text-muted-foreground'>This week progress</p>
						<p className='mt-1 text-2xl font-semibold tabular-nums'>
							{stats.updates_this_week.toLocaleString()}
						</p>
						<p className='mt-1 text-xs text-muted-foreground'>
							{overTarget > 0
								? `${overTarget.toLocaleString()} above target`
								: `${remainingToTarget.toLocaleString()} remaining`}
						</p>
					</div>
					<div className='rounded-lg border border-border/60 bg-background/70 p-3'>
						<div className='mb-2 flex items-center justify-between text-xs text-muted-foreground'>
							<span className='inline-flex items-center gap-1'>
								<Target className='h-3.5 w-3.5' />
								Weekly completion
							</span>
							<span>{formatPercent(weeklyProgressRaw)}</span>
						</div>
						<div className='h-2 rounded-full bg-muted'>
							<div
								className='h-2 rounded-full bg-primary transition-all'
								style={{ width: `${weeklyProgress}%` }}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className='overflow-hidden border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-card to-card'>
				<CardHeader>
					<CardDescription>{`Salary estimate for ${salaryMonth}/${salaryYear}`}</CardDescription>
					<CardTitle>My Salary Snapshot</CardTitle>
					<CardAction>
						<Badge variant='outline'>Employee #{stats.user_id}</Badge>
					</CardAction>
				</CardHeader>
				<CardContent className='space-y-4'>
					{salaryQuery.isLoading ? (
						<div className='text-sm text-muted-foreground'>
							Loading salary estimate...
						</div>
					) : salaryQuery.error ? (
						<div className='space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3'>
							<p className='text-sm text-destructive'>
								Failed to load salary estimate data.
							</p>
							<Button
								size='sm'
								variant='outline'
								onClick={() => void salaryQuery.refetch()}
							>
								Try again
							</Button>
						</div>
					) : !mySalaryData || !mySalaryEstimate ? (
						<div className='rounded-lg border border-border/60 bg-background/70 p-3 text-sm text-muted-foreground'>
							No salary estimate record found for your account.
						</div>
					) : (
						<>
							<div className='grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]'>
								<div className='rounded-xl border border-emerald-500/25 bg-background/90 p-4'>
									<p className='text-xs text-muted-foreground'>Estimated salary</p>
									<p className='mt-1 text-3xl font-semibold tabular-nums'>
										{formatAmount(mySalaryEstimate.estimated_salary)}
									</p>
									<p className='mt-2 text-xs text-muted-foreground'>
										{mySalaryData.full_name}
									</p>
								</div>
								<div className='rounded-xl border border-border/60 bg-background/70 p-4'>
									<p className='text-xs text-muted-foreground'>Base salary</p>
									<p className='mt-1 text-2xl font-semibold tabular-nums'>
										{formatAmount(mySalaryEstimate.base_salary)}
									</p>
								</div>
								<div className='rounded-xl border border-border/60 bg-background/70 p-4'>
									<p className='text-xs text-muted-foreground'>Deduction amount</p>
									<p className='mt-1 text-2xl font-semibold tabular-nums'>
										{formatAmount(mySalaryEstimate.deduction_amount)}
									</p>
									<Badge
										variant={
											mySalaryEstimate.deduction_amount > 0 ? 'destructive' : 'success'
										}
										className='mt-2'
									>
										{mySalaryEstimate.deduction_amount > 0
											? 'Deduction applied'
											: 'No deduction'}
									</Badge>
								</div>
							</div>

							<div className='grid gap-4 sm:grid-cols-3'>
								<div className='rounded-lg border border-border/60 bg-background/70 p-3'>
									<p className='text-xs text-muted-foreground'>Penalty entries</p>
									<p className='mt-1 text-xl font-semibold tabular-nums'>
										{formatAmount(mySalaryData.penalties_count)}
									</p>
								</div>
								<div className='rounded-lg border border-border/60 bg-background/70 p-3'>
									<p className='text-xs text-muted-foreground'>Penalty points</p>
									<p className='mt-1 text-xl font-semibold tabular-nums'>
										{formatAmount(mySalaryEstimate.total_penalty_points)}
									</p>
								</div>
								<div className='rounded-lg border border-border/60 bg-background/70 p-3'>
									<div className='mb-2 flex items-center justify-between text-xs text-muted-foreground'>
										<span>Penalty percentage</span>
										<span>{formatPercent(mySalaryEstimate.penalty_percentage)}</span>
									</div>
									<div className='h-2 rounded-full bg-muted'>
										<div
											className='h-2 rounded-full bg-primary transition-all'
											style={{ width: `${penaltyProgress}%` }}
										/>
									</div>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
				<Card className='bg-linear-to-br from-card to-muted/30'>
					<CardHeader>
						<CardDescription>Total updates</CardDescription>
						<CardTitle className='text-3xl tabular-nums'>
							{stats.total_updates.toLocaleString()}
						</CardTitle>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>This week</CardDescription>
						<CardTitle className='text-3xl tabular-nums'>
							{stats.updates_this_week.toLocaleString()}
						</CardTitle>
						<CardAction>
							<TrendBadge value={weeklyDelta} />
						</CardAction>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>This month</CardDescription>
						<CardTitle className='text-3xl tabular-nums'>
							{stats.updates_this_month.toLocaleString()}
						</CardTitle>
						<CardAction>
							<TrendBadge value={monthlyDelta} />
						</CardAction>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>Last 3 months</CardDescription>
						<CardTitle className='text-3xl tabular-nums'>
							{stats.updates_last_3_months.toLocaleString()}
						</CardTitle>
						<CardAction>
							<Gauge className='h-4 w-4 text-muted-foreground' />
						</CardAction>
					</CardHeader>
				</Card>
			</div>

			<div className='grid gap-4 xl:grid-cols-[1.3fr_1fr]'>
				<Card>
					<CardHeader>
						<CardTitle>Current vs Previous</CardTitle>
						<CardDescription>
							Compare this week/month against the previous period.
						</CardDescription>
					</CardHeader>
					<CardContent className='pl-2'>
						<ChartContainer
							config={comparisonChartConfig}
							className='aspect-auto h-65 w-full'
						>
							<BarChart data={comparisonChartData} accessibilityLayer>
								<CartesianGrid vertical={false} />
								<XAxis dataKey='period' tickLine={false} axisLine={false} />
								<YAxis allowDecimals={false} width={28} />
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator='dot' />}
								/>
								<Bar
									dataKey='current'
									fill='var(--color-current)'
									radius={[6, 6, 0, 0]}
								/>
								<Bar
									dataKey='previous'
									fill='var(--color-previous)'
									radius={[6, 6, 0, 0]}
								/>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Completion Breakdown</CardTitle>
						<CardDescription>
							Performance percentages from `/update-tracking/stats/me`.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						{completionRows.map(item => {
							const normalized = clamp(item.value, 0, 100)

							return (
								<div key={item.label} className='space-y-2'>
									<div className='flex items-center justify-between text-sm'>
										<span className='text-muted-foreground'>{item.label}</span>
										<span className='font-medium tabular-nums'>
											{formatPercent(item.value)}
										</span>
									</div>
									<div className='h-2 rounded-full bg-muted'>
										<div
											className='h-2 rounded-full bg-primary transition-all'
											style={{ width: `${normalized}%` }}
										/>
									</div>
								</div>
							)
						})}

						<div className='rounded-lg border border-dashed bg-muted/20 p-3'>
							<p className='text-xs text-muted-foreground'>
								Expected updates per week
							</p>
							<p className='mt-1 text-xl font-semibold tabular-nums'>
								{stats.expected_updates_per_week.toLocaleString()}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
