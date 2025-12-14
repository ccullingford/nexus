import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function PermitFormModal({ open, onClose, associationId, unitId, vehicleId }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    permit_number: '',
    permit_type: 'resident',
    issue_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
    notes: ''
  });

  // Fetch permit availability for this unit
  const { data: availability, isLoading: loadingAvailability } = useQuery({
    queryKey: ['permitAvailability', unitId],
    queryFn: async () => {
      const response = await base44.functions.invoke('calculatePermitAvailability', { unitId });
      return response.data;
    },
    enabled: open && !!unitId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Permit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      queryClient.invalidateQueries({ queryKey: ['permitAvailability'] });
      onClose();
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      permit_number: '',
      permit_type: 'resident',
      issue_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
      notes: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      association_id: associationId,
      unit_id: unitId,
      vehicle_id: vehicleId || null,
      permit_number: formData.permit_number || null,
      permit_type: formData.permit_type,
      issue_date: formData.issue_date,
      expiration_date: formData.expiration_date || null,
      status: 'active',
      notes: formData.notes || null
    };

    createMutation.mutate(data);
  };

  const canIssue = () => {
    if (!availability || !availability.success) return false;
    
    if (formData.permit_type === 'resident') {
      return availability.availability.can_issue_resident;
    } else if (formData.permit_type === 'visitor') {
      return availability.availability.can_issue_visitor;
    }
    return true;
  };

  const getWarningMessage = () => {
    if (!availability || !availability.success) return null;
    
    if (formData.permit_type === 'resident' && !availability.availability.can_issue_resident) {
      const max = availability.caps.max_resident;
      return `Cannot issue resident permit. Maximum of ${max} resident permits reached for this unit.`;
    } else if (formData.permit_type === 'visitor' && !availability.availability.can_issue_visitor) {
      const max = availability.caps.max_visitor;
      return `Cannot issue visitor permit. Maximum of ${max} visitor permits reached for this unit.`;
    }
    return null;
  };

  const renderAvailability = () => {
    if (loadingAvailability) {
      return <p className="text-sm text-[#5c5f7a]">Loading permit limits...</p>;
    }

    if (!availability || !availability.success) {
      return null;
    }

    const { current, caps, availability: avail } = availability;
    const selectedType = formData.permit_type;

    return (
      <div className="space-y-3 p-4 bg-[#f8f8fb] rounded-lg border border-[#e3e4ed]">
        <h4 className="font-semibold text-[#414257] text-sm">Permit Availability</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#5c5f7a]">Resident Permits:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#414257]">
                {current.resident} / {caps.max_resident || '∞'}
              </span>
              {selectedType === 'resident' && (
                avail.can_issue_resident ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#5c5f7a]">Visitor Permits:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#414257]">
                {current.visitor} / {caps.max_visitor || '∞'}
              </span>
              {selectedType === 'visitor' && (
                avail.can_issue_visitor ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )
              )}
            </div>
          </div>

          {caps.baseline_resident > 0 && (
            <div className="pt-2 mt-2 border-t border-[#e3e4ed]">
              <p className="text-xs text-[#5c5f7a]">
                Baseline: {caps.baseline_resident} resident permit{caps.baseline_resident !== 1 ? 's' : ''} 
                {availability.association.permit_rule_type === 'per_bedroom' && ` (${availability.unit.bedrooms} bedroom${availability.unit.bedrooms !== 1 ? 's' : ''})`}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue New Permit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderAvailability()}

          {getWarningMessage() && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{getWarningMessage()}</p>
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
                <SelectItem value="temporary">Temporary</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Issue Date *</Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Expiration Date</Label>
              <Input
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canIssue() || createMutation.isPending}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
            >
              {createMutation.isPending ? 'Issuing...' : 'Issue Permit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}