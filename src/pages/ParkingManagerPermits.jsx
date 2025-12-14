import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/usePermissions';
import { PERMISSIONS } from '@/components/permissions';
import { FileCheck, Plus, Search, XCircle, Calendar, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import IssuePermitModalV2 from '@/components/parking-manager/IssuePermitModalV2';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function ParkingManagerPermits() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [associationFilter, setAssociationFilter] = useState('all');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState(null);
  
  // Revoke/Edit/Replace dialogs
  const [revokeDialog, setRevokeDialog] = useState({ open: false, permit: null, reason: '' });
  const [expirationDialog, setExpirationDialog] = useState({ open: false, permit: null, newExpiration: '' });
  const [replaceDialog, setReplaceDialog] = useState({ open: false, permit: null, newVehicleId: '' });

  // Fetch data
  const { data: permits = [] } = useQuery({
    queryKey: ['permits'],
    queryFn: () => base44.entities.Permit.list('-issued_at', 500)
  });

  const { data: associations = [] } = useQuery({
    queryKey: ['associations'],
    queryFn: () => base44.entities.Association.list('name', 100)
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

  // Helper functions
  const isPermitActive = (permit) => {
    if (permit.status !== 'ACTIVE') return false;
    if (!permit.expires_at) return true;
    return new Date(permit.expires_at) > new Date();
  };

  const getDisplayStatus = (permit) => {
    if (permit.status === 'REVOKED') return 'REVOKED';
    if (permit.status === 'EXPIRED') return 'EXPIRED';
    if (permit.status === 'ACTIVE') {
      if (permit.expires_at && new Date(permit.expires_at) <= new Date()) {
        return 'EXPIRED';
      }
      return 'ACTIVE';
    }
    return permit.status;
  };

  const getStatusColor = (permit) => {
    const status = getDisplayStatus(permit);
    if (status === 'ACTIVE') return 'bg-green-100 text-green-800';
    if (status === 'EXPIRED') return 'bg-yellow-100 text-yellow-800';
    if (status === 'REVOKED') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getAssociationName = (id) => associations.find(a => a.id === id)?.name || '—';
  const getUnitNumber = (id) => units.find(u => u.id === id)?.unit_number || '—';
  const getVehicle = (id) => vehicles.find(v => v.id === id);
  const getMakeName = (id) => makes.find(m => m.id === id)?.name || '';
  const getModelName = (id) => models.find(m => m.id === id)?.name || '';

  // Mutations
  const revokeMutation = useMutation({
    mutationFn: async ({ permitId, reason }) => {
      const response = await base44.functions.invoke('permit_revoke', { permitId, reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      toast.success('Permit revoked successfully');
      setRevokeDialog({ open: false, permit: null, reason: '' });
      setSelectedPermit(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to revoke permit');
    }
  });

  const updateExpirationMutation = useMutation({
    mutationFn: async ({ permitId, expiresAt }) => {
      const response = await base44.functions.invoke('permit_update_expiration', { permitId, expiresAt });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      toast.success('Expiration updated successfully');
      setExpirationDialog({ open: false, permit: null, newExpiration: '' });
      setSelectedPermit(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update expiration');
    }
  });

  const replaceMutation = useMutation({
    mutationFn: async ({ permitId, newVehicleId }) => {
      const response = await base44.functions.invoke('permit_replace', { 
        permitId, 
        newVehicleId,
        notes: 'Replaced via Permits page'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      toast.success('Permit replaced successfully');
      setReplaceDialog({ open: false, permit: null, newVehicleId: '' });
      setSelectedPermit(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to replace permit');
    }
  });

  // Filter permits
  const filteredPermits = permits.filter(permit => {
    const vehicle = getVehicle(permit.vehicle_id);
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      permit.permit_number?.toLowerCase().includes(searchLower) ||
      vehicle?.license_plate?.toLowerCase().includes(searchLower) ||
      getUnitNumber(permit.unit_id).toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || getDisplayStatus(permit) === statusFilter;
    const matchesType = typeFilter === 'all' || permit.permit_type === typeFilter;
    const matchesAssociation = associationFilter === 'all' || permit.association_id === associationFilter;

    return matchesSearch && matchesStatus && matchesType && matchesAssociation;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-[#414257]" />
              <CardTitle>Parking Permits</CardTitle>
            </div>
            {hasPermission(PERMISSIONS.PARKING_MANAGER_PERMITS_ISSUE) && (
              <Button onClick={() => setShowIssueModal(true)} className="bg-[#414257] hover:bg-[#5c5f7a]">
                <Plus className="w-4 h-4 mr-2" />
                Issue Permit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5c5f7a] w-4 h-4" />
                <Input
                  placeholder="Search by permit #, plate, unit..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={associationFilter} onValueChange={setAssociationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Associations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Associations</SelectItem>
                {associations.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="RESIDENT">Resident</SelectItem>
                <SelectItem value="VISITOR">Visitor</SelectItem>
                <SelectItem value="TEMPORARY">Temporary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permit #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermits.map(permit => {
                  const vehicle = getVehicle(permit.vehicle_id);
                  return (
                    <TableRow 
                      key={permit.id} 
                      className="cursor-pointer hover:bg-[#f8f8fb]"
                      onClick={() => setSelectedPermit(permit)}
                    >
                      <TableCell className="font-medium">{permit.permit_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{permit.permit_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(permit)}>
                          {getDisplayStatus(permit)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vehicle ? (
                          <div className="text-sm">
                            <div>{vehicle.license_plate} {vehicle.state && `(${vehicle.state})`}</div>
                            <div className="text-[#5c5f7a] text-xs">
                              {vehicle.year} {getMakeName(vehicle.make_id)} {getModelName(vehicle.model_id)}
                            </div>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{getUnitNumber(permit.unit_id)}</TableCell>
                      <TableCell className="text-sm text-[#5c5f7a]">
                        {format(new Date(permit.issued_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-[#5c5f7a]">
                        {permit.expires_at ? format(new Date(permit.expires_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredPermits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#5c5f7a]">
                      No permits found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permit Detail Drawer */}
      <Sheet open={!!selectedPermit} onOpenChange={(open) => !open && setSelectedPermit(null)}>
        <SheetContent className="w-[500px] overflow-y-auto">
          {selectedPermit && (
            <>
              <SheetHeader>
                <SheetTitle>Permit Details</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div>
                  <h3 className="text-2xl font-bold text-[#414257]">{selectedPermit.permit_number}</h3>
                  <Badge className={`${getStatusColor(selectedPermit)} mt-2`}>
                    {getDisplayStatus(selectedPermit)}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[#5c5f7a]">Type</p>
                    <p className="font-medium">{selectedPermit.permit_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5c5f7a]">Association</p>
                    <p className="font-medium">{getAssociationName(selectedPermit.association_id)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5c5f7a]">Unit</p>
                    <p className="font-medium">{getUnitNumber(selectedPermit.unit_id)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5c5f7a]">Vehicle</p>
                    <p className="font-medium">
                      {(() => {
                        const vehicle = getVehicle(selectedPermit.vehicle_id);
                        return vehicle ? `${vehicle.license_plate} (${vehicle.state}) - ${vehicle.year} ${getMakeName(vehicle.make_id)} ${getModelName(vehicle.model_id)}` : '—';
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5c5f7a]">Issued</p>
                    <p className="font-medium">{format(new Date(selectedPermit.issued_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5c5f7a]">Expires</p>
                    <p className="font-medium">{selectedPermit.expires_at ? format(new Date(selectedPermit.expires_at), 'MMM d, yyyy') : 'No expiration'}</p>
                  </div>
                  {selectedPermit.status === 'REVOKED' && (
                    <>
                      <div>
                        <p className="text-xs text-[#5c5f7a]">Revoked At</p>
                        <p className="font-medium">{format(new Date(selectedPermit.revoked_at), 'MMM d, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#5c5f7a]">Revocation Reason</p>
                        <p className="font-medium">{selectedPermit.revoked_reason || '—'}</p>
                      </div>
                    </>
                  )}
                  {selectedPermit.notes && (
                    <div>
                      <p className="text-xs text-[#5c5f7a]">Notes</p>
                      <p className="font-medium">{selectedPermit.notes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isPermitActive(selectedPermit) && (
                  <div className="space-y-2 pt-4 border-t">
                    {hasPermission(PERMISSIONS.PARKING_MANAGER_PERMITS_EDIT) && (
                      <>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setExpirationDialog({
                              open: true,
                              permit: selectedPermit,
                              newExpiration: selectedPermit.expires_at ? format(new Date(selectedPermit.expires_at), 'yyyy-MM-dd') : ''
                            });
                          }}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Edit Expiration
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setRevokeDialog({ open: true, permit: selectedPermit, reason: '' });
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Revoke Permit
                        </Button>
                      </>
                    )}
                    {hasPermission(PERMISSIONS.PARKING_MANAGER_PERMITS_ISSUE) && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          setReplaceDialog({ open: true, permit: selectedPermit, newVehicleId: '' });
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Replace Permit
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Issue Permit Modal */}
      <IssuePermitModalV2
        open={showIssueModal}
        onClose={() => setShowIssueModal(false)}
      />

      {/* Revoke Dialog */}
      <Dialog open={revokeDialog.open} onOpenChange={(open) => !open && setRevokeDialog({ open: false, permit: null, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Permit</DialogTitle>
            <DialogDescription>
              Revoke permit {revokeDialog.permit?.permit_number}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason *</Label>
            <Textarea
              value={revokeDialog.reason}
              onChange={(e) => setRevokeDialog({ ...revokeDialog, reason: e.target.value })}
              placeholder="Reason for revocation..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialog({ open: false, permit: null, reason: '' })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!revokeDialog.reason.trim()) {
                  toast.error('Reason is required');
                  return;
                }
                revokeMutation.mutate({
                  permitId: revokeDialog.permit.id,
                  reason: revokeDialog.reason
                });
              }}
              disabled={revokeMutation.isPending || !revokeDialog.reason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expiration Dialog */}
      <Dialog open={expirationDialog.open} onOpenChange={(open) => !open && setExpirationDialog({ open: false, permit: null, newExpiration: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expiration</DialogTitle>
            <DialogDescription>
              Update expiration for permit {expirationDialog.permit?.permit_number}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Expiration Date</Label>
            <Input
              type="date"
              value={expirationDialog.newExpiration}
              onChange={(e) => setExpirationDialog({ ...expirationDialog, newExpiration: e.target.value })}
            />
            <p className="text-xs text-[#5c5f7a] mt-1">Leave blank for no expiration</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpirationDialog({ open: false, permit: null, newExpiration: '' })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateExpirationMutation.mutate({
                  permitId: expirationDialog.permit.id,
                  expiresAt: expirationDialog.newExpiration || null
                });
              }}
              disabled={updateExpirationMutation.isPending}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
            >
              {updateExpirationMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Permit Dialog */}
      <Dialog open={replaceDialog.open} onOpenChange={(open) => !open && setReplaceDialog({ open: false, permit: null, newVehicleId: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Permit</DialogTitle>
            <DialogDescription>
              Replace {replaceDialog.permit?.permit_number} with a new permit for a different vehicle
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>New Vehicle *</Label>
            <Select value={replaceDialog.newVehicleId} onValueChange={(value) => setReplaceDialog({ ...replaceDialog, newVehicleId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles
                  .filter(v => v.unit_id === replaceDialog.permit?.unit_id && v.status === 'active')
                  .map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.license_plate} - {v.year} {getMakeName(v.make_id)} {getModelName(v.model_id)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceDialog({ open: false, permit: null, newVehicleId: '' })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!replaceDialog.newVehicleId) {
                  toast.error('Select a vehicle');
                  return;
                }
                replaceMutation.mutate({
                  permitId: replaceDialog.permit.id,
                  newVehicleId: replaceDialog.newVehicleId
                });
              }}
              disabled={replaceMutation.isPending || !replaceDialog.newVehicleId}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
            >
              {replaceMutation.isPending ? 'Replacing...' : 'Replace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}