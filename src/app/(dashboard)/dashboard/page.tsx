import React from 'react';
import { getTenantSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function DashboardPage() {
  const context = await getTenantSession();
  const orgId = context!.organization.id;
  const orgName = context!.organization.name;

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

  const getWinRate = () => {
    if (totalLeads === 0) return 0;
    const wonLeads = leadsByStatus.find(l => l.status === 'CLOSED_WON')?._count || 0;
    return Math.round((wonLeads / totalLeads) * 100);
  };

  const winRate = getWinRate();
  const avgDealSize = leadsForValue.length > 0 ? Math.round(totalPipelineValue / leadsForValue.length) : 0;

  return (
    <section aria-labelledby="pt">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 id="pt" className="font-head font-semibold text-3xl md:text-[34px]">
            {getGreeting()}, {context!.user.name.split(' ')[0]}
          </h1>
          <p className="text-mute">Here's how {orgName} is tracking this quarter.</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpis-glow grid grid-cols-2 md:grid-cols-4 bg-surf border border-line rounded border-t-2 border-t-gold mb-4">
        <div className="kpi">
          <span className="kpi-label">Pipeline Value</span>
          <b className="kpi-num">{currencySymbol}{totalPipelineValue.toLocaleString()}</b>
        </div>
        <div className="kpi">
          <span className="kpi-label">Active Leads</span>
          <b className="kpi-num">{totalLeads}</b>
          <span className="delta up">+{newLeadsCount} New</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Win rate</span>
          <b className="kpi-num">{winRate}%</b>
        </div>
        <div className="kpi">
          <span className="kpi-label">Avg. deal size</span>
          <b className="kpi-num">{currencySymbol}{avgDealSize.toLocaleString()}</b>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="panel md:col-span-2">
          <h2 className="panel-title">Today's follow-ups</h2>
          {todayTasks.length > 0 ? (
            todayTasks.map((task) => (
              <Link href={`/leads/${task.leadId}`} key={task.id} className="task-row group">
                <span className="group-hover:text-acc transition-colors">{task.title} {task.lead?.title ? `— ${task.lead.title}` : ''}</span>
                <span className="badge yellow">Today</span>
              </Link>
            ))
          ) : (
            <div className="empty-state py-6">
              <span className="text-mute text-sm">No follow-ups scheduled for today.</span>
            </div>
          )}

          <h2 className="panel-title mt-5">Tomorrow</h2>
          {tomorrowTasks.length > 0 ? (
            tomorrowTasks.map((task) => (
              <Link href={`/leads/${task.leadId}`} key={task.id} className="task-row group">
                <span className="group-hover:text-acc transition-colors">{task.title} {task.lead?.title ? `— ${task.lead.title}` : ''}</span>
                <span className="badge blue">Tomorrow</span>
              </Link>
            ))
          ) : (
            <div className="empty-state py-6">
              <span className="text-mute text-sm">No follow-ups scheduled for tomorrow.</span>
            </div>
          )}
        </div>
        
        <div className="panel">
          <h2 className="panel-title">Goals this month</h2>
          <div className="goal">
            <div className="flex justify-between text-sm mb-1">
              <span>Pipeline</span>
              <span>{currencySymbol}{totalPipelineValue >= 1000 ? Math.round(totalPipelineValue/1000)+'k' : totalPipelineValue} / $100k</span>
            </div>
            <div className="track">
              <span style={{ width: `${Math.min(100, (totalPipelineValue / 100000) * 100)}%` }}></span>
            </div>
          </div>
          <div className="goal">
            <div className="flex justify-between text-sm mb-1">
              <span>New leads</span>
              <span>{newLeadsCount} / 50</span>
            </div>
            <div className="track">
              <span style={{ width: `${Math.min(100, (newLeadsCount / 50) * 100)}%` }}></span>
            </div>
          </div>
          <div className="goal">
            <div className="flex justify-between text-sm mb-1">
              <span>Won Value</span>
              <span>{currencySymbol}{totalWonValue >= 1000 ? Math.round(totalWonValue/1000)+'k' : totalWonValue} / $30k</span>
            </div>
            <div className="track">
              <span style={{ width: `${Math.min(100, (totalWonValue / 30000) * 100)}%`, background: 'var(--gold)' }}></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
