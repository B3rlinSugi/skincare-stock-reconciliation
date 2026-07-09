export type Role = 'SUPER_ADMIN' | 'OPERATOR' | 'AUDITOR'

export type Permission = 
  | 'VIEW_DASHBOARD'
  | 'VIEW_INVENTORY'
  | 'CREATE_INBOUND'
  | 'CREATE_OUTBOUND'
  | 'CREATE_RETURN'
  | 'RUN_OPNAME'
  | 'VIEW_RECONCILIATION'
  | 'VOID_TRANSACTION'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'VIEW_DASHBOARD', 'VIEW_INVENTORY', 'CREATE_INBOUND', 'CREATE_OUTBOUND', 
    'CREATE_RETURN', 'RUN_OPNAME', 'VIEW_RECONCILIATION', 'VOID_TRANSACTION'
  ],
  OPERATOR: [
    'VIEW_DASHBOARD', 'VIEW_INVENTORY', 'CREATE_INBOUND', 'CREATE_OUTBOUND', 'CREATE_RETURN'
  ],
  AUDITOR: [
    'VIEW_DASHBOARD', 'VIEW_INVENTORY', 'RUN_OPNAME', 'VIEW_RECONCILIATION'
  ]
}

export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// In a real app, this role comes from Supabase auth.user.user_metadata.role
// For this demo/sprint, we'll assume the logged in user is SUPER_ADMIN
export function getCurrentUserRole(): Role {
  return 'SUPER_ADMIN'
}
