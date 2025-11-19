// Permission system for role-based access control

export type Permission =
  // User management
  | 'users:create'
  | 'users:read'
  | 'users:update'
  | 'users:delete'
  | 'users:assign_roles'
  
  // Transaction management
  | 'transactions:create'
  | 'transactions:read'
  | 'transactions:update'
  | 'transactions:delete'
  
  // Contact management
  | 'contacts:create'
  | 'contacts:read'
  | 'contacts:update'
  | 'contacts:delete'
  
  // Account management
  | 'accounts:create'
  | 'accounts:read'
  | 'accounts:update'
  | 'accounts:delete'
  
  // Reports
  | 'reports:view'
  
  // Settings
  | 'settings:view'
  | 'settings:update'
  
  // Firm management
  | 'firms:manage'
  | 'firms:invite_clients';

export type Role = 'admin' | 'staff' | 'read_only' | 'accountant';

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // Full access to everything
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'users:assign_roles',
    'transactions:create',
    'transactions:read',
    'transactions:update',
    'transactions:delete',
    'contacts:create',
    'contacts:read',
    'contacts:update',
    'contacts:delete',
    'accounts:create',
    'accounts:read',
    'accounts:update',
    'accounts:delete',
    'reports:view',
    'settings:view',
    'settings:update',
  ],
  
  staff: [
    // Can manage transactions and contacts, but not users or settings
    'transactions:create',
    'transactions:read',
    'transactions:update',
    'transactions:delete',
    'contacts:create',
    'contacts:read',
    'contacts:update',
    'contacts:delete',
    'accounts:read',
    'reports:view',
  ],
  
  read_only: [
    // Can only view data
    'transactions:read',
    'contacts:read',
    'accounts:read',
    'reports:view',
  ],
  
  accountant: [
    // Full access except cannot manage users in client companies
    'users:read', // Can view users but not create/update/delete in client companies
    'transactions:create',
    'transactions:read',
    'transactions:update',
    'transactions:delete',
    'contacts:create',
    'contacts:read',
    'contacts:update',
    'contacts:delete',
    'accounts:create',
    'accounts:read',
    'accounts:update',
    'accounts:delete',
    'reports:view',
    'settings:view',
    'firms:manage', // Can manage their own firm
    'firms:invite_clients', // Can invite clients to grant access
  ],
};

// Helper function to check if a user has a specific permission
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Helper function to get all permissions for a role
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// Check if user can perform action
export function can(user: { role: Role; firmId?: number | null }, permission: Permission, context?: { isOwnFirm?: boolean }): boolean {
  // Special case for accountants managing users
  if (permission === 'users:create' || permission === 'users:update' || permission === 'users:delete' || permission === 'users:assign_roles') {
    // Accountants can manage users in their own firm, but not in client companies
    if (user.role === 'accountant' && context?.isOwnFirm) {
      return true;
    }
  }
  
  return hasPermission(user.role, permission);
}
