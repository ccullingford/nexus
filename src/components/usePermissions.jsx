import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { userHasPermission, userHasAnyPermission, userHasAllPermissions } from './permissions';

/**
 * React hook for checking user permissions
 * @returns {Object} - Permission check functions and user data
 */
export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const currentUser = await base44.auth.me();
        if (mounted) {
          setUser(currentUser);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    user,
    loading,
    hasPermission: (permission) => userHasPermission(user, permission),
    hasAnyPermission: (permissions) => userHasAnyPermission(user, permissions),
    hasAllPermissions: (permissions) => userHasAllPermissions(user, permissions),
  };
}

/**
 * Component wrapper that only renders children if user has permission
 */
export function PermissionGate({ permission, permissions, requireAll = false, fallback = null, children }) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return fallback;
  }

  // Single permission check
  if (permission) {
    return hasPermission(permission) ? children : fallback;
  }

  // Multiple permissions check
  if (permissions) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    return hasAccess ? children : fallback;
  }

  // No permission specified - render children
  return children;
}