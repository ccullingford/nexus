import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/usePermissions';
import { PERMISSIONS } from '@/components/permissions';
import { FileCheck, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import PermitDetailDrawer from '@/components/parking-manager/PermitDetailDrawer';

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  void: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending: 'bg-blue-100 text-blue-800 border-blue-200'
};

const typeColors = {
  resident: 'bg-blue-50 text-blue-700 border-blue-200',
  visitor: 'bg-purple-50 text-purple-700 border-purple-200',
  additional: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  temp: 'bg-orange-50 text-orange-700 border-orange-200'
};

export default function ParkingManagerPermits() {
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [associationFilter, setAssociationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [selectedPermit, setSelectedPermit] = useState(null);

  const { data: permits = [], isLoading } = useQuery({
    queryKey: ['permits'],
    queryFn: () => base44.entities.Permit.list('-issued_at', 500)
  });

  const { data: associations = [] } = useQuery({
    queryKey: ['associations'],
    queryFn: () => base44.entities.Association.list('name', 500)
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list('unit_number', 1000)
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('license_plate', 1000)
  });

  const { data: makes = [] } = useQuery({
    queryKey: ['vehicleMakes'],
    queryFn: () => base44.entities.VehicleMake.list('name', 500)
  });

  const { data: models = [] } = useQuery({
    queryKey: ['vehicleModels'],
    queryFn: () => base44.entities.VehicleModel.list('name', 1000)
  });

  const getAssociationName = (associationId) => {
    const assoc = associations.find(a => a.id === associationId);
    return assoc?.name || '—';
  };

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    return unit?.unit_number || '—';
  };

  const getVehicleInfo = (vehicleId) => {
    if (!vehicleId) return '—';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return '—';
    return `${vehicle.license_plate}${vehicle.state ? ` (${vehicle.state})` : ''}`;
  };

  const getMakeName = (makeId) => {
    const make = makes.find(m => m.id === makeId);
    return make?.name || '';
  };

  const getModelName = (modelId) => {
    const model = models.find(m => m.id === modelId);
    return model?.name || '';
  };

  const getVehicleDetails = (vehicleId) => {
    if (!vehicleId) return null;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return null;
    return {
      ...vehicle,
      makeName: getMakeName(vehicle.make_id),
      modelName: getModelName(vehicle.model_id)
    };
  };

  // Get unique units for the selected association
  const filteredUnits = associationFilter === 'all' 
    ? units 
    : units.filter(u => u.association_id === associationFilter);

  const filteredPermits = permits.filter(permit => {
    const associationMatch = associationFilter === 'all' || permit.association_id === associationFilter;
    const statusMatch = statusFilter === 'all' || permit.status === statusFilter;
    const typeMatch = typeFilter === 'all' || permit.type === typeFilter;
    const unitMatch = unitFilter === 'all' || permit.unit_id === unitFilter;

    if (!searchTerm.trim()) {
      return associationMatch && statusMatch && typeMatch && unitMatch;
    }

    const term = searchTerm.toLowerCase();
    const permitNumber = (permit.permit_number || '').toLowerCase();
    const vehicleInfo = getVehicleInfo(permit.vehicle_id).toLowerCase();
    const unitNumber = getUnitNumber(permit.unit_id).toLowerCase();

    return (associationMatch && statusMatch && typeMatch && unitMatch) && (
      permitNumber.includes(term) ||
      vehicleInfo.includes(term) ||
      unitNumber.includes(term)
    );
  });

  if (!hasPermission(PERMISSIONS.PARKING_MANAGER_PERMITS_VIEW)) {
    return (
      <div className="text-center py-12 text-[#5c5f7a]">
        You don't have permission to view permits.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#414257]">Permits</h1>
        <p className="text-[#5c5f7a] mt-1">{filteredPermits.length} total permits</p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="lg:col-span-3 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#5c5f7a]" />
              <Input
                placeholder="Search by permit #, vehicle plate, or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Association Filter */}
            <Select value={associationFilter} onValueChange={(value) => {
              setAssociationFilter(value);
              setUnitFilter('all');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Associations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Associations</SelectItem>
                {associations.map((assoc) => (
                  <SelectItem key={assoc.id} value={assoc.id}>
                    {assoc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Unit Filter */}
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {filteredUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="void">Void</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="resident">Resident</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="additional">Additional</SelectItem>
                <SelectItem value="temp">Temporary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Permits Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#414257]">Permits</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-[#5c5f7a]">Loading permits...</div>
          ) : filteredPermits.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="w-12 h-12 text-[#5c5f7a] mx-auto mb-4" />
              <p className="text-[#5c5f7a]">
                {searchTerm || associationFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || unitFilter !== 'all'
                  ? 'No permits match your filters'
                  : 'No permits issued yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permit #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Expiration Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermits.map((permit) => (
                    <TableRow
                      key={permit.id}
                      className="cursor-pointer hover:bg-[#f8f8fb]"
                      onClick={() => setSelectedPermit(permit)}
                    >
                      <TableCell className="font-medium">
                        {permit.permit_number || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${typeColors[permit.type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                        >
                          {permit.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`capitalize ${statusColors[permit.status] || 'bg-gray-100 text-gray-800 border-gray-200'} border`}
                        >
                          {permit.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#5c5f7a]">
                        {getVehicleInfo(permit.vehicle_id)}
                      </TableCell>
                      <TableCell className="text-[#5c5f7a]">
                        {getUnitNumber(permit.unit_id)}
                      </TableCell>
                      <TableCell className="text-[#5c5f7a]">
                        {permit.issued_at ? format(new Date(permit.issued_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-[#5c5f7a]">
                        {permit.expires_at ? format(new Date(permit.expires_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permit Detail Drawer */}
      <PermitDetailDrawer
        permit={selectedPermit}
        onClose={() => setSelectedPermit(null)}
        getAssociationName={getAssociationName}
        getUnitNumber={getUnitNumber}
        getVehicleDetails={getVehicleDetails}
      />
    </div>
  );
}