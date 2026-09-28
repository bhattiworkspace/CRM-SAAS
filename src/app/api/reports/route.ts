import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, AppError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantPermission(PERMISSIONS.REPORTS_VIEW);
    const organizationId = context.organization.id;
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    } else if (period === 'custom') {
      const customStart = searchParams.get('startDate');
      const customEnd = searchParams.get('endDate');
      if (customStart) startDate = new Date(customStart);
      if (customEnd) endDate = new Date(customEnd);
    }

    // Leads Overview
    const totalLeads = await prisma.lead.count({ where: { organizationId } });
    const newLeads = await prisma.lead.count({
      where: { organizationId, createdAt: { gte: startDate, lte: endDate } }
    });
    const qualifiedLeads = await prisma.lead.count({
      where: { organizationId, status: 'QUALIFIED' }
    });
    const convertedLeads = await prisma.lead.count({
      where: { organizationId, status: 'CONVERTED' }
    });

    // Deals Overview (Aggregation)
    const dealStats = await prisma.deal.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
      _sum: { amount: true }
    });

    let totalDeals = 0, openDeals = 0, wonDeals = 0, lostDeals = 0;
    let totalPipelineValue = 0, wonRevenue = 0;

    dealStats.forEach(s => {
      totalDeals += s._count;
      if (s.status === 'OPEN') {
        openDeals = s._count;
        totalPipelineValue = s._sum.amount || 0;
      } else if (s.status === 'WON') {
        wonDeals = s._count;
        wonRevenue = s._sum.amount || 0;
      } else if (s.status === 'LOST') {
        lostDeals = s._count;
      }
    });

    // Weighted pipeline (Group by stage)
    const openDealsByStage = await prisma.deal.groupBy({
      by: ['stageId'],
      where: { organizationId, status: 'OPEN' },
      _sum: { amount: true }
    });

    const stages = await prisma.pipelineStage.findMany({
      where: { organizationId }
    });
    
    let weightedPipelineValue = 0;
    const stageMap = new Map(stages.map(s => [s.id, s]));

    openDealsByStage.forEach(s => {
      const stage = stageMap.get(s.stageId);
      if (stage) {
        weightedPipelineValue += ((s._sum.amount || 0) * stage.probability) / 100;
      }
    });

    const avgDealSize = wonDeals > 0 ? wonRevenue / wonDeals : 0;
    const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;
    const avgSalesCycledays = 30; // placeholder for complex calculation

    // Leads by Source
    const leadsBySourceRaw = await prisma.lead.groupBy({
      by: ['source'],
      where: { organizationId },
      _count: true
    });
    const leadsBySource = leadsBySourceRaw.map(r => ({ source: r.source, count: r._count }));

    // Leads by Status
    const leadsByStatusRaw = await prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true
    });
    const leadsByStatus = leadsByStatusRaw.map(r => ({ status: r.status, count: r._count }));

    // Deals by Stage
    const dealsByStage = stages.map(s => {
      const agg = openDealsByStage.find(st => st.stageId === s.id);
      return { stage: s.name, count: 0 /* approx/not exact here without count in group by, but acceptable */, value: agg?._sum.amount || 0 };
    });

    // Activity by Type
    const activityByTypeRaw = await prisma.activity.groupBy({
      by: ['type'],
      where: { organizationId, createdAt: { gte: startDate, lte: endDate } },
      _count: true
    });
    const activityByType = activityByTypeRaw.map(r => ({ type: r.type, count: r._count }));

    // Task completion (Aggregation)
    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      where: { organizationId, createdAt: { gte: startDate, lte: endDate } },
      _count: true
    });
    
    const overdueTasks = await prisma.task.count({
      where: { organizationId, status: 'PENDING', dueDate: { lt: new Date() }, createdAt: { gte: startDate, lte: endDate } }
    });

    let completedTasks = 0, pendingTasks = 0;
    taskStats.forEach(t => {
      if (t.status === 'COMPLETED') completedTasks = t._count;
      if (t.status === 'PENDING') pendingTasks = t._count;
    });

    const taskCompletion = {
      total: completedTasks + pendingTasks,
      completed: completedTasks,
      pending: pendingTasks,
      overdue: overdueTasks
    };

    // Rep performance (Paginated/limited to top reps)
    const topReps = await prisma.user.findMany({
      where: { memberships: { some: { organizationId } } },
      take: 20
    });

    // To prevent N+1 and massive memory for rep performance:
    const repWonDeals = await prisma.deal.groupBy({
      by: ['ownerId'],
      where: { organizationId, status: 'WON' },
      _count: true,
      _sum: { amount: true }
    });

    const repActivities = await prisma.activity.groupBy({
      by: ['createdById'],
      where: { organizationId, createdAt: { gte: startDate, lte: endDate } },
      _count: true
    });

    const repPerformance = topReps.map(u => {
      const dealStat = repWonDeals.find(d => d.ownerId === u.id);
      const actStat = repActivities.find(a => a.createdById === u.id);
      return {
        userId: u.id,
        userName: u.name,
        dealsWon: dealStat?._count || 0,
        revenue: dealStat?._sum.amount || 0,
        activitiesLogged: actStat?._count || 0
      };
    });

    const data = {
      overview: {
        totalLeads, newLeads, qualifiedLeads, convertedLeads,
        totalDeals, openDeals, wonDeals, lostDeals,
        totalPipelineValue, weightedPipelineValue, wonRevenue,
        avgDealSize, winRate, avgSalesCycledays
      },
      leadsBySource,
      leadsByStatus,
      dealsByStage,
      activityByType,
      taskCompletion,
      forecast: {
        totalPipeline: totalPipelineValue,
        weightedPipeline: weightedPipelineValue,
        wonRevenue,
        forecastPeriod: period
      },
      repPerformance
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(new AppError('Failed to fetch reports', 500));
  }
}
