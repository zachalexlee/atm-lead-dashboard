/**
 * Tacoma Building Permits Scraper (Puppeteer-based)
 * 
 * Uses headless browser to navigate JavaScript-heavy site
 * and extract permit data from data.tacoma.gov
 */

import puppeteer from 'puppeteer';

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

export async function scrapeTacomaPermits(daysBack: number = 90): Promise<TacomaPermit[]> {
  console.log(`📍 Scraping Tacoma permits (last ${daysBack} days)...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent to look like a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('  → Navigating to data.tacoma.gov...');
    await page.goto('https://data.tacoma.gov/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for search box
    console.log('  → Searching for building permits...');
    await page.waitForSelector('input[type="search"], input[placeholder*="search" i], input[name="q"]', { timeout: 10000 });
    
    // Type in search box
    const searchSelector = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const searchInput = inputs.find(input => 
        input.type === 'search' || 
        input.placeholder?.toLowerCase().includes('search') ||
        input.name === 'q'
      );
      return searchInput ? `input[name="${searchInput.name}"]` : null;
    });
    
    if (!searchSelector) {
      throw new Error('Could not find search input');
    }
    
    await page.type(searchSelector, 'building permits');
    await page.keyboard.press('Enter');
    
    // Wait for results
    console.log('  → Waiting for search results...');
    await page.waitForTimeout(3000);
    
    // Look for dataset links
    const datasetLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter(link => {
          const text = link.textContent?.toLowerCase() || '';
          const href = link.href?.toLowerCase() || '';
          return (
            (text.includes('permit') || text.includes('building')) &&
            (href.includes('dataset') || href.includes('data'))
          );
        })
        .map(link => ({ text: link.textContent, href: link.href }));
    });
    
    console.log(`  → Found ${datasetLinks.length} potential datasets`);
    
    if (datasetLinks.length === 0) {
      console.log('  ⚠️  No building permit datasets found');
      console.log('  💡 Manual investigation needed at data.tacoma.gov');
      return [];
    }
    
    // Try to find the best match
    const bestMatch = datasetLinks.find(link => 
      link.text?.toLowerCase().includes('building') && 
      link.text?.toLowerCase().includes('permit')
    ) || datasetLinks[0];
    
    console.log(`  → Opening dataset: ${bestMatch.text}`);
    await page.goto(bestMatch.href, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for table to load
    await page.waitForTimeout(3000);
    
    // Try to find export/download button
    const exportButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const exportBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('export') || text.includes('download') || text.includes('csv');
      });
      return exportBtn ? true : false;
    });
    
    if (exportButton) {
      console.log('  → Found export button (manual download recommended)');
    }
    
    // Extract table data if visible
    console.log('  → Attempting to extract table data...');
    
    const permits = await page.evaluate(() => {
      const results: any[] = [];
      
      // Look for tables
      const tables = document.querySelectorAll('table');
      
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tr'));
        
        if (rows.length < 2) continue; // Need header + data
        
        const headers = Array.from(rows[0].querySelectorAll('th, td')).map(th => 
          th.textContent?.trim().toLowerCase() || ''
        );
        
        // Check if this looks like permit data
        const hasPermitFields = headers.some(h => 
          h.includes('permit') || h.includes('address') || h.includes('valuation')
        );
        
        if (!hasPermitFields) continue;
        
        // Extract data rows
        for (let i = 1; i < Math.min(rows.length, 101); i++) { // Limit to 100 rows
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
        
        break; // Use first matching table
      }
      
      return results;
    });
    
    console.log(`  → Extracted ${permits.length} rows from page`);
    
    // Parse into our format
    const formattedPermits: TacomaPermit[] = permits.map((row: any) => {
      // Try to map common field names
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
    
    return formattedPermits.filter(p => p.permitNumber); // Only return valid permits
    
  } catch (error) {
    await browser.close();
    console.error(`  ❌ Error scraping Tacoma permits:`, error);
    throw error;
  }
}

// Test function
if (require.main === module) {
  (async () => {
    try {
      const permits = await scrapeTacomaPermits(90);
      console.log(`\n📊 Result: ${permits.length} permits scraped`);
      
      if (permits.length > 0) {
        console.log('\nFirst 3 permits:');
        permits.slice(0, 3).forEach((p, i) => {
          console.log(`\n${i + 1}. ${p.permitNumber} - ${p.permitType}`);
          console.log(`   ${p.address}`);
          console.log(`   Valuation: $${p.valuation.toLocaleString()}`);
          console.log(`   Description: ${p.description.substring(0, 100)}...`);
        });
      } else {
        console.log('\n⚠️  No permits extracted from page');
        console.log('💡 Visit https://data.tacoma.gov/ manually to verify dataset availability');
      }
    } catch (error) {
      console.error('Failed:', error);
      process.exit(1);
    }
  })();
}
