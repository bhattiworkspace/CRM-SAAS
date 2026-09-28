'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: string;
  timestamp: string;
  user: { name: string; email: string };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/audit-logs');
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" /> Audit Log Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable security and data mutation logs scoped to your organization
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-brand-600" />
          <span>Loading audit log trail...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500">
          No audit logs recorded yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Metadata Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-slate-500 text-[11px]">
                  {new Date(log.timestamp).toLocaleString()}
                </TableCell>
                <TableCell className="font-semibold text-slate-900">
                  {log.user.name}
                  <span className="block text-[10px] text-slate-400 font-normal">{log.user.email}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      log.action === 'CREATE' || log.action === 'IMPORT'
                        ? 'success'
                        : log.action === 'DELETE'
                        ? 'danger'
                        : log.action === 'CONVERT'
                        ? 'purple'
                        : 'info'
                    }
                  >
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-slate-700">{log.entity}</TableCell>
                <TableCell className="text-slate-600 text-[11px] font-mono max-w-xs truncate">
                  {log.metadata || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
