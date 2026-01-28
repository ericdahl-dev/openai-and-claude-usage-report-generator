// n8n Code Node for CSV Row Generation from Usage Report
// This code generates an array of CSV rows from the JSON report output of the previous code node
//
// USAGE IN N8N:
// 1. Add a Code node to your workflow
// 2. Set Mode to "Run Once for All Items" (recommended) or "Run Once for Each Item"
// 3. Paste this entire code into the Code node
// 4. Connect it after the code node that generates the JSON report
// 5. The input should be the JSON report object (format from n8n-sample2.json)
// 6. The output will be an array of row objects, one item per row
//
// INPUT FORMAT:
// The code expects input data containing a report object with:
// - metadata.projectId (for CSV project_id column)
// - dailyBreakdown array with {date, lineItem, cost} objects
//
// OUTPUT FORMAT:
// Returns an array of items, one per row, each with:
// - date: Date string (YYYY-MM-DD)
// - line_item: Model/service name
// - cost_usd: Cost as number (formatted to 2 decimals)
// - project_id: Project ID

// Helper function to normalize costs (round up < 0.01, filter out <= 0)
function normalizeCost(cost) {
  if (cost <= 0) {
    return null; // Filter out zero or negative costs
  }
  if (cost < 0.01) {
    return 0.01; // Round up costs less than 0.01
  }
  return cost;
}

// Generate array of row objects from report's dailyBreakdown
function generateRowsFromReport(report) {
  // Get dailyBreakdown and projectId
  const dailyBreakdown = report.dailyBreakdown || [];
  const projectId = report.metadata?.projectId || 'unknown';
  
  // Process and sort data, filtering out 0.00 cost items and rounding up costs < 0.01
  const rows = [...dailyBreakdown]
    .map(daily => {
      const normalizedCost = normalizeCost(daily.cost);
      return normalizedCost !== null 
        ? { 
            date: daily.date, 
            line_item: daily.lineItem, 
            cost_usd: parseFloat(normalizedCost.toFixed(2)),
            project_id: projectId
          }
        : null;
    })
    .filter(row => row !== null)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.line_item.localeCompare(b.line_item);
    });
  
  return rows;
}

// Main execution
try {
  // Get input data from n8n
  const inputItems = $input.all();
  
  if (inputItems.length === 0) {
    throw new Error('No input data received');
  }
  
  // Extract report data from input items
  // Handle different input formats:
  // 1. Single item with json property containing the report
  // 2. Array of items, each with json property containing reports
  let report;
  
  if (inputItems.length === 1) {
    const item = inputItems[0];
    // Check if json property exists and contains the report
    if (item.json) {
      // If it's an array, take the first element
      report = Array.isArray(item.json) ? item.json[0] : item.json;
    } else {
      // Try the whole item
      report = Array.isArray(item) ? item[0] : item;
    }
  } else {
    // Multiple items - take the first one's json property
    const firstItem = inputItems[0];
    report = firstItem.json || firstItem;
    // If it's an array, take the first element
    if (Array.isArray(report)) {
      report = report[0];
    }
  }
  
  // Validate report structure
  if (!report || !report.dailyBreakdown) {
    throw new Error('Invalid report format: missing dailyBreakdown array');
  }
  
  if (!report.metadata || !report.metadata.projectId) {
    throw new Error('Invalid report format: missing metadata.projectId');
  }
  
  // Generate array of row objects
  const rows = generateRowsFromReport(report);
  
  // Return array of items, one per row, with properties at top level of json
  return rows.map(row => ({
    json: {
      date: row.date,
      line_item: row.line_item,
      cost_usd: row.cost_usd,
      project_id: row.project_id
    }
  }));
  
} catch (error) {
  // Return error in n8n format
  throw new Error(`Failed to generate CSV rows: ${error.message}`);
}
