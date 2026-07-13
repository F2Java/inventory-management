import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const permErr = await requirePermission(session, "branches", "delete")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })

    // Check if branch has sales
    const salesCount = await prisma.sale.count({ where: { branchId: id } })
    if (salesCount > 0) {
      return NextResponse.json({
        error: `Cannot delete branch with ${salesCount} sale(s). Deactivate instead.`,
      }, { status: 400 })
    }

    // Check if branch has users
    const userCount = await prisma.user.count({ where: { branchId: id } })
    if (userCount > 0) {
      return NextResponse.json({
        error: `Cannot delete branch with ${userCount} user(s) assigned. Reassign users first.`,
      }, { status: 400 })
    }

    // Check if branch has purchase orders
    const poCount = await prisma.purchaseOrder.count({ where: { branchId: id } })
    if (poCount > 0) {
      return NextResponse.json({
        error: `Cannot delete branch with ${poCount} purchase order(s). Remove PO references first.`,
      }, { status: 400 })
    }

    // Disconnect warehouses first, then delete (ecommerce connector cascades)
    await prisma.warehouseBranch.deleteMany({ where: { branchId: id } })
    await prisma.branch.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function GET() {
  const session = await auth()
  const permErr = await requirePermission(session, "branches", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const branches = await prisma.branch.findMany({
      include: {
        warehouses: {
          include: {
            warehouse: {
              include: {
                _count: { select: { stock: true } },
              },
            },
          },
        },
        ecommerceConnector: {
          select: { id: true, platform: true, storeName: true, isActive: true, lastSyncAt: true },
        },
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Get stock summary per warehouse for each branch
    const enriched = await Promise.all(
      branches.map(async (branch) => {
        const warehouseIds = branch.warehouses.map((wb) => wb.warehouseId)
        const stockAgg = await prisma.warehouseStock.aggregate({
          where: { warehouseId: { in: warehouseIds } },
          _sum: { quantity: true },
        })
        const lowStockProducts = await prisma.warehouseStock.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            quantity: { gt: 0, lte: prisma.warehouseStock.fields.minStock },
          },
          select: { id: true, quantity: true },
        })

        return {
          id: branch.id,
          code: branch.code,
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          isActive: branch.isActive,
          warehouses: branch.warehouses.map((wb) => ({
            id: wb.warehouse.id,
            code: wb.warehouse.code,
            name: wb.warehouse.name,
            type: wb.warehouse.type,
            productCount: wb.warehouse._count.stock,
          })),
          ecommerceConnector: branch.ecommerceConnector,
          totalStock: stockAgg._sum.quantity || 0,
          lowStockItems: lowStockProducts.length,
          lowStockQty: lowStockProducts.reduce((sum, r) => sum + r.quantity, 0),
          salesCount: branch._count.sales,
          createdAt: branch.createdAt,
        }
      })
    )

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
  const permErr = await requirePermission(session, "branches", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { code, name, address, phone, email, warehouseIds, platform, apiEndpoint, apiKey, apiSecret, storeName } = body

    const branch = await prisma.branch.create({
      data: {
        code,
        name,
        address,
        phone,
        email,
        merchantId: session.user.merchantId!,
      },
    })

    // Link warehouses
    if (warehouseIds?.length > 0) {
      await prisma.warehouseBranch.createMany({
        data: warehouseIds.map((wid: string) => ({
          warehouseId: wid,
          branchId: branch.id,
        })),
      })
    }

    // Create e-commerce connector if provided
    if (platform && platform !== "NONE") {
      await prisma.ecommerceConnector.create({
        data: {
          platform,
          apiEndpoint: apiEndpoint || "",
          apiKey: apiKey || "",
          apiSecret: apiSecret || "",
          storeName: storeName || null,
          branchId: branch.id,
        },
      })
    }

    return NextResponse.json({ success: true, data: branch })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A branch with this code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
