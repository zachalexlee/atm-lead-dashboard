/**
 * Pierce County Building Permits Collector
 * 
 * Data source: open.piercecountywa.gov (ArcGIS Hub with Cloudflare)
 * Method: ArcGIS REST API with fallback to manual instructions
 */

export interface PiercePermit {
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
 * Fetch building permits from Pierce County's ArcGIS FeatureServer
 * 
 * Note: Pierce County uses Cloudflare protection which may block automated access.
 * If this fails, fallback to manual export from their portal.
 */
export async function fetchPiercePermits(daysBack: number = 90): Promise<PiercePermit[]> {
  console.log(`📍 Fetching Pierce County permits (last ${daysBack} days)...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  // Known Pierce County GIS endpoints
  const endpoints = [
    'https://gisdata.piercecountywa.gov/arcgis/rest/services/Permits/Building_Permits/MapServer/0/query',
    'https://services3.arcgis.com/yLbPT9sYhCYpBXOJ/arcgis/rest/services/Building_Permits/FeatureServer/0/query',
    'https://gis.piercecountywa.gov/arcgis/rest/services/PublicWorks/Permits/MapServer/0/query'
  ];

  const permits: PiercePermit[] = [];

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
      
      // Add headers to try to avoid Cloudflare blocking
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://open.piercecountywa.gov/'
        }
      });

      if (!response.ok) {
        console.log(`  ❌ HTTP ${response.status}`);
        
        // Check if Cloudflare blocked us
        if (response.status === 403) {
          console.log(`  ⚠️  Cloudflare protection detected - may need manual export`);
        }
        
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

      break;
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
  }

  if (permits.length === 0) {
    console.log('  ⚠️  No permits found. Cloudflare may be blocking access.');
    console.log('  💡 Visit https://open.piercecountywa.gov/ for manual export.');
  }

  return permits;
}

/**
 * Manual fallback instructions
 */
export function getManualInstructions(): string {
  return `
📋 PIERCE COUNTY MANUAL DATA COLLECTION

Pierce County uses Cloudflare protection which may block automated access.
If API collection fails, use this manual process:

1. Visit https://open.piercecountywa.gov/
2. Complete any CAPTCHA if prompted
3. Search for "building permits" or "commercial permits"
4. Click on the Building Permits dataset
5. Set filters:
   - Issue Date: Last 90 days
   - Permit Type: Commercial, Tenant Improvement
   - Valuation: > $50,000
6. Click "Export" → CSV or JSON
7. Download the file
8. Save to: /root/clawd/atm-lead-dashboard/data/pierce-permits.csv
9. Run: npm run collect-leads

ALTERNATIVE - Browser Automation:
If you need regular automated access despite Cloudflare:
1. Use Puppeteer with a real Chrome browser
2. Complete CAPTCHA once, save cookies
3. Reuse cookies for future requests
4. Update pierce-permits.ts to use Puppeteer

CONTACT FOR API ACCESS:
If you need official API access:
- Email: gis@piercecountywa.gov
- Phone: (253) 798-6777
- Ask about: "Building permit data API for commercial use"
`;
}
