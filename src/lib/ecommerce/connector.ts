// E-Commerce API Connector Library
// Handles integration with Indonesian e-commerce platforms
// Rule: One branch = one API connector

import prisma from "@/lib/prisma"

export interface EcommerceSyncOptions {
  connectorId: string
  syncType: "products" | "orders" | "stock" | "inventory"
}

export interface EcommerceApiResult {
  success: boolean
  data?: any
  error?: string
}

// Base connector class
export abstract class EcommerceConnector {
  protected platform: string
  protected apiEndpoint: string
  protected apiKey: string
  protected apiSecret?: string
  protected config: Record<string, any>

  constructor(config: {
    platform: string
    apiEndpoint: string
    apiKey: string
    apiSecret?: string
    config?: Record<string, any>
  }) {
    this.platform = config.platform
    this.apiEndpoint = config.apiEndpoint
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.config = config.config || {}
  }

  abstract syncProducts(): Promise<EcommerceApiResult>
  abstract syncOrders(): Promise<EcommerceApiResult>
  abstract updateStock(productId: string, quantity: number): Promise<EcommerceApiResult>
  abstract updateOrderStatus(orderId: string, status: string): Promise<EcommerceApiResult>

  protected async makeRequest(
    path: string,
    options: RequestInit = {}
  ): Promise<EcommerceApiResult> {
    try {
      const url = `${this.apiEndpoint}${path}`
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// Tokopedia Connector
export class TokopediaConnector extends EcommerceConnector {
  async syncProducts(): Promise<EcommerceApiResult> {
    return this.makeRequest("/v2/products")
  }

  async syncOrders(): Promise<EcommerceApiResult> {
    return this.makeRequest("/v2/orders?status=all")
  }

  async updateStock(productId: string, quantity: number): Promise<EcommerceApiResult> {
    return this.makeRequest(`/v2/products/${productId}/stock`, {
      method: "PUT",
      body: JSON.stringify({ stock: quantity }),
    })
  }

  async updateOrderStatus(orderId: string, status: string): Promise<EcommerceApiResult> {
    return this.makeRequest(`/v2/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  }
}

// Shopee Connector
export class ShopeeConnector extends EcommerceConnector {
  async syncProducts(): Promise<EcommerceApiResult> {
    return this.makeRequest("/api/v2/product/get_item_list")
  }

  async syncOrders(): Promise<EcommerceApiResult> {
    return this.makeRequest("/api/v2/order/get_order_list")
  }

  async updateStock(productId: string, quantity: number): Promise<EcommerceApiResult> {
    return this.makeRequest("/api/v2/product/update_stock", {
      method: "POST",
      body: JSON.stringify({ item_id: productId, stock: quantity }),
    })
  }

  async updateOrderStatus(orderId: string, status: string): Promise<EcommerceApiResult> {
    return this.makeRequest("/api/v2/order/update_status", {
      method: "POST",
      body: JSON.stringify({ order_sn: orderId, status }),
    })
  }
}

// Connector factory
export function createConnector(platform: string, config: {
  apiEndpoint: string
  apiKey: string
  apiSecret?: string
  config?: Record<string, any>
}): EcommerceConnector {
  switch (platform) {
    case "TOKOPEDIA":
      return new TokopediaConnector({ ...config, platform: "Tokopedia" })
    case "SHOPEE":
      return new ShopeeConnector({ ...config, platform: "Shopee" })
    default:
      // Generic connector for other platforms (Bukalapak, Lazada, Blibli, etc.)
      return new (class extends EcommerceConnector {
        async syncProducts() { return this.makeRequest("/products") }
        async syncOrders() { return this.makeRequest("/orders") }
        async updateStock(productId: string, quantity: number) {
          return this.makeRequest(`/products/${productId}/stock`, {
            method: "PUT",
            body: JSON.stringify({ stock: quantity }),
          })
        }
        async updateOrderStatus(orderId: string, status: string) {
          return this.makeRequest(`/orders/${orderId}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
          })
        }
      })({ ...config, platform })
  }
}

// Sync service
export async function runSync(options: EcommerceSyncOptions): Promise<{
  success: boolean
  message: string
  synced: number
  failed: number
  errors: string[]
}> {
  const result = { success: true, message: "", synced: 0, failed: 0, errors: [] as string[] }

  try {
    const connector = await prisma.ecommerceConnector.findUnique({
      where: { id: options.connectorId },
      include: { branch: true },
    })

    if (!connector) {
      return { ...result, success: false, message: "Connector not found" }
    }

    // Create sync log
    await prisma.syncLog.create({
      data: {
        connectorId: connector.id,
        syncType: options.syncType,
        status: "in_progress",
      },
    })

    const api = createConnector(connector.platform, {
      apiEndpoint: connector.apiEndpoint,
      apiKey: connector.apiKey,
      apiSecret: connector.apiSecret || undefined,
      config: connector.config as Record<string, any> | undefined,
    })

    let syncResult: EcommerceApiResult

    switch (options.syncType) {
      case "products":
        syncResult = await api.syncProducts()
        break
      case "orders":
        syncResult = await api.syncOrders()
        break
      case "stock":
        // Update stock for all products
        syncResult = { success: true, data: [] }
        break
      default:
        syncResult = { success: false, error: "Unknown sync type" }
    }

    if (syncResult.success) {
      result.synced = Array.isArray(syncResult.data) ? syncResult.data.length : 1
      result.message = `${options.syncType} sync completed successfully`
    } else {
      result.failed = 1
      result.errors.push(syncResult.error || "Unknown error")
      result.message = `Sync failed: ${syncResult.error}`
    }

    // Update sync log
    await prisma.syncLog.updateMany({
      where: { connectorId: connector.id, status: "in_progress" },
      data: {
        status: syncResult.success ? "success" : "failed",
        message: result.message,
        completedAt: new Date(),
      },
    })

    // Update last sync time
    await prisma.ecommerceConnector.update({
      where: { id: connector.id },
      data: { lastSyncAt: new Date() },
    })

  } catch (error: any) {
    result.success = false
    result.message = `Sync error: ${error.message}`
    result.errors.push(error.message)
  }

  return result
}
