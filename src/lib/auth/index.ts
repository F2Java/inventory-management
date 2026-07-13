export { auth, signIn, signOut, handlers } from "./config"
export { hasPermission, getViewableFeatures, buildPermissionsMap, requirePermission, hasTrackingStatusPermission, type Permissions, type Feature, type Action } from "./permissions"

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
  roleId?: string | null
  merchantId?: string | null
  branchId?: string | null
  image?: string | null
  permissions?: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; trackingStatusPermissions?: Record<string, boolean> }> | null
}

declare module "next-auth" {
  interface User {
    role?: string
    roleId?: string | null
    merchantId?: string | null
    branchId?: string | null
    permissions?: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; trackingStatusPermissions?: Record<string, boolean> }> | null
  }
  interface Session {
    user: SessionUser
  }
}


