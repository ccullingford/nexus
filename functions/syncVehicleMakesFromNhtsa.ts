import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting NHTSA vehicle makes sync...');

    // Fetch all makes from NHTSA vPIC API
    const nhtsaResponse = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json');
    
    if (!nhtsaResponse.ok) {
      throw new Error(`NHTSA API error: ${nhtsaResponse.status} ${nhtsaResponse.statusText}`);
    }

    const nhtsaData = await nhtsaResponse.json();
    
    if (!nhtsaData.Results || !Array.isArray(nhtsaData.Results)) {
      throw new Error('Invalid response format from NHTSA API');
    }

    const nhtsMakes = nhtsaData.Results;
    console.log(`Fetched ${nhtsMakes.length} makes from NHTSA`);

    // Fetch existing makes from our database
    const existingMakes = await base44.asServiceRole.entities.VehicleMake.list('name', 5000);
    console.log(`Found ${existingMakes.length} existing makes in database`);

    // Create a map of normalized_name -> existing make
    const existingMakesMap = new Map();
    existingMakes.forEach(make => {
      if (make.normalized_name) {
        existingMakesMap.set(make.normalized_name, make);
      }
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Prepare batches for bulk operations
    const toCreate = [];
    const toUpdate = [];

    // Process each NHTSA make
    for (const nhtsMake of nhtsMakes) {
      const makeName = (nhtsMake.Make_Name || '').trim();
      const makeId = nhtsMake.Make_ID;
      
      if (!makeName) {
        skipped++;
        continue;
      }

      const normalizedName = makeName.toLowerCase();
      const existingMake = existingMakesMap.get(normalizedName);

      if (existingMake) {
        // Check if update needed
        let needsUpdate = false;
        const updates = { id: existingMake.id };

        if (existingMake.name !== makeName) {
          updates.name = makeName;
          needsUpdate = true;
        }

        if (existingMake.nhtsa_make_id !== makeId) {
          updates.nhtsa_make_id = makeId;
          needsUpdate = true;
        }

        if (existingMake.is_active !== true) {
          updates.is_active = true;
          needsUpdate = true;
        }

        if (needsUpdate) {
          toUpdate.push(updates);
        } else {
          skipped++;
        }
      } else {
        // Prepare for bulk create
        toCreate.push({
          name: makeName,
          normalized_name: normalizedName,
          nhtsa_make_id: makeId,
          is_active: true
        });
      }
    }

    // Bulk create in batches of 50
    if (toCreate.length > 0) {
      console.log(`Creating ${toCreate.length} new makes in batches...`);
      for (let i = 0; i < toCreate.length; i += 50) {
        const batch = toCreate.slice(i, i + 50);
        await base44.asServiceRole.entities.VehicleMake.bulkCreate(batch);
        created += batch.length;
        // Small delay between batches
        if (i + 50 < toCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Update in batches of 20 (updates are more expensive)
    if (toUpdate.length > 0) {
      console.log(`Updating ${toUpdate.length} existing makes...`);
      for (let i = 0; i < toUpdate.length; i += 20) {
        const batch = toUpdate.slice(i, i + 20);
        for (const update of batch) {
          const { id, ...data } = update;
          await base44.asServiceRole.entities.VehicleMake.update(id, data);
          updated++;
        }
        // Small delay between batches
        if (i + 20 < toUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    const result = {
      success: true,
      total_makes: nhtsMakes.length,
      created,
      updated,
      skipped,
      timestamp: new Date().toISOString()
    };

    console.log('Sync completed:', result);

    // Save sync status
    await base44.asServiceRole.entities.ParkingSyncStatus.create({
      sync_type: 'makes',
      last_synced_at: new Date().toISOString(),
      total_records: nhtsMakes.length,
      created_count: created,
      updated_count: updated,
      status: 'success'
    });

    return Response.json(result);
  } catch (error) {
    console.error('Error syncing vehicle makes:', error);
    
    // Save error status
    try {
      await base44.asServiceRole.entities.ParkingSyncStatus.create({
        sync_type: 'makes',
        last_synced_at: new Date().toISOString(),
        total_records: 0,
        created_count: 0,
        updated_count: 0,
        status: 'error',
        error_message: error.message
      });
    } catch (statusError) {
      console.error('Failed to save error status:', statusError);
    }
    
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});