import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { convertLeadSchema } from '@/lib/validations/lead';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.LEADS_UPDATE, orgIdHeader);

    const body = await req.json();
    const validated = convertLeadSchema.parse({ ...body, leadId: params.id });

    // Enforce tenant scoping and verify lead exists and is not already converted
    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        organizationId: context.organization.id,
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found or access denied' }, { status: 404 });
    }

    if (lead.status === 'CONVERTED') {
      return NextResponse.json({ success: false, error: 'Lead is already converted' }, { status: 400 });
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      let companyId = validated.companyId;

      // 1. Create or resolve Company
      if (!companyId) {
        const companyName = validated.newCompanyName || lead.companyName || `${lead.firstName} ${lead.lastName} Org`;
        
        // Prevent duplicate company creation if one already exists with exact name for tenant
        const existingCompany = await tx.company.findFirst({
          where: {
            organizationId: context.organization.id,
            name: { equals: companyName },
          },
        });

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const createdCompany = await tx.company.create({
            data: {
              organizationId: context.organization.id,
              name: companyName,
              phone: lead.phone,
              email: lead.email,
            } as Record<string, unknown> as any,
          });
          companyId = createdCompany.id;
        }
      }

      // 2. Create Contact
      const contact = await tx.contact.create({
        data: {
          organizationId: context.organization.id,
          companyId: companyId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          title: lead.title,
          ownerId: lead.ownerId || context.user.id,
        },
      });

      // 3. Create Deal if requested
      let deal = null;
      if (validated.createDeal) {
        let pipelineId = validated.pipelineId;
        let stageId = validated.stageId;

        // Resolve default pipeline & first stage if not specified
        if (!pipelineId || !stageId) {
          const defaultPipeline = await tx.pipeline.findFirst({
            where: {
              organizationId: context.organization.id,
              isDefault: true,
            },
            include: {
              stages: { orderBy: { order: 'asc' }, take: 1 },
            },
          });

          if (defaultPipeline && defaultPipeline.stages.length > 0) {
            pipelineId = defaultPipeline.id;
            stageId = defaultPipeline.stages[0].id;
          } else {
            throw new Error('No default pipeline stage found for deal creation');
          }
        }

        deal = await tx.deal.create({
          data: {
            organizationId: context.organization.id,
            pipelineId: pipelineId!,
            stageId: stageId!,
            companyId: companyId,
            contactId: contact.id,
            name: validated.dealName || `${lead.companyName || lead.lastName} - Deal`,
            amount: validated.dealAmount || 0,
            ownerId: lead.ownerId || context.user.id,
            status: 'OPEN',
          },
        });
      }

      // 4. Update Lead Status to CONVERTED
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED' },
      });

      // 5. Log System Activity
      await tx.activity.create({
        data: {
          organizationId: context.organization.id,
          type: 'SYSTEM',
          title: `Lead converted to Contact & Company`,
          description: `Lead ${lead.firstName} ${lead.lastName} converted by ${context.user.name}.`,
          leadId: lead.id,
          contactId: contact.id,
          companyId: companyId,
          dealId: deal?.id || null,
          createdById: context.user.id,
        },
      });

      return { lead: updatedLead, contact, companyId, deal };
    });

    // 6. Record Audit Log outside transaction
    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'CONVERT',
      entity: 'Lead',
      entityId: lead.id,
      metadata: { contactId: result.contact.id, companyId: result.companyId, dealId: result.deal?.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead converted successfully',
      data: result,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Lead conversion failed';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
