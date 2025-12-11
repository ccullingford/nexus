import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/components/usePermissions';
import { PERMISSIONS } from '@/components/permissions';
import { ArrowLeft, Plus, Edit, Users, Home, Car, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import OwnerFormModal from '@/components/property-management/OwnerFormModal';
import TenantFormModal from '@/components/property-management/TenantFormModal';
import PermitFormModal from '@/components/parking-manager/PermitFormModal';
import { format } from 'date-fns';

const statusColors = {
  occupied: 'bg-blue-100 text-blue-800 border-blue-200',
  vacant: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function PropertyManagementUnit() {
  const { hasPermission } = usePermissions();
  const params = new URLSearchParams(window.location.search);
  const unitId = params.get('id');
  const associationId = params.get('associationId');

  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);

  const { data: unit, isLoading } = useQuery({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      const units = await base44.entities.Unit.filter({ id: unitId });
      return units[0];
    },
    enabled: !!unitId
  });

  const { data: association } = useQuery({
    queryKey: ['association', associationId],
    queryFn: async () => {
      const associations = await base44.entities.Association.filter({ id: associationId });
      return associations[0];
    },
    enabled: !!associationId
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['owners', unitId],
    queryFn: () => base44.entities.Owner.filter({ unit_id: unitId }, 'last_name', 500),
    enabled: !!unitId
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', unitId],
    queryFn: () => base44.entities.Tenant.filter({ unit_id: unitId }, 'last_name', 500),
    enabled: !!unitId
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', unitId],
    queryFn: () => base44.entities.Vehicle.filter({ unit_id: unitId }),
    enabled: !!unitId
  });

  const { data: makes = [] } = useQuery({
    queryKey: ['vehicleMakes'],
    queryFn: () => base44.entities.VehicleMake.list('name', 500)
  });

  const { data: models = [] } = useQuery({
    queryKey: ['vehicleModels'],
    queryFn: () => base44.entities.VehicleModel.list('name', 1000)
  });

  const { data: colors = [] } = useQuery({
    queryKey: ['vehicleColors'],
    queryFn: () => base44.entities.VehicleColor.list('name', 500)
  });

  const { data: permits = [] } = useQuery({
    queryKey: ['permits', unitId],
    queryFn: () => base44.entities.Permit.filter({ unit_id: unitId }, '-issue_date', 500),
    enabled: !!unitId
  });

  if (isLoading) {
    return <div className="text-center py-12 text-[#5c5f7a]">Loading unit...</div>;
  }

  if (!unit) {
    return <div className="text-center py-12 text-[#5c5f7a]">Unit not found</div>;
  }

  const getMakeName = (makeId) => {
    if (!makeId) return '';
    const make = makes.find(m => m.id === makeId);
    return make?.name || '';
  };

  const getModelName = (modelId) => {
    if (!modelId) return '';
    const model = models.find(m => m.id === modelId);
    return model?.name || '';
  };

  const getColorName = (colorId) => {
    if (!colorId) return null;
    const color = colors.find(c => c.id === colorId);
    return color?.name || null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.location.href = createPageUrl('PropertyManagementAssociation') + `?id=${associationId}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#414257]">Unit {unit.unit_number}</h1>
            <Badge className={`${statusColors[unit.status]} border capitalize`}>
              {unit.status}
            </Badge>
          </div>
          {association && (
            <p className="text-[#5c5f7a] mt-1">{association.name}</p>
          )}
        </div>
      </div>

      {/* Unit Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#414257]">Unit Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#5c5f7a] mb-1">Unit Number</p>
              <p className="font-medium text-[#414257]">{unit.unit_number}</p>
            </div>
            <div>
              <p className="text-sm text-[#5c5f7a] mb-1">Bedrooms</p>
              <p className="font-medium text-[#414257]">{unit.bedrooms || '—'}</p>
            </div>
            {unit.street_address && (
              <div className="col-span-2">
                <p className="text-sm text-[#5c5f7a] mb-1">Address Override</p>
                <p className="font-medium text-[#414257]">{unit.street_address}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
            <div className="text-center py-8 text-[#5c5f7a]">No owners assigned to this unit</div>
          ) : (
            <div className="space-y-3">
              {owners.map((owner) => (
                <div key={owner.id} className="p-4 bg-[#e3e4ed] rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#414257]">
                          {owner.is_company 
                            ? owner.company_name 
                            : `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || '—'
                          }
                        </p>
                        {owner.is_company && (
                          <Badge variant="outline" className="text-xs">Company</Badge>
                        )}
                        {owner.is_primary_owner && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">Primary</Badge>
                        )}
                      </div>
                      {owner.is_company && (owner.contact_first_name || owner.contact_last_name) && (
                        <p className="text-sm text-[#5c5f7a] mt-1">
                          Contact: {owner.contact_first_name} {owner.contact_last_name}
                        </p>
                      )}
                      <div className="mt-2 space-y-1 text-sm text-[#5c5f7a]">
                        {owner.email && <p>Email: {owner.email}</p>}
                        {owner.phone && <p>Phone: {owner.phone}</p>}
                        {owner.mailing_address && (
                          <p>
                            Mailing: {owner.mailing_address}
                            {owner.mailing_city && `, ${owner.mailing_city}`}
                            {owner.mailing_state && `, ${owner.mailing_state}`}
                            {owner.mailing_zip && ` ${owner.mailing_zip}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {owner.notes && (
                    <p className="mt-3 text-sm text-[#5c5f7a] italic">{owner.notes}</p>
                  )}
                </div>
              ))}
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
            <div className="text-center py-8 text-[#5c5f7a]">No tenants assigned to this unit</div>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="p-4 bg-[#e3e4ed] rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#414257]">
                          {tenant.first_name} {tenant.last_name}
                        </p>
                        {tenant.is_current && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Current</Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-[#5c5f7a]">
                        {tenant.email && <p>Email: {tenant.email}</p>}
                        {tenant.phone && <p>Phone: {tenant.phone}</p>}
                        {(tenant.lease_start_date || tenant.lease_end_date) && (
                          <p>
                            Lease: {tenant.lease_start_date ? format(new Date(tenant.lease_start_date), 'MMM d, yyyy') : '—'}
                            {' to '}
                            {tenant.lease_end_date ? format(new Date(tenant.lease_end_date), 'MMM d, yyyy') : '—'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {tenant.notes && (
                    <p className="mt-3 text-sm text-[#5c5f7a] italic">{tenant.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicles */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#414257]">Vehicles</CardTitle>
            {hasPermission(PERMISSIONS.PARKING_MANAGER_VEHICLES_EDIT) && (
              <Button
                onClick={() => window.location.href = createPageUrl('ParkingManagerVehicles')}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-8 text-[#5c5f7a]">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No vehicles registered for this unit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.filter(v => v.status === 'active').map((vehicle) => (
                <div key={vehicle.id} className="p-4 bg-[#e3e4ed] rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Car className="w-5 h-5 text-[#414257] mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#414257]">
                          {vehicle.year} {getMakeName(vehicle.make_id)} {getModelName(vehicle.model_id)}
                        </p>
                        <div className="mt-1 space-y-1 text-sm text-[#5c5f7a]">
                          <p>License Plate: {vehicle.license_plate} {vehicle.state && `(${vehicle.state})`}</p>
                          {getColorName(vehicle.color_id) && <p>Color: {getColorName(vehicle.color_id)}</p>}
                          {vehicle.parking_spot && <p>Parking: {vehicle.parking_spot}</p>}
                          {vehicle.body_style_label && <p>Body Style: {vehicle.body_style_label}</p>}
                        </div>
                      </div>
                    </div>
                    {hasPermission(PERMISSIONS.PARKING_MANAGER_VEHICLES_EDIT) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.location.href = createPageUrl('ParkingManagerVehicles')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permits */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#414257]">Parking Permits</CardTitle>
            {hasPermission(PERMISSIONS.PARKING_MANAGER_VEHICLES_EDIT) && (
              <Button
                onClick={() => setShowPermitModal(true)}
                className="bg-[#414257] hover:bg-[#5c5f7a]"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Issue Permit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {permits.length === 0 ? (
            <div className="text-center py-8 text-[#5c5f7a]">
              <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No permits issued for this unit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {permits.filter(p => p.status === 'active').map((permit) => (
                <div key={permit.id} className="p-4 bg-[#e3e4ed] rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileCheck className="w-5 h-5 text-[#414257] mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[#414257]">
                            {permit.permit_number || 'No Number'}
                          </p>
                          <Badge className={`capitalize ${
                            permit.permit_type === 'resident' ? 'bg-blue-100 text-blue-800' :
                            permit.permit_type === 'visitor' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {permit.permit_type}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                        <div className="mt-1 space-y-1 text-sm text-[#5c5f7a]">
                          <p>Issued: {permit.issue_date ? format(new Date(permit.issue_date), 'MMM d, yyyy') : '—'}</p>
                          {permit.expiration_date && (
                            <p>Expires: {format(new Date(permit.expiration_date), 'MMM d, yyyy')}</p>
                          )}
                          {permit.notes && <p className="italic">{permit.notes}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <OwnerFormModal
        open={showOwnerModal}
        onClose={() => setShowOwnerModal(false)}
        associationId={associationId}
        units={[unit]}
        preselectedUnitId={unitId}
      />
      <TenantFormModal
        open={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        associationId={associationId}
        units={[unit]}
        preselectedUnitId={unitId}
      />
      <PermitFormModal
        open={showPermitModal}
        onClose={() => setShowPermitModal(false)}
        associationId={associationId}
        unitId={unitId}
      />
    </div>
  );
}