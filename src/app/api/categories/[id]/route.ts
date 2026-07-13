import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const permErr = await requirePermission(session, "products", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
        parent: { select: { id: true, name: true } },
        children: { where: { isActive: true }, select: { id: true, name: true, _count: { select: { products: true } } } },
      },
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({ data: category })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const permErr = await requirePermission(session, "products", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const body = await req.json()
    const { name, description, parentId, isActive } = body

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Category name cannot be empty" }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (description !== undefined) updateData.description = description
    if (parentId !== undefined) updateData.parentId = parentId || null
    if (isActive !== undefined) updateData.isActive = isActive

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const permErr = await requirePermission(session, "products", "delete")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    if (existing._count.products > 0) {
      return NextResponse.json({
        error: `Cannot delete "${existing.name}" — ${existing._count.products} product(s) are using it. Re-assign them first.`,
      }, { status: 409 })
    }

    // Check for child categories
    const childrenCount = await prisma.category.count({ where: { parentId: id, isActive: true } })
    if (childrenCount > 0) {
      return NextResponse.json({
        error: `Cannot delete "${existing.name}" — it has ${childrenCount} sub-category(ies). Remove them first.`,
      }, { status: 409 })
    }

    await prisma.category.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
