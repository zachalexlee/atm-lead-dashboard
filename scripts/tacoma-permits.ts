/**
 * Tacoma Building Permits Collector
 * 
 * Data source: data.tacoma.gov (ArcGIS Hub)
 * Method: Direct API access to ArcGIS FeatureServer
 */

export interface TacomaPermit {
  permitNumber: string;
  permitType: string;
  address: string;
  description: string;
  valuation: number;
  sqft: number;
  issueDate: string;
  status: string;
  applicant?: string;
  owner?: string;
  occupancyType?: string;
}

/**
 * Fetch building permits from Tacoma's ArcGIS FeatureServer
 * 
 * Strategy:
 * 1. Try known ArcGIS REST API endpoints
 * 2. Filter for commercial permits (Group M, A-2 occupancy)
 * 3. Filter for recent permits (last 90 days)
 * 4. Return structured data
 */
export async function fetchTacomaPermits(daysBack: number = 90): Promise<TacomaPermit[]> {
  console.log(`📍 Fetching Tacoma permits (last ${daysBack} days)...`);

  // Calculate date threshold
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

  // Known ArcGIS FeatureServer endpoints for Tacoma
  // These are common patterns - we'll try multiple
  const endpoints = [
    'https://services3.arcgis.com/xgVD93u5ZlWnL7WD/arcgis/rest/services/Building_Permits/FeatureServer/0/query',
    'https://services3.arcgis.com/xgVD93u5ZlWnL7WD/arcgis/rest/services/Permits/FeatureServer/0/query',
    'https://gis.cityoftacoma.org/arcgis/rest/services/PublicWorks/Permits/MapServer/0/query'
  ];

  const permits: TacomaPermit[] = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`  Trying: ${endpoint.split('/').slice(0, 5).join('/')}/...`);
      
      const params = new URLSearchParams({
        where: `issue_date >= '${cutoffStr}' AND permit_type LIKE '%Commercial%'`,
        outFields: '*',
        f: 'json',
        returnGeometry: 'false',
        resultRecordCount: '1000'
      });

      const url = `${endpoint}?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Forza ATM Lead Collection)',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`  ❌ HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.error) {
        console.log(`  ❌ API Error: ${data.error.message || JSON.stringify(data.error)}`);
        continue;
      }

      if (!data.features || data.features.length === 0) {
        console.log(`  ⚠️  No features found`);
        continue;
      }

      console.log(`  ✅ Found ${data.features.length} permits`);

      // Parse features into our format
      for (const feature of data.features) {
        const attrs = feature.attributes;
        
        permits.push({
          permitNumber: attrs.permit_number || attrs.PERMIT_NUM || attrs.PermitNumber || 'UNKNOWN',
          permitType: attrs.permit_type || attrs.PERMIT_TYPE || attrs.PermitType || 'Commercial',
          address: attrs.address || attrs.ADDRESS || attrs.Address || 'Unknown Address',
          description: attrs.description || attrs.DESC || attrs.Description || attrs.project_description || '',
          valuation: parseFloat(attrs.valuation || attrs.VALUATION || attrs.Valuation || 0),
          sqft: parseFloat(attrs.sqft || attrs.SQFT || attrs.square_feet || attrs.SquareFeet || 0),
          issueDate: attrs.issue_date || attrs.ISSUE_DATE || attrs.IssueDate || attrs.issued_date || new Date().toISOString().split('T')[0],
          status: attrs.status || attrs.STATUS || attrs.Status || 'Issued',
          applicant: attrs.applicant || attrs.APPLICANT || attrs.Applicant || undefined,
          owner: attrs.owner || attrs.OWNER || attrs.Owner || undefined,
          occupancyType: attrs.occupancy || attrs.OCCUPANCY || attrs.OccupancyType || undefined
        });
      }

      break; // Success - don't try other endpoints
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
  }

  if (permits.length === 0) {
    console.log('  ⚠️  No permits found from any endpoint. Manual investigation needed.');
    console.log('  💡 Visit https://data.tacoma.gov/ to find the correct dataset.');
  }

  return permits;
}

/**
 * Manual fallback: Instructions for getting data when API fails
 */
export function getManualInstructions(): string {
  return `
📋 MANUAL DATA COLLECTION INSTRUCTIONS

If the automated API collection fails, follow these steps:

1. Visit https://data.tacoma.gov/
2. Search for "building permits" in the search box
3. Look for datasets like:
   - "Building Permits" 
   - "Commercial Permits"
   - "Development Activity"
4. Click on the dataset
5. Click "Export" button → Choose CSV or JSON
6. Filter for:
   - Date: Last 90 days
   - Type: Commercial, Tenant Improvement
   - Valuation: > $50,000
7. Download the file
8. Place it in: /root/clawd/atm-lead-dashboard/data/tacoma-permits.csv
9. Run: npm run collect-leads

ALTERNATIVE - Find the API endpoint:
1. On the dataset page, open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for requests to /query or FeatureServer
5. Copy the URL and update tacoma-permits.ts
`;
}
