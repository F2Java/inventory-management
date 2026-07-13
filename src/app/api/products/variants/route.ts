import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { generateSKU } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

    const variants = await prisma.product.findMany({
      where: { parentProductId: productId, isActive: true },
      include: {
        warehouseStock: {
          include: { warehouse: { select: { id: true, name: true, code: true } } },
        },
        uoms: { include: { uom: true } },
        variantOptionAssignments: {
          include: {
            option: {
              include: { group: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ data: variants })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "products", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const {
      parentProductId, sku, skuMethod, barcode,
      costPerUnit, sellPerUnit, unit, weight,
      optionIds,  // Array of ProductVariantGroupOption IDs
    } = body

    if (!parentProductId) {
      return NextResponse.json({ error: "parentProductId is required" }, { status: 400 })
    }

    // Get parent product to inherit defaults
    const parent = await prisma.product.findUnique({
      where: { id: parentProductId },
    })
    if (!parent) return NextResponse.json({ error: "Parent product not found" }, { status: 404 })

    // Generate SKU if AUTO
    let finalSku = sku
    if (skuMethod === "AUTO" || !sku) {
      // Generate from option values: {parent-sku}-{opt1}-{opt2}
      if (optionIds?.length > 0) {
        const options = await prisma.productVariantGroupOption.findMany({
          where: { id: { in: optionIds } },
          orderBy: { groupId: "asc" },
        })
        const suffix = options.map(o => o.value).join("-")
        finalSku = `${parent.sku}-${suffix}`
      } else {
        // Auto-numbered
        const count = await prisma.product.count({ where: { parentProductId } })
        finalSku = `${parent.sku}-V${String(count + 1).padStart(2, "0")}`
      }
    }

    // Check SKU uniqueness
    const existing = await prisma.product.findUnique({ where: { sku: finalSku } })
    if (existing) {
      return NextResponse.json({ error: `SKU '${finalSku}' already exists` }, { status: 400 })
    }

    // Create variant as a child product
    const variant = await prisma.product.create({
      data: {
        name: parent.name,
        description: parent.description,
        sku: finalSku,
        skuMethod: skuMethod || "AUTO",
        barcode: barcode || null,
        categoryId: parent.categoryId,
        costPerUnit: parseFloat(costPerUnit) || 0,
        sellPerUnit: parseFloat(sellPerUnit) || 0,
        unit: unit || parent.unit,
        weight: weight ? parseFloat(weight) : null,
        parentProductId,
        hasVariants: false,
        // Assign options
        ...(optionIds?.length > 0 && {
          variantOptionAssignments: {
            create: optionIds.map((oid: string) => ({ optionId: oid })),
          },
        }),
      },
    })

    // Create initial stock entries per warehouse (copy parent stock with 0 qty)
    const parentStocks = await prisma.warehouseStock.findMany({
      where: { productId: parentProductId },
    })
    if (parentStocks.length > 0) {
      await prisma.warehouseStock.createMany({
        data: parentStocks.map(ps => ({
          productId: variant.id,
          warehouseId: ps.warehouseId,
          quantity: 0,
          minStock: ps.minStock,
          maxStock: ps.maxStock,
        })),
      })
    }

    const created = await prisma.product.findUnique({
      where: { id: variant.id },
      include: {
        warehouseStock: {
          include: { warehouse: { select: { id: true, name: true, code: true } } },
        },
        uoms: { include: { uom: true } },
        variantOptionAssignments: {
          include: {
            option: { include: { group: { select: { id: true, name: true } } } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: created })
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
    const { id, sku, barcode, costPerUnit, sellPerUnit, unit, weight, isActive, optionIds } = body

    if (!id) return NextResponse.json({ error: "Variant ID required" }, { status: 400 })

    await prisma.product.update({
      where: { id },
      data: {
        ...(sku ? { sku } : {}),
        ...(barcode !== undefined ? { barcode: barcode || null } : {}),
        ...(costPerUnit !== undefined ? { costPerUnit: parseFloat(costPerUnit) } : {}),
        ...(sellPerUnit !== undefined ? { sellPerUnit: parseFloat(sellPerUnit) } : {}),
        ...(unit ? { unit } : {}),
        ...(weight !== undefined ? { weight: weight ? parseFloat(weight) : null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })

    // Replace option assignments if provided
    if (optionIds !== undefined) {
      await prisma.productVariantOptionAssignment.deleteMany({
        where: { variantId: id },
      })
      if (optionIds.length > 0) {
        await prisma.productVariantOptionAssignment.createMany({
          data: optionIds.map((optionId: string) => ({ variantId: id, optionId })),
        })
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: {
        warehouseStock: {
          include: { warehouse: { select: { id: true, name: true, code: true } } },
        },
        uoms: { include: { uom: true } },
        variantOptionAssignments: {
          include: {
            option: { include: { group: { select: { id: true, name: true } } } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
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
    if (!id) return NextResponse.json({ error: "Variant ID required" }, { status: 400 })

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
