import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function VehicleFormModal({ open, onClose, vehicle, associations, units, owners, tenants }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    association_id: '',
    unit_id: '',
    owner_id: '',
    tenant_id: '',
    make: '',
    model: '',
    year: '',
    color: '',
    license_plate: '',
    state: '',
    parking_spot: '',
    vehicle_type: 'car',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        association_id: vehicle.association_id || '',
        unit_id: vehicle.unit_id || '',
        owner_id: vehicle.owner_id || '',
        tenant_id: vehicle.tenant_id || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        color: vehicle.color || '',
        license_plate: vehicle.license_plate || '',
        state: vehicle.state || '',
        parking_spot: vehicle.parking_spot || '',
        vehicle_type: vehicle.vehicle_type || 'car',
        status: vehicle.status || 'active',
        notes: vehicle.notes || ''
      });
    } else {
      setFormData({
        association_id: '',
        unit_id: '',
        owner_id: '',
        tenant_id: '',
        make: '',
        model: '',
        year: '',
        color: '',
        license_plate: '',
        state: '',
        parking_spot: '',
        vehicle_type: 'car',
        status: 'active',
        notes: ''
      });
    }
  }, [vehicle, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clean up form data - remove empty strings
    const cleanData = { ...formData };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === '') {
        delete cleanData[key];
      }
    });
    
    // Convert year to number if present
    if (cleanData.year) {
      cleanData.year = parseInt(cleanData.year);
    }
    
    if (vehicle) {
      updateMutation.mutate({ id: vehicle.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const filteredUnits = formData.association_id 
    ? units.filter(u => u.association_id === formData.association_id)
    : [];

  const filteredOwners = formData.unit_id 
    ? owners.filter(o => o.unit_id === formData.unit_id)
    : [];

  const filteredTenants = formData.unit_id 
    ? tenants.filter(t => t.unit_id === formData.unit_id)
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#414257]">
            {vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Association */}
            <div className="col-span-2">
              <Label>Association *</Label>
              <Select
                value={formData.association_id}
                onValueChange={(value) => {
                  setFormData({ 
                    ...formData, 
                    association_id: value,
                    unit_id: '',
                    owner_id: '',
                    tenant_id: ''
                  });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select association" />
                </SelectTrigger>
                <SelectContent>
                  {associations.map(assoc => (
                    <SelectItem key={assoc.id} value={assoc.id}>
                      {assoc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit */}
            <div className="col-span-2">
              <Label>Unit *</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => {
                  setFormData({ 
                    ...formData, 
                    unit_id: value,
                    owner_id: '',
                    tenant_id: ''
                  });
                }}
                disabled={!formData.association_id}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Owner or Tenant */}
            <div>
              <Label>Owner (Optional)</Label>
              <Select
                value={formData.owner_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, owner_id: value, tenant_id: '' });
                }}
                disabled={!formData.unit_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {filteredOwners.map(owner => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.is_company 
                        ? owner.company_name 
                        : `${owner.first_name} ${owner.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tenant (Optional)</Label>
              <Select
                value={formData.tenant_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, tenant_id: value, owner_id: '' });
                }}
                disabled={!formData.unit_id || formData.owner_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {filteredTenants.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Details */}
            <div>
              <Label>Make *</Label>
              <Input
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                placeholder="Toyota"
                required
              />
            </div>

            <div>
              <Label>Model *</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Camry"
                required
              />
            </div>

            <div>
              <Label>Year</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="2024"
                min="1900"
                max="2100"
              />
            </div>

            <div>
              <Label>Color</Label>
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="Silver"
              />
            </div>

            <div>
              <Label>License Plate *</Label>
              <Input
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                placeholder="ABC1234"
                required
              />
            </div>

            <div>
              <Label>State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="TX"
                maxLength={2}
              />
            </div>

            <div>
              <Label>Vehicle Type</Label>
              <Select
                value={formData.vehicle_type}
                onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Parking Spot</Label>
              <Input
                value={formData.parking_spot}
                onChange={(e) => setFormData({ ...formData, parking_spot: e.target.value })}
                placeholder="A-12"
              />
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this vehicle"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
            >
              {vehicle ? 'Update' : 'Add'} Vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}