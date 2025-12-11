import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

export default function VehicleFormModal({ open, onClose, vehicle, associations, units, owners, tenants }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    association_id: '',
    unit_id: '',
    owner_id: '',
    tenant_id: '',
    make_id: '',
    model_id: '',
    year: '',
    color_id: '',
    license_plate: '',
    state: '',
    parking_spot: '',
    body_style_id: '',
    status: 'active',
    notes: ''
  });

  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newColor, setNewColor] = useState('');
  const [showNewMake, setShowNewMake] = useState(false);
  const [showNewModel, setShowNewModel] = useState(false);
  const [showNewColor, setShowNewColor] = useState(false);

  // Fetch lookups - only popular makes for dropdown
  const { data: makes = [] } = useQuery({
    queryKey: ['vehicleMakes'],
    queryFn: async () => {
      const allMakes = await base44.entities.VehicleMake.list('name', 500);
      // Filter to only common/popular makes, plus add "Other" option
      return allMakes.filter(m => m.is_common);
    }
  });

  const { data: allModels = [] } = useQuery({
    queryKey: ['vehicleModels'],
    queryFn: () => base44.entities.VehicleModel.list('name', 1000)
  });

  const { data: colors = [] } = useQuery({
    queryKey: ['vehicleColors'],
    queryFn: () => base44.entities.VehicleColor.list('name', 500)
  });

  const { data: bodyStyles = [] } = useQuery({
    queryKey: ['vehicleBodyStyles'],
    queryFn: () => base44.entities.VehicleBodyStyle.list('name', 500)
  });

  // Mutations for creating new lookups
  const createMakeMutation = useMutation({
    mutationFn: (name) => base44.entities.VehicleMake.create({ name }),
    onSuccess: (newMake) => {
      queryClient.invalidateQueries({ queryKey: ['vehicleMakes'] });
      setFormData({ ...formData, make_id: newMake.id, model_id: '' });
      setNewMake('');
      setShowNewMake(false);
    }
  });

  const createModelMutation = useMutation({
    mutationFn: ({ make_id, name }) => base44.entities.VehicleModel.create({ make_id, name }),
    onSuccess: (newModel) => {
      queryClient.invalidateQueries({ queryKey: ['vehicleModels'] });
      setFormData({ ...formData, model_id: newModel.id });
      setNewModel('');
      setShowNewModel(false);
    }
  });

  const createColorMutation = useMutation({
    mutationFn: (name) => base44.entities.VehicleColor.create({ name }),
    onSuccess: (newColor) => {
      queryClient.invalidateQueries({ queryKey: ['vehicleColors'] });
      setFormData({ ...formData, color_id: newColor.id });
      setNewColor('');
      setShowNewColor(false);
    }
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        association_id: vehicle.association_id || '',
        unit_id: vehicle.unit_id || '',
        owner_id: vehicle.owner_id || '',
        tenant_id: vehicle.tenant_id || '',
        make_id: vehicle.make_id || '',
        model_id: vehicle.model_id || '',
        year: vehicle.year || '',
        color_id: vehicle.color_id || '',
        license_plate: vehicle.license_plate || '',
        state: vehicle.state || '',
        parking_spot: vehicle.parking_spot || '',
        body_style_id: vehicle.body_style_id || '',
        status: vehicle.status || 'active',
        notes: vehicle.notes || ''
      });
    } else {
      setFormData({
        association_id: '',
        unit_id: '',
        owner_id: '',
        tenant_id: '',
        make_id: '',
        model_id: '',
        year: '',
        color_id: '',
        license_plate: '',
        state: '',
        parking_spot: '',
        body_style_id: '',
        status: 'active',
        notes: ''
      });
    }
    setShowNewMake(false);
    setShowNewModel(false);
    setShowNewColor(false);
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
    
    // Get body style label for denormalization
    const bodyStyleLabel = formData.body_style_id 
      ? bodyStyles.find(bs => bs.id === formData.body_style_id)?.name || null
      : null;
    
    // Clean up form data - remove empty strings
    const cleanData = { 
      ...formData,
      body_style_label: bodyStyleLabel
    };
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

  const filteredModels = formData.make_id
    ? allModels.filter(m => m.make_id === formData.make_id)
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

            {/* Make */}
            <div className="col-span-2">
              <Label>Make *</Label>
              {showNewMake ? (
                <div className="flex gap-2">
                  <Input
                    value={newMake}
                    onChange={(e) => setNewMake(e.target.value)}
                    placeholder="Enter make (e.g., Toyota, Honda)"
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newMake.trim()) {
                        createMakeMutation.mutate(newMake.trim());
                      }
                    }}
                    disabled={!newMake.trim() || createMakeMutation.isPending}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewMake(false);
                      setNewMake('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={formData.make_id}
                    onValueChange={(value) => {
                      if (value === 'other') {
                        setFormData({ ...formData, make_id: '', model_id: '' });
                        setShowNewMake(true);
                      } else {
                        setFormData({ ...formData, make_id: value, model_id: '' });
                      }
                    }}
                    required
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select make" />
                    </SelectTrigger>
                    <SelectContent>
                      {makes.map(make => (
                        <SelectItem key={make.id} value={make.id}>
                          {make.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="other" className="text-[#5c5f7a] font-medium">
                        Other (enter manually)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Model */}
            <div className="col-span-2">
              <Label>Model *</Label>
              {showNewModel ? (
                <div className="flex gap-2">
                  <Input
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="Enter new model"
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newModel.trim() && formData.make_id) {
                        createModelMutation.mutate({ 
                          make_id: formData.make_id, 
                          name: newModel.trim() 
                        });
                      }
                    }}
                    disabled={!newModel.trim() || !formData.make_id || createModelMutation.isPending}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewModel(false);
                      setNewModel('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={formData.model_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, model_id: value });
                    }}
                    disabled={!formData.make_id}
                    required
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewModel(true)}
                    disabled={!formData.make_id}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Year & Color */}
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
              {showNewColor ? (
                <div className="flex gap-2">
                  <Input
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="Enter new color"
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newColor.trim()) {
                        createColorMutation.mutate(newColor.trim());
                      }
                    }}
                    disabled={!newColor.trim() || createColorMutation.isPending}
                    size="sm"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewColor(false);
                      setNewColor('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={formData.color_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, color_id: value });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      {colors.map(color => (
                        <SelectItem key={color.id} value={color.id}>
                          {color.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewColor(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* License Plate & State */}
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
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {US_STATES.map(state => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.code} - {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Body Style & Parking */}
            <div>
              <Label>Body Style</Label>
              <Select
                value={formData.body_style_id}
                onValueChange={(value) => setFormData({ ...formData, body_style_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select body style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {bodyStyles.map(style => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name}
                    </SelectItem>
                  ))}
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

            {/* Notes */}
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