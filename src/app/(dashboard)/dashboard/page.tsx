import React from 'react';
import { getTenantSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  Users,
  KanbanSquare,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default async function DashboardPage() {
  const context = await getTenantSession();
  const orgId = context!.organization.id;

  // Real Database Aggregations for Tenant
  const [totalLeads, activeDealsCount, deals, recentActivities, upcomingTasks] = await Promise.all([
    prisma.lead.count({ where: { organizationId: orgId } }),
    prisma.deal.count({ where: { organizationId: orgId, status: 'OPEN' } }),
    prisma.deal.findMany({
      where: { organizationId: orgId },
      include: { stage: true },
    }),
    prisma.activity.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { organizationId: orgId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'asc' },
      take: 5,
      include: { assignedTo: { select: { name: true } } },
    }),
  ]);

  let totalPipelineValue = 0;
  let totalWonValue = 0;
  let wonCount = 0;

  deals.forEach((d) => {
    totalPipelineValue += d.amount;
    if (d.status === 'WON') {
      totalWonValue += d.amount;
      wonCount++;
    }
  });

  const conversionRate = deals.length > 0 ? Math.round((wonCount / deals.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {context!.user.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {context!.organization.name} • Active Sales Overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads?create=true"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Lead</span>
          </Link>
          <Link
            href="/deals"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors"
          >
            <KanbanSquare className="h-4 w-4 text-brand-600" />
            <span>View Pipeline</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Leads</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalLeads}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Active Prospect Pipeline
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Deals</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{activeDealsCount}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">In Sales Funnel</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <KanbanSquare className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pipeline Value</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                ${totalPipelineValue.toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                ${totalWonValue.toLocaleString()} Won
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Win Rate</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{conversionRate}%</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">{wonCount} Won Deals</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Activity Feed & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Timeline (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Recent Sales Activity</CardTitle>
                <CardDescription>Live log of logged calls, meetings, and pipeline movements</CardDescription>
              </div>
              <Link
                href="/activities"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {recentActivities.length > 0 ? (
                recentActivities.map((act) => (
                  <div key={act.id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-start gap-3 text-xs">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold">
                      {act.type[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 truncate">{act.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(act.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {act.description && <p className="text-slate-600 mt-0.5 line-clamp-1">{act.description}</p>}
                      <span className="text-[10px] text-slate-500 mt-1 block">Logged by {act.createdBy.name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">No activities recorded yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Tasks & Follow-ups (1 Col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Follow-ups & Tasks</CardTitle>
                <CardDescription>Pending items requiring action</CardDescription>
              </div>
              <Link
                href="/tasks"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 truncate">{task.title}</span>
                      <Badge
                        variant={
                          task.priority === 'URGENT'
                            ? 'danger'
                            : task.priority === 'HIGH'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    {task.dueDate && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" /> Due:{' '}
                        {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">No pending tasks.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
