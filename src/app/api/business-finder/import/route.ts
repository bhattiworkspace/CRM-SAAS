import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { businessImportSchema } from '@/lib/validations/business-finder';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.BUSINESS_FINDER_IMPORT, orgIdHeader);

    const body = await req.json();
    const { businesses, createAsLead, assigneeId } = businessImportSchema.parse(body);

    let importedCount = 0;
    let existingCount = 0;
    let failedCount = 0;

    const importedCompanies = [];
    const importedLeads = [];

    for (const biz of businesses) {
      try {
        // 1. Duplicate detection query for existing Company in tenant
        const existingCompany = await prisma.company.findFirst({
          where: {
            organizationId: context.organization.id,
            OR: [
              { providerId: biz.providerId },
              ...(biz.website ? [{ website: { equals: biz.website } }] : []),
              ...(biz.phone ? [{ phone: { equals: biz.phone } }] : []),
            ],
          },
        });

        let targetCompany = existingCompany;

        if (!existingCompany) {
          // Create new Company
          targetCompany = await prisma.company.create({
            data: {
              organizationId: context.organization.id,
              name: biz.name,
              providerId: biz.providerId,
              phone: biz.phone || null,
              address: biz.address || null,
              website: biz.website || null,
              industry: biz.category || null,
              rating: biz.rating || null,
              reviewCount: biz.reviewCount || null,
            },
          });
          importedCount++;
          importedCompanies.push(targetCompany);
        } else {
          existingCount++;
        }

        // 2. Create Lead associated with Company if requested
        if (createAsLead && targetCompany) {
          const nameParts = biz.name.split(' ');
          const lead = await prisma.lead.create({
            data: {
              organizationId: context.organization.id,
              firstName: nameParts[0] || biz.name,
              lastName: nameParts.slice(1).join(' ') || 'Representative',
              companyName: targetCompany.name,
              email: null,
              phone: biz.phone || null,
              status: 'NEW',
              priority: 'MEDIUM',
              source: 'Business Finder',
              ownerId: assigneeId || context.user.id,
            },
          });
          importedLeads.push(lead);
        }
      } catch (err) {
        console.error(`Failed to import business ${biz.name}:`, err);
        failedCount++;
      }
    }

    // Record Audit Log
    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'IMPORT',
      entity: 'BusinessFinder',
      metadata: {
        totalSelected: businesses.length,
        importedCount,
        existingCount,
        failedCount,
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalSelected: businesses.length,
        imported: importedCount,
        alreadyExisted: existingCount,
        failed: failedCount,
      },
      message: `Import complete. ${importedCount} imported, ${existingCount} already existed.`,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Business import failed';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
