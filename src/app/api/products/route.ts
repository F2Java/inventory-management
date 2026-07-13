import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { generateSKU } from "@/lib/utils"
import { ActivityActions } from "@/lib/activity-logger"

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "products", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const search = searchParams.get("search") || ""
  const categoryId = searchParams.get("categoryId") || ""
  const warehouseId = searchParams.get("warehouseId") || ""

  try {
    const where: any = { isActive: true }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ]
    }
    if (categoryId) where.categoryId = categoryId

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
          uoms: { include: { uom: true } },
          warehouseStock: {
            include: { warehouse: true },
            ...(warehouseId ? { where: { warehouseId } } : {}),
          },
          suppliers: { include: { supplier: true } },
          // Include variant counts
          childVariants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              costPerUnit: true,
              sellPerUnit: true,
              unit: true,
              warehouseStock: {
                select: { quantity: true },
                ...(warehouseId ? { where: { warehouseId } } : {}),
              },
              variantOptionAssignments: {
                select: {
                  option: {
                    select: {
                      name: true,
                      value: true,
                      group: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
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
      name, description, sku, skuMethod, barcode,
      categoryId, costPerUnit, sellPerUnit, unit, weight,
      branchId, initialStock, warehouseId,
      images,     // Array<{ url: string; thumbnail?: string; isPrimary?: boolean }>
      uoms,       // Array<{ uomId: string; isBase: boolean; conversionToBase: number; sellPrice?: number; costPrice?: number }>
      hasVariants, variantGroups, variants,  // Variant support
    } = body

    // Auto-generate SKU if method is AUTO
    let finalSku = sku
    if (skuMethod === "AUTO" || !sku) {
      const lastProduct = await prisma.product.findFirst({
        orderBy: { createdAt: "desc" },
      })
      const catPrefix = categoryId?.substring(0, 3).toUpperCase() || "PRD"
      const index = lastProduct ? parseInt(lastProduct.sku.slice(-5)) + 1 : 1
      finalSku = generateSKU(catPrefix, index)
    }

    // Create product with nested relations
    const product = await prisma.product.create({
      data: {
        name,
        description,
        sku: finalSku,
        skuMethod: skuMethod || "AUTO",
        barcode: barcode || null,
        categoryId,
        costPerUnit: parseFloat(costPerUnit) || 0,
        sellPerUnit: parseFloat(sellPerUnit) || 0,
        unit: unit || "pcs",
        weight: weight ? parseFloat(weight) : null,
        branchId,
        hasVariants: !!hasVariants,

        // Create images
        ...(images?.length > 0 && {
          images: {
            create: images.map((img: any, i: number) => ({
              url: img.url,
              thumbnail: img.thumbnail || null,
              isPrimary: img.isPrimary || i === 0,
              sortOrder: i,
            })),
          },
        }),

        // Create UoM links
        ...(uoms?.length > 0 && {
          uoms: {
            create: uoms.map((u: any) => ({
              uomId: u.uomId,
              isBase: u.isBase || false,
              conversionToBase: u.conversionToBase || 1,
              sellPrice: u.sellPrice ? parseFloat(String(u.sellPrice)) : null,
              costPrice: u.costPrice ? parseFloat(String(u.costPrice)) : null,
            })),
          },
        }),

        // Create variant groups + options
        ...(hasVariants && variantGroups?.length > 0 && {
          variantGroups: {
            create: variantGroups.map((g: any, gi: number) => ({
              name: g.name,
              sortOrder: g.sortOrder ?? gi,
              options: g.options?.length > 0 ? {
                create: g.options.map((o: any, oi: number) => ({
                  name: o.name,
                  value: o.value || o.name.substring(0, 2).toUpperCase(),
                  sortOrder: o.sortOrder ?? oi,
                })),
              } : undefined,
            })),
          },
        }),
      },
    })

    // Create initial stock if provided
    if (initialStock && warehouseId) {
      await prisma.warehouseStock.create({
        data: {
          productId: product.id,
          warehouseId,
          quantity: parseInt(initialStock),
          minStock: 0,
        },
      })
    }

    // Create variant child products with stock
    if (hasVariants && variants?.length > 0) {
      // Fetch the created groups + options to map names to IDs
      const createdGroups = await prisma.productVariantGroup.findMany({
        where: { productId: product.id },
        include: { options: true },
      })
      // Get parent warehouse stock to copy
      const parentStocks = await prisma.warehouseStock.findMany({
        where: { productId: product.id },
      })

      for (const v of variants) {
        const optionIds: string[] = []

        // Match option labels to created option IDs
        if (v.optionNames?.length > 0) {
          for (const label of v.optionNames) {
            for (const group of createdGroups) {
              const opt = group.options.find(
                (o) => o.name.toLowerCase() === label.toLowerCase() || o.value.toLowerCase() === label.toLowerCase()
              )
              if (opt) {
                optionIds.push(opt.id)
                break
              }
            }
          }
        }

        const variantSku = v.sku || `${product.sku}-V${optionIds.join("")}`

        // Check SKU uniqueness
        const skuExists = await prisma.product.findUnique({ where: { sku: variantSku } })
        if (skuExists) continue // Skip duplicates

        const variant = await prisma.product.create({
          data: {
            name: product.name,
            description: product.description,
            sku: variantSku,
            skuMethod: "MANUAL",
            barcode: v.barcode || null,
            categoryId: product.categoryId,
            costPerUnit: parseFloat(String(v.costPerUnit ?? product.costPerUnit)) || 0,
            sellPerUnit: parseFloat(String(v.sellPerUnit ?? product.sellPerUnit)) || 0,
            unit: v.unit || product.unit,
            parentProductId: product.id,
            hasVariants: false,
            ...(optionIds.length > 0 && {
              variantOptionAssignments: {
                create: optionIds.map((oid) => ({ optionId: oid })),
              },
            }),
          },
        })

        // Copy warehouse stock entries to variant
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
      }
    }

    // Fetch the created product with relations
    const created = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        uoms: { include: { uom: true } },
        category: true,
      },
    })

    // Log activity
    ActivityActions.product.create(session!.user!.id, product.id, name)

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
    const { id, name, description, sku, barcode, categoryId, costPerUnit, sellPerUnit, unit, weight, isActive, images, uoms, warehouseStock } = body

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Update product
    await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        ...(sku ? { sku } : {}),
        barcode: barcode || null,
        categoryId,
        costPerUnit: parseFloat(costPerUnit) || 0,
        sellPerUnit: parseFloat(sellPerUnit) || 0,
        unit: unit || "pcs",
        weight: weight ? parseFloat(weight) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    // Replace images if provided
    if (images !== undefined) {
      await prisma.productImage.deleteMany({ where: { productId: id } })
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img: any, i: number) => ({
            productId: id,
            url: img.url,
            thumbnail: img.thumbnail || null,
            isPrimary: img.isPrimary || i === 0,
            sortOrder: i,
          })),
        })
      }
    }

    // Replace UoMs if provided
    if (uoms !== undefined) {
      await prisma.productUom.deleteMany({ where: { productId: id } })
      if (uoms.length > 0) {
        await prisma.productUom.createMany({
          data: uoms.map((u: any) => ({
            productId: id,
            uomId: u.uomId,
            isBase: u.isBase || false,
            conversionToBase: u.conversionToBase || 1,
            sellPrice: u.sellPrice ? parseFloat(String(u.sellPrice)) : null,
            costPrice: u.costPrice ? parseFloat(String(u.costPrice)) : null,
          })),
        })
      }
    }

    // Update warehouse stock if provided
    // warehouseStock: Array<{ warehouseId: string; quantity: number }>
    if (warehouseStock !== undefined && Array.isArray(warehouseStock)) {
      const incomingIds = warehouseStock.map((ws: any) => ws.warehouseId).filter(Boolean)

      // Upsert each incoming stock entry (create or update)
      for (const ws of warehouseStock) {
        if (!ws.warehouseId) continue
        const qty = parseInt(ws.quantity as any) || 0
        await prisma.warehouseStock.upsert({
          where: {
            productId_warehouseId: { productId: id, warehouseId: ws.warehouseId },
          },
          update: { quantity: qty },
          create: {
            productId: id,
            warehouseId: ws.warehouseId,
            quantity: qty,
            minStock: 0,
          },
        })
      }

      // Delete stock entries that were removed from the array
      await prisma.warehouseStock.deleteMany({
        where: {
          productId: id,
          warehouseId: { notIn: incomingIds },
        },
      })
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        uoms: { include: { uom: true } },
        category: true,
        warehouseStock: { include: { warehouse: true } },
      },
    })

    // Log activity
    ActivityActions.product.update(session!.user!.id, id, name || "")

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
    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    // Fetch product name before soft-delete
    const product = await prisma.product.findUnique({ where: { id }, select: { name: true } })

    // Log activity
    if (product) ActivityActions.product.delete(session!.user!.id, id, product.name)

    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}


