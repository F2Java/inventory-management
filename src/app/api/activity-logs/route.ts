import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const action = searchParams.get("action") || ""
    const entity = searchParams.get("entity") || ""
    const search = searchParams.get("search") || ""

    const where: any = {
      user: session.user.role === "SUPER_ADMIN"
        ? undefined
        : { merchantId: session.user.merchantId },
    }

    if (action) where.action = action
    if (entity) where.entity = entity
    if (search) {
      where.OR = [
        { entity: { contains: search, mode: "insensitive" as const } },
        { action: { contains: search, mode: "insensitive" as const } },
        { details: { path: "$", string_contains: search } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ])

    // Get distinct actions and entities for filter dropdowns
    const distinctActions = await prisma.activityLog.findMany({
      select: { action: true },
      distinct: ["action"],
    })
    const distinctEntities = await prisma.activityLog.findMany({
      select: { entity: true },
      distinct: ["entity"],
    })

    return NextResponse.json({
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        actions: distinctActions.map((a) => a.action),
        entities: distinctEntities.map((e) => e.entity),
      },
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
