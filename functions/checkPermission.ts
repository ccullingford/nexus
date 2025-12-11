import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { hasPermission } from '../components/permissions.js';

/**
 * Backend helper to check if the current user has a permission
 * Throws an error if unauthorized
 * @param {Request} req - The request object
 * @param {string} permission - Permission key to check
 * @returns {Promise<Object>} - Returns the user object if authorized
 */
export async function requirePermission(req, permission) {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  if (!hasPermission(user.role, permission)) {
    throw new Error(`Unauthorized: Missing permission '${permission}'`);
  }

  return user;
}

/**
 * Backend helper to check if user has ANY of the permissions
 * @param {Request} req - The request object
 * @param {string[]} permissions - Array of permission keys
 * @returns {Promise<Object>} - Returns the user object if authorized
 */
export async function requireAnyPermission(req, permissions) {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const hasAny = permissions.some(permission => hasPermission(user.role, permission));
  if (!hasAny) {
    throw new Error(`Unauthorized: Missing any of permissions [${permissions.join(', ')}]`);
  }

  return user;
}

/**
 * Backend helper to check if user has ALL of the permissions
 * @param {Request} req - The request object
 * @param {string[]} permissions - Array of permission keys
 * @returns {Promise<Object>} - Returns the user object if authorized
 */
export async function requireAllPermissions(req, permissions) {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const hasAll = permissions.every(permission => hasPermission(user.role, permission));
  if (!hasAll) {
    throw new Error(`Unauthorized: Missing all of permissions [${permissions.join(', ')}]`);
  }

  return user;
}

// Standalone function for permission checks
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { permission } = await req.json();
    
    if (!permission) {
      return Response.json({ error: 'permission is required' }, { status: 400 });
    }

    const allowed = hasPermission(user.role, permission);

    return Response.json({
      success: true,
      allowed,
      role: user.role,
      permission
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});