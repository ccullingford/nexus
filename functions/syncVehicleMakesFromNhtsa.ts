import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
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
        // Update if name changed or if not active
        let needsUpdate = false;
        const updates = {};

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
          await base44.asServiceRole.entities.VehicleMake.update(existingMake.id, updates);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new make
        await base44.asServiceRole.entities.VehicleMake.create({
          name: makeName,
          normalized_name: normalizedName,
          nhtsa_make_id: makeId,
          is_active: true
        });
        created++;
      }

      // Add small delay every 50 items to avoid rate limits
      if ((created + updated + skipped) % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
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

    return Response.json(result);
  } catch (error) {
    console.error('Error syncing vehicle makes:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});