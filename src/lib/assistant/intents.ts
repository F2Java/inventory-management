/**
 * AI Assistant — Intent Recognition & Response Generation
 *
 * Parses Indonesian/English natural language queries and maps them
 * to intents. Each intent generates structured responses with data,
 * charts, and action suggestions.
 */

import prisma from "@/lib/prisma"

// ─── Types ─────────────────────────────────────────────────────────────────

export type IntentType =
  | "greeting"
  | "stock_summary"
  | "low_stock"
  | "product_search"
  | "sales_summary"
  | "sales_by_status"
  | "sales_by_platform"
  | "revenue_summary"
  | "pending_approvals"
  | "approve_adjustment"
  | "reject_adjustment"
  | "stock_movements"
  | "warehouse_summary"
  | "po_status"
  | "tracking_status"
  | "chart_comparison"
  | "download_report"
  | "help"
  | "unknown"

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "donut"
  title: string
  labels: string[]
  datasets: { label: string; data: number[]; color?: string }[]
}

export interface ActionButton {
  label: string
  type: "navigate" | "api_call" | "download"
  url?: string
  method?: string
  body?: any
  confirmMessage?: string
  filename?: string
  csvData?: string
}

export interface AssistantResponse {
  message: string
  chart?: ChartConfig
  actions?: ActionButton[]
  data?: any
  timestamp: string
}

export interface ParsedIntent {
  type: IntentType
  confidence: number
  params: Record<string, any>
  originalQuery: string
}

// ─── Keywords ──────────────────────────────────────────────────────────────

const ID_KEYWORDS: Record<string, string[]> = {
  stock: ["stok", "stock", "barang", "inventori", "inventory", "gudang", "persediaan", "jumlah"],
  low_stock: ["stok rendah", "low stock", "habis", "minim", "sedikit", "kurang", "alert", "peringatan", "menipis"],
  product: ["produk", "product", "barang", "sku", "nama barang", "cari"],
  sales: ["penjualan", "sales", "jual", "order", "pesanan", "terjual", "omzet"],
  revenue: ["pendapatan", "revenue", "omset", "pemasukan", "laba", "profit", "uang", "total"],
  approval: ["approve", "setujui", "menyetujui", "pending", "menunggu", "persetujuan", "approval", "reject", "tolak"],
  movement: ["mutasi", "movement", "perpindahan", "transfer", "pindah"],
  warehouse: ["gudang", "warehouse", "WH", "cabang"],
  po: ["purchase order", "PO", "pesanan pembelian", "pembelian", "order beli"],
  tracking: ["tracking", "lacak", "status kirim", "pengiriman", "kurir"],
  chart: ["grafik", "chart", "diagram", "perbandingan", "bandingkan", "compare", "chart"],
  download: ["download", "unduh", "export", "excel", "csv", "pdf", "cetak"],
  help: ["bantuan", "help", "tolong", "panduan", "bisa apa", "fitur", "commands", "perintah"],
  greeting: ["hai", "halo", "hello", "hi", "selamat pagi", "selamat siang", "selamat sore", "selamat malam", "hallo", "pagi", "siang", "sore"],
}

// ─── Intent Recognition ────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s,.!?;:()]+/).filter(Boolean)
}

function matchKeywords(tokens: string[], category: string): number {
  const keywords = ID_KEYWORDS[category] || []
  let score = 0
  const text = tokens.join(" ")

  // Multi-word keywords
  for (const kw of keywords) {
    if (kw.includes(" ") && text.includes(kw)) {
      score += 3
    }
  }

  // Single-word keywords  
  for (const token of tokens) {
    if (keywords.includes(token)) {
      score += 2
    }
  }

  return score
}

export function parseIntent(query: string): ParsedIntent {
  const tokens = tokenize(query)
  const text = query.toLowerCase()

  // Score each intent category
  const scores: Record<string, number> = {}
  for (const category of Object.keys(ID_KEYWORDS)) {
    scores[category] = matchKeywords(tokens, category)
  }

  // Default greeting
  if (scores.greeting >= 2 && Object.values(scores).reduce((a, b) => a + b, 0) <= scores.greeting + 1) {
    return { type: "greeting", confidence: 1, params: {}, originalQuery: query }
  }

  // Help
  if (scores.help >= 2) {
    return { type: "help", confidence: 0.9, params: {}, originalQuery: query }
  }

  // Download
  if (scores.download >= 2) {
    return { type: "download_report", confidence: 0.8, params: { format: "csv" }, originalQuery: query }
  }

  // Low stock
  if (scores.low_stock >= 3 || (scores.stock >= 2 && scores.low_stock >= 2)) {
    return { type: "low_stock", confidence: 0.85, params: {}, originalQuery: query }
  }

  // Pending approvals
  if (scores.approval >= 2 || (text.includes("approve") && text.includes("pending"))) {
    return { type: "pending_approvals", confidence: 0.8, params: {}, originalQuery: query }
  }

  // Sales with chart
  if (scores.sales >= 2 && scores.chart >= 1) {
    return { type: "chart_comparison", confidence: 0.75, params: { metric: "sales" }, originalQuery: query }
  }

  // Revenue with chart
  if (scores.revenue >= 2 && scores.chart >= 1) {
    return { type: "chart_comparison", confidence: 0.75, params: { metric: "revenue" }, originalQuery: query }
  }

  // Sales summary
  if (scores.sales >= 2) {
    if (text.includes("status")) return { type: "sales_by_status", confidence: 0.8, params: {}, originalQuery: query }
    if (text.includes("platform") || text.includes("ecommerce") || text.includes("tokped") || text.includes("shopee")) {
      return { type: "sales_by_platform", confidence: 0.8, params: {}, originalQuery: query }
    }
    return { type: "sales_summary", confidence: 0.8, params: {}, originalQuery: query }
  }

  // Revenue summary
  if (scores.revenue >= 2) {
    return { type: "revenue_summary", confidence: 0.8, params: {}, originalQuery: query }
  }

  // Product search
  if (scores.product >= 2) {
    return { type: "product_search", confidence: 0.75, params: { keyword: query.replace(/produk|product|barang|cari/gi, "").trim() }, originalQuery: query }
  }

  // Stock summary
  if (scores.stock >= 2) {
    if (text.includes("mutasi") || text.includes("movement") || text.includes("perpindahan") || text.includes("transfer")) {
      return { type: "stock_movements", confidence: 0.8, params: {}, originalQuery: query }
    }
    if (scores.warehouse >= 1) {
      return { type: "warehouse_summary", confidence: 0.8, params: {}, originalQuery: query }
    }
    return { type: "stock_summary", confidence: 0.8, params: {}, originalQuery: query }
  }

  // Warehouse summary
  if (scores.warehouse >= 2) {
    return { type: "warehouse_summary", confidence: 0.8, params: {}, originalQuery: query }
  }

  // PO status
  if (scores.po >= 2) {
    return { type: "po_status", confidence: 0.8, params: {}, originalQuery: query }
  }

  // Tracking status
  if (scores.tracking >= 2) {
    return { type: "tracking_status", confidence: 0.8, params: {}, originalQuery: query }
  }

  // Chart comparison (generic)
  if (scores.chart >= 1) {
    if (scores.sales >= 1) return { type: "chart_comparison", confidence: 0.7, params: { metric: "sales" }, originalQuery: query }
    if (scores.revenue >= 1) return { type: "chart_comparison", confidence: 0.7, params: { metric: "revenue" }, originalQuery: query }
    return { type: "chart_comparison", confidence: 0.6, params: { metric: "stock" }, originalQuery: query }
  }

  return { type: "unknown", confidence: 0.3, params: {}, originalQuery: query }
}

// ─── Response Generators ──────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString("id-ID")
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 10) return "pagi"
  if (hour < 15) return "siang"
  if (hour < 18) return "sore"
  return "malam"
}

const GREETING_RESPONSES = [
  `Halo! Selamat ${getGreeting()}! 👋 Ada yang bisa saya bantu? Saya bisa cek stok, penjualan, approval, dan banyak lagi.`,
  `Hai! Selamat ${getGreeting()}! 😊 Silakan tanya apa saja tentang inventory, penjualan, atau laporan.`,
  `Halo! ${getGreeting() === "pagi" ? "Semangat pagi!" : getGreeting() === "siang" ? "Semangat siang!" : "Selamat beraktivitas!"} Ada yang bisa saya bantu hari ini?`,
]

const HELP_RESPONSE = `Berikut yang bisa saya bantu:

📦 **Stok & Produk**
• "Cek stok barang" — Lihat ringkasan stok semua gudang
• "Stok rendah" — Lihat barang dengan stok menipis
• "Cari produk [nama]" — Cari produk tertentu
• "Stok per gudang" — Lihat stok per gudang

💰 **Penjualan & Revenue**
• "Lihat penjualan" — Ringkasan penjualan
• "Penjualan per status" — Grafik status pesanan
• "Penjualan per platform" — Perbandingan e-commerce
• "Grafik pendapatan" — Tren pendapatan

✅ **Approval**
• "Pending approval" — Lihat adjustment pending
• "Setujui [nomor]" — Approve adjustment
• "Tolak [nomor]" — Reject adjustment

📊 **Laporan & Chart**
• "Bandingkan penjualan" — Chart perbandingan
• "Grafik stok" — Chart stok per gudang
• "Download laporan" — Export data CSV

📋 **Lainnya**
• "Status PO" — Cek purchase order
• "Tracking pesanan" — Status pengiriman
• "Mutasi stok" — Riwayat perpindahan barang`

export async function generateResponse(intent: ParsedIntent, session: any): Promise<AssistantResponse> {
  const now = new Date().toISOString()

  switch (intent.type) {
    case "greeting": {
      const name = session?.user?.name || "Admin"
      return {
        message: `${GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)]}`,
        actions: [
          { label: "📦 Cek Stok", type: "api_call", url: "/api/inventory" },
          { label: "📊 Lihat Grafik", type: "navigate", url: "/dashboard" },
          { label: "✅ Pending Approvals", type: "api_call", url: "/api/inventory/adjust?status=PENDING" },
        ],
        timestamp: now,
      }
    }

    case "stock_summary": {
      try {
        const [totalProducts, totalStock, lowStock, outOfStock] = await Promise.all([
          prisma.product.count({ where: { isActive: true } }),
          prisma.warehouseStock.aggregate({ _sum: { quantity: true } }),
          prisma.warehouseStock.count({ where: { quantity: { gt: 0, lte: prisma.warehouseStock.fields.minStock } } }),
          prisma.warehouseStock.count({ where: { quantity: 0 } }),
        ])

        const stockVal = totalStock._sum.quantity || 0

        return {
          message: `📦 **Ringkasan Stok Saat Ini**

• **Total Produk Aktif:** ${formatNumber(totalProducts)}
• **Total Unit Stok:** ${formatNumber(stockVal)}
• **Stok Menipis:** ${lowStock} produk ⚠️
• **Habis:** ${outOfStock} produk 🔴

${lowStock > 0 ? `Ada ${lowStock} produk dengan stok menipis, perlu re-stock segera!` : "Semua stok dalam kondisi baik ✅"}`,
          chart: {
            type: "bar",
            title: "Status Stok",
            labels: ["Tersedia", "Menipis", "Habis"],
            datasets: [{ label: "Produk", data: [totalProducts - lowStock - outOfStock, lowStock, outOfStock], color: "#3B82F6" }],
          },
          actions: [
            { label: "🔍 Lihat Detail Stok", type: "navigate", url: "/inventory" },
            { label: "📋 Request Stok", type: "navigate", url: "/inventory?action=request" },
            { label: "⚠️ Atur Threshold", type: "navigate", url: "/inventory/thresholds" },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan saat mengambil data stok. Silakan coba lagi.", timestamp: now }
      }
    }

    case "low_stock": {
      try {
        const lowStockItems = await prisma.warehouseStock.findMany({
          where: { quantity: { gt: 0, lte: prisma.warehouseStock.fields.minStock } },
          include: { product: { select: { name: true, sku: true } }, warehouse: { select: { name: true } } },
          orderBy: { quantity: "asc" },
          take: 20,
        })

        const outOfStock = await prisma.warehouseStock.count({ where: { quantity: 0 } })

        if (lowStockItems.length === 0 && outOfStock === 0) {
          return { message: "✅ Semua stok dalam kondisi baik! Tidak ada produk dengan stok menipis.", timestamp: now }
        }

        const itemsList = lowStockItems.slice(0, 10).map(
          (item) => `• **${item.product.name}** — ${item.quantity} unit (min: ${item.minStock}) — ${item.warehouse.name}`
        ).join("\n")

        const chartLabels = lowStockItems.slice(0, 8).map((i) => i.product.name.length > 15 ? i.product.name.slice(0, 15) + "..." : i.product.name)
        const chartData = lowStockItems.slice(0, 8).map((i) => i.quantity)

        return {
          message: `⚠️ **Peringatan Stok Rendah**

• **Stok Menipis:** ${lowStockItems.length} produk
• **Habis:** ${outOfStock} produk 🔴

${itemsList}

${lowStockItems.length > 10 ? `\n...dan ${lowStockItems.length - 10} produk lainnya` : ""}

💰 Segera lakukan re-stock untuk menghindari lost sales!`,
          chart: chartLabels.length > 0 ? {
            type: "bar",
            title: "Stok Menipis (Top 8)",
            labels: chartLabels,
            datasets: [{ label: "Stok", data: chartData, color: "#F59E0B" }],
          } : undefined,
          actions: [
            { label: "📋 Buat Stock Request", type: "navigate", url: "/inventory?action=request" },
            { label: "⚙️ Atur Threshold", type: "navigate", url: "/inventory/thresholds" },
            { label: "📦 Lihat Semua Stok", type: "navigate", url: "/inventory" },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan. Silakan coba lagi.", timestamp: now }
      }
    }

    case "sales_summary": {
      try {
        const [totalSales, totalRevenue, pendingOrders] = await Promise.all([
          prisma.sale.count(),
          prisma.sale.aggregate({ _sum: { totalAmount: true } }),
          prisma.sale.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
        ])

        const rev = totalRevenue._sum.totalAmount || 0
        const revFormatted = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(rev))

        return {
          message: `💰 **Ringkasan Penjualan**

• **Total Pesanan:** ${formatNumber(totalSales)}
• **Total Pendapatan:** ${revFormatted}
• **Pesanan Aktif:** ${pendingOrders}
• **Selesai:** ${formatNumber(totalSales - pendingOrders)}

${pendingOrders > 0 ? `Ada ${pendingOrders} pesanan yang perlu diproses!` : "Semua pesanan sudah diproses ✅"}`,
          actions: [
            { label: "📊 Dashboard Penjualan", type: "navigate", url: "/dashboard" },
            { label: "📋 Lihat Pesanan", type: "navigate", url: "/tracking" },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan saat mengambil data penjualan.", timestamp: now }
      }
    }

    case "sales_by_status": {
      try {
        const statusCounts = await prisma.sale.groupBy({
          by: ["status"],
          _count: { id: true },
        })

        const labels = statusCounts.map((s) => s.status)
        const data = statusCounts.map((s) => s._count.id)

        return {
          message: `📊 **Penjualan per Status**

${statusCounts.map((s) => `• **${s.status}:** ${s._count.id} pesanan`).join("\n")}`,
          chart: {
            type: "pie",
            title: "Distribusi Status Pesanan",
            labels,
            datasets: [{ label: "Jumlah", data, color: "#8B5CF6" }],
          },
          actions: [
            { label: "📋 Detail Tracking", type: "navigate", url: "/tracking" },
            { label: "📊 Dashboard", type: "navigate", url: "/dashboard" },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan.", timestamp: now }
      }
    }

    case "sales_by_platform": {
      try {
        const platformData = await prisma.sale.groupBy({
          by: ["connectorId"],
          _count: { id: true },
          _sum: { totalAmount: true },
        })

        const connectors = await prisma.ecommerceConnector.findMany({ select: { id: true, platform: true } })
        const connMap = new Map(connectors.map((c) => [c.id, c.platform]))

        const labels = platformData.map((s) => connMap.get(s.connectorId || "") || "Toko Langsung")
        const counts = platformData.map((s) => s._count.id)
        const revenues = platformData.map((s) => Number(s._sum.totalAmount || 0))

        return {
          message: `📊 **Penjualan per Platform**

${platformData.map((s) => {
  const plat = connMap.get(s.connectorId || "") || "Toko Langsung"
  return `• **${plat}:** ${s._count.id} pesanan — ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(s._sum.totalAmount || 0))}`
}).join("\n")}`,
          chart: {
            type: "donut",
            title: "Penjualan per Platform",
            labels,
            datasets: [{ label: "Pesanan", data: counts, color: "#10B981" }],
          },
          actions: [
            { label: "📊 Dashboard", type: "navigate", url: "/dashboard" },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan.", timestamp: now }
      }
    }

    case "revenue_summary": {
      try {
        const monthly = await prisma.$queryRaw<{ month: string; revenue: number }[]>`
          SELECT to_char("orderDate", 'YYYY-MM') as month, SUM("totalAmount") as revenue
          FROM sales WHERE "orderDate" >= NOW() - INTERVAL '12 months'
          GROUP BY month ORDER BY month ASC
        `

        const labels = monthly.map((m) => {
          const [y, mo] = m.month.split("-")
          const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
          return `${months[parseInt(mo) - 1]} ${y}`
        })
        const data = monthly.map((m) => Number(m.revenue))

        const totalRev = data.reduce((a, b) => a + b, 0)
        const avgRev = data.length > 0 ? totalRev / data.length : 0
        const revFormatted = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })

        return {
          message: `💰 **Ringkasan Pendapatan (12 Bulan)**

• **Total:** ${revFormatted.format(totalRev)}
• **Rata-rata/Bulan:** ${revFormatted.format(avgRev)}
• **Bulan Terbaik:** ${data.length > 0 ? `${labels[data.indexOf(Math.max(...data))]}` : "N/A"} (${revFormatted.format(Math.max(...data))})`,
          chart: {
            type: "line",
            title: "Tren Pendapatan 12 Bulan",
            labels,
            datasets: [{ label: "Pendapatan", data, color: "#10B981" }],
          },
          actions: [
            { label: "📊 Dashboard", type: "navigate", url: "/dashboard" },
            { label: "📋 Laporan Lengkap", type: "navigate", url: "/reports" },
            { label: "📥 Download CSV", type: "download", filename: "revenue-report.csv", csvData: `Bulan,Pendapatan\n${monthly.map((m) => `${m.month},${m.revenue}`).join("\n")}` },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan.", timestamp: now }
      }
    }

    case "pending_approvals": {
      try {
        const pending = await prisma.stockAdjustment.findMany({
          where: { status: "PENDING" },
          include: {
            product: { select: { name: true, sku: true } },
            warehouse: { select: { name: true } },
            requestedBy: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })

        if (pending.length === 0) {
          return { message: "✅ Tidak ada adjustment yang menunggu persetujuan. Semua sudah diproses!", timestamp: now }
        }

        const itemsList = pending.slice(0, 5).map(
          (adj) => `• **${adj.product.name}** — ${adj.warehouse.name} — ${adj.previousQty} → ${adj.newQty} (${adj.difference > 0 ? "+" : ""}${adj.difference}) — oleh ${adj.requestedBy.name}`
        ).join("\n")

        return {
          message: `✅ **${pending.length} Adjustment Pending**

${itemsList}
${pending.length > 5 ? `\n...dan ${pending.length - 5} lainnya` : ""}

Pilih aksi di bawah untuk menyetujui atau menolak.`,
          actions: pending.slice(0, 5).map((adj) => ({
            label: `✅ Setujui ${adj.product.name}`,
            type: "api_call" as const,
            url: `/api/inventory/adjust/${adj.id}`,
            method: "PUT",
            body: { action: "approve" },
            confirmMessage: `Setujui adjustment ${adj.product.name}?`
          })),
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan.", timestamp: now }
      }
    }

    case "warehouse_summary": {
      try {
        const warehouses = await prisma.warehouse.findMany({
          include: { _count: { select: { stock: true } } },
        })
        const stockPerWh = await Promise.all(
          warehouses.map(async (wh) => {
            const agg = await prisma.warehouseStock.aggregate({ where: { warehouseId: wh.id }, _sum: { quantity: true } })
            return { ...wh, totalQty: agg._sum.quantity || 0 }
          })
        )

        return {
          message: `🏭 **Ringkasan Stok per Gudang**

${stockPerWh.map((wh) => `• **${wh.name}** (${wh.code}) — ${formatNumber(wh.totalQty)} unit — ${wh._count.stock} produk`).join("\n")}`,
          chart: {
            type: "bar",
            title: "Stok per Gudang",
            labels: stockPerWh.map((w) => w.name),
            datasets: [{ label: "Total Unit", data: stockPerWh.map((w) => w.totalQty), color: "#6366F1" }],
          },
          actions: [
            { label: "🏭 Kelola Gudang", type: "navigate", url: "/warehouses" },
            { label: "📦 Lihat Stok", type: "navigate", url: "/inventory" },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan.", timestamp: now }
      }
    }

    case "po_status": {
      try {
        const poCounts = await prisma.purchaseOrder.groupBy({
          by: ["status"],
          _count: { id: true },
        })

        const totalPO = poCounts.reduce((a, b) => a + b._count.id, 0)
        const statusCounts: Record<string, number> = {}
        poCounts.forEach((p) => { statusCounts[p.status] = p._count.id })

        return {
          message: `📋 **Ringkasan Purchase Order**

• **Total PO:** ${totalPO}
${Object.entries(statusCounts).map(([s, c]) => `• **${s}:** ${c}`).join("\n")}`,
          chart: {
            type: "pie",
            title: "Status Purchase Order",
            labels: Object.keys(statusCounts),
            datasets: [{ label: "Jumlah", data: Object.values(statusCounts), color: "#3B82F6" }],
          },
          actions: [
            { label: "📋 Kelola PO", type: "navigate", url: "/procurement/purchase-orders" },
            { label: "➕ Buat PO Baru", type: "navigate", url: "/procurement/purchase-orders/new" },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan.", timestamp: now }
      }
    }

    case "tracking_status": {
      try {
        const trackingCounts = await prisma.orderTracking.groupBy({
          by: ["status"],
          _count: { id: true },
        })

        const staleCount = await prisma.orderTracking.count({
          where: { lastStatusChangeAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
        })

        const total = trackingCounts.reduce((a, b) => a + b._count.id, 0)

        return {
          message: `📦 **Ringkasan Tracking Pesanan**

• **Total Tracking:** ${total}
${trackingCounts.map((t) => `• **${t.status}:** ${t._count.id}`).join("\n")}
${staleCount > 0 ? `\n⚠️ ${staleCount} pesanan stagnan >3 hari!` : "\n✅ Semua pesanan berjalan lancar."}`,
          chart: {
            type: "bar",
            title: "Tracking per Status",
            labels: trackingCounts.map((t) => t.status),
            datasets: [{ label: "Pesanan", data: trackingCounts.map((t) => t._count.id), color: "#F59E0B" }],
          },
          actions: [
            { label: "📋 Halaman Tracking", type: "navigate", url: "/tracking" },
            { label: "📊 Dashboard", type: "navigate", url: "/dashboard" },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan.", timestamp: now }
      }
    }

    case "chart_comparison": {
      const metric = intent.params.metric || "sales"
      try {
        if (metric === "revenue") {
          const monthly = await prisma.$queryRaw<{ month: string; revenue: number; count: number }[]>`
            SELECT to_char("orderDate", 'YYYY-MM') as month,
                   SUM("totalAmount") as revenue,
                   COUNT(*)::int as count
            FROM sales WHERE "orderDate" >= NOW() - INTERVAL '6 months'
            GROUP BY month ORDER BY month ASC
          `

          const labels = monthly.map((m) => {
            const [y, mo] = m.month.split("-")
            const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
            return `${months[parseInt(mo) - 1]}`
          })

          return {
            message: `📊 **Perbandingan Pendapatan 6 Bulan**

${monthly.map((m) => {
  const [y, mo] = m.month.split("-")
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
  return `• ${months[parseInt(mo) - 1]}: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(m.revenue))} (${m.count} pesanan)`
}).join("\n")}`,
            chart: {
              type: "bar",
              title: "Perbandingan Pendapatan vs Jumlah Pesanan",
              labels,
              datasets: [
                { label: "Pendapatan (Rp)", data: monthly.map((m) => Number(m.revenue)), color: "#10B981" },
                { label: "Jumlah Pesanan", data: monthly.map((m) => m.count), color: "#6366F1" },
              ],
            },
            actions: [{ label: "📊 Dashboard", type: "navigate", url: "/dashboard" }, { label: "📥 Download", type: "download", filename: "revenue-comparison.csv", csvData: monthly.map((m) => `${m.month},${m.revenue},${m.count}`).join("\n") }],
            timestamp: now,
          }
        }

        if (metric === "stock") {
          const stockPerWh = await prisma.warehouse.findMany({ include: { _count: { select: { stock: true } } } })
          const whData = await Promise.all(
            stockPerWh.map(async (wh) => {
              const agg = await prisma.warehouseStock.aggregate({ where: { warehouseId: wh.id }, _sum: { quantity: true } })
              return { name: wh.name, stock: agg._sum.quantity || 0, products: wh._count.stock }
            })
          )

          return {
            message: `📊 **Perbandingan Stok per Gudang**

${whData.map((w) => `• **${w.name}** — ${formatNumber(w.stock)} unit (${w.products} produk)`).join("\n")}`,
            chart: {
              type: "bar",
              title: "Perbandingan Stok Antar Gudang",
              labels: whData.map((w) => w.name),
              datasets: [
                { label: "Total Unit", data: whData.map((w) => w.stock), color: "#3B82F6" },
                { label: "Jumlah Produk", data: whData.map((w) => w.products), color: "#8B5CF6" },
              ],
            },
            actions: [{ label: "🏭 Gudang", type: "navigate", url: "/warehouses" }],
            timestamp: now,
          }
        }

        // Default: sales comparison
        const monthly = await prisma.$queryRaw<{ month: string; count: number }[]>`
          SELECT to_char("orderDate", 'YYYY-MM') as month, COUNT(*)::int as count
          FROM sales WHERE "orderDate" >= NOW() - INTERVAL '6 months'
          GROUP BY month ORDER BY month ASC
        `

        const labels = monthly.map((m) => {
          const [y, mo] = m.month.split("-")
          const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
          return `${months[parseInt(mo) - 1]}`
        })

        return {
          message: `📊 **Perbandingan Penjualan 6 Bulan**

${monthly.map((m) => `• ${labels[monthly.indexOf(m)]}: ${m.count} pesanan`).join("\n")}`,
          chart: {
            type: "line",
            title: "Tren Penjualan 6 Bulan",
            labels,
            datasets: [{ label: "Pesanan", data: monthly.map((m) => m.count), color: "#3B82F6" }],
          },
          actions: [
            { label: "📊 Dashboard", type: "navigate", url: "/dashboard" },
            { label: "📥 Download CSV", type: "download", filename: "sales-comparison.csv", csvData: monthly.map((m) => `${m.month},${m.count}`).join("\n") },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan saat membuat grafik.", timestamp: now }
      }
    }

    case "download_report": {
      return {
        message: `📥 **Download Laporan**

Pilih laporan yang ingin di-download:`,
        actions: [
          { label: "📦 Stok CSV", type: "download", filename: "stock-report.csv", csvData: "Product,SKU,Warehouse,Quantity\n" },
          { label: "💰 Penjualan CSV", type: "download", filename: "sales-report.csv", csvData: "Order,Customer,Total,Status\n" },
          { label: "📊 Laporan Lengkap", type: "navigate", url: "/reports" },
        ],
        timestamp: now,
      }
    }

    case "product_search": {
      const keyword = intent.params.keyword || ""
      try {
        const products = await prisma.product.findMany({
          where: {
            OR: [
              { name: { contains: keyword, mode: "insensitive" } },
              { sku: { contains: keyword, mode: "insensitive" } },
            ],
            isActive: true,
          },
          take: 10,
        })

        if (products.length === 0) {
          return { message: `Tidak ditemukan produk dengan kata kunci "${keyword}". Coba kata kunci lain.`, timestamp: now }
        }

        return {
          message: `🔍 **Hasil Pencarian: ${keyword}**

${products.map((p) => `• **${p.name}** — SKU: ${p.sku} — Harga Jual: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(p.sellPerUnit))}`).join("\n")}`,
          actions: [
            { label: "📦 Kelola Produk", type: "navigate", url: "/products" },
            { label: "➕ Tambah Produk", type: "navigate", url: "/products/new" },
          ],
          timestamp: now,
        }
      } catch (e) {
        return { message: "Maaf, terjadi kesalahan.", timestamp: now }
      }
    }

    case "help": {
      return {
        message: HELP_RESPONSE,
        actions: [
          { label: "📦 Cek Stok", type: "api_call", url: "/api/inventory" },
          { label: "💰 Cek Penjualan", type: "navigate", url: "/dashboard" },
          { label: "✅ Pending Approvals", type: "api_call", url: "/api/inventory/adjust?status=PENDING" },
        ],
        timestamp: now,
      }
    }

    default: {
      return {
        message: `Maaf, saya belum bisa memahami pertanyaan tersebut. 😅

Coba tanyakan hal berikut:
• "Cek stok barang"
• "Stok rendah"
• "Lihat penjualan"
• "Pending approval"
• "Grafik perbandingan"

Atau ketik "bantuan" untuk melihat semua yang bisa saya lakukan.`,
        actions: [
          { label: "📖 Bantuan", type: "api_call", url: "/api/assistant/chat" },
          { label: "📦 Cek Stok", type: "api_call", url: "/api/inventory" },
        ],
        timestamp: now,
      }
    }
  }
}
