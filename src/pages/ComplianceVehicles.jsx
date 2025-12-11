import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/components/usePermissions';
import { PERMISSIONS } from '@/components/permissions';
import { Car, Plus, Search, Edit, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VehicleFormModal from '@/components/compliance/VehicleFormModal';

const vehicleTypeColors = {
  car: 'bg-blue-100 text-blue-800 border-blue-200',
  truck: 'bg-green-100 text-green-800 border-green-200',
  suv: 'bg-purple-100 text-purple-800 border-purple-200',
  van: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  motorcycle: 'bg-red-100 text-red-800 border-red-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200'
};

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function ComplianceVehicles() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('-created_date', 500)
  });

  const { data: associations = [] } = useQuery({
    queryKey: ['associations'],
    queryFn: () => base44.entities.Association.list('name', 500)
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list('unit_number', 1000)
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['owners'],
    queryFn: () => base44.entities.Owner.list('last_name', 1000)
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list('last_name', 1000)
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Vehicle.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }
  });

  const getAssociationName = (associationId) => {
    const assoc = associations.find(a => a.id === associationId);
    return assoc?.name || '—';
  };

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    return unit?.unit_number || '—';
  };

  const getOwnerName = (ownerId) => {
    if (!ownerId) return null;
    const owner = owners.find(o => o.id === ownerId);
    if (!owner) return null;
    if (owner.is_company) return owner.company_name;
    return `${owner.first_name || ''} ${owner.last_name || ''}`.trim();
  };

  const getTenantName = (tenantId) => {
    if (!tenantId) return null;
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return null;
    return `${tenant.first_name} ${tenant.last_name}`;
  };

  const getPersonName = (vehicle) => {
    if (vehicle.owner_id) {
      return getOwnerName(vehicle.owner_id) || '—';
    }
    if (vehicle.tenant_id) {
      return getTenantName(vehicle.tenant_id) || '—';
    }
    return '—';
  };

  const filteredVehicles = vehicles.filter(v => {
    const statusMatch = statusFilter === 'all' || v.status === statusFilter;
    
    if (!searchTerm.trim()) return statusMatch;
    
    const term = searchTerm.toLowerCase();
    const make = (v.make || '').toLowerCase();
    const model = (v.model || '').toLowerCase();
    const plate = (v.license_plate || '').toLowerCase();
    const color = (v.color || '').toLowerCase();
    const associationName = getAssociationName(v.association_id).toLowerCase();
    const unitNumber = getUnitNumber(v.unit_id).toLowerCase();
    const personName = getPersonName(v).toLowerCase();
    
    return statusMatch && (
      make.includes(term) ||
      model.includes(term) ||
      plate.includes(term) ||
      color.includes(term) ||
      associationName.includes(term) ||
      unitNumber.includes(term) ||
      personName.includes(term)
    );
  });

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  const handleArchive = (vehicle) => {
    if (confirm(`Archive vehicle ${vehicle.make} ${vehicle.model} (${vehicle.license_plate})?`)) {
      archiveMutation.mutate({ id: vehicle.id, status: 'archived' });
    }
  };

  const handleReactivate = (vehicle) => {
    archiveMutation.mutate({ id: vehicle.id, status: 'active' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#414257]">Vehicle Registry</h1>
          <p className="text-[#5c5f7a] mt-1">{filteredVehicles.length} total vehicles</p>
        </div>
        {hasPermission(PERMISSIONS.COMPLIANCE_VEHICLES_EDIT) && (
          <Button
            onClick={() => {
              setEditingVehicle(null);
              setShowModal(true);
            }}
            className="bg-[#414257] hover:bg-[#5c5f7a]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#5c5f7a]" />
              <Input
                placeholder="Search by make, model, plate, owner, or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#414257]">Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-[#5c5f7a]">Loading vehicles...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-12 h-12 text-[#5c5f7a] mx-auto mb-4" />
              <p className="text-[#5c5f7a] mb-4">
                {searchTerm || statusFilter !== 'active' 
                  ? 'No vehicles match your filters' 
                  : 'No vehicles registered yet'}
              </p>
              {hasPermission(PERMISSIONS.COMPLIANCE_VEHICLES_EDIT) && (
                <Button
                  onClick={() => {
                    setEditingVehicle(null);
                    setShowModal(true);
                  }}
                  className="bg-[#414257] hover:bg-[#5c5f7a]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Register First Vehicle
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Association</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Owner/Tenant</TableHead>
                    <TableHead>Parking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} className="hover:bg-[#f8f8fb]">
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={`${vehicleTypeColors[vehicle.vehicle_type]} border text-xs capitalize`}>
                              {vehicle.vehicle_type}
                            </Badge>
                            {vehicle.color && (
                              <span className="text-xs text-[#5c5f7a]">{vehicle.color}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {vehicle.license_plate}
                        {vehicle.state && (
                          <span className="text-xs text-[#5c5f7a] ml-1">({vehicle.state})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#5c5f7a]">{getAssociationName(vehicle.association_id)}</TableCell>
                      <TableCell className="text-[#5c5f7a]">{getUnitNumber(vehicle.unit_id)}</TableCell>
                      <TableCell className="text-[#5c5f7a]">{getPersonName(vehicle)}</TableCell>
                      <TableCell className="text-[#5c5f7a]">{vehicle.parking_spot || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${statusColors[vehicle.status]} border capitalize`}>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {hasPermission(PERMISSIONS.COMPLIANCE_VEHICLES_EDIT) && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(vehicle)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {vehicle.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleArchive(vehicle)}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReactivate(vehicle)}
                                title="Reactivate"
                              >
                                <Car className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
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

      {/* Vehicle Form Modal */}
      <VehicleFormModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingVehicle(null);
        }}
        vehicle={editingVehicle}
        associations={associations}
        units={units}
        owners={owners}
        tenants={tenants}
      />
    </div>
  );
}