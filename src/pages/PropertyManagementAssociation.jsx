import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Edit, Users, Home, Building, FileText, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import UnitFormModal from '@/components/property-management/UnitFormModal';
import OwnerFormModal from '@/components/property-management/OwnerFormModal';
import TenantFormModal from '@/components/property-management/TenantFormModal';

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  occupied: 'bg-blue-100 text-blue-800 border-blue-200',
  vacant: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

export default function PropertyManagementAssociation() {
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const associationId = params.get('id');

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);

  const { data: association, isLoading } = useQuery({
    queryKey: ['association', associationId],
    queryFn: async () => {
      const associations = await base44.entities.Association.filter({ id: associationId });
      return associations[0];
    },
    enabled: !!associationId
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', associationId],
    queryFn: () => base44.entities.Unit.filter({ association_id: associationId }, 'unit_number', 500),
    enabled: !!associationId
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['owners', associationId],
    queryFn: () => base44.entities.Owner.filter({ association_id: associationId }, 'last_name', 500),
    enabled: !!associationId
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', associationId],
    queryFn: () => base44.entities.Tenant.filter({ association_id: associationId }, 'last_name', 500),
    enabled: !!associationId
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['associationCustomers', associationId],
    queryFn: () => base44.entities.Customer.filter({ association_id: associationId, type: 'association' }, 'name', 500),
    enabled: !!associationId
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['associationInvoices', associationId],
    queryFn: async () => {
      const customerIds = customers.map(c => c.id);
      if (customerIds.length === 0) return [];
      const allInvoices = await base44.entities.Invoice.list('-created_date', 200);
      return allInvoices.filter(inv => customerIds.includes(inv.customer_id));
    },
    enabled: !!associationId && customers.length > 0
  });

  const getOwnerForUnit = (unitId) => {
    const owner = owners.find(o => o.unit_id === unitId && o.is_primary_owner);
    if (!owner) return '—';
    if (owner.is_company) {
      return owner.company_name || '—';
    }
    return `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || '—';
  };

  const getTenantForUnit = (unitId) => {
    const tenant = tenants.find(t => t.unit_id === unitId && t.is_current);
    return tenant ? `${tenant.first_name} ${tenant.last_name}` : '—';
  };

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    return unit?.unit_number || '—';
  };

  if (isLoading) {
    return <div className="text-center py-12 text-[#5c5f7a]">Loading association...</div>;
  }

  if (!association) {
    return <div className="text-center py-12 text-[#5c5f7a]">Association not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.location.href = createPageUrl('PropertyManagement')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#414257]">{association.name}</h1>
            {association.code && <Badge variant="outline">{association.code}</Badge>}
            <Badge className={`${statusColors[association.status]} border capitalize`}>
              {association.status}
            </Badge>
          </div>
          {association.city && association.state && (
            <p className="text-[#5c5f7a] mt-1">
              {association.street_address && `${association.street_address}, `}
              {association.city}, {association.state} {association.zip}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="units" className="space-y-6">
      <TabsList>
        <TabsTrigger value="units" className="flex items-center gap-2">
          <Home className="w-4 h-4" />
          Units ({units.length})
        </TabsTrigger>
        <TabsTrigger value="people" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          People ({owners.length + tenants.length})
        </TabsTrigger>
        <TabsTrigger value="billing" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Billing
        </TabsTrigger>
      </TabsList>

        {/* Units Tab */}
        <TabsContent value="units" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#414257]">Units</CardTitle>
                <Button
                  onClick={() => setShowUnitModal(true)}
                  className="bg-[#414257] hover:bg-[#5c5f7a]"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Unit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {units.length === 0 ? (
                <div className="text-center py-8 text-[#5c5f7a]">No units yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit Number</TableHead>
                        <TableHead>Bedrooms</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Primary Owner</TableHead>
                        <TableHead>Current Tenant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit) => (
                        <TableRow
                          key={unit.id}
                          className="cursor-pointer hover:bg-[#f8f8fb]"
                          onClick={() => window.location.href = createPageUrl('PropertyManagementUnit') + `?id=${unit.id}&associationId=${associationId}`}
                        >
                          <TableCell className="font-medium">{unit.unit_number}</TableCell>
                          <TableCell>{unit.bedrooms || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[unit.status]} border capitalize`}>
                              {unit.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#5c5f7a]">{getOwnerForUnit(unit.id)}</TableCell>
                          <TableCell className="text-[#5c5f7a]">{getTenantForUnit(unit.id)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* People Tab */}
        <TabsContent value="people" className="space-y-4">
          {/* Owners */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#414257]">Owners</CardTitle>
                <Button
                  onClick={() => setShowOwnerModal(true)}
                  className="bg-[#414257] hover:bg-[#5c5f7a]"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Owner
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {owners.length === 0 ? (
                <div className="text-center py-8 text-[#5c5f7a]">No owners yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Primary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {owners.map((owner) => (
                        <TableRow key={owner.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {owner.is_company 
                                  ? owner.company_name 
                                  : `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || '—'
                                }
                              </p>
                              {owner.is_company && (owner.contact_first_name || owner.contact_last_name) && (
                                <p className="text-xs text-[#5c5f7a] mt-0.5">
                                  Contact: {owner.contact_first_name} {owner.contact_last_name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getUnitNumber(owner.unit_id)}</TableCell>
                          <TableCell className="text-[#5c5f7a]">{owner.email || '—'}</TableCell>
                          <TableCell className="text-[#5c5f7a]">{owner.phone || '—'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {owner.is_company && (
                                <Badge variant="outline" className="text-xs">Company</Badge>
                              )}
                              {owner.is_primary_owner && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">Primary</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tenants */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#414257]">Tenants</CardTitle>
                <Button
                  onClick={() => setShowTenantModal(true)}
                  className="bg-[#414257] hover:bg-[#5c5f7a]"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tenant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tenants.length === 0 ? (
                <div className="text-center py-8 text-[#5c5f7a]">No tenants yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Current</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">
                            {tenant.first_name} {tenant.last_name}
                          </TableCell>
                          <TableCell>{getUnitNumber(tenant.unit_id)}</TableCell>
                          <TableCell className="text-[#5c5f7a]">{tenant.email || '—'}</TableCell>
                          <TableCell className="text-[#5c5f7a]">{tenant.phone || '—'}</TableCell>
                          <TableCell>
                            {tenant.is_current && (
                              <Badge className="bg-green-100 text-green-800 border-green-200">Current</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          {/* Billing Profiles (Customers) */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#414257]">Billing Profiles</CardTitle>
                  <p className="text-sm text-[#5c5f7a] mt-1">Customer records for invoicing this association</p>
                </div>
                <Button
                  onClick={() => window.location.href = createPageUrl('InvoiceManagerCustomers') + `?createForAssociation=${associationId}`}
                  className="bg-[#414257] hover:bg-[#5c5f7a]"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Billing Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-[#5c5f7a] mx-auto mb-3" />
                  <p className="text-[#5c5f7a] mb-4">No billing profiles yet</p>
                  <p className="text-sm text-[#5c5f7a] mb-4">
                    Create a customer profile to start invoicing this association
                  </p>
                  <Button
                    onClick={() => window.location.href = createPageUrl('InvoiceManagerCustomers') + `?createForAssociation=${associationId}`}
                    variant="outline"
                  >
                    Create First Billing Profile
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {customers.map((customer) => (
                    <div key={customer.id} className="p-4 bg-[#e3e4ed] rounded-lg flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[#414257]">{customer.name}</p>
                        <div className="mt-2 space-y-1 text-sm text-[#5c5f7a]">
                          {customer.email && <p>Email: {customer.email}</p>}
                          {customer.phone && <p>Phone: {customer.phone}</p>}
                          {customer.address && (
                            <p>
                              Address: {customer.address}
                              {customer.city && `, ${customer.city}`}
                              {customer.state && `, ${customer.state}`}
                              {customer.zip && ` ${customer.zip}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = createPageUrl('InvoiceManagerNew') + `?customerId=${customer.id}`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        New Invoice
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#414257]">Recent Invoices</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = createPageUrl('InvoiceManagerInvoices')}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-[#5c5f7a]">
                  No invoices yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.slice(0, 5).map((invoice) => (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer hover:bg-[#f8f8fb]"
                          onClick={() => window.location.href = createPageUrl('InvoiceManagerDetail') + `?id=${invoice.id}`}
                        >
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.customer_name}</TableCell>
                          <TableCell>
                            {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="font-semibold">${(invoice.total || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[invoice.status]} border capitalize`}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <UnitFormModal
        open={showUnitModal}
        onClose={() => setShowUnitModal(false)}
        associationId={associationId}
      />
      <OwnerFormModal
        open={showOwnerModal}
        onClose={() => setShowOwnerModal(false)}
        associationId={associationId}
        units={units}
      />
      <TenantFormModal
        open={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        associationId={associationId}
        units={units}
      />
    </div>
  );
}