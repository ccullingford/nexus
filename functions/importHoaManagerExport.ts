import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { exportData } = await req.json();

    if (!exportData || typeof exportData !== 'object') {
      return Response.json({ 
        success: false, 
        error: 'Invalid export data' 
      }, { status: 400 });
    }

    const LEGACY_SOURCE = 'hoa-manager-pro';
    const summary = {
      associations: { created: 0, updated: 0, skipped: 0 },
      units: { created: 0, updated: 0, skipped: 0 },
      owners: { created: 0, updated: 0, skipped: 0 },
      tenants: { created: 0, updated: 0, skipped: 0 },
      vehicles: { created: 0, updated: 0, skipped: 0 },
      permits: { created: 0, updated: 0, skipped: 0 },
      violations: { created: 0, updated: 0, skipped: 0 },
      notes: { created: 0, updated: 0, skipped: 0 }
    };

    // ID mapping: legacy_id -> new_id
    const idMap = {
      associations: {},
      units: {},
      owners: {},
      tenants: {},
      vehicles: {}
    };

    // ===== IMPORT ASSOCIATIONS =====
    if (exportData.associations && Array.isArray(exportData.associations)) {
      for (const assoc of exportData.associations) {
        const existing = await base44.asServiceRole.entities.Association.filter({
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(assoc.id)
        });

        const data = {
          name: assoc.name || 'Unnamed Association',
          code: assoc.code || null,
          street_address: assoc.address || null,
          city: assoc.city || null,
          state: assoc.state || null,
          zip: assoc.zip || null,
          status: assoc.status || 'active',
          tow_company_name: assoc.tow_company_name || null,
          tow_company_phone: assoc.tow_company_phone || null,
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(assoc.id)
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.Association.update(existing[0].id, data);
          idMap.associations[assoc.id] = existing[0].id;
          summary.associations.updated++;
        } else {
          const created = await base44.asServiceRole.entities.Association.create(data);
          idMap.associations[assoc.id] = created.id;
          summary.associations.created++;
        }
      }
    }

    // ===== IMPORT UNITS =====
    if (exportData.units && Array.isArray(exportData.units)) {
      for (const unit of exportData.units) {
        const associationId = idMap.associations[unit.association_id];
        if (!associationId) {
          summary.units.skipped++;
          continue;
        }

        const existing = await base44.asServiceRole.entities.Unit.filter({
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(unit.id)
        });

        const data = {
          association_id: associationId,
          unit_number: unit.unit_number || 'N/A',
          street_address: unit.street_address || null,
          bedrooms: unit.bedrooms || null,
          status: unit.status || 'occupied',
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(unit.id)
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.Unit.update(existing[0].id, data);
          idMap.units[unit.id] = existing[0].id;
          summary.units.updated++;
        } else {
          const created = await base44.asServiceRole.entities.Unit.create(data);
          idMap.units[unit.id] = created.id;
          summary.units.created++;
        }
      }
    }

    // ===== IMPORT OWNERS =====
    if (exportData.owners && Array.isArray(exportData.owners)) {
      for (const owner of exportData.owners) {
        const associationId = idMap.associations[owner.association_id];
        const unitId = idMap.units[owner.unit_id];
        
        if (!associationId || !unitId) {
          summary.owners.skipped++;
          continue;
        }

        const existing = await base44.asServiceRole.entities.Owner.filter({
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(owner.id)
        });

        const data = {
          association_id: associationId,
          unit_id: unitId,
          is_company: owner.is_company || false,
          company_name: owner.company_name || null,
          first_name: owner.first_name || null,
          last_name: owner.last_name || null,
          contact_first_name: owner.contact_first_name || null,
          contact_last_name: owner.contact_last_name || null,
          email: owner.email || null,
          phone: owner.phone || null,
          mailing_address: owner.mailing_address || null,
          mailing_city: owner.mailing_city || null,
          mailing_state: owner.mailing_state || null,
          mailing_zip: owner.mailing_zip || null,
          is_primary_owner: owner.is_primary_owner !== false,
          notes: owner.notes || null,
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(owner.id)
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.Owner.update(existing[0].id, data);
          idMap.owners[owner.id] = existing[0].id;
          summary.owners.updated++;
        } else {
          const created = await base44.asServiceRole.entities.Owner.create(data);
          idMap.owners[owner.id] = created.id;
          summary.owners.created++;
        }
      }
    }

    // ===== IMPORT TENANTS =====
    if (exportData.tenants && Array.isArray(exportData.tenants)) {
      for (const tenant of exportData.tenants) {
        const associationId = idMap.associations[tenant.association_id];
        const unitId = idMap.units[tenant.unit_id];
        
        if (!associationId || !unitId) {
          summary.tenants.skipped++;
          continue;
        }

        const existing = await base44.asServiceRole.entities.Tenant.filter({
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(tenant.id)
        });

        const data = {
          association_id: associationId,
          unit_id: unitId,
          first_name: tenant.first_name || 'Unknown',
          last_name: tenant.last_name || 'Tenant',
          email: tenant.email || null,
          phone: tenant.phone || null,
          lease_start_date: tenant.lease_start_date || null,
          lease_end_date: tenant.lease_end_date || null,
          is_current: tenant.is_current !== false,
          notes: tenant.notes || null,
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(tenant.id)
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.Tenant.update(existing[0].id, data);
          idMap.tenants[tenant.id] = existing[0].id;
          summary.tenants.updated++;
        } else {
          const created = await base44.asServiceRole.entities.Tenant.create(data);
          idMap.tenants[tenant.id] = created.id;
          summary.tenants.created++;
        }
      }
    }

    // ===== IMPORT VEHICLES =====
    if (exportData.vehicles && Array.isArray(exportData.vehicles)) {
      for (const vehicle of exportData.vehicles) {
        const associationId = idMap.associations[vehicle.association_id];
        const unitId = idMap.units[vehicle.unit_id];
        
        if (!associationId || !unitId) {
          summary.vehicles.skipped++;
          continue;
        }

        const existing = await base44.asServiceRole.entities.Vehicle.filter({
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(vehicle.id)
        });

        const data = {
          association_id: associationId,
          unit_id: unitId,
          owner_id: vehicle.owner_id ? idMap.owners[vehicle.owner_id] : null,
          tenant_id: vehicle.tenant_id ? idMap.tenants[vehicle.tenant_id] : null,
          make_id: vehicle.make_id || null,
          model_id: vehicle.model_id || null,
          year: vehicle.year || null,
          color_id: vehicle.color_id || null,
          body_style_id: vehicle.body_style_id || null,
          body_style_label: vehicle.body_style_label || null,
          license_plate: vehicle.license_plate || 'UNKNOWN',
          state: vehicle.state || null,
          parking_spot: vehicle.parking_spot || null,
          status: vehicle.status || 'active',
          notes: vehicle.notes || null,
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(vehicle.id)
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.Vehicle.update(existing[0].id, data);
          idMap.vehicles[vehicle.id] = existing[0].id;
          summary.vehicles.updated++;
        } else {
          const created = await base44.asServiceRole.entities.Vehicle.create(data);
          idMap.vehicles[vehicle.id] = created.id;
          summary.vehicles.created++;
        }
      }
    }

    // ===== IMPORT PERMITS =====
    if (exportData.permits && Array.isArray(exportData.permits)) {
      for (const permit of exportData.permits) {
        const associationId = idMap.associations[permit.association_id];
        const unitId = idMap.units[permit.unit_id];
        
        if (!associationId || !unitId) {
          summary.permits.skipped++;
          continue;
        }

        const existing = await base44.asServiceRole.entities.Permit.filter({
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(permit.id)
        });

        const data = {
          association_id: associationId,
          unit_id: unitId,
          vehicle_id: permit.vehicle_id ? idMap.vehicles[permit.vehicle_id] : null,
          permit_number: permit.permit_number || null,
          permit_type: permit.permit_type || null,
          issue_date: permit.issue_date || null,
          expiration_date: permit.expiration_date || null,
          status: permit.status || 'active',
          notes: permit.notes || null,
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(permit.id)
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.Permit.update(existing[0].id, data);
          summary.permits.updated++;
        } else {
          await base44.asServiceRole.entities.Permit.create(data);
          summary.permits.created++;
        }
      }
    }

    // ===== IMPORT VIOLATIONS =====
    if (exportData.violations && Array.isArray(exportData.violations)) {
      for (const violation of exportData.violations) {
        const associationId = idMap.associations[violation.association_id];
        
        if (!associationId) {
          summary.violations.skipped++;
          continue;
        }

        const existing = await base44.asServiceRole.entities.Violation.filter({
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(violation.id)
        });

        const data = {
          association_id: associationId,
          unit_id: violation.unit_id ? idMap.units[violation.unit_id] : null,
          vehicle_id: violation.vehicle_id ? idMap.vehicles[violation.vehicle_id] : null,
          violation_type: violation.violation_type || 'General',
          violation_date: violation.violation_date || new Date().toISOString(),
          description: violation.description || null,
          status: violation.status || 'open',
          fine_amount: violation.fine_amount || null,
          resolved_date: violation.resolved_date || null,
          notes: violation.notes || null,
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(violation.id)
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.Violation.update(existing[0].id, data);
          summary.violations.updated++;
        } else {
          await base44.asServiceRole.entities.Violation.create(data);
          summary.violations.created++;
        }
      }
    }

    // ===== IMPORT NOTES =====
    if (exportData.notes && Array.isArray(exportData.notes)) {
      for (const note of exportData.notes) {
        const associationId = idMap.associations[note.association_id];
        
        if (!associationId) {
          summary.notes.skipped++;
          continue;
        }

        const existing = await base44.asServiceRole.entities.Note.filter({
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(note.id)
        });

        const data = {
          association_id: associationId,
          unit_id: note.unit_id ? idMap.units[note.unit_id] : null,
          owner_id: note.owner_id ? idMap.owners[note.owner_id] : null,
          tenant_id: note.tenant_id ? idMap.tenants[note.tenant_id] : null,
          vehicle_id: note.vehicle_id ? idMap.vehicles[note.vehicle_id] : null,
          note_type: note.note_type || 'general',
          title: note.title || null,
          content: note.content || 'No content',
          note_date: note.note_date || new Date().toISOString(),
          priority: note.priority || 'medium',
          legacy_source: LEGACY_SOURCE,
          legacy_id: String(note.id)
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.Note.update(existing[0].id, data);
          summary.notes.updated++;
        } else {
          await base44.asServiceRole.entities.Note.create(data);
          summary.notes.created++;
        }
      }
    }

    return Response.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});