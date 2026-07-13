// Stock Sync Service
// Pushes stock level changes to all connected e-commerce platforms
// Called automatically after sales, manual adjustments, or receiving POs

import prisma from "@/lib/prisma"
import { createConnector } from "./connector"

/**
 * Push stock update for a product to ALL connected e-commerce platforms
 * that have at least one stock record for this product at their linked warehouses.
 */
export async function pushStockUpdateToPlatforms(
  productId: string,
  newQuantity?: number
): Promise<{
  success: boolean
  synced: number
  failed: number
  errors: string[]
}> {
  const result = { success: true, synced: 0, failed: 0, errors: [] as string[] }

  try {
    // Get all active connectors whose branches link to warehouses containing this product
    const connectors = await prisma.ecommerceConnector.findMany({
      where: { isActive: true },
      include: {
        branch: {
          include: {
            warehouses: {
              include: {
                warehouse: {
                  include: {
                    stock: {
                      where: { productId },
                      select: { quantity: true, id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    // Filter to only connectors whose linked warehouses have stock for this product
    const relevantConnectors = connectors.filter(
      (c) =>
        c.branch.warehouses.some((wb) => wb.warehouse.stock.length > 0)
    )

    if (relevantConnectors.length === 0) {
      return result // No platforms to sync to
    }

    // Determine the total available stock across all linked warehouses
    let totalStock = newQuantity ?? 0
    if (newQuantity === undefined) {
      // Calculate from the first linked warehouse's stock
      const firstConnector = relevantConnectors[0]
      if (firstConnector) {
        totalStock = firstConnector.branch.warehouses.reduce(
          (sum, wb) =>
            sum + (wb.warehouse.stock[0]?.quantity ?? 0),
          0
        )
      }
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, sku: true },
    })

    // Push stock update to each connected platform
    for (const connector of relevantConnectors) {
      try {
        const api = createConnector(connector.platform, {
          apiEndpoint: connector.apiEndpoint,
          apiKey: connector.apiKey,
          apiSecret: connector.apiSecret || undefined,
          config: (connector.config as Record<string, any>) || undefined,
        })

        const syncResult = await api.updateStock(productId, totalStock)

        if (syncResult.success) {
          result.synced++
          await logSync(connector.id, "stock", "success", `Stock synced for ${product?.sku || productId} (${totalStock} units) to ${connector.platform}`)
        } else {
          result.failed++
          result.errors.push(`${connector.platform}: ${syncResult.error}`)
          await logSync(connector.id, "stock", "failed", `${connector.platform}: ${syncResult.error}`)
        }
      } catch (err: any) {
        result.failed++
        result.errors.push(`${connector.platform}: ${err.message}`)
        await logSync(connector.id, "stock", "failed", `${connector.platform}: ${err.message}`)
      }
    }

    // Update lastSyncAt for all relevant connectors
    if (relevantConnectors.length > 0) {
      await prisma.ecommerceConnector.updateMany({
        where: { id: { in: relevantConnectors.map((c) => c.id) } },
        data: { lastSyncAt: new Date() },
      })
    }

    result.success = result.failed === 0
    return result
  } catch (error: any) {
    result.success = false
    result.errors.push(error.message)
    return result
  }
}

/**
 * Sync ALL products' stock across all warehouses to all connected platforms.
 * Useful for initial bulk sync or manual "Sync All" operations.
 */
export async function bulkSyncAllStock(): Promise<{
  success: boolean
  productsSynced: number
  totalErrors: number
  errors: string[]
}> {
  const result = { success: true, productsSynced: 0, totalErrors: 0, errors: [] as string[] }

  try {
    // Get all products that have warehouse stock
    // Get all stock records (not distinct — we need to sum across warehouses)
    const stockRecords = await prisma.warehouseStock.findMany({
      where: { quantity: { gt: 0 } },
      select: { productId: true, quantity: true },
    })

    // Sum quantities per product across all warehouses
    const stockTotals = new Map<string, number>()
    for (const ws of stockRecords) {
      stockTotals.set(
        ws.productId,
        (stockTotals.get(ws.productId) || 0) + ws.quantity
      )
    }

    // Push stock for each product
    for (const [productId, quantity] of stockTotals.entries()) {
      const syncResult = await pushStockUpdateToPlatforms(productId, quantity)
      if (syncResult.synced > 0) {
        result.productsSynced++
      }
      result.totalErrors += syncResult.failed
      result.errors.push(...syncResult.errors)
    }

    result.success = result.totalErrors === 0
    return result
  } catch (error: any) {
    result.success = false
    result.errors.push(error.message)
    return result
  }
}

async function logSync(
  connectorId: string,
  syncType: string,
  status: string,
  message: string
) {
  try {
    await prisma.syncLog.create({
      data: {
        connectorId,
        syncType,
        status,
        message,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })
  } catch {
    // Silently fail — logging should never break the main flow
  }
}
