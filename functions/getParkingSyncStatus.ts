import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get latest sync status records
    const syncStatuses = await base44.asServiceRole.entities.ParkingSyncStatus.list('-last_synced_at', 10);
    
    // Get counts
    const makesCount = await base44.asServiceRole.entities.VehicleMake.filter({ is_active: true });
    const modelsCount = await base44.asServiceRole.entities.VehicleModel.filter({ is_active: true });

    // Find latest sync for each type
    const makesSyncStatus = syncStatuses.find(s => s.sync_type === 'makes');
    const modelsSyncStatus = syncStatuses.find(s => s.sync_type === 'models');

    return Response.json({
      success: true,
      makes: {
        count: makesCount.length,
        lastSync: makesSyncStatus?.last_synced_at || null,
        status: makesSyncStatus?.status || null,
        created: makesSyncStatus?.created_count || 0,
        updated: makesSyncStatus?.updated_count || 0,
        error: makesSyncStatus?.error_message || null
      },
      models: {
        count: modelsCount.length,
        lastSync: modelsSyncStatus?.last_synced_at || null,
        status: modelsSyncStatus?.status || null,
        created: modelsSyncStatus?.created_count || 0,
        updated: modelsSyncStatus?.updated_count || 0,
        error: modelsSyncStatus?.error_message || null
      }
    });
  } catch (error) {
    console.error('Error getting parking sync status:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});