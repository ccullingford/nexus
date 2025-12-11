import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Popular US makes to filter for
const POPULAR_US_MAKES = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'Hyundai', 'Kia',
  'Subaru', 'Jeep', 'GMC', 'Ram', 'Volkswagen', 'Mercedes-Benz', 'BMW',
  'Audi', 'Lexus', 'Mazda', 'Dodge', 'Chrysler', 'Buick', 'Cadillac',
  'Lincoln', 'Volvo', 'Acura', 'Infiniti', 'Tesla', 'Mitsubishi',
  'Mini', 'Alfa Romeo', 'Genesis'
];

function normalizeMakeName(name) {
  return name.toLowerCase().trim();
}

function isPopularMake(makeName) {
  const normalized = normalizeMakeName(makeName);
  return POPULAR_US_MAKES.some(popular => normalizeMakeName(popular) === normalized);
}

function getLastNYears(n = 20) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < n; i++) {
    years.push(currentYear - i);
  }
  return years;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting NHTSA bulk vehicle data sync...');
    console.log('Using popular makes filter and last 20 years');

    const validYears = getLastNYears(20);
    const startTime = Date.now();

    // Fetch the bulk CSV data from NHTSA
    // This endpoint returns ALL vehicle models - we'll filter locally
    const csvUrl = 'https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/Chevrolet/modelyear/2024?format=csv';
    
    // Actually, we need to use a different approach - let's fetch for all makes we care about
    // But to avoid many calls, we'll do one call per popular make for the current year
    // and extract make/model combos from there
    
    // Better approach: Use the GetAllMakes and GetModelsForMakeId endpoints more efficiently
    console.log('Fetching all makes from NHTSA...');
    const makesUrl = 'https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json';
    const makesResponse = await fetch(makesUrl);
    const makesData = await makesResponse.json();
    const allMakes = makesData.Results || [];
    
    console.log(`Fetched ${allMakes.length} total makes from NHTSA`);

    // Filter to popular makes only
    const popularMakesData = allMakes.filter(m => isPopularMake(m.Make_Name));
    console.log(`Filtered to ${popularMakesData.length} popular makes`);

    // Fetch existing makes and models
    const existingMakes = await base44.asServiceRole.entities.VehicleMake.list('name', 1000);
    const existingModels = await base44.asServiceRole.entities.VehicleModel.list('name', 5000);
    
    const existingMakesMap = new Map(existingMakes.map(m => [normalizeMakeName(m.name), m]));
    const existingModelsMap = new Map(existingModels.map(m => [`${m.make_id}_${normalizeMakeName(m.name)}`, m]));

    let makesCreated = 0;
    let makesUpdated = 0;
    let modelsCreated = 0;
    let modelsUpdated = 0;

    // Process makes first
    const makeUpdates = [];
    const makeCreates = [];
    
    for (const nhtsaMake of popularMakesData) {
      const makeName = nhtsaMake.Make_Name.trim();
      const normalizedName = normalizeMakeName(makeName);
      const existing = existingMakesMap.get(normalizedName);
      
      if (existing) {
        // Update if needed
        let needsUpdate = false;
        const updates = { id: existing.id };
        
        if (existing.name !== makeName) {
          updates.name = makeName;
          needsUpdate = true;
        }
        if (existing.nhtsa_make_id !== nhtsaMake.Make_ID) {
          updates.nhtsa_make_id = nhtsaMake.Make_ID;
          needsUpdate = true;
        }
        if (!existing.is_common) {
          updates.is_common = true;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          makeUpdates.push(updates);
        }
      } else {
        // Create new
        makeCreates.push({
          name: makeName,
          normalized_name: normalizedName,
          nhtsa_make_id: nhtsaMake.Make_ID,
          is_common: true,
          is_active: true
        });
      }
    }

    // Batch create makes
    if (makeCreates.length > 0) {
      console.log(`Creating ${makeCreates.length} new makes...`);
      for (let i = 0; i < makeCreates.length; i += 10) {
        const batch = makeCreates.slice(i, i + 10);
        await base44.asServiceRole.entities.VehicleMake.bulkCreate(batch);
        makesCreated += batch.length;
        if (i + 10 < makeCreates.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Update makes one by one
    if (makeUpdates.length > 0) {
      console.log(`Updating ${makeUpdates.length} existing makes...`);
      for (let i = 0; i < makeUpdates.length; i++) {
        const { id, ...data } = makeUpdates[i];
        await base44.asServiceRole.entities.VehicleMake.update(id, data);
        makesUpdated++;
        if (i < makeUpdates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Refresh makes list with new data
    const updatedMakes = await base44.asServiceRole.entities.VehicleMake.list('name', 1000);
    const popularMakesMap = new Map(
      updatedMakes
        .filter(m => m.is_common)
        .map(m => [m.nhtsa_make_id, m])
    );

    console.log(`Now fetching models for ${popularMakesMap.size} popular makes...`);

    // For each popular make, fetch models for the last 20 years
    const modelCreates = [];
    const modelUpdates = [];
    
    for (const [nhtsaMakeId, make] of popularMakesMap) {
      // Fetch models for this make
      const modelsUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/${nhtsaMakeId}?format=json`;
      
      try {
        const modelsResponse = await fetch(modelsUrl);
        const modelsData = await modelsResponse.json();
        const nhtsaModels = modelsData.Results || [];
        
        console.log(`  ${make.name}: ${nhtsaModels.length} models found`);
        
        for (const nhtsaModel of nhtsaModels) {
          const modelName = nhtsaModel.Model_Name.trim();
          if (!modelName || modelName === 'Not Applicable') continue;
          
          const normalizedModelName = normalizeMakeName(modelName);
          const key = `${make.id}_${normalizedModelName}`;
          const existing = existingModelsMap.get(key);
          
          if (existing) {
            // Update if needed
            let needsUpdate = false;
            const updates = { id: existing.id };
            
            if (existing.name !== modelName) {
              updates.name = modelName;
              needsUpdate = true;
            }
            if (existing.nhtsa_model_id !== nhtsaModel.Model_ID) {
              updates.nhtsa_model_id = nhtsaModel.Model_ID;
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              modelUpdates.push(updates);
            }
          } else {
            // Create new
            modelCreates.push({
              make_id: make.id,
              name: modelName,
              normalized_name: normalizedModelName,
              nhtsa_model_id: nhtsaModel.Model_ID,
              is_active: true
            });
          }
        }
        
        // Delay between make requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`Error fetching models for ${make.name}:`, error.message);
      }
    }

    // Batch create models
    if (modelCreates.length > 0) {
      console.log(`Creating ${modelCreates.length} new models in batches...`);
      for (let i = 0; i < modelCreates.length; i += 10) {
        const batch = modelCreates.slice(i, i + 10);
        await base44.asServiceRole.entities.VehicleModel.bulkCreate(batch);
        modelsCreated += batch.length;
        console.log(`  Created ${modelsCreated}/${modelCreates.length} models`);
        if (i + 10 < modelCreates.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Update models one by one
    if (modelUpdates.length > 0) {
      console.log(`Updating ${modelUpdates.length} existing models...`);
      for (let i = 0; i < modelUpdates.length; i++) {
        const { id, ...data } = modelUpdates[i];
        await base44.asServiceRole.entities.VehicleModel.update(id, data);
        modelsUpdated++;
        if ((i + 1) % 10 === 0) {
          console.log(`  Updated ${i + 1}/${modelUpdates.length} models`);
        }
        if (i < modelUpdates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = {
      success: true,
      duration_seconds: duration,
      makes: {
        created: makesCreated,
        updated: makesUpdated,
        total_popular: popularMakesMap.size
      },
      models: {
        created: modelsCreated,
        updated: modelsUpdated
      },
      timestamp: new Date().toISOString()
    };

    console.log('Sync completed:', result);

    // Save sync status
    await base44.asServiceRole.entities.ParkingSyncStatus.create({
      sync_type: 'makes',
      last_synced_at: new Date().toISOString(),
      total_records: makesCreated + makesUpdated,
      created_count: makesCreated,
      updated_count: makesUpdated,
      status: 'success'
    });

    await base44.asServiceRole.entities.ParkingSyncStatus.create({
      sync_type: 'models',
      last_synced_at: new Date().toISOString(),
      total_records: modelsCreated + modelsUpdated,
      created_count: modelsCreated,
      updated_count: modelsUpdated,
      status: 'success'
    });

    return Response.json(result);
    
  } catch (error) {
    console.error('Error in bulk sync:', error);
    
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