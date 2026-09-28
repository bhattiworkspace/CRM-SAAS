import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.LEADS_UPDATE, orgIdHeader);

    const body = await req.json();
    const { leads } = body;

    if (!Array.isArray(leads)) {
      return NextResponse.json({ success: false, error: 'Expected an array of leads' }, { status: 400 });
    }

    if (leads.length > 500) {
      return NextResponse.json({ success: false, error: 'Max 500 rows allowed per import' }, { status: 400 });
    }

    const orgId = context.organization.id;

    // Fetch existing emails to prevent duplicates
    const existingEmails = new Set(
      (await prisma.lead.findMany({
        where: { organizationId: orgId, email: { not: null } },
        select: { email: true }
      })).map(l => l.email)
    );

    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    const validLeads: any[] = [];

    for (const row of leads) {
      if (!row.firstName || !row.lastName) {
        errorCount++;
        continue;
      }
      if (row.email && existingEmails.has(row.email)) {
        duplicateCount++;
        continue;
      }

      validLeads.push({
        organizationId: orgId,
        firstName: String(row.firstName),
        lastName: String(row.lastName),
        email: row.email ? String(row.email) : null,
        phone: row.phone ? String(row.phone) : null,
        companyName: row.companyName ? String(row.companyName) : null,
        title: row.title ? String(row.title) : null,
        source: 'BULK_IMPORT',
        status: 'NEW',
        priority: 'MEDIUM'
      });

      if (row.email) existingEmails.add(row.email);
    }

    if (validLeads.length > 0) {
      // Transaction safety
      await prisma.$transaction(async (tx) => {
        await tx.lead.createMany({
          data: validLeads
        });
      });
      importedCount = validLeads.length;

      await recordAuditLog({
        organizationId: orgId,
        userId: context.user.id,
        action: 'CREATE',
        entity: 'Lead',
        entityId: 'BULK_IMPORT',
        metadata: { importedCount, duplicateCount, errorCount }
      });
    }

    return NextResponse.json({ 
      success: true, 
      imported: importedCount, 
      duplicates: duplicateCount, 
      errors: errorCount 
    });

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to import leads';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
