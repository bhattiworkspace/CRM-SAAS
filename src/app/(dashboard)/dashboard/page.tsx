import React from 'react';
import { getTenantSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Trophy,
  DollarSign,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { AnimatedBar } from '@/components/dashboard/animated-bars';

export default async function DashboardPage() {
  const context = await getTenantSession();
  const orgId = context!.organization.id;

  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  // Role-based filtering
  const isSalesRep = context?.role?.name === 'Sales Representative';
  const leadWhere: Record<string, unknown> = { organizationId: orgId };
  const taskWhere: Record<string, unknown> = { organizationId: orgId, status: 'PENDING' };

  if (isSalesRep && context?.user?.id) {
    leadWhere.ownerId = context.user.id;
    taskWhere.assignedToId = context.user.id;
  }

  // Data Fetching
  const [
    orgData,
    totalLeads,
    newLeadsCount,
    leadsForValue,
    todayTasks,
    tomorrowTasks,
    leadsByStatus,
    leadsBySource,
    recentLeads
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { currency: true }
    }),
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, status: 'NEW' } }),
    prisma.lead.findMany({ where: leadWhere, select: { estimatedValue: true, status: true } }),
    prisma.task.findMany({
      where: { ...taskWhere, dueDate: { gte: today, lt: tomorrow } },
      include: { lead: true, assignedTo: { select: { name: true } } },
      take: 10
    }),
    prisma.task.findMany({
      where: { ...taskWhere, dueDate: { gte: tomorrow, lt: dayAfter } },
      include: { lead: true, assignedTo: { select: { name: true } } },
      take: 10
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where: leadWhere,
      _count: true
    }),
    prisma.lead.groupBy({
      by: ['source'],
      where: leadWhere,
      _count: true
    }),
    prisma.lead.findMany({
      where: leadWhere,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { owner: { select: { name: true } } }
    })
  ]);

  const currencySymbol = orgData?.currency || '$';

  let totalWonValue = 0;
  let totalPipelineValue = 0;
  leadsForValue.forEach(l => {
    const val = l.estimatedValue || 0;
    totalPipelineValue += val;
    if (l.status === 'CLOSED_WON') {
      totalWonValue += val;
    }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-yellow-400';
      case 'CONTACTED': return 'bg-teal-400';
      case 'QUALIFIED': return 'bg-blue-400';
      case 'PROPOSAL': return 'bg-amber-400';
      case 'CLOSED_WON': return 'bg-green-500';
      case 'CLOSED_LOST': return 'bg-red-500';
      default: return 'bg-slate-300';
    }
  };

  const maxStatusCount = Math.max(...leadsByStatus.map(l => l._count), 1);
  const maxSourceCount = Math.max(...leadsBySource.map(s => s._count), 1);

  return (
    <div className="space-y-6">
      {/* Top Section */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {getGreeting()}, {context!.user.name}
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Leads</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalLeads}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Leads</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{newLeadsCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <UserPlus className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Won Value</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {currencySymbol}{totalWonValue.toLocaleString()}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
              <Trophy className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pipeline Value</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {currencySymbol}{totalPipelineValue.toLocaleString()}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100">
            {todayTasks.length > 0 ? (
              todayTasks.map((task) => {
                const isOverdue = new Date(task.dueDate!) < new Date();
                return (
                  <div key={task.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{task.title}</span>
                        {isOverdue && <Badge variant="danger" className="text-[10px]">Overdue</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{task.lead?.title || 'No Lead Attached'}</p>
                    </div>
                    <button className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">No follow-ups for today!</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tomorrow&apos;s Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100">
            {tomorrowTasks.length > 0 ? (
              tomorrowTasks.map((task) => (
                <div key={task.id} className="p-4 flex flex-col justify-center">
                  <span className="text-sm font-semibold text-slate-900">{task.title}</span>
                  <p className="text-xs text-slate-500 mt-1">{task.lead?.title || 'No Lead Attached'}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">No follow-ups scheduled for tomorrow.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'CLOSED_WON', 'CLOSED_LOST'].map(status => {
              const stat = leadsByStatus.find(l => l.status === status);
              const count = stat ? stat._count : 0;
              const width = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-medium text-slate-600 truncate">
                    {status.replace('_', ' ')}
                  </div>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <AnimatedBar 
                      width={width}
                      className={getStatusColor(status)}
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-semibold text-slate-700">
                    {count}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {leadsBySource.sort((a,b) => b._count - a._count).map(source => {
              const width = maxSourceCount > 0 ? (source._count / maxSourceCount) * 100 : 0;
              return (
                <div key={source.source} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-medium text-slate-600 truncate">
                    {source.source}
                  </div>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <AnimatedBar 
                      width={width}
                      className="bg-brand-500"
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-semibold text-slate-700">
                    {source._count}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Leads</CardTitle>
          <Link href="/leads" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.firstName} {lead.lastName}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.companyName || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {lead.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {lead.estimatedValue ? `${currencySymbol}${lead.estimatedValue.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {lead.owner?.name || '-'}
                    </td>
                  </tr>
                ))}
                {recentLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
