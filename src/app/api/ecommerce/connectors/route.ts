import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const connectors = await prisma.ecommerceConnector.findMany({
      include: {
        branch: { select: { id: true, code: true, name: true, _count: { select: { products: true } } } },
        syncLogs: {
          take: 1,
          orderBy: { startedAt: "desc" },
          select: { status: true, message: true, completedAt: true, startedAt: true },
        },
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const enriched = connectors.map((c) => ({
      id: c.id,
      platform: c.platform,
      storeName: c.storeName,
      apiEndpoint: c.apiEndpoint,
      isActive: c.isActive,
      lastSyncAt: c.lastSyncAt,
      syncInterval: c.syncInterval,
      branchId: c.branchId,
      branch: c.branch,
      productCount: c.branch._count.products,
      orderCount: c._count.sales,
      lastSyncLog: c.syncLogs[0] || null,
      createdAt: c.createdAt,
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { platform, storeName, apiEndpoint, apiKey, apiSecret, branchId, syncInterval } = body

    if (!platform || !apiEndpoint || !apiKey || !branchId) {
      return NextResponse.json(
        { error: "Platform, API endpoint, API key, and branch are required" },
        { status: 400 }
      )
    }

    // Check branch doesn't already have a connector
    const existing = await prisma.ecommerceConnector.findUnique({
      where: { branchId },
    })
    if (existing) {
      return NextResponse.json(
        { error: "This branch already has a connector (one connector per branch)" },
        { status: 409 }
      )
    }

    const connector = await prisma.ecommerceConnector.create({
      data: {
        platform,
        storeName: storeName || null,
        apiEndpoint,
        apiKey,
        apiSecret: apiSecret || null,
        branchId,
        syncInterval: syncInterval || 15,
      },
    })

    return NextResponse.json({ success: true, data: connector })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
