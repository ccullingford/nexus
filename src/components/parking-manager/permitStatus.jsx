/**
 * Utility functions for permit status management
 * 
 * Active Definition: status === 'ACTIVE' AND (expires_at is null OR expires_at > now)
 * Expired Definition: status === 'EXPIRED' OR (status === 'ACTIVE' AND expires_at <= now)
 */

/**
 * Check if a permit is truly active
 * @param {Object} permit - The permit object
 * @returns {boolean} - True if permit is active
 */
export function isPermitActive(permit) {
  if (!permit) return false;
  
  if (permit.status !== 'ACTIVE') {
    return false;
  }
  
  if (!permit.expires_at) {
    return true;
  }
  
  const now = new Date();
  const expiresAt = new Date(permit.expires_at);
  return expiresAt > now;
}

/**
 * Check if a permit is expired
 * @param {Object} permit - The permit object
 * @returns {boolean} - True if permit is expired
 */
export function isPermitExpired(permit) {
  if (!permit) return false;
  
  // Explicitly marked as expired
  if (permit.status === 'EXPIRED') {
    return true;
  }
  
  // Active but past expiration date (computed expired)
  if (permit.status === 'ACTIVE' && permit.expires_at) {
    const now = new Date();
    const expiresAt = new Date(permit.expires_at);
    return expiresAt <= now;
  }
  
  return false;
}

/**
 * Get the display status for a permit
 * @param {Object} permit - The permit object
 * @returns {string} - Display status ('ACTIVE', 'EXPIRED', 'REVOKED')
 */
export function getPermitDisplayStatus(permit) {
  if (!permit) return 'UNKNOWN';
  
  if (permit.status === 'REVOKED') {
    return 'REVOKED';
  }
  
  if (isPermitExpired(permit)) {
    return 'EXPIRED';
  }
  
  if (isPermitActive(permit)) {
    return 'ACTIVE';
  }
  
  return permit.status;
}

/**
 * Filter permits by status type
 * @param {Array} permits - Array of permit objects
 * @param {string} statusFilter - 'active', 'expired', 'revoked', or 'all'
 * @returns {Array} - Filtered permits
 */
export function filterPermitsByStatus(permits, statusFilter) {
  if (!Array.isArray(permits)) return [];
  
  if (statusFilter === 'all') {
    return permits;
  }
  
  if (statusFilter === 'active') {
    return permits.filter(p => isPermitActive(p));
  }
  
  if (statusFilter === 'expired') {
    return permits.filter(p => isPermitExpired(p));
  }
  
  if (statusFilter === 'revoked') {
    return permits.filter(p => p.status === 'REVOKED');
  }
  
  return permits;
}

/**
 * Get status badge color classes
 * @param {Object} permit - The permit object
 * @returns {string} - Tailwind CSS classes for badge
 */
export function getPermitStatusColor(permit) {
  const displayStatus = getPermitDisplayStatus(permit);
  
  switch (displayStatus) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'EXPIRED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'REVOKED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}