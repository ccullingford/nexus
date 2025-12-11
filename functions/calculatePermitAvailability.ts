import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { unitId } = await req.json();

    if (!unitId) {
      return Response.json({ 
        success: false, 
        error: 'Unit ID required' 
      }, { status: 400 });
    }

    // Fetch unit
    const units = await base44.entities.Unit.filter({ id: unitId });
    if (units.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Unit not found' 
      }, { status: 404 });
    }
    const unit = units[0];

    // Fetch association
    const associations = await base44.entities.Association.filter({ id: unit.association_id });
    if (associations.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Association not found' 
      }, { status: 404 });
    }
    const association = associations[0];

    // Fetch active permits for this unit
    const permits = await base44.entities.Permit.filter({ 
      unit_id: unitId,
      status: 'active'
    });

    // Count by permit type
    const residentPermits = permits.filter(p => p.permit_type === 'resident').length;
    const visitorPermits = permits.filter(p => p.permit_type === 'visitor').length;
    const totalPermits = permits.length;

    // Calculate caps based on association rules
    let baselineResident = 0;
    let maxResident = null;
    let maxVisitor = association.max_visitor_permits || null;

    if (association.permit_rule_type === 'per_unit') {
      baselineResident = association.permits_per_count || 0;
    } else if (association.permit_rule_type === 'per_bedroom') {
      const bedrooms = unit.bedrooms || 1;
      baselineResident = (association.permits_per_count || 0) * bedrooms;
    }

    // Max resident permits
    if (association.max_permits_per_unit) {
      maxResident = association.max_permits_per_unit;
    } else if (association.allow_additional_permits === false) {
      maxResident = baselineResident;
    }

    // Calculate availability
    const canIssueResident = maxResident ? residentPermits < maxResident : true;
    const canIssueVisitor = maxVisitor ? visitorPermits < maxVisitor : true;

    return Response.json({
      success: true,
      unit: {
        id: unit.id,
        unit_number: unit.unit_number,
        bedrooms: unit.bedrooms
      },
      association: {
        name: association.name,
        permit_rule_type: association.permit_rule_type,
        permits_per_count: association.permits_per_count,
        max_permits_per_unit: association.max_permits_per_unit,
        max_visitor_permits: association.max_visitor_permits,
        allow_additional_permits: association.allow_additional_permits
      },
      current: {
        resident: residentPermits,
        visitor: visitorPermits,
        total: totalPermits
      },
      caps: {
        baseline_resident: baselineResident,
        max_resident: maxResident,
        max_visitor: maxVisitor
      },
      availability: {
        can_issue_resident: canIssueResident,
        can_issue_visitor: canIssueVisitor,
        resident_remaining: maxResident ? maxResident - residentPermits : null,
        visitor_remaining: maxVisitor ? maxVisitor - visitorPermits : null
      }
    });

  } catch (error) {
    console.error('Error calculating permit availability:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});