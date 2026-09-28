'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReportsPage() {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?period=${period}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch reports', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  if (loading || !data) {
    return <div className="p-8">Loading reports...</div>;
  }

  const { overview, leadsBySource, dealsByStage, taskCompletion, repPerformance, forecast } = data;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Advanced Reports & Analytics</h1>
        <div className="flex space-x-2">
          {['today', '7d', '30d', '90d'].map(p => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'outline'}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.totalLeads}</div>
            <div className="text-xs text-muted-foreground mt-1">{overview.newLeads} new in period</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.winRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${overview.totalPipelineValue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Weighted: ${overview.weightedPipelineValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Won Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${overview.wonRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadsBySource.map((s: any) => (
                <div key={s.source} className="flex justify-between items-center">
                  <span>{s.source}</span>
                  <Badge variant="info">{s.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {dealsByStage.map((s: any) => (
                <div key={s.stage} className="flex justify-between items-center">
                  <span>{s.stage}</span>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">{s.count} deals</Badge>
                    <span className="font-semibold">${s.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{taskCompletion.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{taskCompletion.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{taskCompletion.overdue}</div>
                <div className="text-xs text-red-500">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Sales Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span>Won Revenue</span>
                <span className="font-bold">${forecast.wonRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Weighted Pipeline</span>
                <span className="font-bold text-blue-600">${forecast.weightedPipeline.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg pt-2">
                <span>Forecasted Total</span>
                <span className="font-bold text-green-600">${(forecast.wonRevenue + forecast.weightedPipeline).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rep Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep Name</TableHead>
                <TableHead>Deals Won</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Activities Logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repPerformance.map((rep: any) => (
                <TableRow key={rep.userId}>
                  <TableCell className="font-medium">{rep.userName}</TableCell>
                  <TableCell>{rep.dealsWon}</TableCell>
                  <TableCell>${rep.revenue.toLocaleString()}</TableCell>
                  <TableCell>{rep.activitiesLogged}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
