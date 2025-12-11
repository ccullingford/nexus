import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting NHTSA vehicle body styles sync...');

    // Fetch body classes from NHTSA vPIC API
    const nhtsaUrl = 'https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleVariableValuesList/Body%20Class?format=json';
    const nhtsaResponse = await fetch(nhtsaUrl);
    
    if (!nhtsaResponse.ok) {
      throw new Error(`NHTSA API error: ${nhtsaResponse.status}`);
    }

    const nhtsaData = await nhtsaResponse.json();
    const nhtsaBodyStyles = nhtsaData.Results || [];
    
    console.log(`Fetched ${nhtsaBodyStyles.length} body styles from NHTSA`);

    // Fetch existing body styles from database
    const existingBodyStyles = await base44.asServiceRole.entities.VehicleBodyStyle.list('name', 1000);
    console.log(`Found ${existingBodyStyles.length} existing body styles in database`);

    // Create a map of normalized names to existing body styles
    const existingBodyStylesMap = new Map(
      existingBodyStyles.map(bs => [bs.normalized_name, bs])
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Prepare batches for bulk operations
    const toCreate = [];
    const toUpdate = [];

    // Process each NHTSA body style
    for (const nhtsaBodyStyle of nhtsaBodyStyles) {
      const bodyStyleName = (nhtsaBodyStyle.Name || '').trim();
      const bodyStyleId = nhtsaBodyStyle.Id;
      
      if (!bodyStyleName || bodyStyleName === 'Not Applicable') {
        skipped++;
        continue;
      }

      const normalizedName = bodyStyleName.toLowerCase();
      const existingBodyStyle = existingBodyStylesMap.get(normalizedName);

      if (existingBodyStyle) {
        // Check if update needed
        let needsUpdate = false;
        const updates = { id: existingBodyStyle.id };

        if (existingBodyStyle.name !== bodyStyleName) {
          updates.name = bodyStyleName;
          needsUpdate = true;
        }

        if (existingBodyStyle.nhtsa_body_class_id !== bodyStyleId) {
          updates.nhtsa_body_class_id = bodyStyleId;
          needsUpdate = true;
        }

        if (existingBodyStyle.is_active !== true) {
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
          name: bodyStyleName,
          normalized_name: normalizedName,
          nhtsa_body_class_id: bodyStyleId,
          is_active: true
        });
      }
    }

    // Bulk create in small batches of 10 with longer delays
    if (toCreate.length > 0) {
      console.log(`Creating ${toCreate.length} new body styles in batches of 10...`);
      for (let i = 0; i < toCreate.length; i += 10) {
        const batch = toCreate.slice(i, i + 10);
        await base44.asServiceRole.entities.VehicleBodyStyle.bulkCreate(batch);
        created += batch.length;
        console.log(`Created batch ${Math.floor(i / 10) + 1}/${Math.ceil(toCreate.length / 10)}, total created: ${created}`);
        // 2 second delay between batches to avoid rate limits
        if (i + 10 < toCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Update individually with delays (safest approach)
    if (toUpdate.length > 0) {
      console.log(`Updating ${toUpdate.length} existing body styles one at a time...`);
      for (let i = 0; i < toUpdate.length; i++) {
        const update = toUpdate[i];
        const { id, ...data } = update;
        await base44.asServiceRole.entities.VehicleBodyStyle.update(id, data);
        updated++;
        
        // Log progress every 10 updates
        if ((i + 1) % 10 === 0) {
          console.log(`Updated ${i + 1}/${toUpdate.length} body styles`);
        }
        
        // 1 second delay between each update
        if (i < toUpdate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    const result = {
      success: true,
      total_body_styles: nhtsaBodyStyles.length,
      created,
      updated,
      skipped,
      timestamp: new Date().toISOString()
    };

    console.log('Sync completed:', result);

    // Save sync status
    await base44.asServiceRole.entities.ParkingSyncStatus.create({
      sync_type: 'body_styles',
      last_synced_at: new Date().toISOString(),
      total_records: nhtsaBodyStyles.length,
      created_count: created,
      updated_count: updated,
      status: 'success'
    });

    return Response.json(result);
  } catch (error) {
    console.error('Error syncing vehicle body styles:', error);
    
    // Save error status
    try {
      await base44.asServiceRole.entities.ParkingSyncStatus.create({
        sync_type: 'body_styles',
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