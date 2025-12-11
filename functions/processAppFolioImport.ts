import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { importJobId } = await req.json();

    if (!importJobId) {
      return Response.json({ error: 'importJobId is required' }, { status: 400 });
    }

    // Fetch the import job
    const jobs = await base44.asServiceRole.entities.ImportJob.filter({ id: importJobId });
    const job = jobs[0];

    if (!job) {
      return Response.json({ error: 'Import job not found' }, { status: 404 });
    }

    // Update status to running
    await base44.asServiceRole.entities.ImportJob.update(job.id, {
      status: 'running',
      started_at: new Date().toISOString()
    });

    let log = 'Starting import...\n';
    let errorCount = 0;
    let createdRecords = 0;
    let updatedRecords = 0;
    let processedRows = 0;

    try {
      // Fetch CSV file
      log += `Fetching CSV from ${job.file_url}\n`;
      const csvResponse = await fetch(job.file_url);
      const csvText = await csvResponse.text();
      
      // Parse CSV - properly handle quoted fields
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };
      
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
      
      const columnMappings = job.column_mappings || {};
      
      log += `Found ${lines.length - 1} rows to process\n`;
      log += `Headers: ${headers.join(', ')}\n`;
      log += `Column mappings: ${JSON.stringify(columnMappings, null, 2)}\n`;
      
      // Update total rows
      await base44.asServiceRole.entities.ImportJob.update(job.id, {
        total_rows: lines.length - 1
      });
      
      // Group rows by association to avoid duplicates
      const associationMap = new Map();
      const unitMap = new Map();
      const ownerList = [];

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
        const rowData = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        log += `\nRow ${i}: ${JSON.stringify(rowData)}\n`;

        // Extract mapped data
        const associationData = {};
        const unitData = {};
        const ownerData = {};

        Object.entries(columnMappings).forEach(([csvColumn, targetField]) => {
          const value = rowData[csvColumn];
          if (!value) return;

          if (targetField.startsWith('association.')) {
            const field = targetField.replace('association.', '');
            associationData[field] = value;
          } else if (targetField.startsWith('unit.')) {
            const field = targetField.replace('unit.', '');
            unitData[field] = value;
          } else if (targetField.startsWith('owner.')) {
            const field = targetField.replace('owner.', '');
            ownerData[field] = value;
          }
        });

        log += `Association data: ${JSON.stringify(associationData)}\n`;
        log += `Unit data: ${JSON.stringify(unitData)}\n`;
        log += `Owner data: ${JSON.stringify(ownerData)}\n`;

        // Create unique key for association
        const assocKey = associationData.name || associationData.code;
        if (assocKey && !associationMap.has(assocKey)) {
          associationMap.set(assocKey, associationData);
        }

        // Store unit and owner data with references
        if (unitData.unit_number) {
          const unitKey = `${assocKey}_${unitData.unit_number}`;
          if (!unitMap.has(unitKey)) {
            unitMap.set(unitKey, {
              associationKey: assocKey,
              unitData: unitData
            });
          }
        }

        // Include owner if there's a company name OR first/last name
        if (ownerData.company_name || ownerData.first_name || ownerData.last_name) {
          ownerList.push({
            associationKey: assocKey,
            unitNumber: unitData.unit_number,
            ownerData: ownerData
          });
        }

        processedRows++;
      }

      log += `Processed ${processedRows} rows\n`;
      log += `Found ${associationMap.size} unique associations\n`;
      log += `Found ${unitMap.size} unique units\n`;
      log += `Found ${ownerList.length} owners\n`;

      // Fetch all existing data once
      const allAssociations = await base44.asServiceRole.entities.Association.list();
      const allUnits = await base44.asServiceRole.entities.Unit.list();
      const allOwners = await base44.asServiceRole.entities.Owner.list();

      log += `Fetched ${allAssociations.length} existing associations, ${allUnits.length} units, ${allOwners.length} owners\n`;

      // Create/update associations
      const associationIdMap = new Map();
      const associationsToCreate = [];
      const associationsToUpdate = [];

      for (const [key, data] of associationMap) {
        const normalizedName = data.name.trim();
        const existing = allAssociations.find(a => 
          a.name.trim().toLowerCase() === normalizedName.toLowerCase()
        );

        if (existing) {
          associationsToUpdate.push({ id: existing.id, data });
          associationIdMap.set(key, existing.id);
        } else {
          associationsToCreate.push({ key, data: { ...data, status: 'active' } });
        }
      }

      // Bulk create associations
      if (associationsToCreate.length > 0) {
        const created = await base44.asServiceRole.entities.Association.bulkCreate(
          associationsToCreate.map(a => a.data)
        );
        created.forEach((assoc, idx) => {
          associationIdMap.set(associationsToCreate[idx].key, assoc.id);
          createdRecords++;
          log += `Created association: ${assoc.name}\n`;
        });
      }

      // Update associations one by one (no bulk update API)
      for (const { id, data } of associationsToUpdate) {
        try {
          await base44.asServiceRole.entities.Association.update(id, data);
          updatedRecords++;
          log += `Updated association: ${data.name}\n`;
        } catch (error) {
          errorCount++;
          log += `Error updating association: ${error.message}\n`;
        }
      }

      // Create/update units
      const unitIdMap = new Map();
      const unitsToCreate = [];
      const unitsToUpdate = [];

      for (const [unitKey, { associationKey, unitData }] of unitMap) {
        const associationId = associationIdMap.get(associationKey);
        if (!associationId) {
          log += `Skipping unit ${unitData.unit_number} - association not found\n`;
          continue;
        }

        const existing = allUnits.find(u => 
          u.association_id === associationId && 
          u.unit_number === unitData.unit_number
        );

        if (existing) {
          unitsToUpdate.push({ id: existing.id, data: { ...unitData, association_id: associationId } });
          unitIdMap.set(unitKey, existing.id);
        } else {
          unitsToCreate.push({ 
            key: unitKey, 
            data: { ...unitData, association_id: associationId, status: 'occupied' } 
          });
        }
      }

      // Bulk create units
      if (unitsToCreate.length > 0) {
        const created = await base44.asServiceRole.entities.Unit.bulkCreate(
          unitsToCreate.map(u => u.data)
        );
        created.forEach((unit, idx) => {
          unitIdMap.set(unitsToCreate[idx].key, unit.id);
          createdRecords++;
          log += `Created unit: ${unit.unit_number}\n`;
        });
      }

      // Update units one by one
      for (const { id, data } of unitsToUpdate) {
        try {
          await base44.asServiceRole.entities.Unit.update(id, data);
          updatedRecords++;
          log += `Updated unit: ${data.unit_number}\n`;
        } catch (error) {
          errorCount++;
          log += `Error updating unit: ${error.message}\n`;
        }
      }

      // Create/update owners
      const ownersToCreate = [];
      const ownersToUpdate = [];

      for (const { associationKey, unitNumber, ownerData } of ownerList) {
        const associationId = associationIdMap.get(associationKey);
        const unitKey = `${associationKey}_${unitNumber}`;
        const unitId = unitIdMap.get(unitKey);

        const ownerName = ownerData.company_name || `${ownerData.first_name || ''} ${ownerData.last_name || ''}`.trim() || 'Unknown';

        if (!associationId || !unitId) {
          log += `Skipping owner ${ownerName} - missing association or unit\n`;
          continue;
        }

        // Check if owner exists - match by company name OR first/last name
        let existing = null;
        if (ownerData.company_name) {
          existing = allOwners.find(o => 
            o.association_id === associationId &&
            o.unit_id === unitId &&
            o.company_name === ownerData.company_name
          );
        } else if (ownerData.first_name && ownerData.last_name) {
          existing = allOwners.find(o => 
            o.association_id === associationId &&
            o.unit_id === unitId &&
            o.first_name === ownerData.first_name &&
            o.last_name === ownerData.last_name
          );
        }

        if (existing) {
          ownersToUpdate.push({ id: existing.id, data: { ...ownerData, association_id: associationId, unit_id: unitId }, name: ownerName });
        } else {
          ownersToCreate.push({ 
            data: { ...ownerData, association_id: associationId, unit_id: unitId, is_primary_owner: true },
            name: ownerName
          });
        }
      }

      // Bulk create owners
      if (ownersToCreate.length > 0) {
        const created = await base44.asServiceRole.entities.Owner.bulkCreate(
          ownersToCreate.map(o => o.data)
        );
        created.forEach((owner, idx) => {
          createdRecords++;
          log += `Created owner: ${ownersToCreate[idx].name}\n`;
        });
      }

      // Update owners one by one
      for (const { id, data, name } of ownersToUpdate) {
        try {
          await base44.asServiceRole.entities.Owner.update(id, data);
          updatedRecords++;
          log += `Updated owner: ${name}\n`;
        } catch (error) {
          errorCount++;
          log += `Error updating owner ${name}: ${error.message}\n`;
        }
      }

      // Update job as completed
      await base44.asServiceRole.entities.ImportJob.update(job.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_rows: processedRows,
        created_records: createdRecords,
        updated_records: updatedRecords,
        error_count: errorCount,
        error_summary: errorCount > 0 ? `${errorCount} errors encountered` : null,
        log: log
      });

      return Response.json({
        success: true,
        processedRows,
        createdRecords,
        updatedRecords,
        errorCount,
        log
      });

    } catch (error) {
      log += `Fatal error: ${error.message}\n`;
      
      // Update job as failed
      await base44.asServiceRole.entities.ImportJob.update(job.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_count: errorCount + 1,
        error_summary: error.message,
        log: log
      });

      return Response.json({
        success: false,
        error: error.message,
        log
      }, { status: 500 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});