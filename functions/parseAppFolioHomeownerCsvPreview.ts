import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { fileUrl, maxPreviewRows = 10 } = await req.json();

    if (!fileUrl) {
      return Response.json({ success: false, error: 'fileUrl is required' }, { status: 400 });
    }

    // Fetch CSV file
    const csvResponse = await fetch(fileUrl);
    if (!csvResponse.ok) {
      return Response.json({ 
        success: false, 
        error: `Failed to fetch CSV: ${csvResponse.statusText}` 
      }, { status: 400 });
    }
    
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
    
    if (lines.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'CSV file is empty' 
      }, { status: 400 });
    }
    
    // Extract headers
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
    
    // Parse preview rows
    const previewRows = [];
    const rowsToParse = Math.min(maxPreviewRows, lines.length - 1);
    
    for (let i = 1; i <= rowsToParse; i++) {
      const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      previewRows.push(rowData);
    }

    return Response.json({
      success: true,
      data: {
        headers,
        previewRows,
        totalRows: lines.length - 1
      }
    });

  } catch (error) {
    console.error('Error parsing CSV:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});