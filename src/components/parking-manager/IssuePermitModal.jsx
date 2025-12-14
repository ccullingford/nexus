import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/usePermissions';
import { PERMISSIONS } from '@/components/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function IssuePermitModal({ open, onClose, associationId, unitId, vehicleId = null }) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canOverride = hasPermission(PERMISSIONS.PARKING_MANAGER_PERMITS_OVERRIDE_LIMITS);

  const [formData, setFormData] = useState({
    permit_type: 'resident',
    permit_number: '',
    vehicle_id: vehicleId || '',
    issued_at: new Date().toISOString().split('T')[0],
    expires_at: '',
    notes: '',
    override_limits: false
  });

  const [errorDetails, setErrorDetails] = useState(null);

  // Fetch vehicles for this unit
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', unitId],
    queryFn: () => base44.entities.Vehicle.filter({ unit_id: unitId, status: 'active' }),
    enabled: open && !!unitId && !vehicleId
  });

  // Fetch vehicle makes and models for display
  const { data: makes = [] } = useQuery({
    queryKey: ['vehicleMakes'],
    queryFn: () => base44.entities.VehicleMake.list('name', 500),
    enabled: open && !vehicleId
  });

  const { data: models = [] } = useQuery({
    queryKey: ['vehicleModels'],
    queryFn: () => base44.entities.VehicleModel.list('name', 1000),
    enabled: open && !vehicleId
  });

  const issueMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('issuePermitForUnit', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['permits'] });
        onClose();
        resetForm();
        setErrorDetails(null);
      } else {
        // Backend returned error (likely limit exceeded)
        setErrorDetails(data);
      }
    },
    onError: (error) => {
      setErrorDetails({
        success: false,
        error: error.message || 'Failed to issue permit'
      });
    }
  });

  const resetForm = () => {
    setFormData({
      permit_type: 'resident',
      permit_number: '',
      vehicle_id: vehicleId || '',
      issued_at: new Date().toISOString().split('T')[0],
      expires_at: '',
      notes: '',
      override_limits: false
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

    const payload = {
      unitId,
      permitData: {
        type: formData.permit_type,
        permit_number: formData.permit_number || null,
        vehicle_id: formData.vehicle_id || null,
        issued_at: formData.issued_at,
        expires_at: formData.expires_at || null,
        notes: formData.notes || null
      },
      overrideLimits: formData.override_limits
    };

    issueMutation.mutate(payload);
  };

  const getMakeName = (makeId) => {
    const make = makes.find(m => m.id === makeId);
    return make?.name || '';
  };

  const getModelName = (modelId) => {
    const model = models.find(m => m.id === modelId);
    return model?.name || '';
  };

  const getVehicleLabel = (vehicle) => {
    return `${vehicle.year || ''} ${getMakeName(vehicle.make_id)} ${getModelName(vehicle.model_id)} (${vehicle.license_plate})`.trim();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue New Permit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Display with Caps Summary */}
          {errorDetails && !errorDetails.success && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{errorDetails.error}</p>
                  {errorDetails.message && (
                    <p className="text-sm text-red-700 mt-1">{errorDetails.message}</p>
                  )}
                </div>
              </div>

              {/* Caps Summary */}
              {errorDetails.caps && (
                <div className="p-4 bg-[#f8f8fb] rounded-lg border border-[#e3e4ed]">
                  <h4 className="font-semibold text-[#414257] text-sm mb-3">Current Permit Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5c5f7a]">Resident Permits:</span>
                      <span className="font-medium text-[#414257]">
                        {errorDetails.caps.activeResidentPermitsCount} / {errorDetails.caps.maxResidentPermits}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#5c5f7a]">Visitor Permits:</span>
                      <span className="font-medium text-[#414257]">
                        {errorDetails.caps.activeVisitorPermitsCount} / {errorDetails.caps.maxVisitorPermits}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {canOverride && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Checkbox
                    id="override"
                    checked={formData.override_limits}
                    onCheckedChange={(checked) => setFormData({ ...formData, override_limits: checked })}
                  />
                  <div>
                    <label htmlFor="override" className="text-sm font-medium text-yellow-900 cursor-pointer">
                      Override permit limits
                    </label>
                    <p className="text-xs text-yellow-800 mt-1">
                      You have permission to issue this permit even if limits are reached.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Permit Type *</Label>
            <Select
              value={formData.permit_type}
              onValueChange={(value) => setFormData({ ...formData, permit_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resident">Resident</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="additional">Additional</SelectItem>
                <SelectItem value="temp">Temporary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Permit Number</Label>
            <Input
              value={formData.permit_number}
              onChange={(e) => setFormData({ ...formData, permit_number: e.target.value })}
              placeholder="e.g. P-1234"
            />
          </div>

          {/* Vehicle Selector (if not pre-filled) */}
          {!vehicleId && (
            <div>
              <Label>Vehicle (Optional)</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No vehicle selected</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {getVehicleLabel(vehicle)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Issued Date *</Label>
              <Input
                type="date"
                value={formData.issued_at}
                onChange={(e) => setFormData({ ...formData, issued_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Expiration Date</Label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this permit..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={issueMutation.isPending}
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