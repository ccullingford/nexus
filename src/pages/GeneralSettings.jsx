import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Settings, FileSpreadsheet, Shield, ArrowRight, AlertCircle, Car, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function GeneralSettings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncingMakes, setSyncingMakes] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadSyncStatus = async () => {
      try {
        const response = await base44.functions.invoke('getParkingSyncStatus');
        if (response.data.success) {
          setSyncStatus(response.data);
        }
      } catch (error) {
        console.error('Error loading sync status:', error);
      }
    };
    loadSyncStatus();
  }, []);

  const handleSyncVehicleData = async () => {
    setSyncingMakes(true);
    try {
      const response = await base44.functions.invoke('syncVehicleDataFromNhtsaBulk');
      if (response.data.success) {
        const makes = response.data.makes || {};
        const models = response.data.models || {};
        alert(`Sync completed!\n\nMakes: ${makes.created || 0} created, ${makes.updated || 0} updated (${makes.total_popular || 0} popular)\nModels: ${models.created || 0} created, ${models.updated || 0} updated\n\nDuration: ${response.data.duration_seconds}s`);
        // Reload sync status
        const statusResponse = await base44.functions.invoke('getParkingSyncStatus');
        if (statusResponse.data.success) {
          setSyncStatus(statusResponse.data);
        }
      } else {
        alert('Sync failed: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error syncing vehicle data:', error);
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncingMakes(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <p className="text-[#5c5f7a]">Loading...</p>
      </div>
    );
  }

  // Check if user has admin access
  const hasAccess = user && (user.role === 'admin' || user.role === 'Super Admin' || user.role === 'Org Admin');

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#414257] mb-2">Access Denied</h2>
            <p className="text-[#5c5f7a] mb-6">
              You do not have permission to access this page. General Settings are only available to administrators.
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button className="bg-[#414257] hover:bg-[#5c5f7a]">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#414257]">General Settings</h1>
        <p className="text-[#5c5f7a] mt-1">
          Settings and tools that are used occasionally, including imports and admin utilities
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Property Imports */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-[#414257]">Property Imports</CardTitle>
                  <CardDescription className="mt-1">
                    Import AppFolio homeowner directory CSVs and sync associations, units, and owners
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl('PropertyManagementImports')}>
              <Button className="w-full bg-[#414257] hover:bg-[#5c5f7a]">
                Open Property Imports
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Invoice Manager Admin */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-[#414257]">Invoice Manager Admin</CardTitle>
                  <CardDescription className="mt-1">
                    Test Microsoft Graph email integration and manage invoice-related tools
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl('InvoiceManagerAdmin')}>
              <Button className="w-full bg-[#414257] hover:bg-[#5c5f7a]">
                Open Invoice Manager Admin
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Parking Manager Admin */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Car className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-[#414257]">Parking Manager</CardTitle>
                  <CardDescription className="mt-1">
                    Sync popular vehicle makes and models from NHTSA (last 20 years)
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncStatus && (
              <div className="space-y-3">
                {/* Makes Status */}
                <div className="p-3 bg-[#f8f8fb] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#414257]">Vehicle Makes</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {syncStatus.makes.count} total
                    </Badge>
                  </div>
                  {syncStatus.makes.lastSync ? (
                    <div className="text-xs text-[#5c5f7a]">
                      Last synced: {format(new Date(syncStatus.makes.lastSync), 'MMM d, yyyy h:mm a')}
                    </div>
                  ) : (
                    <div className="text-xs text-[#5c5f7a]">Never synced</div>
                  )}
                  {syncStatus.makes.status === 'error' && (
                    <div className="text-xs text-red-600 mt-1">Error: {syncStatus.makes.error}</div>
                  )}
                </div>

                {/* Models Status */}
                <div className="p-3 bg-[#f8f8fb] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#414257]">Vehicle Models</span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {syncStatus.models.count} total
                    </Badge>
                  </div>
                  {syncStatus.models.lastSync ? (
                    <div className="text-xs text-[#5c5f7a]">
                      Last synced: {format(new Date(syncStatus.models.lastSync), 'MMM d, yyyy h:mm a')}
                    </div>
                  ) : (
                    <div className="text-xs text-[#5c5f7a]">Never synced</div>
                  )}
                  {syncStatus.models.status === 'error' && (
                    <div className="text-xs text-red-600 mt-1">Error: {syncStatus.models.error}</div>
                  )}
                </div>
              </div>
            )}

            <Button 
              onClick={handleSyncVehicleData}
              disabled={syncingMakes}
              className="w-full bg-[#414257] hover:bg-[#5c5f7a]"
            >
              {syncingMakes ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing Vehicle Data...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Vehicle Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Future Expansion Placeholders */}
      <Card className="border-0 shadow-sm bg-gray-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-[#414257] mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Future Tools & Settings
          </h3>
          <ul className="space-y-2 text-sm text-[#5c5f7a]">
            <li>• TODO: Add link/card for global email templates</li>
            <li>• TODO: Add link/card for AppFolio integration settings or automation schedule</li>
            <li>• TODO: Add link/card for system-level tools (debug logs, import history, etc.)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}