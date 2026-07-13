import prisma from "./prisma"

export type ActionType = "create" | "update" | "delete" | "login" | "logout" | "export" | "import" | "approve" | "reject" | "send" | "receive" | "sync" | "status_change"

export type EntityType =
  | "product" | "sale" | "purchase_order" | "supplier" | "stock_request"
  | "warehouse" | "branch" | "employee" | "expense" | "payroll"
  | "user" | "role" | "inventory" | "tracking" | "ecommerce"
  | "journal" | "account" | "attendance" | "leave" | "shift"
  | "setting" | "notification"

interface LogActivityParams {
  userId?: string | null
  action: ActionType
  entity: EntityType
  entityId?: string | null
  details?: Record<string, any> | null
  ipAddress?: string | null
}

/**
 * Log a user activity to the database.
 * This is fire-and-forget — never throw.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        details: params.details || undefined,
        ipAddress: params.ipAddress || null,
      },
    })
  } catch (error) {
    // Silently fail — activity logging should never break the main operation
    console.error("[ActivityLog] Failed to log:", error)
  }
}

/**
 * Convenience wrapper that logs activity for a CRUD operation
 * within an API route's try block.
 *
 * Usage:
 * ```ts
 * await logActivity({ userId: session.user.id, action: "create", entity: "product", entityId: product.id })
 * ```
 */
export const ActivityActions = {
  product: {
    create: (userId: string, productId: string, name: string) =>
      logActivity({ userId, action: "create", entity: "product", entityId: productId, details: { name } }),
    update: (userId: string, productId: string, name: string, changes?: string[]) =>
      logActivity({ userId, action: "update", entity: "product", entityId: productId, details: { name, changes } }),
    delete: (userId: string, productId: string, name: string) =>
      logActivity({ userId, action: "delete", entity: "product", entityId: productId, details: { name } }),
  },
  sale: {
    create: (userId: string, saleId: string, orderNumber: string) =>
      logActivity({ userId, action: "create", entity: "sale", entityId: saleId, details: { orderNumber } }),
    updateStatus: (userId: string, saleId: string, orderNumber: string, from: string, to: string) =>
      logActivity({ userId, action: "status_change", entity: "sale", entityId: saleId, details: { orderNumber, from, to } }),
  },
  purchaseOrder: {
    create: (userId: string, poId: string, poNumber: string) =>
      logActivity({ userId, action: "create", entity: "purchase_order", entityId: poId, details: { poNumber } }),
    updateStatus: (userId: string, poId: string, poNumber: string, from: string, to: string) =>
      logActivity({ userId, action: "status_change", entity: "purchase_order", entityId: poId, details: { poNumber, from, to } }),
  },
  supplier: {
    create: (userId: string, supplierId: string, name: string) =>
      logActivity({ userId, action: "create", entity: "supplier", entityId: supplierId, details: { name } }),
    update: (userId: string, supplierId: string, name: string) =>
      logActivity({ userId, action: "update", entity: "supplier", entityId: supplierId, details: { name } }),
  },
  inventory: {
    adjust: (userId: string, productId: string, productName: string, warehouse: string, oldQty: number, newQty: number) =>
      logActivity({ userId, action: "update", entity: "inventory", entityId: productId, details: { productName, warehouse, oldQty, newQty } }),
    move: (userId: string, productId: string, productName: string, from: string, to: string, qty: number) =>
      logActivity({ userId, action: "update", entity: "inventory", entityId: productId, details: { productName, from, to, qty } }),
  },
  expense: {
    create: (userId: string, expenseId: string, description: string, amount: number) =>
      logActivity({ userId, action: "create", entity: "expense", entityId: expenseId, details: { description, amount } }),
    approve: (userId: string, expenseId: string, description: string) =>
      logActivity({ userId, action: "approve", entity: "expense", entityId: expenseId, details: { description } }),
  },
  payroll: {
    create: (userId: string, payrollId: string, payrollNumber: string, employees: number) =>
      logActivity({ userId, action: "create", entity: "payroll", entityId: payrollId, details: { payrollNumber, employees } }),
    approve: (userId: string, payrollId: string, payrollNumber: string) =>
      logActivity({ userId, action: "approve", entity: "payroll", entityId: payrollId, details: { payrollNumber } }),
    pay: (userId: string, payrollId: string, payrollNumber: string) =>
      logActivity({ userId, action: "update", entity: "payroll", entityId: payrollId, details: { payrollNumber, status: "paid" } }),
  },
  warehouse: {
    create: (userId: string, warehouseId: string, name: string) =>
      logActivity({ userId, action: "create", entity: "warehouse", entityId: warehouseId, details: { name } }),
  },
  branch: {
    create: (userId: string, branchId: string, name: string) =>
      logActivity({ userId, action: "create", entity: "branch", entityId: branchId, details: { name } }),
  },
  employee: {
    create: (userId: string, employeeId: string, name: string) =>
      logActivity({ userId, action: "create", entity: "employee", entityId: employeeId, details: { name } }),
  },
  tracking: {
    updateStatus: (userId: string, saleId: string, orderNumber: string, product: string, from: string, to: string) =>
      logActivity({ userId, action: "status_change", entity: "tracking", entityId: saleId, details: { orderNumber, product, from, to } }),
  },
  stockRequest: {
    create: (userId: string, requestId: string, requestNumber: string, items: number) =>
      logActivity({ userId, action: "create", entity: "stock_request", entityId: requestId, details: { requestNumber, items } }),
    approve: (userId: string, requestId: string, requestNumber: string) =>
      logActivity({ userId, action: "approve", entity: "stock_request", entityId: requestId, details: { requestNumber } }),
  },
  ecommerce: {
    sync: (userId: string, connectorId: string, platform: string, syncType: string, status: string) =>
      logActivity({ userId, action: "sync", entity: "ecommerce", entityId: connectorId, details: { platform, syncType, status } }),
  },
  user: {
    create: (userId: string, targetUserId: string, email: string) =>
      logActivity({ userId, action: "create", entity: "user", entityId: targetUserId, details: { email } }),
    update: (userId: string, targetUserId: string, email: string) =>
      logActivity({ userId, action: "update", entity: "user", entityId: targetUserId, details: { email } }),
    login: (userId: string) =>
      logActivity({ userId, action: "login", entity: "user", entityId: userId }),
  },
  role: {
    create: (userId: string, roleId: string, name: string) =>
      logActivity({ userId, action: "create", entity: "role", entityId: roleId, details: { name } }),
    update: (userId: string, roleId: string, name: string) =>
      logActivity({ userId, action: "update", entity: "role", entityId: roleId, details: { name } }),
    delete: (userId: string, roleId: string, name: string) =>
      logActivity({ userId, action: "delete", entity: "role", entityId: roleId, details: { name } }),
  },
  setting: {
    update: (userId: string, setting: string) =>
      logActivity({ userId, action: "update", entity: "setting", entityId: setting, details: { setting } }),
  },
}
