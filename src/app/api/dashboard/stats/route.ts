import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get total products
    const totalProducts = await prisma.product.count({ where: { isActive: true } })

    // Get total sales
    const totalSales = await prisma.sale.count()

    // Get total revenue (sum of all sales totalAmount)
    const revenueAgg = await prisma.sale.aggregate({
      _sum: { totalAmount: true },
    })
    const totalRevenue = revenueAgg._sum.totalAmount?.toNumber() || 0

    // Get low stock items (items where qty > 0 and qty <= minStock)
    const allStock = await prisma.warehouseStock.findMany({
      where: { quantity: { gt: 0 } },
      select: { quantity: true, minStock: true },
    })
    const lowStockItems = allStock.filter((s) => s.quantity <= s.minStock).length

    // Get inventory value (total quantity * costPerUnit across all warehouses)
    const stockWithCost = await prisma.warehouseStock.findMany({
      where: { quantity: { gt: 0 } },
      select: {
        quantity: true,
        product: { select: { costPerUnit: true } },
      },
    })
    const inventoryValue = stockWithCost.reduce(
      (sum, s) => sum + s.quantity * Number(s.product.costPerUnit),
      0
    )

    // Get pending/processing orders
    const pendingOrders = await prisma.sale.count({
      where: {
        status: { in: ["PENDING", "PROCESSING", "PACKAGING"] },
      },
    })

    // Monthly revenue for last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const monthlySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: twelveMonthsAgo },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    })

    // Group by month
    const monthlyRevenue: { month: string; revenue: number }[] = []
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const monthName = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`

      const revenue = monthlySales
        .filter((s) => {
          const sd = new Date(s.createdAt)
          return `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}` === monthKey
        })
        .reduce((sum, s) => sum + s.totalAmount.toNumber(), 0)

      monthlyRevenue.push({ month: monthName, revenue })
    }

    // Sales by status
    const salesByStatusRaw = await prisma.sale.groupBy({
      by: ["status"],
      _count: { id: true },
    })
    const salesByStatus = salesByStatusRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }))

    // Sales by platform
    const salesByPlatformRaw = await prisma.sale.groupBy({
      by: ["connectorId"],
      _count: { id: true },
      _sum: { totalAmount: true },
    })

    const connectors = await prisma.ecommerceConnector.findMany({
      select: { id: true, platform: true },
    })
    const connectorMap = new Map(connectors.map((c) => [c.id, c.platform]))

    const salesByPlatform = salesByPlatformRaw.map((s) => ({
      platform: connectorMap.get(s.connectorId || "") || "Direct",
      orders: s._count.id,
      revenue: s._sum.totalAmount?.toNumber() || 0,
    }))

    // Recent orders
    const recentOrders = await prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: true } },
        branch: true,
      },
    })

    // Top products
    const topProductsRaw = await prisma.saleItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
    })

    const productIds = topProductsRaw.map((p) => p.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p.name]))

    const topProducts = topProductsRaw.map((p) => ({
      name: productMap.get(p.productId) || "Unknown",
      sold: p._sum.quantity || 0,
      revenue: p._sum.totalPrice?.toNumber() || 0,
    }))

    return NextResponse.json({
      totalProducts,
      totalSales,
      totalRevenue,
      pendingOrders,
      lowStockItems,
      inventoryValue,
      monthlyRevenue,
      salesByStatus,
      salesByPlatform,
      recentOrders: recentOrders.map((o) => ({
        id: o.orderNumber,
        product: o.items?.[0]?.product?.name || "-",
        customer: o.customerName || "Guest",
        status: o.status.toLowerCase(),
        amount: o.totalAmount.toNumber(),
        date: o.createdAt,
      })),
      topProducts,
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
