/**
 * Role-Based Access Control (RBAC) permission definitions.
 *
 * Features map to sidebar menu sections.
 * Each feature supports four actions: view, create, edit, delete.
 */

import type { Session } from "next-auth"

export type Feature =
  | "dashboard"
  | "products"
  | "inventory"
  | "warehouses"
  | "procurement"
  | "sales"
  | "branches"
  | "accounting"
  | "employees"
  | "payroll"
  | "tracking"
  | "reports"
  | "settings"
  | "users_roles"
  | "activity_logs"
  | "subscription"

export type Action = "view" | "create" | "edit" | "delete"

export interface PermissionEntry {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  trackingStatusPermissions?: Record<string, boolean>
}

export interface Permissions {
  [feature: string]: PermissionEntry
}

export const ALL_FEATURES: Feature[] = [
  "dashboard",
  "products",
  "inventory",
  "warehouses",
  "procurement",
  "sales",
  "branches",
  "accounting",
  "employees",
  "payroll",
  "tracking",
  "reports",
  "settings",
  "users_roles",
  "activity_logs",
  "subscription",
]

/**
 * Check if a user has permission for a specific feature and action.
 * SUPER_ADMIN always has full access.
 */
export function hasPermission(
  role: string | undefined | null,
  permissions: Permissions | undefined | null,
  feature: Feature,
  action: Action
): boolean {
  // SUPER_ADMIN bypasses all permission checks
  if (role === "SUPER_ADMIN") return true

  if (!permissions || !permissions[feature]) return false

  switch (action) {
    case "view":
      return permissions[feature].canView
    case "create":
      return permissions[feature].canCreate
    case "edit":
      return permissions[feature].canEdit
    case "delete":
      return permissions[feature].canDelete
    default:
      return false
  }
}

const ACTION_MAP: Record<string, Action> = {
  GET: "view",
  POST: "create",
  PUT: "edit",
  PATCH: "edit",
  DELETE: "delete",
}

/**
 * Map an HTTP method to the corresponding permission action.
 */
export function methodToAction(method: string): Action {
  return ACTION_MAP[method.toUpperCase()] || "view"
}

/**
 * Get all features a user can view (for sidebar filtering).
 */
export function getViewableFeatures(
  role: string | undefined | null,
  permissions: Permissions | undefined | null
): Feature[] {
  if (role === "SUPER_ADMIN") return ALL_FEATURES
  if (!permissions) return []

  return ALL_FEATURES.filter((f) => permissions[f]?.canView)
}

/**
 * Require permission in API routes.
 * Returns an error response object if unauthorized, or null if allowed.
 * Usage: `const err = await requirePermission(session, "products", "create"); if (err) return err`
 */
export async function requirePermission(
  session: Session | null | undefined,
  feature: Feature,
  action: Action
): Promise<{ error: string; status: number } | null> {
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 }
  }
  if (!hasPermission(session.user.role, session.user.permissions, feature, action)) {
    return { error: "Forbidden: insufficient permissions", status: 403 }
  }
  return null
}

/**
 * Feature labels in Indonesian/English for display.
 */
export const FEATURE_LABELS: Record<Feature, string> = {
  dashboard: "Dashboard",
  products: "Products",
  inventory: "Inventory",
  warehouses: "Warehouses",
  procurement: "Procurement",
  sales: "Sales",
  branches: "Branches",
  accounting: "Accounting",
  employees: "Employees",
  payroll: "Payroll",
  tracking: "Tracking",
  reports: "Reports",
  settings: "Settings",
  users_roles: "Users & Roles",
  activity_logs: "Activity Logs",
  subscription: "Subscription",
}

interface PrismaRolePermissionRow {
  feature: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  trackingStatusPermissions?: unknown | null
}

/**
 * Convert Prisma RolePermission rows to a flat Permissions object.
 * Accepts loosely-typed rows from Prisma (JSON fields come as JsonValue).
 */
export function buildPermissionsMap(
  permissions: PrismaRolePermissionRow[]
): Permissions {
  const map: Record<string, PermissionEntry> = {}
  for (const p of permissions) {
    map[p.feature] = {
      canView: p.canView,
      canCreate: p.canCreate,
      canEdit: p.canEdit,
      canDelete: p.canDelete,
      trackingStatusPermissions: p.trackingStatusPermissions as Record<string, boolean> | undefined ?? undefined,
    }
  }
  return map
}

/**
 * Tracking status steps for per-status permission checks.
 */
export const TRACKING_STATUSES = ["pending", "packaging", "packed", "handover", "delivered"] as const

export type TrackingStatus = (typeof TRACKING_STATUSES)[number]

export type TrackingStatusPermissions = Record<TrackingStatus, boolean>

/**
 * Check if a user has permission to update an order to a specific tracking status.
 * SUPER_ADMIN always has full access.
 */
export function hasTrackingStatusPermission(
  role: string | undefined | null,
  permissions: Permissions | undefined | null,
  status: string
): boolean {
  if (role === "SUPER_ADMIN") return true
  if (!permissions?.tracking?.trackingStatusPermissions) return false
  const trackingPerms = permissions.tracking.trackingStatusPermissions
  return trackingPerms[status] === true
}

/**
 * Build default full-access permissions for all features.
 */
export function getFullPermissions(): PrismaRolePermissionRow[] {
  return ALL_FEATURES.map((feature) => ({
    feature,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  }))
}

/**
 * Build default read-only permissions (view only).
 */
export function getReadOnlyPermissions(): PrismaRolePermissionRow[] {
  return ALL_FEATURES.map((feature) => ({
    feature,
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  }))
}
