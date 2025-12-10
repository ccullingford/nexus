import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Building2, Plus, Edit, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function PropertyManagement() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    street_address: '',
    city: '',
    state: '',
    zip: '',
    status: 'active'
  });

  const { data: associations = [], isLoading } = useQuery({
    queryKey: ['associations'],
    queryFn: () => base44.entities.Association.list('name', 500)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Association.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations'] });
      handleCloseModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Association.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations'] });
      handleCloseModal();
    }
  });

  const handleOpenModal = (association = null) => {
    if (association) {
      setEditingAssociation(association);
      setFormData({
        name: association.name || '',
        code: association.code || '',
        street_address: association.street_address || '',
        city: association.city || '',
        state: association.state || '',
        zip: association.zip || '',
        status: association.status || 'active'
      });
    } else {
      setEditingAssociation(null);
      setFormData({
        name: '',
        code: '',
        street_address: '',
        city: '',
        state: '',
        zip: '',
        status: 'active'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssociation(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAssociation) {
      updateMutation.mutate({ id: editingAssociation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#414257]">Property Management</h1>
          <p className="text-[#5c5f7a] mt-1">Manage associations, units, owners, and tenants</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-[#414257] hover:bg-[#5c5f7a]"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Association
        </Button>
      </div>

      {/* Associations List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#414257]">Associations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-[#5c5f7a]">Loading associations...</div>
          ) : associations.length === 0 ? (
            <div className="text-center py-8 text-[#5c5f7a]">
              No associations yet. Create your first one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {associations.map((association) => (
                    <TableRow
                      key={association.id}
                      className="cursor-pointer hover:bg-[#f8f8fb]"
                      onClick={() => window.location.href = createPageUrl('PropertyManagementAssociation') + `?id=${association.id}`}
                    >
                      <TableCell className="font-medium">{association.name}</TableCell>
                      <TableCell>
                        {association.code ? (
                          <Badge variant="outline">{association.code}</Badge>
                        ) : (
                          <span className="text-[#5c5f7a]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {association.city && association.state ? (
                          <div className="flex items-center gap-1 text-[#5c5f7a]">
                            <MapPin className="w-3 h-3" />
                            {association.city}, {association.state}
                          </div>
                        ) : (
                          <span className="text-[#5c5f7a]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[association.status]} border capitalize`}>
                          {association.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(association);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#414257]">
              {editingAssociation ? 'Edit Association' : 'New Association'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Association name"
                  required
                />
              </div>

              <div>
                <Label>Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="ARLYN"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Street Address</Label>
                <Input
                  value={formData.street_address}
                  onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div>
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="TX"
                />
              </div>

              <div>
                <Label>ZIP</Label>
                <Input
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  placeholder="75001"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#414257] hover:bg-[#5c5f7a]"
              >
                {editingAssociation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}