/**
 * Calculate permit caps for a unit based on association rules
 * @param {Object} association - Association with permit rules
 * @param {Object} unit - Unit with bedrooms count
 * @param {Array} activePermits - Array of active permits for the unit
 * @returns {Object} Permit caps and current counts
 */
export function computePermitCapsForUnit(association, unit, activePermits = []) {
  const standardAllocation = association?.permits_per_count ?? 2;
  
  // Calculate max resident permits
  let maxResidentPermits;
  if (association?.permit_rule_type === 'per_bedroom') {
    const bedrooms = unit?.bedrooms ?? 1;
    maxResidentPermits = bedrooms * standardAllocation;
  } else {
    maxResidentPermits = association?.max_permits_per_unit ?? standardAllocation;
  }
  
  // Max visitor permits
  const maxVisitorPermits = association?.max_visitor_permits ?? 2;
  
  // Count active permits by type
  const activeResidentPermitsCount = activePermits.filter(
    p => p.status === 'active' && ['resident', 'additional'].includes(p.type)
  ).length;
  
  const activeVisitorPermitsCount = activePermits.filter(
    p => p.status === 'active' && p.type === 'visitor'
  ).length;
  
  return {
    maxResidentPermits,
    maxVisitorPermits,
    activeResidentPermitsCount,
    activeVisitorPermitsCount,
    canIssueResident: activeResidentPermitsCount < maxResidentPermits,
    canIssueVisitor: activeVisitorPermitsCount < maxVisitorPermits,
    residentRemaining: maxResidentPermits - activeResidentPermitsCount,
    visitorRemaining: maxVisitorPermits - activeVisitorPermitsCount
  };
}