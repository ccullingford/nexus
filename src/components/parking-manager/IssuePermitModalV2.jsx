import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/usePermissions';
import { PERMISSIONS } from '@/components/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function IssuePermitModalV2({ open, onClose }) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canOverride = hasPermission(PERMISSIONS.PARKING_MANAGER_PERMITS_OVERRIDE_LIMITS);

  const [formData, setFormData] = useState({
    associationId: '',
    unitId: '',
    vehicleId: '',
    permitType: 'RESIDENT',
    expiresAt: '',
    notes: ''
  });

  const [errorDetails, setErrorDetails] = useState(null);

  // Fetch data
  const { data: associations = [] } = useQuery({
    queryKey: ['associations'],
    queryFn: () => base44.entities.Association.list('name', 100),
    enabled: open
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list('unit_number', 1000),
    enabled: open
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('license_plate', 1000),
    enabled: open
  });

  const { data: makes = [] } = useQuery({
    queryKey: ['vehicleMakes'],
    queryFn: () => base44.entities.VehicleMake.list('name', 500),
    enabled: open
  });

  const { data: models = [] } = useQuery({
    queryKey: ['vehicleModels'],
    queryFn: () => base44.entities.VehicleModel.list('name', 1000),
    enabled: open
  });

  const getMakeName = (id) => makes.find(m => m.id === id)?.name || '';
  const getModelName = (id) => models.find(m => m.id === id)?.name || '';

  const filteredUnits = formData.associationId
    ? units.filter(u => u.association_id === formData.associationId)
    : [];

  const filteredVehicles = formData.unitId
    ? vehicles.filter(v => v.unit_id === formData.unitId && v.status === 'active')
    : [];

  const issueMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('permit_issue', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['permits'] });
        toast.success(`Permit ${data.permit.permit_number} issued`);
        resetForm();
        onClose();
      } else {
        setErrorDetails(data);
      }
    },
    onError: (error) => {
      setErrorDetails({ success: false, error: error.message });
    }
  });

  const resetForm = () => {
    setFormData({
      associationId: '',
      unitId: '',
      vehicleId: '',
      permitType: 'RESIDENT',
      expiresAt: '',
      notes: ''
    });
    setErrorDetails(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorDetails(null);

    if (!formData.associationId || !formData.unitId || !formData.vehicleId) {
      setErrorDetails({ success: false, error: 'All fields are required' });
      return;
    }

    issueMutation.mutate({
      associationId: formData.associationId,
      unitId: formData.unitId,
      vehicleId: formData.vehicleId,
      permitType: formData.permitType,
      expiresAt: formData.expiresAt || null,
      notes: formData.notes || null,
      override: false
    });
  };

  const handleOverride = () => {
    issueMutation.mutate({
      associationId: formData.associationId,
      unitId: formData.unitId,
      vehicleId: formData.vehicleId,
      permitType: formData.permitType,
      expiresAt: formData.expiresAt || null,
      notes: formData.notes || null,
      override: true
    });
    setErrorDetails(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue New Permit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Display */}
          {errorDetails && !errorDetails.success && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{errorDetails.error || errorDetails.code}</p>
                </div>
              </div>

              {/* Cap Details */}
              {errorDetails.code === 'CAP_EXCEEDED' && errorDetails.details && (
                <div className="p-4 bg-[#f8f8fb] rounded-lg border border-[#e3e4ed]">
                  <h4 className="font-semibold text-[#414257] text-sm mb-2">Permit Cap Reached</h4>
                  <p className="text-sm text-[#5c5f7a]">
                    {errorDetails.details.active} of {errorDetails.details.max} {errorDetails.details.permitType} permits active for this unit
                  </p>
                </div>
              )}

              {/* Override Button */}
              {errorDetails.code === 'CAP_EXCEEDED' && canOverride && (
                <Button
                  type="button"
                  onClick={handleOverride}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  disabled={issueMutation.isPending}
                >
                  Override & Issue Permit
                </Button>
              )}
            </div>
          )}

          <div>
            <Label>Association *</Label>
            <Select
              value={formData.associationId}
              onValueChange={(value) => {
                setFormData({ ...formData, associationId: value, unitId: '', vehicleId: '' });
                setErrorDetails(null);
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select association..." />
              </SelectTrigger>
              <SelectContent>
                {associations.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Unit *</Label>
            <Select
              value={formData.unitId}
              onValueChange={(value) => {
                setFormData({ ...formData, unitId: value, vehicleId: '' });
                setErrorDetails(null);
              }}
              required
              disabled={!formData.associationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit..." />
              </SelectTrigger>
              <SelectContent>
                {filteredUnits.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Vehicle *</Label>
            <Select
              value={formData.vehicleId}
              onValueChange={(value) => {
                setFormData({ ...formData, vehicleId: value });
                setErrorDetails(null);
              }}
              required
              disabled={!formData.unitId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {filteredVehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.license_plate} - {v.year} {getMakeName(v.make_id)} {getModelName(v.model_id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Permit Type *</Label>
            <Select
              value={formData.permitType}
              onValueChange={(value) => {
                setFormData({ ...formData, permitType: value });
                setErrorDetails(null);
              }}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RESIDENT">Resident</SelectItem>
                <SelectItem value="VISITOR">Visitor</SelectItem>
                <SelectItem value="TEMPORARY">Temporary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Expiration Date (optional)</Label>
            <Input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            />
            <p className="text-xs text-[#5c5f7a] mt-1">Leave blank for no expiration</p>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={issueMutation.isPending || !formData.associationId || !formData.unitId || !formData.vehicleId}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
            >
              {issueMutation.isPending ? 'Issuing...' : 'Issue Permit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}