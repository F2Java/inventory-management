import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

    const groups = await prisma.productVariantGroup.findMany({
      where: { productId },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ data: groups })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "products", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { productId, name } = body

    if (!productId || !name?.trim()) {
      return NextResponse.json({ error: "productId and name are required" }, { status: 400 })
    }

    // Get sort order
    const lastGroup = await prisma.productVariantGroup.findFirst({
      where: { productId },
      orderBy: { sortOrder: "desc" },
    })

    const group = await prisma.productVariantGroup.create({
      data: {
        productId,
        name: name.trim(),
        sortOrder: (lastGroup?.sortOrder ?? -1) + 1,
      },
      include: { options: true },
    })

    return NextResponse.json({ success: true, data: group })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "products", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { id, name, sortOrder, options } = body

    if (!id) return NextResponse.json({ error: "Group ID required" }, { status: 400 })

    // Update group
    if (name || sortOrder !== undefined) {
      await prisma.productVariantGroup.update({
        where: { id },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        },
      })
    }

    // Replace options if provided
    if (options !== undefined) {
      await prisma.productVariantGroupOption.deleteMany({ where: { groupId: id } })
      if (options.length > 0) {
        await prisma.productVariantGroupOption.createMany({
          data: options.map((opt: any, i: number) => ({
            groupId: id,
            name: opt.name,
            value: opt.value || opt.name.substring(0, 2).toUpperCase(),
            sortOrder: opt.sortOrder ?? i,
          })),
        })
      }
    }

    const group = await prisma.productVariantGroup.findUnique({
      where: { id },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    })

    return NextResponse.json({ success: true, data: group })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "products", "delete")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "Group ID required" }, { status: 400 })

    await prisma.productVariantGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
