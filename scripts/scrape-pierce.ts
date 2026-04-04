/**
 * Pierce County Building Permits Scraper (Puppeteer-based)
 * 
 * Uses headless browser to navigate Cloudflare-protected site
 * and extract permit data from open.piercecountywa.gov
 */

import puppeteer from 'puppeteer';

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

export async function scrapePiercePermits(daysBack: number = 90): Promise<PiercePermit[]> {
  console.log(`📍 Scraping Pierce County permits (last ${daysBack} days)...`);
  console.log('  ⚠️  Note: Site uses Cloudflare - may require CAPTCHA or timeout');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('  → Navigating to open.piercecountywa.gov...');
    
    try {
      await page.goto('https://open.piercecountywa.gov/', { 
        waitUntil: 'networkidle2', 
        timeout: 45000 
      });
    } catch (error) {
      console.log('  ⚠️  Initial load timeout - checking if Cloudflare blocked us...');
      
      const content = await page.content();
      if (content.includes('cloudflare') || content.includes('Checking your browser')) {
        console.log('  ❌ Cloudflare challenge detected');
        console.log('  💡 This site requires manual access or cookie-based authentication');
        await browser.close();
        return [];
      }
      
      throw error;
    }
    
    // Wait a bit for any JS to settle
    await page.waitForTimeout(3000);
    
    console.log('  → Searching for building permits...');
    
    // Try to find search
    const hasSearch = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.some(input => 
        input.type === 'search' || 
        input.placeholder?.toLowerCase().includes('search')
      );
    });
    
    if (hasSearch) {
      const searchSelector = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const searchInput = inputs.find(input => 
          input.type === 'search' || 
          input.placeholder?.toLowerCase().includes('search')
        );
        return searchInput ? `input[name="${searchInput.name}"]` : null;
      });
      
      if (searchSelector) {
        await page.type(searchSelector, 'building permits');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('  ⚠️  No search box found, looking for direct links...');
    }
    
    // Look for dataset links
    const datasetLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter(link => {
          const text = link.textContent?.toLowerCase() || '';
          const href = link.href?.toLowerCase() || '';
          return (
            (text.includes('permit') || text.includes('building')) &&
            !href.includes('javascript:')
          );
        })
        .map(link => ({ text: link.textContent, href: link.href }));
    });
    
    console.log(`  → Found ${datasetLinks.length} potential permit links`);
    
    if (datasetLinks.length === 0) {
      console.log('  ⚠️  No building permit datasets found');
      console.log('  💡 Manual investigation needed at open.piercecountywa.gov');
      await browser.close();
      return [];
    }
    
    // Find best match
    const bestMatch = datasetLinks.find(link => 
      link.text?.toLowerCase().includes('building') && 
      link.text?.toLowerCase().includes('permit')
    ) || datasetLinks[0];
    
    console.log(`  → Opening dataset: ${bestMatch.text}`);
    
    try {
      await page.goto(bestMatch.href, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (error) {
      console.log('  ⚠️  Page load timeout, checking if data is visible...');
    }
    
    await page.waitForTimeout(3000);
    
    // Extract table data
    console.log('  → Attempting to extract table data...');
    
    const permits = await page.evaluate(() => {
      const results: any[] = [];
      const tables = document.querySelectorAll('table');
      
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length < 2) continue;
        
        const headers = Array.from(rows[0].querySelectorAll('th, td')).map(th => 
          th.textContent?.trim().toLowerCase() || ''
        );
        
        const hasPermitFields = headers.some(h => 
          h.includes('permit') || h.includes('address') || h.includes('valuation')
        );
        
        if (!hasPermitFields) continue;
        
        for (let i = 1; i < Math.min(rows.length, 101); i++) {
          const cells = Array.from(rows[i].querySelectorAll('td')).map(td => 
            td.textContent?.trim() || ''
          );
          
          if (cells.length !== headers.length) continue;
          
          const row: any = {};
          headers.forEach((header, idx) => {
            row[header] = cells[idx];
          });
          
          results.push(row);
        }
        
        break;
      }
      
      return results;
    });
    
    console.log(`  → Extracted ${permits.length} rows from page`);
    
    const formattedPermits: PiercePermit[] = permits.map((row: any) => {
      const getField = (...names: string[]) => {
        for (const name of names) {
          if (row[name]) return row[name];
        }
        return '';
      };
      
      return {
        permitNumber: getField('permit number', 'permit #', 'permit_number', 'number'),
        permitType: getField('permit type', 'type', 'permit_type'),
        address: getField('address', 'location', 'site address'),
        description: getField('description', 'project description', 'work description'),
        valuation: parseFloat(getField('valuation', 'value', 'project value').replace(/[^0-9.]/g, '')) || 0,
        sqft: parseFloat(getField('sq ft', 'sqft', 'square feet', 'size').replace(/[^0-9.]/g, '')) || 0,
        issueDate: getField('issue date', 'issued', 'date issued', 'date'),
        status: getField('status', 'permit status'),
        applicant: getField('applicant', 'contractor'),
        owner: getField('owner', 'property owner'),
        occupancyType: getField('occupancy', 'occupancy type', 'use')
      };
    });
    
    await browser.close();
    
    return formattedPermits.filter(p => p.permitNumber);
    
  } catch (error) {
    await browser.close();
    console.error(`  ❌ Error scraping Pierce County permits:`, error);
    throw error;
  }
}

// Manual instructions fallback
export function getPierceManualInstructions(): string {
  return `
📋 PIERCE COUNTY MANUAL FALLBACK

The Puppeteer scraper couldn't access Pierce County's site (likely Cloudflare protection).

OPTION 1 - Manual Export (Recommended):
1. Visit https://open.piercecountywa.gov/
2. Complete CAPTCHA if prompted
3. Search for "building permits"
4. Open the Building Permits dataset
5. Filter for:
   - Issue Date: Last 90 days
   - Type: Commercial
6. Export as CSV
7. Save to: /root/clawd/atm-lead-dashboard/data/pierce-permits.csv
8. Run: npm run collect-leads

OPTION 2 - Contact Pierce County:
- Email: gis@piercecountywa.gov
- Phone: (253) 798-6777
- Ask about: Automated permit data access or bulk download
`;
}

// Test function
if (require.main === module) {
  (async () => {
    try {
      const permits = await scrapePiercePermits(90);
      console.log(`\n📊 Result: ${permits.length} permits scraped`);
      
      if (permits.length > 0) {
        console.log('\nFirst 3 permits:');
        permits.slice(0, 3).forEach((p, i) => {
          console.log(`\n${i + 1}. ${p.permitNumber} - ${p.permitType}`);
          console.log(`   ${p.address}`);
          console.log(`   Valuation: $${p.valuation.toLocaleString()}`);
        });
      } else {
        console.log(getPierceManualInstructions());
      }
    } catch (error) {
      console.error('Failed:', error);
      console.log(getPierceManualInstructions());
      process.exit(1);
    }
  })();
}
