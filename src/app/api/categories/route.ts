import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  const permErr = await requirePermission(session, "products", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: true } },
        parent: { select: { id: true, name: true } },
        children: { where: { isActive: true }, select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: categories })
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
    const { name, description, parentId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // Normalize: lowercase, trim, collapse spaces, remove special chars
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, " ")

    // Generate ID: lowercase name with spaces preserved (matching seed pattern)
    const id = normalizedName

    // Check for duplicate by ID (exact match including special chars)
    const existingById = await prisma.category.findUnique({ where: { id } })
    if (existingById) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 })
    }

    // Also check by normalized name to catch similar names with different special chars
    const allCategories = await prisma.category.findMany({ select: { id: true, name: true } })
    const duplicateByName = allCategories.find(
      (c) => c.name.toLowerCase().replace(/\s+/g, " ") === normalizedName
    )
    if (duplicateByName) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 })
    }

    const category = await prisma.category.create({
      data: {
        id,
        name: name.trim(),
        description: description || null,
        parentId: parentId || null,
      },
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
