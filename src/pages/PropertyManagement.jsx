import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/components/usePermissions';
import { PERMISSIONS } from '@/components/permissions';
import { Building2, Plus, Edit, MapPin, Search, Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function PropertyManagement() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    street_address: '',
    city: '',
    state: '',
    zip: '',
    status: 'active',
    permit_rule_type: 'per_unit',
    permits_per_count: 2,
    max_permits_per_unit: null,
    max_visitor_permits: 2,
    allow_additional_permits: true
  });

  const { data: associations = [], isLoading } = useQuery({
    queryKey: ['associations'],
    queryFn: () => base44.entities.Association.list('name', 500)
  });

  const filteredAssociations = associations.filter(a => {
    const term = searchTerm.trim().toLowerCase();
    const statusMatch = statusFilter === 'all' || a.status === statusFilter;
    
    if (!term) return statusMatch;

    const name = (a.name || '').toLowerCase();
    const code = (a.code || '').toLowerCase();
    const city = (a.city || '').toLowerCase();

    return statusMatch && (
      name.includes(term) ||
      code.includes(term) ||
      city.includes(term)
    );
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Association.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations'] });
      handleCloseModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Association.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations'] });
      handleCloseModal();
    }
  });

  const handleOpenModal = (association = null) => {
    if (association) {
      setEditingAssociation(association);
      setFormData({
        name: association.name || '',
        code: association.code || '',
        street_address: association.street_address || '',
        city: association.city || '',
        state: association.state || '',
        zip: association.zip || '',
        status: association.status || 'active',
        permit_rule_type: association.permit_rule_type || 'per_unit',
        permits_per_count: association.permits_per_count ?? 2,
        max_permits_per_unit: association.max_permits_per_unit || null,
        max_visitor_permits: association.max_visitor_permits ?? 2,
        allow_additional_permits: association.allow_additional_permits ?? true
      });
    } else {
      setEditingAssociation(null);
      setFormData({
        name: '',
        code: '',
        street_address: '',
        city: '',
        state: '',
        zip: '',
        status: 'active',
        permit_rule_type: 'per_unit',
        permits_per_count: 2,
        max_permits_per_unit: null,
        max_visitor_permits: 2,
        allow_additional_permits: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssociation(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAssociation) {
      updateMutation.mutate({ id: editingAssociation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#414257]">Property Management</h1>
          <p className="text-[#5c5f7a] mt-1">Manage associations, units, owners, and tenants</p>
        </div>
        <div className="flex gap-2">
          {hasPermission(PERMISSIONS.IMPORTS_VIEW_HISTORY) && (
            <Button
              variant="outline"
              onClick={() => window.location.href = createPageUrl('PropertyManagementImports')}
            >
              Import Data
            </Button>
          )}
          {hasPermission(PERMISSIONS.PROPERTY_MANAGEMENT_ASSOCIATIONS_EDIT) && (
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Association
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#5c5f7a]" />
                <Input
                  placeholder="Search by name, code, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(searchTerm || statusFilter !== 'all') && (
            <p className="text-sm text-[#5c5f7a] mt-3">
              Showing {filteredAssociations.length} of {associations.length} associations
            </p>
          )}
        </CardContent>
      </Card>

      {/* Associations List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#414257]">Associations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-[#5c5f7a]">Loading associations...</div>
          ) : filteredAssociations.length === 0 ? (
            <div className="text-center py-8 text-[#5c5f7a]">
              {associations.length === 0 
                ? 'No associations yet. Create your first one to get started.' 
                : 'No associations match your search'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssociations.map((association) => (
                    <TableRow
                      key={association.id}
                      className="cursor-pointer hover:bg-[#f8f8fb]"
                      onClick={() => window.location.href = createPageUrl('PropertyManagementAssociation') + `?id=${association.id}`}
                    >
                      <TableCell className="font-medium">{association.name}</TableCell>
                      <TableCell>
                        {association.code ? (
                          <Badge variant="outline">{association.code}</Badge>
                        ) : (
                          <span className="text-[#5c5f7a]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {association.city && association.state ? (
                          <div className="flex items-center gap-1 text-[#5c5f7a]">
                            <MapPin className="w-3 h-3" />
                            {association.city}, {association.state}
                          </div>
                        ) : (
                          <span className="text-[#5c5f7a]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[association.status]} border capitalize`}>
                          {association.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {hasPermission(PERMISSIONS.PROPERTY_MANAGEMENT_ASSOCIATIONS_EDIT) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(association);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#414257]">
              {editingAssociation ? 'Edit Association' : 'New Association'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Association name"
                  required
                />
              </div>

              <div>
                <Label>Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="ARLYN"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Street Address</Label>
                <Input
                  value={formData.street_address}
                  onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div>
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="TX"
                />
              </div>

              <div>
                <Label>ZIP</Label>
                <Input
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  placeholder="75001"
                />
              </div>
            </div>

            <Separator className="my-6" />

            {/* Parking & Permit Rules */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-[#414257]" />
                <h3 className="text-lg font-semibold text-[#414257]">Parking & Permit Rules</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Permit Allocation Method</Label>
                  <Select 
                    value={formData.permit_rule_type} 
                    onValueChange={(value) => setFormData({ ...formData, permit_rule_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_unit">Per Unit</SelectItem>
                      <SelectItem value="per_bedroom">Per Bedroom</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#5c5f7a] mt-1">
                    {formData.permit_rule_type === 'per_bedroom' 
                      ? 'Permits allocated based on number of bedrooms in each unit'
                      : 'Same number of permits for every unit'}
                  </p>
                </div>

                <div>
                  <Label>Base Permits Per {formData.permit_rule_type === 'per_bedroom' ? 'Bedroom' : 'Unit'}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.permits_per_count}
                    onChange={(e) => setFormData({ ...formData, permits_per_count: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label>Max Visitor Permits Per Unit</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.max_visitor_permits}
                    onChange={(e) => setFormData({ ...formData, max_visitor_permits: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Max Resident Permits Per Unit (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Leave empty for no hard cap"
                    value={formData.max_permits_per_unit || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      max_permits_per_unit: e.target.value ? parseInt(e.target.value) : null 
                    })}
                  />
                  <p className="text-xs text-[#5c5f7a] mt-1">
                    Optional hard cap on total resident permits per unit
                  </p>
                </div>

                <div className="col-span-2 flex items-center justify-between p-3 bg-[#f8f8fb] rounded-lg">
                  <div>
                    <Label className="font-medium">Allow Additional Resident Permits</Label>
                    <p className="text-xs text-[#5c5f7a] mt-1">
                      Allow units to request permits beyond the baseline (up to max if set)
                    </p>
                  </div>
                  <Switch
                    checked={formData.allow_additional_permits}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_additional_permits: checked })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#414257] hover:bg-[#5c5f7a]"
              >
                {editingAssociation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}