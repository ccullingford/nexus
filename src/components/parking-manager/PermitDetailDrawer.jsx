import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePermissions } from '@/components/usePermissions';
import { PERMISSIONS } from '@/components/permissions';
import { format } from 'date-fns';
import { FileCheck, Car, Home, Calendar, X, Clock, AlertCircle, Edit, RefreshCw } from 'lucide-react';

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  void: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending: 'bg-blue-100 text-blue-800 border-blue-200'
};

const typeColors = {
  resident: 'bg-blue-50 text-blue-700 border-blue-200',
  visitor: 'bg-purple-50 text-purple-700 border-purple-200',
  additional: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  temp: 'bg-orange-50 text-orange-700 border-orange-200'
};

export default function PermitDetailDrawer({ permit, onClose, getAssociationName, getUnitNumber, getVehicleDetails }) {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showExpireDialog, setShowExpireDialog] = useState(false);
  const [showEditExpirationDialog, setShowEditExpirationDialog] = useState(false);
  const [newExpiration, setNewExpiration] = useState('');
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [replaceReason, setReplaceReason] = useState('');

  const voidMutation = useMutation({
    mutationFn: async ({ permitId, voidReason }) => {
      const response = await base44.functions.invoke('revokePermit', {
        permitId,
        reason: voidReason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      setShowVoidDialog(false);
      setVoidReason('');
      onClose();
    }
  });

  const expireMutation = useMutation({
    mutationFn: async (permitId) => {
      const response = await base44.functions.invoke('updatePermitStatus', {
        permitId,
        status: 'expired'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      setShowExpireDialog(false);
      onClose();
    }
  });

  const updateExpirationMutation = useMutation({
    mutationFn: async ({ permitId, expiresAt }) => {
      const response = await base44.functions.invoke('updatePermitExpiration', {
        permitId,
        newExpirationDate: expiresAt || null
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      setShowEditExpirationDialog(false);
      setNewExpiration('');
      onClose();
    }
  });

  const replaceMutation = useMutation({
    mutationFn: async ({ oldPermitId, newPermitData, voidReason }) => {
      // First revoke the old permit
      await base44.functions.invoke('revokePermit', {
        permitId: oldPermitId,
        reason: voidReason
      });
      
      // Then issue the new permit
      const response = await base44.functions.invoke('issuePermitForUnit', {
        unitId: newPermitData.unit_id,
        permitData: {
          type: newPermitData.type,
          vehicle_id: newPermitData.vehicle_id,
          issued_at: new Date().toISOString().split('T')[0],
          notes: `Replacement for permit ${newPermitData.old_permit_number}`
        },
        overrideLimits: false
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      setShowReplaceDialog(false);
      setReplaceReason('');
      onClose();
    }
  });

  const handleVoid = () => {
    if (!voidReason.trim()) return;
    voidMutation.mutate({ permitId: permit.id, voidReason: voidReason.trim() });
  };

  const handleExpire = () => {
    expireMutation.mutate(permit.id);
  };

  const handleUpdateExpiration = () => {
    if (!newExpiration) return;
    updateExpirationMutation.mutate({ permitId: permit.id, expiresAt: newExpiration });
  };

  const handleReplace = () => {
    if (!replaceReason.trim()) return;
    replaceMutation.mutate({
      oldPermitId: permit.id,
      newPermitData: {
        unit_id: permit.unit_id,
        type: permit.type,
        vehicle_id: permit.vehicle_id,
        old_permit_number: permit.permit_number
      },
      voidReason: `Replaced: ${replaceReason.trim()}`
    });
  };

  if (!permit) return null;

  const vehicleDetails = getVehicleDetails(permit.vehicle_id);

  return (
    <Sheet open={!!permit} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Permit Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header Info */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h2 className="text-2xl font-bold text-[#414257]">
                {permit.permit_number || 'No Number'}
              </h2>
              <Badge
                variant="outline"
                className={`capitalize ${typeColors[permit.type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
              >
                {permit.type}
              </Badge>
              <Badge
                className={`capitalize ${statusColors[permit.status] || 'bg-gray-100 text-gray-800 border-gray-200'} border`}
              >
                {permit.status}
              </Badge>
            </div>
            <p className="text-sm text-[#5c5f7a]">
              {getAssociationName(permit.association_id)}
            </p>
          </div>

          {/* Key Details */}
          <div className="space-y-4">
            {/* Unit */}
            <div className="flex items-start gap-3 p-4 bg-[#f8f8fb] rounded-lg">
              <Home className="w-5 h-5 text-[#414257] mt-0.5" />
              <div>
                <p className="text-sm text-[#5c5f7a]">Unit</p>
                <p className="font-semibold text-[#414257]">
                  {getUnitNumber(permit.unit_id)}
                </p>
              </div>
            </div>

            {/* Vehicle */}
            {vehicleDetails && (
              <div className="flex items-start gap-3 p-4 bg-[#f8f8fb] rounded-lg">
                <Car className="w-5 h-5 text-[#414257] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[#5c5f7a] mb-1">Vehicle</p>
                  <p className="font-semibold text-[#414257]">
                    {vehicleDetails.year} {vehicleDetails.makeName} {vehicleDetails.modelName}
                  </p>
                  <p className="text-sm text-[#5c5f7a] mt-1">
                    {vehicleDetails.license_plate}
                    {vehicleDetails.state && ` (${vehicleDetails.state})`}
                  </p>
                  {vehicleDetails.color_id && (
                    <p className="text-sm text-[#5c5f7a]">
                      Color: {vehicleDetails.color_id}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#f8f8fb] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-[#5c5f7a]" />
                  <p className="text-sm text-[#5c5f7a]">Issued</p>
                </div>
                <p className="font-semibold text-[#414257]">
                  {permit.issued_at ? format(new Date(permit.issued_at), 'MMM d, yyyy') : '—'}
                </p>
              </div>

              <div className="p-4 bg-[#f8f8fb] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#5c5f7a]" />
                  <p className="text-sm text-[#5c5f7a]">Expires</p>
                </div>
                <p className="font-semibold text-[#414257]">
                  {permit.expires_at ? format(new Date(permit.expires_at), 'MMM d, yyyy') : 'No expiration'}
                </p>
              </div>
            </div>

            {/* Void Information */}
            {permit.status === 'void' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900 mb-1">Permit Voided</p>
                    {permit.voided_at && (
                      <p className="text-sm text-red-800 mb-2">
                        {format(new Date(permit.voided_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                    {permit.void_reason && (
                      <p className="text-sm text-red-800">
                        Reason: {permit.void_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {permit.notes && (
              <div className="p-4 bg-[#f8f8fb] rounded-lg">
                <p className="text-sm text-[#5c5f7a] mb-2">Notes</p>
                <p className="text-sm text-[#414257] whitespace-pre-wrap">
                  {permit.notes}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-[#e3e4ed] space-y-2 text-xs text-[#5c5f7a]">
              <p>Created: {format(new Date(permit.created_date), 'MMM d, yyyy h:mm a')}</p>
              {permit.updated_date && permit.updated_date !== permit.created_date && (
                <p>Updated: {format(new Date(permit.updated_date), 'MMM d, yyyy h:mm a')}</p>
              )}
              {permit.created_by && <p>Created by: {permit.created_by}</p>}
            </div>
          </div>

          {/* Actions */}
          {hasPermission(PERMISSIONS.PARKING_MANAGER_PERMITS_EDIT) && permit.status === 'active' && (
            <div className="pt-4 border-t border-[#e3e4ed] space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setNewExpiration(permit.expires_at || '');
                  setShowEditExpirationDialog(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Expiration Date
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowReplaceDialog(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Replace Permit
              </Button>
              <Button
                variant="outline"
                className="w-full text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                onClick={() => setShowExpireDialog(true)}
              >
                <Clock className="w-4 h-4 mr-2" />
                Mark as Expired
              </Button>
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowVoidDialog(true)}
              >
                <X className="w-4 h-4 mr-2" />
                Void Permit
              </Button>
            </div>
          )}
        </div>

        {/* Void Confirmation Dialog */}
        <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void Permit</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>Are you sure you want to void permit {permit.permit_number || 'this permit'}?</p>
                  <div>
                    <Label htmlFor="void-reason">Reason for voiding *</Label>
                    <Textarea
                      id="void-reason"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="Enter reason for voiding this permit..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setVoidReason('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleVoid}
                disabled={!voidReason.trim() || voidMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {voidMutation.isPending ? 'Voiding...' : 'Void Permit'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Expire Confirmation Dialog */}
        <AlertDialog open={showExpireDialog} onOpenChange={setShowExpireDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark Permit as Expired</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark permit {permit.permit_number || 'this permit'} as expired? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExpire}
                disabled={expireMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {expireMutation.isPending ? 'Marking...' : 'Mark as Expired'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Expiration Dialog */}
        <Dialog open={showEditExpirationDialog} onOpenChange={setShowEditExpirationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Expiration Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="new-expiration">New Expiration Date</Label>
                <Input
                  id="new-expiration"
                  type="date"
                  value={newExpiration}
                  onChange={(e) => setNewExpiration(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-[#5c5f7a] mt-2">
                  Leave blank for no expiration date
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowEditExpirationDialog(false);
                setNewExpiration('');
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateExpiration}
                disabled={updateExpirationMutation.isPending}
                className="bg-[#414257] hover:bg-[#5c5f7a]"
              >
                {updateExpirationMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Replace Permit Dialog */}
        <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace Permit</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>This will void the current permit and issue a new one with the same details.</p>
                  <div>
                    <Label htmlFor="replace-reason">Reason for replacement *</Label>
                    <Textarea
                      id="replace-reason"
                      value={replaceReason}
                      onChange={(e) => setReplaceReason(e.target.value)}
                      placeholder="e.g., Lost permit, damaged permit..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setReplaceReason('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReplace}
                disabled={!replaceReason.trim() || replaceMutation.isPending}
                className="bg-[#414257] hover:bg-[#5c5f7a]"
              >
                {replaceMutation.isPending ? 'Replacing...' : 'Replace Permit'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}