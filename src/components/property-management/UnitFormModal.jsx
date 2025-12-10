import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UnitFormModal({ open, onClose, associationId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    unit_number: '',
    bedrooms: '',
    street_address: '',
    status: 'occupied'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Unit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      handleClose();
    }
  });

  const handleClose = () => {
    setFormData({
      unit_number: '',
      bedrooms: '',
      street_address: '',
      status: 'occupied'
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      association_id: associationId,
      unit_number: formData.unit_number,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
      street_address: formData.street_address || undefined,
      status: formData.status
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[#414257]">Add Unit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Unit Number *</Label>
            <Input
              value={formData.unit_number}
              onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              placeholder="101-A"
              required
            />
          </div>

          <div>
            <Label>Bedrooms</Label>
            <Input
              type="number"
              min="0"
              value={formData.bedrooms}
              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              placeholder="2"
            />
          </div>

          <div>
            <Label>Street Address Override</Label>
            <Input
              value={formData.street_address}
              onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
              placeholder="For scattered sites"
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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