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
    const period = searchParams.get("period") || "year"
    const yearParam = searchParams.get("year") || new Date().getFullYear().toString()
    const year = parseInt(yearParam)

    let startDate: Date
    let endDate: Date = new Date()

    switch (period) {
      case "week":
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        break
      case "month":
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case "year":
      default:
        startDate = new Date(year, 0, 1)
        endDate = new Date(year, 11, 31, 23, 59, 59)
        break
    }

    // Total stats for the period
    const periodSales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    })

    const totalRevenue = periodSales.reduce((sum, s) => sum + s.totalAmount.toNumber(), 0)
    const totalOrders = periodSales.length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Monthly trend
    const monthlyTrend: { month: string; revenue: number; orders: number }[] = []
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for (let m = 0; m < 12; m++) {
      const monthSales = periodSales.filter((s) => {
        const d = new Date(s.createdAt)
        return d.getMonth() === m && d.getFullYear() === year
      })
      const revenue = monthSales.reduce((sum, s) => sum + s.totalAmount.toNumber(), 0)
      monthlyTrend.push({
        month: monthNames[m],
        revenue,
        orders: monthSales.length,
      })
    }

    // Sales by status
    const statusCounts: Record<string, number> = {}
    periodSales.forEach((s) => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
    })
    const salesByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }))

    // Sales by platform
    const salesWithPlatform = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        connectorId: { not: null },
      },
      select: {
        totalAmount: true,
        connectorId: true,
      },
    })

    const connectors = await prisma.ecommerceConnector.findMany({
      select: { id: true, platform: true },
    })
    const connectorMap = new Map(connectors.map((c) => [c.id, c.platform]))

    const platformRevenue: Record<string, { revenue: number; orders: number }> = {
      Direct: { revenue: 0, orders: 0 },
    }

    salesWithPlatform.forEach((s) => {
      const platform = connectorMap.get(s.connectorId || "") || "Direct"
      if (!platformRevenue[platform]) platformRevenue[platform] = { revenue: 0, orders: 0 }
      platformRevenue[platform].revenue += s.totalAmount.toNumber()
      platformRevenue[platform].orders++
    })

    // Count direct sales (no connector)
    const directSales = periodSales.length - salesWithPlatform.length
    platformRevenue["Direct"].orders += directSales

    const salesByPlatform = Object.entries(platformRevenue).map(([platform, data]) => ({
      platform,
      orders: data.orders,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
    }))

    // Daily sales for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { totalAmount: true, createdAt: true },
    })

    const dailyTrend: { date: string; revenue: number; orders: number }[] = []
    for (let d = 29; d >= 0; d--) {
      const date = new Date()
      date.setDate(date.getDate() - d)
      const dateKey = date.toISOString().split("T")[0]
      const dayLabel = date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })

      const daySales = dailySales.filter((s) => {
        const sd = new Date(s.createdAt).toISOString().split("T")[0]
        return sd === dateKey
      })

      dailyTrend.push({
        date: dayLabel,
        revenue: daySales.reduce((sum, s) => sum + s.totalAmount.toNumber(), 0),
        orders: daySales.length,
      })
    }

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      avgOrderValue,
      monthlyTrend,
      salesByStatus,
      salesByPlatform,
      dailyTrend,
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
