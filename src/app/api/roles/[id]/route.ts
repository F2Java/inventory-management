import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true, _count: { select: { users: true } } },
    })

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    return NextResponse.json({ data: role })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { name, description, permissions } = body

    // Update role name/description
    if (name || description !== undefined) {
      const updateData: any = {}
      if (name) updateData.name = name
      if (description !== undefined) updateData.description = description
      await prisma.role.update({ where: { id }, data: updateData })
    }

    // Replace permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Delete existing permissions
      await prisma.rolePermission.deleteMany({ where: { roleId: id } })

      // Create new permissions
      await prisma.rolePermission.createMany({
        data: permissions.map((p: any) => ({
          roleId: id,
          feature: p.feature,
          canView: p.canView ?? false,
          canCreate: p.canCreate ?? false,
          canEdit: p.canEdit ?? false,
          canDelete: p.canDelete ?? false,
          trackingStatusPermissions: p.trackingStatusPermissions ?? undefined,
        })),
      })
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true, _count: { select: { users: true } } },
    })

    return NextResponse.json({ success: true, data: role })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params

    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }
    if (role.isSystem) {
      return NextResponse.json({ error: "Cannot delete system roles" }, { status: 400 })
    }

    // Unassign users from this role first
    await prisma.user.updateMany({
      where: { roleId: id },
      data: { roleId: null },
    })

    await prisma.role.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
