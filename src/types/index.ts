// Shared types for the inventory management system

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface DashboardStats {
  totalProducts: number
  totalSales: number
  totalRevenue: number
  totalOrders: number
  lowStockItems: number
  pendingOrders: number
  monthlyRevenue: { month: string; revenue: number }[]
  salesByStatus: { status: string; count: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
}

export interface SelectOption {
  label: string
  value: string
}

// For e-commerce platform connectors
export interface EcommerceConfig {
  platform: string
  apiEndpoint: string
  apiKey: string
  apiSecret?: string
  storeName?: string
  webhookSecret?: string
  additionalConfig?: Record<string, any>
}

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors?: string[]
  message: string
}
