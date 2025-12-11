import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();
    
    if (!query || query.trim().length === 0) {
      return Response.json({
        success: true,
        data: {
          associations: [],
          units: [],
          owners: [],
          tenants: [],
          customers: [],
          invoices: []
        }
      });
    }

    const searchTerm = query.trim().toLowerCase();

    // Search associations
    const allAssociations = await base44.entities.Association.list('name', 500);
    const associations = allAssociations
      .filter(a => {
        const name = (a.name || '').toLowerCase();
        const code = (a.code || '').toLowerCase();
        const city = (a.city || '').toLowerCase();
        return name.includes(searchTerm) || code.includes(searchTerm) || city.includes(searchTerm);
      })
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        name: a.name,
        code: a.code,
        city: a.city,
        state: a.state,
        status: a.status
      }));

    // Search units
    const allUnits = await base44.entities.Unit.list('unit_number', 500);
    const units = allUnits
      .filter(u => {
        const unitNumber = (u.unit_number || '').toLowerCase();
        const address = (u.street_address || '').toLowerCase();
        return unitNumber.includes(searchTerm) || address.includes(searchTerm);
      })
      .slice(0, 5)
      .map(u => ({
        id: u.id,
        association_id: u.association_id,
        unit_number: u.unit_number,
        street_address: u.street_address,
        status: u.status
      }));

    // Get association names for units
    const unitAssociationIds = [...new Set(units.map(u => u.association_id))];
    const unitAssociations = allAssociations.filter(a => unitAssociationIds.includes(a.id));
    units.forEach(u => {
      const assoc = unitAssociations.find(a => a.id === u.association_id);
      u.association_name = assoc?.name || 'Unknown';
    });

    // Search owners
    const allOwners = await base44.entities.Owner.list('last_name', 500);
    const owners = allOwners
      .filter(o => {
        const firstName = (o.first_name || '').toLowerCase();
        const lastName = (o.last_name || '').toLowerCase();
        const companyName = (o.company_name || '').toLowerCase();
        const email = (o.email || '').toLowerCase();
        const phone = (o.phone || '').toLowerCase();
        return firstName.includes(searchTerm) || 
               lastName.includes(searchTerm) || 
               companyName.includes(searchTerm) || 
               email.includes(searchTerm) || 
               phone.includes(searchTerm);
      })
      .slice(0, 5)
      .map(o => ({
        id: o.id,
        association_id: o.association_id,
        unit_id: o.unit_id,
        first_name: o.first_name,
        last_name: o.last_name,
        is_company: o.is_company,
        company_name: o.company_name,
        email: o.email,
        phone: o.phone
      }));

    // Get association and unit info for owners
    const ownerAssociationIds = [...new Set(owners.map(o => o.association_id))];
    const ownerUnitIds = [...new Set(owners.map(o => o.unit_id))];
    const ownerAssociations = allAssociations.filter(a => ownerAssociationIds.includes(a.id));
    const ownerUnits = allUnits.filter(u => ownerUnitIds.includes(u.id));
    
    owners.forEach(o => {
      const assoc = ownerAssociations.find(a => a.id === o.association_id);
      const unit = ownerUnits.find(u => u.id === o.unit_id);
      o.association_name = assoc?.name || 'Unknown';
      o.unit_number = unit?.unit_number || '—';
    });

    // Search tenants
    const allTenants = await base44.entities.Tenant.list('last_name', 500);
    const tenants = allTenants
      .filter(t => {
        const firstName = (t.first_name || '').toLowerCase();
        const lastName = (t.last_name || '').toLowerCase();
        const email = (t.email || '').toLowerCase();
        const phone = (t.phone || '').toLowerCase();
        return firstName.includes(searchTerm) || 
               lastName.includes(searchTerm) || 
               email.includes(searchTerm) || 
               phone.includes(searchTerm);
      })
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        association_id: t.association_id,
        unit_id: t.unit_id,
        first_name: t.first_name,
        last_name: t.last_name,
        email: t.email,
        phone: t.phone,
        is_current: t.is_current
      }));

    // Get association and unit info for tenants
    const tenantAssociationIds = [...new Set(tenants.map(t => t.association_id))];
    const tenantUnitIds = [...new Set(tenants.map(t => t.unit_id))];
    const tenantAssociations = allAssociations.filter(a => tenantAssociationIds.includes(a.id));
    const tenantUnits = allUnits.filter(u => tenantUnitIds.includes(u.id));
    
    tenants.forEach(t => {
      const assoc = tenantAssociations.find(a => a.id === t.association_id);
      const unit = tenantUnits.find(u => u.id === t.unit_id);
      t.association_name = assoc?.name || 'Unknown';
      t.unit_number = unit?.unit_number || '—';
    });

    // Search customers
    const allCustomers = await base44.entities.Customer.list('name', 500);
    const customers = allCustomers
      .filter(c => {
        const name = (c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        return name.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm);
      })
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        type: c.type
      }));

    // Search invoices
    const allInvoices = await base44.entities.Invoice.list('-created_date', 500);
    const invoices = allInvoices
      .filter(i => {
        const invoiceNumber = (i.invoice_number || '').toLowerCase();
        const customerName = (i.customer_name || '').toLowerCase();
        return invoiceNumber.includes(searchTerm) || customerName.includes(searchTerm);
      })
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        invoice_number: i.invoice_number,
        customer_name: i.customer_name,
        customer_id: i.customer_id,
        total: i.total,
        status: i.status,
        issue_date: i.issue_date
      }));

    return Response.json({
      success: true,
      data: {
        associations,
        units,
        owners,
        tenants,
        customers,
        invoices
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});