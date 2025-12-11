import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { requirePermission } from './checkPermission.js';
import { PERMISSIONS } from '../components/permissions.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { fileUrl, columnMappings } = await req.json();

    if (!fileUrl || !columnMappings) {
      return Response.json({ 
        success: false, 
        error: 'fileUrl and columnMappings are required' 
      }, { status: 400 });
    }

    let log = 'Starting import...\n';
    let errorCount = 0;
    let createdRecords = 0;
    let updatedRecords = 0;
    let processedRows = 0;
    const errors = [];

    try {
      // Fetch CSV file
      log += `Fetching CSV from ${fileUrl}\n`;
      const csvResponse = await fetch(fileUrl);
      if (!csvResponse.ok) {
        return Response.json({ 
          success: false, 
          error: `Failed to fetch CSV: ${csvResponse.statusText}` 
        });
      }
      
      const csvText = await csvResponse.text();
      
      // Parse CSV
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
      
      log += `Found ${lines.length - 1} rows to process\n`;
      
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

        // Company detection logic
        const homeownerFull = ownerData.homeowner_full || '';
        const firstName = ownerData.first_name || '';
        const lastName = ownerData.last_name || '';

        // Construct expected person format: "Last, First"
        const expectedPersonFormat = lastName && firstName 
          ? `${lastName}, ${firstName}`.trim().toLowerCase()
          : '';

        // Determine if this is a company
        const isCompany = (!firstName && !lastName) || 
                          (homeownerFull && expectedPersonFormat && 
                           homeownerFull.trim().toLowerCase() !== expectedPersonFormat);

        // Set owner fields based on company vs person
        if (isCompany) {
          ownerData.is_company = true;
          ownerData.company_name = homeownerFull;
          ownerData.contact_first_name = firstName || null;
          ownerData.contact_last_name = lastName || null;
          ownerData.original_homeowner_string = homeownerFull;
          delete ownerData.first_name;
          delete ownerData.last_name;
        } else {
          ownerData.is_company = false;
          ownerData.company_name = null;
          ownerData.original_homeowner_string = homeownerFull;
        }

        delete ownerData.homeowner_full;

        // Create unique key for association
        const assocKey = associationData.name || associationData.code;
        if (assocKey && !associationMap.has(assocKey)) {
          associationMap.set(assocKey, associationData);
        }

        // Store unit data
        if (unitData.unit_number) {
          const unitKey = `${assocKey}_${unitData.unit_number}`;
          if (!unitMap.has(unitKey)) {
            unitMap.set(unitKey, {
              associationKey: assocKey,
              unitData: unitData
            });
          }
        }

        // Include owner if valid
        if (ownerData.is_company || ownerData.first_name || ownerData.last_name) {
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

      // Bulk create associations in batches
      const BATCH_SIZE = 20;
      for (let i = 0; i < associationsToCreate.length; i += BATCH_SIZE) {
        const batch = associationsToCreate.slice(i, i + BATCH_SIZE);
        try {
          const created = await base44.asServiceRole.entities.Association.bulkCreate(
            batch.map(a => a.data)
          );
          created.forEach((assoc, idx) => {
            associationIdMap.set(batch[idx].key, assoc.id);
            createdRecords++;
            log += `Created association: ${assoc.name}\n`;
          });
        } catch (error) {
          errorCount++;
          errors.push(`Error creating associations batch: ${error.message}`);
          log += `Error creating associations batch: ${error.message}\n`;
        }
        
        // Always add delay after each batch
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Update associations with delay
      for (let i = 0; i < associationsToUpdate.length; i++) {
        const { id, data } = associationsToUpdate[i];
        try {
          await base44.asServiceRole.entities.Association.update(id, data);
          updatedRecords++;
          log += `Updated association: ${data.name}\n`;
          
          // Small delay after every update
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error) {
          errorCount++;
          errors.push(`Error updating association ${data.name}: ${error.message}`);
          log += `Error updating association: ${error.message}\n`;
        }
      }

      // Delay before starting units
      log += 'Waiting before processing units...\n';
      await new Promise(resolve => setTimeout(resolve, 500));

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
      for (let i = 0; i < unitsToCreate.length; i += BATCH_SIZE) {
        const batch = unitsToCreate.slice(i, i + BATCH_SIZE);
        try {
          const created = await base44.asServiceRole.entities.Unit.bulkCreate(
            batch.map(u => u.data)
          );
          created.forEach((unit, idx) => {
            unitIdMap.set(batch[idx].key, unit.id);
            createdRecords++;
            log += `Created unit: ${unit.unit_number}\n`;
          });
        } catch (error) {
          errorCount++;
          errors.push(`Error creating units batch: ${error.message}`);
          log += `Error creating units batch: ${error.message}\n`;
        }
        
        // Always add delay after each batch
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Update units
      for (let i = 0; i < unitsToUpdate.length; i++) {
        const { id, data } = unitsToUpdate[i];
        try {
          await base44.asServiceRole.entities.Unit.update(id, data);
          updatedRecords++;
          log += `Updated unit: ${data.unit_number}\n`;
          
          // Small delay after every update
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error) {
          errorCount++;
          errors.push(`Error updating unit ${data.unit_number}: ${error.message}`);
          log += `Error updating unit: ${error.message}\n`;
        }
      }

      // Delay before starting owners
      log += 'Waiting before processing owners...\n';
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create/update owners
      const ownersToCreate = [];
      const ownersToUpdate = [];

      for (const { associationKey, unitNumber, ownerData } of ownerList) {
        const associationId = associationIdMap.get(associationKey);
        const unitKey = `${associationKey}_${unitNumber}`;
        const unitId = unitIdMap.get(unitKey);

        const ownerName = ownerData.is_company 
          ? ownerData.company_name 
          : `${ownerData.first_name || ''} ${ownerData.last_name || ''}`.trim() || 'Unknown';

        if (!associationId || !unitId) {
          log += `Skipping owner ${ownerName} - missing association or unit\n`;
          continue;
        }

        // Check if owner exists
        let existing = null;
        if (ownerData.is_company && ownerData.company_name) {
          existing = allOwners.find(o => 
            o.association_id === associationId &&
            o.unit_id === unitId &&
            o.is_company === true &&
            o.company_name === ownerData.company_name
          );
        } else if (!ownerData.is_company && ownerData.first_name && ownerData.last_name) {
          existing = allOwners.find(o => 
            o.association_id === associationId &&
            o.unit_id === unitId &&
            (!o.is_company || o.is_company === false) &&
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
      for (let i = 0; i < ownersToCreate.length; i += BATCH_SIZE) {
        const batch = ownersToCreate.slice(i, i + BATCH_SIZE);
        try {
          const created = await base44.asServiceRole.entities.Owner.bulkCreate(
            batch.map(o => o.data)
          );
          created.forEach((owner, idx) => {
            createdRecords++;
            log += `Created owner: ${batch[idx].name}\n`;
          });
        } catch (error) {
          errorCount++;
          errors.push(`Error creating owners batch: ${error.message}`);
          log += `Error creating owners batch: ${error.message}\n`;
        }
        
        // Always add delay after each batch
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Update owners
      for (let i = 0; i < ownersToUpdate.length; i++) {
        const { id, data, name } = ownersToUpdate[i];
        try {
          await base44.asServiceRole.entities.Owner.update(id, data);
          updatedRecords++;
          log += `Updated owner: ${name}\n`;
          
          // Small delay after every update
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error) {
          errorCount++;
          errors.push(`Error updating owner ${name}: ${error.message}`);
          log += `Error updating owner: ${error.message}\n`;
        }
      }

      return Response.json({
        success: true,
        data: {
          processedRows,
          createdRecords,
          updatedRecords,
          errorCount,
          errors: errors.slice(0, 10), // Return first 10 errors
          log
        }
      });

    } catch (error) {
      log += `Fatal error: ${error.message}\n`;
      
      return Response.json({
        success: false,
        error: error.message,
        data: {
          processedRows,
          createdRecords,
          updatedRecords,
          errorCount: errorCount + 1,
          errors: [...errors, error.message].slice(0, 10),
          log
        }
      });
    }

  } catch (error) {
    console.error('Error in import:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});