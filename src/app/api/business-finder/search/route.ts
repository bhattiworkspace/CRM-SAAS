import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getBusinessSearchProvider } from '@/lib/services/business-finder';
import { businessSearchSchema } from '@/lib/validations/business-finder';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.BUSINESS_FINDER_SEARCH, orgIdHeader);

    const body = await req.json();
    const params = businessSearchSchema.parse(body);

    const provider = getBusinessSearchProvider();
    const searchResponse = await provider.searchBusinesses(params);

    // Save search record in DB for tenant history
    const searchRecord = await prisma.businessSearch.create({
      data: {
        organizationId: context.organization.id,
        query: params.query || 'All Businesses',
        category: params.category || null,
        location: params.location || null,
        createdById: context.user.id,
      },
    });

    // Check existing imported Companies for duplicate detection (by providerId, website, or phone)
    const existingCompanies = await prisma.company.findMany({
      where: { organizationId: context.organization.id },
      select: { id: true, providerId: true, website: true, phone: true, name: true },
    });

    const enrichedResults = searchResponse.businesses.map((biz) => {
      const isImported = existingCompanies.some(
        (c) =>
          (c.providerId && c.providerId === biz.providerId) ||
          (c.website && biz.website && c.website.toLowerCase() === biz.website.toLowerCase()) ||
          (c.phone && biz.phone && c.phone === biz.phone)
      );

      return {
        ...biz,
        isImported,
      };
    });

    // Save search results in DB
    if (enrichedResults.length > 0) {
      await prisma.businessSearchResult.createMany({
        data: enrichedResults.map((r) => ({
          searchId: searchRecord.id,
          organizationId: context.organization.id,
          providerId: r.providerId,
          name: r.name,
          category: r.category || null,
          phone: r.phone || null,
          address: r.address || null,
          website: r.website || null,
          rating: r.rating || null,
          reviewCount: r.reviewCount || null,
          isImported: r.isImported,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      searchId: searchRecord.id,
      providerName: searchResponse.providerName,
      totalResults: searchResponse.totalResults,
      businesses: enrichedResults,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Business search failed';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
