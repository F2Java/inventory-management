import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ALL_FEATURES } from "@/lib/auth/permissions"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const roles = await prisma.role.findMany({
      where: { merchantId: session.user.merchantId as string },
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ data: roles })
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
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, description, permissions } = body

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 })
    }

    // Check for duplicate name within merchant
    const existing = await prisma.role.findUnique({
      where: { name_merchantId: { name, merchantId: session.user.merchantId as string } },
    })
    if (existing) {
      return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 })
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        name,
        description: description || null,
        merchantId: session.user.merchantId as string,
        permissions: {
          create: (permissions || ALL_FEATURES.map((f) => ({
            feature: f,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          }))).map((p: any) => ({
            feature: p.feature,
            canView: p.canView ?? false,
            canCreate: p.canCreate ?? false,
            canEdit: p.canEdit ?? false,
            canDelete: p.canDelete ?? false,
            trackingStatusPermissions: p.trackingStatusPermissions ?? undefined,
          })),
        },
      },
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
    })

    return NextResponse.json({ success: true, data: role })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
