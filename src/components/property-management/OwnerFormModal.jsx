import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OwnerFormModal({ open, onClose, associationId, units, preselectedUnitId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    unit_id: preselectedUnitId || '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mailing_address: '',
    mailing_city: '',
    mailing_state: '',
    mailing_zip: '',
    is_primary_owner: true,
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Owner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      handleClose();
    }
  });

  const handleClose = () => {
    setFormData({
      unit_id: preselectedUnitId || '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mailing_address: '',
      mailing_city: '',
      mailing_state: '',
      mailing_zip: '',
      is_primary_owner: true,
      notes: ''
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      association_id: associationId,
      unit_id: formData.unit_id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      mailing_address: formData.mailing_address || undefined,
      mailing_city: formData.mailing_city || undefined,
      mailing_state: formData.mailing_state || undefined,
      mailing_zip: formData.mailing_zip || undefined,
      is_primary_owner: formData.is_primary_owner,
      notes: formData.notes || undefined
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#414257]">Add Owner</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Unit *</Label>
            <Select
              value={formData.unit_id}
              onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
              disabled={!!preselectedUnitId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Mailing Address</Label>
            <Input
              value={formData.mailing_address}
              onChange={(e) => setFormData({ ...formData, mailing_address: e.target.value })}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input
                value={formData.mailing_city}
                onChange={(e) => setFormData({ ...formData, mailing_city: e.target.value })}
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={formData.mailing_state}
                onChange={(e) => setFormData({ ...formData, mailing_state: e.target.value })}
                placeholder="TX"
              />
            </div>
            <div>
              <Label>ZIP</Label>
              <Input
                value={formData.mailing_zip}
                onChange={(e) => setFormData({ ...formData, mailing_zip: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_primary_owner}
              onChange={(e) => setFormData({ ...formData, is_primary_owner: e.target.checked })}
              className="w-4 h-4"
            />
            <Label className="cursor-pointer">Primary owner</Label>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}